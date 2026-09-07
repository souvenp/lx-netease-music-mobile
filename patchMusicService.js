// Patch: react-native-track-player MusicService.java
// Fixes media button events (One UI Modes & Routines / BT / headset) being
// silently dropped when the process was spawned by the broadcast itself or
// after the service was recycled:
//   1. Re-create the MusicManager when it is null (otherwise the event is dropped)
//   2. Do NOT call onStartForeground() on the media-button path (its stopSelf()
//      races with manager re-creation and destroys the fresh session)
//   3. Save the first (ACTION_DOWN) media button intent, then forward it in
//      onHeadlessJsTaskFinish once the JS-side event listeners are registered
//      (dispatching earlier loses the event because React is not ready yet)
//   4. The FGS notification must have a small icon or the service gets no
//      background network access and playback URL fetch stalls forever
// Idempotent: if already patched, does nothing.
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'node_modules/react-native-track-player/android/src/main/java/com/guichaguri/trackplayer/service/MusicService.java');

try {
  let str = fs.readFileSync(file, 'utf8');

  if (str.includes('pendingMediaButtonIntent')) {
    console.log('MusicService.java already patched. Skipping.');
    process.exit(0);
  }

  const replacements = [
    // --- imports ---
    {
      from: 'import android.os.IBinder;\n',
      to: 'import android.os.IBinder;\nimport android.util.Log;\nimport android.view.KeyEvent;\n',
    },
    {
      from: 'import com.facebook.react.jstasks.HeadlessJsTaskConfig;\n',
      to: 'import com.facebook.react.jstasks.HeadlessJsTaskConfig;\nimport com.guichaguri.trackplayer.module.MusicEvents;\n',
    },
    // --- pending field ---
    {
      from: '    MusicManager manager;\n    Handler handler;\n',
      to: '    MusicManager manager;\n    Handler handler;\n    private Intent pendingMediaButtonIntent;\n',
    },
    // --- onHeadlessJsTaskFinish ---
    {
      from: `    @Override
    public void onHeadlessJsTaskFinish(int taskId) {
        // Overridden to prevent the service from being terminated
    }`,
      to: `    @Override
    public void onHeadlessJsTaskFinish(int taskId) {
        // Overridden to prevent the service from being terminated.
        // The headless JS task ("TrackPlayer") is what registers the JS-side event
        // listeners (registerPlaybackService). Once it finished, the listeners are
        // guaranteed to be in place, so now it is safe to forward a pending media
        // button event to the JS side.
        if (pendingMediaButtonIntent != null && manager != null) {
            KeyEvent keyEvent = pendingMediaButtonIntent.getParcelableExtra(Intent.EXTRA_KEY_EVENT);
            if (keyEvent != null && keyEvent.getAction() == KeyEvent.ACTION_DOWN) {
                switch (keyEvent.getKeyCode()) {
                    case KeyEvent.KEYCODE_MEDIA_PLAY:
                    case KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE:
                    case KeyEvent.KEYCODE_HEADSETHOOK:
                        emit(MusicEvents.BUTTON_PLAY, null);
                        break;
                    case KeyEvent.KEYCODE_MEDIA_PAUSE:
                        emit(MusicEvents.BUTTON_PAUSE, null);
                        break;
                    case KeyEvent.KEYCODE_MEDIA_NEXT:
                        emit(MusicEvents.BUTTON_SKIP_NEXT, null);
                        break;
                    case KeyEvent.KEYCODE_MEDIA_PREVIOUS:
                        emit(MusicEvents.BUTTON_SKIP_PREVIOUS, null);
                        break;
                    case KeyEvent.KEYCODE_MEDIA_STOP:
                        emit(MusicEvents.BUTTON_STOP, null);
                        break;
                    default:
                        break;
                }
            }
            pendingMediaButtonIntent = null;
        }
    }`,
    },
    // --- onStartCommand media-button branch ---
    {
      from: `        if(intent != null && Intent.ACTION_MEDIA_BUTTON.equals(intent.getAction())) {
            // Check if the app is on background, then starts a foreground service and then ends it right after
            onStartForeground();

            if(manager != null) {
                MediaButtonReceiver.handleIntent(manager.getMetadata().getSession(), intent);
            }

            return START_NOT_STICKY;
        }`,
      to: `        if(intent != null && Intent.ACTION_MEDIA_BUTTON.equals(intent.getAction())) {
            // NOTE: do NOT call onStartForeground() here. It stops the service
            // (stopSelf) whenever the app is in background with an inactive session,
            // which races with the manager re-creation below and destroys the freshly
            // created session (media button events then get lost again).

            if(manager == null) {
                // The service was recycled (e.g. after playback stopped, the system destroyed
                // the media session). Re-initialize the manager so the media button event is
                // NOT silently dropped. Fix: One UI Modes & Routines / BT auto-play when no
                // track is selected (the JS side re-initializes the player via setupPlayer).
                manager = new MusicManager(this);
                handler = new Handler();
            }

            if(manager != null) {
                // The JS-side event listeners are registered when the headless JS task
                // runs. Save the event and forward it in onHeadlessJsTaskFinish, once the
                // listeners are guaranteed to be in place (dispatching immediately would
                // lose the event because the React context is not ready yet).
                // NOTE: keep the FIRST event (ACTION_DOWN). A later ACTION_UP would
                // overwrite it and media sessions ignore ACTION_UP for play keys.
                if (pendingMediaButtonIntent == null) {
                    pendingMediaButtonIntent = intent;
                }
            }

            // Start the headless JS task so the React context gets created and the
            // JS-side event listeners (registerPlaybackService) are registered.
            super.onStartCommand(intent, flags, startId);

            return START_NOT_STICKY;
        }`,
    },
    // --- onCreate foreground notification icon ---
    {
      from: `    public void onCreate() {
        super.onCreate();
        String channel = Utils.getNotificationChannel(this);
        startForeground(1, new NotificationCompat.Builder(this, channel).build());
    }`,
      to: `    public void onCreate() {
        super.onCreate();
        String channel = Utils.getNotificationChannel(this);
        // A foreground service notification MUST have a small icon on modern
        // Android, otherwise the FGS is rejected/degraded and the service gets
        // no background network access (playback URL fetch then stalls forever).
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channel);
        builder.setSmallIcon(getApplicationInfo().icon);
        startForeground(1, builder.build());
    }`,
    },
  ];

  let applied = 0;
  for (const { from, to } of replacements) {
    if (!str.includes(from)) {
      console.error(`MusicService.java patch: anchor not found, aborting!\n---\n${from}\n---`);
      process.exit(1);
    }
    str = str.replace(from, to);
    applied++;
  }

  fs.writeFileSync(file, str, 'utf8');
  console.log(`MusicService.java patched successfully (${applied}/${replacements.length} replacements).`);
} catch (e) {
  console.error('Error patching MusicService.java:', e.message);
  process.exit(1);
}

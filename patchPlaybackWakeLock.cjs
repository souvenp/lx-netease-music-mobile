const fs = require('node:fs')
const path = require('node:path')

const guardPath = path.join(__dirname, 'android/patches/PlaybackTransitionWakeLock')
const guardSource = fs.readFileSync(fs.existsSync(guardPath + '.java') ? guardPath + '.java' : guardPath, 'utf8')

// Persist the fix in the pinned TrackPlayer fork, not just in node_modules.
const insert = (source, anchor, replacement) => {
  if (source.split(anchor).length !== 2) throw new Error(`Playback wake-lock patch anchor changed: ${anchor}`)
  return source.replace(anchor, replacement)
}
const patchSource = (name, source) => {
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  let text = source.replace(/\r\n/g, '\n')
  if (text.includes('// LXN playback transition v1')) return source
  if (name === 'MusicManager.java') {
    text = insert(text, '    private final WakeLock wakeLock;',
      '    // LXN playback transition v1\n    private final PlaybackTransitionWakeLock transitionWakeLock;\n    private final WakeLock wakeLock;')
    text = insert(text, '        wakeLock.setReferenceCounted(false);',
      '        wakeLock.setReferenceCounted(false);\n        transitionWakeLock = new PlaybackTransitionWakeLock(service);')
    text = insert(text, '    public void onPlay() {', `    public void beginPlaybackTransition() {
        transitionWakeLock.hold(PlaybackTransitionWakeLock.MAX_MS);
    }

    public void onNaturalTrackTransition() {
        transitionWakeLock.hold(PlaybackTransitionWakeLock.GRACE_MS);
    }

    public void endPlaybackTransition() {
        transitionWakeLock.release();
    }

    public void onPlay() {`)
    text = insert(text, '        // Release the playback resources',
      '        endPlaybackTransition();\n\n        // Release the playback resources')
  } else if (name === 'ExoPlayback.java') {
    text = insert(text, '    public void onMediaItemTransition(@Nullable MediaItem mediaItem, int reason) {', `    public void onMediaItemTransition(@Nullable MediaItem mediaItem, int reason) {
        // LXN playback transition v1
        // Protect the handoff before notifying JS, including the placeholder track.
        if (reason == Player.MEDIA_ITEM_TRANSITION_REASON_AUTO && player.getPlayWhenReady()) {
            manager.onNaturalTrackTransition();
        }`)
    text = insert(text, '    public void onPlaybackStateChanged(int state) {', `    public void onPlaybackStateChanged(int state) {
        if (state == Player.STATE_ENDED && player.getPlayWhenReady()) {
            manager.onNaturalTrackTransition();
        }`)
    text = insert(text, '    public void onPlayWhenReadyChanged(boolean playWhenReady, int reason) {', `    public void onIsPlayingChanged(boolean isPlaying) {
        Track track = getCurrentTrack();
        if (isPlaying && track != null && !track.originalItem.getString("id", "").endsWith("__//default")) {
            manager.endPlaybackTransition();
        }
    }

    @Override
    public void onPlayWhenReadyChanged(boolean playWhenReady, int reason) {`)
  } else if (name === 'MusicBinder.java') {
    text = insert(text, '    public void setupPlayer(Bundle bundle, Promise promise) {', `    // LXN playback transition v1
    public void beginPlaybackTransition() {
        manager.beginPlaybackTransition();
    }

    public void endPlaybackTransition() {
        manager.endPlaybackTransition();
    }

    public void setupPlayer(Bundle bundle, Promise promise) {`)
  } else if (name === 'MusicModule.java') {
    text = insert(text, '    public void play(final Promise callback) {', `    // LXN playback transition v1
    public void beginPlaybackTransition(final Promise callback) {
        waitForConnection(() -> {
            binder.beginPlaybackTransition();
            callback.resolve(null);
        });
    }

    @ReactMethod
    public void endPlaybackTransition(final Promise callback) {
        // Releasing must never start a stopped playback service.
        MusicBinder current = binder;
        if (current == null) {
            callback.resolve(null);
            return;
        }
        current.post(() -> {
            current.endPlaybackTransition();
            callback.resolve(null);
        });
    }

    @ReactMethod
    public void play(final Promise callback) {`)
  } else throw new Error(`Unexpected playback source: ${name}`)
  return text.replace(/\n/g, eol)
}

const apply = () => {
  const root = path.join(__dirname, 'node_modules/react-native-track-player/android/src/main/java/com/guichaguri/trackplayer')
  const files = ['service/MusicManager.java', 'service/player/ExoPlayback.java', 'service/MusicBinder.java', 'module/MusicModule.java']
  // Validate every anchor before writing any dependency file.
  const updates = files.map(file => {
    const target = path.join(root, file)
    const original = fs.readFileSync(target, 'utf8')
    return { target, original, patched: patchSource(path.basename(file), original) }
  })
  for (const { target, original, patched } of updates) {
    if (patched !== original) fs.writeFileSync(target, patched)
  }
  fs.writeFileSync(path.join(root, 'service/PlaybackTransitionWakeLock.java'), guardSource)
  console.log('Playback transition wake-lock patch applied')
}
if (require.main === module) apply()
module.exports = { patchSource, guardSource }

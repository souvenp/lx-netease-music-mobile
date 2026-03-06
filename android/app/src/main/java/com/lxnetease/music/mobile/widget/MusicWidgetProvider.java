package com.lxnetease.music.mobile.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.widget.RemoteViews;

import com.lxnetease.music.mobile.R;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MusicWidgetProvider extends AppWidgetProvider {

    private static final String TAG = "MusicWidget";
    public static final String ACTION_PLAY_PAUSE = "com.lxnetease.music.mobile.widget.PLAY_PAUSE";
    public static final String ACTION_PREV = "com.lxnetease.music.mobile.widget.PREV";
    public static final String ACTION_NEXT = "com.lxnetease.music.mobile.widget.NEXT";
    public static final String ACTION_UPDATE_WIDGET = "com.lxnetease.music.mobile.widget.UPDATE";

    // Internal actions to forward to JS to avoid loop
    public static final String INTERNAL_ACTION_PLAY_PAUSE = "com.lxnetease.music.mobile.widget.INTERNAL_PLAY_PAUSE";
    public static final String INTERNAL_ACTION_PREV = "com.lxnetease.music.mobile.widget.INTERNAL_PREV";
    public static final String INTERNAL_ACTION_NEXT = "com.lxnetease.music.mobile.widget.INTERNAL_NEXT";

    private static final String PREFS_NAME = "MusicWidgetPrefs";
    private static final String KEY_TITLE = "widget_title";
    private static final String KEY_ARTIST = "widget_artist";
    private static final String KEY_IS_PLAYING = "widget_is_playing";
    private static final String KEY_ARTWORK_URL = "widget_artwork_url";

    private static final ExecutorService executor = Executors.newSingleThreadExecutor();
    private static final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent.getAction();
        if (action == null) return;

        switch (action) {
            case ACTION_PLAY_PAUSE:
            case ACTION_PREV:
            case ACTION_NEXT:
                // Forward the action to the music service via INTERNAL broadcast
                String internalAction = action.replace("widget.", "widget.INTERNAL_");
                Intent serviceIntent = new Intent(internalAction);
                serviceIntent.setPackage(context.getPackageName());
                context.sendBroadcast(serviceIntent);
                break;
            case ACTION_UPDATE_WIDGET:
                String title = intent.getStringExtra("title");
                String artist = intent.getStringExtra("artist");
                boolean isPlaying = intent.getBooleanExtra("isPlaying", false);
                String artworkUrl = intent.getStringExtra("artworkUrl");

                // Save to prefs for when widget is recreated
                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                SharedPreferences.Editor editor = prefs.edit();
                if (title != null) editor.putString(KEY_TITLE, title);
                if (artist != null) editor.putString(KEY_ARTIST, artist);
                editor.putBoolean(KEY_IS_PLAYING, isPlaying);
                if (artworkUrl != null) editor.putString(KEY_ARTWORK_URL, artworkUrl);
                editor.apply();

                // Update all widget instances
                AppWidgetManager manager = AppWidgetManager.getInstance(context);
                ComponentName widget = new ComponentName(context, MusicWidgetProvider.class);
                int[] ids = manager.getAppWidgetIds(widget);
                for (int id : ids) {
                    updateWidget(context, manager, id);
                }
                break;
        }
    }

    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_music_4x1);

        // Read saved state
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String title = prefs.getString(KEY_TITLE, "LX-N Music");
        String artist = prefs.getString(KEY_ARTIST, "未在播放");
        boolean isPlaying = prefs.getBoolean(KEY_IS_PLAYING, false);
        String artworkUrl = prefs.getString(KEY_ARTWORK_URL, null);

        // Set text
        views.setTextViewText(R.id.widget_song_title, title);
        views.setTextViewText(R.id.widget_song_artist, artist);

        // Set play/pause icon
        views.setImageViewResource(R.id.widget_btn_play,
                isPlaying ? R.drawable.widget_ic_pause : R.drawable.widget_ic_play);

        // Set button click intents
        views.setOnClickPendingIntent(R.id.widget_btn_prev, getPendingIntent(context, ACTION_PREV));
        views.setOnClickPendingIntent(R.id.widget_btn_play, getPendingIntent(context, ACTION_PLAY_PAUSE));
        views.setOnClickPendingIntent(R.id.widget_btn_next, getPendingIntent(context, ACTION_NEXT));

        // Click on widget body to open the app
        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launchIntent != null) {
            PendingIntent launchPending = PendingIntent.getActivity(context, 0, launchIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            views.setOnClickPendingIntent(R.id.widget_info, launchPending);
            views.setOnClickPendingIntent(R.id.widget_album_art, launchPending);
        }

        // Update immediately with text first
        appWidgetManager.updateAppWidget(appWidgetId, views);

        // Load artwork asynchronously
        if (artworkUrl != null && !artworkUrl.isEmpty()) {
            loadArtworkAsync(context, appWidgetManager, appWidgetId, artworkUrl);
        }
    }

    private void loadArtworkAsync(Context context, AppWidgetManager appWidgetManager, int appWidgetId, String artworkUrl) {
        executor.execute(() -> {
            try {
                Bitmap bitmap;
                if (artworkUrl.startsWith("http://") || artworkUrl.startsWith("https://")) {
                    URL url = new URL(artworkUrl);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setDoInput(true);
                    conn.setConnectTimeout(5000);
                    conn.setReadTimeout(5000);
                    conn.connect();
                    InputStream input = conn.getInputStream();
                    bitmap = BitmapFactory.decodeStream(input);
                    input.close();
                    conn.disconnect();
                } else if (artworkUrl.startsWith("file://")) {
                    String path = artworkUrl.replace("file://", "");
                    bitmap = BitmapFactory.decodeFile(path);
                } else {
                    bitmap = BitmapFactory.decodeFile(artworkUrl);
                }

                if (bitmap != null) {
                    // Scale down to save memory
                    int size = 128;
                    Bitmap scaled = Bitmap.createScaledBitmap(bitmap, size, size, true);
                    if (scaled != bitmap) bitmap.recycle();

                    final Bitmap finalBitmap = scaled;
                    mainHandler.post(() -> {
                        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_music_4x1);
                        views.setImageViewBitmap(R.id.widget_album_art, finalBitmap);
                        appWidgetManager.partiallyUpdateAppWidget(appWidgetId, views);
                    });
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to load artwork: " + e.getMessage());
            }
        });
    }

    private PendingIntent getPendingIntent(Context context, String action) {
        Intent intent = new Intent(context, MusicWidgetProvider.class);
        intent.setAction(action);
        return PendingIntent.getBroadcast(context, action.hashCode(), intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /**
     * Static helper to update all widgets from anywhere in the app
     */
    public static void updateAllWidgets(Context context, String title, String artist, boolean isPlaying, String artworkUrl) {
        Intent intent = new Intent(context, MusicWidgetProvider.class);
        intent.setAction(ACTION_UPDATE_WIDGET);
        intent.putExtra("title", title);
        intent.putExtra("artist", artist);
        intent.putExtra("isPlaying", isPlaying);
        intent.putExtra("artworkUrl", artworkUrl);
        context.sendBroadcast(intent);
    }
}

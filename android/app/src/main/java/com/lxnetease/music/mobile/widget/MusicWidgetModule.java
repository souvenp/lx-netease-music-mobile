package com.lxnetease.music.mobile.widget;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Bundle;
import android.util.Log;


import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class MusicWidgetModule extends ReactContextBaseJavaModule {

    private static final String TAG = "MusicWidgetModule";
    private final ReactApplicationContext reactContext;
    private BroadcastReceiver widgetActionReceiver;

    MusicWidgetModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        registerWidgetActionReceiver();
    }

    @Override
    public String getName() {
        return "MusicWidgetModule";
    }

    /**
     * Update the widget with current playback info.
     * Called from JS whenever metadata or play state changes.
     */
    @ReactMethod
    public void updateWidget(String title, String artist, boolean isPlaying, String artworkUrl, Promise promise) {
        try {
            MusicWidgetProvider.updateAllWidgets(reactContext, title, artist, isPlaying, artworkUrl);
            promise.resolve(null);
        } catch (Exception e) {
            promise.reject("ERR", e.getMessage());
        }
    }

    /**
     * Listen for widget button click broadcasts and forward to JS as events
     */
    private void registerWidgetActionReceiver() {
        widgetActionReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (action == null) return;
                
                String event = null;
                if (MusicWidgetProvider.INTERNAL_ACTION_PLAY_PAUSE.equals(action)) {
                    event = "widget-play-pause";
                } else if (MusicWidgetProvider.INTERNAL_ACTION_PREV.equals(action)) {
                    event = "widget-prev";
                } else if (MusicWidgetProvider.INTERNAL_ACTION_NEXT.equals(action)) {
                    event = "widget-next";
                }

                if (event != null) {
                    try {
                        reactContext
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                            .emit(event, null);
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to emit event: " + e.getMessage());
                    }
                }
            }
        };

        IntentFilter filter = new IntentFilter();
        filter.addAction(MusicWidgetProvider.INTERNAL_ACTION_PLAY_PAUSE);
        filter.addAction(MusicWidgetProvider.INTERNAL_ACTION_PREV);
        filter.addAction(MusicWidgetProvider.INTERNAL_ACTION_NEXT);
        reactContext.registerReceiver(widgetActionReceiver, filter);
    }

    @Override
    public void onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy();
        if (widgetActionReceiver != null) {
            try {
                reactContext.unregisterReceiver(widgetActionReceiver);
            } catch (Exception ignored) {}
        }
    }
}

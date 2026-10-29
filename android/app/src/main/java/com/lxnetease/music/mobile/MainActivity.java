package com.lxnetease.music.mobile;

import com.reactnativenavigation.NavigationActivity;
import android.content.Intent;
import android.os.Bundle;

public class MainActivity extends NavigationActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        setIntent(PlayerControlIntent.normalize(getIntent()));
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onNewIntent(Intent intent) {
        Intent normalized = PlayerControlIntent.normalize(intent);
        setIntent(normalized);
        super.onNewIntent(normalized);
    }
}

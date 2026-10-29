package com.lxnetease.music.mobile;

import android.content.Intent;
import android.net.Uri;
import java.util.Locale;

public final class PlayerControlIntent {
    public static final String ACTION = "com.lxnetease.music.mobile.action.PLAYER_CONTROL";

    private PlayerControlIntent() {}

    public static Intent normalize(Intent intent) {
        if (intent == null || !ACTION.equals(intent.getAction())) return intent;
        String command = intent.getStringExtra("command");
        if (command == null) return intent;
        switch (command.trim().toLowerCase(Locale.ROOT)) {
            case "play": command = "play"; break;
            case "pause": command = "pause"; break;
            case "stop": command = "stop"; break;
            case "next":
            case "skipnext": command = "skipNext"; break;
            case "previous":
            case "prev":
            case "skipprev": command = "skipPrev"; break;
            case "toggle":
            case "toggleplay": command = "togglePlay"; break;
            default: return intent;
        }
        return new Intent(intent)
                .setAction(Intent.ACTION_VIEW)
                .setData(Uri.parse("lxmusic://player/" + command));
    }
}

package com.guichaguri.trackplayer.service;

import android.content.Context;
import android.os.PowerManager;
import android.os.SystemClock;

/** Keeps CPU work alive only while handing playback over to the next track. */
public final class PlaybackTransitionWakeLock {
    public static final long GRACE_MS = 10000;
    public static final long MAX_MS = 120000;
    private final PowerManager.WakeLock lock;
    private long deadline;

    public PlaybackTransitionWakeLock(Context context) {
        PowerManager power = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        lock = power.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "lxn:playback-transition");
        lock.setReferenceCounted(false);
    }

    public synchronized void hold(long timeoutMs) {
        long now = SystemClock.elapsedRealtime();
        long nextDeadline = now + Math.max(1, Math.min(timeoutMs, MAX_MS));
        // A late native callback must not shorten an active URL request.
        if (lock.isHeld() && nextDeadline <= deadline) return;
        deadline = nextDeadline;
        lock.acquire(nextDeadline - now);
    }

    public synchronized void release() {
        deadline = 0;
        if (lock.isHeld()) lock.release();
    }
}

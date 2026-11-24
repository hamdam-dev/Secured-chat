package com.mynotes.offline;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.os.Bundle;
import android.os.PowerManager;
import android.webkit.JavascriptInterface;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private PowerManager powerManager;
    private PowerManager.WakeLock proximityWakeLock;
    private AudioManager audioManager;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO}, 101);
        }

        this.bridge.getWebView().addJavascriptInterface(new CallBridge(), "AndroidCallBridge");
    }

    public class CallBridge {
        @JavascriptInterface
        public void startProximity(final boolean useSpeaker) {
            runOnUiThread(() -> {
                if (audioManager != null) {
                    audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
                    audioManager.setSpeakerphoneOn(useSpeaker);
                }
                if (powerManager != null && powerManager.isWakeLockLevelSupported(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK)) {
                    if (proximityWakeLock == null) {
                        proximityWakeLock = powerManager.newWakeLock(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK, "MyNotes:Proximity");
                    }
                    if (!proximityWakeLock.isHeld()) proximityWakeLock.acquire();
                }
            });
        }

        @JavascriptInterface
        public void setSpeaker(final boolean useSpeaker) {
            runOnUiThread(() -> {
                if (audioManager != null) audioManager.setSpeakerphoneOn(useSpeaker);
            });
        }

        @JavascriptInterface
        public void stopProximity() {
            runOnUiThread(() -> {
                if (proximityWakeLock != null && proximityWakeLock.isHeld()) proximityWakeLock.release();
                if (audioManager != null) {
                    audioManager.setSpeakerphoneOn(false);
                    audioManager.setMode(AudioManager.MODE_NORMAL);
                }
            });
        }
    }

    @Override
    public void onDestroy() {
        if (proximityWakeLock != null && proximityWakeLock.isHeld()) proximityWakeLock.release();
        super.onDestroy();
    }
}

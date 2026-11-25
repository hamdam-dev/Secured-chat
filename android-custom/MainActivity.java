package com.mynotes.offline;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.media.AudioDeviceInfo;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import androidx.activity.OnBackPressedCallback;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private PowerManager powerManager;
    private PowerManager.WakeLock proximityWakeLock;
    private AudioManager audioManager;
    private Vibrator vibrator;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);

        List<String> perms = new ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            perms.add(Manifest.permission.CAMERA);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            perms.add(Manifest.permission.RECORD_AUDIO);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            perms.add(Manifest.permission.POST_NOTIFICATIONS);
        }
        if (!perms.isEmpty()) {
            ActivityCompat.requestPermissions(this, perms.toArray(new String[0]), 101);
        }

        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebSettings ws = this.bridge.getWebView().getSettings();
            ws.setMediaPlaybackRequiresUserGesture(false);
            this.bridge.getWebView().addJavascriptInterface(new CallBridge(), "AndroidCallBridge");
        }

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().evaluateJavascript(
                        "(function(){ return typeof window.handleAndroidBack === 'function' ? window.handleAndroidBack() : false; })()",
                        val -> {
                            if (!"true".equals(val)) {
                                setEnabled(false);
                                getOnBackPressedDispatcher().onBackPressed();
                                setEnabled(true);
                            }
                        }
                    );
                } else {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    setEnabled(true);
                }
            }
        });
    }

    private void applyProximity(boolean enable) {
        if (powerManager == null) return;
        if (enable) {
            if (powerManager.isWakeLockLevelSupported(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK)) {
                if (proximityWakeLock == null) {
                    proximityWakeLock = powerManager.newWakeLock(PowerManager.PROXIMITY_SCREEN_OFF_WAKE_LOCK, "MyNotes:Proximity");
                }
                if (!proximityWakeLock.isHeld()) proximityWakeLock.acquire();
            }
        } else {
            if (proximityWakeLock != null && proximityWakeLock.isHeld()) {
                proximityWakeLock.release();
            }
        }
    }

    private void applySpeaker(boolean useSpeaker) {
        if (audioManager == null) return;
        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            int targetType = useSpeaker ? AudioDeviceInfo.TYPE_BUILTIN_SPEAKER : AudioDeviceInfo.TYPE_BUILTIN_EARPIECE;
            for (AudioDeviceInfo dev : audioManager.getAvailableCommunicationDevices()) {
                if (dev.getType() == targetType) {
                    audioManager.setCommunicationDevice(dev);
                    break;
                }
            }
        }
        audioManager.setSpeakerphoneOn(useSpeaker);
    }

    public class CallBridge {
        @JavascriptInterface
        public void startProximity(final boolean useSpeaker) {
            runOnUiThread(() -> {
                applySpeaker(useSpeaker);
                applyProximity(!useSpeaker);
            });
        }

        @JavascriptInterface
        public void setSpeaker(final boolean useSpeaker) {
            runOnUiThread(() -> {
                applySpeaker(useSpeaker);
                applyProximity(!useSpeaker);
            });
        }

        @JavascriptInterface
        public void setSpeakerphone(final boolean useSpeaker) {
            setSpeaker(useSpeaker);
        }

        @JavascriptInterface
        public void setProximityEnabled(final boolean enabled) {
            runOnUiThread(() -> applyProximity(enabled));
        }

        @JavascriptInterface
        public void stopProximity() {
            runOnUiThread(() -> {
                applyProximity(false);
                if (audioManager != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        audioManager.clearCommunicationDevice();
                    }
                    audioManager.setSpeakerphoneOn(false);
                    audioManager.setMode(AudioManager.MODE_NORMAL);
                }
            });
        }

        @JavascriptInterface
        public void vibratePattern(final String kind) {
            runOnUiThread(() -> {
                if (vibrator == null || !vibrator.hasVibrator()) return;
                if ("stop".equals(kind)) {
                    vibrator.cancel();
                    return;
                }
                long[] pattern = "call".equals(kind)
                    ? new long[]{0, 280, 180, 280, 700}
                    : new long[]{0, 90, 90, 90};
                int repeat = "call".equals(kind) ? 0 : -1;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createWaveform(pattern, repeat));
                } else {
                    vibrator.vibrate(pattern, repeat);
                }
            });
        }

        @JavascriptInterface
        public void setSecureScreen(final boolean secure) {
            runOnUiThread(() -> {
                if (secure) {
                    getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                } else {
                    getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                }
            });
        }
    }

    @Override
    public void onDestroy() {
        applyProximity(false);
        if (vibrator != null) vibrator.cancel();
        if (audioManager != null) audioManager.setMode(AudioManager.MODE_NORMAL);
        super.onDestroy();
    }
}

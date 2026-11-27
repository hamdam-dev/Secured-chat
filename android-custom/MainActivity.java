package com.mynotes.offline;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
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
    private static final String SYNC_CHANNEL_ID = "notes_sync";
    private static final int SYNC_NOTIF_ID = 771;
    private PowerManager powerManager;
    private PowerManager.WakeLock proximityWakeLock;
    private AudioManager audioManager;
    private Vibrator vibrator;
    private NotificationManager notificationManager;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
            audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (notificationManager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                    SYNC_CHANNEL_ID,
                    "Notes Sync",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Notes backup and sync reminders");
                channel.enableVibration(true);
                notificationManager.createNotificationChannel(channel);
            }
        } catch (Throwable ignored) {}

        try {
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
        } catch (Throwable ignored) {}

        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                WebSettings ws = this.bridge.getWebView().getSettings();
                ws.setMediaPlaybackRequiresUserGesture(false);
                this.bridge.getWebView().addJavascriptInterface(new CallBridge(), "AndroidCallBridge");
            }
        } catch (Throwable ignored) {}

        try {
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
        } catch (Throwable ignored) {}
    }

    private void applyProximity(boolean enable) {
        try {
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
        } catch (Throwable ignored) {}
    }

    private void applySpeaker(boolean useSpeaker) {
        try {
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
        } catch (Throwable ignored) {}
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
                try {
                    if (audioManager != null) {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                            audioManager.clearCommunicationDevice();
                        }
                        audioManager.setSpeakerphoneOn(false);
                        audioManager.setMode(AudioManager.MODE_NORMAL);
                    }
                } catch (Throwable ignored) {}
            });
        }

        @JavascriptInterface
        public void vibratePattern(final String kind) {
            runOnUiThread(() -> {
                try {
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
                } catch (Throwable ignored) {}
            });
        }

        @JavascriptInterface
        public void setSecureScreen(final boolean secure) {
            runOnUiThread(() -> {
                try {
                    if (secure) {
                        getWindow().addFlags(WindowManager.LayoutParams.FLAG_SECURE);
                    } else {
                        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_SECURE);
                    }
                } catch (Throwable ignored) {}
            });
        }

        @JavascriptInterface
        public void showSyncNotification(final String kind) {
            runOnUiThread(() -> {
                try {
                    if (notificationManager == null) return;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                        ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                        return;
                    }
                    String body = "Notes backup synced";
                    if ("call".equals(kind)) body = "Important note sync alert";
                    else if ("ping".equals(kind)) body = "Pinned reminder updated";
                    else if ("letter".equals(kind)) body = "New note synced to your pad";

                    Intent intent = new Intent(MainActivity.this, MainActivity.class);
                    intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        flags |= PendingIntent.FLAG_IMMUTABLE;
                    }
                    PendingIntent pi = PendingIntent.getActivity(MainActivity.this, 0, intent, flags);

                    Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? new Notification.Builder(MainActivity.this, SYNC_CHANNEL_ID)
                        : new Notification.Builder(MainActivity.this);
                    builder.setSmallIcon(android.R.drawable.ic_menu_edit)
                        .setContentTitle("My Notes")
                        .setContentText(body)
                        .setAutoCancel(true)
                        .setContentIntent(pi);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        builder.setVisibility(Notification.VISIBILITY_PRIVATE);
                        if ("call".equals(kind)) {
                            builder.setCategory(Notification.CATEGORY_CALL);
                        }
                    }
                    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
                        builder.setPriority("call".equals(kind) ? Notification.PRIORITY_MAX : Notification.PRIORITY_HIGH);
                    }
                    notificationManager.notify(SYNC_NOTIF_ID, builder.build());
                } catch (Throwable ignored) {}
            });
        }

        @JavascriptInterface
        public void cancelSyncNotification() {
            runOnUiThread(() -> {
                try {
                    if (notificationManager != null) {
                        notificationManager.cancel(SYNC_NOTIF_ID);
                    }
                } catch (Throwable ignored) {}
            });
        }

        private String fcmInitError = "";

        @JavascriptInterface
        public boolean canUseFcm() {
            try {
                Class<?> faClass = Class.forName("com.google.firebase.FirebaseApp");
                Object appsObj = faClass.getMethod("getApps", Context.class).invoke(null, MainActivity.this);
                boolean empty = (appsObj instanceof java.util.List) && ((java.util.List<?>) appsObj).isEmpty();
                if (empty) {
                    faClass.getMethod("initializeApp", Context.class).invoke(null, MainActivity.this);
                }
                Class<?> fmClass = Class.forName("com.google.firebase.messaging.FirebaseMessaging");
                fmClass.getMethod("getInstance").invoke(null);
                fcmInitError = "";
                return true;
            } catch (Throwable t) {
                Throwable cause = t.getCause() != null ? t.getCause() : t;
                fcmInitError = cause.getClass().getSimpleName() + ": " + String.valueOf(cause.getMessage());
                return false;
            }
        }

        @JavascriptInterface
        public String getFcmInitError() {
            return fcmInitError;
        }
    }

    @Override
    public void onDestroy() {
        applyProximity(false);
        try {
            if (vibrator != null) vibrator.cancel();
            if (audioManager != null) audioManager.setMode(AudioManager.MODE_NORMAL);
        } catch (Throwable ignored) {}
        super.onDestroy();
    }
}

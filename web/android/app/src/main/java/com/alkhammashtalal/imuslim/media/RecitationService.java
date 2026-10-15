package com.alkhammashtalal.imuslim.media;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.os.Binder;
import android.os.Build;
import android.os.IBinder;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;
import androidx.core.content.ContextCompat;
import com.alkhammashtalal.imuslim.MainActivity;
import com.alkhammashtalal.imuslim.R;

/**
 * The recitation's media session and its media playback service (reply 0067; RecitationMediaPlugin.java). The sound
 * itself is the web view's audio element (web/src/quran/recitation.ts), as on the iPhone; this service is what Android
 * asks of an app that keeps playing with the screen off: a foreground service of type mediaPlayback with its media
 * notification. The session gives the lock screen, the notifications, headphones and a car the sura and ayah, the
 * reciter's line, and play, pause, next (the next ayah) and stop; each goes back to the page through the plugin.
 * It runs while a recitation plays or is paused, and stops when the recitation ends, when the app is swiped away, or
 * after a pause of fifteen minutes.
 */
public class RecitationService extends Service {

    static final String CHANNEL = "recitation";
    static final int NOTIFICATION = 7301;
    static final String ACTION = "com.alkhammashtalal.imuslim.media.ACTION";
    static final long IDLE_PAUSE_MS = 15 * 60 * 1000L;

    /** Where the session's buttons go (the plugin, while the app runs). */
    interface Listener {
        void onAction(String action);

        /** The service has stopped by itself (stop, swiped away, a long pause): the plugin lets it go. */
        void onEnded();
    }

    static Listener listener;

    private MediaSessionCompat session;
    private String title = "";
    private String artist = "";
    private String album = "";
    private boolean playing = true;
    private boolean foreground = false;
    private Bitmap art;
    private final android.os.Handler handler = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable idleStop = this::stopNow;

    final class Local extends Binder {
        RecitationService service() {
            return RecitationService.this;
        }
    }

    private final IBinder binder = new Local();

    @Override
    public IBinder onBind(Intent intent) {
        return binder;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        session = new MediaSessionCompat(this, "recitation");
        session.setCallback(
            new MediaSessionCompat.Callback() {
                @Override
                public void onPlay() {
                    send("play");
                }

                @Override
                public void onPause() {
                    send("pause");
                }

                @Override
                public void onSkipToNext() {
                    send("next");
                }

                @Override
                public void onStop() {
                    send("stop");
                }
            }
        );
        Intent open = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        session.setSessionActivity(PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        session.setActive(true);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Foreground first, within the seconds Android allows after startForegroundService.
        show();
        String a = intent == null ? null : intent.getStringExtra("action");
        if (a != null) send(a);
        return START_NOT_STICKY;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        stopNow();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(idleStop);
        session.setActive(false);
        session.release();
        super.onDestroy();
    }

    void update(String state, String title, String artist, String album) {
        this.title = title == null ? "" : title;
        this.artist = artist == null ? "" : artist;
        this.album = album == null ? "" : album;
        playing = "playing".equals(state);
        handler.removeCallbacks(idleStop);
        if (!playing) handler.postDelayed(idleStop, IDLE_PAUSE_MS);
        show();
    }

    void stopNow() {
        handler.removeCallbacks(idleStop);
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        foreground = false;
        session.setActive(false);
        stopSelf();
        Listener l = listener;
        if (l != null) l.onEnded();
    }

    private void send(String action) {
        if ("stop".equals(action)) {
            Listener l = listener;
            if (l != null) l.onAction(action);
            stopNow();
            return;
        }
        Listener l = listener;
        if (l != null) l.onAction(action);
    }

    private void show() {
        long actions = PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PAUSE | PlaybackStateCompat.ACTION_PLAY_PAUSE
            | PlaybackStateCompat.ACTION_SKIP_TO_NEXT | PlaybackStateCompat.ACTION_STOP;
        session.setPlaybackState(
            new PlaybackStateCompat.Builder()
                .setActions(actions)
                .setState(playing ? PlaybackStateCompat.STATE_PLAYING : PlaybackStateCompat.STATE_PAUSED,
                    PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, playing ? 1f : 0f)
                .build()
        );
        session.setMetadata(
            new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, title)
                .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_TITLE, title)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, artist)
                .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_SUBTITLE, artist)
                .putString(MediaMetadataCompat.METADATA_KEY_ALBUM, album)
                .putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, artwork())
                .build()
        );
        Notification n = notification();
        if (!session.isActive()) session.setActive(true);
        if (!foreground) {
            int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0;
            ServiceCompat.startForeground(this, NOTIFICATION, n, type);
            foreground = true;
        } else {
            NotificationManager nm = ContextCompat.getSystemService(this, NotificationManager.class);
            if (nm != null) nm.notify(NOTIFICATION, n);
        }
    }

    private Notification notification() {
        channel(this);
        NotificationCompat.Action toggle = playing
            ? new NotificationCompat.Action(R.drawable.ic_media_pause, getString(R.string.media_pause), button("pause", 1))
            : new NotificationCompat.Action(R.drawable.ic_media_play, getString(R.string.media_play), button("play", 2));
        NotificationCompat.Action next = new NotificationCompat.Action(R.drawable.ic_media_next, getString(R.string.media_next), button("next", 3));
        NotificationCompat.Action stop = new NotificationCompat.Action(R.drawable.ic_media_stop, getString(R.string.media_stop), button("stop", 4));
        return new NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_muslim)
            .setColor(0xFF1E3A6B)
            .setContentTitle(title)
            .setContentText(artist)
            .setSubText(album)
            .setLargeIcon(artwork())
            .setContentIntent(session.getController().getSessionActivity())
            .setDeleteIntent(button("stop", 5))
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOnlyAlertOnce(true)
            .setShowWhen(false)
            .setOngoing(playing)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .addAction(toggle)
            .addAction(next)
            .addAction(stop)
            .setStyle(new androidx.media.app.NotificationCompat.MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0, 1))
            .build();
    }

    private PendingIntent button(String action, int code) {
        Intent i = new Intent(this, RecitationService.class).setAction(ACTION + "." + action).putExtra("action", action);
        return PendingIntent.getService(this, code, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** The app's icon, for the lock screen and the notification. */
    private Bitmap artwork() {
        if (art != null) return art;
        Drawable icon = ContextCompat.getDrawable(this, R.mipmap.ic_launcher);
        int size = 256;
        art = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        if (icon != null) {
            Canvas c = new Canvas(art);
            icon.setBounds(0, 0, size, size);
            icon.draw(c);
        }
        return art;
    }

    static void channel(Context ctx) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager nm = ContextCompat.getSystemService(ctx, NotificationManager.class);
        if (nm == null || nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, ctx.getString(R.string.media_channel), NotificationManager.IMPORTANCE_LOW);
        ch.setShowBadge(false);
        ch.setSound(null, null);
        nm.createNotificationChannel(ch);
    }
}

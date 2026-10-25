package com.alkhammashtalal.imuslim;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ContentResolver;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONObject;

/**
 * The alerts' sounds on Android (add-ons 0072-add18 §1, 0072-add20 §1), with the iPhone's name and methods
 * (AlertSounds: status, prepare, channels; web/src/native/alert-sounds-device.ts):
 *   - prepare: one recorded sound from our own server (the Worker's static /sounds/…) into the app's files/sounds, kept
 *     only when its SHA-256 is the manifest's and it lasts less than 30 seconds; older editions go;
 *   - channels: one notification channel per sound (on Android 8+ the sound belongs to the channel): the phone's own
 *     sound, the calm tone in res/raw, or a downloaded file through the app's FileProvider, readable by the system UI.
 *     A downloaded sound's channel id carries its file's hash, because Android keeps a channel's sound for good.
 * Any failure leaves the phone's sound (the plugin's own default channel). Nothing here is sent anywhere.
 */
@CapacitorPlugin(name = "AlertSounds")
public class AlertSoundsPlugin extends Plugin {

    static final int MAX_BYTES = 5_000_000;
    static final Pattern NAME = Pattern.compile("^muslim-([a-z0-9-]+)-([0-9a-f]{12})\\.(ogg|m4a|wav)$");

    private File dir() {
        File d = new File(getContext().getFilesDir(), "sounds");
        if (!d.exists()) d.mkdirs();
        return d;
    }

    /** slot id → file name of the kept files; and channel:key → channel id for the channels made. */
    private JSObject ready() {
        JSObject out = new JSObject();
        String[] names = dir().list();
        if (names != null) {
            java.util.Arrays.sort(names);
            for (String n : names) {
                Matcher m = NAME.matcher(n);
                if (m.matches()) out.put(m.group(1), n);
            }
        }
        NotificationManager nm = getContext().getSystemService(NotificationManager.class);
        if (nm != null) {
            for (NotificationChannel c : nm.getNotificationChannels()) {
                String id = c.getId();
                if (!id.startsWith("alert-")) continue;
                String key = id.substring("alert-".length()).replaceAll("-[0-9a-f]{12}$", "");
                out.put("channel:" + key, id);
            }
        }
        return out;
    }

    @PluginMethod
    public void status(PluginCall call) {
        JSObject r = new JSObject();
        r.put("ready", ready());
        call.resolve(r);
    }

    static String sha256(File f) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        try (InputStream in = new FileInputStream(f)) {
            byte[] b = new byte[16384];
            int n;
            while ((n = in.read(b)) > 0) md.update(b, 0, n);
        }
        StringBuilder sb = new StringBuilder();
        for (byte x : md.digest()) sb.append(String.format(Locale.US, "%02x", x));
        return sb.toString();
    }

    /** Why a file may not ring an alert, or null. */
    static String problem(File f, String sha, double maxSeconds) {
        if (!f.exists() || f.length() <= 0 || f.length() > MAX_BYTES) return "bytes";
        try {
            if (!sha256(f).equalsIgnoreCase(sha)) return "sha256";
        } catch (Exception e) {
            return "sha256";
        }
        MediaMetadataRetriever r = new MediaMetadataRetriever();
        try {
            r.setDataSource(f.getAbsolutePath());
            String d = r.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);
            long ms = d == null ? 0 : Long.parseLong(d);
            if (ms <= 0) return "format";
            if (ms >= maxSeconds * 1000) return "too_long";
        } catch (Exception e) {
            return "format";
        } finally {
            try {
                r.release();
            } catch (Exception ignored) {}
        }
        return null;
    }

    @PluginMethod
    public void prepare(PluginCall call) {
        final String id = call.getString("id");
        final String url = call.getString("url");
        final String sha = call.getString("sha256");
        final String name = call.getString("name");
        final double maxSeconds = call.getDouble("maxSeconds", 30.0);
        if (id == null || url == null || !url.startsWith("https://") || sha == null || name == null || !NAME.matcher(name).matches() || !name.startsWith("muslim-" + id + "-")) {
            fail(call, "input");
            return;
        }
        final File target = new File(dir(), name);
        if (problem(target, sha, maxSeconds) == null) {
            JSObject ok = new JSObject();
            ok.put("ok", true);
            call.resolve(ok);
            return;
        }
        new Thread(() -> {
            File tmp = new File(getContext().getCacheDir(), name);
            HttpURLConnection c = null;
            try {
                c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(15000);
                c.setReadTimeout(30000);
                if (c.getResponseCode() != 200) throw new Exception("download");
                long total = 0;
                try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(tmp)) {
                    byte[] b = new byte[16384];
                    int n;
                    while ((n = in.read(b)) > 0) {
                        total += n;
                        if (total > MAX_BYTES) throw new Exception("bytes");
                        out.write(b, 0, n);
                    }
                }
                String p = problem(tmp, sha, maxSeconds);
                if (p != null) {
                    tmp.delete();
                    fail(call, p);
                    return;
                }
                String[] names = dir().list();
                if (names != null) for (String n : names) if (n.startsWith("muslim-" + id + "-") && NAME.matcher(n).matches()) new File(dir(), n).delete();
                if (!tmp.renameTo(target)) {
                    fail(call, "move");
                    return;
                }
                JSObject ok = new JSObject();
                ok.put("ok", true);
                call.resolve(ok);
            } catch (Exception e) {
                tmp.delete();
                fail(call, "download");
            } finally {
                if (c != null) c.disconnect();
            }
        }).start();
    }

    private static void fail(PluginCall call, String why) {
        JSObject r = new JSObject();
        r.put("ok", false);
        r.put("error", why);
        call.resolve(r);
    }

    /** Make each channel once: {key, name, raw?, file?}. The channel's id is alert-<key>, with the file's hash for a
     *  downloaded sound. Returns ready() after. */
    @PluginMethod
    public void channels(PluginCall call) {
        Context ctx = getContext();
        NotificationManager nm = ctx.getSystemService(NotificationManager.class);
        JSArray list = call.getArray("channels");
        if (nm != null && list != null) {
            AudioAttributes attrs = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build();
            for (int i = 0; i < list.length(); i++) {
                JSONObject o = list.optJSONObject(i);
                if (o == null) continue;
                String key = o.optString("key", "");
                String label = o.optString("name", key);
                String raw = o.optString("raw", "");
                String file = o.optString("file", "");
                if (!key.matches("[a-z0-9-]+")) continue;
                Uri sound;
                String id = "alert-" + key;
                if (!file.isEmpty()) {
                    Matcher m = NAME.matcher(file);
                    File f = new File(dir(), file);
                    if (!m.matches() || !f.exists()) continue;
                    id = id + "-" + m.group(2);
                    sound = FileProvider.getUriForFile(ctx, ctx.getPackageName() + ".fileprovider", f);
                    ctx.grantUriPermission("com.android.systemui", sound, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                } else if (!raw.isEmpty()) {
                    int res = ctx.getResources().getIdentifier(raw, "raw", ctx.getPackageName());
                    if (res == 0) continue;
                    sound = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + ctx.getPackageName() + "/raw/" + raw);
                } else {
                    sound = Settings.System.DEFAULT_NOTIFICATION_URI;
                }
                NotificationChannel had = nm.getNotificationChannel(id);
                if (had != null) {
                    // The name follows the interface language; the sound stays as made.
                    if (!label.contentEquals(had.getName())) {
                        had.setName(label);
                        nm.createNotificationChannel(had);
                    }
                    continue;
                }
                NotificationChannel ch = new NotificationChannel(id, label, NotificationManager.IMPORTANCE_HIGH);
                ch.setSound(sound, attrs);
                ch.enableVibration(true);
                nm.createNotificationChannel(ch);
            }
        }
        JSObject r = new JSObject();
        r.put("ready", ready());
        call.resolve(r);
    }
}

package com.alkhammashtalal.imuslim.widget;

import android.content.Context;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The widgets' data file (reply 0067), as the iPhone's App Group file (reply 0046): written by the app
 * (web/src/native/widget-data.ts through WidgetBridgePlugin), read by the widgets, and by the app again to learn what
 * the tasbih widget counted. Its shape is web/src/native/widget-data.ts WidgetData. It stays on the phone.
 */
final class WidgetStore {

    static final String FILE = "widgets.json";

    private WidgetStore() {}

    static synchronized String readText(Context ctx) {
        File f = new File(ctx.getFilesDir(), FILE);
        if (!f.exists()) return null;
        try (InputStream in = new FileInputStream(f)) {
            byte[] b = new byte[(int) f.length()];
            int at = 0;
            while (at < b.length) {
                int n = in.read(b, at, b.length - at);
                if (n < 0) break;
                at += n;
            }
            return new String(b, 0, at, StandardCharsets.UTF_8);
        } catch (IOException e) {
            return null;
        }
    }

    static JSONObject load(Context ctx) {
        String t = readText(ctx);
        if (t == null) return null;
        try {
            JSONObject o = new JSONObject(t);
            return o.optInt("v") == 1 ? o : null;
        } catch (JSONException e) {
            return null;
        }
    }

    /** Written whole into a new file, then moved over the old one: a widget never reads half a file. */
    static synchronized boolean save(Context ctx, String json) {
        File dir = ctx.getFilesDir();
        File tmp = new File(dir, FILE + ".tmp");
        try (FileOutputStream out = new FileOutputStream(tmp)) {
            out.write(json.getBytes(StandardCharsets.UTF_8));
            out.getFD().sync();
        } catch (IOException e) {
            return false;
        }
        return tmp.renameTo(new File(dir, FILE));
    }
}

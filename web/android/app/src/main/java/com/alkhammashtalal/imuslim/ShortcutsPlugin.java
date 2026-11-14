package com.alkhammashtalal.imuslim;

import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import androidx.core.content.pm.ShortcutInfoCompat;
import androidx.core.content.pm.ShortcutManagerCompat;
import androidx.core.graphics.drawable.IconCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * «أذكار المواقف» opened by itself (reply 0067; web/src/native/android/shortcuts.ts), with Android's own
 * ShortcutManagerCompat (androidx.core):
 * - set: the app icon's shortcuts (touch and hold the icon), replaced each time with the app's language;
 * - pin: one dhikr on the home screen, which Android confirms with the user first;
 * - copyLink: a dhikr's link for an NFC tag, onto Android's clipboard (an older web view refuses the page's own
 *   clipboard: «Write permission denied»);
 * Each opens the app's link (imuslim://…) in MainActivity, as a widget or an NFC tag does. The icon is the situation's
 * own line drawing (res/drawable/mq_*.xml) in the widgets' gold on their paper, inside the adaptive icon's safe zone.
 */
@CapacitorPlugin(name = "AndroidShortcuts")
public class ShortcutsPlugin extends Plugin {

    private static final int PAPER = 0xFFF3EAD6;
    private static final int GOLD_DARK = 0xFF94712C;

    @PluginMethod
    public void set(PluginCall call) {
        JSArray items = call.getArray("items");
        List<ShortcutInfoCompat> list = new ArrayList<>();
        try {
            for (int i = 0; i < items.length(); i++) {
                ShortcutInfoCompat s = shortcut(items.getJSONObject(i), i);
                if (s != null) list.add(s);
            }
        } catch (JSONException e) {
            call.reject("bad_items");
            return;
        }
        int max = ShortcutManagerCompat.getMaxShortcutCountPerActivity(getContext());
        if (max > 0 && list.size() > max) list = list.subList(0, max);
        try {
            ShortcutManagerCompat.setDynamicShortcuts(getContext(), list);
        } catch (RuntimeException e) {
            // Rate limited or refused by the launcher: the icon keeps the ones it had.
        }
        call.resolve();
    }

    @PluginMethod
    public void canPin(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("value", ShortcutManagerCompat.isRequestPinShortcutSupported(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void pin(PluginCall call) {
        ShortcutInfoCompat s = shortcut(call.getData(), 0);
        JSObject ret = new JSObject();
        boolean asked = s != null && ShortcutManagerCompat.isRequestPinShortcutSupported(getContext())
            && ShortcutManagerCompat.requestPinShortcut(getContext(), s, null);
        ret.put("asked", asked);
        call.resolve(ret);
    }

    @PluginMethod
    public void copyLink(PluginCall call) {
        String text = call.getString("text", "");
        ClipboardManager cm = (ClipboardManager) getContext().getSystemService(Context.CLIPBOARD_SERVICE);
        if (cm == null || !text.startsWith("imuslim://")) {
            call.reject("no_clipboard");
            return;
        }
        cm.setPrimaryClip(ClipData.newPlainText(text, text));
        call.resolve();
    }

    private ShortcutInfoCompat shortcut(JSONObject o, int rank) {
        String id = o.optString("id", "");
        String label = o.optString("label", "");
        String url = o.optString("url", "");
        if (id.isEmpty() || label.isEmpty() || !url.startsWith("imuslim://")) return null;
        Context ctx = getContext();
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse(url), ctx, MainActivity.class);
        return new ShortcutInfoCompat.Builder(ctx, id)
            .setShortLabel(label)
            .setLongLabel(label)
            .setIcon(IconCompat.createWithAdaptiveBitmap(icon(ctx, o.optString("icon", ""))))
            .setIntent(open)
            .setRank(rank)
            .build();
    }

    /** The adaptive icon: 108 dp of paper, the 24-unit line drawing in the middle 44 dp (inside the 66 dp safe zone). */
    static Bitmap icon(Context ctx, String name) {
        float d = ctx.getResources().getDisplayMetrics().density;
        int size = Math.round(108 * d);
        Bitmap b = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(b);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(PAPER);
        c.drawRect(0, 0, size, size, p);
        Drawable v = MqIcons.drawable(ctx, name);
        if (v != null) {
            int glyph = Math.round(44 * d);
            int at = (size - glyph) / 2;
            v.setBounds(at, at, at + glyph, at + glyph);
            v.setTint(GOLD_DARK);
            v.draw(c);
        }
        return b;
    }
}

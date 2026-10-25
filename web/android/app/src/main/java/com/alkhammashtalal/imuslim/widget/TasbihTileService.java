package com.alkhammashtalal.imuslim.widget;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.graphics.drawable.Icon;
import android.service.quicksettings.Tile;
import android.service.quicksettings.TileService;
import com.alkhammashtalal.imuslim.R;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * «سبّح» in Android's Quick Settings (add-on 0072-add19 §4): most Android phones take no widget on the lock screen, so
 * the tasbih's button lives in the panel pulled down from the top, reachable from the lock screen too. Each press
 * counts one in the same counter as the home-screen widget and the app (widgets.json, WidgetActions.tap, the
 * iPhone's TasbihCount.tap), the app not opened; the tile's title carries the count («سبّح ١٢») and its subtitle the
 * current dhikr. Nothing leaves the phone.
 */
public class TasbihTileService extends TileService {

    @Override
    public void onStartListening() {
        refresh();
    }

    @Override
    public void onClick() {
        Context ctx = getApplicationContext();
        JSONObject data = WidgetStore.load(ctx);
        JSONObject t = data == null ? null : data.optJSONObject("tasbih");
        if (t != null) {
            try {
                WidgetActions.tap(t, WidgetActions.today());
                WidgetStore.save(ctx, data.toString());
            } catch (JSONException ignored) {}
            Widgets.update(ctx, AppWidgetManager.getInstance(ctx), "tasbih", Widgets.ids(ctx, "tasbih"));
        }
        refresh();
    }

    /** The tile's title, «سبّح ١٢», in the app's language and digits; the dhikr under it. */
    private void refresh() {
        Tile tile = getQsTile();
        if (tile == null) return;
        Context ctx = getApplicationContext();
        JSONObject data = WidgetStore.load(ctx);
        String name = label(data, getString(R.string.tile_tasbih_name));
        JSONObject t = data == null ? null : data.optJSONObject("tasbih");
        String zikr = "";
        if (t != null) {
            JSONArray steps = t.optJSONArray("steps");
            boolean today = WidgetActions.today().equals(t.optString("day"));
            int n = today ? t.optInt("n") : 0;
            if (steps != null && steps.length() > 0) {
                JSONObject s = steps.optJSONObject(Math.min(Math.max(0, t.optInt("step")), steps.length() - 1));
                zikr = s == null ? "" : s.optString("zikr", "");
            }
            name = name + " " + digits(n, t.optString("digits", "0123456789"));
        }
        tile.setLabel(name);
        tile.setSubtitle(zikr);
        tile.setContentDescription(name);
        tile.setIcon(Icon.createWithResource(ctx, R.drawable.ic_tile_tasbih));
        tile.setState(Tile.STATE_ACTIVE);
        tile.updateTile();
    }

    /** The control's name the app wrote (labels.names.ctlCount), else the built-in one. */
    static String label(JSONObject data, String fallback) {
        JSONObject names = data == null ? null : data.optJSONObject("labels") == null ? null : data.optJSONObject("labels").optJSONObject("names");
        JSONObject c = names == null ? null : names.optJSONObject("ctlCount");
        String v = c == null ? "" : c.optString("name", "");
        return v.isEmpty() ? fallback : v;
    }

    /** A number in the app's ten digits. */
    static String digits(int n, String set) {
        String latin = String.valueOf(n);
        if (set == null || set.codePointCount(0, set.length()) != 10) return latin;
        int[] cps = set.codePoints().toArray();
        StringBuilder sb = new StringBuilder();
        for (char ch : latin.toCharArray()) sb.appendCodePoint(Character.isDigit(ch) ? cps[ch - '0'] : ch);
        return sb.toString();
    }

    /** Ask the system to draw the tile again (after the app or a widget counted). */
    public static void refresh(Context ctx) {
        try {
            TileService.requestListeningState(ctx, new ComponentName(ctx, TasbihTileService.class));
        } catch (Exception ignored) {}
    }
}

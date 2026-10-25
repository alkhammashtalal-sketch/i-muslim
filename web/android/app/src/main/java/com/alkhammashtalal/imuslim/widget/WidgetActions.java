package com.alkhammashtalal.imuslim.widget;

import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The widgets' own events (reply 0067): «+١» in the tasbih widget, the alarm at the next prayer time or day start, and
 * the clock or the time zone changing. Nothing leaves the phone.
 */
public class WidgetActions extends BroadcastReceiver {

    static final String TASBIH = "com.alkhammashtalal.imuslim.widget.TASBIH";
    static final String TICK = "com.alkhammashtalal.imuslim.widget.TICK";
    /** «التالي» in «اسم الله لليوم» (add-on 0072-add10 §1, §4): the next page, in the widget, the app not opened. */
    static final String NAME_NEXT = "com.alkhammashtalal.imuslim.widget.NAME_NEXT";

    @Override
    public void onReceive(Context ctx, Intent intent) {
        String a = intent.getAction();
        if (TASBIH.equals(a)) {
            JSONObject data = WidgetStore.load(ctx);
            JSONObject t = data == null ? null : data.optJSONObject("tasbih");
            if (t != null) {
                try {
                    tap(t, today());
                    WidgetStore.save(ctx, data.toString());
                } catch (JSONException e) {
                    return;
                }
            }
            Widgets.update(ctx, AppWidgetManager.getInstance(ctx), "tasbih", Widgets.ids(ctx, "tasbih"));
            TasbihTileService.refresh(ctx);
            return;
        }
        if (NAME_NEXT.equals(a)) {
            int id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
            if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return;
            Widgets.turnPage(ctx, id, WidgetPainter.riyadhDay(System.currentTimeMillis()));
            AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
            android.appwidget.AppWidgetProviderInfo info = mgr.getAppWidgetInfo(id);
            String kind = info == null ? null : kindOf(info.provider.getClassName());
            if (kind != null) Widgets.update(ctx, mgr, kind, new int[] { id });
            return;
        }
        Widgets.updateAll(ctx);
    }

    /** The widget kind of a provider's class (MuslimWidget$NameLarge → nameLarge). */
    static String kindOf(String cls) {
        for (String k : Widgets.KINDS) if (Widgets.provider(k).getName().equals(cls)) return k;
        return null;
    }

    /**
     * One tap, exactly as a tap in the app's Tasbih.tsx and the iPhone's widget (TasbihIntent.swift TasbihCount.tap):
     * a free count (after == false): target 0 counts on; otherwise at the target it stays full and the next tap starts
     * again at one; after the prayer (after == true): the last step done stays done; otherwise n + 1, and at the step's
     * target the next step begins at 0 (the last step keeps n at its target). Each counted tap adds one to today's total.
     */
    static void tap(JSONObject t, String today) throws JSONException {
        if (!today.equals(t.optString("day"))) {
            t.put("day", today);
            t.put("total", 0);
        }
        JSONArray steps = t.optJSONArray("steps");
        if (steps == null || steps.length() == 0) return;
        int step = Math.min(Math.max(0, t.optInt("step")), steps.length() - 1);
        t.put("step", step);
        int n = t.optInt("n");
        if (t.optBoolean("after")) {
            int lim = Math.max(1, steps.getJSONObject(step).optInt("target"));
            boolean last = step >= steps.length() - 1;
            if (last && n >= lim) return;
            int next = n + 1;
            t.put("total", t.optInt("total") + 1);
            if (next < lim || last) {
                t.put("n", next);
            } else {
                t.put("n", 0);
                t.put("step", step + 1);
            }
        } else {
            int limit = steps.getJSONObject(step).optInt("target");
            t.put("n", limit > 0 && n >= limit ? 1 : n + 1);
            t.put("total", t.optInt("total") + 1);
        }
        t.put("changedByWidget", true);
    }

    /** The phone's date as the app's today(): yyyy-MM-dd. */
    static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }
}

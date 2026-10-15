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
            return;
        }
        Widgets.updateAll(ctx);
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

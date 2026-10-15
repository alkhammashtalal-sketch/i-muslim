package com.alkhammashtalal.imuslim.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;
import com.alkhammashtalal.imuslim.MainActivity;
import com.alkhammashtalal.imuslim.R;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Drawing the widgets and keeping them current (reply 0067). Each widget is one picture drawn here by WidgetPainter at
 * the widget's own size, with the iPhone's layout, fonts and pictures (Views.swift, Theme.swift), and on it:
 * - the countdown to the next prayer, Android's own live timer (Chronometer), where the iPhone has its live timer;
 * - the taps: the whole widget opens its page (imuslim://…, as on the iPhone), «+١» counts, a situation opens its own.
 * They are drawn again when the app writes its data, at each prayer time and day start ahead (an alarm), when the clock
 * or the time zone changes, and every half hour (the providers' updatePeriodMillis).
 */
public final class Widgets {

    static final String[] KINDS = { "next", "times", "date", "ayah", "hadith", "tasbih", "adhkar", "mawaqif" };
    static final int[] TAPS = { R.id.tap0, R.id.tap1, R.id.tap2, R.id.tap3, R.id.tap4, R.id.tap5, R.id.tap6, R.id.tap7 };
    static final int[] BOXES = { R.id.tap_box0, R.id.tap_box1, R.id.tap_box2, R.id.tap_box3, R.id.tap_box4, R.id.tap_box5, R.id.tap_box6, R.id.tap_box7 };

    private Widgets() {}

    static Class<?> provider(String kind) {
        switch (kind) {
            case "next":
                return MuslimWidget.Next.class;
            case "times":
                return MuslimWidget.Times.class;
            case "date":
                return MuslimWidget.Date.class;
            case "ayah":
                return MuslimWidget.Ayah.class;
            case "hadith":
                return MuslimWidget.Hadith.class;
            case "tasbih":
                return MuslimWidget.Tasbih.class;
            case "adhkar":
                return MuslimWidget.Adhkar.class;
            default:
                return MuslimWidget.Mawaqif.class;
        }
    }

    static int[] ids(Context ctx, String kind) {
        return AppWidgetManager.getInstance(ctx).getAppWidgetIds(new ComponentName(ctx, provider(kind)));
    }

    public static void updateAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        for (String k : KINDS) {
            int[] ids = ids(ctx, k);
            if (ids.length > 0) update(ctx, mgr, k, ids);
        }
        schedule(ctx);
    }

    static void update(Context ctx, AppWidgetManager mgr, String kind, int[] ids) {
        JSONObject data = WidgetStore.load(ctx);
        long now = System.currentTimeMillis();
        WidgetPainter painter = new WidgetPainter(ctx);
        float density = ctx.getResources().getDisplayMetrics().density;
        for (int id : ids) {
            float[] dp = sizeDp(mgr.getAppWidgetOptions(id), kind);
            int w = Math.max(1, Math.round(dp[0] * density));
            int h = Math.max(1, Math.round(dp[1] * density));
            try {
                WidgetPainter.Result r = painter.paint(kind, data, now, w, h);
                mgr.updateAppWidget(id, views(ctx, r, w, h));
            } catch (RuntimeException e) {
                // A widget that cannot be drawn now keeps its last picture.
            }
        }
    }

    /** The widget's size on the home screen in portrait (Android's own rule: the smallest width, the largest height). */
    static float[] sizeDp(Bundle o, String kind) {
        float w = o == null ? 0 : o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH);
        float h = o == null ? 0 : o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT);
        if (w <= 0 || h <= 0) {
            String size = WidgetPainter.size(kind);
            w = "small".equals(size) ? 170 : 360;
            h = "large".equals(size) ? 380 : 170;
        }
        return new float[] { w, h };
    }

    static RemoteViews views(Context ctx, WidgetPainter.Result r, int w, int h) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_muslim);
        v.setImageViewBitmap(R.id.image, r.bitmap);
        v.setContentDescription(R.id.image, r.description);
        v.setOnClickPendingIntent(R.id.image, open(ctx, r.url));
        if (r.countdownTarget > 0) {
            v.setViewVisibility(R.id.count_box, View.VISIBLE);
            v.setViewPadding(R.id.count_box, Math.round(r.countdown.left), Math.round(r.countdown.top), Math.round(w - r.countdown.right), 0);
            long base = SystemClock.elapsedRealtime() + (r.countdownTarget - System.currentTimeMillis());
            v.setChronometer(R.id.count, base, null, true);
            v.setChronometerCountDown(R.id.count, true);
            v.setTextViewTextSize(R.id.count, TypedValue.COMPLEX_UNIT_PX, r.countdownSize);
            v.setTextColor(R.id.count, r.countdownColor);
            v.setInt(R.id.count, "setGravity", r.countdownGravity);
        } else {
            v.setViewVisibility(R.id.count_box, View.GONE);
        }
        for (int i = 0; i < TAPS.length; i++) {
            if (i >= r.taps.size()) {
                v.setViewVisibility(BOXES[i], View.GONE);
                continue;
            }
            WidgetPainter.Tap t = r.taps.get(i);
            v.setViewVisibility(BOXES[i], View.VISIBLE);
            v.setViewPadding(BOXES[i], Math.round(t.rect.left), Math.round(t.rect.top), Math.round(w - t.rect.right), Math.round(h - t.rect.bottom));
            v.setContentDescription(TAPS[i], t.label);
            v.setOnClickPendingIntent(TAPS[i], t.url.equals(WidgetActions.TASBIH) ? tasbih(ctx) : open(ctx, t.url));
        }
        return v;
    }

    /** The app at a page: its link imuslim://…, as the iPhone's widgets open it (web/src/native/NativeDevice.tsx). */
    static PendingIntent open(Context ctx, String url) {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url), ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(ctx, url.hashCode(), i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    static PendingIntent tasbih(Context ctx) {
        Intent i = new Intent(ctx, WidgetActions.class).setAction(WidgetActions.TASBIH);
        return PendingIntent.getBroadcast(ctx, 1, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** The next moment a widget changes by itself: a prayer time or a day's start ahead (the iPhone's timelines), else
     *  in six hours. One alarm for all; none when no widget is on the home screen. */
    static void schedule(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        Intent i = new Intent(ctx, WidgetActions.class).setAction(WidgetActions.TICK);
        PendingIntent pi = PendingIntent.getBroadcast(ctx, 2, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        boolean any = false;
        for (String k : KINDS) any |= ids(ctx, k).length > 0;
        if (!any) {
            am.cancel(pi);
            return;
        }
        long now = System.currentTimeMillis();
        long next = now + 6 * 3600_000L;
        JSONObject data = WidgetStore.load(ctx);
        JSONArray days = data == null ? null : data.optJSONArray("days");
        for (int d = 0; days != null && d < days.length(); d++) {
            JSONObject day = days.optJSONObject(d);
            if (day == null) continue;
            long start = day.optLong("start");
            if (start > now && start < next) next = start;
            JSONArray times = day.optJSONArray("times");
            if (times == null || times.length() == 0) {
                long noon = start + 12 * 3600_000L;
                if (noon > now && noon < next) next = noon;
            }
            for (int t = 0; times != null && t < times.length(); t++) {
                long at = times.optJSONObject(t).optLong("at");
                if (at > now && at < next) next = at;
            }
        }
        next += 1000;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !am.canScheduleExactAlarms()) {
            am.set(AlarmManager.RTC, next, pi);
        } else {
            am.setExact(AlarmManager.RTC, next, pi);
        }
    }
}

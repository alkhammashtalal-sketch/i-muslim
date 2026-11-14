package com.alkhammashtalal.imuslim;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.SharedPreferences;
import android.os.Bundle;
import com.alkhammashtalal.imuslim.widget.Widgets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * The debug build's widget adder for the emulator tests (reply 0067): `am start -n …/.PinWidgetTestActivity --es kind
 * next` asks the launcher to add that widget, which the launcher confirms on screen as when a user adds it. Not in the
 * release build (web/android/app/src/debug).
 * Add-on 0072-add10's shots: `--es refresh 1` draws every widget again (after a test file was copied into the app's
 * widgets.json), and `--es page all:2` puts every «اسم الله لليوم» at its third page today, as two presses of «التالي».
 */
public class PinWidgetTestActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        String page = getIntent().getStringExtra("page");
        if (page != null) {
            int n = Integer.parseInt(page.substring(page.indexOf(':') + 1));
            SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            f.setTimeZone(TimeZone.getTimeZone("GMT+03:00"));
            String day = f.format(new Date());
            SharedPreferences.Editor e = getSharedPreferences("widget_pages", MODE_PRIVATE).edit();
            AppWidgetManager mgr = AppWidgetManager.getInstance(this);
            for (String k : new String[] { "NameSmall", "NameMedium", "NameLarge" }) {
                for (int id : mgr.getAppWidgetIds(new ComponentName(this, "com.alkhammashtalal.imuslim.widget.MuslimWidget$" + k))) {
                    e.putString("d" + id, day).putInt("p" + id, n);
                }
            }
            e.commit();
            Widgets.updateAll(this);
            finish();
            return;
        }
        if (getIntent().getStringExtra("refresh") != null) {
            Widgets.updateAll(this);
            finish();
            return;
        }
        String kind = getIntent().getStringExtra("kind");
        String cls = "com.alkhammashtalal.imuslim.widget.MuslimWidget$" + (kind == null ? "Next" : Character.toUpperCase(kind.charAt(0)) + kind.substring(1));
        AppWidgetManager.getInstance(this).requestPinAppWidget(new ComponentName(this, cls), null, null);
        finish();
    }
}

package com.alkhammashtalal.imuslim;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.os.Bundle;

/**
 * The debug build's widget adder for the emulator tests (reply 0067): `am start -n …/.PinWidgetTestActivity --es kind
 * next` asks the launcher to add that widget, which the launcher confirms on screen as when a user adds it. Not in the
 * release build (web/android/app/src/debug).
 */
public class PinWidgetTestActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        String kind = getIntent().getStringExtra("kind");
        String cls = "com.alkhammashtalal.imuslim.widget.MuslimWidget$" + (kind == null ? "Next" : Character.toUpperCase(kind.charAt(0)) + kind.substring(1));
        AppWidgetManager.getInstance(this).requestPinAppWidget(new ComponentName(this, cls), null, null);
        finish();
    }
}

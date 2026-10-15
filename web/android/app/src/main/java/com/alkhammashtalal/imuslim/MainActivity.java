package com.alkhammashtalal.imuslim;

import android.graphics.Color;
import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

/**
 * The Android app (reply 0066).
 * - Edge to edge on every Android version, as Android 15+ draws anyway: with a web view of 140 or newer, Capacitor gives
 *   the bars' heights to the page (env(safe-area-inset-*)) and the page goes under them, as on the iPhone. With an older
 *   one Capacitor keeps the page between the bars, which then show the window's background: the welcome page's sky at
 *   launch (the theme's android:windowBackground), then what web/src/native/android-bars.ts sets through AndroidBarsPlugin.
 * - Behind the web view is the welcome page's sky too (@color/launch_welcome_sky), the launch screen's colour, as the
 *   iPhone app keeps its launch sky behind its web view (AppViewController.swift): whatever shows before the page is
 *   drawn is that blue, never white.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(AndroidBarsPlugin.class);
        super.onCreate(savedInstanceState);
        // Transparent bars with no scrim of the system's, in the light app's style (dark icons; the welcome page turns them
        // light over its painting, web/src/native/android-bars.ts and Welcome.tsx).
        SystemBarStyle bars = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT);
        EdgeToEdge.enable(this, bars, bars);
        getBridge().getWebView().setBackgroundColor(ContextCompat.getColor(this, R.color.launch_welcome_sky));
    }
}

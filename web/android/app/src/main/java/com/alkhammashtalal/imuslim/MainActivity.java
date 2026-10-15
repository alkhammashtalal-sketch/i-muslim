package com.alkhammashtalal.imuslim;

import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.nfc.NfcAdapter;
import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import androidx.activity.SystemBarStyle;
import androidx.core.content.ContextCompat;
import com.alkhammashtalal.imuslim.media.RecitationMediaPlugin;
import com.alkhammashtalal.imuslim.widget.WidgetBridgePlugin;
import com.getcapacitor.BridgeActivity;

/**
 * The Android app (reply 0066).
 * - Edge to edge on every Android version, as Android 15+ draws anyway: with a web view of 140 or newer, Capacitor gives
 *   the bars' heights to the page (env(safe-area-inset-*)) and the page goes under them, as on the iPhone. With an older
 *   one Capacitor keeps the page between the bars, which then show the window's background: the welcome page's sky at
 *   launch (the theme's android:windowBackground), then what web/src/native/android/bars.ts sets through AndroidBarsPlugin.
 * - Behind the web view is the welcome page's sky too (@color/launch_welcome_sky), the launch screen's colour, as the
 *   iPhone app keeps its launch sky behind its web view (AppViewController.swift): whatever shows before the page is
 *   drawn is that blue, never white.
 * - Reply 0067: the app's own plugins for the widgets (WidgetBridge, as on the iPhone), the icon's and pinned shortcuts
 *   (AndroidShortcuts), the recitation on the lock screen (RecitationMedia) and the voices on the phone for reading
 *   replies aloud (AndroidVoices). An NFC tag carrying the app's link
 *   (imuslim://…) arrives as NFC's own action; it is handed on as an ordinary link, so the page opens as from a widget.
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(AndroidBarsPlugin.class);
        registerPlugin(WidgetBridgePlugin.class);
        registerPlugin(ShortcutsPlugin.class);
        registerPlugin(RecitationMediaPlugin.class);
        registerPlugin(VoicesPlugin.class);
        asLink(getIntent());
        super.onCreate(savedInstanceState);
        // Transparent bars with no scrim of the system's, in the light app's style (dark icons; the welcome page turns them
        // light over its painting, web/src/native/android/bars.ts and Welcome.tsx).
        SystemBarStyle bars = SystemBarStyle.light(Color.TRANSPARENT, Color.TRANSPARENT);
        EdgeToEdge.enable(this, bars, bars);
        getBridge().getWebView().setBackgroundColor(ContextCompat.getColor(this, R.color.launch_welcome_sky));
    }

    @Override
    protected void onNewIntent(Intent intent) {
        asLink(intent);
        super.onNewIntent(intent);
    }

    /** An NFC tag's imuslim:// link (AndroidManifest.xml NDEF_DISCOVERED) becomes the ordinary link Capacitor opens. */
    static void asLink(Intent intent) {
        if (intent == null || !NfcAdapter.ACTION_NDEF_DISCOVERED.equals(intent.getAction())) return;
        Uri data = intent.getData();
        if (data != null && "imuslim".equals(data.getScheme())) intent.setAction(Intent.ACTION_VIEW);
    }
}

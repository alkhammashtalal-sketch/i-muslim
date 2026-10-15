package com.alkhammashtalal.imuslim;

import android.content.res.Configuration;
import android.graphics.drawable.GradientDrawable;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.util.WebColor;

/**
 * The colours behind the status and navigation bars (reply 0066; web/src/native/android/bars.ts). They show only where
 * Capacitor keeps the page between the bars (a web view older than 140): its padding is the window's own background,
 * here the top colour above the middle and the bottom colour below it. With a newer web view the page covers them.
 * Capacitor's SystemBars puts the theme's background back at every style change and configuration change, so the last
 * colours are set again after a configuration change.
 */
@CapacitorPlugin(name = "AndroidBars")
public class AndroidBarsPlugin extends Plugin {

    private int[] behind = null;

    @PluginMethod
    public void setBehind(PluginCall call) {
        final int top;
        final int bottom;
        try {
            top = WebColor.parseColor(call.getString("top", "#000000"));
            bottom = WebColor.parseColor(call.getString("bottom", "#000000"));
        } catch (IllegalArgumentException e) {
            call.reject("a colour as #RRGGBB");
            return;
        }
        behind = new int[] { top, top, bottom, bottom };
        getBridge()
            .executeOnMainThread(() -> {
                apply();
                call.resolve();
            });
    }

    @Override
    protected void handleOnConfigurationChanged(Configuration newConfig) {
        super.handleOnConfigurationChanged(newConfig);
        // After SystemBars' own handler, which runs in the same pass.
        getBridge().getWebView().post(this::apply);
    }

    private void apply() {
        if (behind == null) return;
        getActivity().getWindow().getDecorView().setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM, behind));
    }
}

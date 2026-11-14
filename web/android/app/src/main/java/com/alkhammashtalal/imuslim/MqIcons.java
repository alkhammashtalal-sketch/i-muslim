package com.alkhammashtalal.imuslim;

import android.content.Context;
import android.graphics.drawable.Drawable;
import androidx.core.content.ContextCompat;

/**
 * The situations' line drawings (reply 0067): res/drawable/mq_&lt;name&gt;.xml, made by web/scripts/android-widgets.mjs from
 * the app's own icons (web/src/v2/daily/mawaqif/icons.tsx), for the icon's shortcuts, the pinned ones and the
 * «أذكار المواقف» widget. A name the app does not have is the heart, as the app's SituationIcon falls back.
 */
public final class MqIcons {

    private MqIcons() {}

    public static Drawable drawable(Context ctx, String name) {
        int id = ctx.getResources().getIdentifier("mq_" + name, "drawable", ctx.getPackageName());
        if (id == 0) id = R.drawable.mq_heart;
        Drawable d = ContextCompat.getDrawable(ctx, id);
        return d == null ? null : d.mutate();
    }
}

package com.alkhammashtalal.imuslim.widget;

import static org.junit.Assume.assumeTrue;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.view.Gravity;
import androidx.core.content.res.ResourcesCompat;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.alkhammashtalal.imuslim.R;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * The Android widgets' review pictures (stars-fix, Opus review of stars-0072 #3): WidgetPainter's own drawing, as the
 * home screen shows it, written to PNG files, with no launcher and no pinning. Not a test of anything: it skips when
 * no sample is there. Run by web/scripts/android-widget-render.sh, which copies the file the app writes
 * (worker/test/widget-names-0072.test.ts WIDGET_SAMPLES) into the app's files/render/in and takes files/render/out.
 * Sizes in dp: the iPhone's boards (170 × 170, 364 × 170, 364 × 382) for the review, and the widget list's pictures'
 * own proportions for the previews. The next prayer's countdown is Android's live Chronometer over the picture; it is
 * drawn here in its place, font, size and colour, as the widget shows it.
 */
@RunWith(AndroidJUnit4.class)
public class WidgetRenderTest {

    private Context ctx;
    private File out;
    private float density;

    @Test
    public void render() throws Exception {
        ctx = InstrumentationRegistry.getInstrumentation().getTargetContext();
        File in = new File(ctx.getFilesDir(), "render/in");
        assumeTrue(new File(in, "sample-ar-2.json").exists());
        out = new File(ctx.getFilesDir(), "render/out");
        out.mkdirs();
        density = ctx.getResources().getDisplayMetrics().density;
        WidgetPainter p = new WidgetPainter(ctx);
        for (String lang : new String[] { "ar", "en" }) {
            JSONObject d = load(new File(in, "sample-" + lang + "-2.json"));
            long t = d.optLong("built");
            // The review: the sky widgets at the iPhone's boards.
            save(p, "next", d, t, 170, 170, 0, "next-small-" + lang);
            save(p, "tasbih", d, t, 170, 170, 0, "tasbih-small-" + lang);
            save(p, "date", d, t, 170, 170, 0, "date-small-" + lang);
            save(p, "times", d, t, 364, 382, 0, "times-large-" + lang);
            save(p, "mawaqif", d, t, 364, 382, 0, "mawaqif-large-" + lang);
            save(p, "nameSmall", d, t, 170, 170, 0, "name-small-" + lang);
            save(p, "nameMedium", d, t, 364, 170, 0, "name-medium-" + lang);
            save(p, "nameLarge", d, t, 364, 382, 0, "name-large-p1-" + lang);
            save(p, "nameLarge", d, t, 364, 382, 1, "name-large-p2-" + lang);
            save(p, "salafMedium", d, t, 364, 170, 0, "salaf-medium-" + lang);
            save(p, "salafLarge", d, t, 364, 382, 0, "salaf-large-" + lang);
            // The quiet card on the sky (no data yet).
            save(p, "next", null, t, 170, 170, 0, "quiet-small-" + lang);
            save(p, "times", null, t, 364, 382, 0, "quiet-large-" + lang);
            // The widget list's pictures, at their own proportions (res/drawable*-nodpi/widget_preview_*.webp).
            save(p, "next", d, t, 170, 170, 0, "preview-next-" + lang);
            save(p, "tasbih", d, t, 170, 170, 0, "preview-tasbih-" + lang);
            save(p, "times", d, t, 364, 382, 0, "preview-times-" + lang);
            save(p, "mawaqif", d, t, 364, 382, 0, "preview-mawaqif-" + lang);
            save(p, "nameSmall", d, t, 170, 216, 0, "preview-name_small-" + lang);
            save(p, "nameMedium", d, t, 364, 221, 0, "preview-name_medium-" + lang);
            save(p, "nameLarge", d, t, 364, 457, 0, "preview-name_large-" + lang);
            save(p, "salafMedium", d, t, 364, 221, 0, "preview-salaf_medium-" + lang);
            save(p, "salafLarge", d, t, 364, 457, 0, "preview-salaf_large-" + lang);
            // The name's small widget in every light of the day, with its «٥ من ٩٦» and without it (of = ""), for the
            // contrast under the line.
            File blankFile = new File(in, "sample-" + lang + "-2-blank.json");
            JSONObject blank = blankFile.exists() ? load(blankFile) : null;
            JSONArray sky = d.getJSONArray("days").getJSONObject(0).optJSONArray("sky");
            for (int i = 0; sky != null && i < sky.length(); i++) {
                JSONObject k = sky.getJSONObject(i);
                long at = k.getLong("at") + 20 * 60_000L;
                String tag = lang + "-" + i + "-" + k.getString("state");
                save(p, "nameSmall", d, at, 170, 170, 0, "android-" + tag + "-text");
                if (blank != null) save(p, "nameSmall", blank, at, 170, 170, 0, "android-" + tag + "-bg");
            }
        }
    }

    private static JSONObject load(File f) throws Exception {
        return new JSONObject(new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8));
    }

    private void save(WidgetPainter p, String kind, JSONObject data, long now, int wDp, int hDp, int page, String name) throws Exception {
        int w = Math.round(wDp * density), h = Math.round(hDp * density);
        WidgetPainter.Result r = WidgetPainter.twoModes(kind) ? p.paint(kind, data, now, w, h, page, false) : p.paint(kind, data, now, w, h);
        if (r.countdownTarget > 0 && r.countdown != null) countdown(r, now);
        try (FileOutputStream o = new FileOutputStream(new File(out, name + ".png"))) {
            r.bitmap.compress(Bitmap.CompressFormat.PNG, 100, o);
        }
    }

    /** The Chronometer's text where the widget puts it: plex_semibold, no font padding, its size, colour and gravity. */
    private void countdown(WidgetPainter.Result r, long now) {
        long s = Math.max(0, (r.countdownTarget - now) / 1000);
        String text = String.format(Locale.US, s >= 3600 ? "%d:%02d:%02d" : "%2$02d:%3$02d", s / 3600, (s / 60) % 60, s % 60);
        Typeface tf = ResourcesCompat.getFont(ctx, R.font.plex_semibold);
        Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
        paint.setTypeface(tf);
        paint.setTextSize(r.countdownSize);
        paint.setColor(r.countdownColor);
        float tw = paint.measureText(text);
        int g = r.countdownGravity & Gravity.HORIZONTAL_GRAVITY_MASK;
        float x = g == Gravity.RIGHT || g == Gravity.END ? r.countdown.right - tw : g == Gravity.CENTER_HORIZONTAL ? r.countdown.centerX() - tw / 2 : r.countdown.left;
        Paint.FontMetrics fm = paint.getFontMetrics();
        new Canvas(r.bitmap).drawText(text, x, r.countdown.top - fm.ascent, paint);
    }
}

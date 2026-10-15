package com.alkhammashtalal.imuslim.widget;

import android.content.Context;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.BitmapShader;
import android.graphics.BlendMode;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.LinearGradient;
import android.graphics.Matrix;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.RadialGradient;
import android.graphics.RectF;
import android.graphics.Shader;
import android.graphics.Typeface;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.text.Layout;
import android.text.StaticLayout;
import android.text.TextDirectionHeuristic;
import android.text.TextDirectionHeuristics;
import android.text.TextPaint;
import android.text.TextUtils;
import android.view.Gravity;
import androidx.core.content.res.ResourcesCompat;
import com.alkhammashtalal.imuslim.R;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.TimeZone;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * The widgets' pictures (reply 0067): the iPhone's widgets (web/ios/App/MuslimWidgets/Views.swift and Theme.swift) drawn
 * on Android at the widget's own size. The same board (a 179-point small widget, 380 × 179 medium, 380 × 396 large),
 * every size its number times the widget's scale; the same colours, fonts (IBM Plex Sans Arabic and Amiri, res/font)
 * and pictures (the sky, the paper and the shamsa, res/drawable-nodpi). Every text comes ready from the app's data
 * (web/src/native/widget-data.ts); this only places it. The ayah is never cut: it is set smaller, down to 0.7, or the
 * widget shows its reference and an invitation to open it (CLAUDE.md §3 rule 4).
 */
final class WidgetPainter {

    // Theme.swift MW
    static final int INK = 0xFF1B3466;
    static final int GOLD = 0xFFC9A04E;
    static final int GOLD2 = 0xFFE2C27C;
    static final int GOLD_DARK = 0xFF94712C;
    static final int PAPER = 0xFFF3EAD6;
    static final int MUTED = 0xFF6B5A45;
    static final int PAPER_BASE = 0xFFF1E6CC;
    static final int SKY_MID = 0xFF163A7C;
    static final int COUNTDOWN = 0xFFF1D391;
    static final int DISC_MONTH = 0xFF5D4A2C;
    static final int DISC_YEAR = 0xFF6B5636;
    static final int ROW_TEXT = 0xFF3B2C17;
    static final int HADITH_TEXT = 0xFF2B2113;
    static final int DATES_TEXT = 0xFFDFE6F5;
    static final int FRAME_ON_SKY = 0xBFE2C27C;
    static final int FRAME_ON_PAPER = 0x99A77F33;

    static final int START = -1, CENTER = 0, END = 1;

    static final class Tap {
        final RectF rect;
        final String url;
        final String label;

        Tap(RectF rect, String url, String label) {
            this.rect = rect;
            this.url = url;
            this.label = label;
        }
    }

    static final class Result {
        Bitmap bitmap;
        String url = "imuslim://today";
        String description = "";
        long countdownTarget = 0;
        RectF countdown;
        float countdownSize;
        int countdownColor;
        int countdownGravity;
        final List<Tap> taps = new ArrayList<>();
    }

    /** small, medium or large: the iPhone's family of each widget. */
    static String size(String kind) {
        switch (kind) {
            case "ayah":
            case "hadith":
                return "medium";
            case "times":
            case "mawaqif":
                return "large";
            default:
                return "small";
        }
    }

    private final Context ctx;
    private final Resources res;
    private final float density;
    private final Typeface plexR, plexM, plexSB, plexB, amiri, amiriB;

    // The picture being drawn.
    private Canvas c;
    private float W, H, u, s, radius;
    private boolean rtl;
    private Result out;
    private final StringBuilder said = new StringBuilder();

    WidgetPainter(Context ctx) {
        this.ctx = ctx;
        this.res = ctx.getResources();
        this.density = res.getDisplayMetrics().density;
        plexR = font(R.font.plex_regular);
        plexM = font(R.font.plex_medium);
        plexSB = font(R.font.plex_semibold);
        plexB = font(R.font.plex_bold);
        amiri = font(R.font.amiri_regular);
        amiriB = font(R.font.amiri_bold);
    }

    private Typeface font(int id) {
        Typeface t = ResourcesCompat.getFont(ctx, id);
        return t == null ? Typeface.DEFAULT : t;
    }

    Result paint(String kind, JSONObject data, long now, int w, int h) {
        out = new Result();
        said.setLength(0);
        W = w;
        H = h;
        String fam = size(kind);
        float bw = "small".equals(fam) ? 179 : 380;
        float bh = "large".equals(fam) ? 396 : 179;
        s = Math.min(W / density / bw, H / density / bh);
        u = s * density;
        rtl = data != null ? data.optBoolean("rtl", true) : fallbackRtl();
        radius = cornerRadius();
        out.bitmap = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
        c = new Canvas(out.bitmap);
        Path clip = new Path();
        clip.addRoundRect(new RectF(0, 0, W, H), radius, radius, Path.Direction.CW);
        c.clipPath(clip);
        switch (kind) {
            case "next":
                next(data, now);
                break;
            case "times":
                times(data, now);
                break;
            case "date":
                date(data, now);
                break;
            case "ayah":
                ayah(data, now);
                break;
            case "hadith":
                hadith(data, now);
                break;
            case "tasbih":
                tasbih(data);
                break;
            case "adhkar":
                adhkar(data, now);
                break;
            default:
                mawaqif(data);
        }
        out.description = said.toString().trim();
        return out;
    }

    // MARK: - Reading the data

    static JSONObject dayAt(JSONObject data, long t) {
        JSONArray days = data == null ? null : data.optJSONArray("days");
        for (int i = 0; days != null && i < days.length(); i++) {
            JSONObject d = days.optJSONObject(i);
            if (d != null && d.optLong("start") <= t && t < d.optLong("end")) return d;
        }
        return null;
    }

    /** The first of the five prayers after this moment, across today and the days after it. */
    static JSONObject nextPrayer(JSONObject data, long t) {
        JSONArray days = data.optJSONArray("days");
        for (int i = 0; days != null && i < days.length(); i++) {
            JSONArray times = days.optJSONObject(i).optJSONArray("times");
            for (int k = 0; times != null && k < times.length(); k++) {
                JSONObject x = times.optJSONObject(k);
                if (x.optBoolean("prayer") && x.optLong("at") > t) return x;
            }
        }
        return null;
    }

    private static String str(JSONObject o, String key) {
        return o == null ? "" : o.optString(key, "");
    }

    private JSONObject labels(JSONObject data) {
        return data.optJSONObject("labels") == null ? new JSONObject() : data.optJSONObject("labels");
    }

    private boolean fallbackRtl() {
        String l = res.getConfiguration().getLocales().get(0).getLanguage();
        return !"en".equals(l) && !"id".equals(l) && !"ms".equals(l) && !"tr".equals(l) && !"fr".equals(l) && !"es".equals(l)
            && !"bn".equals(l) && !"hi".equals(l) && !"in".equals(l);
    }

    private float cornerRadius() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            try {
                return res.getDimension(android.R.dimen.system_app_widget_background_radius);
            } catch (Resources.NotFoundException e) {
                // the default below
            }
        }
        return 16 * density;
    }

    // MARK: - Text

    private TextPaint paint(Typeface tf, float size, int color) {
        TextPaint p = new TextPaint(Paint.ANTI_ALIAS_FLAG | Paint.SUBPIXEL_TEXT_FLAG);
        p.setTypeface(tf);
        p.setTextSize(size);
        p.setColor(color);
        return p;
    }

    private static float lineH(TextPaint p) {
        Paint.FontMetrics fm = p.getFontMetrics();
        return fm.descent - fm.ascent;
    }

    private TextDirectionHeuristic dir() {
        return rtl ? TextDirectionHeuristics.FIRSTSTRONG_RTL : TextDirectionHeuristics.FIRSTSTRONG_LTR;
    }

    private Layout.Alignment absolute(String text, int align, TextDirectionHeuristic d) {
        if (align == CENTER) return Layout.Alignment.ALIGN_CENTER;
        boolean wantRight = (align == START) == rtl;
        boolean paraRtl = d.isRtl(text, 0, text.length());
        return wantRight == paraRtl ? Layout.Alignment.ALIGN_NORMAL : Layout.Alignment.ALIGN_OPPOSITE;
    }

    private StaticLayout layout(CharSequence t, TextPaint p, float width, Layout.Alignment a, TextDirectionHeuristic d, int maxLines, float mult) {
        int wi = Math.max(1, (int) Math.ceil(width));
        StaticLayout.Builder b = StaticLayout.Builder.obtain(t, 0, t.length(), p, wi)
            .setAlignment(a)
            .setTextDirection(d)
            .setIncludePad(false)
            .setLineSpacing(0, mult)
            .setBreakStrategy(Layout.BREAK_STRATEGY_HIGH_QUALITY);
        if (maxLines > 0) b.setMaxLines(maxLines).setEllipsize(TextUtils.TruncateAt.END);
        return b.build();
    }

    /** One line in [left, right] at `top`, set smaller down to minScale to fit, then cut with «…». Its height. */
    private float line(String text, Typeface tf, float size, int color, float minScale, float left, float right, float top, int align) {
        if (text == null || text.isEmpty()) return lineH(paint(tf, size, color));
        float width = Math.max(1, right - left);
        TextPaint p = paint(tf, size, color);
        float w = p.measureText(text);
        if (w > width) p.setTextSize(Math.max(size * minScale, size * width / w * 0.99f));
        CharSequence t = TextUtils.ellipsize(text, p, width, TextUtils.TruncateAt.END);
        TextDirectionHeuristic d = dir();
        StaticLayout l = layout(t, p, width, absolute(text, align, d), d, 1, 1);
        c.save();
        c.translate(left, top);
        l.draw(c);
        c.restore();
        said.append(text).append(". ");
        return lineH(paint(tf, size, color));
    }

    private float lineHeight(Typeface tf, float size) {
        return lineH(paint(tf, size, 0));
    }

    /** A paragraph set smaller (to minScale) until it holds in maxLines and maxH; then cut on its last line. */
    private StaticLayout block(String text, Typeface tf, float size, int color, float minScale, float width, int maxLines, float maxH, int align, TextDirectionHeuristic d, float mult) {
        TextPaint p = paint(tf, size, color);
        StaticLayout l = null;
        for (float k = 1f; k >= minScale - 0.001f; k -= 0.05f) {
            p.setTextSize(size * Math.max(k, minScale));
            l = layout(text, p, width, absolute(text, align, d), d, 0, mult);
            if (l.getLineCount() <= maxLines && l.getHeight() <= maxH) return l;
        }
        p.setTextSize(size * minScale);
        int fit = Math.max(1, Math.min(maxLines, linesIn(l, maxH)));
        return layout(text, p, width, absolute(text, align, d), d, fit, mult);
    }

    private static int linesIn(StaticLayout l, float maxH) {
        int n = 0;
        while (n < l.getLineCount() && l.getLineBottom(n) <= maxH + 0.5f) n++;
        return n;
    }

    private void draw(StaticLayout l, float left, float top, String spoken) {
        c.save();
        c.translate(left, top);
        l.draw(c);
        c.restore();
        if (spoken != null) said.append(spoken).append(". ");
    }

    /** The x range's start (the leading side): the right in Arabic and Urdu. */
    private float startX(float left, float right, float w) {
        return rtl ? right - w : left;
    }

    // MARK: - Grounds and frames (Theme.swift)

    private void sky(RectF r) {
        c.save();
        c.clipRect(r);
        Paint g = new Paint();
        RadialGradient rg = new RadialGradient(0, 0, 1, new int[] { 0xFF1F4A96, 0xFF163A7C, 0xFF0F2A5E }, new float[] { 0, 0.6f, 1 }, Shader.TileMode.CLAMP);
        Matrix m = new Matrix();
        m.setScale(r.width() * 0.9f, r.height() * 0.9f);
        m.postTranslate(r.centerX(), r.top + r.height() * 0.4f);
        rg.setLocalMatrix(m);
        g.setShader(rg);
        c.drawRect(r, g);
        tiles(r, R.drawable.widget_sky, 180 * u, 180 * u * 235 / 230, 140, true);
        c.restore();
    }

    private void paper(RectF r) {
        c.save();
        c.clipRect(r);
        Paint g = new Paint();
        g.setColor(PAPER_BASE);
        c.drawRect(r, g);
        tiles(r, R.drawable.widget_paper, 320 * u, 320 * u, 255, false);
        c.restore();
    }

    private void tiles(RectF r, int id, float tw, float th, int alpha, boolean screen) {
        Bitmap b = image(id);
        if (b == null) return;
        BitmapShader sh = new BitmapShader(b, Shader.TileMode.REPEAT, Shader.TileMode.REPEAT);
        Matrix m = new Matrix();
        m.setScale(tw / b.getWidth(), th / b.getHeight());
        m.postTranslate(r.centerX() - tw / 2, r.centerY() - th / 2);
        sh.setLocalMatrix(m);
        Paint p = new Paint(Paint.FILTER_BITMAP_FLAG | Paint.ANTI_ALIAS_FLAG);
        p.setShader(sh);
        p.setAlpha(alpha);
        if (screen) p.setBlendMode(BlendMode.SCREEN);
        c.drawRect(r, p);
    }

    /** The shamsa at 208/179 of the board, its 44% on the box's 44%, on the sky's middle blue. */
    private void medallion(RectF r) {
        c.save();
        c.clipRect(r);
        Paint g = new Paint();
        g.setColor(SKY_MID);
        c.drawRect(r, g);
        Bitmap b = image(R.drawable.widget_medallion);
        if (b != null) {
            float d = 208 * u;
            RectF at = new RectF(r.left + (r.width() - d) / 2, r.top + (r.height() - d) * 0.44f, 0, 0);
            at.right = at.left + d;
            at.bottom = at.top + d;
            c.drawBitmap(b, null, at, new Paint(Paint.FILTER_BITMAP_FLAG | Paint.ANTI_ALIAS_FLAG));
        }
        c.restore();
    }

    private final java.util.HashMap<Integer, Bitmap> images = new java.util.HashMap<>();

    private Bitmap image(int id) {
        if (images.containsKey(id)) return images.get(id);
        BitmapFactory.Options o = new BitmapFactory.Options();
        o.inScaled = false;
        Bitmap b = BitmapFactory.decodeResource(res, id, o);
        images.put(id, b);
        return b;
    }

    /** The inner gold frame: 1 point at inset 6, concentric with the widget's corner. */
    private void insetFrame(int color) {
        float inset = 6 * u;
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        float sw = Math.max(0.75f, s) * density;
        p.setStrokeWidth(sw);
        p.setColor(color);
        float r = Math.max(0, radius - inset);
        c.drawRoundRect(new RectF(inset + sw / 2, inset + sw / 2, W - inset - sw / 2, H - inset - sw / 2), r, r, p);
    }

    private float goldBand(float top) {
        float h = Math.max(2, 3 * s) * density;
        Paint p = new Paint();
        p.setShader(new LinearGradient(0, 0, W, 0, new int[] { 0xFFA77F33, 0xFFF0D58F, 0xFFA77F33 }, null, Shader.TileMode.CLAMP));
        c.drawRect(0, top, W, top + h, p);
        return h;
    }

    /** The board's ✦ stars: top and left in board points and the glyph's size; on the other side left to right. */
    private void stars(RectF r, float[][] list) {
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(GOLD2);
        p.setAlpha(Math.round(255 * 0.85f));
        for (float[] st : list) {
            float d = st[2] * 0.8f * u;
            float x = (st[1] + st[2] * 0.1f) * u;
            float y = (st[0] + st[2] * 0.35f) * u;
            float left = rtl ? r.left + x : r.right - x - d;
            float top = r.top + y;
            float cx = left + d / 2, cy = top + d / 2, rr = d / 2, k = 0.18f;
            Path s = new Path();
            s.moveTo(cx, cy - rr);
            s.quadTo(cx + rr * k, cy - rr * k, cx + rr, cy);
            s.quadTo(cx + rr * k, cy + rr * k, cx, cy + rr);
            s.quadTo(cx - rr * k, cy + rr * k, cx - rr, cy);
            s.quadTo(cx - rr * k, cy - rr * k, cx, cy - rr);
            s.close();
            c.drawPath(s, p);
        }
    }

    private int alpha(int color, float a) {
        return Color.argb(Math.round(Color.alpha(color) * a), Color.red(color), Color.green(color), Color.blue(color));
    }

    // MARK: - A quiet card: one line, centred, on the widget's own ground

    private void quiet(String text, String ground) {
        RectF all = new RectF(0, 0, W, H);
        if ("paper".equals(ground)) paper(all);
        else if ("medallion".equals(ground)) medallion(all);
        else sky(all);
        if ("medallion".equals(ground)) {
            float w = 84 * u;
            StaticLayout l = block(text, plexSB, 11.5f * u, INK, 0.6f, w, 4, H * 0.5f, CENTER, dir(), 1);
            draw(l, (W - w) / 2, H * 0.44f - l.getHeight() / 2f, text);
        } else {
            float size = (H / u > 300 ? 16 : W / u > 300 ? 14 : 13) * u;
            float w = W - 44 * u;
            StaticLayout l = block(text, plexSB, size, "paper".equals(ground) ? INK : PAPER, 0.6f, w, 3, H - 36 * u, CENTER, dir(), 1);
            draw(l, 22 * u, (H - l.getHeight()) / 2f, text);
        }
        insetFrame("paper".equals(ground) ? FRAME_ON_PAPER : FRAME_ON_SKY);
    }

    private String openApp(JSONObject data) {
        String t = data == null ? "" : labels(data).optString("openApp", "");
        return t.isEmpty() ? ctx.getString(R.string.widget_open_app) : t;
    }

    /** null when ready; else the quiet text (no data, no city, or no times for today). */
    private String prayerQuiet(JSONObject data, long now) {
        if (data == null) return openApp(null);
        if (data.isNull("place") || data.optJSONObject("place") == null) return labels(data).optString("noPlace", openApp(data));
        JSONObject day = dayAt(data, now);
        JSONArray times = day == null ? null : day.optJSONArray("times");
        if (times == null || times.length() == 0 || nextPrayer(data, now) == null) return openApp(data);
        return null;
    }

    private void countdown(long target, RectF r, float size, int color, int align) {
        out.countdownTarget = target;
        out.countdown = r;
        out.countdownSize = size;
        out.countdownColor = color;
        boolean right = (align == START) == rtl;
        out.countdownGravity = (right ? Gravity.RIGHT : Gravity.LEFT) | Gravity.TOP;
    }

    // MARK: - 1. The next prayer (small)

    private void next(JSONObject data, long now) {
        String q = prayerQuiet(data, now);
        if (q != null) {
            out.url = data != null && data.optJSONObject("place") == null ? "imuslim://today/times" : "imuslim://today";
            quiet(q, "sky");
            return;
        }
        out.url = "imuslim://today/times";
        JSONObject l = labels(data);
        JSONObject nx = nextPrayer(data, now);
        RectF all = new RectF(0, 0, W, H);
        sky(all);
        stars(all, new float[][] { { 22, 30, 10 }, { 58, 62, 7 }, { 40, 118, 6 } });
        float pad = 18 * u, left = pad, right = W - pad;
        float y = pad;
        y += line(l.optString("nextPrayer"), plexSB, 12 * u, GOLD2, 0.6f, left, right, y, START);
        y += 4 * u;
        y += line(str(nx, "name"), plexB, 26 * u, PAPER, 0.5f, left, right, y, START);
        line(str(nx, "text"), plexM, 17 * u, alpha(PAPER, 0.92f), 0.6f, left, right, y, START);
        float placeH = lineHeight(plexR, 11 * u);
        float yPlace = H - pad - placeH;
        JSONObject place = data.optJSONObject("place");
        line(str(place, "name"), plexR, 11 * u, alpha(PAPER, 0.75f), 0.6f, left, right, yPlace, START);
        float cH = lineHeight(plexSB, 24 * u);
        countdown(nx.optLong("at"), new RectF(left, yPlace - cH, right, yPlace), 24 * u, COUNTDOWN, START);
        insetFrame(FRAME_ON_SKY);
    }

    // MARK: - 2. Today's times (large)

    private void times(JSONObject data, long now) {
        String q = prayerQuiet(data, now);
        if (q != null) {
            out.url = data != null && data.optJSONObject("place") == null ? "imuslim://today/times" : "imuslim://today";
            quiet(q, "sky");
            return;
        }
        out.url = "imuslim://today/times";
        JSONObject l = labels(data);
        JSONObject day = dayAt(data, now);
        JSONObject nx = nextPrayer(data, now);
        paper(new RectF(0, 0, W, H));
        // The header: the sky with the next prayer at the start and the countdown at the end, the two dates under them.
        float headH = 150 * u;
        RectF head = new RectF(0, 0, W, headH);
        sky(head);
        stars(head, new float[][] { { 26, 170, 10 }, { 70, 240, 7 }, { 96, 130, 8 }, { 40, 300, 6 } });
        float cw = W - 44 * u;
        float tw = cw * 0.5f;
        float lw = cw - tw - 8 * u;
        float l0 = rtl ? W - 22 * u - lw : 22 * u, l1 = l0 + lw;
        float t0 = rtl ? 22 * u : W - 22 * u - tw, t1 = t0 + tw;
        float y = 20 * u;
        y += line(l.optString("nextPrayer"), plexSB, 12 * u, GOLD2, 0.6f, l0, l1, y, START);
        y += 2 * u;
        y += line(str(nx, "name"), plexB, 30 * u, PAPER, 0.5f, l0, l1, y, START);
        line(str(nx, "text"), plexR, 16 * u, alpha(PAPER, 0.9f), 0.6f, l0, l1, y, START);
        float cH = lineHeight(plexSB, 34 * u);
        countdown(nx.optLong("at"), new RectF(t0, 24 * u, t1, 24 * u + cH), 34 * u, COUNTDOWN, END);
        line(l.optString("remaining"), plexR, 11.5f * u, GOLD2, 0.6f, t0, t1, 24 * u + cH, END);
        float dH = lineHeight(plexR, 12 * u);
        float dy = headH - 12 * u - dH;
        String greg = str(day, "gregorian");
        String hij = str(day.optJSONObject("hijri"), "text");
        TextPaint dp = paint(plexR, 12 * u, 0);
        float gw = dp.measureText(greg), hw = dp.measureText(hij), room = cw - 4 * u;
        float k = gw + hw > room ? room / (gw + hw) : 1;
        float gW = gw * k + 1, hW = hw * k + 1;
        int dc = alpha(DATES_TEXT, 0.9f);
        if (rtl) {
            line(greg, plexR, 12 * u, dc, 0.6f, W - 22 * u - gW, W - 22 * u, dy, START);
            line(hij, plexR, 12 * u, dc, 0.6f, 22 * u, 22 * u + hW, dy, END);
        } else {
            line(greg, plexR, 12 * u, dc, 0.6f, 22 * u, 22 * u + gW, dy, START);
            line(hij, plexR, 12 * u, dc, 0.6f, W - 22 * u - hW, W - 22 * u, dy, END);
        }
        float band = goldBand(headH);
        // The table: two columns, the first at the start; past times faded, the next one a gold pill.
        JSONArray all = day.optJSONArray("times");
        int n = all.length(), half = (n + 1) / 2;
        float top = headH + band + 14 * u, bottom = H - 16 * u;
        float colW = (W - 36 * u - 18 * u) / 2;
        float c0 = rtl ? W - 18 * u - colW : 18 * u;
        float c1 = rtl ? 18 * u : 18 * u + colW + 18 * u;
        float[] h0 = rowHeights(all, 0, half, colW), h1 = rowHeights(all, half, n, colW);
        // The board's 4-point gap; a widget taller than the board's (Android's cells are often taller than wide) spreads
        // the rows over its height instead of leaving the paper empty around them, up to 26 points more between rows.
        int rows = Math.max(h0.length, h1.length);
        float extra = bottom - top - Math.max(sum(h0, 4 * u), sum(h1, 4 * u));
        float gap = 4 * u + (extra > 0 ? Math.min(extra / (rows + 1), 26 * u) : 0);
        float blockH = Math.max(sum(h0, gap), sum(h1, gap));
        float y0 = top + Math.max(0, (bottom - top - blockH) / 2);
        column(all, 0, half, c0, colW, y0, h0, nx, now, gap);
        column(all, half, n, c1, colW, y0, h1, nx, now, gap);
        insetFrame(FRAME_ON_PAPER);
    }

    private static float sum(float[] h, float gap) {
        float t = 0;
        for (float x : h) t += x;
        return t + gap * Math.max(0, h.length - 1);
    }

    private float[] rowHeights(JSONArray times, int from, int to, float colW) {
        float[] h = new float[Math.max(0, to - from)];
        for (int i = from; i < to; i++) {
            JSONObject t = times.optJSONObject(i);
            TextPaint tp = paint(plexSB, 15 * u, 0);
            float timeW = Math.min(tp.measureText(t.optString("text")), colW * 0.6f);
            float nameW = colW - 24 * u - timeW - 6 * u;
            StaticLayout nl = block(t.optString("name"), plexR, 15 * u, 0, 0.7f, nameW, 2, 9999, START, dir(), 1);
            h[i - from] = Math.max(nl.getHeight(), lineHeight(plexSB, 15 * u)) + 14 * u;
        }
        return h;
    }

    private void column(JSONArray times, int from, int to, float x, float w, float y, float[] hs, JSONObject nx, long now, float gap) {
        for (int i = from; i < to; i++) {
            JSONObject t = times.optJSONObject(i);
            float h = hs[i - from];
            RectF r = new RectF(x, y, x + w, y + h);
            boolean isNext = t.optString("key").equals(nx.optString("key")) && t.optLong("at") == nx.optLong("at");
            boolean past = t.optLong("at") <= now && !isNext;
            if (past) c.saveLayerAlpha(r.left - 4 * u, r.top - 4 * u, r.right + 4 * u, r.bottom + 4 * u, 128);
            if (isNext) {
                Paint g = new Paint(Paint.ANTI_ALIAS_FLAG);
                g.setShader(new LinearGradient(r.left, 0, r.right, 0, 0xFFB88A35, 0xFFD8B064, Shader.TileMode.CLAMP));
                g.setShadowLayer(3 * u, 0, 2 * u, 0x59785514);
                c.drawRoundRect(r, 12 * u, 12 * u, g);
            }
            TextPaint tp = paint(plexSB, 15 * u, 0);
            String text = t.optString("text");
            float timeW = Math.min(tp.measureText(text), w * 0.6f) + 1;
            float tH = lineHeight(plexSB, 15 * u);
            float in0 = x + 12 * u, in1 = x + w - 12 * u;
            float ty = y + (h - tH) / 2;
            if (rtl) line(text, plexSB, 15 * u, isNext ? Color.WHITE : INK, 0.6f, in0, in0 + timeW, ty, END);
            else line(text, plexSB, 15 * u, isNext ? Color.WHITE : INK, 0.6f, in1 - timeW, in1, ty, END);
            float nameW = w - 24 * u - timeW - 6 * u;
            StaticLayout nl = block(t.optString("name"), plexR, 15 * u, isNext ? Color.WHITE : ROW_TEXT, 0.7f, nameW, 2, h - 14 * u, START, dir(), 1);
            draw(nl, rtl ? in1 - nameW : in0, y + (h - nl.getHeight()) / 2f, t.optString("name"));
            if (past) c.restore();
            y += h + gap;
        }
    }

    // MARK: - 3. The date (small)

    private void discDate(JSONObject hijri, float cx, float cy, float day, float month, float year) {
        float w = 90 * u;
        float mH = lineHeight(plexSB, month * u), yH = lineHeight(plexR, year * u);
        float total = day * u + 3 * u + mH + 2 * u + yH;
        float top = cy - total / 2;
        // The day's line is its font size (the board's line-height: 1).
        float dH = lineHeight(plexB, day * u);
        line(str(hijri, "day"), plexB, day * u, INK, 0.6f, cx - w / 2, cx + w / 2, top + (day * u - dH) / 2, CENTER);
        top += day * u + 3 * u;
        line(str(hijri, "month"), plexSB, month * u, DISC_MONTH, 0.6f, cx - w / 2, cx + w / 2, top, CENTER);
        top += mH + 2 * u;
        line(str(hijri, "year"), plexR, year * u, DISC_YEAR, 0.6f, cx - w / 2, cx + w / 2, top, CENTER);
    }

    private void date(JSONObject data, long now) {
        JSONObject day = data == null ? null : dayAt(data, now);
        if (day == null) {
            quiet(openApp(data), "medallion");
            return;
        }
        out.url = "imuslim://today/calendar";
        medallion(new RectF(0, 0, W, H));
        discDate(day.optJSONObject("hijri"), W / 2, H * 0.44f, 33, 11.5f, 10.5f);
        float tH = lineHeight(plexSB, 12.5f * u);
        float stripH = 10 * u + tH + 13 * u;
        Paint g = new Paint();
        g.setShader(new LinearGradient(0, H - stripH, 0, H, new int[] { 0x00091634, 0xEB091634, 0xEB091634 }, new float[] { 0, 0.45f, 1 }, Shader.TileMode.CLAMP));
        c.drawRect(0, H - stripH, W, H, g);
        line(day.optString("gregorianShort"), plexSB, 12.5f * u, PAPER, 0.6f, 12 * u, W - 12 * u, H - 13 * u - tH, CENTER);
        insetFrame(FRAME_ON_SKY);
    }

    // MARK: - 4. The ayah of the day (medium)

    private void ayah(JSONObject data, long now) {
        JSONObject day = data == null ? null : dayAt(data, now);
        if (day == null) {
            quiet(openApp(data), "paper");
            return;
        }
        JSONObject l = labels(data);
        paper(new RectF(0, 0, W, H));
        RectF sq = rtl ? new RectF(W - H, 0, W, H) : new RectF(0, 0, H, H);
        medallion(sq);
        discDate(day.optJSONObject("hijri"), sq.centerX(), H * 0.44f, 30, 11, 10);
        float rule = Math.max(1, 2 * s) * density;
        Paint gp = new Paint();
        gp.setColor(GOLD);
        if (rtl) c.drawRect(W - H - rule, 0, W - H, H, gp);
        else c.drawRect(H, 0, H + rule, H, gp);
        float x0 = rtl ? 16 * u : H + rule + 18 * u;
        float x1 = rtl ? W - H - rule - 18 * u : W - 16 * u;
        float top = 12 * u, bottom = H - 12 * u;
        JSONObject a = day.optJSONObject("ayah");
        if (a == null) {
            out.url = "imuslim://today";
            float h1 = lineHeight(plexB, 17 * u), h2 = lineHeight(plexR, 12.5f * u);
            float y = top + (bottom - top - h1 - 4 * u - h2) / 2;
            line(str(day.optJSONObject("hijri"), "text"), plexB, 17 * u, INK, 0.6f, x0, x1, y, CENTER);
            line(day.optString("gregorian"), plexR, 12.5f * u, MUTED, 0.6f, x0, x1, y + h1 + 4 * u, CENTER);
            insetFrame(FRAME_ON_PAPER);
            return;
        }
        out.url = a.optString("url", "imuslim://today");
        String header = l.optString("ayahOfDay");
        String text = a.optString("text"), ref = a.optString("ref");
        float width = x1 - x0, room = bottom - top;
        TextDirectionHeuristic own = TextDirectionHeuristics.FIRSTSTRONG_RTL;
        for (float k : new float[] { 1, 0.9f, 0.8f, 0.7f }) {
            float as = 17 * u * k;
            float small = Math.min(11.5f * u, 17 * u * k * 0.9f);
            TextPaint ap = paint(amiri, as, INK);
            // Amiri's own line is 1.758 em; the board's line-height is 1.8.
            StaticLayout al = layout(text, ap, width, Layout.Alignment.ALIGN_CENTER, own, 0, 1.8f / 1.758f);
            float head = small * 1.5f;
            float refH = lineHeight(plexSB, small);
            float refTop = 4 * u * Math.min(1, k + 0.2f);
            float need = head * 2 + 6 * u + al.getHeight() + refTop + refH;
            if (need > room) continue;
            line(header, plexSB, small, GOLD_DARK, 0.7f, rtl ? x0 : x0 - 2 * u, rtl ? x1 + 2 * u : x1, top + (head - refH) / 2, START);
            float mid = top + head + (room - head * 2 - al.getHeight() - refTop - refH) / 2;
            draw(al, x0, mid, text);
            line(ref, plexSB, small, GOLD_DARK, 0.7f, x0, x1, mid + al.getHeight() + refTop, CENTER);
            insetFrame(FRAME_ON_PAPER);
            return;
        }
        // Even at 0.7 the ayah does not hold whole: its reference and an invitation to open it, and no part of it.
        float hh = 11.5f * u * 1.5f;
        line(header, plexSB, 11.5f * u, GOLD_DARK, 0.7f, rtl ? x0 : x0 - 2 * u, rtl ? x1 + 2 * u : x1, top + (hh - lineHeight(plexSB, 11.5f * u)) / 2, START);
        String invite = l.optString("readAyah", "اضغط لقراءتها");
        float rH = lineHeight(plexB, 17 * u);
        StaticLayout il = block(invite, plexR, 12.5f * u, MUTED, 0.7f, width, 2, room / 2, CENTER, dir(), 1);
        float y = top + hh + (room - hh * 2 - rH - 4 * u - il.getHeight()) / 2;
        line(ref, plexB, 17 * u, INK, 0.6f, x0, x1, y, CENTER);
        draw(il, x0, y + rH + 4 * u, invite);
        insetFrame(FRAME_ON_PAPER);
    }

    // MARK: - 5. The hadith of the day (medium)

    private void hadith(JSONObject data, long now) {
        JSONObject day = data == null ? null : dayAt(data, now);
        if (day == null) {
            quiet(openApp(data), "paper");
            return;
        }
        JSONObject l = labels(data);
        paper(new RectF(0, 0, W, H));
        JSONObject hd = day.optJSONObject("hadith");
        float x0 = 20 * u, x1 = W - 20 * u;
        if (hd == null) {
            out.url = "imuslim://today";
            float h1 = lineHeight(plexSB, 15 * u), h2 = lineHeight(plexR, 12.5f * u);
            float y = (H - h1 - 4 * u - h2) / 2;
            line(l.optString("hadithOfDay"), plexSB, 15 * u, GOLD_DARK, 0.6f, x0, x1, y, CENTER);
            line(day.optString("gregorian"), plexR, 12.5f * u, MUTED, 0.6f, x0, x1, y + h1 + 4 * u, CENTER);
            insetFrame(FRAME_ON_PAPER);
            return;
        }
        out.url = hd.optString("url", "imuslim://today");
        float top = 16 * u, bottom = H - 16 * u;
        // The grade at the end of the first line, a pill.
        String grade = hd.optString("grade");
        TextPaint bp = paint(plexSB, 11 * u, 0xFF2F6B4A);
        float bw = bp.measureText(grade) + 20 * u, bh = lineH(bp) + 4 * u;
        float lh = lineHeight(plexSB, 12 * u);
        float headH = Math.max(lh, bh);
        if (!grade.isEmpty()) {
            RectF pill = rtl ? new RectF(x0, top + (headH - bh) / 2, x0 + bw, top + (headH + bh) / 2) : new RectF(x1 - bw, top + (headH - bh) / 2, x1, top + (headH + bh) / 2);
            Paint f = new Paint(Paint.ANTI_ALIAS_FLAG);
            f.setColor(0xFFDCEFE3);
            c.drawRoundRect(pill, bh / 2, bh / 2, f);
            f.setStyle(Paint.Style.STROKE);
            f.setStrokeWidth(Math.max(0.75f, s) * density);
            f.setColor(0xFFA9D4B8);
            c.drawRoundRect(pill, bh / 2, bh / 2, f);
            line(grade, plexSB, 11 * u, 0xFF2F6B4A, 1, pill.left + 10 * u - 1, pill.right - 10 * u + 1, pill.top + 2 * u, CENTER);
        }
        float labelRight = grade.isEmpty() ? x1 : (rtl ? x1 : x1 - bw - 8 * u);
        float labelLeft = grade.isEmpty() ? x0 : (rtl ? x0 + bw + 8 * u : x0);
        line(l.optString("hadithOfDay"), plexSB, 12 * u, GOLD_DARK, 0.6f, labelLeft, labelRight, top + (headH - lh) / 2, START);
        // The hadith may give up whole lines, as the day card does: its whole text is on its page.
        float aH = lineHeight(plexR, 11.5f * u);
        float tTop = top + headH + 8 * u, tBottom = bottom - aH;
        String text = hd.optString("text");
        TextPaint tp = paint(amiri, 18 * u, HADITH_TEXT);
        StaticLayout full = layout(text, tp, x1 - x0, Layout.Alignment.ALIGN_NORMAL, TextDirectionHeuristics.FIRSTSTRONG_RTL, 0, 1);
        int fit = Math.max(1, linesIn(full, tBottom - tTop));
        StaticLayout tl = layout(text, tp, x1 - x0, Layout.Alignment.ALIGN_NORMAL, TextDirectionHeuristics.FIRSTSTRONG_RTL, fit, 1);
        draw(tl, x0, tTop, text);
        line(hd.optString("attribution"), plexR, 11.5f * u, MUTED, 0.6f, x0, x1, bottom - aH, START);
        insetFrame(FRAME_ON_PAPER);
    }

    // MARK: - 6. The tasbih (small)

    private static String digits(int n, String set) {
        String latin = Integer.toString(n);
        if (set == null || set.codePointCount(0, set.length()) != 10) return latin;
        int[] cps = set.codePoints().toArray();
        StringBuilder b = new StringBuilder();
        for (char ch : latin.toCharArray()) {
            if (ch >= '0' && ch <= '9') b.appendCodePoint(cps[ch - '0']);
            else b.append(ch);
        }
        return b.toString();
    }

    private void tasbih(JSONObject data) {
        JSONObject t = data == null ? null : data.optJSONObject("tasbih");
        JSONArray steps = t == null ? null : t.optJSONArray("steps");
        if (steps == null || steps.length() == 0) {
            out.url = "imuslim://today";
            quiet(openApp(data), "sky");
            return;
        }
        out.url = "imuslim://today/tasbih";
        JSONObject l = labels(data);
        int at = Math.min(Math.max(0, t.optInt("step")), steps.length() - 1);
        JSONObject step = steps.optJSONObject(at);
        String digits = t.optString("digits");
        RectF all = new RectF(0, 0, W, H);
        sky(all);
        stars(all, new float[][] { { 20, 22, 10 }, { 30, 140, 7 } });
        float pad = 16 * u, x0 = pad, x1 = W - pad;
        float plusH = 40 * u;
        float labelH = lineHeight(plexSB, 12 * u);
        float countH = lineHeight(plexB, 34 * u);
        float y = pad;
        line(l.optString("tasbih"), plexSB, 12 * u, GOLD2, 0.6f, x0, x1, y, CENTER);
        y += labelH;
        float room = H - pad * 2 - plusH - countH - 2 * u - labelH;
        String zikr = step.optString("zikr");
        StaticLayout zl = block(zikr, amiriB, 20 * u, PAPER, 0.45f, x1 - x0, 3, Math.max(room, 1), CENTER, TextDirectionHeuristics.FIRSTSTRONG_RTL, 1);
        draw(zl, x0, y, zikr);
        y += zl.getHeight() + 2 * u;
        line(digits(t.optInt("n"), digits), plexB, 34 * u, COUNTDOWN, 0.5f, x0, x1, y, CENTER);
        // «+١»: its shadow, the gold capsule, the figure.
        RectF plus = new RectF(x0, H - pad - plusH, x1, H - pad);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(0xFF8A6A2A);
        RectF shadow = new RectF(plus);
        shadow.offset(0, 2 * u);
        c.drawRoundRect(shadow, plusH / 2, plusH / 2, p);
        p.setShader(new LinearGradient(0, plus.top, 0, plus.bottom, 0xFFF0D58F, 0xFFC9A04E, Shader.TileMode.CLAMP));
        c.drawRoundRect(plus, plusH / 2, plusH / 2, p);
        String one = "⁦+" + digits(1, digits) + "⁩";
        float oh = lineHeight(plexB, 17 * u);
        line(one, plexB, 17 * u, 0xFF3A2A0C, 1, x0, x1, plus.centerY() - oh / 2, CENTER);
        out.taps.add(new Tap(plus, WidgetActions.TASBIH, one));
        insetFrame(FRAME_ON_SKY);
    }

    // MARK: - 7. The adhkar of the time (small)

    private void adhkar(JSONObject data, long now) {
        JSONObject day = data == null ? null : dayAt(data, now);
        JSONObject ad = data == null ? null : data.optJSONObject("adhkar");
        if (day == null || ad == null) {
            out.url = "imuslim://today";
            quiet(openApp(data), "paper");
            return;
        }
        // The morning's after fajr until asr, the evening's after asr until the next fajr; with no times, noon.
        boolean morning;
        JSONArray times = day.optJSONArray("times");
        long fajr = -1, asr = -1;
        for (int i = 0; times != null && i < times.length(); i++) {
            JSONObject x = times.optJSONObject(i);
            if ("fajr".equals(x.optString("key"))) fajr = x.optLong("at");
            if ("asr".equals(x.optString("key"))) asr = x.optLong("at");
        }
        if (fajr > 0 && asr > 0) {
            morning = now >= fajr && now < asr;
        } else {
            JSONObject place = data.optJSONObject("place");
            Calendar cal = Calendar.getInstance(place != null ? TimeZone.getTimeZone(place.optString("tz")) : TimeZone.getDefault());
            cal.setTimeInMillis(now);
            morning = cal.get(Calendar.HOUR_OF_DAY) < 12;
        }
        JSONObject part = ad.optJSONObject(morning ? "morning" : "evening");
        if (part == null) {
            quiet(openApp(data), "paper");
            return;
        }
        boolean today = ad.optString("day").equals(day.optString("date"));
        double fraction = today ? Math.min(1, Math.max(0, part.optDouble("fraction", 0))) : 0;
        out.url = part.optString("url", "imuslim://today");
        JSONObject l = labels(data);
        paper(new RectF(0, 0, W, H));
        float pad = 18 * u, x0 = pad, x1 = W - pad;
        float y = pad;
        y += line(l.optString("adhkarNow"), plexSB, 12 * u, GOLD_DARK, 0.6f, x0, x1, y, START);
        y += 4 * u;
        String title = part.optString("title");
        StaticLayout tl = block(title, plexB, 21 * u, INK, 0.6f, x1 - x0, 2, H * 0.4f, START, dir(), 1);
        draw(tl, x0, y, title);
        y += tl.getHeight() + 2 * u;
        line(today ? part.optString("progress") : part.optString("none"), plexR, 12.5f * u, MUTED, 0.6f, x0, x1, y, START);
        float contH = lineHeight(plexSB, 12.5f * u);
        float yCont = H - pad - contH;
        line(l.optString("cont"), plexSB, 12.5f * u, GOLD_DARK, 0.6f, x0, x1, yCont, START);
        float barH = 7 * u, barTop = yCont - 9 * u - barH;
        RectF bar = new RectF(x0, barTop, x1, barTop + barH);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setColor(0xFFE4D7B8);
        c.drawRoundRect(bar, 4 * u, 4 * u, p);
        if (fraction > 0) {
            float fw = (float) (bar.width() * fraction);
            RectF f = rtl ? new RectF(bar.right - fw, bar.top, bar.right, bar.bottom) : new RectF(bar.left, bar.top, bar.left + fw, bar.bottom);
            Paint g = new Paint(Paint.ANTI_ALIAS_FLAG);
            g.setShader(new LinearGradient(bar.left, 0, bar.right, 0, 0xFFC9A04E, 0xFFE2C27C, Shader.TileMode.CLAMP));
            c.save();
            Path clip = new Path();
            clip.addRoundRect(bar, 4 * u, 4 * u, Path.Direction.CW);
            c.clipPath(clip);
            c.drawRect(f, g);
            c.restore();
        }
        insetFrame(FRAME_ON_PAPER);
    }

    // MARK: - 8. «أذكار المواقف» (large)

    static final String[] MQ_IDS = { "travel", "sleep", "waking", "home", "mosque", "food", "distress", "all" };
    static final String[] MQ_ICONS = { "car", "moon", "sunrise", "house", "mosque", "food", "heart", "grid" };

    private void mawaqif(JSONObject data) {
        out.url = "imuslim://mawaqif";
        String title;
        String[] names = new String[MQ_IDS.length];
        String[] urls = new String[MQ_IDS.length];
        JSONArray b = data == null ? null : labels(data).optJSONArray("mawaqif");
        JSONObject nm = data == null ? null : labels(data).optJSONObject("names");
        title = nm != null && nm.optJSONObject("mawaqif") != null ? nm.optJSONObject("mawaqif").optString("name") : ctx.getString(R.string.widget_mawaqif_name);
        for (int i = 0; i < MQ_IDS.length; i++) {
            JSONObject x = b != null && b.length() == MQ_IDS.length ? b.optJSONObject(i) : null;
            names[i] = x != null ? x.optString("name") : fallbackName(MQ_IDS[i]);
            urls[i] = x != null ? x.optString("url") : ("all".equals(MQ_IDS[i]) ? "imuslim://today/adhkar" : "imuslim://mawaqif/" + MQ_IDS[i]);
        }
        paper(new RectF(0, 0, W, H));
        float headH = 96 * u;
        RectF head = new RectF(0, 0, W, headH);
        sky(head);
        stars(head, new float[][] { { 22, 40, 9 }, { 54, 310, 7 }, { 30, 250, 6 } });
        float th = lineHeight(plexB, 30 * u);
        line(title, plexB, 30 * u, PAPER, 0.5f, 22 * u, W - 22 * u, (headH - th) / 2, START);
        float band = goldBand(headH);
        float top = headH + band + 14 * u, bottom = H - 16 * u;
        float gw = W - 36 * u, rowH = (bottom - top - 3 * 8 * u) / 4, colW = (gw - 10 * u) / 2;
        for (int row = 0; row < 4; row++) {
            for (int col = 0; col < 2; col++) {
                int i = row * 2 + col;
                boolean startCol = col == 0;
                float x = (startCol == rtl) ? 18 * u + colW + 10 * u : 18 * u;
                float y = top + row * (rowH + 8 * u);
                RectF r = new RectF(x, y, x + colW, y + rowH);
                button(r, MQ_ICONS[i], names[i]);
                out.taps.add(new Tap(r, urls[i], names[i]));
            }
        }
        insetFrame(FRAME_ON_PAPER);
    }

    private String fallbackName(String id) {
        int r = res.getIdentifier("widget_mq_" + id, "string", ctx.getPackageName());
        return r == 0 ? id : ctx.getString(r);
    }

    private void button(RectF r, String icon, String name) {
        Paint f = new Paint(Paint.ANTI_ALIAS_FLAG);
        f.setColor(alpha(PAPER, 0.55f));
        c.drawRoundRect(r, 12 * u, 12 * u, f);
        f.setStyle(Paint.Style.STROKE);
        f.setStrokeWidth(u);
        f.setColor(alpha(FRAME_ON_PAPER, 0.7f));
        RectF in = new RectF(r);
        in.inset(u / 2, u / 2);
        c.drawRoundRect(in, 12 * u, 12 * u, f);
        float ic = 22 * u, x0 = r.left + 12 * u, x1 = r.right - 12 * u;
        Drawable d = com.alkhammashtalal.imuslim.MqIcons.drawable(ctx, icon);
        float iconLeft = rtl ? x1 - ic : x0;
        if (d != null) {
            d.setTint(GOLD_DARK);
            d.setBounds(Math.round(iconLeft), Math.round(r.centerY() - ic / 2), Math.round(iconLeft + ic), Math.round(r.centerY() + ic / 2));
            d.draw(c);
        }
        float n0 = rtl ? x0 : x0 + ic + 8 * u, n1 = rtl ? x1 - ic - 8 * u : x1;
        StaticLayout nl = block(name, plexR, 15 * u, ROW_TEXT, 0.7f, n1 - n0, 2, r.height() - 12 * u, START, dir(), 1);
        draw(nl, n0, r.centerY() - nl.getHeight() / 2f, null);
    }
}

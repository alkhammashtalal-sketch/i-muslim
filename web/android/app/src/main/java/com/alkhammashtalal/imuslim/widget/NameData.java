package com.alkhammashtalal.imuslim.widget;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * «اسم الله لليوم» and «من أقوال السلف» as the app writes them into the widgets' file (add-on 0072-add10 §1, §2), the
 * same file and keys as the iPhone's: `nameDays`, `salafDays`, each day's `sky`, and the labels `nameOfDay`,
 * `nextPage`, `share`, `continueInApp` (web/src/native/widget-names.ts and widget-data.ts; the contract in
 * relay/w1/0072-names-widget/data-contract.md). Every text comes ready from the app; this only reads it. A day is the
 * one whose Riyadh midnights hold the moment (`start` ≤ now < `end`); none, and the widget asks to open the app.
 */
final class NameData {

    private NameData() {}

    /** One piece of a text that a widget may stop after: a whole sentence, starting a paragraph or not. */
    static final class Unit {
        final String text;
        /** A new paragraph begins here, with this label first in bold (or "" for none); null: the same paragraph. */
        final String para;

        Unit(String text, String para) {
            this.text = text;
            this.para = para;
        }
    }

    static final class Page {
        String kind = "";
        String label = "";
        /** The ayah or the hadith whole; the units of a meaning or a reading, which may stop after any of them. */
        String text = "";
        final List<Unit> units = new ArrayList<>();
        /** The ayah's place («الإخلاص · ٢»), the hadith's takhrij («رواه مسلم»). */
        String ref = "";
        String source = "";
        String grade = "";
        /** Outside Arabic: the meaning in the reader's language from our sources, its language, and whose it is. */
        String meaning = "";
        String meaningLang = "";
        String meaningBy = "";
        /** «القراءة» outside Arabic: «الشرح متاح بالعربية» in the reader's language. */
        String inArabic = "";
        String url = "";
    }

    static final class Name {
        int n, count;
        String name = "", of = "", url = "", share = "";
        String title = "", next = "", shareLabel = "", cont = "", readAyah = "";
        final List<Page> pages = new ArrayList<>();
    }

    static final class Salaf {
        String text = "", attribution = "", source = "", url = "", share = "";
        /** The parts of the text, joined the text letter for letter; a gloss (the narrator's words) in a lighter ink. */
        final List<String> parts = new ArrayList<>();
        final List<Boolean> gloss = new ArrayList<>();
        String title = "", shareLabel = "", readAyah = "";
    }

    static String str(JSONObject o, String key) {
        return o == null || o.isNull(key) ? "" : o.optString(key, "");
    }

    private static JSONObject at(JSONArray days, long now) {
        for (int i = 0; days != null && i < days.length(); i++) {
            JSONObject d = days.optJSONObject(i);
            if (d != null && d.optLong("start") <= now && now < d.optLong("end")) return d;
        }
        return null;
    }

    private static JSONObject labels(JSONObject data) {
        JSONObject l = data.optJSONObject("labels");
        return l == null ? new JSONObject() : l;
    }

    /** The widget's own name for its title: labels.names[kind].name. */
    private static String widgetName(JSONObject l, String kind) {
        JSONObject names = l.optJSONObject("names");
        return str(names == null ? null : names.optJSONObject(kind), "name");
    }

    // The sentences of a text, as widget-names.ts sentencesOf: each to its «.» «؟» «?» «!» with a closing quote or
    // bracket after it, the spaces evened.
    private static final Pattern SENTENCE = Pattern.compile("[^.؟?!]*[.؟?!]+[»\")\\]]*|[^.؟?!]+$");

    static List<String> sentencesOf(String text) {
        List<String> out = new ArrayList<>();
        Matcher m = SENTENCE.matcher(text == null ? "" : text);
        while (m.find()) {
            String s = m.group().replaceAll("\\s+", " ").trim();
            if (!s.isEmpty()) out.add(s);
        }
        return out;
    }

    static Name name(JSONObject data, long now) {
        if (data == null) return null;
        JSONObject e = at(data.optJSONArray("nameDays"), now);
        if (e == null || str(e, "name").isEmpty()) return null;
        JSONObject l = labels(data);
        Name d = new Name();
        d.n = e.optInt("n");
        d.count = e.optInt("count");
        d.name = str(e, "name");
        d.of = str(e, "of");
        d.url = str(e, "url").isEmpty() ? "imuslim://today/name/" + d.n : str(e, "url");
        d.share = str(e, "shareUrl").isEmpty() ? "imuslim://today/name/" + d.n + "/share" : str(e, "shareUrl");
        d.title = str(l, "nameOfDay").isEmpty() ? widgetName(l, "name") : str(l, "nameOfDay");
        d.next = str(l, "nextPage");
        d.shareLabel = str(l, "share");
        d.cont = str(l, "continueInApp");
        d.readAyah = str(l, "readAyah");
        JSONArray pages = e.optJSONArray("pages");
        for (int i = 0; pages != null && i < pages.length(); i++) {
            Page p = page(pages.optJSONObject(i));
            if (p != null) d.pages.add(p);
        }
        return d;
    }

    /** A page as the contract writes it; null for an unknown kind or one with nothing in it (no empty page). */
    private static Page page(JSONObject o) {
        if (o == null) return null;
        Page p = new Page();
        p.kind = str(o, "kind");
        p.label = str(o, "label");
        p.source = str(o, "source");
        p.url = str(o, "url");
        JSONObject m = o.optJSONObject("meaning");
        if (m != null) {
            p.meaning = str(m, "text");
            p.meaningLang = str(m, "lang");
            p.meaningBy = str(m, "source");
        }
        switch (p.kind) {
            case "ayah":
                p.text = str(o, "text");
                p.ref = str(o, "ref");
                return p.text.isEmpty() ? null : p;
            case "hadith":
                p.text = str(o, "text");
                p.grade = str(o, "grade");
                p.ref = str(o, "attribution");
                for (String s : sentencesOf(p.text)) p.units.add(new Unit(s, p.units.isEmpty() ? "" : null));
                return p.text.isEmpty() ? null : p;
            case "meaning": {
                JSONArray ps = o.optJSONArray("paragraphs");
                StringBuilder all = new StringBuilder();
                for (int i = 0; ps != null && i < ps.length(); i++) {
                    String para = ps.optString(i, "");
                    boolean first = true;
                    for (String s : sentencesOf(para)) {
                        p.units.add(new Unit(s, first ? "" : null));
                        first = false;
                    }
                    if (!para.trim().isEmpty()) all.append(all.length() > 0 ? "\n" : "").append(para.trim());
                }
                p.text = all.toString();
                return p.units.isEmpty() ? null : p;
            }
            case "reading": {
                p.inArabic = str(o, "inArabic");
                JSONArray labels = o.optJSONArray("partLabels");
                JSONArray ss = o.optJSONArray("sentences");
                int last = -1;
                for (int i = 0; ss != null && i < ss.length(); i++) {
                    JSONObject s = ss.optJSONObject(i);
                    if (s == null || str(s, "text").isEmpty()) continue;
                    int part = s.optInt("part");
                    String para = part != last ? (labels != null ? labels.optString(part, "") : "") : null;
                    last = part;
                    p.units.add(new Unit(str(s, "text"), para));
                }
                return p.units.isEmpty() ? null : p;
            }
            default:
                return null;
        }
    }

    static Salaf salaf(JSONObject data, long now) {
        if (data == null) return null;
        JSONObject e = at(data.optJSONArray("salafDays"), now);
        if (e == null || str(e, "text").isEmpty()) return null;
        JSONObject l = labels(data);
        Salaf s = new Salaf();
        s.text = str(e, "text");
        s.attribution = str(e, "attribution");
        s.source = str(e, "source");
        s.url = str(e, "appUrl").isEmpty() ? "imuslim://today" : str(e, "appUrl");
        s.share = str(e, "shareUrl");
        JSONArray parts = e.optJSONArray("parts");
        StringBuilder joined = new StringBuilder();
        for (int i = 0; parts != null && i < parts.length(); i++) {
            JSONObject p = parts.optJSONObject(i);
            if (p == null) continue;
            s.parts.add(str(p, "text"));
            s.gloss.add(p.optBoolean("gloss"));
            joined.append(str(p, "text"));
        }
        // The parts are the text letter for letter; if not, the text as it is, in one ink.
        if (!joined.toString().equals(s.text)) {
            s.parts.clear();
            s.gloss.clear();
            s.parts.add(s.text);
            s.gloss.add(false);
        }
        s.title = widgetName(l, "salaf");
        s.shareLabel = str(l, "share");
        s.readAyah = str(l, "readAyah");
        return s;
    }

    /** The sky's state at `now` (the day's `sky`: the last whose `at` ≤ now) and the six moments of its day (Fajr,
     *  sunrise, Dhuhr, Asr, Maghrib, Isha) for the light's place; null with no sky (no city, or a polar day). */
    static final class Sky {
        String state;
        long[] six;
    }

    static Sky sky(JSONObject data, long now) {
        JSONArray days = data == null ? null : data.optJSONArray("days");
        for (int i = 0; days != null && i < days.length(); i++) {
            JSONObject d = days.optJSONObject(i);
            if (d == null || d.optLong("start") > now || now >= d.optLong("end")) continue;
            JSONArray sk = d.optJSONArray("sky");
            if (sk == null || sk.length() < 7) return null;
            Sky s = new Sky();
            s.six = new long[6];
            for (int k = 0; k < 6; k++) s.six[k] = sk.optJSONObject(k + 1).optLong("at");
            for (int k = 0; k < sk.length(); k++) {
                JSONObject x = sk.optJSONObject(k);
                if (x != null && x.optLong("at") <= now) s.state = x.optString("state");
            }
            return s.state == null ? null : s;
        }
        return null;
    }

    /** The next moment after `now` the widgets' look changes by itself: a sky state or a Riyadh day of the two. */
    static long nextChange(JSONObject data, long now) {
        long next = Long.MAX_VALUE;
        JSONArray days = data == null ? null : data.optJSONArray("days");
        for (int i = 0; days != null && i < days.length(); i++) {
            JSONArray sk = days.optJSONObject(i) == null ? null : days.optJSONObject(i).optJSONArray("sky");
            for (int k = 0; sk != null && k < sk.length(); k++) {
                long t = sk.optJSONObject(k).optLong("at");
                if (t > now && t < next) next = t;
            }
        }
        for (String key : new String[] { "nameDays", "salafDays" }) {
            JSONArray a = data == null ? null : data.optJSONArray(key);
            for (int i = 0; a != null && i < a.length(); i++) {
                long t = a.optJSONObject(i) == null ? 0 : a.optJSONObject(i).optLong("start");
                if (t > now && t < next) next = t;
            }
        }
        return next;
    }
}

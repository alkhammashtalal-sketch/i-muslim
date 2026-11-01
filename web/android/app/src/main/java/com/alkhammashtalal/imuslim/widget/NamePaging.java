package com.alkhammashtalal.imuslim.widget;

/**
 * «التالي» and «السابق» in «اسم الله لليوم» (add-ons 0072-add10 §1, 0072-add54), the iPhone's rules (NameViews.swift
 * NamePaging): a widget keeps a count of «التالي» since the Riyadh day began (Widgets.page), shown modulo its pages, so
 * «التالي» on the last page shows the first again, as it always did; «السابق» sets the page before the one shown, and
 * is not drawn on the first page: it never turns from the first to the last. Plain Java, no Android: the unit tests
 * compile it on their own (worker/test/nav-prev-0072.test.ts).
 */
final class NamePaging {

    private NamePaging() {}

    /** The page shown for the stored count. */
    static int shown(int count, int pages) {
        return pages <= 0 ? 0 : Math.max(0, count) % pages;
    }

    /** The count after «التالي» (as before add-on 0072-add54). */
    static int next(int count) {
        return (Math.max(0, count) + 1) % 1000;
    }

    /** The count after «السابق» from the page shown: the page before it, never below the first. */
    static int prev(int shown) {
        return Math.max(0, shown - 1);
    }

    static boolean hasPrev(int shown) {
        return shown > 0;
    }

    /** What a screen reader says: «{b}، صفحة {n} من {t}» with the button's word and the page it opens, in the app's
     *  digits; the word alone with data written before add-on 0072-add54. */
    static String label(String word, int to, int pages, String template, String digits) {
        if (template == null || template.isEmpty()) return word;
        return template.replace("{b}", word).replace("{n}", digits(to + 1, digits)).replace("{t}", digits(pages, digits));
    }

    static String digits(int n, String set) {
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

    /** A small check by hand: `java NamePaging.java <pages> <taps>`, taps a string of n (next) and p (prev); prints the
     *  page shown after each. */
    public static void main(String[] a) {
        int pages = Integer.parseInt(a[0]);
        int count = 0;
        StringBuilder out = new StringBuilder();
        for (char t : a[1].toCharArray()) {
            int at = shown(count, pages);
            if (t == 'n') count = next(count);
            else if (t == 'p' && hasPrev(at)) count = prev(at);
            out.append(shown(count, pages)).append(' ');
        }
        System.out.println(out.toString().trim());
    }
}

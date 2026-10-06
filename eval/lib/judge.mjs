// Checks on a free-text answer about Islam (a general model, or another tool), shared by eval/compare-general.mjs and
// eval/compare-tool.mjs so both apply exactly the same rules:
//   - cites a reference (Quran sura/ayah, or a hadith collection with a number);
//   - which Quran references exist in our fixed sources (looked up by /api/passage);
//   - hadith references, reported separately (hadith is not ingested yet, so none can be checked in our sources);
//   - misattributed text: a quoted span («…», ﴿…﴾, "…", one line, no markdown) followed directly by a Quran reference
//     (within 60 characters, no hadith reference between), whose letters do not occur in that ayah's text in D1.
//     Letters are compared as a skeleton (normalized, without alef/hamza/waw forms, ى→ي, ة→ه), so Uthmani and common
//     spellings of the same ayah match (الصلوٰة / الصلاة). A quote with no reference right after it, or whose next
//     reference introduces another quote ("(الآية 99):"), is not judged (no guessing).
import { normalizeArabic } from '../../worker/src/lib/normalize.ts';

export const norm = (s) => normalizeArabic(s).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const stripAl = (s) => norm(s).replace(/^و(?=ال)/, '').replace(/^سوره\s+/, '').replace(/^ال\s*/, '').trim();
export const skeleton = (s) => normalizeArabic(s).replace(/[^\p{L}]/gu, '').replace(/[اأإآٱءؤئو]/g, '').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

/** A judge bound to a Worker: sura names from /api/suras and ayah texts from /api/passage (public routes). */
export async function makeJudge(base) {
  // Sura names from our own data, so "سورة البقرة 183" maps to quran:2:183.
  const suras = await (await fetch(`${base}/api/suras`)).json();
  const suraByName = new Map(suras.map((s) => [stripAl(s.name), s.n]));

  const passageCache = new Map();
  async function passageText(id) {
    if (!passageCache.has(id)) {
      const r = await fetch(`${base}/api/passage/${encodeURIComponent(id)}`);
      passageCache.set(id, r.ok ? (await r.json()).text : null);
    }
    return passageCache.get(id);
  }

  /** Quran references as { id, at } (position in the text): numeric (2:183) or a sura name before a number
   *  ("سورة البقرة آية 183", "البقرة: 183", "آل عمران 19"), names matched against our own sura list. */
  const FILLER = new Set(['ايه', 'الايه', 'اية', 'الاية', 'رقم', 'سوره', 'من']);
  // A range after the ayah number ("الشرح: 5–6", "94:5-6"): the quote is then compared with those ayat together.
  const rangeTo = (text, end) => {
    const m = text.slice(end).match(/^\s*[–-]\s*(\d{1,3})\b/);
    return m ? Number(m[1]) : undefined;
  };
  function quranRefs(text) {
    const out = [];
    for (const m of text.matchAll(/\b(\d{1,3})\s*[:：]\s*(\d{1,3})\b/g)) out.push({ id: `quran:${Number(m[1])}:${Number(m[2])}`, at: m.index, to: rangeTo(text, m.index + m[0].length) });
    for (const m of text.matchAll(/(\d{1,3})/g)) {
      const words = norm(text.slice(Math.max(0, m.index - 60), m.index)).split(' ').filter(Boolean);
      while (words.length && FILLER.has(words.at(-1))) words.pop();
      for (const k of [2, 1]) {
        if (words.length < k) continue;
        const n = suraByName.get(stripAl(words.slice(-k).join(' ')));
        if (n) {
          out.push({ id: `quran:${n}:${Number(m[1])}`, at: m.index, to: rangeTo(text, m.index + m[0].length) });
          break;
        }
      }
    }
    return out;
  }

  /** Ayat a..to of one sura joined (at most ten), or null if one is not in our sources. */
  async function rangeText(id, to) {
    const [, s, a] = id.split(':').map(Number);
    if (!(to > a)) return passageText(id);
    const texts = [];
    for (let k = a; k <= Math.min(to, a + 9); k++) texts.push(await passageText(`quran:${s}:${k}`));
    return texts.includes(null) ? null : texts.join(' ');
  }

  async function judge(text) {
    const refs = quranRefs(text);
    const existing = [];
    for (const r of refs) if ((await passageText(r.id)) !== null) existing.push(r.id);
    const misattributed = [];
    let judged = 0;
    for (const q of quotes(text)) {
      // The first reference after the quote, unless it introduces the next quote ("…" وفي سورة يونس (الآية 99): "…").
      const after = refs.filter((r) => r.at >= q.end && r.at - q.end <= 60).sort((a, b) => a.at - b.at)[0];
      if (after && /^\d+\s*[)\]]?\s*:/.test(text.slice(after.at))) continue;
      if (!after || HADITH_REF.test(text.slice(q.end, after.at))) continue;
      const d1 = after.to ? await rangeText(after.id, after.to) : await passageText(after.id);
      // "…" inside a quote marks an omission: every part must occur in the ayah.
      const parts = q.text.split(/\.\.\.|…/).map(skeleton).filter((x) => x.length >= 3);
      if (parts.length) judged++;
      if (d1 && parts.length && !parts.every((x) => skeleton(d1).includes(x))) misattributed.push({ ref: after.id, quoted: q.text.slice(0, 120) });
    }
    return {
      citesReference: refs.length + hadithRefs(text).length > 0,
      quranRefs: [...new Set(refs.map((r) => r.id))],
      quranRefsInSources: [...new Set(existing)],
      hadithRefs: hadithRefs(text),
      quotesJudged: judged,
      misattributed,
    };
  }

  return { judge, passageText };
}

export const hadithRefs = (text) =>
  [...text.matchAll(/(البخاري|مسلم|Bukhari|Muslim|الترمذي|أبو داود|النسائي|ابن ماجه)[^\d\n]{0,25}(\d{1,5})/g)].map((m) => `${m[1]} ${m[2]}`);
const quotes = (text) =>
  [...text.matchAll(/[«﴿"“]([^»﴾"”\n]{6,400})[»﴾"”]/g)]
    .filter((m) => !/[*>]/.test(m[1]))
    .map((m) => ({ text: m[1], at: m.index, end: m.index + m[0].length }));
const HADITH_REF = /(البخاري|مسلم|Bukhari|Muslim|الترمذي|أبو داود|النسائي|ابن ماجه|رواه)/;

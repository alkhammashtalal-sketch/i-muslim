// Search-only Arabic normalization, shared by the Worker (user queries) and scripts/ingest (text_search).
// Never applied to displayed text. Removes harakat, Quranic annotation marks, tatweel and invisible
// bidi/zero-width marks; unifies alef forms, ya and ta marbuta.
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿ]/g
const TATWEEL = /ـ/g
const INVISIBLE = /[​-‏‪-‮⁦-⁩﻿]/g

export function normalizeArabic(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(DIACRITICS, '')
    .replace(TATWEEL, '')
    .replace(INVISIBLE, '')
    .replace(/[آأإٱٲٳ]/g, 'ا') // آ أ إ ٱ ٲ ٳ → ا
    .replace(/ى/g, 'ي') // ى → ي
    .replace(/ة/g, 'ه') // ة → ه
    .replace(/[۞۩۝]/g, ' ') // ۞ ۩ ۝
    .replace(/\s+/g, ' ')
    .trim()
}

export function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

// ---------------------------------------------------------------------------
// Tokenization for keyword search. The SAME functions build the FTS index text and the query,
// so a word is reduced identically on both sides.

// Question and function words (already normalized: ى→ي, ة→ه, أ/إ/آ→ا). Dropped from queries only.
const STOP_AR = new Set(
  (
    'ما ماذا ماهو ماهي كيف هل لماذا لما لم متي اين ايش من عن في علي الي الا او ام و ف ثم هو هي هم هن انا انت انتم نحن ' +
    'هذا هذه ذلك تلك هؤلاء الذي التي الذين اللذين كم اي ايه يا لا ليس ان انه انها قد كان كانت يكون تكون مع عند بين كل بعض ' +
    'غير اذا اذ لي لك له لها لهم لنا بي به بها منه منها فيه فيها عليه عليها اليه معني تعريف اريد اعرف اخبرني اشرح اذكر اعطني ' +
    'ارجو ممكن يمكن عدد الرد يقول يقولون بعض الناس شيء امر فما وما فهل وهل اذن'
  ).split(' '),
)
const STOP_EN = new Set(
  (
    'what how is are was were do does did i a an the of in on at to for about why who whom which when where can could should ' +
    'would will my me you your it its and or be been being tell explain please give mean meaning there this that these those'
  ).split(' '),
)

const AR_LETTER = /[ء-ي]/

/** Prefix stripping only (one conjunction, then one article with an optional preposition). Used for lexicon matching, where
 *  suffix stripping would conflate words (شركه "company" → شرك "polytheism"). */
export function stripPrefixes(t: string): string {
  let s = t
  if (s.length > 3 && s.startsWith('و')) s = s.slice(1)
  for (const p of ['وال', 'بال', 'كال', 'فال', 'لل', 'ال']) {
    if (s.startsWith(p) && s.length - p.length >= 2) return s.slice(p.length)
  }
  return s
}

// Light stemmer (after normalizeArabic): prefixes as above, then one common suffix. A final ه is never
// stripped: after ة→ه it cannot be told from the pronoun (العبادة → عباد "servants").
// A suffix is only removed when 4+ letters remain (اركان must not become ارك, which matches باركنا).
// Conservative length checks keep root letters; the unstemmed word is always kept beside the stem.
export function stemArabic(t: string): string {
  let s = stripPrefixes(t)
  for (const suf of ['ها', 'ان', 'ات', 'ون', 'ين', 'يه', 'هم', 'هن', 'كم', 'نا']) {
    if (s.endsWith(suf) && s.length - suf.length >= 4) {
      s = s.slice(0, -suf.length)
      break
    }
  }
  return s
}

export function tokenize(s: string): string[] {
  return normalizeArabic(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
}

const isArabicWord = (t: string) => AR_LETTER.test(t)

/** Text stored in an FTS column: every normalized word, followed by the stems that differ from it. */
export function ftsIndexText(s: string): string {
  const words = tokenize(s)
  const stems = new Set<string>()
  for (const w of words) {
    if (!isArabicWord(w)) continue
    const st = stemArabic(w)
    if (st !== w && st.length >= 3) stems.add(st)
  }
  return stems.size ? `${words.join(' ')} ${[...stems].join(' ')}` : words.join(' ')
}

/** Content terms of a question: non-stopword words plus their stems (unique, in order). Words in `common`
 *  (very frequent in the indexed sources) are dropped: they rank nothing and cost D1 reads. */
export function queryTerms(q: string, common: ReadonlySet<string> = new Set()): string[] {
  const out: string[] = []
  const add = (t: string) => {
    if (t.length > 1 && !common.has(t) && !out.includes(t)) out.push(t)
  }
  for (const w of tokenize(q)) {
    if (STOP_AR.has(w) || STOP_EN.has(w)) continue
    add(w)
    if (isArabicWord(w)) {
      const st = stemArabic(w)
      if (st.length >= 3) add(st)
    }
  }
  return out
}

/** FTS5 MATCH expression: each term or phrase double-quoted (no operator injection), OR-ed. */
export function ftsMatch(terms: string[], max = 24): string | null {
  const safe = terms
    .map((t) => tokenize(t).join(' '))
    .filter((t) => t.length > 1)
    .filter((t, i, a) => a.indexOf(t) === i)
    .slice(0, max)
  return safe.length ? safe.map((t) => `"${t}"`).join(' OR ') : null
}

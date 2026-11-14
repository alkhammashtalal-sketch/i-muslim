// «تأكد من فهمك» (reply 0033 §أ2): the questions of a hadith in one language, computed once at load time by
// scripts/index/load-hadith.mjs and stored with the row (migration 0013, column `quiz`). Nothing here writes a text:
// every option is a HadeethEnc benefit (`hints`) copied as stored, and no model is involved.
//
// The rules, for a hadith T in language L whose row has benefits:
//   • Questions: one per benefit, the first five at most; the answer to question n is T's benefit n, verbatim.
//   • Three wrong options per question, each a benefit, verbatim, of ANOTHER hadith R in the same language, where
//       – R is accepted and shown: tier 1, 2 or 3 and class not `mixed`, `weak` or `mawdu` (those are tier X), judged
//         on R's Arabic row, whose grade the page shows (GradeBadge, isWeak), and on its row in L; one Arabic row is
//         weak while its English row says sahih (65065), so the Arabic row decides as on the page;
//       – every category of R lies under a root of HadeethEnc's tree that is none of T's roots (the parents of
//         data/raw/hadeethenc/categories-list-ar.json, as for the card of the day); a hadith with a category outside
//         the tree, or none, is never used;
//       – it shares fewer than half of its words with every benefit of T (overlap below);
//       – its length is between 0.6 and 1.6 times the answer's, so the length does not point to the answer;
//       – it begins with the same number marker as the answer («2- …» in the Indonesian rows, which number their
//         benefits), or both have none, so the numbering does not point to the answer either;
//       – the three come from three different hadiths, share fewer than half of their words with each other, and no
//         benefit is used twice in one hadith's questions.
//   • Choice and order are fixed for each hadith, language and question: a small PRNG (mulberry32) seeded with the
//     FNV-1a hash of «id|lang|n» draws the wrong options from the language's pool (sorted by id, then benefit), then
//     the place of the answer among the four.
//   • A question without three valid wrong options is dropped; a hadith left with none has no quiz (NULL).
//   • A weak, mawdu or mixed hadith (tier X in its Arabic row or its row in L) gets no quiz: its benefits are not
//     offered as something to learn (rule 10: nothing is built on it).
//
// Normalisation (for the word overlap): NFD; Latin accents (U+0300–036F), Arabic harakat, Qur'anic marks, the
// hamza and madda marks NFD splits off (so أ إ آ read as ا) and tatweel removed; lower case; every character that
// is not a letter, a digit or a combining mark of another script (Devanagari, Bengali vowel signs) becomes a space.
// Words are the distinct tokens left. Overlap of two benefits = |A ∩ B| / min(|A|, |B|): too high at 0.5 or more,
// i.e. they share half of the words of either one.
// Length = characters (code points) after removing the Arabic marks and tatweel and collapsing spaces.

export const MAX_QUESTIONS = 5
export const MAX_DRAWS = 4000
export const LEN_MIN = 0.6
export const LEN_MAX = 1.6
export const OVERLAP_MAX = 0.5
const ACCEPTED_TIERS = new Set(['1', '2', '3'])
const NOT_SHOWN = new Set(['mixed', 'weak', 'mawdu'])
/** A row graded as accepted and shown: tier 1–3 and a class the page does not mark as weak (web isWeak). */
export const shownRow = (r) => !!r && ACCEPTED_TIERS.has(String(r.tier)) && !NOT_SHOWN.has(r.class)

const AR_MARKS = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭـ]/g
const LATIN_MARKS = /[̀-ͯ]/g

/** The distinct normalised words of a text. */
export function words(text) {
  const s = String(text ?? '')
    .normalize('NFD')
    .replace(LATIN_MARKS, '')
    .replace(AR_MARKS, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, ' ')
  return new Set(s.split(' ').filter(Boolean))
}

/** Visible length: code points after removing the Arabic marks and tatweel and collapsing whitespace. */
export function visibleLength(text) {
  return [...String(text ?? '').replace(AR_MARKS, '').replace(/\s+/g, ' ').trim()].length
}

const DIGITS = /[٠-٩۰-۹०-९০-৯]/g
const digitValue = (d) => {
  const c = d.codePointAt(0)
  for (const base of [0x660, 0x6f0, 0x966, 0x9e6]) if (c >= base && c <= base + 9) return String(c - base)
  return d
}
/** The number a benefit opens with («1- », «٣) »…), as ASCII digits, or '' when it opens with none. */
export function numberMarker(text) {
  const m = String(text ?? '').match(/^\s*([0-9٠-٩۰-۹०-९০-৯]+)\s*[-–.)٫:]/)
  return m ? m[1].replace(DIGITS, digitValue) : ''
}

/** Shared words over the smaller word set (0 when either is empty). */
export function overlap(a, b) {
  const small = a.size <= b.size ? a : b
  const big = small === a ? b : a
  if (!small.size) return 0
  let n = 0
  for (const w of small) if (big.has(w)) n++
  return n / small.size
}
export const tooClose = (a, b) => overlap(a, b) >= OVERLAP_MAX

/** FNV-1a, 32 bits (also the check of the answer's text, `k`, which worker/src/hadith-quiz.ts recomputes). */
export function fnv1a(s) {
  let h = 0x811c9dc5
  // Over the UTF-8 bytes, so the hash is the same in any runtime.
  for (const b of new TextEncoder().encode(String(s))) {
    h ^= b
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}
export const answerKey = (text) => fnv1a(text).toString(16).padStart(8, '0')

/** mulberry32: a small deterministic PRNG in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const list = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v.startsWith('[') ? JSON.parse(v) : [])
/** The benefits as the worker serves them (worker/src/hadith.ts toHadith): strings that are not blank, in order. */
export const hintsOf = (r) => list(r.hints).filter((h) => typeof h === 'string' && h.trim())

/** A category tree's root function, from rows of { id, parent_id } (categories-list-ar.json). */
export function rootFinder(tree) {
  const parent = new Map(tree.map((c) => [String(c.id), c.parent_id == null ? null : String(c.parent_id)]))
  return (id) => {
    let x = String(id)
    for (let i = 0; i < 20 && x != null; i++) {
      if (!parent.has(x)) return null
      const up = parent.get(x)
      if (up == null) return x
      x = up
    }
    throw new Error(`category ${id}: no root within 20 steps`)
  }
}

/** The roots of a hadith's categories, or null when one is outside the tree or there are none. */
function rootsOf(categories, rootOf) {
  const cats = list(categories)
  if (!cats.length) return null
  const out = new Set()
  for (const c of cats) {
    const r = rootOf(c)
    if (r == null) return null
    out.add(r)
  }
  return out
}
const disjoint = (a, b) => {
  for (const x of a) if (b.has(x)) return false
  return true
}

/**
 * The quizzes of every row: Map `${id}|${lang}` → quiz, for the rows that have one, and the counts.
 * rows: HadeethEnc rows as in data/processed/hadith*.jsonl ({ id, lang, title, hints, categories, class, tier }).
 * A quiz is { v: 1, q: [{ n, k, a, w: [{ id, i, t, ti }×3] }] }: question n (0-based benefit index) whose answer is
 * hints[n] (k = answerKey(hints[n]), so a stale quiz is noticed), placed at a (0–3) among the four, and the three
 * wrong options in their order: hadith id, benefit index i in that row, its text t verbatim and the row's title ti.
 */
export function buildQuizzes(rows, rootOf) {
  // The Arabic row of each id: its categories (the same in every language) and its grade, which the page shows.
  const arRow = new Map(rows.filter((r) => r.lang === 'ar').map((r) => [String(r.id), r]))
  const rootsById = new Map()
  const roots = (r) => {
    const id = String(r.id)
    if (!rootsById.has(id)) rootsById.set(id, rootsOf(arRow.get(id)?.categories ?? r.categories, rootOf))
    return rootsById.get(id)
  }
  // Accepted and shown: the Arabic row of the same id (as the page judges it) and the row itself.
  const accepted = (r) => shownRow(arRow.get(String(r.id)) ?? r) && shownRow(r)

  // The pool of each language: every benefit of every accepted hadith whose roots are known, sorted by id then index.
  const pools = new Map()
  const sorted = [...rows].sort((a, b) => Number(a.id) - Number(b.id) || (a.lang < b.lang ? -1 : a.lang > b.lang ? 1 : 0))
  for (const r of sorted) {
    if (!accepted(r) || !roots(r)) continue
    const hs = hintsOf(r)
    if (!hs.length) continue
    if (!pools.has(r.lang)) pools.set(r.lang, [])
    const pool = pools.get(r.lang)
    hs.forEach((t, i) => pool.push({ id: String(r.id), i, t, ti: r.title ?? null, len: visibleLength(t), marker: numberMarker(t), words: words(t), roots: roots(r) }))
  }

  const quizzes = new Map()
  const stats = {}
  const stat = (lang) => (stats[lang] ??= { rows: 0, withHints: 0, quizzes: 0, questions: 0, dropped: 0, noQuiz: 0, tierX: 0 })
  for (const r of sorted) {
    const s = stat(r.lang)
    s.rows++
    const hs = hintsOf(r)
    if (!hs.length) continue
    s.withHints++
    if (!accepted(r)) {
      s.tierX++
      continue
    }
    const own = roots(r)
    const pool = pools.get(r.lang) ?? []
    if (!own || !pool.length) {
      s.noQuiz++
      continue
    }
    const id = String(r.id)
    const ownWords = hs.map(words)
    const used = new Set()
    const q = []
    for (let n = 0; n < Math.min(hs.length, MAX_QUESTIONS); n++) {
      const answer = hs[n]
      const len = visibleLength(answer)
      const marker = numberMarker(answer)
      const rng = mulberry32(fnv1a(`${id}|${r.lang}|${n}`))
      const chosen = []
      const seen = new Set()
      for (let d = 0; chosen.length < 3 && d < MAX_DRAWS && seen.size < pool.length; d++) {
        const k = Math.floor(rng() * pool.length)
        if (seen.has(k)) continue
        seen.add(k)
        const c = pool[k]
        if (c.id === id || used.has(`${c.id}:${c.i}`) || chosen.some((x) => x.id === c.id)) continue
        if (c.marker !== marker) continue
        if (!len || c.len < LEN_MIN * len || c.len > LEN_MAX * len) continue
        if (!disjoint(c.roots, own)) continue
        if (!c.words.size || ownWords.some((w) => tooClose(c.words, w))) continue
        if (chosen.some((x) => tooClose(c.words, x.words))) continue
        chosen.push(c)
      }
      if (chosen.length < 3) {
        s.dropped++
        continue
      }
      for (const c of chosen) used.add(`${c.id}:${c.i}`)
      const a = Math.floor(rng() * 4)
      q.push({ n, k: answerKey(answer), a, w: chosen.map(({ id: cid, i, t, ti }) => ({ id: cid, i, t, ti })) })
    }
    if (!q.length) {
      s.noQuiz++
      continue
    }
    s.quizzes++
    s.questions += q.length
    quizzes.set(`${id}|${r.lang}`, { v: 1, q })
  }
  return { quizzes, stats }
}

/** The four options of a stored question in their order: the answer (from the row's own benefits) at `a`. */
export function optionsOf(question, hints, selfId) {
  const out = question.w.map((w) => ({ text: w.t, id: w.id, title: w.ti ?? null }))
  out.splice(question.a, 0, { text: hints[question.n], id: String(selfId), title: null })
  return out
}

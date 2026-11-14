// «سبب النزول» (add-on 0033-add7 §أ): each hadith of HadeethEnc's category 14 «أسباب النزول» linked to its ayah or
// ayat by fixed rules, no AI, in this order (the first that gives an ayah wins):
//   1 bracket     a reference in square brackets, «[الضحى: 3]», in the hadith's text (in its explanation only when the
//                 text has none); the sura name, normalised, must equal a `sura_name` of data/processed/quran.jsonl,
//                 and the ayah number must exist in that sura. Ranges («[المائدة: 44 - 47]») and lists are expanded.
//   2 full_text   the whole text of an ayah of 3 words or more inside the hadith's text, after normalisation. An ayah
//                 whose words lie inside another matched ayah's span is dropped, and a text that is the same in two
//                 or more ayat (e.g. «فبأي آلاء ربكما تكذبان») is ambiguous and not linked.
//   3 longest_run the longest run of consecutive words shared by the hadith's text and an ayah: accepted when it is
//                 6 words or more and at least 3 words longer than the runner-up ayah's run.
//   review        everything else, listed in out/asbab-review.md with its candidates and their scores; `reviewed:
//                 false` until the coordinator approves.
// Then the coordinator's decisions (data/asbab-decisions.json, reply 0037 §2; ids and ayah keys only): `link` gives a
// review entry its ayat with `reviewed: true`, `not_linked` closes one with `reviewed: true` and no ayah, `add_ayat`
// adds ayat to an automatic link (`added` lists them). `by_ayah` holds every entry the app may show: an automatic link,
// or `reviewed: true` with ayat.
// Normalisation, for comparing only: harakat and Quranic marks (U+064B–U+065F, U+0670, U+06D6–U+06ED), tatweel and
// zero-width characters removed; أ إ آ ٱ → ا, ة → ه, ى → ي; words are runs of Arabic letters.
// A separate list, for review only: every hadith outside category 14 whose text contains «فأنزل الله», «فنزلت» or
// «نزلت هذه الآية» (normalised), run through the same rules as a suggestion; none enters the ayah index.
// Outputs: data/asbab-map.json (ids, ayah keys `quran:S:A`, methods, tiers; no source text, CLAUDE.md §7) and
// out/asbab-review.md (the texts, copied from the source files, for the review; outside git).
// Inputs (outside git): data/raw/hadeethenc/ar/*.json, data/processed/quran.jsonl; and data/hadith-grade-map.json and
// data/asbab-decisions.json.
//   node scripts/daily/asbab-build.mjs            (DATA_ROOT=<dir with raw/ and processed/>, OUT_DIR=<dir> optional)
// Checked in worker/test/asbab.test.ts.
import fs from 'node:fs'
import path from 'node:path'
import { classify } from '../ingest/hadeethenc-build.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')

/** The comparison form: no harakat or Quranic marks, one alef, ة → ه, ى → ي. */
export function normalizeAr(s) {
  return (s ?? '')
    .replace(/[ً-ٰٟۖ-ۭـ​-‏⁠﻿]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
}
/** The words of a text in comparison form: runs of Arabic letters. */
export const arWords = (s) => normalizeAr(s).split(/[^ء-ي]+/).filter(Boolean)

const ascii = (s) =>
  s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0))
export const ayahKey = (sura, aya) => `quran:${sura}:${aya}`
const keyOrder = (k) => k.split(':').slice(1).map(Number)
export const byMushaf = (a, b) => {
  const [s1, a1] = keyOrder(a)
  const [s2, a2] = keyOrder(b)
  return s1 - s2 || a1 - a2
}

/** The Quran as the rules use it, from records { sura, aya, sura_name, text }. */
export function quranIndex(records) {
  const ayat = records.map((r) => {
    const w = arWords(r.text)
    return { key: ayahKey(r.sura, r.aya), sura: r.sura, aya: r.aya, w, joined: w.join(' ') }
  })
  const suras = new Map() // normalised name → { sura, name, count }
  for (const r of records) {
    const n = normalizeAr(r.sura_name).trim()
    const s = suras.get(n) ?? suras.set(n, { sura: r.sura, name: r.sura_name, count: 0 }).get(n)
    if (s.sura !== r.sura) throw new Error(`two suras named ${r.sura_name}`)
    s.count = Math.max(s.count, r.aya)
  }
  const sameText = new Map() // joined words → number of ayat with exactly that text
  for (const a of ayat) sameText.set(a.joined, (sameText.get(a.joined) ?? 0) + 1)
  const index = new Map() // word → [[ayah index, position]]
  ayat.forEach((a, i) => a.w.forEach((w, j) => (index.get(w) ?? index.set(w, []).get(w)).push([i, j])))
  return { ayat, suras, sameText, index, byKey: new Map(ayat.map((a) => [a.key, a])) }
}

const NUMS = /^\d+(?:\s*[-–—]\s*\d+)?(?:\s*[،,و]\s*\d+(?:\s*[-–—]\s*\d+)?)*$/
/** Method 1: every «[sura: n]» reference in a text, resolved against the Quran or marked with why it is not. */
export function bracketRefs(text, Q) {
  const out = []
  for (const m of (text ?? '').matchAll(/\[([^[\]]{1,80})\]/g)) {
    const inner = ascii(m[1]).trim()
    const parts = inner.match(/^([^:：\d]+?)\s*[:：]\s*(.+)$/)
    if (!parts) continue
    const nums = parts[2].trim()
    if (!/\d/.test(nums)) continue
    const raw = m[1].trim()
    const name = normalizeAr(parts[1]).replace(/^سوره\s+/, '').trim()
    const s = Q.suras.get(name)
    if (!s) {
      out.push({ raw, ok: false, why: 'sura name not in quran.jsonl' })
      continue
    }
    if (!NUMS.test(nums)) {
      out.push({ raw, ok: false, why: 'ayah numbers not read' })
      continue
    }
    const ayat = []
    let bad = false
    for (const p of nums.split(/\s*[،,و]\s*/)) {
      const [a, b = a] = p.split(/\s*[-–—]\s*/).map(Number)
      if (!(a >= 1 && b >= a && b <= s.count && b - a <= 60)) bad = true
      else for (let n = a; n <= b; n++) ayat.push(ayahKey(s.sura, n))
    }
    if (bad) out.push({ raw, ok: false, why: `ayah number outside ${s.name} (1–${s.count})` })
    else out.push({ raw, ok: true, keys: ayat })
  }
  return out
}

/** Method 2: ayat of `min` words or more whose whole text is inside the words `hw`. */
export function fullTextMatches(hw, Q, min = 3) {
  const pos = new Map()
  hw.forEach((w, i) => (pos.get(w) ?? pos.set(w, []).get(w)).push(i))
  const hits = []
  for (const a of Q.ayat) {
    if (a.w.length < min) continue
    for (const p of pos.get(a.w[0]) ?? []) {
      if (p + a.w.length > hw.length) continue
      let ok = true
      for (let k = 1; k < a.w.length && ok; k++) ok = hw[p + k] === a.w[k]
      if (ok) hits.push({ key: a.key, start: p, end: p + a.w.length, joined: a.joined })
    }
  }
  const kept = hits.filter((h) => !hits.some((o) => o.start <= h.start && o.end >= h.end && o.end - o.start > h.end - h.start))
  const linked = new Set()
  const ambiguous = new Map()
  for (const h of kept) {
    if (Q.sameText.get(h.joined) > 1) {
      const keys = Q.ayat.filter((a) => a.joined === h.joined).map((a) => a.key)
      ambiguous.set(h.joined, keys)
    } else linked.add(h.key)
  }
  return { linked: [...linked].sort(byMushaf), ambiguous: [...ambiguous.values()] }
}

/** Method 3: for every ayah, the longest run of consecutive words it shares with `hw`; best first. */
export function longestRuns(hw, Q) {
  const best = new Map() // ayah index → run length
  for (let i = 0; i < hw.length; i++) {
    for (const [ai, j] of Q.index.get(hw[i]) ?? []) {
      const aw = Q.ayat[ai].w
      if (i > 0 && j > 0 && hw[i - 1] === aw[j - 1]) continue // not the start of a run
      let k = 1
      while (i + k < hw.length && j + k < aw.length && hw[i + k] === aw[j + k]) k++
      if (k > (best.get(ai) ?? 0)) best.set(ai, k)
    }
  }
  return [...best]
    .map(([ai, words]) => ({ key: Q.ayat[ai].key, words }))
    .sort((x, y) => y.words - x.words || byMushaf(x.key, y.key))
}

export const RUN_MIN = 6
export const RUN_LEAD = 3
/** The rule of method 3 on a best-first list of runs. */
export const runAccepted = (runs) => {
  const [a, b] = runs
  return Boolean(a && a.words >= RUN_MIN && a.words - (b?.words ?? 0) >= RUN_LEAD)
}

/** The three methods in order, on a hadith { hadeeth, explanation }. */
export function linkHadith(h, Q) {
  const refsText = bracketRefs(h.hadeeth, Q)
  const refsExpl = bracketRefs(h.explanation, Q)
  const okText = refsText.filter((r) => r.ok)
  const refs = okText.length ? okText : refsExpl.filter((r) => r.ok)
  const hw = arWords(h.hadeeth)
  const full = fullTextMatches(hw, Q)
  const base = { refsText, refsExpl, full }
  if (refs.length) {
    const ayat = [...new Set(refs.flatMap((r) => r.keys))].sort(byMushaf)
    return { ...base, method: 'bracket', from: okText.length ? 'text' : 'explanation', ayat }
  }
  if (full.linked.length) return { ...base, method: 'full_text', ayat: full.linked }
  const runs = longestRuns(hw, Q)
  if (runAccepted(runs)) return { ...base, method: 'longest_run', ayat: [runs[0].key], runs: runs.slice(0, 5) }
  return { ...base, method: 'review', ayat: [], runs: runs.slice(0, 5) }
}

const OUTSIDE = ['فانزل الله', 'فنزلت', 'نزلت هذه الايه']
/** The out-of-category markers, found anywhere in the normalised words (so «أنزلت هذه الآية» has «نزلت هذه الآية»). */
export const revelationMarker = (text) => {
  const joined = arWords(text).join(' ')
  return OUTSIDE.filter((m) => joined.includes(m))
}

/**
 * The coordinator's decisions (data/asbab-decisions.json) on the entries the rules made, in place. Every id must be a
 * category-14 entry and every key an ayah (`hasAyah`), else it throws: a decision is never applied half-way.
 *   link        a review entry: its ayat, `reviewed: true`, `decision: 'linked'`
 *   not_linked  a review entry: no ayah, `reviewed: true`, `decision: 'not_linked'`
 *   add_ayat    an automatic link: the ayat added (`added`), dropped from `full_text_not_linked`, `decision: 'ayat_added'`
 */
export function applyDecisions(hadiths, decisions, hasAyah) {
  const counts = { reviewed_linked: 0, reviewed_not_linked: 0, ayat_added: 0 }
  const entry = (id, review) => {
    const e = hadiths[id]
    if (!e) throw new Error(`decision on ${id}: not a hadith of category 14`)
    if (review !== (e.method === 'review')) throw new Error(`decision on ${id}: ${review ? 'not a review entry' : 'not an automatic link'}`)
    return e
  }
  const keys = (id, ks) => {
    if (!Array.isArray(ks) || !ks.length) throw new Error(`decision on ${id}: no ayat`)
    for (const k of ks) if (!hasAyah(k)) throw new Error(`decision on ${id}: ${k} is not an ayah`)
    return [...new Set(ks)].sort(byMushaf)
  }
  for (const id of decisions.not_linked ?? []) if (decisions.link?.[id]) throw new Error(`decision on ${id}: both linked and not linked`)
  for (const [id, ks] of Object.entries(decisions.link ?? {})) {
    const e = entry(id, true)
    e.ayat = keys(id, ks)
    e.reviewed = true
    e.decision = 'linked'
    counts.reviewed_linked++
  }
  for (const id of decisions.not_linked ?? []) {
    const e = entry(id, true)
    e.ayat = []
    e.reviewed = true
    e.decision = 'not_linked'
    counts.reviewed_not_linked++
  }
  for (const [id, ks] of Object.entries(decisions.add_ayat ?? {})) {
    const e = entry(id, false)
    const want = keys(id, ks)
    const added = want.filter((k) => !e.ayat.includes(k))
    if (!added.length) continue
    e.ayat = [...new Set([...e.ayat, ...want])].sort(byMushaf)
    e.added = added
    e.decision = 'ayat_added'
    if (e.full_text_not_linked) {
      e.full_text_not_linked = e.full_text_not_linked.filter((k) => !e.ayat.includes(k))
      if (!e.full_text_not_linked.length) delete e.full_text_not_linked
    }
    counts.ayat_added += added.length
  }
  return counts
}

/** The ayah index the app may show: every automatic link, and every reviewed entry with ayat; ids ascending. */
export function byAyahOf(hadiths) {
  const by = {}
  for (const [id, e] of Object.entries(hadiths)) {
    if (e.method === 'review' && e.reviewed !== true) continue
    for (const k of e.ayat) (by[k] ??= []).push(id)
  }
  for (const k of Object.keys(by)) by[k].sort((a, b) => Number(a) - Number(b))
  return Object.fromEntries(Object.keys(by).sort(byMushaf).map((k) => [k, by[k]]))
}

function build() {
  const DATA = process.env.DATA_ROOT ? path.resolve(process.env.DATA_ROOT) : path.join(ROOT, 'data')
  const OUT = process.env.OUT_DIR ? path.resolve(process.env.OUT_DIR) : path.join(ROOT, 'out')
  const RAW = path.join(DATA, 'raw/hadeethenc')
  const QURAN = path.join(DATA, 'processed/quran.jsonl')
  for (const p of [path.join(RAW, 'ar'), QURAN]) if (!fs.existsSync(p)) throw new Error(`${p} is missing (outside git)`)
  const manifest = JSON.parse(fs.readFileSync(path.join(RAW, 'MANIFEST.json'), 'utf8'))
  const version = manifest.versions?.ar?.version ?? null
  const cats = JSON.parse(fs.readFileSync(path.join(RAW, 'categories-list-ar.json'), 'utf8'))
  const cat14 = cats.find((c) => c.id === '14')
  if (!cat14) throw new Error('category 14 is not in categories-list-ar.json')
  const gradeMap = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/hadith-grade-map.json'), 'utf8')).grades ?? {}

  const records = fs
    .readFileSync(QURAN, 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l))
    .filter((r) => r.kind === 'ayah')
  if (records.length !== 6236) throw new Error(`quran.jsonl has ${records.length} ayat, not 6236`)
  const Q = quranIndex(records)
  const ayahText = new Map(records.map((r) => [ayahKey(r.sura, r.aya), r]))

  const files = fs
    .readdirSync(path.join(RAW, 'ar'))
    .filter((f) => /^\d+\.json$/.test(f))
    .sort((a, b) => Number.parseInt(a) - Number.parseInt(b))
  const inCat = []
  const outside = []
  for (const f of files) {
    const h = JSON.parse(fs.readFileSync(path.join(RAW, 'ar', f), 'utf8'))
    if ((h.categories ?? []).map(String).includes('14')) inCat.push(h)
    else {
      const markers = revelationMarker(h.hadeeth)
      if (markers.length) outside.push({ h, markers })
    }
  }
  if (inCat.length !== Number(cat14.hadeeths_count))
    console.warn(`category 14 lists ${cat14.hadeeths_count} hadiths; ${inCat.length} found in ar/`)

  const grade = (h) => {
    const g = classify(h.grade, h.attribution, gradeMap)
    return { tier: g.tier, class: g.class, mawquf: Boolean(g.mawquf) }
  }
  const hadiths = {}
  const counts = { category_14: inCat.length, bracket: 0, bracket_from_explanation: 0, full_text: 0, longest_run: 0, review: 0 }
  const results = []
  for (const h of inCat) {
    const r = linkHadith(h, Q)
    const g = grade(h)
    results.push({ h, r, g })
    counts[r.method]++
    if (r.method === 'bracket' && r.from === 'explanation') counts.bracket_from_explanation++
    const e = { ayat: r.ayat, method: r.method, ...g }
    if (r.method === 'bracket' && r.from === 'explanation') e.from = 'explanation'
    if (r.method === 'longest_run') e.score = { words: r.runs[0].words, runner_up: r.runs[1]?.words ?? 0 }
    const extra = r.full.linked.filter((k) => !r.ayat.includes(k))
    if (r.method === 'bracket' && extra.length) e.full_text_not_linked = extra
    if (r.method === 'review') {
      e.reviewed = false
      e.candidates = r.runs.map((c) => ({ ayah: c.key, words: c.words }))
      const refKeys = [...r.refsText, ...r.refsExpl].filter((x) => !x.ok)
      if (refKeys.length) e.unresolved_refs = refKeys.length
    }
    if (r.full.ambiguous.length) e.full_text_ambiguous = r.full.ambiguous
    hadiths[h.id] = e
  }
  const fullAnywhere = results.filter((x) => x.r.full.linked.length).length
  const decisions = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/asbab-decisions.json'), 'utf8'))
  Object.assign(counts, applyDecisions(hadiths, decisions, (k) => Q.byKey.has(k)))
  const byAyahSorted = byAyahOf(hadiths)

  const outsideMap = {}
  const outsideRes = []
  const outsideCounts = { candidates: outside.length, bracket: 0, full_text: 0, longest_run: 0, review: 0 }
  for (const { h, markers } of outside) {
    const r = linkHadith(h, Q)
    const g = grade(h)
    outsideRes.push({ h, r, g, markers })
    outsideCounts[r.method]++
    outsideMap[h.id] = {
      reviewed: false,
      categories: (h.categories ?? []).map(String),
      markers,
      suggested: { method: r.method, ayat: r.ayat },
      ...(r.method === 'review' ? { candidates: r.runs.map((c) => ({ ayah: c.key, words: c.words })) } : {}),
      ...g,
    }
  }

  counts.linked = counts.bracket + counts.full_text + counts.longest_run
  counts.distinct_ayat = Object.keys(byAyahSorted).length
  counts.full_text_anywhere = fullAnywhere
  const out = {
    _about:
      'سبب النزول (add-on 0033-add7 §أ): HadeethEnc category 14 «أسباب النزول» (ar ' +
      version +
      ') linked to ayat by fixed rules, no AI; built by scripts/daily/asbab-build.mjs from data/raw/hadeethenc/ar and data/processed/quran.jsonl. Ids and ayah keys only: the texts are read from the source data at display time. Display conditions for later: only tiers 1–3 (never `mixed`, never tier X); a mawquf hadith (`mawquf: true`) is never introduced with «قال رسول الله ﷺ». Entries with `reviewed: false` are not shown until the coordinator approves them. The coordinator\'s decisions (data/asbab-decisions.json, reply 0037 §2) are applied after the rules: `reviewed: true` with ayat is shown, with none (`decision: not_linked`) it is not, and `added` lists the ayat a decision added to an automatic link. `by_ayah` holds what the app may show; `outside_category` is a review list only and is not in `by_ayah`.',
    rule:
      'In order, the first that gives an ayah: (1) bracket: «[sura: n]» in the hadith text (the explanation only when the text has none), the sura name normalised and equal to a sura_name of quran.jsonl, ranges and lists expanded; (2) full_text: the whole text of an ayah of 3+ words inside the hadith text after normalisation (no harakat or Quranic marks; أ/إ/آ/ٱ→ا, ة→ه, ى→ي), an ayah inside a longer matched ayah dropped, a text found in two or more ayat not linked; (3) longest_run: the longest run of shared consecutive words, accepted at 6+ words and 3+ ahead of the runner-up ayah; (4) review: out/asbab-review.md, `reviewed: false`.',
    source: { name: 'HadeethEnc', url: 'https://hadeethenc.com', category: '14', language: 'ar', version },
    display: { tiers: ['1', '2', '3'], never: ['mixed'], mawquf: 'never introduced with «قال رسول الله ﷺ»' },
    counts,
    hadiths,
    by_ayah: byAyahSorted,
    outside_category: { _about: 'Hadiths outside category 14 whose text has «فأنزل الله», «فنزلت» or «نزلت هذه الآية»: for review only, not linked, not in by_ayah.', counts: outsideCounts, hadiths: outsideMap },
  }
  fs.writeFileSync(path.join(ROOT, 'data/asbab-map.json'), JSON.stringify(out, null, 1) + '\n')
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'asbab-review.md'), reviewMd({ results, outsideRes, counts, outsideCounts, version, ayahText, Q, hadiths }))
  console.log(JSON.stringify({ counts, outside: outsideCounts }, null, 1))
  console.log(`wrote data/asbab-map.json and ${path.join(OUT, 'asbab-review.md')}`)
}

const refLabel = (k, ayahText) => {
  const r = ayahText.get(k)
  return r ? `${r.ref} (${k})` : k
}
function reviewMd({ results, outsideRes, counts, outsideCounts, version, ayahText, hadiths }) {
  // The coordinator's decision on an entry (data/asbab-decisions.json, reply 0037 §2), as one line.
  const decided = (id) => {
    const e = hadiths?.[id]
    if (e?.decision === 'linked') return `- قرار المنسّق (0037 §2): يُربط بـ ${e.ayat.map((k) => refLabel(k, ayahText)).join('، ')}`
    if (e?.decision === 'not_linked') return '- قرار المنسّق (0037 §2): لا يُربط، ويُعرض في صفحة الحديث فقط'
    if (e?.decision === 'ayat_added') return `- قرار المنسّق (0037 §2): أُضيفت ${e.added.map((k) => refLabel(k, ayahText)).join('، ')}`
    return null
  }
  const L = []
  const url = (id) => `https://hadeethenc.com/ar/browse/hadith/${id}`
  const quote = (t) => (t ?? '').split('\n').map((l) => `> ${l}`).join('\n')
  const head = (h, g) =>
    `- الدرجة: ${h.grade} · المخرّج: ${h.attribution} · الطبقة ${g.tier}${g.mawquf ? ' · موقوف' : ''} · الرابط: ${url(h.id)}`
  const refsLine = (r) => {
    const fmt = (xs) => xs.map((x) => `[${x.raw}]${x.ok ? '' : ` (لم يُقرأ: ${x.why})`}`).join('، ')
    const t = r.refsText.length ? `في النص: ${fmt(r.refsText)}` : 'في النص: لا شيء'
    const e = r.refsExpl.length ? `في الشرح: ${fmt(r.refsExpl)}` : 'في الشرح: لا شيء'
    return `- المراجع بين المعقوفين: ${t}؛ ${e}`
  }
  const cands = (r) =>
    r.runs?.length
      ? r.runs
          .map((c, i) => `  ${i + 1}. ${refLabel(c.key, ayahText)}: ${c.words} كلمات متتابعة مشتركة\n     > ${ayahText.get(c.key)?.text ?? ''}`)
          .join('\n')
      : '  لا مرشح'
  L.push('# مراجعة «سبب النزول» (الملحق 0033-add7 §أ)', '')
  L.push(
    `المصدر: موسوعة الأحاديث النبوية (hadeethenc.com)، العربية ${version}، الباب 14 «أسباب النزول». الآيات من quran.jsonl (المصدر أ). بُني بـ \`node scripts/daily/asbab-build.mjs\`، بلا ذكاء اصطناعي، والنصوص منسوخة من ملفات المصدر كما هي.`,
    '',
  )
  L.push('## الأرقام', '')
  L.push(`- أحاديث الباب 14: ${counts.category_14}`)
  L.push(`- الطريقة 1 (المرجع بين معقوفين): ${counts.bracket}${counts.bracket_from_explanation ? ` (منها ${counts.bracket_from_explanation} من الشرح)` : ''}`)
  L.push(`- الطريقة 2 (نص الآية كاملًا): ${counts.full_text}`)
  L.push(`- الطريقة 3 (أطول تتابع ≥ 6 ويتقدم بـ 3): ${counts.longest_run}`)
  L.push(`- للمراجعة: ${counts.review}`)
  L.push(`- الآيات المختلفة المغطاة: ${counts.distinct_ayat}`)
  L.push(`- أحاديث في نصها آية كاملة (3 كلمات فأكثر) بصرف النظر عن الطريقة: ${counts.full_text_anywhere}`)
  L.push(`- المرشحون من خارج الباب: ${outsideCounts.candidates}`, '')

  const review = results.filter((x) => x.r.method === 'review')
  L.push(`## 1. أحاديث الباب 14 التي لم تُربط آليًا (${review.length})`, '')
  for (const { h, r, g } of review) {
    L.push(`### ${h.id}: ${h.title}`, '', head(h, g), ...[decided(h.id)].filter(Boolean), refsLine(r), '- النص:', '', quote(h.hadeeth), '', '- المرشحون (أطول تتابع كلمات مشترك، بالكلمات):', cands(r), '')
    if (r.full.ambiguous.length) L.push(`- نص آية كامل في أكثر من موضع (لم يُربط): ${r.full.ambiguous.map((ks) => ks.join(' / ')).join('؛ ')}`, '')
  }

  const notes = results.filter((x) => x.r.method === 'bracket' && x.r.full.linked.some((k) => !x.r.ayat.includes(k)))
  L.push(`## 2. ملاحظات على المربوط بالمرجع (${notes.length}): آيات نصها كامل في الحديث ولم تُذكر في المعقوفين`, '')
  L.push('رُبطت هذه بالآيات المذكورة في المعقوفين وحدها كما تقضي الطريقة 1. والآيات التالية نصها كامل في الحديث ولم تُربط؛ للقرار.', '')
  for (const { h, r } of notes) {
    const extra = r.full.linked.filter((k) => !r.ayat.includes(k))
    L.push(`- ${h.id} (${h.title}): المربوط ${r.ayat.map((k) => refLabel(k, ayahText)).join('، ')}؛ ونصه كامل في الحديث ولم يُربط: ${extra.map((k) => refLabel(k, ayahText)).join('، ')}`)
    const d = decided(h.id)
    if (d) L.push(`  ${d}`)
  }
  L.push('')

  L.push(`## 3. المرشحون من خارج الباب 14 (${outsideRes.length})، للمراجعة فقط`, '')
  L.push(
    `في نصهم «فأنزل الله» أو «فنزلت» أو «نزلت هذه الآية». الربط المقترح بالقواعد نفسها: المرجع ${outsideCounts.bracket}، ونص الآية ${outsideCounts.full_text}، وأطول تتابع ${outsideCounts.longest_run}، وبلا ربط ${outsideCounts.review}. كلهم \`reviewed: false\` ولا يدخلون الفهرس العكسي.`,
    '',
  )
  for (const { h, r, g, markers } of outsideRes) {
    L.push(`### ${h.id}: ${h.title}`, '', head(h, g), `- الأبواب: ${(h.categories ?? []).join('، ')} · العلامة: ${markers.join('، ')}`, refsLine(r))
    L.push(`- الربط المقترح: ${r.method === 'review' ? 'لا شيء' : `${r.method}: ${r.ayat.map((k) => refLabel(k, ayahText)).join('، ')}`}`)
    L.push('- النص:', '', quote(h.hadeeth), '')
    if (r.method === 'review' || r.method === 'longest_run') L.push('- المرشحون:', cands(r), '')
  }

  const linked = results.filter((x) => x.r.method !== 'review')
  L.push(`## 4. المربوط آليًا من الباب 14 (${linked.length})، للاطلاع`, '')
  L.push('| الرقم | العنوان | الطريقة | الآيات |', '| --- | --- | --- | --- |')
  for (const { h, r } of linked)
    L.push(`| ${h.id} | ${h.title.replace(/\|/g, '/')} | ${r.method}${r.from === 'explanation' ? ' (من الشرح)' : ''}${r.method === 'longest_run' ? ` (${r.runs[0].words} مقابل ${r.runs[1]?.words ?? 0})` : ''} | ${r.ayat.map((k) => ayahText.get(k)?.ref ?? k).join('، ')} |`)
  L.push('')
  return L.join('\n')
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) build()

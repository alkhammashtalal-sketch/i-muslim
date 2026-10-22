// The daily card «اسم من أسماء الله» (reply 0068; reply 0071 §4.2; add-ons 0071-add1 §2–4 and 0071-add2 §2):
// data/names-daily.json from the reviewed file and the ids that matched our data.
//   node scripts/names/daily-build.mjs <names-reviewed.txt> <cards.json> [data/names-daily.json]
// For the 96 entries of the main part, in the reviewed file's order (the appendix is not in the daily rotation):
//   • the ids that matched (cards.json, from scripts/names/verify-draft.mjs), and nothing else: the evidence ayah or
//     HadeethEnc hadith, the ayah for the meaning, the duas. No text of the Quran, a hadith or a tafsir is copied:
//     the card reads them from D1 by these ids when it is shown.
//   • `quranOnly`: the six entries whose evidence hadith HadeethEnc does not hold (add-on 0071-add2 §2). The card
//     shows their Quranic evidence alone, never a hadith from outside our data.
//   • `tafsirOf`: the one ayah whose tafsir (al-Saʿdi, Ibn Kathir) the card shows: the evidence ayah, else the ayah
//     for the meaning, else, for the six, the first Quranic dua the entry lists. Only ayat the reviewed file cites
//     for that entry, all matched in quran.jsonl.
//   • `readings`: «المعنى», «قراءة ميسرة» and «قراءة أعمق» as written in the reviewed file (its reference marks [1]
//     and [2] dropped). The Worker serves them only while NAMES_READINGS is on (worker/src/names-day.ts).
//   • a dua the file lists as a praise («ثناء قرآني: D14», al-Fatiha 2) carries `praise: true`, so the card names it so.
// Add-on 0071-add5 §2, what the readings cite:
//   • an ayah cited by number («النساء: 48», «هود 57», «الرحمن: 26–27») that is in quran.jsonl becomes a link to it,
//     {{النساء: 48|quran:4:48}} (a range links its first ayah; every ayah of it is checked, and the words the reading
//     quotes before it are checked in it); a hadith cited by number («صحيح مسلم 2713») becomes {{…|hadith:6335}} only
//     when the reading's sentence quotes it by the textual rule of CLAUDE.md §9 (the words in an accepted Arabic
//     HadeethEnc row after the diacritics are removed: six words or more in a row, or all of them in order with at
//     most two between, worker/src/hadith-grade.ts) and that row's takhrij names the same book. The card renders the
//     link; the wording is the reading's own, letter for letter.
//   • what does not match is removed by an edit of scripts/names/add5-edits.mjs, and so is every mention of a hadith
//     in the readings of the six; the build stops if a number is left outside a link, or a hadith in the six's.
// Checks before writing: the cards and the file agree entry by entry; every id is in data/processed (quran.jsonl,
// and hadith.jsonl in Arabic with tier 1–3); every entry has its three readings; no code (Dxx, Hxx, Rxxx) or mark is
// left in them; and the book whose order inspired the list is not named (scripts/names/forbidden.mjs).
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { EDITS } from './add5-edits.mjs'
import { findForbidden } from './forbidden.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')
const [reviewedPath, cardsPath, outArg] = process.argv.slice(2)
if (!reviewedPath || !cardsPath) {
  console.error('usage: node scripts/names/daily-build.mjs <names-reviewed.txt> <cards.json> [out.json]')
  process.exit(2)
}
const outPath = outArg ?? path.join(ROOT, 'data/names-daily.json')
const P = path.join(ROOT, 'data/processed')
const fail = (m) => {
  console.error(`daily-build: ${m}`)
  process.exit(1)
}

// The day the rotation starts: entry 1 on this Riyadh date, then one entry a day, round again after the last.
const EPOCH = '2026-10-22'

const lines = fs.readFileSync(reviewedPath, 'utf8').split('\n')
const cards = JSON.parse(fs.readFileSync(cardsPath, 'utf8'))

// ---- our data: the ayat, and the accepted Arabic rows of HadeethEnc (tier 1–3) as /api/adhkar/hadith serves ----
// The search normalization of worker/src/lib/normalize.ts (normalizeArabic, tokenize), for the textual rule.
const normalizeArabic = (s) =>
  String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿ]/g, '')
    .replace(/ـ/g, '')
    .replace(/[​-‏‪-‮⁦-⁩﻿]/g, '')
    .replace(/[آأإٱٲٳ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[۞۩۝]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
const tokenize = (s) =>
  normalizeArabic(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
const MIN_EXACT = 6
const MAX_GAP = 2
/** worker/src/hadith-grade.ts quoteMatch: the whole quote word for word (six words or more), or every word in order
 *  with at most two words between two of them. */
function quoteMatch(q, h) {
  if (q.length >= MIN_EXACT) for (let i = 0; i + q.length <= h.length; i++) if (q.every((w, j) => h[i + j] === w)) return 'exact'
  for (let start = 0; start < h.length; start++) {
    if (h[start] !== q[0]) continue
    let at = start
    let ok = true
    for (let j = 1; j < q.length && ok; j++) {
      let k = at + 1
      while (k < h.length && k - at - 1 <= MAX_GAP && h[k] !== q[j]) k++
      if (k < h.length && h[k] === q[j] && k - at - 1 <= MAX_GAP) at = k
      else ok = false
    }
    if (ok) return 'ordered'
  }
  return null
}

const quranRows = fs
  .readFileSync(path.join(P, 'quran.jsonl'), 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))
const quranById = new Map(quranRows.map((r) => [r.id, r]))
const suraByName = new Map()
for (const r of quranRows) suraByName.set(normalizeArabic(r.sura_name), r.sura)
const accepted = []
const tierOf = new Map()
const rl = readline.createInterface({ input: fs.createReadStream(path.join(P, 'hadith.jsonl')), crlfDelay: Infinity })
for await (const l of rl) {
  if (!l.startsWith('{"lang":"ar"')) continue
  const r = JSON.parse(l)
  tierOf.set(r.id, r.tier)
  if (['1', '2', '3'].includes(r.tier) && r.grade) accepted.push({ id: r.id, tier: r.tier, grade: r.grade, class: r.class, attribution: r.attribution ?? '', words: tokenize(r.hadeeth) })
}

/** The HadeethEnc row a quote is (hadith-grade.ts findQuoted): one hadith, or copies of one text, or rows that all
 *  carry the same grade; the lowest tier, then the smallest id. */
function hadithOf(quote) {
  const q = tokenize(quote)
  if (q.length < 2) return null
  const hits = accepted.filter((r) => quoteMatch(q, r.words))
  if (!hits.length) return null
  hits.sort((a, b) => a.tier.localeCompare(b.tier) || Number(a.id) - Number(b.id))
  const texts = new Set(hits.map((h) => h.words.join(' ')))
  const same = hits.every((h) => h.grade === hits[0].grade && h.class === hits[0].class)
  return texts.size === 1 || same ? hits[0] : null
}

// ---- add-on 0071-add5 §2: the citations by number in the readings ----
const BOOKS = [
  ['البخاري', /البخاري|متفق عليه/],
  ['مسلم', /مسلم|متفق عليه/],
  ['أبو داود', /داود/],
  ['أبي داود', /داود/],
  ['الترمذي', /الترمذي/],
  ['النسائي', /النسائي/],
  ['ابن ماجه', /ماجه/],
  ['أحمد', /أحمد/],
  // al-Albani's books: HadeethEnc's takhrij never names them, so a hadith cited from them never matches.
  ['صحيح الجامع', /(?!)/],
  ['السلسلة الصحيحة', /(?!)/],
]
const NOT_LETTER = '(?<![\\p{L}\\p{M}])'
// «(النساء: 48)», «هود 57», «الرحمن: 26–27», «آل عمران: 8»: a sura's name, then the ayah or a range.
const AYAH_CITE = new RegExp(`${NOT_LETTER}((?:آل )?[\\p{L}\\p{M}]{2,})(?::\\s*|\\s+)(\\d{1,3})(?:\\s*[–-]\\s*(\\d{1,3}))?(?![\\d/])`, 'gu')
// «صحيح مسلم 2713», «صحيح مسلم (2590)», «رواه البخاري 6407», «مسلم 2713», «السلسلة الصحيحة (7/1209)».
const HADITH_CITE = new RegExp(`${NOT_LETTER}((?:رواه |صحيح )?(${BOOKS.map(([b]) => b).join('|')}))[\\s،]*(\\()?(\\d{1,5}(?:/\\d{1,5})?)(\\))?(?![\\d/])`, 'gu')
const SENTENCE_END = /[.؟!]/

/** The sentence of `text` around [start, end). */
function sentenceOf(text, start, end) {
  let s = start
  while (s > 0 && !SENTENCE_END.test(text[s - 1])) s--
  let e = end
  while (e < text.length && !SENTENCE_END.test(text[e])) e++
  return { s, e }
}

/** The words a sentence quotes, nearest the citation first: between «», else after «بقوله» or «قوله». */
function quotesNear(text, start, end) {
  const { s, e } = sentenceOf(text, start, end)
  const sentence = text.slice(s, e)
  let qs = [...sentence.matchAll(/«([^»]+)»/g)].map((m) => ({ q: m[1], at: s + m.index, to: s + m.index + m[0].length }))
  if (!qs.length) qs = [...sentence.matchAll(/(?:بقوله|قوله)\s*:?\s*([^،؛.«»:]+)/g)].map((m) => ({ q: m[1].trim(), at: s + m.index, to: s + m.index + m[0].length }))
  const dist = (x) => (x.to <= start ? start - x.to : x.at >= end ? x.at - end : 0)
  return qs.sort((a, b) => dist(a) - dist(b)).map((x) => x.q)
}

/** Every number cited in `text`: an ayah or a hadith, matched to our data or not. A number that is neither is
 *  reported as unmatched (`kind: 'other'`), so nothing with a number is left outside a link. */
function citationsIn(text) {
  const out = []
  for (const m of text.matchAll(AYAH_CITE)) {
    const s = suraByName.get(normalizeArabic(m[1]))
    if (!s) continue
    const from = Number(m[2])
    const to = m[3] ? Number(m[3]) : from
    const ids = Array.from({ length: Math.max(0, to - from + 1) }, (_, k) => `quran:${s}:${from + k}`)
    const exists = to >= from && ids.every((id) => quranById.has(id))
    // The words the reading quotes right before the citation, «…» (السورة: الآية), must be in that ayah.
    const quoted = text.slice(0, m.index).match(/«([^»]+)»\s*\(?\s*$/)?.[1]
    const words = ids.flatMap((id) => tokenize(quranById.get(id)?.text ?? ''))
    const quoteOk = !quoted || !exists || !!quoteMatch(tokenize(quoted), words) || !!quoteMatch(tokenize(quoted.replace(/ؤو/g, 'ءو').replace(/ؤ/g, 'ءو')), words)
    out.push({ kind: 'ayah', start: m.index, end: m.index + m[0].length, text: m[0], id: exists && quoteOk ? ids[0] : null, why: !exists ? `${ids.join('، ')} ليست في quran.jsonl` : quoteOk ? null : `«${quoted}» ليس في ${ids.join('، ')}` })
  }
  for (const m of text.matchAll(HADITH_CITE)) {
    // «صحيح مسلم (2590)»: the parentheses are the citation's; one left open is not a citation this check reads.
    if (!m[3] !== !m[5]) continue
    const span = m[0].length
    const book = BOOKS.find(([b]) => b === m[2])
    const row = quotesNear(text, m.index, m.index + span)
      .map((q) => hadithOf(q))
      .find((r) => r && book[1].test(r.attribution))
    out.push({ kind: 'hadith', start: m.index, end: m.index + span, text: m[0], id: row ? `hadith:${row.id}` : null, why: row ? null : 'لا يقتبس لفظ حديث في موسوعة الأحاديث بمخرّج الكتاب نفسه' })
  }
  out.sort((a, b) => a.start - b.start)
  for (let i = 1; i < out.length; i++) if (out[i].start < out[i - 1].end) fail(`two citations overlap: «${out[i - 1].text}» and «${out[i].text}»`)
  // Any other number: a citation this check does not read, never linked.
  let rest = text
  for (const c of [...out].reverse()) rest = rest.slice(0, c.start) + ' '.repeat(c.end - c.start) + rest.slice(c.end)
  for (const m of rest.matchAll(/[^\s،؛.]*\d[^\s،؛.]*/g)) out.push({ kind: 'other', start: m.index, end: m.index + m[0].length, text: m[0], id: null, why: 'رقم لا يقرؤه التحقق' })
  return out
}

/** `text` with each matched citation written as a link, {{its words|id}}. */
function linked(text) {
  const cs = citationsIn(text)
  let out = ''
  let at = 0
  for (const c of cs.filter((x) => x.id).sort((a, b) => a.start - b.start)) {
    out += `${text.slice(at, c.start)}{{${text.slice(c.start, c.end)}|${c.id}}}`
    at = c.end
  }
  return { text: out + text.slice(at), cs }
}

// A mention of a hadith (the six, add-on 0071-add5 §2), in the normalized text; «أهل الحديث» names scholars.
const HADITH_MENTION = /(?:^| )(?:و|ف|ب|ل|ك)?(?:ال)?(?:حديث\S*|احاديث|روايه|روايات|اسانيد\S*|اسناد\S*|صحيحين|بخاري|رواه|صحيح الجامع|السلسله الصحيحه)(?= |$)|(?:^| )مسلم(?= |$)|النبي صلي الله عليه وسلم|(?:^| )الرسول(?= |$)/
const hadithMentions = (t) => {
  const n = normalizeArabic(t).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').replace(/اهل الحديث/g, ' ')
  return n.match(HADITH_MENTION)?.[0]?.trim() ?? null
}

// Each entry's block: its lines from the header to the next header or part heading.
const HEAD = /^(\d{3}) \| (.+)$/
const PART = /^(سجل|الملحق:|القسم|بقية القائمة)/
const blocks = []
let appendix = false
for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('الملحق:')) appendix = true
  if (lines[i].startsWith('سجل')) break
  const m = lines[i].match(HEAD)
  if (!m) continue
  const block = []
  for (let j = i + 1; j < lines.length && !HEAD.test(lines[j]) && !PART.test(lines[j]); j++) block.push(lines[j])
  blocks.push({ n: Number(m[1]), name: m[2].trim(), appendix, block })
}

const MARK = /\s*\[\d(?:، \d)*\]\s*$/u
function readingsOf(b) {
  const meaning = b.find((l) => /^المعنى(\s*\[[^\]]*\])?:/.test(l))
  const easy = b.find((l) => l.startsWith('قراءة ميسرة:'))
  const deepAt = b.findIndex((l) => l.startsWith('قراءة أعمق'))
  const deep = []
  // The paragraphs under «قراءة أعمق», up to the entry's dua, dhikr, praise, references or appendix note.
  for (let j = deepAt + 1; deepAt >= 0 && j < b.length && !/^(دعاء|ذكر|ثناء|المراجع|تنبيه)/.test(b[j]); j++) if (b[j].trim()) deep.push(b[j].replace(MARK, '').trim())
  return {
    meaning: meaning ? meaning.replace(/^المعنى(\s*\[[^\]]*\])?:\s*/u, '').replace(MARK, '').trim() : null,
    easy: easy ? easy.replace('قراءة ميسرة:', '').replace(MARK, '').trim() : null,
    deep,
  }
}

const main = blocks.filter((b) => !b.appendix)
if (blocks.length !== cards.length) fail(`${blocks.length} entries in the file, ${cards.length} in cards.json`)
for (const [k, b] of blocks.entries()) {
  const c = cards[k]
  if (c.n !== b.n || c.name !== b.name || c.appendix !== b.appendix) fail(`entry ${b.n} «${b.name}» is ${c.n} «${c.name}» in cards.json`)
}
if (main.length !== 96) fail(`${main.length} main entries, 96 expected (add-on 0071-add1)`)

// The praises: «D14 | ثناء قرآني: «…»» in the register, its source «الفاتحة: 2» on the next line; an entry lists it
// on a line «ثناء قرآني: D14».
const praiseAyah = new Map()
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^(D\d+) \| (ثناء[^:]*): «/)
  if (!m) continue
  const ref = (lines[i + 1] ?? '').match(/^المصدر:\s*(.+?):\s*(\d{1,3})\b/)
  const s = ref && suraByName.get(normalizeArabic(ref[1]))
  if (!s || !quranById.has(`quran:${s}:${ref[2]}`)) fail(`the praise ${m[1]} has no ayah of quran.jsonl as its source`)
  praiseAyah.set(m[1], `quran:${s}:${ref[2]}`)
}
const praisesOf = (b) => new Set(b.block.flatMap((l) => (l.match(/^ثناء[^:]*: ((?:D\d+[،,\s]*)+)$/)?.[1].match(/D\d+/g) ?? []).map((code) => praiseAyah.get(code))))

// Add-on 0071-add5 §2: the edits (scripts/names/add5-edits.mjs), each applied once, in order.
const AT = { meaning: 'المعنى', easy: 'قراءة ميسرة', 'deep:0': 'قراءة أعمق [1]', 'deep:1': 'قراءة أعمق [2]' }
const used = new Set()
function edited(n, r) {
  const x = { meaning: r.meaning, easy: r.easy, deep: [...r.deep] }
  for (const [k, e] of EDITS.entries()) {
    if (e.n !== n) continue
    if (!AT[e.at]) fail(`edit ${k}: no reading «${e.at}»`)
    const get = () => (e.at.startsWith('deep:') ? x.deep[Number(e.at.slice(5))] : x[e.at])
    const t = get()
    if (typeof t !== 'string' || t.split(e.before).length !== 2) fail(`edit ${k} (entry ${n}, ${e.at}): «${e.before.slice(0, 50)}…» is not once in the reading`)
    const v = t.replace(e.before, () => e.after).replace(/\s{2,}/g, ' ').trim()
    if (e.at.startsWith('deep:')) x.deep[Number(e.at.slice(5))] = v
    else x[e.at] = v
    used.add(k)
  }
  x.deep = x.deep.filter((p) => p)
  return x
}

const ayahIds = new Set()
const hadithIds = new Set()
const report = { found: [], linked: [], removed: [] }
const entries = main.map((b) => {
  const c = cards.find((x) => x.n === b.n)
  const praises = praisesOf(b)
  const duas = c.duas.map((d) => (d.kind === 'ayah' ? { kind: 'ayah', id: d.id, ...(praises.has(d.id) ? { praise: true } : {}) } : { kind: 'hadith', id: String(d.id).replace(/^hadith:/, '') }))
  const quranOnly = !c.hadith && !!c.hadithMissing
  const tafsirOf = c.ayah ?? c.meaningAyah ?? (quranOnly ? (duas.find((d) => d.kind === 'ayah')?.id ?? null) : null)
  for (const id of [c.ayah, c.meaningAyah, ...duas.filter((d) => d.kind === 'ayah').map((d) => d.id)]) if (id) ayahIds.add(id)
  for (const id of [c.hadith, ...duas.filter((d) => d.kind === 'hadith').map((d) => d.id)]) if (id) hadithIds.add(String(id))
  const asWritten = readingsOf(b.block)
  if (!asWritten.meaning || !asWritten.easy || !asWritten.deep.length) fail(`entry ${b.n} «${b.name}»: a reading is missing`)
  for (const t of [asWritten.meaning, asWritten.easy, ...asWritten.deep]) {
    if (/\b[DHR]\d{2,3}\b/.test(t) || /\[\d/.test(t)) fail(`entry ${b.n} «${b.name}»: a code or mark is left in «${t.slice(0, 40)}…»`)
    if (/\{\{|\}\}|\|/.test(t)) fail(`entry ${b.n} «${b.name}»: the link marks {{ }} | are in the text itself`)
    for (const x of citationsIn(t)) report.found.push({ n: b.n, ...x })
  }
  // An edit for a number removes only what does not match.
  for (const e of EDITS.filter((e) => e.n === b.n && e.cite)) {
    const t = e.at.startsWith('deep:') ? asWritten.deep[Number(e.at.slice(5))] : asWritten[e.at]
    const c2 = citationsIn(t ?? '').find((x) => x.text.includes(e.cite) || e.cite.includes(x.text.trim()))
    if (c2?.id) fail(`entry ${b.n}: the edit removes «${e.cite}», which matches ${c2.id}`)
  }
  const ed = edited(b.n, asWritten)
  if (!ed.meaning || !ed.easy || !ed.deep.length) fail(`entry ${b.n} «${b.name}»: a reading is empty after the edits of add-on 0071-add5`)
  const link = (t, at) => {
    const { text, cs } = linked(t)
    const left = cs.filter((x) => !x.id)
    if (left.length) fail(`entry ${b.n} «${b.name}» (${at}): ${left.map((x) => `«${x.text}» (${x.why})`).join('، ')}: not in our data, to be removed in scripts/names/add5-edits.mjs`)
    for (const x of cs) report.linked.push({ n: b.n, ...x })
    return text
  }
  const readings = { meaning: link(ed.meaning, 'meaning'), easy: link(ed.easy, 'easy'), deep: ed.deep.map((p, i) => link(p, `deep:${i}`)) }
  if (quranOnly) for (const [k, t] of [['meaning', ed.meaning], ['easy', ed.easy], ...ed.deep.map((p, i) => [`deep:${i}`, p])]) {
    const h = hadithMentions(t)
    if (h) fail(`entry ${b.n} «${b.name}» (${k}) has no HadeethEnc hadith and still mentions one: «${h}»`)
  }
  if (!c.ayah && !c.hadith && !c.meaningAyah && !duas.length) fail(`entry ${b.n} «${b.name}» has nothing matched to show`)
  return {
    n: b.n,
    name: b.name,
    ayah: c.ayah ?? null,
    hadith: c.hadith ? String(c.hadith) : null,
    meaningAyah: c.meaningAyah ?? null,
    duas,
    quranOnly,
    tafsirOf,
    readings,
  }
})
for (const [k, e] of EDITS.entries()) if (!used.has(k)) fail(`edit ${k} (entry ${e.n}, ${e.at}) applies to no entry of the main part`)

// Every id is in our data: the ayat in quran.jsonl, the hadiths in hadith.jsonl in Arabic and accepted (tier 1–3).
for (const id of ayahIds) if (!/^quran:\d{1,3}:\d{1,3}$/.test(id) || !quranById.has(id)) fail(`${id} is not in quran.jsonl`)
for (const id of hadithIds) if (!['1', '2', '3'].includes(tierOf.get(id))) fail(`hadith ${id} is not an accepted Arabic row of hadith.jsonl (tier ${tierOf.get(id) ?? 'none'})`)

const out = {
  _about:
    'The daily card «اسم من أسماء الله» (reply 0068; reply 0071 §4.2; add-ons 0071-add1, 0071-add2 §2 and 0071-add5 §2), built by scripts/names/daily-build.mjs from the reviewed names file of add-on 0071-add1 and the ids that matched our data (scripts/names/verify-draft.mjs). The 96 entries of its main part in its order; the appendix is not in the daily rotation. Ids only for the Quran, the hadiths and the tafsir: their texts are read from D1 when the card is shown. `readings` are the file’s own «المعنى», «قراءة ميسرة» and «قراءة أعمق», an educational explanation prepared for the app, in Arabic only; the Worker sends them only while NAMES_READINGS is on (worker/src/names-day.ts). Add-on 0071-add5 §2: an ayah or a hadith they cite by number is a link {{its words|quran:s:a or hadith:id}} to the text in our data, and what did not match was removed (scripts/names/add5-edits.mjs, logged in the names changelog), as was every mention of a hadith in the six entries with no HadeethEnc hadith. A dua with `praise` is one the file lists as a praise («ثناء قرآني»). Checked in worker/test/names-day.test.ts.',
  rule: `One entry a day for everyone, by the Riyadh date: (days from ${EPOCH} to that date) mod ${entries.length}, never negative. Entry 1 on ${EPOCH}; after the last entry the list starts again (reply 0068 question (b) is open: the card repeats until Talal decides).`,
  epoch: EPOCH,
  count: entries.length,
  entries,
}
const text = `${JSON.stringify(out, null, 1)}\n`
if (findForbidden(text).length) fail('the output names the book whose order inspired the list')
fs.writeFileSync(outPath, text)
const six = entries.filter((e) => e.quranOnly)
console.log(`${entries.length} entries → ${path.relative(ROOT, outPath)} (${(text.length / 1024).toFixed(0)} KB); ${ayahIds.size} ayat and ${hadithIds.size} hadiths, all in data/processed`)
console.log(`Quranic evidence alone (${six.length}): ${six.map((e) => `${e.name} ← ${e.tafsirOf ?? 'no ayah'}`).join('، ')}`)
// Add-on 0071-add5 §2, in numbers: the citations by number as the file has them, and what became of them.
const f = report.found
const kinds = (xs, k) => xs.filter((x) => x.kind === k)
console.log(
  `Cited by number in the readings as written: ${f.length} (ayat ${kinds(f, 'ayah').length}, hadiths ${kinds(f, 'hadith').length}, other ${kinds(f, 'other').length}); ` +
    `linked: ayat ${kinds(report.linked, 'ayah').length}, hadiths ${kinds(report.linked, 'hadith').length}; not matched: ${f.filter((x) => !x.id).length}`,
)
for (const x of f.filter((x) => !x.id)) console.log(`  ${String(x.n).padStart(3, '0')} «${x.text.trim()}»: ${x.why}`)
for (const x of kinds(report.linked, 'hadith')) console.log(`  ${String(x.n).padStart(3, '0')} «${x.text}» → ${x.id}`)
console.log(`Edits of add-on 0071-add5: ${EDITS.length} (by number ${EDITS.filter((e) => e.rule === 'number').length}, in the six ${EDITS.filter((e) => e.rule === 'six').length})`)
console.log(`Praises (ثناء): ${entries.filter((e) => e.duas.some((d) => d.praise)).map((e) => e.name).join('، ')}`)
const bare = entries.filter((e) => !e.tafsirOf && !e.hadith)
if (bare.length) console.log(`No ayah and no hadith, the name and its dua only: ${bare.map((e) => e.name).join('، ')}`)

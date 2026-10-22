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
// Checks before writing: the cards and the file agree entry by entry; every id is in data/processed (quran.jsonl,
// and hadith.jsonl in Arabic with tier 1–3); every entry has its three readings; no code (Dxx, Hxx, Rxxx) or mark is
// left in them; and the book whose order inspired the list is not named (scripts/names/forbidden.mjs).
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
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

const ayahIds = new Set()
const hadithIds = new Set()
const entries = main.map((b) => {
  const c = cards.find((x) => x.n === b.n)
  const duas = c.duas.map((d) => (d.kind === 'ayah' ? { kind: 'ayah', id: d.id } : { kind: 'hadith', id: String(d.id).replace(/^hadith:/, '') }))
  const quranOnly = !c.hadith && !!c.hadithMissing
  const tafsirOf = c.ayah ?? c.meaningAyah ?? (quranOnly ? (duas.find((d) => d.kind === 'ayah')?.id ?? null) : null)
  for (const id of [c.ayah, c.meaningAyah, ...duas.filter((d) => d.kind === 'ayah').map((d) => d.id)]) if (id) ayahIds.add(id)
  for (const id of [c.hadith, ...duas.filter((d) => d.kind === 'hadith').map((d) => d.id)]) if (id) hadithIds.add(String(id))
  const readings = readingsOf(b.block)
  if (!readings.meaning || !readings.easy || !readings.deep.length) fail(`entry ${b.n} «${b.name}»: a reading is missing`)
  for (const t of [readings.meaning, readings.easy, ...readings.deep]) {
    if (/\b[DHR]\d{2,3}\b/.test(t) || /\[\d/.test(t)) fail(`entry ${b.n} «${b.name}»: a code or mark is left in «${t.slice(0, 40)}…»`)
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

// Every id is in our data: the ayat in quran.jsonl, the hadiths in hadith.jsonl in Arabic and accepted (tier 1–3).
const quran = new Set(
  fs
    .readFileSync(path.join(P, 'quran.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l).id),
)
for (const id of ayahIds) if (!/^quran:\d{1,3}:\d{1,3}$/.test(id) || !quran.has(id)) fail(`${id} is not in quran.jsonl`)
const found = new Map()
const rl = readline.createInterface({ input: fs.createReadStream(path.join(P, 'hadith.jsonl')), crlfDelay: Infinity })
for await (const l of rl) {
  if (!l.startsWith('{"lang":"ar"')) continue
  const r = JSON.parse(l)
  if (hadithIds.has(r.id)) found.set(r.id, r.tier)
}
for (const id of hadithIds) if (!['1', '2', '3'].includes(found.get(id))) fail(`hadith ${id} is not an accepted Arabic row of hadith.jsonl (tier ${found.get(id) ?? 'none'})`)

const out = {
  _about:
    'The daily card «اسم من أسماء الله» (reply 0068; reply 0071 §4.2; add-ons 0071-add1 and 0071-add2 §2), built by scripts/names/daily-build.mjs from the reviewed names file of add-on 0071-add1 and the ids that matched our data (scripts/names/verify-draft.mjs). The 96 entries of its main part in its order; the appendix is not in the daily rotation. Ids only for the Quran, the hadiths and the tafsir: their texts are read from D1 when the card is shown. `readings` are the file’s own «المعنى», «قراءة ميسرة» and «قراءة أعمق», an educational explanation prepared for the app; the Worker sends them only while NAMES_READINGS is on (worker/src/names-day.ts). Checked in worker/test/names-day.test.ts.',
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
const bare = entries.filter((e) => !e.tafsirOf && !e.hadith)
if (bare.length) console.log(`No ayah and no hadith, the name and its dua only: ${bare.map((e) => e.name).join('، ')}`)

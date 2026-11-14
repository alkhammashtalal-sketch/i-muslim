// The ayah of the day (reply 0031-add16 §1): a list made by a fixed rule, chosen by no one. Two sources, both in the
// project's own data:
//   «دليل اسم»  every ayah cited as Quran evidence for a Beautiful Name in data/names.json (quran.ayah; the evidence
//               checked in worker/test/daily-data.test.ts), with the name(s) it evidences;
//   «دعاء»      every ayah whose text in data/processed/quran.jsonl (source أ, KSU) begins with «رَبَّنَا», compared
//               with the diacritics and the Mushaf's marks removed (the stored text writes some as «رَّبَّنَا», e.g.
//               3:193, 14:37, 44:12, and orders shadda and fatha differently).
// No duplicates (an ayah in both lists carries both sources), in Mushaf order (sura, aya). Only ids and references are
// written: the ayah's text is read from D1 at display time. The card shows one a day: (Riyadh day − epoch day) mod N
// (web/src/v2/home/daily-ayah.ts). Checked in worker/test/daily-ayat.test.ts.
//   node scripts/daily/daily-ayat-build.mjs
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const QURAN = path.join(ROOT, 'data/processed/quran.jsonl')
const NAME = 'دليل اسم'
const DUA = 'دعاء'
const EPOCH = '2026-10-13'

if (!fs.existsSync(QURAN)) throw new Error('data/processed/quran.jsonl is missing (run the Quran ingest first)')
// Harakat, shadda, sukun, madda and hamza marks (U+064B–U+065F), the dagger alef (U+0670), the Mushaf's pause and
// annotation signs (U+06D6–U+06ED) and tatweel: removed for the comparison only.
const bare = (s) => s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '').trim()

const ayat = fs
  .readFileSync(QURAN, 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))
  .filter((r) => r.kind === 'ayah')
if (ayat.length !== 6236) throw new Error(`quran.jsonl has ${ayat.length} ayat, not 6236`)
const byId = new Map(ayat.map((a) => [a.id, a]))

const list = new Map() // id → { sources: Set, names: [] }
const entry = (id) => list.get(id) ?? list.set(id, { sources: new Set(), names: [] }).get(id)

const names = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/names.json'), 'utf8')).names
for (const n of names) {
  const id = n.quran?.ayah
  if (!id) continue
  if (!byId.has(id)) throw new Error(`${n.name}: ${id} is not an ayah in quran.jsonl`)
  const e = entry(id)
  e.sources.add(NAME)
  e.names.push(n.name)
}
const nameAyat = list.size
let duaAyat = 0
for (const a of ayat) {
  if (!/^ربنا(\s|$)/.test(bare(a.text))) continue
  entry(a.id).sources.add(DUA)
  duaAyat++
}

const out = [...list.entries()]
  .map(([id, e]) => {
    const a = byId.get(id)
    return {
      id,
      sura: a.sura,
      aya: a.aya,
      ref: a.ref,
      sources: [NAME, DUA].filter((s) => e.sources.has(s)),
      ...(e.names.length ? { names: e.names } : {}),
    }
  })
  .sort((x, y) => x.sura - y.sura || x.aya - y.aya)
const both = out.filter((x) => x.sources.length === 2)

fs.writeFileSync(
  path.join(ROOT, 'data/daily-ayat.json'),
  JSON.stringify(
    {
      _about:
        'The ayah of the day, built by scripts/daily/daily-ayat-build.mjs from data/names.json and data/processed/quran.jsonl (source أ); ids and references only, the text is read from D1 at display time. Checked in worker/test/daily-ayat.test.ts.',
      rule: 'Reply 0031-add16 §1: an automatic list, chosen by no one: every ayah cited as Quran evidence for a Beautiful Name in data/names.json («دليل اسم»), and every ayah whose text begins with «رَبَّنَا», compared without diacritics or Mushaf marks («دعاء»); no duplicates, in Mushaf order. One ayah a day: (the Riyadh day − the epoch day) mod the list length.',
      rule_ar:
        'الملحق 0031-add16 §1: قائمة بقاعدة آلية لا اختيار فيها لأحد: آيات أدلة الأسماء الحسنى في data/names.json («دليل اسم»)، وكل آية يبدأ نصها بـ«رَبَّنَا» بعد حذف التشكيل وعلامات المصحف («دعاء»)؛ بلا تكرار، بترتيب المصحف. آية كل يوم: (رقم اليوم بتوقيت الرياض − رقم يوم البداية) باقي القسمة على عدد القائمة.',
      epoch: EPOCH,
      timezone: 'Asia/Riyadh (UTC+3)',
      counts: { name_evidence: nameAyat, dua: duaAyat, both: both.length, total: out.length },
      ayat: out,
    },
    null,
    1,
  ) + '\n',
)
console.log(`${out.length} ayat: ${nameAyat} name evidence, ${duaAyat} beginning with «ربنا», ${both.length} in both (${both.map((x) => x.id).join(', ')}); epoch ${EPOCH}`)

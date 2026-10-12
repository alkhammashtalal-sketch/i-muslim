// Load HadeethEnc into D1 (migration 0008): data/processed/hadith.jsonl (sahih and hasan) and hadith_weak.jsonl
// (weak, mawdu, mixed), as one SQL file of multi-row INSERT OR REPLACE statements, and the categories of the Arabic
// rows. seq numbers the tier-1 Arabic rows (0..N-1, by numeric id) for the card of the day; N goes to
// worker/src/config/hadith-day.json.
//   node scripts/index/load-hadith.mjs
//   cd worker && npx wrangler d1 execute imuslim-next --remote --env next --file ../data/processed/hadith.sql
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const P = path.join(ROOT, 'data/processed')
const read = (f) => (fs.existsSync(path.join(P, f)) ? fs.readFileSync(path.join(P, f), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [])
const rows = [...read('hadith.jsonl'), ...read('hadith_weak.jsonl')]
const q = (s) => (s == null ? 'NULL' : `'${(typeof s === 'object' ? JSON.stringify(s) : String(s)).replace(/'/g, "''")}'`)
const list = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v.startsWith('[') ? JSON.parse(v) : [])
const day = rows.filter((r) => r.lang === 'ar' && r.tier === '1').sort((a, b) => Number(a.id) - Number(b.id))
const seq = new Map(day.map((r, i) => [r.id, i]))
const out = []
const cols = 'id, lang, title, text, intro, attribution, grade, explanation, hints, words_meanings, reference, text_ar, grade_ar, attribution_ar, categories, class, tier, version, seq'
// D1 refuses a statement over 100 KB (SQLITE_TOOBIG): rows are grouped up to 80 KB per INSERT.
const tuple = (r) =>
  `(${[
    q(r.id), q(r.lang), q(r.title), q(r.hadeeth), q(r.hadeeth_intro), q(r.attribution), q(r.grade), q(r.explanation), q(r.hints), q(r.words_meanings), q(r.reference),
    q(r.hadeeth_ar), q(r.grade_ar), q(r.attribution_ar), q(r.categories), q(r.class), q(r.tier), q(r.version), r.lang === 'ar' && seq.has(r.id) ? seq.get(r.id) : 'NULL',
  ].join(', ')})`
let batch = []
let size = 0
const flush = () => {
  if (batch.length) out.push(`INSERT OR REPLACE INTO hadiths (${cols}) VALUES\n${batch.join(',\n')};`)
  batch = []
  size = 0
}
for (const r of rows) {
  const t = tuple(r)
  const bytes = Buffer.byteLength(t)
  if (bytes > 95_000) throw new Error(`hadith ${r.id} ${r.lang} alone is ${bytes} bytes`)
  if (size + bytes > 80_000) flush()
  batch.push(t)
  size += bytes
}
flush()
const cats = []
for (const r of rows.filter((x) => x.lang === 'ar')) for (const c of list(r.categories)) cats.push(`(${q(String(c))}, ${q(r.id)}, ${q(r.tier)})`)
for (let i = 0; i < cats.length; i += 200) out.push(`INSERT OR REPLACE INTO hadith_categories (category, id, tier) VALUES\n${cats.slice(i, i + 200).join(',\n')};`)
fs.writeFileSync(path.join(P, 'hadith.sql'), out.join('\n') + '\n')
fs.writeFileSync(path.join(ROOT, 'worker/src/config/hadith-day.json'), JSON.stringify({ tier1_ar: day.length }, null, 1) + '\n')
const byLang = {}
for (const r of rows) byLang[r.lang] = (byLang[r.lang] ?? 0) + 1
console.log(`${rows.length} rows ${JSON.stringify(byLang)}; ${cats.length} category links; tier-1 Arabic for the day: ${day.length}; ${(fs.statSync(path.join(P, 'hadith.sql')).size / 1e6).toFixed(1)} MB`)

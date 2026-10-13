// Load HadeethEnc into D1 (migration 0008): data/processed/hadith.jsonl (sahih and hasan) and hadith_weak.jsonl
// (weak, mawdu, mixed), as one SQL file of multi-row INSERT OR REPLACE statements, and the categories of the Arabic
// rows. seq numbers the Arabic rows fit for the card of the day (0..N-1, by numeric id): tier 1, the grade exactly
// «صحيح» with no qualifier, not mawquf (reply 0031-add14), and from chapters that suit every reader (reply 0031-add16
// §1): at least one of its categories under root 3 «العقيدة» or root 5 «الفضائل والآداب» of HadeethEnc's tree. A
// hadith whose categories all lie under roots 4 «الفقه وأصوله», 7 «السيرة والتاريخ», 2 or 6 is excluded, and one
// under neither set (e.g. root 1 «القرآن الكريم وعلومه» alone) is not accepted either; both are counted. The roots are
// the saved response of https://hadeethenc.com/api/v1/categories/roots/?language=ar (data/raw/hadeethenc/ar/_lists/
// roots.json), the parents those of data/raw/hadeethenc/categories-list-ar.json. N, the rule, the roots and every
// category id under root 3 or 5 go to worker/src/config/hadith-day.json, which the worker checks too (dayEligible).
// Migration 0009 adds `mawquf`.
//   node scripts/index/load-hadith.mjs
//   cd worker && npx wrangler d1 execute imuslim-next --remote --env next --file ../data/processed/hadith.sql
// For a D1 already loaded, data/processed/hadith-day.sql renumbers seq alone (reply 0031-add16 §1): it clears the old
// seq of the Arabic tier-1 rows through the (lang, tier, seq) index, then sets each new seq by primary key (id, lang).
//   cd worker && npx wrangler d1 execute imuslim-next --remote --env next --file ../data/processed/hadith-day.sql
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const P = path.join(ROOT, 'data/processed')
const RAW = path.join(ROOT, 'data/raw/hadeethenc')
const read = (f) => (fs.existsSync(path.join(P, f)) ? fs.readFileSync(path.join(P, f), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [])
const rows = [...read('hadith.jsonl'), ...read('hadith_weak.jsonl')]
const q = (s) => (s == null ? 'NULL' : `'${(typeof s === 'object' ? JSON.stringify(s) : String(s)).replace(/'/g, "''")}'`)
const list = (v) => (Array.isArray(v) ? v : typeof v === 'string' && v.startsWith('[') ? JSON.parse(v) : [])

// HadeethEnc's roots and category tree (reply 0031-add16 §1). The script stops if a root's title is not the one the
// rule names, so a renumbering on their side cannot change the rule silently.
const ROOTS_URL = 'https://hadeethenc.com/api/v1/categories/roots/?language=ar'
const ACCEPT = { 3: 'العقيدة', 5: 'الفضائل والآداب' }
const EXCLUDE = { 4: 'الفقه وأصوله', 7: 'السيرة والتاريخ', 2: 'الحديث وعلومه', 6: 'الدعوة والحسبة' }
const roots = JSON.parse(fs.readFileSync(path.join(RAW, 'ar/_lists/roots.json'), 'utf8'))
for (const [id, title] of Object.entries({ ...ACCEPT, ...EXCLUDE })) {
  const r = roots.find((x) => String(x.id) === id)
  if (r?.title !== title || r.parent_id != null) throw new Error(`root ${id} is «${r?.title}» in roots.json, not «${title}»`)
}
const tree = JSON.parse(fs.readFileSync(path.join(RAW, 'categories-list-ar.json'), 'utf8'))
const parent = new Map(tree.map((c) => [String(c.id), c.parent_id == null ? null : String(c.parent_id)]))
/** The root of a category (null when the category is not in the tree). */
const rootOf = (id) => {
  let x = String(id)
  for (let i = 0; i < 20 && x != null; i++) {
    if (!parent.has(x)) return null
    const up = parent.get(x)
    if (up == null) return x
    x = up
  }
  throw new Error(`category ${id}: no root within 20 steps`)
}
const acceptedCats = [...parent.keys()].filter((c) => rootOf(c) in ACCEPT).sort((a, b) => Number(a) - Number(b))

const base = rows.filter((r) => r.lang === 'ar' && r.tier === '1' && String(r.grade ?? '').trim() === 'صحيح' && !r.mawquf)
const kind = (r) => {
  const rs = list(r.categories).map(rootOf)
  if (rs.some((x) => x in ACCEPT)) return 'accepted'
  if (rs.length && rs.every((x) => x in EXCLUDE)) return 'excluded'
  return 'neither'
}
const kinds = { accepted: [], excluded: [], neither: [] }
for (const r of base) kinds[kind(r)].push(r)
const day = kinds.accepted.sort((a, b) => Number(a.id) - Number(b.id))
const seq = new Map(day.map((r, i) => [r.id, i]))
const out = []
const cols = 'id, lang, title, text, intro, attribution, grade, explanation, hints, words_meanings, reference, text_ar, grade_ar, attribution_ar, categories, class, tier, version, seq, mawquf'
// D1 refuses a statement over 100 KB (SQLITE_TOOBIG): rows are grouped up to 80 KB per INSERT.
const tuple = (r) =>
  `(${[
    q(r.id), q(r.lang), q(r.title), q(r.hadeeth), q(r.hadeeth_intro), q(r.attribution), q(r.grade), q(r.explanation), q(r.hints), q(r.words_meanings), q(r.reference),
    q(r.hadeeth_ar), q(r.grade_ar), q(r.attribution_ar), q(r.categories), q(r.class), q(r.tier), q(r.version), r.lang === 'ar' && seq.has(r.id) ? seq.get(r.id) : 'NULL', r.mawquf ? 1 : 0,
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

// The seq renumbering alone (reply 0031-add16 §1). `seq >= 0` reads the (lang, tier, seq) index; each new seq is set
// through the primary key (id IN … AND lang = 'ar'), 250 rows a statement, every statement far under 80 KB.
const renumber = [`UPDATE hadiths SET seq = NULL WHERE lang = 'ar' AND tier = '1' AND seq >= 0;`]
for (let i = 0; i < day.length; i += 250) {
  const part = day.slice(i, i + 250)
  renumber.push(`UPDATE hadiths SET seq = CASE id ${part.map((r) => `WHEN ${q(r.id)} THEN ${seq.get(r.id)}`).join(' ')} END WHERE lang = 'ar' AND id IN (${part.map((r) => q(r.id)).join(', ')});`)
}
for (const s of renumber) if (Buffer.byteLength(s) > 80_000) throw new Error(`a seq statement is ${Buffer.byteLength(s)} bytes`)
fs.writeFileSync(path.join(P, 'hadith-day.sql'), renumber.join('\n') + '\n')

fs.writeFileSync(
  path.join(ROOT, 'worker/src/config/hadith-day.json'),
  JSON.stringify(
    {
      tier1_ar: day.length,
      rule: 'tier 1, grade exactly «صحيح», not mawquf (reply 0031-add14); and at least one category under root 3 «العقيدة» or root 5 «الفضائل والآداب» of HadeethEnc (reply 0031-add16 §1). A hadith whose categories all lie under roots 4, 7, 2 or 6 is excluded; one under neither set is not accepted.',
      roots_source: ROOTS_URL,
      roots: { accepted: ACCEPT, excluded: EXCLUDE },
      counts: { base: base.length, accepted: day.length, excluded: kinds.excluded.length, neither: kinds.neither.length },
      categories: acceptedCats,
    },
    null,
    1,
  ) + '\n',
)
const byLang = {}
for (const r of rows) byLang[r.lang] = (byLang[r.lang] ?? 0) + 1
console.log(
  `${rows.length} rows ${JSON.stringify(byLang)}; ${cats.length} category links; ${(fs.statSync(path.join(P, 'hadith.sql')).size / 1e6).toFixed(1)} MB; ` +
    `the day: ${base.length} tier-1 «صحيح» not mawquf → ${day.length} accepted (roots 3, 5), ${kinds.excluded.length} excluded (roots 4, 7, 2, 6 only), ${kinds.neither.length} under neither; ` +
    `${acceptedCats.length} accepted categories; hadith-day.sql ${renumber.length} statements, the largest ${Math.max(...renumber.map((s) => Buffer.byteLength(s)))} bytes`,
)

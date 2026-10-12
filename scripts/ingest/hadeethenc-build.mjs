// Build data/processed/hadith.jsonl from the responses kept by hadeethenc-fetch.mjs (reply 0031-add4, part A.4).
// One record per hadith per language: the fields exactly as received, plus `lang`, `version` (from the language's
// Excel header) and one derived field `tier`, from the Arabic grade and attribution (grade/attribution in the Arabic
// response, grade_ar/attribution_ar in the others):
//   1  the attribution has «متفق عليه», «رواه البخاري» or «رواه مسلم», and the grade has «صحيح»
//   2  the grade has «صحيح» and not «حسن»
//   3  the grade has «حسن» (including «حسن صحيح»)
//   X  the grade has «ضعيف», «موضوع», «منكر» or «لا يصح», or is empty, or none of the above applies
// X records do not enter hadith.jsonl; they are listed in data/processed/hadith_excluded.json for review.
//
//   node scripts/ingest/hadeethenc-build.mjs
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const RAW = path.join(ROOT, 'data/raw/hadeethenc')
const OUT = path.join(ROOT, 'data/processed')
const manifest = JSON.parse(fs.readFileSync(path.join(RAW, 'MANIFEST.json'), 'utf8'))
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']

export function tierOf(gradeAr, attributionAr) {
  const g = (gradeAr ?? '').trim()
  const a = (attributionAr ?? '').trim()
  if (!g || /ضعيف|موضوع|منكر|لا يصح/.test(g)) return 'X'
  if (/متفق عليه|رواه البخاري|رواه مسلم/.test(a) && g.includes('صحيح')) return '1'
  if (g.includes('صحيح') && !g.includes('حسن')) return '2'
  if (g.includes('حسن')) return '3'
  return 'X'
}

const kept = []
const excluded = []
const counts = {}
for (const lang of LANGS) {
  const dir = path.join(RAW, lang)
  if (!fs.existsSync(dir)) continue
  const c = (counts[lang] = { total: 0, 1: 0, 2: 0, 3: 0, X: 0 })
  for (const f of fs.readdirSync(dir).filter((x) => /^\d+\.json$/.test(x)).sort((a, b) => Number.parseInt(a) - Number.parseInt(b))) {
    const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
    const gradeAr = lang === 'ar' ? r.grade : r.grade_ar
    const attributionAr = lang === 'ar' ? r.attribution : r.attribution_ar
    const tier = tierOf(gradeAr, attributionAr)
    c.total++
    c[tier]++
    const rec = { lang, version: manifest.versions?.[lang]?.version ?? null, ...r, tier }
    if (tier === 'X') excluded.push({ lang, id: r.id, title: r.title, grade_ar: gradeAr ?? null, attribution_ar: attributionAr ?? null })
    else kept.push(rec)
  }
}
fs.writeFileSync(path.join(OUT, 'hadith.jsonl'), kept.map((r) => JSON.stringify(r)).join('\n') + '\n')
fs.writeFileSync(path.join(OUT, 'hadith_excluded.json'), JSON.stringify(excluded, null, 1))
console.log(JSON.stringify(counts, null, 1))
console.log(`hadith.jsonl: ${kept.length} records; excluded (X): ${excluded.length}`)

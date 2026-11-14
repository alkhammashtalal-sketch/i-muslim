// Build data/processed/hadith.jsonl from the responses kept by hadeethenc-fetch.mjs (reply 0031-add4, part A.4).
// One record per hadith per language: the fields exactly as received, plus `lang`, `version` (from the language's
// Excel header) and two derived fields, `class` and `tier`, from the Arabic grade and attribution (grade/attribution
// in the Arabic response, grade_ar/attribution_ar in the others). Diacritics are ignored when matching.
//   mixed   the grade has a weakening word («ضعيف», «موضوع», «منكر», «لا يصح») and an authenticating one («صحيح»,
//           «صححه», «حسن», «حسّنه») together, e.g. «حديث أبي ذر ضعيف، وحديث معيقيب صحيح» (reply 0031-add13)
//   weak    a weakening word only («موضوع» → class `mawdu`)
//   sahih   «صحيح» or «صححه …» (reply 0031-add13: «صححه فلان» is a ruling of soundness by the one named), no «حسن»
//           tier 1 when the attribution has «متفق عليه», «رواه البخاري» or «رواه مسلم», else tier 2
//   hasan   «حسن» or «حسّنه …» (including «حسن صحيح»), tier 3. A grade of several parts, all sound, takes its lowest
//           part's tier, before the attribution rule: «صحيح وحديث جابر حسن» is tier 3, not 1 (reply 0031-add14)
//   review  empty, a ruling on the chain («إسناده صحيح/حسن», «سنده», «الإسناد», «رجاله…»: reply 0031-add13), a mawquf
//           report («موقوف»), or nothing above
// data/hadith-grade-map.json, when present, decides a grade text exactly as written, before these rules (Talal's or
// the coordinator's decisions on the grade table, so nothing is classified by guess): `accepted` (a ruling on the
// chain, tier 3, the grade shown verbatim), `mawquf` (tier 3, `mawquf: true`: never introduced as the Prophet's
// words), `review`, or a class with tier «auto» (the attribution rule on a sahih grade). (reply 0031-add14)
// Outputs: hadith.jsonl (sahih and hasan), hadith_weak.jsonl (weak, mawdu, mixed; reply 0031-add9: «الضعيف ما ينحذف»,
// shown with a badge after the sahih, never the basis of an answer), hadith_excluded.json (review: not shown), and
// hadith_grades.json (every distinct grade text, its count and class: the table for the decision).
//
//   node scripts/ingest/hadeethenc-build.mjs
import fs from 'node:fs'
import path from 'node:path'
import { HADEETHENC_LANGS } from './lib/hadeethenc-langs.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')
const RAW = path.join(ROOT, 'data/raw/hadeethenc')
const OUT = path.join(ROOT, 'data/processed')
const MAP_FILE = path.join(ROOT, 'data/hadith-grade-map.json')
// The ten and, since reply 0033-add2 §2, the 21 other content languages; a language not fetched is skipped below.
const LANGS = HADEETHENC_LANGS

const strip = (s) => (s ?? '').replace(/[\u064B-\u0652\u0670\u0640]/g, '').trim()
export const WEAK = /ضعيف|موضوع|منكر|لا يصح/
const SAHIH = /صحيح|صححه/
const HASAN = /حسن|حسنه/
// A ruling on the chain or on its men, not on the hadith; and a report stopping at a Companion (mawquf): both stay
// for review until decided in the grade map (reply 0031-add13: «إسناده صحيح» and «إسناده حسن» are not classified).
const ISNAD = /[إا]سناده|سنده|الإسناد|بإسناد|رجاله/
const MAWQUF = /موقوف/
const BM = /متفق عليه|رواه البخاري|رواه مسلم/

/** { class, tier } for a grade and attribution; `map` holds decided grade texts (exact, as written). */
export function classify(gradeAr, attributionAr, map = {}) {
  const raw = (gradeAr ?? '').trim()
  const g = strip(raw)
  const a = strip(attributionAr)
  const m = map[raw]
  if (m) return { class: m.class, tier: m.tier === 'auto' ? (BM.test(a) ? '1' : '2') : m.tier, ...(m.mawquf ? { mawquf: true } : {}) }
  if (!g || ISNAD.test(g) || MAWQUF.test(g)) return { class: 'review', tier: 'X' }
  const weak = WEAK.test(g)
  const sound = SAHIH.test(g) || HASAN.test(g)
  if (weak && sound) return { class: 'mixed', tier: 'X' }
  if (weak) return { class: g.includes('موضوع') ? 'mawdu' : 'weak', tier: 'X' }
  if (HASAN.test(g)) return { class: 'hasan', tier: '3' }
  if (BM.test(a) && SAHIH.test(g)) return { class: 'sahih', tier: '1' }
  if (SAHIH.test(g)) return { class: 'sahih', tier: '2' }
  return { class: 'review', tier: 'X' }
}
/** The tier alone (kept for callers of reply 0031-add4). */
export const tierOf = (gradeAr, attributionAr) => classify(gradeAr, attributionAr).tier

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) build()

function build() {
  const manifest = JSON.parse(fs.readFileSync(path.join(RAW, 'MANIFEST.json'), 'utf8'))
  const map = fs.existsSync(MAP_FILE) ? JSON.parse(fs.readFileSync(MAP_FILE, 'utf8')).grades ?? {} : {}
  const kept = []
  const weak = []
  const excluded = []
  const grades = {}
  const counts = {}
  for (const lang of LANGS) {
    const dir = path.join(RAW, lang)
    if (!fs.existsSync(dir)) continue
    // A language whose fetch stopped or has not finished is left out whole (reply 0033-add2 §2), never in part.
    const done = manifest.languages?.[lang]
    if (!done?.completed_at || done.error) {
      console.warn(`${lang}: left out (${done?.error ?? 'its fetch has not finished'})`)
      continue
    }
    const c = (counts[lang] = { total: 0, 1: 0, 2: 0, 3: 0, X: 0, weak: 0, mawdu: 0, mixed: 0, review: 0 })
    for (const f of fs.readdirSync(dir).filter((x) => /^\d+\.json$/.test(x)).sort((a, b) => Number.parseInt(a) - Number.parseInt(b))) {
      const r = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))
      const gradeAr = lang === 'ar' ? r.grade : r.grade_ar
      const attributionAr = lang === 'ar' ? r.attribution : r.attribution_ar
      const { class: cls, tier, mawquf } = classify(gradeAr, attributionAr, map)
      c.total++
      c[tier]++
      if (lang === 'ar') {
        const k = (gradeAr ?? '').trim()
        grades[k] ??= { grade: k, count: 0, class: cls, tier, mapped: Boolean(map[k]), ...(mawquf ? { mawquf } : {}) }
        grades[k].count++
      }
      const rec = { lang, version: manifest.versions?.[lang]?.version ?? null, ...r, class: cls, tier, mawquf: Boolean(mawquf) }
      if (tier !== 'X') kept.push(rec)
      else if (cls === 'review') {
        c.review++
        excluded.push({ lang, id: r.id, title: r.title, grade_ar: gradeAr ?? null, attribution_ar: attributionAr ?? null })
      } else {
        c[cls === 'mixed' ? 'mixed' : cls === 'mawdu' ? 'mawdu' : 'weak']++
        weak.push(rec)
      }
    }
  }
  fs.writeFileSync(path.join(OUT, 'hadith.jsonl'), kept.map((r) => JSON.stringify(r)).join('\n') + '\n')
  fs.writeFileSync(path.join(OUT, 'hadith_weak.jsonl'), weak.map((r) => JSON.stringify(r)).join('\n') + (weak.length ? '\n' : ''))
  fs.writeFileSync(path.join(OUT, 'hadith_excluded.json'), JSON.stringify(excluded, null, 1))
  fs.writeFileSync(path.join(OUT, 'hadith_grades.json'), JSON.stringify(Object.values(grades).sort((x, y) => y.count - x.count), null, 1))
  console.log(JSON.stringify(counts, null, 1))
  console.log(`hadith.jsonl: ${kept.length} records; hadith_weak.jsonl: ${weak.length}; for review (empty or unclear grade): ${excluded.length}`)
}

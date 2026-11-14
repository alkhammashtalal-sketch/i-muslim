// The hadiths' block (0048-add8) from a run-retrieval JSON: per question with hadiths in its gold (or hadiths_ok), the
// block's candidates against them: R@5 (share of the gold hadiths among the candidates) and Hit@5; how often the block
// is offered at all; and, for the questions whose gold has no hadith, how often it is offered anyway.
//   node eval/score-block.mjs eval/reports/x.json [--split tune|validate|all]
import fs from 'node:fs'
const [file, ...rest] = process.argv.slice(2)
const split = rest.includes('--split') ? rest[rest.indexOf('--split') + 1] : 'all'
const j = JSON.parse(fs.readFileSync(file, 'utf8'))
const rows = (j.new ?? Object.values(j)[0]).filter((r) => split === 'all' || r.split === split)
const goldH = (r) => [...(r.gold ?? []), ...(r.hadiths_ok ?? [])].filter((g) => g.startsWith('hadith:'))
let n = 0, r5 = 0, hit = 0, offered = 0, noneQ = 0, offeredNone = 0
for (const r of rows) {
  const cand = (r.hadiths ?? []).map((x) => x.id).slice(0, 5)
  if (cand.length) offered++
  const g = goldH(r)
  if (!g.length) {
    noneQ++
    if (cand.length) offeredNone++
    continue
  }
  n++
  const found = g.filter((x) => cand.includes(x)).length
  r5 += found / g.length
  if (found) hit++
}
const pct = (x) => `${(100 * x).toFixed(1)}%`
console.log(JSON.stringify({ split, questions: rows.length, withHadithGold: n, R5: n ? pct(r5 / n) : '—', Hit5: n ? pct(hit / n) : '—', offered: `${offered}/${rows.length}`, offeredWithoutHadithGold: `${offeredNone}/${noneQ}` }))

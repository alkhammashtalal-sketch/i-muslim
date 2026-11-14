// Reply 0056 ب6: the offline search by words, measured before it opens. The rule, fixed before the run: in this order
// of sets (questions, fresh-0048, fresh-0049, gold-extended, welcome-retrieval), the first 10 Arabic and the first 10
// English questions with a Quran gold whose words share one with a gold ayah (its Arabic text for an Arabic question,
// Sahih International for an English one, as terms() sees them). Asked: a gold ayah among the five best ayat, in 15 of
// the 20 at least. The corpus is the app's own copy (web/ios/App/App/public/offline, from `npm run build:native` and
// `cap sync`), the adhkar and «أذكار المواقف» with it, as on the device.
//   cd web && npx vite-node ../eval/offline-search-0056.ts
import fs from 'node:fs'
import path from 'node:path'
import { buildIndex, loadCorpus, searchIndex } from '../web/src/offline-search/search'

const ROOT = path.resolve(import.meta.dirname, '..')
const OFF = path.join(ROOT, 'web/ios/App/App/public/offline')
const bundle = async (rel: string) => {
  const f = path.join(OFF, rel)
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null
}
const manifest = JSON.parse((await bundle('manifest.json'))!)
const { docs } = await loadCorpus({ bundle, adhkarCategories: manifest.adhkar.categories })
const ms = buildIndex(docs, process.env.W ? JSON.parse(process.env.W) : undefined)
const byId = new Map(docs.map((d) => [d.id, d]))

type Q = { id: string; lang: string; q: string; gold?: string[] }
const SETS = ['questions', 'fresh-0048', 'fresh-0049', 'gold-extended', 'welcome-retrieval']
// The two sets, frozen by their ids as the rule above first chose them (the rule read the search"s own words, which
// may change with the search; the questions must not): the 20 measured, and 20 others to tune on (TUNE=1).
const MEASURED = ["questions/q001", "questions/q005", "questions/q014", "questions/q015", "questions/q017", "questions/q018", "questions/q021", "questions/q022", "questions/q023", "questions/q024", "questions/q055", "fresh-0048/fresh-01", "fresh-0048/fresh-02", "fresh-0048/fresh-04", "fresh-0048/fresh-05", "fresh-0048/fresh-06", "fresh-0048/fresh-08", "fresh-0048/fresh-15", "fresh-0048/fresh-16", "fresh-0048/fresh-18"]
const TUNING = ["questions/q032", "questions/q033", "questions/q035", "fresh-0048/fresh-21", "fresh-0048/fresh-23", "fresh-0048/fresh-27", "fresh-0048/fresh-28", "fresh-0048/fresh-30", "fresh-0049/fresh49-05", "fresh-0049/fresh49-07", "fresh-0048/fresh-19", "fresh-0049/fresh49-13", "fresh-0049/fresh49-14", "fresh-0049/fresh49-15", "fresh-0049/fresh49-18", "fresh-0049/fresh49-19", "fresh-0049/fresh49-22", "fresh-0049/fresh49-24", "welcome-retrieval/ws-islam-en", "welcome-retrieval/ws-create-en"]
const TUNE = !!process.env.TUNE
const want = TUNE ? TUNING : MEASURED
const all = new Map<string, Q & { set: string }>()
for (const set of SETS)
  for (const line of fs.readFileSync(path.join(ROOT, `eval/${set}.v1.jsonl`), "utf8").split('\n')) {
    if (!line.trim()) continue
    const q = JSON.parse(line) as Q
    all.set(`${set}/${q.id}`, { ...q, set })
  }
const picked: Record<string, (Q & { set: string })[]> = { ar: [], en: [] }
for (const k of want) {
  const q = all.get(k)!
  picked[q.lang].push(q)
}

const rows: string[] = []
let hits = 0
for (const lang of ['ar', 'en']) {
  for (const q of picked[lang]) {
    const top = searchIndex(ms, q.q, 50).filter((r) => r.kind === 'ayah').slice(0, 5)
    const gold = (q.gold ?? []).filter((g) => g.startsWith('quran:'))
    const ok = top.some((r) => gold.includes(r.id))
    if (ok) hits++
    rows.push(`| ${q.set} ${q.id} | ${lang} | ${q.q} | ${gold.join(' ')} | ${top.map((r) => r.id.replace('quran:', '')).join(' ')} | ${ok ? '✓' : '✗'} |`)
  }
}
const n = picked.ar.length + picked.en.length
const out = [
  '# 0056 ب6: the offline search by words, before it opens',
  '',
  `Corpus: ${docs.length} rows (${docs.filter((d) => d.kind === 'ayah').length} ayat, ${docs.filter((d) => d.kind === 'dhikr').length} adhkar, ${docs.filter((d) => d.kind === 'mawaqif').length} of «أذكار المواقف»).`,
  '',
  '| question | lang | text | gold | five best ayat | gold in five |',
  '| --- | --- | --- | --- | --- | --- |',
  ...rows,
  '',
  `**A gold ayah among the five best: ${hits} of ${n}** (asked: 15 of 20 at least).`,
]
fs.mkdirSync(path.join(ROOT, 'eval/reports'), { recursive: true })
if (!TUNE) fs.writeFileSync(path.join(ROOT, 'eval/reports/offline-search-0056.md'), `${out.join('\n')}\n`)
else console.log(rows.join('\n'))
console.log(out.slice(-1)[0], `(${picked.ar.length} ar, ${picked.en.length} en)`)

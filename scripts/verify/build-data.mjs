// Data for the /verify page (command 17, for the judges): the twelve official cases of the challenge's scientific
// package, the app's answer to each and its result, and the comparison with the general model, from eval/reports/.
//
//   node scripts/verify/build-data.mjs [--report eval/reports/official12-….json] [--final] [--out file.json]
//
// Without --report: the newest live official12 report, else the newest mock one (the page then shows «بيانات تجريبية»).
// --final refuses a mock report (exit 1): the published page must show the live measurement. With several live runs
// (one per model setting), pass the chosen setting's report with --report.
// The comparison: the newest date's compare-general-<date>[-tag].json files (up to three runs), or none yet.
// Only reports committed to git are read (the page links to them on GitHub); --report may name another for a trial,
// but --final needs it committed.
// Output: web/src/verify/data.json (read at build time). Case texts are copied from eval/official12.v1.jsonl as the
// reviewer wrote them; the app's quoted texts are not copied (the page links to them by id).
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const REPORTS = path.join(ROOT, 'eval/reports')
const REPO = 'https://github.com/alkhammashtalal-sketch/i-muslim'
const args = process.argv.slice(2)
const opt = (k) => {
  const i = args.indexOf(`--${k}`)
  return i >= 0 ? args[i + 1] : undefined
}
const FINAL = args.includes('--final')
const fail = (msg) => {
  console.error(`build-data: ${msg}`)
  process.exit(1)
}

const tracked = new Set(
  execFileSync('git', ['ls-files', 'eval/reports'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .map((f) => path.basename(f)),
)
const committed = (f) => tracked.has(f) && tracked.has(f.replace(/\.json$/, '.md'))

// 1. The official12 report.
const all = fs.readdirSync(REPORTS).filter((f) => /^official12-\d{4}-\d{2}-\d{2}.*\.json$/.test(f) && committed(f))
const isMock = (f) => /-mock(\b|-|\.)/.test(f) || fs.readFileSync(path.join(REPORTS, f.replace(/\.json$/, '.md')), 'utf8').split('\n', 1)[0].includes('وضع المحاكاة')
const newest = (files) => files.sort((a, b) => fs.statSync(path.join(REPORTS, b)).mtimeMs - fs.statSync(path.join(REPORTS, a)).mtimeMs)[0]
const chosen = opt('report') ? path.basename(opt('report')) : (newest(all.filter((f) => !isMock(f))) ?? newest(all))
if (!chosen || !fs.existsSync(path.join(REPORTS, chosen))) fail(`no official12 report in eval/reports/ (${opt('report') ?? 'none found'})`)
const mock = isMock(chosen)
if (FINAL && !committed(chosen)) fail(`--final with ${chosen}, which is not committed (its link on GitHub would not open). Commit it first.`)
if (!committed(chosen)) console.warn(`note: ${chosen} is not committed; a trial only`)
if (FINAL && mock) fail(`--final with a mock report (${chosen}). Run eval/run-answers.mjs --set official12 against the live model first.`)

const md = fs.readFileSync(path.join(REPORTS, chosen.replace(/\.json$/, '.md')), 'utf8')
const mode = md.match(/والنموذج في وضع `([^`]+)`/)?.[1] ?? (mock ? 'mock' : null)
const settings = md.match(/بالإعداد `([^`]+)`/)?.[1] ?? null
const llm = JSON.parse(fs.readFileSync(path.join(ROOT, 'worker/src/config/llm.json'), 'utf8'))
const report = JSON.parse(fs.readFileSync(path.join(REPORTS, chosen), 'utf8'))
const source = new Map(
  fs
    .readFileSync(path.join(ROOT, 'eval/official12.v1.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l))
    .map((c) => [c.id, c]),
)
const RESULT = { ناجح: 'pass', راسب: 'fail', يدوي: 'manual' }
const cases = report.map((r) => {
  const c = source.get(r.id)
  if (!c) fail(`${r.id} is not in eval/official12.v1.jsonl`)
  const result = RESULT[r.auto]
  if (!result) fail(`${r.id}: unknown result «${r.auto}»`)
  return {
    id: r.id,
    package_case: c.package_case,
    q: c.q,
    lang: c.lang,
    expected: c.expected,
    manual: c.manual ?? null,
    type: r.type,
    level: r.level ?? null,
    disputed: !!r.disputed,
    quotes: (r.quotes ?? []).map((q) => ({ id: q.id, kind: q.kind, ref: q.ref })),
    checks: (r.checks ?? []).map((x) => ({ name: x.name, result: RESULT[x.result] ?? 'manual' })),
    result,
  }
})
if (cases.length !== 12) console.warn(`note: ${cases.length} cases (the package has 12)`)

// 2. The comparison with the general model (three runs of eval/compare-general.mjs).
const cmpFiles = fs.readdirSync(REPORTS).filter((f) => /^compare-general-\d{4}-\d{2}-\d{2}.*\.json$/.test(f) && committed(f))
const cmpDate = cmpFiles.map((f) => f.slice(16, 26)).sort().at(-1)
const runs = cmpFiles
  .filter((f) => f.slice(16, 26) === cmpDate)
  .sort()
  .slice(0, 3)
  .map((f) => {
    const rows = JSON.parse(fs.readFileSync(path.join(REPORTS, f), 'utf8'))
    const ok = rows.filter((r) => !r.general.error)
    const sum = (xs, g) => xs.reduce((n, r) => n + g(r), 0)
    const quotes = sum(rows, (r) => r.ours.quotes.length)
    return {
      file: f,
      n: rows.length,
      cites: { general: [ok.filter((r) => r.general.citesReference).length, ok.length], ours: [rows.filter((r) => r.ours.quotes.length).length, rows.length] },
      refsInSources: {
        general: [sum(ok, (r) => r.general.quranRefsInSources.length), sum(ok, (r) => r.general.quranRefs.length)],
        ours: [quotes, quotes],
      },
      // Quoted spans followed by a Quran reference whose text differs from the ayah in D1, of those judged.
      misattributed: {
        general: [sum(ok, (r) => r.general.misattributed.length), sum(ok, (r) => r.general.quotesJudged ?? 0)],
        ours: [rows.filter((r) => !r.ours.textMatchesD1).length, quotes],
      },
      // Hadith references cannot be checked against our fixed sources (no hadith ingested).
      hadithRefs: { general: sum(ok, (r) => r.general.hadithRefs.length) },
      verified: { ours: [rows.filter((r) => r.ours.verified).length, rows.length] },
    }
  })
if (FINAL && runs.length < 3) console.warn(`note: ${runs.length} comparison run(s) found; the page shows what exists`)

// The model's readable name for the page (the id stays in data.model and in the report).
const label = (id) => {
  const m = id?.match(/deepseek-v4-(flash|pro)/i)
  return m ? `DeepSeek V4 ${m[1][0].toUpperCase()}${m[1].slice(1)}` : id
}
// In Arabic, with no Latin letters inside the Arabic line (CLAUDE.md §8).
const labelAr = (id) => {
  const m = id?.match(/deepseek-v4-(flash|pro)/i)
  return m ? `ديب سيك، الإصدار الرابع (${m[1].toLowerCase() === 'pro' ? 'برو' : 'فلاش'})` : null
}
const blob = (f) => `${REPO}/blob/main/eval/reports/${f}`
// The run's own setting names the model when it overrides the default (eval/run-answers.mjs --llm, command 15).
const model = mock ? null : (() => { try { return JSON.parse(settings ?? '{}').model === 'pro' ? llm.altModel : llm.model } catch { return llm.model } })()
const date = chosen.match(/\d{4}-\d{2}-\d{2}/)[0]
const data = {
  about: 'Generated by scripts/verify/build-data.mjs from eval/reports/. Do not edit by hand.',
  mock,
  date,
  model,
  modelLabel: label(model),
  modelLabelAr: labelAr(model),
  mode,
  settings,
  report: { file: chosen, url: blob(chosen.replace(/\.json$/, '.md')) },
  cases,
  compare: runs.length ? { date: cmpDate, runs } : null,
  reports: [
    { file: chosen.replace(/\.json$/, '.md'), url: blob(chosen.replace(/\.json$/, '.md')) },
    ...runs.map((r) => ({ file: r.file.replace(/\.json$/, '.md'), url: blob(r.file.replace(/\.json$/, '.md')) })),
    { file: 'eval/official12.v1.jsonl', url: `${REPO}/blob/main/eval/official12.v1.jsonl` },
  ],
}
const out = opt('out') ? path.resolve(opt('out')) : path.join(ROOT, 'web/src/verify/data.json')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, JSON.stringify(data, null, 1) + '\n')
const tally = cases.reduce((t, c) => ({ ...t, [c.result]: (t[c.result] ?? 0) + 1 }), {})
console.log(`${path.relative(ROOT, out)}: ${cases.length} cases from ${chosen}${mock ? ' (MOCK: the page shows «بيانات تجريبية»)' : ''}; pass ${tally.pass ?? 0}, fail ${tally.fail ?? 0}, manual ${tally.manual ?? 0}; comparison runs: ${runs.length}`)

// The hadiths' block in the answers (0048-add8), on a preview of next with the admin routes open: each question of a
// set with «أحاديث مقبولة» (hadiths_ok) asked through POST /api/ask with the hadiths on for these requests only; the
// block's offered and kept ids (the eval field), against the column. Precision: the kept that are in the column;
// recall: the questions whose column is not empty with at least one kept from it; the empty columns: nothing kept.
// Every kept hadith outside its column is written with its text, for the coordinator's yes or no.
//   WORKER_URL=… ADMIN_TOKEN=… node eval/run-block.mjs [--set eval/fresh-0049.v1.jsonl] [--llm '{"model":"flash"}'] [--out eval/reports/block-<date>]
import fs from 'node:fs'
import path from 'node:path'
const ROOT = path.resolve(import.meta.dirname, '..')
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => (x.startsWith('--') ? [...a, [x.slice(2), all[i + 1]]] : a), []))
const { WORKER_URL, ADMIN_TOKEN } = process.env
if (!WORKER_URL || !ADMIN_TOKEN) throw new Error('WORKER_URL and ADMIN_TOKEN are needed')
const set = args.set ?? 'eval/fresh-0049.v1.jsonl'
const qs = fs.readFileSync(path.join(ROOT, set), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
const date = new Date().toISOString().slice(0, 10)
const rows = []
for (const q of qs) {
  const res = await fetch(`${WORKER_URL}/api/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${ADMIN_TOKEN}` },
    body: JSON.stringify({ q: q.q, lang: q.lang, hadith: true, ...(args.llm ? { llm: JSON.parse(args.llm) } : {}) }),
  })
  const b = await res.json().catch(() => ({ type: 'error' }))
  const kept = b.eval?.block?.kept ?? []
  const offered = b.eval?.block?.offered ?? []
  const shown = (b.quotes ?? []).filter((x) => x.block).map((x) => x.id)
  const texts = Object.fromEntries((b.quotes ?? []).filter((x) => x.block).map((x) => [x.id, x.text]))
  rows.push({ id: q.id, lang: q.lang, q: q.q, type: b.type, ok: q.hadiths_ok ?? [], offered, kept, shown, outside: shown.filter((x) => !(q.hadiths_ok ?? []).includes(x)).map((x) => ({ id: x, text: texts[x] })), passages: (b.quotes ?? []).filter((x) => !x.block).map((x) => x.id) })
  process.stdout.write('.')
}
const shownAll = rows.flatMap((r) => r.shown.map((x) => ({ r, x })))
const precise = shownAll.filter(({ r, x }) => r.ok.includes(x)).length
const withCol = rows.filter((r) => r.ok.length)
const recalled = withCol.filter((r) => r.shown.some((x) => r.ok.includes(x))).length
const empty = rows.filter((r) => !r.ok.length)
const emptyClean = empty.filter((r) => !r.shown.length).length
const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : '—')
const L = [
  `# كتلة الأحاديث في الإجابات — ${date}`,
  '',
  `أنشأه \`eval/run-block.mjs\` على ${WORKER_URL}، المجموعة \`${set}\` (${rows.length} سؤالًا)، والمفتاح مفعّل لهذه الطلبات.`,
  '',
  `- **الدقة:** ${precise} من ${shownAll.length} حديثًا معروضًا في عمود «أحاديث مقبولة» (${pct(precise, shownAll.length)}).`,
  `- **الاستدعاء:** حديث مقبول واحد على الأقل في ${recalled} من ${withCol.length} سؤالًا عمودها غير فارغ (${pct(recalled, withCol.length)}).`,
  `- **أسئلة القرآن والعقيدة (العمود فارغ):** بلا حديث في ${emptyClean} من ${empty.length}.`,
  '',
  '| السؤال | النوع | المعروض | خارج العمود |',
  '| --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.id} ${r.q} | ${r.type} | ${r.shown.join('، ') || '—'} | ${r.outside.map((o) => o.id).join('، ') || '—'} |`),
  '',
  '## ما ظهر خارج العمود، بنصه',
  ...rows.flatMap((r) => r.outside.map((o) => `- **${r.id}** (${r.q}) ← ${o.id}: «${o.text}»`)),
]
const out = args.out ?? `eval/reports/block-${date}`
fs.writeFileSync(path.join(ROOT, `${out}.md`), L.join('\n') + '\n')
fs.writeFileSync(path.join(ROOT, `${out}.json`), JSON.stringify(rows, null, 1))
console.log(`\nwritten ${out}.md / .json`)

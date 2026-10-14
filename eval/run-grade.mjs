// «هل حديث كذا صحيح؟» (reply 0048; CLAUDE.md §9): the grade cases of eval/hadith-retrieval.v1.jsonl (expected
// "grade" with the HadeethEnc hadith in gold, or a referral), through POST /api/ask, with the hadiths on or off for
// these requests only (the admin routes open, with the token). No model is called on the grade path.
//   WORKER_URL=… ADMIN_TOKEN=… node eval/run-grade.mjs [--grade true|false] [--hadith true|false] [--out eval/reports/grade-<date>]
// --grade: the grade path's own switch (0048-add7, HADITH_GRADE); --hadith: the hadiths in the answers (HADITH_RETRIEVAL).
// Either given alone sends only it; neither: --grade true.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []))
const grade = args.grade !== undefined ? args.grade === 'true' : args.hadith === undefined ? true : undefined
const hadith = args.hadith !== undefined ? args.hadith === 'true' : undefined
const on = grade ?? hadith ?? true
const { WORKER_URL, ADMIN_TOKEN } = process.env
if (!WORKER_URL || !ADMIN_TOKEN) {
  console.error('Set WORKER_URL and ADMIN_TOKEN in the environment (never in a committed file).')
  process.exit(1)
}
const cases = fs
  .readFileSync(path.join(ROOT, 'eval/hadith-retrieval.v1.jsonl'), 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))
  .filter((q) => q.topic === 'درجة حديث' || q.topic === 'حكم حديث')

const rows = []
for (const c of cases) {
  const res = await fetch(`${WORKER_URL.replace(/\/$/, '')}/api/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${ADMIN_TOKEN}` },
    body: JSON.stringify({ q: c.q, lang: c.lang, ...(grade !== undefined ? { grade } : {}), ...(hadith !== undefined ? { hadith } : {}) }),
  })
  const body = await res.json().catch(() => ({ type: 'error' }))
  const got = body.type
  const id = body.hadith?.id ? `hadith:${body.hadith.id}` : null
  const ok =
    c.expected_behavior === 'grade'
      ? got === 'grade' && c.gold.includes(id)
      : got === 'referral' || (c.expected_behavior === 'refer_or_abstain' && got === 'abstain')
  rows.push({ id: c.id, q: c.q, expected: c.expected_behavior, gold: c.gold, got, hadith: id, message: body.message ?? null, ok })
}
const date = new Date().toISOString().slice(0, 10)
const out = args.out ?? `eval/reports/grade-${date}${on ? '' : '-before'}`
const L = [
  `# حالات الدرجة — ${date} (${on ? 'المفتاح مفعّل لهذه الطلبات' : 'المفتاح مطفأ: كما اليوم'})`,
  '',
  `أنشأه \`eval/run-grade.mjs\`. ${rows.filter((r) => r.ok).length} من ${rows.length} كما يُنتظر.`,
  '',
  '| الحالة | السؤال | المنتظر | الرد | الحديث | السطر | النتيجة |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((r) => `| ${r.id} | ${r.q} | ${r.expected}${r.gold.length ? ` (${r.gold.join('، ')})` : ''} | ${r.got} | ${r.hadith ?? '—'} | ${r.message ?? '—'} | ${r.ok ? 'ناجح' : 'راسب'} |`),
  '',
]
fs.writeFileSync(path.join(ROOT, `${out}.md`), L.join('\n'))
fs.writeFileSync(path.join(ROOT, `${out}.json`), JSON.stringify(rows, null, 1))
console.log(L.join('\n'))

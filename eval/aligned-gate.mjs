// An automatic gate for the aligned translations of al-Muyassar, measured on the 402 judged items (reply 0031-add4,
// part B). Two signals, with our own tools only:
//   1. bge-m3 similarity between each Arabic sentence and its translated sentence; the item's score is its lowest.
//   2. the item translated back into Arabic (same model and settings as eval/explain-aligned.mjs, temperature 0), then
//      bge-m3 similarity between each back-translated sentence and its Arabic source; the item's score is its lowest.
//      A back-translation with a different number of sentences scores 0 (it cannot be aligned).
// Runs against the evaluation Worker in eval/gate/ (`wrangler dev --remote`, never deployed): one model call per
// item (402, under the cap of 450), one every PACE_MS (Workers AI allows 20 a minute for the whole account).
// Resumable: back-translations already in eval/reports/aligned-gate/back.jsonl are kept.
//
//   npx wrangler dev --remote -c eval/gate/wrangler.jsonc --port 8795 &
//   GATE_URL=http://localhost:8795 node eval/aligned-gate.mjs
//
// Writes eval/reports/aligned-gate/{back.jsonl,scores.json,REPORT.md}.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const GATE = (process.env.GATE_URL ?? 'http://localhost:8795').replace(/\/$/, '')
const PACE_MS = Number(process.env.PACE_MS ?? 4000)
const MAX_CALLS = 450
const OUT = path.join(ROOT, 'eval/reports/aligned-gate')
fs.mkdirSync(OUT, { recursive: true })
const LANG_NAMES = { en: 'English', ur: 'Urdu', id: 'Indonesian', ms: 'Malay', tr: 'Turkish', fr: 'French', es: 'Spanish', bn: 'Bengali', hi: 'Hindi' }

// The judged items and their verdicts.
const rows = fs
  .readFileSync(path.join(ROOT, 'eval/reports/explain-aligned-2026-10-06.jsonl'), 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))
  .filter((r) => !r.rejected)
const verdict = new Map()
const REV = path.join(ROOT, 'eval/reports/explain-aligned-review')
for (const f of fs.readdirSync(REV).filter((x) => /^[a-z]{2}\.json$/.test(x))) {
  const j = JSON.parse(fs.readFileSync(path.join(REV, f), 'utf8'))
  for (const id of j.pass_ids ?? []) verdict.set(`${id}|${j.lang}`, { pass: true })
  for (const x of j.fail ?? []) verdict.set(`${x.id}|${j.lang}`, { pass: false, reason: x.reason })
}
const items = rows.filter((r) => verdict.has(`${r.id}|${r.lang}`)).map((r) => ({ ...r, key: `${r.id}|${r.lang}`, ...verdict.get(`${r.id}|${r.lang}`) }))
console.log(`${items.length} judged items: ${items.filter((i) => i.pass).length} pass, ${items.filter((i) => !i.pass).length} fail`)

const post = async (p, body) => {
  const r = await fetch(`${GATE}${p}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  return r.json()
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Signal 2, step 1: the back-translations (the only model calls).
const BACK = path.join(OUT, 'back.jsonl')
const back = new Map(
  (fs.existsSync(BACK) ? fs.readFileSync(BACK, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []).map((b) => [b.key, b]),
)
let calls = 0
for (const it of items) {
  if (back.has(it.key) && back.get(it.key).sentences) continue
  let row
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (calls >= MAX_CALLS) throw new Error(`cap of ${MAX_CALLS} model calls reached`)
    const t0 = Date.now()
    calls++
    const r = await post('/back', { sentences: it.sentences, langName: LANG_NAMES[it.lang] }).catch((e) => ({ error: String(e) }))
    let sentences = null
    try {
      sentences = JSON.parse(r.content).sentences ?? null
    } catch {}
    row = { key: it.key, sentences, usage: r.usage ?? null, error: r.error ?? (sentences ? null : 'unreadable'), attempts: attempt }
    await sleep(Math.max(0, PACE_MS - (Date.now() - t0)))
    if (sentences) break
  }
  back.set(it.key, row)
  fs.appendFileSync(BACK, JSON.stringify(row) + '\n')
  console.log(`${back.size}/${items.length} ${it.key} ${row.error ?? 'ok'}`)
}

// bge-m3 vectors for every distinct text, in batches.
const texts = new Set()
for (const it of items) {
  it.source_sentences.forEach((s) => texts.add(s))
  it.sentences.forEach((s) => texts.add(s))
  ;(back.get(it.key)?.sentences ?? []).forEach((s) => texts.add(s))
}
const vec = new Map()
const all = [...texts]
let embedCalls = 0
for (let i = 0; i < all.length; i += 50) {
  const batch = all.slice(i, i + 50)
  const r = await post('/embed', { texts: batch })
  embedCalls++
  if (!r.vectors || r.vectors.length !== batch.length) throw new Error(`embedding failed at ${i}`)
  batch.forEach((t, j) => vec.set(t, r.vectors[j]))
}
const cos = (a, b) => {
  let d = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) (d += a[i] * b[i]), (na += a[i] * a[i]), (nb += b[i] * b[i])
  return d / Math.sqrt(na * nb)
}
const minPair = (xs, ys) => (xs.length !== ys.length ? 0 : Math.min(...xs.map((x, i) => cos(vec.get(x), vec.get(ys[i])))))

const scored = items.map((it) => {
  const b = back.get(it.key)?.sentences ?? []
  return { key: it.key, pass: it.pass, reason: it.reason ?? null, s1: minPair(it.source_sentences, it.sentences), s2: minPair(it.source_sentences, b), backCountMismatch: b.length !== it.source_sentences.length }
})
fs.writeFileSync(path.join(OUT, 'scores.json'), JSON.stringify(scored, null, 1))

// Thresholds: an item is held when its score is below the threshold.
const fails = scored.filter((s) => !s.pass)
const passes = scored.filter((s) => s.pass)
const q = (xs, p) => [...xs].sort((a, b) => a - b)[Math.floor(p * (xs.length - 1))]
const T = [0.5, 0.55, 0.6, 0.65, 0.7, 0.72, 0.75, 0.78, 0.8, 0.82, 0.85, 0.88, 0.9]
const line = (name, held) => `| ${name} | ${fails.filter(held).length} / ${fails.length} | ${passes.filter(held).length} / ${passes.length} |`
const usage = [...back.values()].reduce((a, b) => ({ in: a.in + (b.usage?.prompt_tokens ?? 0), out: a.out + (b.usage?.completion_tokens ?? 0), neurons: a.neurons + (b.usage?.neurons ?? 0) }), { in: 0, out: 0, neurons: 0 })
const md = [
  '# بوابة آلية للترجمات المحاذاة: قياس على البنود المحكوم عليها (الملحق 0031-add4، الجزء ب)',
  '',
  `البنود: ${scored.length} (ناجحة ${passes.length}، فاشلة ${fails.length}). البند يُمسك حين تقل درجته عن العتبة.`,
  '',
  `توزيع الدرجات: الإشارة 1 في الفاشلة وسيطها ${q(fails.map((s) => s.s1), 0.5).toFixed(3)} وفي الناجحة ${q(passes.map((s) => s.s1), 0.5).toFixed(3)}؛ الإشارة 2 في الفاشلة ${q(fails.map((s) => s.s2), 0.5).toFixed(3)} وفي الناجحة ${q(passes.map((s) => s.s2), 0.5).toFixed(3)}.`,
  '',
  '## الإشارة 1: تشابه bge-m3 بين الجملة العربية وترجمتها',
  '',
  '| العتبة | الفاشلة الممسوكة | الناجحة المرفوضة خطأً |',
  '| --- | --- | --- |',
  ...T.map((t) => line(t.toFixed(2), (s) => s.s1 < t)),
  '',
  '## الإشارة 2: الترجمة العكسية ثم تشابه bge-m3 مع الأصل العربي',
  '',
  '| العتبة | الفاشلة الممسوكة | الناجحة المرفوضة خطأً |',
  '| --- | --- | --- |',
  ...T.map((t) => line(t.toFixed(2), (s) => s.s2 < t)),
  '',
  '## الإشارتان معًا (يُمسك البند إذا قلّت أي منهما عن عتبتها)',
  '',
  '| العتبتان (1، 2) | الفاشلة الممسوكة | الناجحة المرفوضة خطأً |',
  '| --- | --- | --- |',
  ...T.flatMap((a) => T.filter((b) => Math.abs(a - b) < 0.06).map((b) => line(`${a.toFixed(2)}، ${b.toFixed(2)}`, (s) => s.s1 < a || s.s2 < b))),
  '',
  '## كل البنود الفاشلة ودرجاتها',
  '',
  '| البند | الإشارة 1 | الإشارة 2 | سبب الفشل كما في حكم المراجع |',
  '| --- | --- | --- | --- |',
  ...fails.sort((a, b) => a.s2 - b.s2).map((s) => `| ${s.key} | ${s.s1.toFixed(3)} | ${s.s2.toFixed(3)}${s.backCountMismatch ? ' (عدد الجمل اختلف)' : ''} | ${s.reason.replace(/\|/g, '/').replace(/\s+/g, ' ')} |`),
  '',
  '## التكلفة',
  '',
  `نداءات النموذج في هذا التشغيل: ${calls} (والمحفوظة من قبل ${back.size - calls >= 0 ? back.size - calls : 0})؛ مجموع الرموز في كل الترجمات العكسية: مدخلات ${usage.in}، مخرجات ${usage.out}، ونيورونات ${usage.neurons.toFixed(0)} كما أعادها Workers AI (≈ $${(usage.neurons * 0.011 / 1000).toFixed(3)} بسعر ما فوق الحصة المجانية). نداءات التضمين: ${embedCalls} (${all.length} نصًا).`,
  '',
]
fs.writeFileSync(path.join(OUT, 'REPORT.md'), md.join('\n'))
console.log(md.join('\n'))

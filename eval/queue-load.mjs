// The queue's load test (add-on 0071-add3 §1, add-on 0071-add4 §5; worker/src/queue.ts): N questions that each need the
// model, sent in one minute, one every 60/N seconds, none waiting for another. Then each is asked for by its id until its
// answer comes. Recorded: every reply to the request (no refusal may come: no 'error'), the order on the server (each
// question's turn started and ended in the order it came, from GET /api/admin/queue), every answer arrived, and the time
// of the last one. Between 1 and 5 in the morning, Riyadh time, only (add-on 0071-add2 §6).
//   WORKER_URL=https://i-muslim-v11.… ADMIN_TOKEN=… node eval/queue-load.mjs --n 60 --rate 15 --tag night
// --rate sets the queue's window for the test (the admin route) and puts back the one it found after.
// The questions: eval/basic-60.json's, those expecting an answer first, each once, through the evaluation runner's path
// (the token: no per-device limit, and `llm: {}`, so none is answered from the cache), with combination B.
import fs from 'node:fs'
import path from 'node:path'

const argv = process.argv.slice(2)
const args = Object.fromEntries(argv.reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []))
const base = process.env.WORKER_URL
const ADMIN_TOKEN = process.env.ADMIN_TOKEN
if (!base || !ADMIN_TOKEN) throw new Error('WORKER_URL and ADMIN_TOKEN')
if (/i-muslim\.|i-muslim-next\./.test(base)) throw new Error('v11 only')
const N = Number(args.n ?? 60)
const SECONDS = Number(args.seconds ?? 60)
const FIXES = (args.fixes ?? 'level,hadith-answer,grade-tr,phrase,understand').split(',').filter(Boolean)
const tag = args.tag ?? 'load'
const auth = { authorization: `Bearer ${ADMIN_TOKEN}` }
const here = path.dirname(new URL(import.meta.url).pathname)

const set = JSON.parse(fs.readFileSync(path.join(here, 'basic-60.json'), 'utf8'))
const items = set.questions.slice().sort((a, b) => (a.expect === 'answer' ? 0 : 1) - (b.expect === 'answer' ? 0 : 1))
const seen = new Set()
const questions = items.filter((it) => !seen.has(it.q) && seen.add(it.q)).slice(0, N)
if (questions.length < N) throw new Error(`only ${questions.length} distinct questions`)

const admin = (method, body) =>
  fetch(`${base}/api/admin/queue${method === 'GET' ? `?since=${body}` : ''}`, {
    method,
    headers: { ...auth, 'content-type': 'application/json' },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  }).then((r) => r.json())

const before = await admin('GET', Date.now())
const rateBefore = before.rate
if (args.rate) console.log('rate', await admin('POST', { rate: Number(args.rate) }))
const t0 = Date.now()
const sent = await Promise.all(
  questions.map(
    (it, i) =>
      new Promise((resolve) =>
        setTimeout(async () => {
          const at = Date.now()
          const r = await fetch(`${base}/api/ask`, {
            method: 'POST',
            headers: { ...auth, 'content-type': 'application/json' },
            body: JSON.stringify({ q: it.q, lang: it.lang, canWait: true, hadith: true, fixes: FIXES, llm: {} }),
          })
            .then(async (x) => ({ status: x.status, body: await x.json().catch(() => null) }))
            .catch((e) => ({ status: 0, body: null, error: String(e) }))
          resolve({ i, id: it.id, lang: it.lang, at, status: r.status, type: r.body?.type ?? null, code: r.body?.code ?? null, job: r.body?.type === 'pending' ? r.body.id : null })
        }, Math.round((i * SECONDS * 1000) / N)),
      ),
  ),
)
const lastSent = Math.max(...sent.map((s) => s.at))
console.log(`sent ${sent.length} in ${((lastSent - t0) / 1000).toFixed(1)} s; pending ${sent.filter((s) => s.job).length}; at once ${sent.filter((s) => !s.job).length}`)

async function settle(s) {
  if (!s.job) return { ...s, doneAt: s.at, final: s.type }
  for (let fails = 0; ; ) {
    const r = await fetch(`${base}/api/ask/job/${s.job}?wait=20000`, { cache: 'no-store' })
      .then(async (x) => ({ status: x.status, body: await x.json().catch(() => null) }))
      .catch(() => null)
    if (r?.body?.type && r.body.type !== 'pending') return { ...s, doneAt: Date.now(), final: r.body.type, finalStatus: r.status, finalCode: r.body.code ?? null }
    if (!r) await new Promise((ok) => setTimeout(ok, Math.min(1000 * 2 ** fails++, 15_000)))
  }
}
const done = await Promise.all(sent.map(settle))
const stats = await admin('GET', t0 - 1000)
if (args.rate && rateBefore) console.log('rate back', await admin('POST', { rate: rateBefore }))

// The order on the server: the turns of this test by their seq (the order they came), with their start and end.
const turns = (stats.done ?? []).filter((d) => d.created_at >= t0 - 1000)
const startsInOrder = turns.every((d, i) => i === 0 || d.started_at >= turns[i - 1].started_at)
const endsInOrder = turns.every((d, i) => i === 0 || d.done_at >= turns[i - 1].done_at)
const refused = done.filter((d) => d.type === 'error' || d.final === 'error')
const last = Math.max(...done.map((d) => d.doneAt))
const summary = {
  tag,
  base,
  at: new Date(t0).toISOString(),
  n: N,
  rate: args.rate ? Number(args.rate) : rateBefore,
  fixes: FIXES,
  sentInSeconds: (lastSent - t0) / 1000,
  pending: sent.filter((s) => s.job).length,
  answeredAtOnce: sent.filter((s) => !s.job).length,
  refused: refused.map((d) => ({ i: d.i, type: d.type, code: d.code ?? d.finalCode, status: d.finalStatus ?? d.status })),
  allAnswered: done.every((d) => d.final && d.final !== 'pending'),
  outcomes: done.reduce((m, d) => ((m[d.final] = (m[d.final] ?? 0) + 1), m), {}),
  turnsOnServer: turns.length,
  startsInOrder,
  endsInOrder,
  failures: (stats.failures ?? []).filter((f) => f.t >= t0 - 1000),
  lastAnswerSeconds: (last - t0) / 1000,
  lastAnswerAfterLastSentSeconds: (last - lastSent) / 1000,
  perQuestion: done.map((d) => ({ i: d.i, id: d.id, lang: d.lang, queued: !!d.job, final: d.final, seconds: (d.doneAt - d.at) / 1000 })),
}
const out = path.join(here, 'reports', `queue-load-${tag}.json`)
fs.writeFileSync(out, JSON.stringify(summary, null, 2) + '\n')
console.log(JSON.stringify({ ...summary, perQuestion: undefined }, null, 2))
console.log('written', path.relative(process.cwd(), out))

// «اسأل» waits its turn for the model, and no question is turned away (add-ons 0071-add3 §1 and 0071-add4; Talal,
// 22 October 12:23 and 13:13: «تجاوب على الأسئلة بالترتيب … زي طابور انتظار», «ما يرفض أي سؤال، ما يتراجع»).
//
// The limit: Workers AI allows a model that needs the Workers Paid plan 20 requests a minute, per account and per model
// (developers.cloudflare.com/workers-ai/platform/limits/, last updated 17 September 2026), so next and v11 share it; a
// call over it fails at once. The search is not under it: text embeddings, bge-m3 among them, 3000 a minute.
//
// The guard: one Durable Object, AskQueue (src/queue-do.ts), SQLite-backed, on the plan we have and at no new cost
// (developers.cloudflare.com/durable-objects/platform/pricing/, last updated 18 October 2026: on Workers Paid 1 million
// requests and 400,000 GB-s a month included, SQLite 25 billion rows read, 50 million rows written and 5 GB-month
// stored included; an alarm is a request, and each setAlarm a row written). It holds:
//   - the window: the model calls of the last minute, at most RATE (env.ASK_RATE, or the rate set by the admin route;
//     never above RATE_MAX), every DeepSeek call of the environment through it (src/llm.ts), «اسأل» and «بسّط لي» alike;
//   - the questions that need the model, each with an id, in the order they came, kept until answered.
//
// The request does at once all that needs no model: the input, the limits, the grade, the gate, the cache, the FAQ and
// the search. At its first model call it stops (NeedModel), and the question goes to the queue with the search's lists
// (src/retrieve.ts SearchBase, or the whole retrieval); its answer is the same path (src/ask.ts) run in the queue's
// turn, one question at a time, oldest first. A call that fails (no reply: a timeout, the network, the limit) makes the
// whole turn wait and run again, with growing waits and no limit on the tries; each failure is logged, with its code and
// count only. The client asks by the id (GET /api/ask/job/:id) until the answer comes, and keeps the id across leaving,
// closing the app or losing the connection (web/src/api/client.ts).
//
// What is kept: the question and the search's lists until the answer is made, then removed; the answer (no question
// text in it) for KEEP_MS, so a reader who comes back finds it. No address: the limits were counted when it came.
import type { Env } from './index'

export const QUEUE_NAME = 'ask'
/** The window's size when neither the environment nor the admin route sets one (v11 by day, add-on 0071-add2 §6). */
export const RATE_DEFAULT = 6
/** Never above this, whatever is set: under the account's 20 with a margin (add-on 0071-add3 §1). */
export const RATE_MAX = 18
export const WINDOW_MS = 60_000
/** An answer waits this long for its reader once made. */
export const KEEP_MS = 7 * 86_400_000
/** A poll waits at most this long for its answer before saying it is still in review. */
export const WAIT_MAX_MS = 25_000

export const queueOn = (env: Env) => env.ASK_QUEUE === 'on' && !!env.ASK_JOBS

/** Thrown by the request's model function when the queue is on: the model's turn is the queue's (src/ask.ts). */
export class NeedModel extends Error {}

/** What a question takes to its turn: the request's body, who asked, and what its search found. */
export type JobInput = { body: unknown; isEval: boolean; base: unknown | null; retrieved: unknown | null }

/** A failed call that is retried: there was no reply. A reply that is not the JSON asked for is not a failed call: the
 *  checks of rule 6 decide on it, as without the queue (src/llm.ts: bad_json, bad_json_length). */
export const callFailed = (code: string | undefined) => !!code && !code.startsWith('bad_json')

/** The wait before a failed turn runs again: 2 s, 4 s, 8 s … and then every minute, without end. */
export const backoffMs = (attempts: number) => Math.min(2 ** Math.max(1, attempts), 60) * 1000

/** The part of the Durable Object's SQL storage used here (SqlStorage), so the logic runs in tests over node:sqlite. */
export type Sql = { exec(query: string, ...bindings: (string | number | null)[]): { toArray(): Record<string, unknown>[] } }

export function schema(sql: Sql) {
  sql.exec(`CREATE TABLE IF NOT EXISTS jobs (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    input TEXT,
    state TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    next_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    started_at INTEGER,
    done_at INTEGER,
    status INTEGER,
    result TEXT,
    error TEXT
  )`)
  sql.exec('CREATE INDEX IF NOT EXISTS jobs_state ON jobs (state, next_at)')
  sql.exec('CREATE TABLE IF NOT EXISTS calls (t INTEGER NOT NULL)')
  sql.exec('CREATE TABLE IF NOT EXISTS failures (t INTEGER NOT NULL, code TEXT NOT NULL, attempts INTEGER NOT NULL)')
  sql.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)')
}

/** The window of model calls: a call waits for its place, first come first served, and nothing is refused. */
export class Gate {
  private waiters: (() => void)[] = []
  private timer: ReturnType<typeof setTimeout> | null = null
  constructor(
    private sql: Sql,
    private rate: () => number,
    private now: () => number = () => Date.now(),
  ) {}

  take(): Promise<void> {
    return new Promise((resolve) => {
      this.waiters.push(resolve)
      this.pump()
    })
  }

  /** The calls of the last minute. */
  inWindow(): number {
    return Number(this.sql.exec('SELECT count(*) AS n FROM calls WHERE t > ?', this.now() - WINDOW_MS).toArray()[0].n)
  }

  waiting(): number {
    return this.waiters.length
  }

  private pump() {
    if (this.timer) return
    const t = this.now()
    this.sql.exec('DELETE FROM calls WHERE t <= ?', t - WINDOW_MS)
    while (this.waiters.length && this.inWindow() < this.rate()) {
      this.sql.exec('INSERT INTO calls (t) VALUES (?)', t)
      this.waiters.shift()!()
    }
    if (!this.waiters.length) return
    const oldest = Number(this.sql.exec('SELECT min(t) AS t FROM calls').toArray()[0].t ?? t)
    this.timer = setTimeout(
      () => {
        this.timer = null
        this.pump()
      },
      Math.max(50, oldest + WINDOW_MS - t + 20),
    )
  }
}

export type Job = { seq: number; id: string; input: string; attempts: number }
export type JobView = { state: 'waiting' | 'running' | 'done'; status?: number; result?: string }

/** The questions waiting for the model, in the order they came. */
export class Jobs {
  constructor(
    private sql: Sql,
    private now: () => number = () => Date.now(),
  ) {}

  add(input: JobInput): string {
    const id = crypto.randomUUID()
    const t = this.now()
    this.sql.exec('INSERT INTO jobs (id, input, state, next_at, created_at) VALUES (?, ?, ?, ?, ?)', id, JSON.stringify(input), 'waiting', t, t)
    return id
  }

  /** The oldest question whose turn has come: a turn that failed waits its backoff and keeps its place, so it is taken
   *  before those that came after it once the wait is over. */
  next(): Job | null {
    const r = this.sql.exec("SELECT seq, id, input, attempts FROM jobs WHERE state = 'waiting' AND next_at <= ? ORDER BY seq LIMIT 1", this.now()).toArray()[0]
    return r ? { seq: Number(r.seq), id: String(r.id), input: String(r.input), attempts: Number(r.attempts) } : null
  }

  /** When the next waiting question's turn comes (now or later), or null with none waiting. */
  nextDue(): number | null {
    const r = this.sql.exec("SELECT min(next_at) AS t FROM jobs WHERE state = 'waiting'").toArray()[0]
    return r?.t === null || r?.t === undefined ? null : Number(r.t)
  }

  /** A turn begins: counted before it runs, so a turn cut short (the object reset mid-call) still counts. */
  start(id: string) {
    this.sql.exec("UPDATE jobs SET state = 'running', attempts = attempts + 1, started_at = ? WHERE id = ?", this.now(), id)
  }

  /** The answer is made: kept for its reader, and the question and its search removed. */
  finish(id: string, status: number, result: string) {
    this.sql.exec("UPDATE jobs SET state = 'done', done_at = ?, status = ?, result = ?, input = NULL, error = NULL WHERE id = ?", this.now(), status, result, id)
  }

  /** A failed turn waits and runs again, without end; the failure is logged by its code and count only. */
  fail(id: string, code: string): number {
    const r = this.sql.exec('SELECT attempts FROM jobs WHERE id = ?', id).toArray()[0]
    const attempts = Number(r?.attempts ?? 1)
    const t = this.now()
    this.sql.exec("UPDATE jobs SET state = 'waiting', next_at = ?, error = ? WHERE id = ?", t + backoffMs(attempts), code.slice(0, 120), id)
    this.sql.exec('INSERT INTO failures (t, code, attempts) VALUES (?, ?, ?)', t, code.slice(0, 120), attempts)
    return attempts
  }

  /** Turns left running by an object that was reset (a deploy, an eviction): waiting again, after their backoff. */
  recover() {
    for (const r of this.sql.exec("SELECT id, attempts FROM jobs WHERE state = 'running'").toArray())
      this.sql.exec("UPDATE jobs SET state = 'waiting', next_at = ? WHERE id = ?", this.now() + backoffMs(Number(r.attempts)), String(r.id))
  }

  view(id: string): JobView | null {
    const r = this.sql.exec('SELECT state, status, result FROM jobs WHERE id = ?', id).toArray()[0]
    if (!r) return null
    return r.state === 'done' ? { state: 'done', status: Number(r.status), result: String(r.result) } : { state: r.state as 'waiting' | 'running' }
  }

  /** Answers past KEEP_MS and failures past a week. */
  prune() {
    const t = this.now()
    this.sql.exec("DELETE FROM jobs WHERE state = 'done' AND done_at < ?", t - KEEP_MS)
    this.sql.exec('DELETE FROM failures WHERE t < ?', t - KEEP_MS)
  }

  /** For the admin route and the load test: counts and times, never a question. */
  stats(since: number) {
    const one = (q: string, ...b: number[]) => this.sql.exec(q, ...b).toArray()[0] ?? {}
    const waiting = one("SELECT count(*) AS n, min(created_at) AS oldest FROM jobs WHERE state IN ('waiting', 'running')")
    const done = this.sql
      .exec("SELECT seq, created_at, started_at, done_at, attempts, status FROM jobs WHERE state = 'done' AND done_at >= ? ORDER BY seq", since)
      .toArray()
    const failures = this.sql.exec('SELECT t, code, attempts FROM failures WHERE t >= ? ORDER BY t', since).toArray()
    return { waiting: Number(waiting.n ?? 0), oldestWaitingAt: waiting.oldest ?? null, done, failures }
  }
}

/** GET /api/ask/job/:id: the answer when made (with its own status), else «in review» (PendingResponse); the poll waits
 *  up to `wait` ms (WAIT_MAX_MS at most) for it. An id the queue does not know (past KEEP_MS, or never given): 404. */
export async function handleJob(request: Request, env: Env, url: URL): Promise<Response | null> {
  const m = url.pathname.match(/^\/api\/ask\/job\/([0-9a-f-]{36})$/)
  if (!m || request.method !== 'GET') return null
  const send = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
  if (!env.ASK_JOBS) return send({ type: 'error', code: 'server', message: '' }, 404)
  const wait = Math.min(Math.max(Number(url.searchParams.get('wait') ?? 0) || 0, 0), WAIT_MAX_MS)
  const stub = env.ASK_JOBS.get(env.ASK_JOBS.idFromName(QUEUE_NAME))
  const res = await stub.fetch(`https://queue/job/${m[1]}?wait=${wait}`)
  if (res.status === 404) return send({ type: 'error', code: 'server', message: '' }, 404)
  const v = (await res.json()) as JobView
  if (v.state !== 'done') return send({ type: 'pending', id: m[1], stage: 'review' })
  return new Response(v.result, { status: v.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
}

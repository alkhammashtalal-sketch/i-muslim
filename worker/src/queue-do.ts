// The Durable Object of «اسأل»'s queue (src/queue.ts has the why and the limits). One object for the environment, by
// the name QUEUE_NAME: the window of model calls and the questions waiting for the model, in its own SQLite storage.
// Its routes (from this Worker only, through the ASK_JOBS binding; never public):
//   POST /enqueue        a question that needs the model → { id }
//   GET  /job/:id?wait=  its answer when made, else after `wait` ms at most → { state, status?, result? }; 404 unknown
//   POST /take           a place in the window for a model call made outside the queue («بسّط لي»): held until given
//   GET  /stats?since=   counts and times (the admin route)
//   POST /rate           { rate } the window's size (the admin route), 1 to RATE_MAX
// The alarm runs the turns: one question at a time, oldest first, for at most SLICE_MS, then hands over to the next
// alarm. A client's poll also wakes a queue whose alarm was lost (a deploy resets the object mid-turn).
import { askQueued, type AskDeps } from './ask'
import type { Env } from './index'
import { Gate, Jobs, RATE_DEFAULT, RATE_MAX, schema, WAIT_MAX_MS, type JobInput, type Sql } from './queue'

const SLICE_MS = 50_000

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

type State = { storage: { sql: Sql; getAlarm(): Promise<number | null>; setAlarm(t: number): Promise<void> } }

export class AskQueue {
  private jobs: Jobs
  private gate: Gate
  private sql: Sql
  private running = false
  private waiters = new Map<string, Set<() => void>>()

  /** `deps`: the search and the model, for tests only; the runtime gives the first two. */
  constructor(
    private state: State,
    private env: Env,
    private deps?: AskDeps,
  ) {
    this.sql = state.storage.sql
    schema(this.sql)
    this.jobs = new Jobs(this.sql)
    this.gate = new Gate(this.sql, () => this.rate())
  }

  /** The window's size: the admin route's, else env.ASK_RATE, else RATE_DEFAULT; never above RATE_MAX. */
  rate(): number {
    const set = this.sql.exec("SELECT value FROM settings WHERE key = 'rate'").toArray()[0]?.value
    const n = Number(set ?? this.env.ASK_RATE ?? RATE_DEFAULT)
    return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), RATE_MAX) : RATE_DEFAULT
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/enqueue' && request.method === 'POST') {
      const id = this.jobs.add((await request.json()) as JobInput)
      await this.wake()
      return json({ id })
    }
    const m = url.pathname.match(/^\/job\/([0-9a-f-]{36})$/)
    if (m && request.method === 'GET') {
      const id = m[1]
      let v = this.jobs.view(id)
      if (!v) return json({ state: 'unknown' }, 404)
      if (v.state !== 'done') {
        await this.wake()
        v = this.jobs.view(id) ?? v
        const wait = Math.min(Math.max(Number(url.searchParams.get('wait') ?? 0) || 0, 0), WAIT_MAX_MS)
        if (wait && v.state !== 'done') {
          await this.until(id, wait)
          v = this.jobs.view(id) ?? v
        }
      }
      return json(v)
    }
    if (url.pathname === '/take' && request.method === 'POST') {
      await this.gate.take()
      return new Response(null, { status: 204 })
    }
    if (url.pathname === '/stats' && request.method === 'GET') {
      const since = Number(url.searchParams.get('since') ?? Date.now() - 3_600_000)
      return json({ rate: this.rate(), inWindow: this.gate.inWindow(), gateWaiting: this.gate.waiting(), running: this.running, ...this.jobs.stats(since) })
    }
    if (url.pathname === '/rate' && request.method === 'POST') {
      const rate = Number(((await request.json().catch(() => null)) as { rate?: unknown } | null)?.rate)
      if (!Number.isInteger(rate) || rate < 1 || rate > RATE_MAX) return json({ ok: false, max: RATE_MAX }, 400)
      this.sql.exec("INSERT INTO settings (key, value) VALUES ('rate', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", String(rate))
      return json({ ok: true, rate })
    }
    return json({ ok: false }, 404)
  }

  async alarm(): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      this.jobs.recover()
      const until = Date.now() + SLICE_MS
      for (let job = this.jobs.next(); job && Date.now() < until; job = this.jobs.next()) await this.turn(job.id, job.input)
      this.jobs.prune()
    } finally {
      this.running = false
    }
    const due = this.jobs.nextDue()
    if (due !== null) await this.state.storage.setAlarm(Math.max(due, Date.now()))
  }

  /** One question's turn: the same path as the request (src/ask.ts askQueued), every model call through the window. */
  private async turn(id: string, input: string) {
    this.jobs.start(id)
    const failed: string[] = []
    try {
      const res = await askQueued({ ...this.env, LLM_GATE: this.gate }, JSON.parse(input) as JobInput, failed, this.deps)
      if (failed.length) return this.failed(id, failed[0])
      this.jobs.finish(id, res.status, await res.text())
      for (const w of this.waiters.get(id) ?? []) w()
      this.waiters.delete(id)
    } catch (e) {
      this.failed(id, `exception: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  private failed(id: string, code: string) {
    const attempts = this.jobs.fail(id, code)
    console.log(JSON.stringify({ evt: 'queue_turn_failed', code: code.slice(0, 120), attempts }))
  }

  /** The alarm, when a question waits and none is set (or one is set later than the next turn). */
  private async wake() {
    const due = this.jobs.nextDue()
    if (due === null || this.running) return
    const at = await this.state.storage.getAlarm()
    if (at === null || at > Math.max(due, Date.now())) await this.state.storage.setAlarm(Math.max(due, Date.now()))
  }

  private until(id: string, ms: number): Promise<void> {
    return new Promise((resolve) => {
      const set = this.waiters.get(id) ?? new Set()
      const done = () => {
        clearTimeout(timer)
        set.delete(done)
        resolve()
      }
      const timer = setTimeout(done, ms)
      set.add(done)
      this.waiters.set(id, set)
    })
  }
}

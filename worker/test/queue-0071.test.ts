// «اسأل»'s queue (add-ons 0071-add3 §1 and 0071-add4; src/queue.ts, src/queue-do.ts): the window of model calls, the
// order, the turn that runs again after a failed call, and the request that stops at its first model call with the
// search done. The Durable Object's SQL storage is node:sqlite here; the search and the model are injected.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AskResponse, PendingResponse } from '../../shared/api'
import { handleAsk, type AskDeps } from '../src/ask'
import type { Env } from '../src/index'
import { mockReply, type LlmResult } from '../src/llm'
import { backoffMs, callFailed, Gate, handleJob, Jobs, RATE_MAX, schema, type Sql } from '../src/queue'
import { AskQueue } from '../src/queue-do'
import type { RetrieveResult } from '../src/retrieve'
import { SqliteD1 } from './d1-sqlite'

const ROOT = path.resolve(import.meta.dirname, '../..')

/** SqlStorage's exec over node:sqlite: a statement with bindings, or several without. */
function sqlOf(db = new DatabaseSync(':memory:')): Sql {
  return {
    exec(query, ...b) {
      if (!b.length && !/^\s*(SELECT|INSERT|UPDATE|DELETE)/i.test(query)) {
        db.exec(query)
        return { toArray: () => [] }
      }
      const st = db.prepare(query)
      if (/^\s*SELECT/i.test(query)) {
        const rows = st.all(...b) as Record<string, unknown>[]
        return { toArray: () => rows }
      }
      st.run(...b)
      return { toArray: () => [] }
    },
  }
}

describe('the window (Gate): at most RATE model calls in any minute, first come first served, none refused', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('gives RATE places at once, and the next ones as the minute frees them, in the order asked', async () => {
    const sql = sqlOf()
    schema(sql)
    const gate = new Gate(sql, () => 3, () => Date.now())
    const got: number[] = []
    const all = [0, 1, 2, 3, 4].map((i) => gate.take().then(() => got.push(i)))
    await vi.advanceTimersByTimeAsync(0)
    expect(got).toEqual([0, 1, 2])
    expect(gate.waiting()).toBe(2)
    await vi.advanceTimersByTimeAsync(59_000)
    expect(got).toEqual([0, 1, 2])
    await vi.advanceTimersByTimeAsync(1_100)
    expect(got).toEqual([0, 1, 2, 3, 4])
    await Promise.all(all)
    expect(gate.inWindow()).toBe(2)
  })

  it('never above RATE_MAX (18, under the account’s 20 a minute), whatever is set', async () => {
    expect(RATE_MAX).toBeLessThan(20)
    const sql = sqlOf()
    schema(sql)
    const state = { storage: { sql, getAlarm: async () => null, setAlarm: async () => undefined } }
    const q = new AskQueue(state, { ASK_RATE: '50' } as Env)
    expect(q.rate()).toBe(RATE_MAX)
    const bad = await q.fetch(new Request('https://queue/rate', { method: 'POST', body: JSON.stringify({ rate: 25 }) }))
    expect(bad.status).toBe(400)
    const ok = await q.fetch(new Request('https://queue/rate', { method: 'POST', body: JSON.stringify({ rate: 15 }) }))
    expect(await ok.json()).toEqual({ ok: true, rate: 15 })
    expect(q.rate()).toBe(15)
  })
})

describe('the questions (Jobs): oldest first; a failed turn waits its backoff and keeps its place', () => {
  it('takes them in the order they came, and a failed one again before those after it once its wait is over', () => {
    let t = 1_000_000
    const sql = sqlOf()
    schema(sql)
    const jobs = new Jobs(sql, () => t)
    const input = (n: number) => ({ body: { q: `س${n}` }, isEval: false, base: null, retrieved: null })
    const a = jobs.add(input(1))
    t += 10
    const b = jobs.add(input(2))
    t += 10
    const c = jobs.add(input(3))
    expect(jobs.next()!.id).toBe(a)
    jobs.start(a)
    expect(jobs.fail(a, 'timeout_or_network')).toBe(1)
    // a waits its backoff: b, then c, are taken meanwhile; then a before anything that came after it.
    expect(jobs.next()!.id).toBe(b)
    jobs.start(b)
    jobs.finish(b, 200, '{"type":"abstain"}')
    t += backoffMs(1)
    const d = jobs.add(input(4))
    expect(jobs.next()!.id).toBe(a)
    expect(d).not.toBe(a)
    expect(jobs.view(c)).toEqual({ state: 'waiting' })
    expect(jobs.view(b)).toEqual({ state: 'done', status: 200, result: '{"type":"abstain"}' })
  })

  it('waits longer after each failure, up to a minute, without end', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 50].map(backoffMs)).toEqual([2000, 4000, 8000, 16000, 32000, 60000, 60000, 60000])
  })

  it('keeps the question only until its answer is made, then the answer alone, for a week', () => {
    let t = 5_000_000
    const sql = sqlOf()
    schema(sql)
    const jobs = new Jobs(sql, () => t)
    const id = jobs.add({ body: { q: 'ما الإسلام؟' }, isEval: false, base: { best: [] }, retrieved: null })
    jobs.start(id)
    jobs.finish(id, 200, '{"type":"answer"}')
    const row = sql.exec('SELECT input, result FROM jobs WHERE id = ?', id).toArray()[0]
    expect(row.input).toBeNull()
    expect(row.result).toBe('{"type":"answer"}')
    t += 7 * 86_400_000 + 1
    jobs.prune()
    expect(jobs.view(id)).toBeNull()
  })

  it('a turn cut short (the object reset mid-call) waits again, counted', () => {
    let t = 0
    const sql = sqlOf()
    schema(sql)
    const jobs = new Jobs(sql, () => t)
    const id = jobs.add({ body: {}, isEval: false, base: null, retrieved: null })
    jobs.start(id)
    jobs.recover()
    expect(jobs.view(id)).toEqual({ state: 'waiting' })
    expect(jobs.next()).toBeNull()
    t += backoffMs(1)
    expect(jobs.next()!.attempts).toBe(1)
  })

  it('a failed call is one with no reply; a reply that is not the JSON asked for is judged by rule 6 as before', () => {
    expect(callFailed('timeout_or_network')).toBe(true)
    expect(callFailed('ai_error: 3021: rate limiting')).toBe(true)
    expect(callFailed('http_503')).toBe(true)
    expect(callFailed('bad_json')).toBe(false)
    expect(callFailed('bad_json_length')).toBe(false)
    expect(callFailed(undefined)).toBe(false)
  })
})

// The request and the queue's turn, end to end, on the sample database (as test/engine.test.ts).
const SAMPLES = ['quran.sample.jsonl', 'aqeedah.sample.jsonl'].flatMap((f) =>
  fs
    .readFileSync(path.join(ROOT, 'data/samples', f), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l) as Record<string, unknown>),
)
const COLUMNS = ['id', 'source', 'kind', 'ref', 'url', 'text', 'text_en', 'text_search', 'embed_text', 'book', 'chapter', 'sura', 'aya', 'page']
function sampleDb(): SqliteD1 {
  const db = new DatabaseSync(':memory:')
  const files = fs.readdirSync(path.join(ROOT, 'worker/migrations')).filter((f) => f.endsWith('.sql')).sort()
  const run = (f: string) => db.exec(fs.readFileSync(path.join(ROOT, 'worker/migrations', f), 'utf8'))
  files.filter((f) => f < '0004').forEach(run)
  const ins = db.prepare(`INSERT INTO passages (${COLUMNS.join(', ')}, extra) VALUES (${COLUMNS.map(() => '?').join(', ')}, ?)`)
  for (const r of SAMPLES) {
    const extra = Object.fromEntries(Object.entries(r).filter(([k]) => !COLUMNS.includes(k)))
    ins.run(...COLUMNS.map((c) => (r[c] ?? null) as string | number | null), JSON.stringify(extra))
  }
  files.filter((f) => f >= '0004').forEach(run)
  return new SqliteD1(db)
}
const IDS = ['quran:5:6', 'quran:2:183', 'aqeedah:usul:001']
const found: RetrieveResult = {
  passages: IDS.map((id, i) => ({ id, score: 1 / (i + 61), foundBy: { vector: i + 1 } })),
  ranked: IDS.map((id, i) => ({ id, score: 1 / (i + 61), foundBy: { vector: i + 1 } })),
  abstain: false,
  topVectorScore: 0.6,
  topics: [],
  rowsRead: 0,
}

describe('«اسأل» with the queue on: the search at once, the model in the queue’s turn, the answer by its id', () => {
  let env: Env
  let queue: AskQueue
  let alarms: number[]
  let calls: { retrieve: number; base: number; llm: number }
  let fail: number
  let deps: AskDeps
  const ask = (q: string, ip = '203.0.113.9', extra: Record<string, unknown> = {}) =>
    handleAsk(new Request('https://x/api/ask', { method: 'POST', headers: { 'cf-connecting-ip': ip }, body: JSON.stringify({ q, lang: 'ar', canWait: true, ...extra }) }), env, deps)
  const poll = async (id: string) => (await handleJob(new Request(`https://x/api/ask/job/${id}`), env, new URL(`https://x/api/ask/job/${id}`)))!

  beforeEach(() => {
    calls = { retrieve: 0, base: 0, llm: 0 }
    fail = 0
    deps = {
      retrieve: async () => {
        calls.retrieve++
        return found
      },
      searchBase: async () => {
        calls.base++
        throw new Error('not with these fixes')
      },
      callLlm: async (_e, _m, sent, uiLang): Promise<LlmResult> => {
        calls.llm++
        if (fail > 0) {
          fail--
          return { raw: null, usage: { in: 0, out: 0 }, mode: 'live', error: 'timeout_or_network' }
        }
        return { raw: mockReply(sent, uiLang), usage: { in: 0, out: 0 }, mode: 'mock' }
      },
    }
    alarms = []
    const sql = sqlOf()
    const state = { storage: { sql, getAlarm: async () => alarms.at(-1) ?? null, setAlarm: async (t: number) => void alarms.push(t) } }
    env = { DB: sampleDb() as unknown as D1Database, IP_SALT: 'test-salt', LLM_MODE: 'mock', EXPLAIN_MODE: 'generated', ASK_QUEUE: 'on' } as Env
    queue = new AskQueue(state, env, deps)
    // The binding: every stub is the one object, as idFromName(QUEUE_NAME) gives.
    env.ASK_JOBS = { idFromName: () => ({}), get: () => ({ fetch: (u: string, init?: RequestInit) => queue.fetch(new Request(u, init)) }) } as unknown as DurableObjectNamespace
  })

  /** The runtime's alarm: due now, run once (the queue runs what is due and sets the next one). */
  const runAlarm = async () => {
    alarms = []
    await queue.alarm()
  }

  it('answers «pending» with an id once the search is done, the model not yet called; the turn makes the answer', async () => {
    const res = await ask('ما فرائض الوضوء؟')
    const p = (await res.json()) as PendingResponse
    expect(p).toEqual({ type: 'pending', id: expect.stringMatching(/^[0-9a-f-]{36}$/), stage: 'review' })
    expect(calls).toEqual({ retrieve: 1, base: 0, llm: 0 })
    expect(alarms.length).toBe(1)
    expect(((await (await poll(p.id)).json()) as PendingResponse).type).toBe('pending')
    await runAlarm()
    // The search ran once, at the request; its turn used what it found.
    expect(calls).toEqual({ retrieve: 1, base: 0, llm: 1 })
    const done = await poll(p.id)
    expect(done.status).toBe(200)
    const a = (await done.json()) as AskResponse
    expect(a.type).toBe('answer')
  })

  it('the same answer as without the queue', async () => {
    const p = (await (await ask('ما فرائض الوضوء؟')).json()) as PendingResponse
    await runAlarm()
    const queued = await (await poll(p.id)).json()
    env.ASK_QUEUE = 'off'
    env.DB = sampleDb() as unknown as D1Database
    const direct = await (await ask('ما فرائض الوضوء؟', '203.0.113.10')).json()
    expect(queued).toEqual(direct)
  })

  it('in order: the first asked is answered first', async () => {
    const qs = ['ما فرائض الوضوء؟', 'ما أركان الصيام؟', 'ما الأصول الثلاثة؟']
    const ids: string[] = []
    for (const [i, q] of qs.entries()) ids.push(((await (await ask(q, `203.0.113.${20 + i}`)).json()) as PendingResponse).id)
    const order: string[] = []
    const real = deps.callLlm
    deps.callLlm = async (...a) => {
      order.push(String((a[1].at(-1)?.content ?? '').match(/ما [^\n<]*؟/)?.[0]))
      return real(...a)
    }
    await runAlarm()
    expect(order).toEqual(qs)
    for (const id of ids) expect(((await (await poll(id)).json()) as AskResponse).type).toBe('answer')
  })

  it('a failed call is retried in silence, with a growing wait, and logged; the reader gets the answer, not a refusal', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    fail = 2
    const p = (await (await ask('ما فرائض الوضوء؟')).json()) as PendingResponse
    vi.useFakeTimers()
    try {
      await runAlarm()
      expect(((await (await poll(p.id)).json()) as PendingResponse).type).toBe('pending')
      vi.advanceTimersByTime(backoffMs(1))
      await runAlarm()
      vi.advanceTimersByTime(backoffMs(2))
      await runAlarm()
    } finally {
      vi.useRealTimers()
    }
    expect(((await (await poll(p.id)).json()) as AskResponse).type).toBe('answer')
    expect(calls.llm).toBe(3)
    const logged = log.mock.calls.map((c) => JSON.parse(String(c[0]))).filter((x) => x.evt === 'queue_turn_failed')
    expect(logged).toEqual([
      { evt: 'queue_turn_failed', code: 'timeout_or_network', attempts: 1 },
      { evt: 'queue_turn_failed', code: 'timeout_or_network', attempts: 2 },
    ])
    // No question in the log.
    expect(JSON.stringify(log.mock.calls)).not.toContain('الوضوء')
  })

  it('a burst from one device waits its turn instead of being refused', async () => {
    env.BURST = { limit: async () => ({ success: false }) } as unknown as RateLimit
    const r = (await (await ask('ما فرائض الوضوء؟')).json()) as PendingResponse
    expect(r.type).toBe('pending')
    env.ASK_QUEUE = 'off'
    const refused = (await (await ask('ما أركان الصيام؟')).json()) as AskResponse
    expect(refused).toMatchObject({ type: 'error', code: 'burst' })
  })

  it('needs no turn for what needs no model: an abstention, a referral, a cached answer', async () => {
    deps.retrieve = async () => ({ ...found, passages: [], abstain: true })
    expect(((await (await ask('سؤال لا نص له')).json()) as AskResponse).type).toBe('abstain')
    expect(((await (await ask('طلقت زوجتي ثلاثا فما الحكم في حالتي؟')).json()) as AskResponse).type).toBe('referral')
    deps.retrieve = async () => found
    const p = (await (await ask('ما فرائض الوضوء؟')).json()) as PendingResponse
    await runAlarm()
    await poll(p.id)
    const again = (await (await ask('ما فرائض الوضوء؟', '203.0.113.99')).json()) as AskResponse & { fromCache?: boolean }
    expect(again).toMatchObject({ type: 'answer', fromCache: true })
  })

  it('an app that does not know «in review» (iOS 1.0.0: no canWait) gets its answer in the reply, as before', async () => {
    const res = (await (await ask('ما فرائض الوضوء؟', '203.0.113.50', { canWait: undefined })).json()) as AskResponse
    expect(res.type).toBe('answer')
    expect(alarms.length).toBe(0)
    expect(calls.llm).toBe(1)
  })

  it('an id the queue does not know: 404', async () => {
    const r = await poll('00000000-0000-4000-8000-000000000000')
    expect(r.status).toBe(404)
  })
})

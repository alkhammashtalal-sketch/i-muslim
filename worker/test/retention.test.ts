// How long the server keeps what it keeps (reply 0037 §4.1, worker/src/retention.ts), on an in-memory D1 built from the
// migrations: reports and «تواصل معنا» messages go after six months, usage_daily after seven days, language requests
// stay; every delete goes through an index (CLAUDE.md §12), and the job runs once a day from the minute cron.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import worker, { type Env } from '../src/index'
import { daysBefore, isRetentionMinute, monthsBefore, RETENTION, runRetention } from '../src/retention'
import { SOURCES_CRON } from '../src/sources'
import { buildDb, SqliteD1 } from './d1-sqlite'

const ROOT = path.resolve(import.meta.dirname, '../..')
// 13 October 2026, 00:30 UTC = 03:30 in Riyadh: the minute the job runs.
const NOW = Date.UTC(2026, 9, 13, 0, 30)

let db: SqliteD1
let env: Env
const rows = (sql: string) => db.db.prepare(sql).all() as Record<string, unknown>[]

beforeEach(() => {
  db = buildDb()
  env = { DB: db } as unknown as Env
  const usage = db.db.prepare('INSERT INTO usage_daily (day, ip_hash, count) VALUES (?, ?, ?)')
  for (const [day, key] of [
    ['2026-10-13', 'ask:a'], // today
    ['2026-10-06', 'ask:b'], // seven days old: kept
    ['2026-10-05', 'ask:c'], // eight: deleted
    ['2026-10-05', 'llm:c'],
    ['2026-09-01', 'voice:d'],
  ])
    usage.run(day, key, 3)
  const src = db.db.prepare('INSERT INTO source_reports (day, kind, note) VALUES (?, ?, ?)')
  for (const [day, kind] of [
    ['2026-10-13', 'support'],
    ['2026-04-13', 'text'], // six months to the day: kept
    ['2026-04-12', 'support'], // a day more: deleted
    ['2025-10-13', 'translation'],
  ])
    src.run(day, kind, kind === 'support' ? 'رسالة' : null)
  const rep = db.db.prepare('INSERT INTO reports (passage_id, reason, created_at) VALUES (?, ?, ?)')
  for (const created of ['2026-10-12', '2026-04-13', '2026-04-12', '2026-01-01 08:15:00']) rep.run('quran:1:1', 'other', created)
  const lang = db.db.prepare('INSERT INTO lang_requests (text, month, count) VALUES (?, ?, ?)')
  lang.run('klingon', '2025-01', 4)
  lang.run('klingon', '2026-10', 1)
})

describe('the cuts', () => {
  it('seven days and six calendar months, in Riyadh dates', () => {
    expect(daysBefore('2026-10-13', 7)).toBe('2026-10-06')
    expect(daysBefore('2026-03-02', 7)).toBe('2026-02-23')
    expect(monthsBefore('2026-10-13', 6)).toBe('2026-04-13')
    expect(monthsBefore('2026-03-15', 6)).toBe('2025-09-15')
    expect(monthsBefore('2026-08-31', 6)).toBe('2026-02-28') // a shorter month: its last day
    expect(monthsBefore('2028-08-31', 6)).toBe('2028-02-29')
    expect(monthsBefore('2026-12-31', 6)).toBe('2026-06-30')
  })

  it('the job runs in one minute of the day: 03:30 Riyadh time (00:30 UTC)', () => {
    expect(isRetentionMinute(NOW)).toBe(true)
    expect(isRetentionMinute(NOW + 59_000)).toBe(true) // the cron's time within that minute
    expect(isRetentionMinute(NOW + 60_000)).toBe(false)
    expect(isRetentionMinute(NOW - 60_000)).toBe(false)
    expect(isRetentionMinute(Date.UTC(2026, 9, 13, 3, 30))).toBe(false) // 03:30 UTC is 06:30 in Riyadh
    const minutes = Array.from({ length: 1440 }, (_, m) => NOW - 30 * 60_000 + m * 60_000).filter(isRetentionMinute)
    expect(minutes).toEqual([NOW])
  })
})

describe('runRetention', () => {
  it('old rows go and new rows stay; language requests stay', async () => {
    const r = await runRetention(env, NOW)
    expect(r).toMatchObject({ day: '2026-10-13', deleted: { usage_daily: 3, source_reports: 2, reports: 2 }, failed: [] })
    expect(rows('SELECT day, ip_hash FROM usage_daily ORDER BY day')).toEqual([
      { day: '2026-10-06', ip_hash: 'ask:b' },
      { day: '2026-10-13', ip_hash: 'ask:a' },
    ])
    expect(rows('SELECT day FROM source_reports ORDER BY day')).toEqual([{ day: '2026-04-13' }, { day: '2026-10-13' }])
    expect(rows('SELECT created_at FROM reports ORDER BY created_at')).toEqual([{ created_at: '2026-04-13' }, { created_at: '2026-10-12' }])
    expect(rows('SELECT text, month, count FROM lang_requests ORDER BY month')).toHaveLength(2)
    // A second run the same day finds nothing more.
    expect((await runRetention(env, NOW)).deleted).toEqual({ usage_daily: 0, source_reports: 0, reports: 0 })
  })

  it('reports rows_read and rows_written from D1’s meta (0 where the test adapter gives none)', async () => {
    const metas = [
      { changes: 3, rows_read: 4, rows_written: 6 },
      { changes: 2, rows_read: 3, rows_written: 4 },
      { changes: 2, rows_read: 3, rows_written: 4 },
    ]
    let i = 0
    const fake = { prepare: () => ({ bind: () => ({ run: async () => ({ meta: metas[i++] }) }) }) }
    expect(await runRetention({ DB: fake } as unknown as Env, NOW)).toEqual({
      day: '2026-10-13',
      deleted: { usage_daily: 3, source_reports: 2, reports: 2 },
      failed: [],
      rows_read: 10,
      rows_written: 14,
    })
  })

  it('every delete goes through an index, never a table scan (EXPLAIN QUERY PLAN)', () => {
    const want: Record<string, RegExp> = {
      usage_daily: /^SEARCH usage_daily USING (COVERING )?INDEX sqlite_autoindex_usage_daily_1 \(day<\?\)$/,
      source_reports: /^SEARCH source_reports USING (COVERING )?INDEX source_reports_day \(day<\?\)$/,
      reports: /^SEARCH reports USING (COVERING )?INDEX reports_created_at \(created_at<\?\)$/,
    }
    for (const r of RETENTION) {
      const plan = db.db.prepare(`EXPLAIN QUERY PLAN ${r.sql}`).all('2026-01-01') as { detail: string }[]
      expect(plan.map((p) => p.detail), r.table).toHaveLength(1)
      expect(plan[0].detail, r.table).toMatch(want[r.table])
    }
  })

  it('a missing index fails that delete instead of scanning; the others still run', async () => {
    db.db.exec('DROP INDEX reports_created_at')
    const r = await runRetention(env, NOW)
    expect(r.failed).toEqual(['reports'])
    expect(r.deleted).toEqual({ usage_daily: 3, source_reports: 2 })
    expect(rows('SELECT count(*) AS n FROM reports')).toEqual([{ n: 4 }])
  })

  it('migration 0015 only adds (an index and a table) and runs again harmlessly', () => {
    const sql = fs.readFileSync(path.join(ROOT, 'worker/migrations/0015_retention_recordings.sql'), 'utf8')
    const statements = sql
      .split('\n')
      .filter((l) => !l.startsWith('--'))
      .join('\n')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
    expect(statements.map((s) => s.split('(')[0].replace(/\s+/g, ' ').trim())).toEqual([
      'CREATE INDEX IF NOT EXISTS reports_created_at ON reports',
      'CREATE TABLE IF NOT EXISTS recordings_monthly',
    ])
    expect(() => db.db.exec(sql)).not.toThrow()
    // On the tables as 0001 and 0014 left them, before it.
    const fresh = new DatabaseSync(':memory:')
    for (const f of fs.readdirSync(path.join(ROOT, 'worker/migrations')).filter((x) => x.endsWith('.sql') && x < '0004')) fresh.exec(fs.readFileSync(path.join(ROOT, 'worker/migrations', f), 'utf8'))
    fresh.exec(fs.readFileSync(path.join(ROOT, 'worker/migrations/0014_sources_reports.sql'), 'utf8'))
    expect(() => fresh.exec(sql)).not.toThrow()
  })
})

describe('the scheduled handler', () => {
  const ctx = () => {
    const waits: Promise<unknown>[] = []
    return { waits, waitUntil: (p: Promise<unknown>) => void waits.push(p), passThroughOnException: () => {} } as unknown as ExecutionContext & { waits: Promise<unknown>[] }
  }
  const tick = async (cron: string, scheduledTime: number) => {
    const c = ctx()
    await worker.scheduled({ cron, scheduledTime, noRetry: () => {} } as unknown as ScheduledController, env, c)
    await Promise.all(c.waits)
  }

  it('runs the job in the minute cron at 03:30 Riyadh, once a day, and logs what it did (counts only)', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.stubGlobal('fetch', async () => Promise.reject(new Error('no network in tests'))) // the sources' check
    try {
      await tick('* * * * *', NOW + 60_000) // 03:31: nothing
      expect(rows('SELECT count(*) AS n FROM usage_daily')).toEqual([{ n: 5 }])
      await tick(SOURCES_CRON, NOW) // the monthly cron is the sources' check, not this job
      expect(rows('SELECT count(*) AS n FROM usage_daily')).toEqual([{ n: 5 }])
      await tick('* * * * *', NOW)
      expect(rows('SELECT count(*) AS n FROM usage_daily')).toEqual([{ n: 2 }])
      const lines = log.mock.calls.map((c) => JSON.parse(String(c[0])) as Record<string, unknown>).filter((l) => l.evt === 'retention')
      expect(lines).toEqual([{ evt: 'retention', day: '2026-10-13', deleted: { usage_daily: 3, source_reports: 2, reports: 2 }, failed: [], rows_read: 0, rows_written: 0 }])
    } finally {
      log.mockRestore()
      vi.unstubAllGlobals()
    }
  })
})

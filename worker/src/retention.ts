// How long the server keeps what it keeps (reply 0037 §4.1; the privacy policy, site/public/privacy.html «بياناتك وحذفها»,
// and docs/PRIVACY.md say the same):
//   reports and «تواصل معنا» messages   source_reports (migration 0014) and the answer card's older table reports (0001):
//                                        deleted once older than six calendar months (by their Riyadh date).
//   usage_daily                          the per-device daily counters: deleted once older than seven days.
//   language requests (lang_requests)    kept: monthly counts of a language's name, nothing about anyone.
// Once a day, inside the minute cron of env.next, at 03:30 Riyadh time (00:30 UTC): a run that is missed is made up the
// next day, since each delete takes everything older than its cut. Every delete goes through an index (CLAUDE.md §12, no
// table scan): usage_daily's primary key begins with day; source_reports_day (0014); reports_created_at (0015). The two
// report tables name their index (INDEXED BY), so a missing index fails that delete instead of scanning the table.
import type { Env } from './index'
import { riyadhDay } from './lib/keys.ts'

export const RETENTION_AT = { hour: 3, minute: 30 } // Riyadh time
export const USAGE_DAYS = 7
export const REPORT_MONTHS = 6

/** True for the one minute of the day the job runs (the cron's scheduledTime, in ms). */
export function isRetentionMinute(scheduledTime: number): boolean {
  const t = new Date(scheduledTime + 3 * 3600_000) // Riyadh: UTC+3, no daylight saving
  return t.getUTCHours() === RETENTION_AT.hour && t.getUTCMinutes() === RETENTION_AT.minute
}

/** The date `n` days before `day` (YYYY-MM-DD). */
export const daysBefore = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) - n * 86400_000).toISOString().slice(0, 10)

/** The date `months` calendar months before `day`: the same day of the month, or that month's last day. */
export function monthsBefore(day: string, months: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1 - months, 1))
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  first.setUTCDate(Math.min(d, last))
  return first.toISOString().slice(0, 10)
}

/** The deletes, each with the cut it is given: rows strictly before the cut go. */
export const RETENTION = [
  { table: 'usage_daily', sql: 'DELETE FROM usage_daily WHERE day < ?', cut: (today: string) => daysBefore(today, USAGE_DAYS) },
  {
    table: 'source_reports',
    sql: 'DELETE FROM source_reports INDEXED BY source_reports_day WHERE day < ?',
    cut: (today: string) => monthsBefore(today, REPORT_MONTHS),
  },
  {
    table: 'reports',
    sql: 'DELETE FROM reports INDEXED BY reports_created_at WHERE created_at < ?',
    cut: (today: string) => monthsBefore(today, REPORT_MONTHS),
  },
] as const

export type RetentionResult = {
  day: string
  deleted: Record<string, number>
  failed: string[]
  rows_read: number
  rows_written: number
}

/** Runs the three deletes; one that fails (a missing index or table) is named in `failed` and the others still run. */
export async function runRetention(env: Env, now = Date.now()): Promise<RetentionResult> {
  const day = riyadhDay(now)
  const out: RetentionResult = { day, deleted: {}, failed: [], rows_read: 0, rows_written: 0 }
  for (const r of RETENTION) {
    try {
      const res = await env.DB.prepare(r.sql).bind(r.cut(day)).run()
      const meta = res.meta as { changes?: number; rows_read?: number; rows_written?: number }
      out.deleted[r.table] = meta.changes ?? 0
      out.rows_read += meta.rows_read ?? 0
      out.rows_written += meta.rows_written ?? 0
    } catch {
      out.failed.push(r.table)
    }
  }
  return out
}

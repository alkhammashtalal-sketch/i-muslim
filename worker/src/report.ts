// POST /api/report — { passageId, reason } only. No question text, no IP (SCREENS.md element 12).
import type { ReportReason } from '../../shared/api'
import limits from './config/limits.json'
import type { Env } from './index'
import { deviceKey, riyadhDay } from './lib/keys.ts'

const REASONS: ReportReason[] = ['text_mismatch', 'wrong_ref', 'bad_translation', 'other']
const ID_RE = /^[a-z]+(:[a-z0-9_-]+){1,4}$/

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export async function handleReport(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { passageId?: unknown; reason?: unknown } | null
  const passageId = typeof body?.passageId === 'string' ? body.passageId : ''
  const reason = body?.reason as ReportReason
  if (!REASONS.includes(reason) || passageId.length > 64 || !ID_RE.test(passageId)) {
    return json({ ok: false, error: 'bad_input' }, 400)
  }
  if (!env.IP_SALT) return json({ ok: false, error: 'server' }, 500)

  const exists = await env.DB.prepare('SELECT 1 AS x FROM passages WHERE id = ?').bind(passageId).first<{ x: number }>()
  if (!exists) return json({ ok: false, error: 'unknown_passage' }, 404)

  const day = riyadhDay()
  const key = `report:${await deviceKey(env.IP_SALT, request.headers.get('cf-connecting-ip') ?? 'unknown', day)}`
  const row = await env.DB.prepare(
    'INSERT INTO usage_daily (day, ip_hash, count) VALUES (?, ?, 1) ON CONFLICT(day, ip_hash) DO UPDATE SET count = count + 1 RETURNING count',
  )
    .bind(day, key)
    .first<{ count: number }>()
  if ((row?.count ?? 1) > limits.reportsPerDay) return json({ ok: false, error: 'rate_limited' }, 429)

  await env.DB.prepare('INSERT INTO reports (passage_id, reason) VALUES (?, ?)').bind(passageId, reason).run()
  return json({ ok: true })
}

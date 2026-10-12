// Prayer bells and the daily-portion reminder (reply 0032 part E).
//   GET  /api/push/key          → { publicKey } once VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY are set; 404 before (bells
//                                 stay hidden in the interface)
//   POST /api/push/subscribe    { subscription, cell: { lat, lng } (0.1°), tz, method, asr, adjust, prayers, ward, lang }
//   POST /api/push/unsubscribe  { endpoint } → the row is deleted
// The cron (every minute, env.next only) sends what is due through the push_subs (next_at) index, then sets each row's
// next bell; a subscription the push service no longer knows (404/410) is deleted. Nothing else is stored or logged.
import type { Env } from '../index'
import { BELLS, nextBell, validCell } from './schedule'
import { pushMessage, PUSH_TEXT } from './strings'
import { allowedEndpoint, b64urlToBytes, sendPush } from './webpush'

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })
const MISSED_MS = 15 * 60_000

type PushEnv = Env & { VAPID_PUBLIC_KEY?: string; VAPID_PRIVATE_KEY?: string; VAPID_SUBJECT?: string }
export const vapidOf = (env: Env) => {
  const e = env as PushEnv
  if (!e.VAPID_PUBLIC_KEY || !e.VAPID_PRIVATE_KEY) return null
  return { publicRaw: b64urlToBytes(e.VAPID_PUBLIC_KEY), privateD: b64urlToBytes(e.VAPID_PRIVATE_KEY), subject: e.VAPID_SUBJECT || 'https://github.com/alkhammashtalal-sketch/i-muslim', publicKey: e.VAPID_PUBLIC_KEY }
}

const idOf = async (endpoint: string) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint)))].map((b) => b.toString(16).padStart(2, '0')).join('')

const validTz = (tz: unknown) => {
  if (typeof tz !== 'string' || tz.length > 64) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export async function handlePush(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (!url.pathname.startsWith('/api/push/')) return null
  const vapid = vapidOf(env)
  if (!vapid) return json({ ok: false, error: 'not_configured' }, 404)
  if (url.pathname === '/api/push/key' && request.method === 'GET') return json({ publicKey: vapid.publicKey })
  if (request.method !== 'POST') return json({ ok: false, error: 'not_found' }, 404)
  if (Number(request.headers.get('content-length') ?? 0) > 4096) return json({ ok: false, error: 'too_large' }, 413)
  const body = (await request.json().catch(() => null)) as Record<string, any> | null
  if (!body) return json({ ok: false, error: 'bad_request' }, 400)

  if (url.pathname === '/api/push/unsubscribe') {
    if (typeof body.endpoint !== 'string') return json({ ok: false, error: 'bad_request' }, 400)
    await env.DB.prepare('DELETE FROM push_subs WHERE id = ?').bind(await idOf(body.endpoint)).run()
    return json({ ok: true })
  }
  if (url.pathname !== '/api/push/subscribe') return json({ ok: false, error: 'not_found' }, 404)

  const sub = body.subscription
  const endpoint = sub?.endpoint
  const p256dh = sub?.keys?.p256dh
  const auth = sub?.keys?.auth
  const prayers = Array.isArray(body.prayers) ? body.prayers.filter((p: unknown) => (BELLS as readonly unknown[]).includes(p)) : []
  const ward = typeof body.ward === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(body.ward) ? body.ward : null
  const adjust = body.adjust && typeof body.adjust === 'object' ? Object.fromEntries(Object.entries(body.adjust).filter(([k, v]) => (BELLS as readonly string[]).includes(k) && Number.isInteger(v) && Math.abs(v as number) <= 30)) : {}
  if (
    typeof endpoint !== 'string' || !allowedEndpoint(endpoint) || endpoint.length > 1024 ||
    typeof p256dh !== 'string' || b64urlToBytes(p256dh).length !== 65 || typeof auth !== 'string' || b64urlToBytes(auth).length !== 16 ||
    !validCell(body.cell?.lat, body.cell?.lng) || !validTz(body.tz) || !(typeof body.lang === 'string' && body.lang in PUSH_TEXT)
  )
    return json({ ok: false, error: 'bad_request' }, 400)
  const id = await idOf(endpoint)
  const row = {
    cell_lat: body.cell.lat as number,
    cell_lng: body.cell.lng as number,
    tz: body.tz as string,
    method: typeof body.method === 'string' ? body.method.slice(0, 32) : 'UmmAlQura',
    asr: body.asr === 'hanafi' ? 'hanafi' : 'shafi',
    adjust: JSON.stringify(adjust),
    prayers: JSON.stringify(prayers),
    ward,
  }
  const next = nextBell(row, new Date())
  if (!next) {
    await env.DB.prepare('DELETE FROM push_subs WHERE id = ?').bind(id).run()
    return json({ ok: true, next: null })
  }
  await env.DB.prepare(
    'INSERT OR REPLACE INTO push_subs (id, endpoint, p256dh, auth, cell_lat, cell_lng, tz, method, asr, adjust, prayers, ward, lang, next_at, next_kind) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, endpoint, p256dh, auth, row.cell_lat, row.cell_lng, row.tz, row.method, row.asr, row.adjust, row.prayers, row.ward, body.lang, next.at, next.kind)
    .run()
  return json({ ok: true, next })
}

/** The cron's work: send what is due now, reschedule each row. Returns counts for the log (no row content). */
export async function runDue(env: Env, now = new Date(), send = sendPush): Promise<{ sent: number; gone: number; skipped: number }> {
  const vapid = vapidOf(env)
  const out = { sent: 0, gone: 0, skipped: 0 }
  if (!vapid) return out
  const { results } = await env.DB.prepare('SELECT * FROM push_subs WHERE next_at <= ? ORDER BY next_at LIMIT 200').bind(now.getTime()).all<Record<string, any>>()
  for (const r of results) {
    let status = 0
    if (now.getTime() - r.next_at > MISSED_MS) out.skipped++
    else {
      status = await send({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }, pushMessage(r.lang, r.next_kind), vapid).catch(() => 0)
      if (status === 404 || status === 410) {
        await env.DB.prepare('DELETE FROM push_subs WHERE id = ?').bind(r.id).run()
        out.gone++
        continue
      }
      out.sent++
    }
    const next = nextBell(r as never, new Date(Math.max(now.getTime(), r.next_at) + 1000))
    if (next) await env.DB.prepare('UPDATE push_subs SET next_at = ?, next_kind = ? WHERE id = ?').bind(next.at, next.kind, r.id).run()
    else await env.DB.prepare('DELETE FROM push_subs WHERE id = ?').bind(r.id).run()
  }
  return out
}

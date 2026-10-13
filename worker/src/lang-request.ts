// POST /api/lang-request — { text } (reply 0033 §أ1): someone asked for a language the app does not serve yet.
// Stored: the name as the device normalised it (folded again here, the same way: shared/lang-norm.ts) and a count per
// month (migration 0012). Not stored: the IP, the exact time, any identifier. Accepted when the text is 2 to 40
// characters, letters and spaces only. The daily limit is the shared per-device counter (bump, scope 'lang'): 5 a day.
import { foldText, validRequest } from '../../shared/lang-norm'
import { bump } from './ask'
import type { Env } from './index'
import { riyadhMonth } from './lib/keys'

export const LANG_REQUESTS_PER_DAY = 5

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

/** The text that would be stored, or null when it is not accepted. */
export function requestText(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > 200) return null
  const t = foldText(v)
  return validRequest(t) ? t : null
}

/** Count one request for a language this month; returns the month's count. */
export async function countRequest(env: Env, text: string, now = Date.now()): Promise<number> {
  const row = await env.DB.prepare(
    'INSERT INTO lang_requests (text, month, count) VALUES (?, ?, 1) ON CONFLICT(text, month) DO UPDATE SET count = count + 1 RETURNING count',
  )
    .bind(text, riyadhMonth(now))
    .first<{ count: number }>()
  return row?.count ?? 1
}

export async function handleLangRequest(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { text?: unknown } | null
  const text = requestText(body?.text)
  if (!text) return json({ ok: false, error: 'bad_input' }, 400)
  if (!env.IP_SALT) return json({ ok: false, error: 'server' }, 500)
  if ((await bump(env, env.IP_SALT, request.headers.get('cf-connecting-ip') ?? 'unknown', 'lang')) > LANG_REQUESTS_PER_DAY) {
    return json({ ok: false, error: 'rate_limited' }, 429)
  }
  await countRequest(env, text)
  return json({ ok: true })
}

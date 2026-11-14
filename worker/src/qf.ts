// Quran Foundation's Content API (add-ons 0071-add2 §4 and §5, 0071-add14; source ك in CLAUDE.md §2): the Latin
// transliteration of the ayat (translation 57, «Transliteration») and Ibn Kathir abridged in English (tafsir 169,
// «Ibn Kathir (Abridged)»), each shown as the source gives it, credited to Quran Foundation where it is shown.
//
// From their documentation (api-docs.quran.foundation, read 22 October 2026):
//   - OAuth2 client credentials: POST {oauth}/oauth2/token, «grant_type=client_credentials&scope=content», HTTP Basic
//     with the client id and secret; the token lives 3600 s («Cache the access_token until it is close to expiry»).
//   - Requests carry `x-auth-token` and `x-client-id`. Prelive and Production have their own hosts (QF_ENV).
//   - Developer terms (updated 2026-10-11) §2.1: not «Cache or store QF Content longer than 1 week» outside Content Sync;
//     §2.2: «credits Quran Foundation in a reasonably accessible place»; §2.3: no exceeding published rate limits (no
//     number is published; on a 429, back off).
// So: the token lives in the isolate until a minute before it expires; the secret never leaves the server; each answer
// is kept at the edge and in the client for CACHE_S (six days, under their week); a 429 is answered 503 to the app,
// which shows nothing from QF then. Nothing is stored in D1.
import type { Env } from './index'

export const QF_TRANSLIT = 57
export const QF_KATHEER_EN = 169
export const QF_CREDIT = { name: 'Quran Foundation', url: 'https://quran.foundation' }
/** Six days: under the week of their terms (§2.1). */
export const CACHE_S = 6 * 86_400

const HOSTS = {
  prelive: { oauth: 'https://prelive-oauth2.quran.foundation/oauth2/token', api: 'https://apis-prelive.quran.foundation/content/api/v4' },
  production: { oauth: 'https://oauth2.quran.foundation/oauth2/token', api: 'https://apis.quran.foundation/content/api/v4' },
} as const

const hosts = (env: Env) => HOSTS[env.QF_ENV === 'production' ? 'production' : 'prelive']

let token: { value: string; until: number; env: string } | null = null

/** A token of the client credentials, kept until a minute before it expires; null when it cannot be had. */
export async function accessToken(env: Env, fetcher: typeof fetch = fetch, now = Date.now()): Promise<string | null> {
  if (!env.QF_CLIENT_ID || !env.QF_CLIENT_SECRET) return null
  const which = env.QF_ENV === 'production' ? 'production' : 'prelive'
  if (token && token.env === which && token.until > now) return token.value
  const res = await fetcher(hosts(env).oauth, {
    method: 'POST',
    headers: { authorization: `Basic ${btoa(`${env.QF_CLIENT_ID}:${env.QF_CLIENT_SECRET}`)}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&scope=content',
  }).catch(() => null)
  if (!res?.ok) return null
  const j = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null
  if (!j?.access_token) return null
  token = { value: j.access_token, until: now + Math.max(60, (j.expires_in ?? 3600) - 60) * 1000, env: which }
  return token.value
}

/** For tests: forget the token. */
export const resetToken = () => void (token = null)

/** GET a Content API path; one retry with a new token on 401; null on any failure (a 429 included). */
async function qfGet(env: Env, path: string, fetcher: typeof fetch = fetch): Promise<unknown | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const t = await accessToken(env, fetcher)
    if (!t) return null
    const res = await fetcher(`${hosts(env).api}${path}`, { headers: { 'x-auth-token': t, 'x-client-id': env.QF_CLIENT_ID! } }).catch(() => null)
    if (res?.status === 401 && attempt === 0) {
      resetToken()
      continue
    }
    if (!res?.ok) {
      if (res?.status === 429) console.log(JSON.stringify({ evt: 'qf_rate_limited' }))
      return null
    }
    return res.json().catch(() => null)
  }
  return null
}

/** The tafsir's HTML as headings and paragraphs of plain text, in order; every other tag dropped, entities decoded. */
export function blocksOf(html: string): { type: 'h' | 'p'; text: string }[] {
  const decode = (s: string) =>
    s
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/[ \t]+/g, ' ')
      .trim()
  const out: { type: 'h' | 'p'; text: string }[] = []
  for (const m of html.matchAll(/<(h[1-6]|p)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = decode(m[2])
    if (text) out.push({ type: m[1].toLowerCase() === 'p' ? 'p' : 'h', text })
  }
  if (!out.length) {
    const text = decode(html)
    if (text) out.push({ type: 'p', text })
  }
  return out
}

const json = (data: unknown, status = 200, cache = true) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache && status === 200 ? `public, max-age=${CACHE_S}` : 'no-store' },
  })

/** Kept at the edge for CACHE_S, by the request's URL. */
async function edge(request: Request, make: () => Promise<Response>): Promise<Response> {
  const cache = (globalThis as { caches?: { default?: Cache } }).caches?.default
  const key = new Request(new URL(request.url).toString(), { method: 'GET' })
  const hit = cache ? await cache.match(key).catch(() => undefined) : undefined
  if (hit) return hit
  const res = await make()
  if (cache && res.status === 200) await cache.put(key, res.clone()).catch(() => undefined)
  return res
}

/**
 *   GET /api/qf/translit/:sura          → { sura, ayat: [{ aya, text }], resource, source }
 *   GET /api/qf/katheer-en/:sura/:aya    → { id, covers: ['s:a', …], blocks: [{ type, text }], resource, source }
 * 404 when this environment has no QF keys (only v11 has them); 503 when QF does not answer.
 */
export async function handleQf(request: Request, env: Env, url: URL, fetcher: typeof fetch = fetch): Promise<Response | null> {
  if (request.method !== 'GET' || !url.pathname.startsWith('/api/qf/')) return null
  if (!env.QF_CLIENT_ID || !env.QF_CLIENT_SECRET) return json({ ok: false, error: 'not_configured' }, 404, false)
  const tr = url.pathname.match(/^\/api\/qf\/translit\/(\d{1,3})$/)
  const kt = url.pathname.match(/^\/api\/qf\/katheer-en\/(\d{1,3})\/(\d{1,3})$/)
  const sura = Number((tr ?? kt)?.[1])
  if (!(tr || kt) || sura < 1 || sura > 114) return json({ ok: false, error: 'not_found' }, 404, false)
  return edge(request, async () => {
    if (tr) {
      const j = (await qfGet(env, `/quran/translations/${QF_TRANSLIT}?chapter_number=${sura}&fields=verse_key`, fetcher)) as {
        translations?: { verse_key?: string; text?: string }[]
      } | null
      const rows = (j?.translations ?? []).filter((t) => typeof t.verse_key === 'string' && typeof t.text === 'string' && t.verse_key.startsWith(`${sura}:`))
      if (!rows.length) return json({ ok: false, error: 'unavailable' }, 503, false)
      return json({
        sura,
        ayat: rows.map((t) => ({ aya: Number(t.verse_key!.split(':')[1]), text: t.text! })),
        resource: { id: QF_TRANSLIT, name: 'Transliteration' },
        source: QF_CREDIT,
      })
    }
    const aya = Number(kt![2])
    if (aya < 1 || aya > 286) return json({ ok: false, error: 'not_found' }, 404, false)
    const j = (await qfGet(env, `/tafsirs/${QF_KATHEER_EN}/by_ayah/${sura}:${aya}`, fetcher)) as {
      tafsir?: { text?: string; resource_name?: string; verses?: Record<string, unknown> }
    } | null
    const text = j?.tafsir?.text
    if (typeof text !== 'string') return json({ ok: false, error: 'unavailable' }, 503, false)
    const blocks = blocksOf(text)
    return json({
      id: `quran:${sura}:${aya}`,
      covers: Object.keys(j!.tafsir!.verses ?? {}),
      blocks,
      resource: { id: QF_KATHEER_EN, name: j!.tafsir!.resource_name ?? 'Ibn Kathir (Abridged)' },
      source: QF_CREDIT,
    })
  })
}

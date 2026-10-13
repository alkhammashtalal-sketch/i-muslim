// Nearby mosques (reply 0031-add10, §6), server side: one Overpass query per ~1 km cell, on the user's tap.
//   GET /api/mosques?cell=24.71,46.67 → { cell, mosques: [{ id, name, lat, lng }], attribution }
// The device sends the cell only (its coordinates rounded to 0.01°), and sorts by exact distance itself. Nothing about
// the request is stored except the cell's cached answer and, below, the daily counter under the device key (an HMAC,
// never the IP). Overpass's usage policy: a clear User-Agent, one request at a
// time (per isolate here), a 30-second pause after 429, and a cache (7 days per cell). A lookup that would reach
// Overpass counts against the device's day (bump, scope 'mosques', limits.mosquesPerDay; reply 0033 §د): a cached
// cell never does, so the limit only stops someone walking the grid at Overpass's expense, and ours.
// The cache and the backoff are caches.default, which is per Cloudflare data centre. It works on next's *.workers.dev
// (checked 13 Oct with tail: a key's first sources/status read took 55–58 ms wall, the repeats 5–9 ms, same
// 'https://cache.i-muslim/…' key form; /api/suras answered cf-cache-status HIT with age 41,722 s). A cell kept in
// one data centre is a new lookup, and counts, in another.
// Reply 0043 ج: the main instance answered 504 to 10 of 14 lookups on 13 October (20:59–21:08 Riyadh), and «busy»
// then held every cell for 30 seconds. Now each instance has its own pause, a request that waits more than TIMEOUT_MS
// counts as busy, and each answer logs its status and time (no cell). A second instance, Private.coffee's (usage policy:
// https://overpass.private.coffee/ «free and unlimited … notify us in advance of any large operations»), is asked when
// the main one is busy, only if OVERPASS_MIRROR = "true": off until the privacy policy names it (Talal reviews it first).
// The iOS app does not come here: it searches Apple Maps on the phone (web/src/native/mosques.ts).
import { bump } from './ask'
import limits from './config/limits.json'
import type { Env } from './index'

const OVERPASS = 'https://overpass-api.de/api/interpreter'
const OVERPASS_MIRROR = 'https://overpass.private.coffee/api/interpreter'
const TIMEOUT_MS = 10_000
const UA = 'Muslim-app/1.0 (i-muslim-next; https://github.com/alkhammashtalal-sketch/i-muslim)'
const RADIUS_M = 3000
const CELL = /^(-?\d{1,2}\.\d{2}),(-?\d{1,3}\.\d{2})$/
const TTL = 7 * 86400
const BACKOFF_S = 30
export const ATTRIBUTION = { text: '© OpenStreetMap contributors', url: 'https://www.openstreetmap.org/copyright' }

type Mosque = { id: string; name: string | null; lat: number; lng: number }
const json = (data: unknown, status = 200, cache = 'no-store', extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache, ...extra } })

export function parseCell(cell: string | null): { lat: number; lng: number } | null {
  const m = CELL.exec(cell ?? '')
  if (!m) return null
  const lat = Number(m[1])
  const lng = Number(m[2])
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null
}

export const overpassQuery = (lat: number, lng: number) =>
  `[out:json][timeout:25];nwr["amenity"="place_of_worship"]["religion"="muslim"](around:${RADIUS_M},${lat},${lng});out center tags;`

export function toMosques(body: { elements?: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] }, lang: string): Mosque[] {
  return (body.elements ?? [])
    .map((e): Mosque | null => {
      const lat = e.lat ?? e.center?.lat
      const lng = e.lon ?? e.center?.lon
      const t = e.tags ?? {}
      return lat == null || lng == null ? null : { id: `${e.type}/${e.id}`, name: t[`name:${lang}`] ?? t.name ?? null, lat, lng }
    })
    .filter((m): m is Mosque => m !== null)
}

// One Overpass request at a time in this isolate.
let chain: Promise<unknown> = Promise.resolve()
const serial = <T>(f: () => Promise<T>): Promise<T> => {
  const p = chain.then(f, f)
  chain = p.catch(() => {})
  return p
}

export async function handleMosques(request: Request, env: Env, url: URL, fetcher: typeof fetch = fetch, cache: Cache | undefined = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default): Promise<Response | null> {
  if (url.pathname !== '/api/mosques' || request.method !== 'GET') return null
  const c = parseCell(url.searchParams.get('cell'))
  if (!c) return json({ ok: false, error: 'bad_cell' }, 400)
  const lang = /^[a-z]{2}$/.test(url.searchParams.get('lang') ?? '') ? url.searchParams.get('lang')! : 'ar'
  const cell = `${c.lat.toFixed(2)},${c.lng.toFixed(2)}`
  const key = new Request(`https://cache.i-muslim/mosques/${cell}`)
  const hosts = [{ name: 'main', at: OVERPASS }, ...(env.OVERPASS_MIRROR === 'true' ? [{ name: 'mirror', at: OVERPASS_MIRROR }] : [])]
  const backoffKey = (name: string) => new Request(`https://cache.i-muslim/overpass-backoff/${name}`)
  const hit = await cache?.match(key)
  if (hit) {
    const raw = (await hit.json()) as { elements?: [] }
    return json({ cell, mosques: toMosques(raw, lang), attribution: ATTRIBUTION }, 200, 'private, max-age=3600')
  }
  const ready: typeof hosts = []
  for (const h of hosts) if (!(await cache?.match(backoffKey(h.name)))) ready.push(h)
  if (!ready.length) return json({ ok: false, error: 'busy' }, 503, 'no-store', { 'retry-after': String(BACKOFF_S) })
  if (!env.IP_SALT) return json({ ok: false, error: 'server' }, 500)
  if ((await bump(env, env.IP_SALT, request.headers.get('cf-connecting-ip') ?? 'unknown', 'mosques')) > limits.mosquesPerDay) {
    return json({ ok: false, error: 'rate_limited' }, 429)
  }
  return serial(async () => {
    let r: Response | null = null
    for (const h of ready) {
      const t0 = Date.now()
      try {
        r = await fetcher(h.at, {
          method: 'POST',
          headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(overpassQuery(c.lat, c.lng))}`,
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
      } catch {
        r = null
      }
      console.log(JSON.stringify({ evt: 'overpass', host: h.name, status: r?.status ?? 0, ms: Date.now() - t0 }))
      if (r && r.status !== 429 && r.status !== 504) break
      await cache?.put(backoffKey(h.name), new Response('1', { headers: { 'cache-control': `max-age=${BACKOFF_S}` } }))
      r = null
    }
    if (!r) return json({ ok: false, error: 'busy' }, 503, 'no-store', { 'retry-after': String(BACKOFF_S) })
    if (!r.ok) return json({ ok: false, error: 'upstream' }, 502)
    const raw = (await r.json()) as { elements?: [] }
    // Keep only what we use (positions and names), so the cache holds no more than needed.
    const slim = { elements: (raw.elements ?? []).map((e: Record<string, unknown>) => ({ type: e.type, id: e.id, lat: e.lat, lon: e.lon, center: e.center, tags: Object.fromEntries(Object.entries((e.tags as Record<string, string>) ?? {}).filter(([k]) => k === 'name' || k.startsWith('name:'))) })) }
    await cache?.put(key, new Response(JSON.stringify(slim), { headers: { 'content-type': 'application/json', 'cache-control': `max-age=${TTL}` } }))
    return json({ cell, mosques: toMosques(slim as never, lang), attribution: ATTRIBUTION }, 200, 'private, max-age=3600')
  })
}

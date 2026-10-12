// Nearby mosques (reply 0031-add10, §6), server side: one Overpass query per ~1 km cell, on the user's tap.
//   GET /api/mosques?cell=24.71,46.67 → { cell, mosques: [{ id, name, lat, lng }], attribution }
// The device sends the cell only (its coordinates rounded to 0.01°), and sorts by exact distance itself. Nothing about
// the request is stored except the cell's cached answer. Overpass's usage policy: a clear User-Agent, one request at a
// time (per isolate here), a 30-second pause after 429, and a cache (7 days per cell).
import type { Env } from './index'

const OVERPASS = 'https://overpass-api.de/api/interpreter'
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

export async function handleMosques(request: Request, _env: Env, url: URL, fetcher: typeof fetch = fetch, cache: Cache | undefined = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default): Promise<Response | null> {
  if (url.pathname !== '/api/mosques' || request.method !== 'GET') return null
  const c = parseCell(url.searchParams.get('cell'))
  if (!c) return json({ ok: false, error: 'bad_cell' }, 400)
  const lang = /^[a-z]{2}$/.test(url.searchParams.get('lang') ?? '') ? url.searchParams.get('lang')! : 'ar'
  const cell = `${c.lat.toFixed(2)},${c.lng.toFixed(2)}`
  const key = new Request(`https://cache.i-muslim/mosques/${cell}`)
  const backoffKey = new Request('https://cache.i-muslim/overpass-backoff')
  const hit = await cache?.match(key)
  if (hit) {
    const raw = (await hit.json()) as { elements?: [] }
    return json({ cell, mosques: toMosques(raw, lang), attribution: ATTRIBUTION }, 200, 'private, max-age=3600')
  }
  if (await cache?.match(backoffKey)) return json({ ok: false, error: 'busy' }, 503, 'no-store', { 'retry-after': String(BACKOFF_S) })
  return serial(async () => {
    const r = await fetcher(OVERPASS, {
      method: 'POST',
      headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(overpassQuery(c.lat, c.lng))}`,
    })
    if (r.status === 429 || r.status === 504) {
      await cache?.put(backoffKey, new Response('1', { headers: { 'cache-control': `max-age=${BACKOFF_S}` } }))
      return json({ ok: false, error: 'busy' }, 503, 'no-store', { 'retry-after': String(BACKOFF_S) })
    }
    if (!r.ok) return json({ ok: false, error: 'upstream' }, 502)
    const raw = (await r.json()) as { elements?: [] }
    // Keep only what we use (positions and names), so the cache holds no more than needed.
    const slim = { elements: (raw.elements ?? []).map((e: Record<string, unknown>) => ({ type: e.type, id: e.id, lat: e.lat, lon: e.lon, center: e.center, tags: Object.fromEntries(Object.entries((e.tags as Record<string, string>) ?? {}).filter(([k]) => k === 'name' || k.startsWith('name:'))) })) }
    await cache?.put(key, new Response(JSON.stringify(slim), { headers: { 'content-type': 'application/json', 'cache-control': `max-age=${TTL}` } }))
    return json({ cell, mosques: toMosques(slim as never, lang), attribution: ATTRIBUTION }, 200, 'private, max-age=3600')
  })
}

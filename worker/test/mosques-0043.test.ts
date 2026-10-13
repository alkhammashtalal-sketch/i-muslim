// Reply 0043 ج: nearest mosques. The server: a pause per Overpass instance, a timeout that counts as busy, one log line
// with status and time (never the cell), and the second instance only when OVERPASS_MIRROR = "true" (off until the
// privacy policy names it). The iOS app: Apple Maps on the phone (MosqueSearchPlugin.swift), around the ~1 km cell,
// with «افتح خرائط أبل» when the search fails or finds nothing.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { appleMapsSearch } from '../../web/src/native/mosques'
import { TODAY } from '../../web/src/v2/daily/strings-today'
import type { Env } from '../src/index'
import { handleMosques } from '../src/mosques'

const ROOT = path.resolve(__dirname, '../..')
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')

class MemCache {
  m = new Map<string, Response>()
  async match(r: Request) {
    return this.m.get(r.url)?.clone()
  }
  async put(r: Request, res: Response) {
    this.m.set(r.url, res.clone())
  }
}
const baseEnv = { IP_SALT: 'test-salt', DB: { prepare: () => ({ bind: () => ({ first: async () => ({ count: 1 }) }) }) } }
const call = (cell: string, fetcher: typeof fetch, cache: MemCache, env: object = baseEnv) => {
  const url = new URL(`https://x.test/api/mosques?cell=${cell}&lang=ar`)
  return handleMosques(new Request(url), env as unknown as Env, url, fetcher, cache as unknown as Cache)
}
const ok = () => new Response(JSON.stringify({ elements: [{ type: 'node', id: 7, lat: 21.42, lon: 39.83, tags: { name: 'مسجد' } }] }))

describe('the server: Overpass, then busy', () => {
  afterEach(() => vi.restoreAllMocks())

  it('the mirror is off by default: one request to the main instance, 504 → busy, and its pause', async () => {
    const seen: string[] = []
    const cache = new MemCache()
    const fetcher = (async (u: string) => (seen.push(u), new Response('', { status: 504 }))) as unknown as typeof fetch
    const r = await call('21.42,39.83', fetcher, cache)
    expect([r!.status, (await r!.json()) as unknown]).toEqual([503, { ok: false, error: 'busy' }])
    expect(seen).toEqual(['https://overpass-api.de/api/interpreter'])
    expect([...cache.m.keys()]).toEqual(['https://cache.i-muslim/overpass-backoff/main'])
    expect((await call('21.43,39.83', fetcher, cache))!.status).toBe(503)
    expect(seen).toHaveLength(1)
  })

  it('with OVERPASS_MIRROR = "true", the second instance answers when the main one is busy, and is asked first while the main one pauses', async () => {
    const seen: string[] = []
    const cache = new MemCache()
    const fetcher = (async (u: string) => (seen.push(new URL(u).host), u.includes('private.coffee') ? ok() : new Response('', { status: 504 }))) as unknown as typeof fetch
    const env = { ...baseEnv, OVERPASS_MIRROR: 'true' }
    const r = await call('21.42,39.83', fetcher, cache, env)
    expect(r!.status).toBe(200)
    expect(((await r!.json()) as { mosques: unknown[] }).mosques).toEqual([{ id: 'node/7', name: 'مسجد', lat: 21.42, lng: 39.83 }])
    expect(seen).toEqual(['overpass-api.de', 'overpass.private.coffee'])
    await call('21.50,39.83', fetcher, cache, env)
    expect(seen).toEqual(['overpass-api.de', 'overpass.private.coffee', 'overpass.private.coffee'])
  })

  it('a request that fails or times out counts as busy; each answer logs status and time, never the cell', async () => {
    const lines: string[] = []
    vi.spyOn(console, 'log').mockImplementation((l: string) => void lines.push(l))
    const fetcher = (async (_u: string, init: RequestInit) => {
      expect(init.signal).toBeInstanceOf(AbortSignal)
      throw new DOMException('timed out', 'TimeoutError')
    }) as unknown as typeof fetch
    const r = await call('51.51,-0.13', fetcher, new MemCache())
    expect(r!.status).toBe(503)
    expect(lines).toHaveLength(1)
    const l = JSON.parse(lines[0]) as Record<string, unknown>
    expect(Object.keys(l)).toEqual(['evt', 'host', 'status', 'ms'])
    expect([l.evt, l.host, l.status]).toEqual(['overpass', 'main', 0])
    expect(lines[0]).not.toMatch(/51\.51|-0\.13/)
    expect(read('worker/src/mosques.ts')).toContain('const TIMEOUT_MS = 10_000')
  })
})

describe('the iOS app: Apple Maps on the phone', () => {
  const swift = read('web/ios/App/App/MosqueSearchPlugin.swift')
  const view = read('web/src/v2/daily/Mosques.tsx')

  it('a local plugin, built and registered, that searches «مسجد» and «mosque» and never asks for location', () => {
    expect(swift).toContain('public let jsName = "MosqueSearch"')
    expect(swift).toContain('let queries = ["مسجد", "mosque"]')
    expect(swift).toContain('MKLocalSearch(request: request)')
    expect(swift).toContain('request.resultTypes = .pointOfInterest')
    expect(swift).not.toMatch(/requestWhenInUseAuthorization|requestAlwaysAuthorization|CLLocationManager/)
    expect(read('web/ios/App/App/AppViewController.swift')).toContain('bridge?.registerPluginInstance(MosqueSearchPlugin())')
    expect(read('web/ios/App/App.xcodeproj/project.pbxproj').match(/MosqueSearchPlugin\.swift/g)).toHaveLength(6)
  })

  it('sends the ~1 km cell, not the position, and only in the iOS app', () => {
    expect(view).toContain("const ios = platform() === 'ios'")
    expect(view).toContain('searchNativeMosques(cellPoint(place), RADIUS_M)')
    expect(view).toContain('const cellPoint = (p: { lat: number; lng: number }) => ({ lat: Number(p.lat.toFixed(2)), lng: Number(p.lng.toFixed(2)) })')
    expect(appleMapsSearch({ lat: 24.6877, lng: 46.7219 })).toBe('https://maps.apple.com/?q=%D9%85%D8%B3%D8%AC%D8%AF&sll=24.69,46.72&z=14')
  })

  it('says Apple Maps where it is the source, in ten languages', () => {
    for (const [lang, s] of Object.entries(TODAY)) {
      expect(s.openAppleMaps, lang).toBeTruthy()
      expect(s.sourceAppleMaps, lang).toBeTruthy()
      expect(s.privacyMosquesApple, lang).not.toBe(s.privacyMosques)
    }
    expect([TODAY.ar.openAppleMaps, TODAY.ar.sourceAppleMaps]).toEqual(['افتح خرائط أبل', 'المصدر: خرائط أبل'])
    expect(TODAY.ar.privacyMosquesApple).toBe('يذهب موقع تقريبي، بدقة كيلو تقريبًا، إلى خرائط أبل عند البحث، ولا يصل إلينا. ونرتّب المساجد حسب المسافة على جوالك.')
    expect(view).toContain('{ios ? s.privacyMosquesApple : s.privacyMosques}')
  })
})

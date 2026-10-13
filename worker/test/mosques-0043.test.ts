// Reply 0043 ج: nearest mosques. The server: a pause per Overpass instance, a timeout that counts as busy, one log line
// with status and time (never the cell), and the second instance only when OVERPASS_MIRROR = "true" (off until the
// privacy policy names it). The iOS app: Apple Maps on the phone (MosqueSearchPlugin.swift), around the ~1 km cell,
// with «افتح خرائط أبل» when the search fails or finds nothing. 0043-add5: directions in Google Maps first (its app when
// installed, through @capacitor/app-launcher), a small «خرائط أبل» link, and «مسجد» with its street when unnamed.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { directions } from '../../web/src/daily/mosques'
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
const ok = () => new Response(JSON.stringify({ elements: [{ type: 'node', id: 7, lat: 21.42, lon: 39.83, tags: { name: 'مسجد' } }, { type: 'node', id: 8, lat: 21.43, lon: 39.83, tags: { 'addr:street': 'شارع إبراهيم الخليل', phone: '1' } }] }))

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
    expect(((await r!.json()) as { mosques: unknown[] }).mosques).toEqual([
      { id: 'node/7', name: 'مسجد', street: null, lat: 21.42, lng: 39.83 },
      { id: 'node/8', name: null, street: 'شارع إبراهيم الخليل', lat: 21.43, lng: 39.83 },
    ])
    // The cache keeps names and the street, nothing else, under the v2 key.
    const kept = await (await cache.match(new Request('https://cache.i-muslim/mosques/v2/21.42,39.83')))!.json()
    expect(JSON.stringify(kept)).not.toContain('phone')
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
    // A 1 km square and the radius's: Apple returns at most 25 places a search, the most relevant, not the nearest.
    expect(swift).toContain('let spans = radius > 1000 ? [1000, radius] : [radius]')
    expect(swift).toContain('for (q, span) in searches {')
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
    expect(TODAY.ar.privacyMosquesApple).toBe('يذهب موقع تقريبي، بدقة كيلو تقريبًا، إلى خرائط أبل عند البحث، ولا يصل إلينا. ونرتّب المساجد حسب المسافة على جوالك، والاتجاهات تفتح في خرائط جوجل أو أبل.')
    expect(view).toContain('{ios ? s.privacyMosquesApple : s.privacyMosques}')
  })
})

describe('directions (0043-add5): Google Maps first, outside the app, to the mosque itself', () => {
  const view = read('web/src/v2/daily/Mosques.tsx')
  const maps = read('web/src/native/maps.ts')

  it('the three links carry the mosque’s own coordinates, for driving', () => {
    expect(directions({ lat: 21.4225, lng: 39.8262 })).toEqual({
      google: 'https://www.google.com/maps/dir/?api=1&destination=21.4225,39.8262&travelmode=driving',
      googleApp: 'comgooglemaps://?daddr=21.4225,39.8262&directionsmode=driving',
      apple: 'https://maps.apple.com/?daddr=21.4225,39.8262&dirflg=d',
    })
  })

  it('in the app, @capacitor/app-launcher opens them (the system, not the web view); the Google Maps app when iOS says it is installed', () => {
    expect(maps).toContain("import { AppLauncher } from '@capacitor/app-launcher'")
    expect(maps).toContain("AppLauncher.canOpenUrl({ url: 'comgooglemaps://' })")
    expect(maps).toContain('url = d.googleApp')
    expect(maps).toContain('await AppLauncher.openUrl({ url })')
    expect(maps).toContain('AppLauncher.openUrl({ url: d.apple })')
    expect(view).toContain('void openGoogleDirections(d)')
    expect(view).toContain('void openAppleDirections(d)')
    expect(view).toContain('void AppLauncher.openUrl({ url: mapsSearch })')
    expect(view).toContain('href={d.google}')
    expect(read('web/ios/App/App/Info.plist')).toMatch(/<key>LSApplicationQueriesSchemes<\/key>\s*<array>\s*<string>comgooglemaps<\/string>\s*<\/array>/)
    const pkg = JSON.parse(read('web/package.json')) as { dependencies: Record<string, string> }
    expect(pkg.dependencies['@capacitor/app-launcher']).toBe('8.0.1')
    expect(read('docs/COMPONENTS.csv')).toContain('library,@capacitor/app-launcher 8.0.1')
  })

  it('an unnamed mosque shows «مسجد» with its street; the Apple link has its label in ten languages', () => {
    expect(view).toContain('const name = m.name ?? (m.street ? `${s.unnamedMosque} · ${m.street}` : s.unnamedMosque)')
    for (const [lang, s] of Object.entries(TODAY)) {
      expect(s.appleMapsLink, lang).toBeTruthy()
      expect(s.appleDirectionsTo, lang).toContain('{m}')
    }
    expect([TODAY.ar.appleMapsLink, TODAY.ar.appleDirectionsTo]).toEqual(['خرائط أبل', 'الاتجاهات إلى {m} في خرائط أبل'])
  })
})

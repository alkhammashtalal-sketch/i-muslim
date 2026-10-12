// Device-side engines of reply 0031-add10 (location, mosques, goals) and the /api/mosques route.
import { describe, expect, it } from 'vitest'
import { daysDone, loadGoals, saveGoals, setDone, type Goal } from '../../web/src/daily/goals'
import { placeFromCity, savedPlace, savePlace, searchCities, type CityRow } from '../../web/src/daily/location'
import { byDistance, cellOf, directions, distanceM } from '../../web/src/daily/mosques'
import type { Env } from '../src/index'
import { handleMosques, overpassQuery, parseCell } from '../src/mosques'

class MemStorage {
  m = new Map<string, string>()
  getItem = (k: string) => this.m.get(k) ?? null
  setItem = (k: string, v: string) => void this.m.set(k, v)
}
class MemCache {
  m = new Map<string, Response>()
  async match(r: Request) {
    return this.m.get(r.url)?.clone()
  }
  async put(r: Request, res: Response) {
    this.m.set(r.url, res.clone())
  }
}

describe('location: on the device only', () => {
  it('saves and reads the place; rejects broken values', () => {
    const s = new MemStorage()
    expect(savedPlace(s)).toBeNull()
    savePlace({ lat: 24.7, lng: 46.7, timeZone: 'Asia/Riyadh', source: 'gps' }, s)
    expect(savedPlace(s)).toMatchObject({ lat: 24.7, timeZone: 'Asia/Riyadh' })
    s.setItem('muslim.place.v1', '{"lat":"x"}')
    expect(savedPlace(s)).toBeNull()
  })
  it('finds a city by its Latin or Arabic name, hamza and taa marbuta folded', () => {
    const rows: CityRow[] = [
      ['Riyadh', 'الرياض', 24.6877, 46.7219, 'SA', 'Asia/Riyadh', 4205961],
      ['Abha', 'أبها', 18.2164, 42.5053, 'SA', 'Asia/Riyadh', 210886],
      ['Jeddah', 'جدة', 21.4901, 39.1862, 'SA', 'Asia/Riyadh', 4697000],
    ]
    expect(searchCities(rows, 'riy').map((r) => r[0])).toEqual(['Riyadh'])
    expect(searchCities(rows, 'ابها').map((r) => r[0])).toEqual(['Abha'])
    expect(searchCities(rows, 'جده').map((r) => r[0])).toEqual(['Jeddah'])
    expect(placeFromCity(rows[0])).toEqual({ lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' })
  })
})

describe('mosques: the device sends a ~1 km cell, sorts by exact distance', () => {
  it('cell = coordinates rounded to 0.01°', () => {
    expect(cellOf({ lat: 24.68771, lng: 46.72194 })).toBe('24.69,46.72')
    expect(parseCell('24.69,46.72')).toEqual({ lat: 24.69, lng: 46.72 })
    for (const bad of ['24.687,46.72', '24.69', '24.69,46.72;x', '95.00,1.00', null]) expect(parseCell(bad)).toBeNull()
  })
  it('distance and order', () => {
    const me = { lat: 24.7, lng: 46.7 }
    expect(distanceM(me, { lat: 24.71, lng: 46.7 })).toBeCloseTo(1112, -1)
    const list = byDistance(me, [
      { id: 'b', name: null, lat: 24.72, lng: 46.7 },
      { id: 'a', name: 'م', lat: 24.701, lng: 46.7 },
    ])
    expect(list.map((m) => m.id)).toEqual(['a', 'b'])
    expect(directions({ lat: 1, lng: 2 }).google).toBe('https://www.google.com/maps/dir/?api=1&destination=1,2')
  })

  const env = {} as Env
  const call = (cell: string, fetcher: typeof fetch, cache: MemCache) => {
    const url = new URL(`https://x.test/api/mosques?cell=${cell}&lang=ar`)
    return handleMosques(new Request(url), env, url, fetcher, cache as unknown as Cache)
  }
  it('one Overpass request per cell, with a User-Agent, then the cache', async () => {
    const cache = new MemCache()
    const seen: RequestInit[] = []
    const fetcher = (async (_u: string, init: RequestInit) => {
      seen.push(init)
      return new Response(JSON.stringify({ elements: [{ type: 'node', id: 1, lat: 24.7, lon: 46.7, tags: { name: 'جامع', 'name:en': 'Mosque', amenity: 'x', phone: '1' } }, { type: 'way', id: 2, center: { lat: 24.71, lon: 46.71 }, tags: {} }] }))
    }) as unknown as typeof fetch
    const r1 = await call('24.70,46.70', fetcher, cache)
    const b1 = (await r1!.json()) as { mosques: unknown[]; attribution: { text: string } }
    expect(b1.mosques).toEqual([
      { id: 'node/1', name: 'جامع', lat: 24.7, lng: 46.7 },
      { id: 'way/2', name: null, lat: 24.71, lng: 46.71 },
    ])
    expect(b1.attribution.text).toBe('© OpenStreetMap contributors')
    expect((seen[0].headers as Record<string, string>)['user-agent']).toMatch(/^Muslim-app\//)
    expect(decodeURIComponent(String(seen[0].body))).toContain(overpassQuery(24.7, 46.7))
    await call('24.70,46.70', fetcher, cache)
    expect(seen).toHaveLength(1)
    // The cache keeps names only, not other tags.
    expect(JSON.stringify([...cache.m.values()].length)).toBe('1')
  })
  it('429 → 503 with retry-after 30, and no further request while backing off', async () => {
    const cache = new MemCache()
    let n = 0
    const fetcher = (async () => (n++, new Response('', { status: 429 }))) as unknown as typeof fetch
    const r = await call('10.00,10.00', fetcher, cache)
    expect([r!.status, r!.headers.get('retry-after')]).toEqual([503, '30'])
    expect((await call('11.00,11.00', fetcher, cache))!.status).toBe(503)
    expect(n).toBe(1)
  })
  it('a bad cell never reaches Overpass', async () => {
    let n = 0
    const r = await call('24.6877,46.72', (async () => (n++, new Response('{}'))) as unknown as typeof fetch, new MemCache())
    expect([r!.status, n]).toEqual([400, 0])
  })
})

describe('goals: days done, never a streak, never reset', () => {
  it('counts distinct days and survives a missed day', () => {
    let g: Goal = { id: 'g', title: 'ورد', createdAt: '2026-10-13', doneDays: [] }
    g = setDone(g, '2026-10-13', true)
    g = setDone(g, '2026-10-13', true)
    g = setDone(g, '2026-10-15', true)
    expect(daysDone(g)).toBe(2)
    g = setDone(g, '2026-10-15', false)
    expect(g.doneDays).toEqual(['2026-10-13'])
    const s = new MemStorage()
    saveGoals([g], s)
    expect(loadGoals(s)).toEqual([g])
    s.setItem('muslim.goals.v1', 'not json')
    expect(loadGoals(s)).toEqual([])
  })
})

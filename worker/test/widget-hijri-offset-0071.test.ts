// Add-on 0071-add15 §3: the widgets' Hijri date (web/src/native/widget-data.ts) takes the same total offset as the
// date card's disc and its occasion line (cardHijri, web/src/v2/home/occasions.ts): the user's and the global one from
// the server's file. So the widgets, the card and the line never disagree by a day. The global offset is read once per
// run of the app (store.ts caches it), so each global value here is a fresh import of the modules.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

class MemStorage {
  m = new Map<string, string>()
  getItem = (k: string) => this.m.get(k) ?? null
  setItem = (k: string, v: string) => void this.m.set(k, v)
  removeItem = (k: string) => void this.m.delete(k)
  clear = () => this.m.clear()
}
const store = new MemStorage()
vi.stubGlobal('localStorage', store)

// The device's own zone for the place, so the widget's day and the card's «now» are the same civil date.
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone
const NOW = new Date('2026-10-22T09:00:00Z')
let GLOBAL = 0
const asked: string[] = []

beforeAll(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    const u = new URL(url, 'https://x.test')
    if (u.pathname === '/config/hijri.json' || u.pathname === '/api/config/hijri') {
      asked.push(u.pathname)
      return new Response(JSON.stringify({ offset: GLOBAL }))
    }
    // The ayah, hadith, tasbih and adhkar: not needed here.
    return new Response('{}', { status: 404 })
  })
})
afterAll(() => vi.unstubAllGlobals())

async function fresh() {
  vi.resetModules()
  const { buildWidgetData } = await import('../../web/src/native/widget-data')
  const { cardHijri, holdsOn } = await import('../../web/src/v2/home/occasions')
  const { hijriDisc } = await import('../../web/src/v2/home/hijri-disc')
  const { hijriParts, totalOffset } = await import('../../web/src/daily/hijri')
  return { buildWidgetData, cardHijri, holdsOn, hijriDisc, hijriParts, totalOffset }
}

describe('the widgets’ Hijri day is the card’s and the line’s, under the same offset', () => {
  // [user, global]: the user's −2..+2 with no global offset, then the global one with the user's.
  const cases: [number, number][] = [
    [-2, 0],
    [-1, 0],
    [0, 0],
    [1, 0],
    [2, 0],
    [1, -1],
    [0, 1],
    [1, 1],
  ]
  for (const [user, global] of cases)
    it(`user ${user}, global ${global}`, async () => {
      GLOBAL = global
      store.clear()
      store.setItem('imuslim.settings.v1', JSON.stringify({ lang: 'ar', content: 'ar' }))
      store.setItem('muslim.place.v1', JSON.stringify({ lat: 24.6877, lng: 46.7219, timeZone: TZ, name: 'الرياض', source: 'city' }))
      if (user) store.setItem('muslim.hijri.offset.v1', String(user))
      const m = await fresh()
      const total = m.totalOffset(user, global)
      const data = await m.buildWidgetData(NOW)
      for (const k of [0, 1, 2, 13, 29, 59]) {
        const day = data.days[k]
        const noon = new Date(day.start + 12 * 3600_000)
        const card = m.cardHijri('ar', noon, total)
        // The widget's day, month, year and full date are the card's disc's.
        expect(day.hijri, `day ${k}`).toEqual({ day: card.disc!.day, month: card.disc!.month, year: card.disc!.year, text: card.disc!.full })
        // And the offset is really in it: it is the plain date of the day `total` days on.
        const shifted = m.hijriDisc('ar', new Date(noon.getTime() + total * 86_400_000))!
        expect(day.hijri.day, `day ${k}`).toBe(shifted.day)
        // The line: an occasion of «today» holds on that same Hijri day.
        if (card.occasion!.days === 0) expect(m.holdsOn(card.occasion!.occasion, m.hijriParts(noon, total)!), `day ${k}`).toBe(true)
      }
    })

  it('the global offset was read from the server’s file', () => {
    expect(asked.length).toBeGreaterThan(0)
  })

  it('12 Jumada I 1448 with the user’s +1: the widget says 13, as the card does, and the line says «today»', async () => {
    GLOBAL = 0
    store.clear()
    store.setItem('imuslim.settings.v1', JSON.stringify({ lang: 'ar', content: 'ar' }))
    store.setItem('muslim.place.v1', JSON.stringify({ lat: 24.6877, lng: 46.7219, timeZone: TZ, name: 'الرياض', source: 'city' }))
    store.setItem('muslim.hijri.offset.v1', '1')
    const m = await fresh()
    const data = await m.buildWidgetData(new Date('2026-10-23T09:00:00Z'))
    const noon = new Date(data.days[0].start + 12 * 3600_000)
    expect(data.days[0].hijri.day).toBe('١٣')
    expect(m.cardHijri('ar', noon, 1).disc!.day).toBe('١٣')
    expect(m.cardHijri('ar', noon, 1).occasion).toMatchObject({ days: 0, occasion: { key: 'white_days' } })
  })
})

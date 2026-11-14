// The sky with the time of day (add-on 0071-add16, after Team A's and Team B's reviews in
// relay/w1/0071-market/sky-review/): the state from adhan's own object (Team B T1, T2 and T5's unit part), the light's
// place, the next bound, the painting untouched beside its two masks, and the CSS's guards. The page tests are
// web/e2e/v2-0071-sky.spec.ts.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { dayObject, timesOf, ymdIn, type Method, type PrayerOptions, type Ymd } from '../../web/src/daily/prayer'
import { SKY_OF, nextBound, skyLight, skyStateOf, starSet, type Current, type SkyState } from '../../web/src/v2/home/sky-state'
import { BOXES, cornerTexts, fitsCorner } from '../../web/src/v2/home/corner-fit'

const WEB = path.resolve(import.meta.dirname, '../../web')
type Place = { lat: number; lng: number; timeZone: string }
const RIYADH: Place = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh' }
const FIVE = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

/** As the app evaluates: adhan's object for today's date in the PLACE's time zone. */
const objAt = (place: Place, now: Date, opts: PrayerOptions = {}) => dayObject(place, ymdIn(now, place.timeZone), opts)
const nextYmd = ({ y, m, d }: Ymd): Ymd => {
  const t = new Date(Date.UTC(y, m - 1, d + 1))
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}
/** The next-prayer line's prayer, by the line's own rule (PrayerTimes.tsx prayerState): the first of the five after
 *  now, else tomorrow's Fajr. */
function lineNext(place: Place, now: Date, opts: PrayerOptions = {}) {
  const t = timesOf(objAt(place, now, opts))
  for (const n of FIVE) if (t[n] > now) return n
  return 'fajr'
}
/** The line's prayer for each of adhan's current prayers (Team B's table): sunrise is skipped. */
const NEXT_OF: Record<Current, string> = { none: 'fajr', fajr: 'dhuhr', sunrise: 'dhuhr', dhuhr: 'asr', asr: 'maghrib', maghrib: 'isha', isha: 'fajr' }

describe('T1: the state at each bound in Riyadh on 22 October 2026, and the line changes with it', () => {
  const day = objAt(RIYADH, new Date('2026-10-22T12:00:00+03:00'))
  const t = timesOf(day)
  const hhmm = (d: Date) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Riyadh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)
  it('has the shots’ times (adhan rounds to the minute)', () => {
    expect([t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha].map(hhmm)).toEqual(['04:36', '05:54', '11:38', '14:54', '17:20', '18:50'])
  })
  const cases: [keyof typeof t & ('fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'), SkyState, SkyState][] = [
    ['fajr', 'night', 'fajr'],
    ['sunrise', 'fajr', 'morning'],
    ['dhuhr', 'morning', 'dhuhr'],
    ['asr', 'dhuhr', 'asr'],
    ['maghrib', 'asr', 'maghrib'],
    ['isha', 'maghrib', 'night'],
  ]
  for (const [k, before, after] of cases)
    it(`${k}: −1 s ${before}, 0 and +1 s ${after}`, () => {
      const at = t[k].getTime()
      expect(skyStateOf(day.pt, new Date(at - 1000))).toBe(before)
      expect(skyStateOf(day.pt, new Date(at))).toBe(after)
      expect(skyStateOf(day.pt, new Date(at + 1000))).toBe(after)
      // The line moves at the same instant at the five prayers, and not at sunrise.
      const l0 = lineNext(RIYADH, new Date(at - 1000))
      const l1 = lineNext(RIYADH, new Date(at))
      if (k === 'sunrise') expect([l0, l1]).toEqual(['dhuhr', 'dhuhr'])
      else expect(l1).not.toBe(l0)
    })
})

describe('T2: 10,000 instants of 2026 in eight cities, each with its own method', () => {
  const CITIES: [string, Place, Method][] = [
    ['Riyadh', RIYADH, 'UmmAlQura'],
    ['Mecca', { lat: 21.4225, lng: 39.8262, timeZone: 'Asia/Riyadh' }, 'UmmAlQura'],
    ['Cairo', { lat: 30.0444, lng: 31.2357, timeZone: 'Africa/Cairo' }, 'Egyptian'],
    ['Istanbul', { lat: 41.0082, lng: 28.9784, timeZone: 'Europe/Istanbul' }, 'Turkey'],
    ['London', { lat: 51.5072, lng: -0.1276, timeZone: 'Europe/London' }, 'MoonsightingCommittee'],
    ['New York', { lat: 40.7128, lng: -74.006, timeZone: 'America/New_York' }, 'NorthAmerica'],
    ['Jakarta', { lat: -6.2088, lng: 106.8456, timeZone: 'Asia/Jakarta' }, 'Singapore'],
    ['Karachi', { lat: 24.8607, lng: 67.0011, timeZone: 'Asia/Karachi' }, 'Karachi'],
  ]
  it('the state is the table’s for adhan’s current prayer, and the line shows the next in the table', () => {
    let seed = 20261022
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31
    const start = Date.UTC(2026, 0, 1)
    const span = Date.UTC(2027, 0, 1) - start
    // The day's object per city and local date, as the app keeps it until the date changes.
    const cache = new Map<string, ReturnType<typeof dayObject>>()
    const obj = (city: string, place: Place, method: Method, now: Date) => {
      const ymd = ymdIn(now, place.timeZone)
      const k = `${city}|${ymd.y}-${ymd.m}-${ymd.d}`
      let o = cache.get(k)
      if (!o) cache.set(k, (o = dayObject(place, ymd, { method })))
      return o
    }
    let n = 0
    for (let i = 0; i < 10_000; i++) {
      const now = new Date(start + Math.floor(rand() * span))
      for (const [city, place, method] of CITIES) {
        const { pt } = obj(city, place, method, now)
        const cur = pt.currentPrayer(now) as Current
        expect(skyStateOf(pt, now)).toBe(SKY_OF[cur])
        // The line's rule on the same object: the first of the five after now, else tomorrow's Fajr.
        const next = FIVE.find((p) => pt[p] > now) ?? 'fajr'
        expect(next).toBe(NEXT_OF[cur])
        n++
      }
    }
    expect(n).toBe(80_000)
  }, 120_000)
})

describe('T5 (unit): the edges', () => {
  it('uses the place’s date and zone, whatever the device: Kolkata, Kathmandu, Auckland and the DST days', () => {
    // Each at half an hour after its own Dhuhr on a local date (the device's zone is the test runner's, never theirs).
    const cases: [Place, Ymd][] = [
      [{ lat: 22.5726, lng: 88.3639, timeZone: 'Asia/Kolkata' }, { y: 2026, m: 10, d: 22 }], // +5:30
      [{ lat: 27.7172, lng: 85.324, timeZone: 'Asia/Kathmandu' }, { y: 2026, m: 10, d: 22 }], // +5:45
      [{ lat: -36.8485, lng: 174.7633, timeZone: 'Pacific/Auckland' }, { y: 2026, m: 10, d: 22 }], // +13, a day ahead of UTC's evening
      [{ lat: 51.5072, lng: -0.1276, timeZone: 'Europe/London' }, { y: 2026, m: 10, d: 25 }], // the clocks went back that night
      [{ lat: 40.7128, lng: -74.006, timeZone: 'America/New_York' }, { y: 2026, m: 11, d: 1 }], // the clocks went back that night
    ]
    for (const [place, ymd] of cases) {
      const dhuhr = timesOf(dayObject(place, ymd)).dhuhr
      for (const [offset, want] of [
        [30, 'dhuhr'],
        [-30, 'morning'],
      ] as const) {
        const now = new Date(dhuhr.getTime() + offset * 60_000)
        // As the app evaluates it: the object for the place's own date at that instant.
        expect(ymdIn(now, place.timeZone), place.timeZone).toEqual(ymd)
        expect(skyStateOf(objAt(place, now).pt, now), `${place.timeZone} ${offset}`).toBe(want)
      }
    }
  })

  it('high latitudes: London and Oslo in June and Tromsø in June and December follow the times the line shows', () => {
    const cases: [Place, string][] = [
      [{ lat: 51.5072, lng: -0.1276, timeZone: 'Europe/London' }, '2026-06-21'],
      [{ lat: 59.9139, lng: 10.7522, timeZone: 'Europe/Oslo' }, '2026-06-21'],
      [{ lat: 69.6492, lng: 18.9553, timeZone: 'Europe/Oslo' }, '2026-06-21'],
      [{ lat: 69.6492, lng: 18.9553, timeZone: 'Europe/Oslo' }, '2026-12-21'],
    ]
    for (const [place, date] of cases)
      for (const h of [1, 4, 8, 12, 16, 20, 23]) {
        const now = new Date(`${date}T${String(h).padStart(2, '0')}:00:00Z`)
        const o = objAt(place, now)
        const s = skyStateOf(o.pt, now)
        // The app resolves the polar day (AqrabYaum, as the line): every moment is valid, so there is a state, the
        // table's for adhan's own current prayer.
        expect(s, `${place.lat} ${date} ${h}h`).toBe(SKY_OF[o.pt.currentPrayer(now) as Current])
        expect(lineNext(place, now)).toBe(NEXT_OF[o.pt.currentPrayer(now) as Current])
      }
  })

  it('no layer when a moment of the day is not a valid date (adhan’s unresolved polar day)', () => {
    const now = new Date('2026-06-21T12:00:00Z')
    const o = objAt(RIYADH, now)
    const broken = Object.assign(Object.create(Object.getPrototypeOf(o.pt)), o.pt, { sunrise: new Date(NaN), maghrib: new Date(NaN) })
    expect(skyStateOf(broken, now)).toBeNull()
  })

  it('midnight is no bound: the night stays and the next date’s object takes over', () => {
    const a = new Date('2026-10-22T23:59:59+03:00')
    const b = new Date('2026-10-23T00:00:01+03:00')
    const oa = objAt(RIYADH, a)
    const ob = objAt(RIYADH, b)
    expect([skyStateOf(oa.pt, a), skyStateOf(ob.pt, b)]).toEqual(['night', 'night'])
    expect(ymdIn(timesOf(oa).fajr, 'Asia/Riyadh')).toEqual({ y: 2026, m: 10, d: 22 })
    expect(ymdIn(timesOf(ob).fajr, 'Asia/Riyadh')).toEqual({ y: 2026, m: 10, d: 23 })
  })

  it('a Hanafi Asr comes later: twenty minutes after the majority’s Asr the sky is still Dhuhr’s', () => {
    const t = timesOf(objAt(RIYADH, new Date('2026-10-22T12:00:00+03:00')))
    const now = new Date(t.asr.getTime() + 20 * 60_000)
    expect(skyStateOf(objAt(RIYADH, now, { asr: 'shafi' }).pt, now)).toBe('asr')
    expect(skyStateOf(objAt(RIYADH, now, { asr: 'hanafi' }).pt, now)).toBe('dhuhr')
  })

  it('the next bound: the next of the six, and the next day’s Fajr after Isha', () => {
    const t = timesOf(objAt(RIYADH, new Date('2026-10-22T12:00:00+03:00')))
    const tomorrow = timesOf(dayObject(RIYADH, nextYmd({ y: 2026, m: 10, d: 22 })))
    expect(nextBound(t, tomorrow.fajr, new Date('2026-10-22T12:00:00+03:00'))).toEqual(t.asr)
    expect(nextBound(t, tomorrow.fajr, t.asr)).toEqual(t.maghrib)
    expect(nextBound(t, tomorrow.fajr, new Date('2026-10-22T21:30:00+03:00'))).toEqual(tomorrow.fajr)
    expect(nextBound(t, tomorrow.fajr, new Date('2026-10-22T03:00:00+03:00'))).toEqual(t.fajr)
  })
})

describe('the light moves with the time (Team A §5)', () => {
  const t = timesOf(objAt(RIYADH, new Date('2026-10-22T12:00:00+03:00')))
  const at = (hhmm: string) => new Date(`2026-10-22T${hhmm}:00+03:00`)
  it('enters from the east at sunrise, is high at Dhuhr, leaves in the west at Maghrib', () => {
    const rise = skyLight('morning', t, t.sunrise)
    const noon = skyLight('dhuhr', t, new Date((t.sunrise.getTime() + t.maghrib.getTime()) / 2))
    const set = skyLight('asr', t, new Date(t.maghrib.getTime() - 1))
    expect([rise.dx, rise.y]).toEqual([58, 70])
    expect(Math.abs(noon.dx)).toBeLessThan(0.01)
    expect(noon.y).toBeCloseTo(-6, 5)
    expect(set.dx).toBeCloseTo(-58, 2)
    expect(set.y).toBeCloseTo(70, 2)
    // The warm heart is warmest low, the lit lapis strongest high.
    expect(rise.warm).toBeCloseTo(0.42, 5)
    expect(noon.warm).toBeCloseTo(0.21, 5)
    expect(noon.lapis).toBeCloseTo(0.44, 5)
  })
  it('Fajr’s band rises with its time; Maghrib’s red shrinks until Isha', () => {
    expect(skyLight('fajr', t, t.fajr).k).toBeCloseTo(0.6, 5)
    expect(skyLight('fajr', t, new Date(t.sunrise.getTime() - 1)).k).toBeCloseTo(1, 3)
    expect(skyLight('maghrib', t, t.maghrib).k).toBeCloseTo(1, 5)
    expect(skyLight('maghrib', t, new Date(t.isha.getTime() - 1)).k).toBeCloseTo(0.3, 3)
    expect(skyLight('maghrib', t, at('17:40')).q).toBeCloseTo(20 / 90, 3)
  })
  it('the night’s four brightest stars change with the Hijri day, among three sets', () => {
    expect([1, 2, 3, 4, 30].map(starSet)).toEqual([1, 2, 0, 1, 0])
    expect(starSet(null)).toBe(0)
  })
})

describe('the painting and its two masks', () => {
  it('the painting is untouched (its bytes as approved on 13 October)', () => {
    const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(WEB, 'public/art/card-date-B4.webp'))).digest('hex')
    expect(sha).toBe('397a7b42d4c610a4add19a357e033104b13a6cc8e1f271055a89a185389e929b')
  })
  it('the masks are PNGs the size of the sky box, with an alpha channel', () => {
    for (const f of ['sky-lapis-mask.png', 'sky-gold-mask.png']) {
      const b = fs.readFileSync(path.join(WEB, 'public/art', f))
      expect(b.subarray(1, 4).toString(), f).toBe('PNG')
      expect([b.readUInt32BE(16), b.readUInt32BE(20)], f).toEqual([1034, 711])
      expect([4, 6], f).toContain(b[25]) // grey + alpha, or RGBA
      expect(b.length, f).toBeLessThan(200_000)
    }
  })
})

describe('the CSS’s guards (sky.css)', () => {
  const css = fs.readFileSync(path.join(WEB, 'src/v2/home/sky.css'), 'utf8')
  it('has the six states’ layers', () => {
    for (const s of ['night', 'fajr', 'morning', 'dhuhr', 'asr', 'maghrib']) expect(css, s).toMatch(new RegExp(`\\.sky-(?:tone|light|gild)\\[data-sky='${s}'\\]`))
  })
  it('no layer with increased contrast, inverted colours or reduced transparency (and iOS’s own flag)', () => {
    expect(css).toMatch(/@media \(prefers-contrast: more\), \(inverted-colors: inverted\), \(prefers-reduced-transparency: reduce\) \{\s*\.sky-l \{\s*display: none;/)
    expect(css).toMatch(/:root\[data-reduce-transparency\] \.sky-l \{\s*display: none;/)
  })
  it('a fade of 200 ms at most, none with reduced motion, and no repeated animation', () => {
    for (const m of css.matchAll(/animation: [\w-]+ ([\d.]+)s/g)) expect(Number(m[1])).toBeLessThanOrEqual(0.2)
    expect(css).not.toMatch(/infinite|alternate/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.sky-l\.is-entering \{\s*animation: none;\s*\}\s*\.sky-l\.is-leaving \{\s*display: none;/)
  })
  it('the page’s sky stays a light day sky, and the wordmark reads 5.3:1 or more on its top', () => {
    const lin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    const Y = (h: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16)))
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const L = (h: string) => 116 * Math.cbrt(Y(h)) - 16
    const tops = [...css.matchAll(/--page-sky-top: (#[0-9a-f]{6});/g)].map((m) => m[1])
    expect(tops).toHaveLength(6)
    for (const top of tops) {
      expect(L(top), top).toBeGreaterThanOrEqual(72)
      expect(L(top), top).toBeLessThanOrEqual(81)
      expect((Y(top) + 0.05) / (Y('#1e3a6b') + 0.05), top).toBeGreaterThanOrEqual(5.3)
    }
  })
})

describe('the corner dates (corner-fit.ts)', () => {
  it('fit a gold-free box of the corner on one line, or not', () => {
    const card = { width: 358, height: 258 } // 390 px
    expect(BOXES.map((b) => Math.round(b.w * (1034 / 1200) * card.width))).toEqual([76, 95])
    expect(fitsCorner(90, 16.25, card)).toBe(true) // M2: 95 wide, 19.5 tall
    expect(fitsCorner(90, 21.9, card)).toBe(false) // 135%: too tall for M2, too wide for M1
    expect(fitsCorner(70, 21.9, card)).toBe(true) // M1: 76 wide, 27.6 tall
  })
  it('try the year’s seven weekdays and twelve months, both forms', () => {
    const t = cornerTexts('en-u-ca-gregory', 2026)
    expect(t.weekdays).toHaveLength(7)
    expect(new Set(t.weekdays).size).toBe(7)
    expect(t.long).toContain('September 28, 2026')
    expect(t.short).toContain('Sep 28, 2026')
  })
})

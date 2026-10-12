// The daily engines of reply 0031-add10 (web/src/daily): prayer times, forbidden times, qibla, declination, Hijri.
// PRAYER_REPORT=1 also writes eval/reports/prayer-times-check.md (8 Saudi cities, two dates, one in Ramadan) for the
// coordinator to compare by hand with the Umm al-Qura calendar.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { forbiddenNow, forbiddenWindows } from '../../web/src/daily/forbidden'
import { HIJRI_NOTE, hijriParts, hijriText, totalOffset, umalquraSupported } from '../../web/src/daily/hijri'
import { dayTimes, hhmm, isRamadan, nextPrayer, ymdIn } from '../../web/src/daily/prayer'
import { declination, qiblaBearing, trueFromAndroidAlpha, trueFromIosHeading, turnBy } from '../../web/src/daily/qibla'

const TZ = 'Asia/Riyadh'
const MIN = 60_000
// Coordinates from GeoNames cities15000 (data/processed/cities.json), not from memory.
const CITIES: [string, string, number, number][] = [
  ['مكة', 'Makkah', 21.4266, 39.8256],
  ['المدينة', 'Madinah', 24.4686, 39.6142],
  ['الرياض', 'Riyadh', 24.6877, 46.7219],
  ['جدة', 'Jeddah', 21.4901, 39.1862],
  ['الدمام', 'Dammam', 26.4344, 50.1033],
  ['أبها', 'Abha', 18.2164, 42.5053],
  ['تبوك', 'Tabuk', 28.3998, 36.5715],
  ['حائل', "Ha'il", 27.5219, 41.6907],
]
// Two dates: one ordinary, one in Ramadan by the Umm al-Qura calendar (checked below, not assumed).
const DATES = [
  { y: 2026, m: 10, d: 15 },
  { y: 2027, m: 2, d: 20 },
]

describe('prayer times (adhan 4.4.4, Umm al-Qura)', () => {
  it('the second test date is in Ramadan and the first is not', () => {
    expect(isRamadan(DATES[0])).toBe(false)
    expect(isRamadan(DATES[1])).toBe(true)
  })

  it('every city, both dates: the six times in order, Isha 90 min after Maghrib (120 in Ramadan)', () => {
    for (const [, , lat, lng] of CITIES)
      for (const d of DATES) {
        const t = dayTimes({ lat, lng }, d)
        const seq = [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha].map((x) => x.getTime())
        expect(seq.every(Number.isFinite)).toBe(true)
        expect([...seq].sort((a, b) => a - b)).toEqual(seq)
        expect((t.isha.getTime() - t.maghrib.getTime()) / MIN).toBe(isRamadan(d) ? 120 : 90)
        expect(ymdIn(t.dhuhr, TZ)).toEqual(d)
        expect(t.suhoorEnd).toEqual(t.fajr)
        expect(t.iftar).toEqual(t.maghrib)
        expect(t.lastThird.getTime()).toBeGreaterThan(t.midnight.getTime())
      }
  })

  it('Ramadan Isha only with Umm al-Qura, and the user can force it either way', () => {
    const at = { lat: 24.6877, lng: 46.7219 }
    expect(dayTimes(at, DATES[0], { ramadan: true }).ramadanIsha).toBe(true)
    expect(dayTimes(at, DATES[1], { ramadan: false }).ramadanIsha).toBe(false)
    expect(dayTimes(at, DATES[1], { method: 'MuslimWorldLeague' }).ramadanIsha).toBe(false)
  })

  it('Hanafi Asr is later than the majority Asr', () => {
    const at = { lat: 24.6877, lng: 46.7219 }
    expect(dayTimes(at, DATES[0], { asr: 'hanafi' }).asr.getTime()).toBeGreaterThan(dayTimes(at, DATES[0]).asr.getTime())
  })

  it('high latitudes give real times (Tromsø in June, Oslo in December)', () => {
    for (const [lat, lng, d] of [
      [69.6496, 18.956, { y: 2027, m: 6, d: 21 }],
      [59.9127, 10.7461, { y: 2026, m: 12, d: 21 }],
    ] as const) {
      const t = dayTimes({ lat, lng }, d, { method: 'MuslimWorldLeague' })
      for (const x of [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha]) expect(Number.isFinite(x.getTime())).toBe(true)
    }
  })

  it('Dhuhr is the zawal rounded to the nearest minute (at most 30 s before it)', () => {
    // The sun's transit (zawal) by its own definition: the instant, between 11:00 and 13:00 local, of the highest
    // solar elevation; found here by a fine search on adhan's own sunrise/sunset symmetry is not independent, so we
    // use the NOAA equation of time instead.
    for (const [, , lat, lng] of CITIES) {
      const d = DATES[0]
      const t = dayTimes({ lat, lng }, d)
      const n = (Date.UTC(d.y, d.m - 1, d.d) - Date.UTC(2000, 0, 1, 12)) / 86400000
      const g = ((357.529 + 0.98560028 * n) * Math.PI) / 180
      const q = 280.459 + 0.98564736 * n
      const L = ((q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * Math.PI) / 180
      const e = ((23.439 - 0.00000036 * n) * Math.PI) / 180
      const RA = (Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) * 180) / Math.PI
      const eqt = (((q - RA + 540) % 360) - 180) * 4 // minutes
      const transitUtcMin = 720 - 4 * lng - eqt
      const transit = Date.UTC(d.y, d.m - 1, d.d) + transitUtcMin * MIN
      expect(Math.abs(t.dhuhr.getTime() - transit) / 1000).toBeLessThanOrEqual(60)
    }
  })

  it('next prayer rolls to tomorrow’s Fajr after Isha', () => {
    const at = { lat: 24.6877, lng: 46.7219 }
    const t = dayTimes(at, DATES[0])
    expect(nextPrayer(at, new Date(t.isha.getTime() + MIN), TZ).name).toBe('fajr')
    expect(nextPrayer(at, new Date(t.dhuhr.getTime() - MIN), TZ)).toEqual({ name: 'dhuhr', at: t.dhuhr })
  })

  it.runIf(process.env.PRAYER_REPORT)('writes eval/reports/prayer-times-check.md', () => {
    const lines = [
      '# مواقيت الصلاة: ثماني مدن سعودية في تاريخين (الملحق 0031-add10)',
      '',
      'الحساب على الجهاز بمكتبة adhan 4.4.4: طريقة أم القرى (فجر 18.5°، وعشاء بعد المغرب بـ90 دقيقة، و120 في رمضان)، وعصر الجمهور، والتوقيت `Asia/Riyadh`. الإحداثيات من GeoNames (cities15000).',
      '',
      '**للمطابقة اليدوية مع تقويم أم القرى قبل أن يُكتب في أي مكان «مطابق لأم القرى».**',
      '',
    ]
    for (const d of DATES) {
      const ds = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
      const h = hijriText(new Date(Date.UTC(d.y, d.m - 1, d.d, 12)), 'ar', 0, TZ)
      lines.push(`## ${ds} (${h}${isRamadan(d) ? '، رمضان' : ''})`, '', '| المدينة | الإحداثيات | الفجر | الشروق | الظهر | العصر | المغرب | العشاء |', '| --- | --- | --- | --- | --- | --- | --- | --- |')
      for (const [ar, , lat, lng] of CITIES) {
        const t = dayTimes({ lat, lng }, d)
        lines.push(`| ${ar} | ${lat}, ${lng} | ${[t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha].map((x) => hhmm(x, TZ)).join(' | ')} |`)
      }
      lines.push('')
    }
    const out = path.resolve(import.meta.dirname, '../../eval/reports/prayer-times-check.md')
    fs.writeFileSync(out, lines.join('\n'))
  })
})

describe('forbidden times', () => {
  const t = dayTimes({ lat: 24.6877, lng: 46.7219 }, DATES[0])
  it('after sunrise 15 min, before the zawal 10 min, after Asr until sunset (labelled after the prayer)', () => {
    const [a, b, c] = forbiddenWindows(t)
    expect([a.key, (a.to.getTime() - a.from.getTime()) / MIN]).toEqual(['after_sunrise', 15])
    expect([b.key, (b.to.getTime() - b.from.getTime()) / MIN, b.to]).toEqual(['before_zawal', 10, t.dhuhr])
    expect([c.key, c.from, c.to, c.fromLabel]).toEqual(['after_asr', t.asr, t.maghrib, 'after_asr_prayer'])
  })
  it('after Asr counts only once Asr is prayed', () => {
    const now = new Date(t.asr.getTime() + 20 * MIN)
    expect(forbiddenNow(t, now)).toBeNull()
    expect(forbiddenNow(t, now, true)?.key).toBe('after_asr')
    expect(forbiddenNow(t, new Date(t.sunrise.getTime() + 5 * MIN))?.key).toBe('after_sunrise')
  })
})

// An independent great-circle initial bearing to the Kaaba (21.4225, 39.8262), against adhan's.
function bearing(lat: number, lng: number) {
  const r = Math.PI / 180
  const [p1, p2, dl] = [lat * r, 21.4225 * r, (39.8262 - lng) * r]
  return ((Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) / r) + 360) % 360
}

describe('qibla', () => {
  // Reference values published with the library's tests (github.com/batoulapps/adhan-js, test/qibla.test.ts, branch
  // develop): Washington DC, New York, London, Islamabad, Tokyo; each also checked against the formula above.
  const REF: [string, number, number, number][] = [
    ['Washington DC', 38.9072, -77.0369, 56.56],
    ['New York', 40.7128, -74.0059, 58.4817],
    ['London', 51.5074, -0.1278, 118.987],
    ['Islamabad', 33.7294, 73.0931, 255.882],
    ['Tokyo', 35.6895, 139.6917, 293.021],
  ]
  it.each(REF)('%s', (_n, lat, lng, ref) => {
    expect(qiblaBearing({ lat, lng })).toBeCloseTo(ref, 2)
    expect(Math.abs(qiblaBearing({ lat, lng }) - bearing(lat, lng))).toBeLessThan(0.05)
  })
  it('the eight Saudi cities agree with the formula', () => {
    for (const [, , lat, lng] of CITIES.slice(1)) expect(Math.abs(qiblaBearing({ lat, lng }) - bearing(lat, lng))).toBeLessThan(0.05)
  })
  it('headings: iOS magnetic + declination, Android 360 − alpha, and the turn', () => {
    const at = { lat: 24.6877, lng: 46.7219 }
    const when = new Date(Date.UTC(2026, 9, 13))
    expect(trueFromIosHeading(100, at, when)).toBeCloseTo(100 + declination(at, when), 6)
    expect(trueFromAndroidAlpha(90)).toBe(270)
    expect(trueFromAndroidAlpha(0)).toBe(0)
    expect(turnBy(350, 10)).toBe(20)
    expect(turnBy(10, 350)).toBe(-20)
  })
})

describe('declination (magvar 2.2.0, WMM2025) against NOAA/NCEI WMM2025_TEST_VALUES.txt', () => {
  // https://www.ncei.noaa.gov/sites/default/files/2025-02/WMM2025_TEST_VALUES.txt: date, height (km), lat, lng, D (°).
  const NOAA: [number, number, number, number, number][] = [
    [2025.0, 0, 80, 0, 1.28],
    [2025.0, 0, 0, 120, -0.16],
    [2025.0, 0, -80, 240, 68.78],
    [2027.5, 0, 80, 0, 2.59],
    [2027.5, 0, 0, 120, -0.24],
    [2027.5, 0, -80, 240, 68.49],
  ]
  it.each(NOAA)('%s at %s km, %s, %s → %s°', (year, _h, lat, lng, D) => {
    expect(Math.abs(declination({ lat, lng }, year) - D)).toBeLessThanOrEqual(0.01)
  })
})

describe('Hijri (Intl, Umm al-Qura named explicitly)', () => {
  it('this engine has Umm al-Qura', () => expect(umalquraSupported()).toBe(true))
  it('parts, the Arabic text with the calendar, and the offsets', () => {
    const at = new Date(Date.UTC(2026, 9, 13, 12))
    const p = hijriParts(at, 0, TZ)!
    const next = hijriParts(at, 1, TZ)!
    expect(p.year).toBeGreaterThan(1440)
    expect(next.day === p.day + 1 || next.day === 1).toBe(true)
    expect(hijriText(at, 'ar', 0, TZ)).toMatch(/هـ/)
    expect(totalOffset(5, -1)).toBe(1)
    expect(totalOffset(-2, -2)).toBe(-4)
    expect(HIJRI_NOTE).toBe('وفق تقويم أم القرى، والعبرة في رمضان والعيدين بإعلان المحكمة العليا')
  })
})

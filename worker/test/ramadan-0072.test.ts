// «رمضان» (add-ons 0072-add26 §4 and 0072-add34 §ب8; web/src/v2/daily/ramadan): the month's days by the Umm al-Qura
// calendar with the Hijri offset, the 1 Sha'ban gate of the home's card, the month's table from the app's own prayer
// times with the user's settings (Fajr the end of suhoor, the fast's length), the two countdowns and Apple's eight
// hours, the ten languages' strings (no «إمساك» anywhere), and fatwa 11916 under the table.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { hhmm } from '../../web/src/daily/prayer'
import {
  addDays,
  cardShown,
  countdownAt,
  daysBetween,
  hoursMinutes,
  liveFits,
  monthTable,
  ramadanOf,
  ramadanState,
} from '../../web/src/v2/daily/ramadan/ramadan-model'
import { RAMADAN } from '../../web/src/v2/daily/ramadan/strings-ramadan'

const TZ = 'Asia/Riyadh'
// Riyadh from GeoNames cities15000 (data/processed/cities.json), as in daily-prayer.test.ts.
const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: TZ }
const UQ = { method: 'UmmAlQura' as const, asr: 'shafi' as const }
const ymd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return { y, m, d }
}
const iso = (d: { y: number; m: number; d: number }) => `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
const at = (s: string) => new Date(s)

describe('Ramadan 1448 by Umm al-Qura, with the offset', () => {
  it('from today (25 October 2026): 1 Ramadan 1448 is Monday 8 February 2027, 29 days to 8 March', () => {
    const r = ramadanOf(ymd('2026-10-25'))!
    expect(r.year).toBe(1448)
    expect(iso(r.days[0])).toBe('2027-02-08')
    expect(r.days).toHaveLength(29)
    expect(iso(r.days[28])).toBe('2027-03-08')
  })
  it('the offset moves the whole month: +1 starts it on 7 February, -1 on 9 February', () => {
    expect(iso(ramadanOf(ymd('2026-10-25'), 1)!.days[0])).toBe('2027-02-07')
    expect(iso(ramadanOf(ymd('2026-10-25'), -1)!.days[0])).toBe('2027-02-09')
    expect(iso(ramadanOf(ymd('2026-10-25'), 2)!.days[0])).toBe('2027-02-06')
  })
  it('inside the month it finds its own first day; after it, the next year’s (1449 from 28 January 2028)', () => {
    expect(iso(ramadanOf(ymd('2027-02-20'))!.days[0])).toBe('2027-02-08')
    const next = ramadanOf(ymd('2027-03-09'))!
    expect(next.year).toBe(1449)
    expect(iso(next.days[0])).toBe('2028-01-28')
  })
})

describe('the 1 Sha’ban gate', () => {
  it('before Sha’ban: no card; the page counts the days anyway', () => {
    const s = ramadanState(ymd('2026-10-25'))!
    expect(s.phase).toBe('before')
    expect(cardShown(s)).toBe(false)
    expect(s.daysLeft).toBe(daysBetween(ymd('2026-10-25'), ymd('2027-02-08')))
    expect(cardShown(ramadanState(ymd('2027-01-08')))).toBe(false)
  })
  it('1 Sha’ban 1448 (9 January 2027): the card, and 30 days left', () => {
    const s = ramadanState(ymd('2027-01-09'))!
    expect(s.hijri).toMatchObject({ day: 1, month: 8, year: 1448 })
    expect(s.phase).toBe('shaban')
    expect(cardShown(s)).toBe(true)
    expect(s.daysLeft).toBe(30)
  })
  it('the offset moves the gate: with +1, 8 January is already 1 Sha’ban', () => {
    expect(ramadanState(ymd('2027-01-08'), 1)!.phase).toBe('shaban')
    expect(ramadanState(ymd('2027-01-09'), -1)!.phase).toBe('before')
  })
  it('in Ramadan: its day; after its last day (Eid al-Fitr, 9 March 2027): no card', () => {
    expect(ramadanState(ymd('2027-02-08'))).toMatchObject({ phase: 'ramadan', dayN: 1 })
    expect(ramadanState(ymd('2027-03-08'))).toMatchObject({ phase: 'ramadan', dayN: 29 })
    const eid = ramadanState(ymd('2027-03-09'))!
    expect(eid.phase).toBe('before')
    expect(cardShown(eid)).toBe(false)
  })
})

describe('the month’s table from the app’s own times', () => {
  const days = ramadanOf(ymd('2026-10-25'))!.days
  it('Riyadh, Umm al-Qura: the end of suhoor is the Fajr adhan itself; the fast from Fajr to Maghrib', () => {
    const rows = monthTable(RIYADH, days, UQ)
    expect(rows).toHaveLength(29)
    expect(hhmm(rows[0].fajr, TZ)).toBe('05:12')
    expect(hhmm(rows[0].maghrib, TZ)).toBe('17:43')
    expect(rows[0].fastMs).toBe(rows[0].maghrib.getTime() - rows[0].fajr.getTime())
    expect(hoursMinutes(rows[0].fastMs, 'en')).toBe('12:31')
    expect(hhmm(rows[28].fajr, TZ)).toBe('04:52')
    expect(hhmm(rows[28].maghrib, TZ)).toBe('17:59')
    expect(hoursMinutes(rows[28].fastMs, 'ar-u-nu-arab')).toBe('١٣:٠٧')
  })
  it('Umm al-Qura’s Ramadan Isha on every day of the month: two hours after Maghrib', () => {
    for (const r of monthTable(RIYADH, days, UQ)) expect(r.isha.getTime() - r.maghrib.getTime()).toBe(120 * 60_000)
  })
  it('the user’s settings: the Hanafi Asr is later, and the minutes added to Fajr move the end of suhoor', () => {
    const base = monthTable(RIYADH, days, UQ)[0]
    const hanafi = monthTable(RIYADH, days, { ...UQ, asr: 'hanafi' as const })[0]
    expect(hanafi.asr.getTime()).toBeGreaterThan(base.asr.getTime())
    const plus = monthTable(RIYADH, days, { ...UQ, adjust: { fajr: 2 } })[0]
    expect(plus.fajr.getTime() - base.fajr.getTime()).toBe(2 * 60_000)
    expect(plus.fastMs).toBe(base.fastMs - 2 * 60_000)
  })
  it('the offset’s month is the table’s: with +1 the first row is 7 February', () => {
    expect(iso(monthTable(RIYADH, ramadanOf(ymd('2026-10-25'), 1)!.days, UQ)[0].day)).toBe('2027-02-07')
  })
})

describe('the countdowns and Apple’s eight hours', () => {
  const days = ramadanOf(ymd('2026-10-25'))!.days
  it('before Fajr: to the Fajr adhan; from Fajr to Maghrib: to iftar; after Maghrib: to tomorrow’s Fajr', () => {
    const c1 = countdownAt(RIYADH, at('2027-02-10T03:00:00+03:00'), days, UQ)!
    expect(c1.kind).toBe('suhoor')
    expect(hhmm(c1.at, TZ)).toBe('05:11')
    const c2 = countdownAt(RIYADH, at('2027-02-10T10:00:00+03:00'), days, UQ)!
    expect(c2.kind).toBe('iftar')
    expect(hhmm(c2.at, TZ)).toBe('17:44')
    const c3 = countdownAt(RIYADH, at('2027-02-10T20:00:00+03:00'), days, UQ)!
    expect(c3.kind).toBe('suhoor')
    expect(c3.at.getTime()).toBeGreaterThan(at('2027-02-11T00:00:00+03:00').getTime())
  })
  it('the eve of the first day after Maghrib counts to the first suhoor’s end; before Maghrib nothing', () => {
    expect(countdownAt(RIYADH, at('2027-02-07T19:00:00+03:00'), days, UQ)?.kind).toBe('suhoor')
    expect(countdownAt(RIYADH, at('2027-02-07T10:00:00+03:00'), days, UQ)).toBeNull()
  })
  it('after the last iftar (29 Ramadan, 8 March) nothing', () => {
    expect(countdownAt(RIYADH, at('2027-03-08T19:00:00+03:00'), days, UQ)).toBeNull()
  })
  it('the Lock Screen only within eight hours of the time', () => {
    const now = at('2027-02-10T08:00:00+03:00')
    expect(liveFits({ kind: 'iftar', at: new Date(now.getTime() + 9 * 3600_000) }, now)).toBe(false)
    expect(liveFits({ kind: 'iftar', at: new Date(now.getTime() + 7 * 3600_000) }, now)).toBe(true)
    expect(liveFits({ kind: 'iftar', at: new Date(now.getTime() + 30_000) }, now)).toBe(false)
  })
  it('addDays crosses months and years', () => {
    expect(iso(addDays(ymd('2027-02-28'), 1))).toBe('2027-03-01')
    expect(iso(addDays(ymd('2026-12-31'), 1))).toBe('2027-01-01')
  })
})

describe('the strings and the fatwa', () => {
  const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
  it('ten languages, every key, the same placeholders as English', () => {
    const keys = Object.keys(RAMADAN.en)
    const vars = (v: unknown) => JSON.stringify(v).match(/\{\w+\}/g)?.sort() ?? []
    for (const l of LANGS) {
      expect(Object.keys(RAMADAN[l]).sort()).toEqual([...keys].sort())
      for (const k of keys) {
        const v = (RAMADAN[l] as Record<string, unknown>)[k]
        expect(v, `${l}.${k}`).toBeTruthy()
        if (typeof v === 'string') expect(vars(v), `${l}.${k}`).toEqual(vars((RAMADAN.en as Record<string, unknown>)[k]))
      }
    }
  })
  it('the coordinator’s countdown words, and no «إمساك» in any language', () => {
    expect(RAMADAN.ar.leftIftar).toBe('يبقى على الإفطار')
    expect(RAMADAN.ar.leftFajr).toBe('يبقى على أذان الفجر')
    for (const l of LANGS) expect(JSON.stringify(RAMADAN[l])).not.toMatch(/[إا]مساك|imsak/i)
  })
  it('no Latin letters in the right-to-left and Indic languages; no exclamation marks; read by the i18n check', () => {
    const values = (o: object): string[] => Object.values(o).flatMap((v) => (typeof v === 'string' ? [v] : values(v)))
    for (const l of ['ar', 'ur', 'bn', 'hi'] as const) for (const v of values(RAMADAN[l])) expect(v.replace(/\{\w+\}/g, ''), `${l}: ${v}`).not.toMatch(/[A-Za-z]/)
    for (const l of LANGS) for (const v of values(RAMADAN[l])) expect(v).not.toMatch(/[!！]/)
    const src = fs.readFileSync(path.resolve(import.meta.dirname, '../../scripts/i18n-check.mjs'), 'utf8')
    expect(src).toContain("'v2/daily/ramadan/strings-ramadan.ts', 'RAMADAN'")
  })
  it('11916 is in data/fatwas.json for the page, and the page shows its stored words', () => {
    const d = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../data/fatwas.json'), 'utf8'))
    const f = d.fatwas.find((x: { number: string }) => x.number === '11916')
    expect(f.use).toBe('imsakiyya')
    const page = fs.readFileSync(path.resolve(import.meta.dirname, '../../web/src/v2/daily/ramadan/RamadanPage.tsx'), 'utf8')
    expect(page).toContain("fatwa('11916')")
    expect(page).toContain('<StoredText text={f.answer} />')
  })
})

// «صليت» (add-on 0071-add13 §5): the five prayers marked on the device, counted in days all five were marked. Never a
// streak, never a reset; the log's day runs Fajr to Fajr at the place, else midnight to midnight.
import { describe, expect, it } from 'vitest'
import { dayTimes } from '../../web/src/daily/prayer'
import { FIVE, fullDays, loadPrayed, marksOn, PRAYED_KEY, prayedDay, savePrayed, setPrayed, type PrayedLog } from '../../web/src/daily/prayed'
import { TODAY } from '../../web/src/v2/daily/strings-today'

class MemStorage {
  m = new Map<string, string>()
  getItem = (k: string) => this.m.get(k) ?? null
  setItem = (k: string, v: string) => void this.m.set(k, v)
}
const EMPTY: PrayedLog = { full: [], day: '', prayed: [] }
const allFive = (log: PrayedLog, day: string) => FIVE.reduce((l, p) => setPrayed(l, day, p, true), log)

describe('prayed: marks and the days all five were marked', () => {
  it('keeps the marks in the order of the day, without repeats', () => {
    let l = setPrayed(EMPTY, '2026-10-22', 'isha', true)
    l = setPrayed(l, '2026-10-22', 'fajr', true)
    l = setPrayed(l, '2026-10-22', 'fajr', true)
    expect(l.prayed).toEqual(['fajr', 'isha'])
    expect(marksOn(l, '2026-10-22')).toEqual(['fajr', 'isha'])
    expect(fullDays(l)).toBe(0)
  })

  it('counts a day once all five are marked, and an unmark corrects it', () => {
    let l = allFive(EMPTY, '2026-10-22')
    expect(l.full).toEqual(['2026-10-22'])
    expect(fullDays(l)).toBe(1)
    l = setPrayed(l, '2026-10-22', 'asr', false)
    expect(fullDays(l)).toBe(0)
    l = setPrayed(l, '2026-10-22', 'asr', true)
    expect(fullDays(l)).toBe(1)
  })

  it('counts days, not streaks: a day not completed takes nothing away and is not kept', () => {
    let l = allFive(EMPTY, '2026-10-01')
    l = allFive(l, '2026-10-02')
    l = setPrayed(l, '2026-10-03', 'fajr', true) // only one on the 3rd
    l = allFive(l, '2026-10-09') // a week later
    expect(fullDays(l)).toBe(3)
    expect(l.full).toEqual(['2026-10-01', '2026-10-02', '2026-10-09'])
    // A new day starts empty; the full days stay.
    expect(marksOn(l, '2026-10-10')).toEqual([])
    l = setPrayed(l, '2026-10-10', 'dhuhr', true)
    expect([l.day, l.prayed, fullDays(l)]).toEqual(['2026-10-10', ['dhuhr'], 3])
    // Unmarking on another day never touches an earlier full day.
    l = setPrayed(l, '2026-10-10', 'dhuhr', false)
    expect(fullDays(l)).toBe(3)
  })

  it('a day completed twice is counted once', () => {
    let l = allFive(EMPTY, '2026-10-05')
    l = { ...l, full: [...l.full, '2026-10-05'] }
    expect(fullDays(l)).toBe(1)
  })
})

describe('prayed: stored on the device only, read defensively', () => {
  it('round-trips, and the hidden card keeps its count', () => {
    const s = new MemStorage()
    const l = { ...allFive(EMPTY, '2026-10-22'), hidden: true }
    savePrayed(l, s)
    expect(loadPrayed(s)).toEqual(l)
    expect(fullDays(loadPrayed(s))).toBe(1)
  })

  it('drops what it cannot read', () => {
    const s = new MemStorage()
    expect(loadPrayed(s)).toEqual(EMPTY)
    s.setItem(PRAYED_KEY, 'not json')
    expect(loadPrayed(s)).toEqual(EMPTY)
    s.setItem(PRAYED_KEY, JSON.stringify({ full: ['2026-10-01', 'x', 3, '2026-10-01'], day: 'today', prayed: ['isha', 'witr', 'fajr'], hidden: 'yes' }))
    expect(loadPrayed(s)).toEqual({ full: ['2026-10-01'], day: '', prayed: ['fajr', 'isha'] })
  })

  it('never throws when storage refuses', () => {
    const refusing = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') } }
    expect(loadPrayed(refusing)).toEqual(EMPTY)
    expect(() => savePrayed(EMPTY, refusing)).not.toThrow()
  })
})

describe('prayed: the log day runs Fajr to Fajr at the place', () => {
  const RIYADH = { lat: 24.6877, lng: 46.7219 }
  const fajrOf = (ymd: { y: number; m: number; d: number }) => dayTimes(RIYADH, ymd).fajr

  it('Isha marked after midnight belongs to the day before; after Fajr a new day starts', () => {
    expect(prayedDay(new Date('2026-10-22T20:00:00+03:00'), 'Asia/Riyadh', fajrOf)).toBe('2026-10-22')
    expect(prayedDay(new Date('2026-10-23T00:30:00+03:00'), 'Asia/Riyadh', fajrOf)).toBe('2026-10-22')
    // Fajr in Riyadh on 23 October 2026 is about 04:36.
    expect(prayedDay(new Date('2026-10-23T04:20:00+03:00'), 'Asia/Riyadh', fajrOf)).toBe('2026-10-22')
    expect(prayedDay(new Date('2026-10-23T05:00:00+03:00'), 'Asia/Riyadh', fajrOf)).toBe('2026-10-23')
  })

  it('steps back across a month and a year by the calendar', () => {
    expect(prayedDay(new Date('2027-01-01T02:00:00+03:00'), 'Asia/Riyadh', fajrOf)).toBe('2026-12-31')
    expect(prayedDay(new Date('2026-11-01T01:00:00+03:00'), 'Asia/Riyadh', fajrOf)).toBe('2026-10-31')
  })

  it("uses the place's time zone, and midnight when no place is known", () => {
    // 23:30 UTC is already the 23rd in Riyadh (02:30), before its Fajr: still the 22nd.
    expect(prayedDay(new Date('2026-10-22T23:30:00Z'), 'Asia/Riyadh', fajrOf)).toBe('2026-10-22')
    expect(prayedDay(new Date('2026-10-22T23:30:00Z'), 'Asia/Riyadh')).toBe('2026-10-23')
    expect(prayedDay(new Date('2026-10-22T23:30:00Z'), 'UTC')).toBe('2026-10-22')
  })
})

describe('prayed: the wording is calm in every language', () => {
  it('has every string, its placeholders, and no exclamation, streak or reproach', () => {
    for (const [lang, s] of Object.entries(TODAY)) {
      expect(s.prayedTitle, lang).toBeTruthy()
      expect(s.prayedOne, lang).toContain('{prayer}')
      expect(s.prayedDays.other, lang).toContain('{n}')
      expect(s.hideGoal, lang).toContain('{g}')
      const all = [s.prayedTitle, s.prayedOne, s.prayedNone, s.hideGoal, ...Object.values(s.prayedDays)].join(' ')
      expect(all, lang).not.toMatch(/[!！¡]/)
    }
    const ar = Object.values(TODAY.ar.prayedDays).join(' ') + TODAY.ar.prayedNone
    expect(ar).not.toMatch(/متتال|سلسلة|فات|تأخر|قصّر/)
    const en = Object.values(TODAY.en.prayedDays).join(' ') + TODAY.en.prayedNone
    expect(en).not.toMatch(/streak|in a row|missed|late/i)
  })
})

// Add-on 0072-add69 §3: Dhaka gets no minutes of ours (add-on 0071-add17 §1); «طريقة الحساب» shows, for a country whose
// table is known to differ, a line and a button to each prayer's own minutes, which the user sets (web/src/v2/daily/store.ts
// `mine`, added to the country's minutes in resolvePrayer, so the times, the bells and the widgets all follow it).
import { beforeEach, describe, expect, it, vi } from 'vitest'

class MemStorage {
  m = new Map<string, string>()
  getItem = (k: string) => this.m.get(k) ?? null
  setItem = (k: string, v: string) => void this.m.set(k, v)
  removeItem = (k: string) => void this.m.delete(k)
  clear = () => this.m.clear()
}
const store = new MemStorage()
vi.stubGlobal('localStorage', store)
vi.stubGlobal('window', { dispatchEvent: () => true })

const { ADJUST_HINT, COUNTRY_RULES, adjustHint } = await import('../../web/src/daily/method-auto')
const { MY_MINUTES_MAX, cleanMine, loadPrayerChoices, resolvePrayer, savePrayerPrefs } = await import('../../web/src/v2/daily/store')
const { dayTimes } = await import('../../web/src/daily/prayer')
const { TODAY } = await import('../../web/src/v2/daily/strings-today')

const DHAKA = { lat: 23.71, lng: 90.407, timeZone: 'Asia/Dhaka', source: 'city', country: 'BD', name: 'ঢাকা' } as never
const RIYADH = { lat: 24.688, lng: 46.722, timeZone: 'Asia/Riyadh', source: 'city', country: 'SA', name: 'الرياض' } as never

beforeEach(() => store.clear())

describe('the line on «طريقة الحساب»', () => {
  it('Bangladesh: the line with its reason and its 3 minutes; Dhaka\'s rule adds none for Fajr or Dhuhr', () => {
    expect(adjustHint({ country: 'BD' })).toEqual({ country: 'BD', minutes: 3, reason: true })
    expect(adjustHint({ timeZone: 'Asia/Dhaka' })?.country).toBe('BD')
    expect(COUNTRY_RULES.BD.adjust).toEqual({ maghrib: 3 })
  })
  it('the other countries measured more than 2 minutes away: the line without a reason; within 2, or unmeasured: none', () => {
    for (const c of ['MY', 'GB', 'JO', 'US', 'FR', 'CA']) expect(adjustHint({ country: c })).toMatchObject({ country: c, reason: false })
    for (const c of ['SA', 'EG', 'TR', 'ID', 'PK', 'SG', 'AE', 'QA', 'KW', 'DE', 'IN']) expect(adjustHint({ country: c })).toBeNull()
    expect(adjustHint(null)).toBeNull()
    expect(Object.values(ADJUST_HINT).every((n) => n > 2)).toBe(true)
  })
  it('ten languages, the Arabic as Talal wrote it, and Bangladesh\'s 3 minutes in each', () => {
    expect(TODAY.ar.adjustHint).toBe('قد يختلف جدول مسجدك بدقائق؛ عدّل كل صلاة من هنا')
    for (const [lang, s] of Object.entries(TODAY)) {
      for (const k of ['adjustHint', 'adjustHintBD', 'adjustOpen', 'adjustTitle', 'adjustNote', 'adjustEarlier', 'adjustLater', 'adjustReset'] as const) expect(s[k], `${lang} ${k}`).toBeTruthy()
      expect(s.adjustHintBD, lang).toContain('{y}')
      expect(s.adjustEarlier, lang).toContain('{p}')
      expect(s.adjustLater, lang).toContain('{p}')
      if (lang !== 'en') expect(s.adjustHint, lang).not.toBe(TODAY.en.adjustHint)
    }
    // No Latin letters inside the Arabic and Urdu (CLAUDE.md §8).
    for (const lang of ['ar', 'ur'] as const) for (const k of ['adjustHint', 'adjustHintBD', 'adjustOpen', 'adjustTitle', 'adjustNote', 'adjustReset'] as const) expect(TODAY[lang][k].replace(/\{[a-z]\}/g, '')).not.toMatch(/[A-Za-z]/)
  })
})

describe('each prayer\'s own minutes', () => {
  it('added to the country\'s minutes, prayer by prayer; a prayer at 0 left out', () => {
    const p = resolvePrayer({ choice: 'auto', asrChoice: 'auto', mine: { fajr: 2, maghrib: -3 } }, DHAKA)
    expect(p.adjust).toEqual({ fajr: 2 })
    expect(resolvePrayer({ choice: 'auto', asrChoice: 'auto' }, DHAKA).adjust).toEqual({ maghrib: 3 })
    expect(resolvePrayer({ choice: 'MuslimWorldLeague', asrChoice: 'auto', mine: { isha: -4 } }, DHAKA).adjust).toEqual({ isha: -4 })
  })
  it('the times follow them, minute for minute', () => {
    const day = { y: 2026, m: 11, d: 1 }
    const base = dayTimes(RIYADH, day, resolvePrayer({ choice: 'auto', asrChoice: 'auto' }, RIYADH))
    const mine = dayTimes(RIYADH, day, resolvePrayer({ choice: 'auto', asrChoice: 'auto', mine: { fajr: 2, isha: -1 } }, RIYADH))
    expect((mine.fajr.getTime() - base.fajr.getTime()) / 60000).toBe(2)
    expect((mine.isha.getTime() - base.isha.getTime()) / 60000).toBe(-1)
    expect(mine.dhuhr.getTime()).toBe(base.dhuhr.getTime())
  })
  it('kept in a key of their own: whole minutes, within ±MY_MINUTES_MAX, the five prayers only', () => {
    expect(cleanMine({ fajr: 2.7, dhuhr: 99, asr: -99, sunrise: 5, isha: 0, maghrib: 'x' })).toEqual({ fajr: 2, dhuhr: MY_MINUTES_MAX, asr: -MY_MINUTES_MAX })
    // With the country's largest (3), still within the 30 the server keeps for the web's bells.
    expect(MY_MINUTES_MAX + 3).toBeLessThanOrEqual(30)
    savePrayerPrefs({ choice: 'auto', asrChoice: 'auto', mine: { fajr: 2 } })
    expect(JSON.parse(store.getItem('muslim.prayer.minutes.v1')!)).toEqual({ fajr: 2 })
    expect(JSON.parse(store.getItem('muslim.prayer.v1')!)).toEqual({ v: 2, method: 'auto', asr: 'auto' })
    expect(loadPrayerChoices()).toEqual({ choice: 'auto', asrChoice: 'auto', mine: { fajr: 2 } })
    // A save without minutes leaves them; {} sets them back.
    savePrayerPrefs({ choice: 'Karachi', asrChoice: 'auto' })
    expect(loadPrayerChoices().mine).toEqual({ fajr: 2 })
    savePrayerPrefs({ choice: 'Karachi', asrChoice: 'auto', mine: {} })
    expect(loadPrayerChoices()).toEqual({ choice: 'Karachi', asrChoice: 'auto' })
  })
})

// Add-on 0072-add34 §B4, the accuracy of the prayer times: ten cities against the table their authority publishes, on
// three days far apart (relay/w1/0072-times/README.md, with the links). The bound is ±2 minutes; what stays outside it
// is written there with its reason. Only Bangladesh's rule changed (Karachi + the Maghrib 3 minutes its table prints,
// Hanafi Asr): its values below are the Islamic Foundation's as Jagonews24 prints them. Every other city is held to
// what it measured before, so a later change to a rule shows here. And the change reaches only «تلقائي حسب البلد»: a
// method or Asr chosen by hand is never overwritten; the server's bells use the same engine and the same settings.
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

const { COUNTRY_RULES, TABLE_NOTES, autoRule, tableNote } = await import('../../web/src/daily/method-auto')
const { dayTimes, hhmm } = await import('../../web/src/daily/prayer')
const { loadPrayerPrefs, resolvePrayer } = await import('../../web/src/v2/daily/store')
const { nextBell } = await import('../src/push/schedule')
const { TODAY } = await import('../../web/src/v2/daily/strings-today')

const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
type Key = (typeof KEYS)[number]
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
type City = { name: string; country: string; lat: number; lng: number; tz: string; days: Record<string, string> }

// Coordinates from the app's city list (GeoNames); the six times fajr…isha as the table prints them.
const CITIES: City[] = [
  { name: 'Makkah', country: 'SA', lat: 21.427, lng: 39.826, tz: 'Asia/Riyadh', days: { '2026-11-15': '05:13 06:31 12:06 15:16 17:39 19:09', '2027-01-15': '05:41 07:00 12:30 15:38 18:00 19:30', '2027-03-15': '05:14 06:29 12:30 15:54 18:30 20:00', '2027-02-20': '05:32 06:48 12:35 15:54 18:21 20:21' } },
  { name: 'Riyadh', country: 'SA', lat: 24.688, lng: 46.722, tz: 'Asia/Riyadh', days: { '2026-11-15': '04:49 06:09 11:38 14:45 17:07 18:37', '2027-01-15': '05:17 06:39 12:03 15:06 17:26 18:56', '2027-03-15': '04:45 06:02 12:03 15:28 18:03 19:33' } },
  { name: 'Cairo', country: 'EG', lat: 30.063, lng: 31.25, tz: 'Africa/Cairo', days: { '2026-11-15': '04:50 06:20 11:39 14:38 16:59 18:19', '2026-01-15': '05:20 06:52 12:04 14:58 17:17 18:39', '2026-03-15': '04:38 06:05 12:04 15:29 18:03 19:20' } },
  { name: 'Istanbul', country: 'TR', lat: 41.014, lng: 28.95, tz: 'Europe/Istanbul', days: { '2026-11-15': '06:16 07:44 12:54 15:29 17:53 19:16', '2027-01-15': '06:50 08:20 13:18 15:44 18:06 19:31', '2027-03-15': '05:45 07:10 13:18 16:37 19:17 20:36' } },
  { name: 'Kuala Lumpur', country: 'MY', lat: 3.141, lng: 101.686, tz: 'Asia/Kuala_Lumpur', days: { '2026-11-15': '05:49 06:58 13:01 16:22 18:59 20:11', '2027-01-15': '06:11 07:23 13:25 16:48 19:23 20:36', '2027-03-15': '06:11 07:19 13:25 16:33 19:27 20:35' } },
  { name: 'Jakarta', country: 'ID', lat: -6.215, lng: 106.845, tz: 'Asia/Jakarta', days: { '2026-11-15': '04:06 05:22 11:41 15:01 17:52 19:05', '2027-01-15': '04:27 05:45 12:05 15:29 18:18 19:33', '2027-03-15': '04:43 05:54 12:05 15:12 18:09 19:18' } },
  { name: 'Karachi', country: 'PK', lat: 24.861, lng: 67.01, tz: 'Asia/Karachi', days: { '2026-11-15': '05:29 06:48 12:16 16:09 17:44 19:03', '2027-01-15': '05:58 07:18 12:41 16:28 18:04 19:24', '2027-03-15': '05:25 06:41 12:41 17:00 18:41 19:56' } },
  // Islamic Foundation, «(সূত্র: ইসলামিক ফাউন্ডেশন)» in Jagonews24's daily table (the Foundation's own site has none):
  // the days published that we read, one of them in Ramadan 1447 (14 March 2026) and one today.
  { name: 'Dhaka', country: 'BD', lat: 23.71, lng: 90.407, tz: 'Asia/Dhaka', days: { '2026-01-22': '05:26 06:42 12:14 16:00 17:41 18:57', '2026-03-14': '04:57 06:08 12:12 16:26 18:11 19:23', '2026-03-25': '04:45 05:57 12:08 16:28 18:15 19:28', '2026-08-06': '04:10 05:29 12:08 16:41 18:42 20:01', '2026-10-26': '04:46 06:01 11:46 15:48 17:28 18:42' } },
  { name: 'London', country: 'GB', lat: 51.508, lng: -0.126, tz: 'Europe/London', days: { '2027-01-15': '06:20 07:57 12:15 14:03 16:23 18:00', '2027-03-15': '04:35 06:12 12:14 15:22 18:07 19:28' } },
  { name: 'New York City', country: 'US', lat: 40.714, lng: -74.006, tz: 'America/New_York', days: { '2026-11-15': '05:28 06:50 11:41 14:12 16:32 17:55', '2027-01-15': '06:02 07:26 12:06 14:27 16:47 18:11', '2027-03-15': '05:51 07:09 13:06 16:25 19:03 20:21' } },
]

/** App minus table, in minutes, for each of the six times, on each day, with «تلقائي حسب البلد» for the city. */
function diffs(c: City, rule = autoRule({ country: c.country, timeZone: c.tz })) {
  const out: Record<Key, number[]> = { fajr: [], sunrise: [], dhuhr: [], asr: [], maghrib: [], isha: [] }
  for (const [day, six] of Object.entries(c.days)) {
    const [y, m, d] = day.split('-').map(Number)
    const t = dayTimes({ lat: c.lat, lng: c.lng }, { y, m, d }, { method: rule.method, asr: rule.asr ?? 'shafi', adjust: rule.adjust ?? {} })
    six.split(' ').forEach((v, i) => out[KEYS[i]].push(toMin(hhmm(t[KEYS[i]], c.tz)) - toMin(v)))
  }
  return out
}
const city = (n: string) => CITIES.find((c) => c.name === n)!
const worst = (d: Record<Key, number[]>, keys: readonly Key[] = KEYS) => Math.max(...keys.flatMap((k) => d[k].map(Math.abs)))

beforeEach(() => store.clear())

describe('add-on 0072-add34 §B4: the times against the authorities’ tables', () => {
  it('the rules of the nine other cities’ countries are as measured, unchanged', () => {
    expect({ SA: COUNTRY_RULES.SA, EG: COUNTRY_RULES.EG, TR: COUNTRY_RULES.TR, MY: COUNTRY_RULES.MY, ID: COUNTRY_RULES.ID, PK: COUNTRY_RULES.PK, GB: COUNTRY_RULES.GB, US: COUNTRY_RULES.US }).toEqual({
      SA: { method: 'UmmAlQura' },
      EG: { method: 'Egyptian' },
      TR: { method: 'Turkey' },
      MY: { method: 'Karachi' },
      ID: { method: 'Singapore', adjust: { fajr: 2, sunrise: -2, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 } },
      PK: { method: 'Karachi', asr: 'hanafi' },
      GB: { method: 'MoonsightingCommittee', adjust: { sunrise: -3, asr: 2 } },
      US: { method: 'NorthAmerica' },
    })
  })

  // The largest difference each city measured; ±2 except Kuala Lumpur (3: no minutes without JAKIM's text, add-on
  // 0071-add17 §1).
  for (const [name, bound] of [['Makkah', 1], ['Riyadh', 1], ['Cairo', 2], ['Istanbul', 2], ['Jakarta', 2], ['Karachi', 2], ['Kuala Lumpur', 3]] as const)
    it(`${name}: within ${bound} min of its table on every day`, () => expect(worst(diffs(city(name)))).toBeLessThanOrEqual(bound))

  it('Makkah in Ramadan (20 February 2027): Isha two hours after Maghrib, as Umm al-Qura prints it', () => {
    const t = dayTimes({ lat: 21.427, lng: 39.826 }, { y: 2027, m: 2, d: 20 }, { method: 'UmmAlQura' })
    expect(t.ramadanIsha).toBe(true)
    expect(hhmm(t.isha, 'Asia/Riyadh')).toBe('20:21')
  })

  it('Dhaka: Karachi with the table’s Maghrib, Hanafi Asr; four of the six within ±2, Fajr and Dhuhr never later than the table, by 3 at most', () => {
    expect(COUNTRY_RULES.BD).toEqual({ method: 'Karachi', asr: 'hanafi', adjust: { maghrib: 3 } })
    const d = diffs(city('Dhaka'))
    expect(worst(d, ['sunrise', 'asr', 'maghrib', 'isha'])).toBeLessThanOrEqual(2)
    for (const k of ['fajr', 'dhuhr'] as const) for (const v of d[k]) expect(v, k).toBeGreaterThanOrEqual(-3), expect(v, k).toBeLessThanOrEqual(0)
    // Before: Muslim World League, 6 minutes off at Isha.
    const before = diffs(city('Dhaka'), { method: 'MuslimWorldLeague', asr: 'hanafi' })
    expect(worst(before)).toBe(7)
    expect(worst(d)).toBe(3)
  })

  it('Dhaka, a few values to the minute: Maghrib and Isha as the Foundation prints them', () => {
    const t = (day: [number, number, number]) => dayTimes({ lat: 23.71, lng: 90.407 }, { y: day[0], m: day[1], d: day[2] }, { method: 'Karachi', asr: 'hanafi', adjust: { maghrib: 3 } })
    const jan = t([2026, 1, 22])
    expect(hhmm(jan.maghrib, 'Asia/Dhaka')).toBe('17:41')
    expect(Math.abs(toMin(hhmm(jan.isha, 'Asia/Dhaka')) - toMin('18:57'))).toBeLessThanOrEqual(1)
    const aug = t([2026, 8, 6])
    expect(Math.abs(toMin(hhmm(aug.maghrib, 'Asia/Dhaka')) - toMin('18:42'))).toBeLessThanOrEqual(1)
    expect(Math.abs(toMin(hhmm(aug.isha, 'Asia/Dhaka')) - toMin('20:01'))).toBeLessThanOrEqual(1)
  })

  it('London: sunrise, Dhuhr, Asr and Maghrib within ±2; Fajr and Isha are the Hizbul Ulama’s sightings, said in the sheet', () => {
    const d = diffs(city('London'))
    expect(worst(d, ['sunrise', 'dhuhr', 'asr', 'maghrib'])).toBeLessThanOrEqual(2)
    expect(worst(d, ['fajr', 'isha'])).toBe(7)
    expect(tableNote({ country: 'GB' })).toBe('observed')
    expect(tableNote({ timeZone: 'Europe/London' })).toBe('observed')
  })

  it('New York: no official table, and ICC-NY’s is not consistent with the sun; Dhuhr agrees, and the sheet says so', () => {
    const d = diffs(city('New York City'))
    expect(worst(d, ['dhuhr'])).toBeLessThanOrEqual(1)
    expect(worst(d)).toBe(8)
    expect(tableNote({ country: 'US', timeZone: 'America/New_York' })).toBe('noTable')
  })

  it('the note is for those two countries only, in the ten languages', () => {
    expect(TABLE_NOTES).toEqual({ GB: 'observed', US: 'noTable' })
    for (const c of ['SA', 'EG', 'TR', 'MY', 'ID', 'PK', 'BD', 'FR', 'CA', 'DE']) expect(tableNote({ country: c }), c).toBeNull()
    expect(tableNote(null)).toBeNull()
    for (const [lang, s] of Object.entries(TODAY)) {
      expect(s.methodTableObserved.length, lang).toBeGreaterThan(20)
      expect(s.methodTableNoTable.length, lang).toBeGreaterThan(20)
      expect(s.methodTableObserved, lang).not.toMatch(/[!！]/)
    }
  })
})

describe('the change reaches «تلقائي حسب البلد» only, and the bells follow it', () => {
  const DHAKA = { lat: 23.71, lng: 90.407, timeZone: 'Asia/Dhaka', source: 'city' as const, country: 'BD' }
  it('automatic (nothing stored, or 1.0’s Umm al-Qura): Karachi, Hanafi, Maghrib +3', () => {
    store.setItem('muslim.place.v1', JSON.stringify(DHAKA))
    expect(loadPrayerPrefs()).toMatchObject({ choice: 'auto', method: 'Karachi', asr: 'hanafi', adjust: { maghrib: 3 } })
    store.setItem('muslim.prayer.v1', JSON.stringify({ method: 'UmmAlQura', asr: 'shafi' }))
    expect(loadPrayerPrefs()).toMatchObject({ choice: 'auto', method: 'Karachi', asr: 'hanafi', adjust: { maghrib: 3 } })
  })

  it('a method or an Asr chosen by hand stays, without the country’s minutes', () => {
    store.setItem('muslim.place.v1', JSON.stringify(DHAKA))
    store.setItem('muslim.prayer.v1', JSON.stringify({ v: 2, method: 'MuslimWorldLeague', asr: 'auto' }))
    expect(loadPrayerPrefs()).toEqual({ choice: 'MuslimWorldLeague', asrChoice: 'auto', method: 'MuslimWorldLeague', asr: 'hanafi', adjust: {} })
    store.setItem('muslim.prayer.v1', JSON.stringify({ v: 2, method: 'auto', asr: 'shafi' }))
    expect(loadPrayerPrefs()).toEqual({ choice: 'auto', asrChoice: 'shafi', method: 'Karachi', asr: 'shafi', adjust: { maghrib: 3 } })
    // 1.0's other method, kept by hand.
    store.setItem('muslim.prayer.v1', JSON.stringify({ method: 'MuslimWorldLeague', asr: 'hanafi' }))
    expect(loadPrayerPrefs()).toEqual({ choice: 'MuslimWorldLeague', asrChoice: 'hanafi', method: 'MuslimWorldLeague', asr: 'hanafi', adjust: {} })
  })

  it('the server’s bell rings at the Maghrib the page shows, from the settings the device sends', () => {
    const p = resolvePrayer({ choice: 'auto', asrChoice: 'auto' }, DHAKA)
    const sub = { cell_lat: 23.7, cell_lng: 90.4, tz: 'Asia/Dhaka', method: p.method, asr: p.asr, adjust: JSON.stringify(p.adjust), prayers: JSON.stringify(['maghrib']), ward: null }
    const now = new Date('2026-10-26T06:00:00Z')
    const bell = nextBell(sub, now)!
    expect(bell.kind).toBe('maghrib')
    const page = dayTimes({ lat: 23.7, lng: 90.4 }, { y: 2026, m: 10, d: 26 }, { method: p.method, asr: p.asr, adjust: p.adjust })
    expect(bell.at).toBe(page.maghrib.getTime())
    expect(hhmm(new Date(bell.at), 'Asia/Dhaka')).toBe('17:27')
  })
})

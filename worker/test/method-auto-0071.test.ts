// Add-on 0071-add13 §1, «تلقائي حسب البلد»: the calculation method follows the place's country, from the city list's
// code or the place's time zone (web/src/daily/method-auto.ts), on the device. Nothing stored means automatic; a method
// an earlier version stored stays as it is. The published tables of 23 October 2026 below are the measurement of
// relay/w1/0071-market/1-methods.md, quoted as their authorities publish them: the method each country gets must stay
// as close to its table as measured, and closer than Umm al-Qura wherever it is not Umm al-Qura.
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

const { AUTO_FALLBACK, METHOD_BY_COUNTRY, autoMethod, countryOfZone, placeCountry } = await import('../../web/src/daily/method-auto')
const { dayTimes, hhmm, METHODS } = await import('../../web/src/daily/prayer')
const { placeFromCity } = await import('../../web/src/daily/location')
const { loadPrayerPrefs, methodOf, savePrayerPrefs } = await import('../../web/src/v2/daily/store')

type Six = [string, string, string, string, string, string]
// [city, country, lat, lng, zone, published fajr…isha, Asr school of the table, the bound measured for the method chosen]
// Coordinates from the app's own city list (web/public/geo/cities.json, GeoNames).
const TABLES: [string, string, number, number, string, Six, 'shafi' | 'hanafi', number][] = [
  // KACST, Umm al-Qura calendar service (umqserv.kacst.gov.sa, the service of ummulqura.org.sa)
  ['Riyadh', 'SA', 24.688, 46.722, 'Asia/Riyadh', ['04:37', '05:54', '11:38', '14:54', '17:20', '18:50'], 'shafi', 1],
  // Dar al-Ifta al-Misriyyah, dar-alifta.org/ar/prayer (Cairo)
  ['Cairo', 'EG', 30.063, 31.25, 'Africa/Cairo', ['05:35', '07:02', '12:39', '15:51', '18:16', '19:34'], 'shafi', 1],
  // Diyanet, namazvakitleri.diyanet.gov.tr (İstanbul)
  ['Istanbul', 'TR', 41.014, 28.95, 'Europe/Istanbul', ['05:52', '07:17', '12:53', '15:50', '18:20', '19:40'], 'shafi', 1],
  // East London Mosque, timetable 2026 «Based on the London Unified Prayer Timetable» (Asr: 1 Mithl)
  ['London', 'GB', 51.508, -0.126, 'Europe/London', ['06:00', '07:35', '12:50', '15:20', '17:54', '19:19'], 'shafi', 4],
  // Grande Mosquée de Paris, «Heures des Prières de Paris et ses Banlieues 2026»
  ['Paris', 'FR', 48.853, 2.349, 'Europe/Paris', ['06:48', '08:23', '13:40', '16:15', '18:49', '20:16'], 'shafi', 6],
  // Islamic Cultural Center of New York, icc-ny.us/monthlyprayer
  ['New York City', 'US', 40.714, -74.006, 'America/New_York', ['06:02', '07:21', '12:41', '15:35', '18:01', '19:20'], 'shafi', 5],
  // Kemenag, Bimas Islam, bimasislam.kemenag.go.id/jadwalshalat (Kota Jakarta)
  ['Jakarta', 'ID', -6.215, 106.845, 'Asia/Jakarta', ['04:12', '05:26', '11:41', '14:51', '17:49', '18:59'], 'shafi', 3],
  // Jamia Uloom-ul-Islamia, Banuri Town, banuri.edu.pk/namaz-times (Karachi; its Asr is the Hanafi one)
  ['Karachi', 'PK', 24.861, 67.01, 'Asia/Karachi', ['05:17', '06:34', '12:16', '16:21', '17:58', '19:15'], 'hanafi', 1],
  // JAKIM e-Solat, zone WLY01 (Kuala Lumpur)
  ['Kuala Lumpur', 'MY', 3.141, 101.686, 'Asia/Kuala_Lumpur', ['05:49', '06:56', '13:00', '16:19', '19:00', '20:10'], 'shafi', 3],
  // MUIS, Muslim Prayer Timetable 2026 (data.gov.sg)
  ['Singapore', 'SG', 1.29, 103.85, 'Asia/Singapore', ['05:29', '06:47', '12:51', '16:08', '18:52', '20:02'], 'shafi', 1],
  // General Authority of Islamic Affairs, Endowments and Zakat (awqaf.gov.ae), Abu Dhabi
  ['Abu Dhabi', 'AE', 24.451, 54.397, 'Asia/Dubai', ['05:07', '06:21', '12:09', '15:24', '17:52', '19:06'], 'shafi', 2],
  // Qatar's Ministry of Awqaf (islam.gov.qa), Doha: a tie with Umm al-Qura, so Qatar keeps it
  ['Doha', 'QA', 25.285, 51.531, 'Asia/Qatar', ['04:18', '05:36', '11:18', '14:34', '17:02', '18:32'], 'shafi', 2],
]
const DAY = { y: 2026, m: 10, d: 23 }
const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
/** The largest difference in minutes from the published table, over the six times. */
function maxDiff(lat: number, lng: number, tz: string, table: Six, method: (typeof METHODS)[number], asr: 'shafi' | 'hanafi') {
  const t = dayTimes({ lat, lng }, DAY, { method, asr })
  return Math.max(...KEYS.map((k, i) => Math.abs(toMin(hhmm(t[k], tz)) - toMin(table[i]))))
}

beforeEach(() => store.clear())

describe('«تلقائي حسب البلد»: the method by country (add-on 0071-add13 §1)', () => {
  it('the countries measured, and Umm al-Qura for every other country', () => {
    expect(METHOD_BY_COUNTRY).toEqual({
      SA: 'UmmAlQura',
      EG: 'Egyptian',
      TR: 'Turkey',
      GB: 'MoonsightingCommittee',
      FR: 'MoonsightingCommittee',
      US: 'NorthAmerica',
      ID: 'Singapore',
      PK: 'Karachi',
      MY: 'Karachi',
      SG: 'Singapore',
      AE: 'Dubai',
    })
    expect(AUTO_FALLBACK).toBe('UmmAlQura')
    for (const m of Object.values(METHOD_BY_COUNTRY)) expect(METHODS).toContain(m)
    for (const c of ['QA', 'KW', 'BH', 'OM', 'YE', 'JO', 'MA', 'DE', 'IN', 'BD', 'NG', 'IR']) expect(autoMethod({ country: c })).toBe('UmmAlQura')
  })

  it('the country from the time zone: every zone of a listed country, and nothing for another', () => {
    const zones: [string, string][] = [
      ['Asia/Riyadh', 'SA'], ['Africa/Cairo', 'EG'], ['Europe/Istanbul', 'TR'], ['Asia/Istanbul', 'TR'], ['Europe/London', 'GB'],
      ['Europe/Paris', 'FR'], ['America/New_York', 'US'], ['America/Los_Angeles', 'US'], ['America/Chicago', 'US'],
      ['America/Indiana/Indianapolis', 'US'], ['America/Kentucky/Louisville', 'US'], ['America/North_Dakota/Center', 'US'],
      ['Pacific/Honolulu', 'US'], ['Asia/Jakarta', 'ID'], ['Asia/Makassar', 'ID'], ['Asia/Jayapura', 'ID'], ['Asia/Pontianak', 'ID'],
      ['Asia/Karachi', 'PK'], ['Asia/Kuala_Lumpur', 'MY'], ['Asia/Kuching', 'MY'], ['Asia/Singapore', 'SG'], ['Asia/Dubai', 'AE'],
    ]
    for (const [z, c] of zones) expect(countryOfZone(z), z).toBe(c)
    for (const z of ['Asia/Kuwait', 'Asia/Qatar', 'Asia/Amman', 'Europe/Berlin', 'America/Toronto', 'Asia/Kolkata', 'Asia/Tehran', 'UTC', '', undefined])
      expect(countryOfZone(z), String(z)).toBeNull()
  })

  it('the city list’s country comes first; a place saved before it, or a located one, goes by its zone', () => {
    // A city picked from the list keeps its country, even where the zone would say another.
    expect(placeCountry({ country: 'EG', timeZone: 'Asia/Riyadh' })).toBe('EG')
    expect(placeCountry({ country: 'eg' })).toBe('EG')
    expect(placeCountry({ country: 'KW', timeZone: 'Asia/Kuwait' })).toBe('KW')
    expect(autoMethod({ country: 'KW', timeZone: 'Asia/Kuwait' })).toBe('UmmAlQura')
    // Without a country (saved before this change, or by the browser's location): the zone.
    expect(placeCountry({ timeZone: 'Africa/Cairo' })).toBe('EG')
    expect(placeCountry({ country: 'x1', timeZone: 'Europe/London' })).toBe('GB')
    expect(autoMethod({ timeZone: 'Europe/London' })).toBe('MoonsightingCommittee')
    expect(autoMethod(null)).toBe('UmmAlQura')
    expect(autoMethod({ timeZone: 'Asia/Kolkata' })).toBe('UmmAlQura')
    // The city list's row gives its country to the saved place.
    expect(placeFromCity(['Cairo', 'القاهرة', 30.063, 31.25, 'EG', 'Africa/Cairo', 0])).toMatchObject({ country: 'EG', timeZone: 'Africa/Cairo', source: 'city' })
  })

  it('nothing stored: automatic, by the saved place', () => {
    store.setItem('muslim.place.v1', JSON.stringify({ lat: 30.063, lng: 31.25, timeZone: 'Africa/Cairo', name: 'القاهرة', source: 'city' }))
    expect(loadPrayerPrefs()).toEqual({ choice: 'auto', method: 'Egyptian', asr: 'shafi' })
    store.setItem('muslim.place.v1', JSON.stringify({ lat: 24.688, lng: 46.722, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }))
    expect(loadPrayerPrefs()).toEqual({ choice: 'auto', method: 'UmmAlQura', asr: 'shafi' })
    store.removeItem('muslim.place.v1')
    expect(loadPrayerPrefs()).toEqual({ choice: 'auto', method: 'UmmAlQura', asr: 'shafi' })
    // A place given (the screen's own) wins over the saved one.
    expect(loadPrayerPrefs({ lat: 41, lng: 29, timeZone: 'Europe/Istanbul', source: 'gps' }).method).toBe('Turkey')
  })

  it('a method an earlier version stored stays chosen by hand, whatever the place', () => {
    store.setItem('muslim.place.v1', JSON.stringify({ lat: 30.063, lng: 31.25, timeZone: 'Africa/Cairo', source: 'city', country: 'EG' }))
    store.setItem('muslim.prayer.v1', JSON.stringify({ method: 'MuslimWorldLeague', asr: 'shafi' }))
    expect(loadPrayerPrefs()).toEqual({ choice: 'MuslimWorldLeague', method: 'MuslimWorldLeague', asr: 'shafi' })
    store.setItem('muslim.prayer.v1', JSON.stringify({ method: 'UmmAlQura', asr: 'hanafi' }))
    expect(loadPrayerPrefs()).toEqual({ choice: 'UmmAlQura', method: 'UmmAlQura', asr: 'hanafi' })
    // Something unreadable is the default, automatic.
    store.setItem('muslim.prayer.v1', JSON.stringify({ method: 'Nope', asr: 'x' }))
    expect(loadPrayerPrefs()).toEqual({ choice: 'auto', method: 'Egyptian', asr: 'shafi' })
    store.setItem('muslim.prayer.v1', '{')
    expect(loadPrayerPrefs().choice).toBe('auto')
  })

  it('saved as before ({ method, asr }), with «auto» as a method; choosing by hand again keeps it', () => {
    savePrayerPrefs({ choice: 'auto', asr: 'hanafi' })
    expect(JSON.parse(store.getItem('muslim.prayer.v1')!)).toEqual({ method: 'auto', asr: 'hanafi' })
    expect(loadPrayerPrefs({ lat: 24.861, lng: 67.01, timeZone: 'Asia/Karachi', source: 'city', country: 'PK' })).toEqual({ choice: 'auto', method: 'Karachi', asr: 'hanafi' })
    savePrayerPrefs({ choice: 'Tehran', asr: 'shafi' })
    expect(loadPrayerPrefs({ lat: 24.861, lng: 67.01, timeZone: 'Asia/Karachi', source: 'city', country: 'PK' })).toEqual({ choice: 'Tehran', method: 'Tehran', asr: 'shafi' })
    expect(methodOf('auto', { lat: 1.29, lng: 103.85, timeZone: 'Asia/Singapore', source: 'gps' })).toBe('Singapore')
    expect(methodOf('Qatar', { lat: 1.29, lng: 103.85, timeZone: 'Asia/Singapore', source: 'gps' })).toBe('Qatar')
  })

  describe('23 October 2026: the method chosen against the published table', () => {
    for (const [city, country, lat, lng, tz, table, asr, bound] of TABLES)
      it(`${city} (${country}): ${autoMethod({ country })} within ${bound} min`, () => {
        const m = autoMethod({ country, timeZone: tz })
        expect(autoMethod({ timeZone: tz })).toBe(m)
        const after = maxDiff(lat, lng, tz, table, m, asr)
        const before = maxDiff(lat, lng, tz, table, 'UmmAlQura', asr)
        expect(after).toBeLessThanOrEqual(bound)
        if (m !== 'UmmAlQura') expect(after).toBeLessThan(before)
      })
  })
})

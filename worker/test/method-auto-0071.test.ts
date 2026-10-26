// Add-ons 0071-add13 §1 and 0071-add15 §1, «تلقائي حسب البلد»: the calculation method, the Asr school and the
// precaution minutes follow the place's country, from the city list's code or the place's time zone
// (web/src/daily/method-auto.ts), on the device. Nothing stored means automatic; 1.0's Umm al-Qura is automatic, its
// Hanafi Asr stays. The published tables of 23 October 2026 below are the measurement of
// relay/w1/0071-market/1-methods.md, quoted as their authorities publish them: each country's rule must stay as close
// to its table as measured, and no further from it than Umm al-Qura.
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

const { AUTO_FALLBACK, COUNTRY_RULES, autoMethod, autoRule, countryOfZone, placeCountry } = await import('../../web/src/daily/method-auto')
const { dayTimes, hhmm, METHODS } = await import('../../web/src/daily/prayer')
const { placeFromCity } = await import('../../web/src/daily/location')
const { loadPrayerChoices, loadPrayerPrefs, prayerOptions, resolvePrayer, savePrayerPrefs } = await import('../../web/src/v2/daily/store')

type Six = [string, string, string, string, string, string]
// [city, country, lat, lng, zone, published fajr…isha, the Asr school the table prints, the bound measured for the rule]
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
  // Islamic Foundation of Toronto (portal.ad-din.ca, masjid 14; «begins»; its Asr is the Hanafi one)
  ['Toronto', 'CA', 43.706, -79.399, 'America/Toronto', ['06:22', '07:42', '13:07', '16:37', '18:21', '19:33'], 'hanafi', 8],
  // Kemenag, Bimas Islam, bimasislam.kemenag.go.id/jadwalshalat (Kota Jakarta)
  ['Jakarta', 'ID', -6.215, 106.845, 'Asia/Jakarta', ['04:12', '05:26', '11:41', '14:51', '17:49', '18:59'], 'shafi', 1],
  // Jamia Uloom-ul-Islamia, Banuri Town, banuri.edu.pk/namaz-times (Karachi; its Asr is the Hanafi one)
  ['Karachi', 'PK', 24.861, 67.01, 'Asia/Karachi', ['05:17', '06:34', '12:16', '16:21', '17:58', '19:15'], 'hanafi', 1],
  // JAKIM e-Solat, zone WLY01 (Kuala Lumpur)
  ['Kuala Lumpur', 'MY', 3.141, 101.686, 'Asia/Kuala_Lumpur', ['05:49', '06:56', '13:00', '16:19', '19:00', '20:10'], 'shafi', 3],
  // MUIS, Muslim Prayer Timetable 2026 (data.gov.sg)
  ['Singapore', 'SG', 1.29, 103.85, 'Asia/Singapore', ['05:29', '06:47', '12:51', '16:08', '18:52', '20:02'], 'shafi', 1],
  // General Authority of Islamic Affairs, Endowments and Zakat (awqaf.gov.ae), Abu Dhabi
  ['Abu Dhabi', 'AE', 24.451, 54.397, 'Asia/Dubai', ['05:07', '06:21', '12:09', '15:24', '17:52', '19:06'], 'shafi', 2],
  // Qatar's Ministry of Awqaf (islam.gov.qa), Doha
  ['Doha', 'QA', 25.285, 51.531, 'Asia/Qatar', ['04:18', '05:36', '11:18', '14:34', '17:02', '18:32'], 'shafi', 2],
  // Jordan's Ministry of Awqaf (awqaf.gov.jo/ar/Pages/PrayerTime), «عمان، البلقاء، الزرقاء، مادبا»
  ['Amman', 'JO', 31.955, 35.945, 'Asia/Amman', ['05:23', '06:39', '12:21', '15:31', '18:02', '19:17'], 'shafi', 4],
  // Germany has no official table: Diyanet's for Berlin (DITIB's mosques) only shows Muslim World League is nearer than
  // Umm al-Qura was
  ['Berlin', 'DE', 52.524, 13.411, 'Europe/Berlin', ['05:51', '07:39', '12:56', '15:28', '18:03', '19:37'], 'shafi', 8],
]
const DAY = { y: 2026, m: 10, d: 23 }
const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
/** The largest difference in minutes from the published table, over the six times. */
function maxDiff(lat: number, lng: number, tz: string, table: Six, opts: Parameters<typeof dayTimes>[2]) {
  const t = dayTimes({ lat, lng }, DAY, opts)
  return Math.max(...KEYS.map((k, i) => Math.abs(toMin(hhmm(t[k], tz)) - toMin(table[i]))))
}
const AUTO = { choice: 'auto', asrChoice: 'auto' } as const
const CAIRO = { lat: 30.063, lng: 31.25, timeZone: 'Africa/Cairo', name: 'القاهرة', source: 'city' as const }
const KARACHI = { lat: 24.861, lng: 67.01, timeZone: 'Asia/Karachi', source: 'city' as const, country: 'PK' }

beforeEach(() => store.clear())

describe('«تلقائي حسب البلد»: method, Asr and minutes by country (add-ons 0071-add13 §1, 0071-add15 §1)', () => {
  it('the countries measured or decided, and Muslim World League for every other country', () => {
    expect(Object.fromEntries(Object.entries(COUNTRY_RULES).map(([c, r]) => [c, r.method]))).toEqual({
      SA: 'UmmAlQura',
      EG: 'Egyptian',
      TR: 'Turkey',
      GB: 'MoonsightingCommittee',
      FR: 'MoonsightingCommittee',
      US: 'NorthAmerica',
      CA: 'NorthAmerica',
      ID: 'Singapore',
      PK: 'Karachi',
      IN: 'MuslimWorldLeague',
      BD: 'Karachi',
      AF: 'MuslimWorldLeague',
      MY: 'Karachi',
      SG: 'Singapore',
      AE: 'Dubai',
      QA: 'Qatar',
      KW: 'Kuwait',
      JO: 'Dubai',
    })
    expect(AUTO_FALLBACK).toEqual({ method: 'MuslimWorldLeague' })
    for (const r of Object.values(COUNTRY_RULES)) expect(METHODS).toContain(r.method)
    for (const c of ['BH', 'OM', 'YE', 'MA', 'DE', 'NG', 'IR', 'NL', 'ZA']) expect(autoRule({ country: c })).toEqual({ method: 'MuslimWorldLeague' })
    expect(autoMethod(null)).toBe('MuslimWorldLeague')
  })

  it('the Asr the table prints: Hanafi in Pakistan, India, Bangladesh and Afghanistan; the majority elsewhere', () => {
    const hanafi = Object.entries(COUNTRY_RULES).filter(([, r]) => r.asr === 'hanafi').map(([c]) => c)
    expect(hanafi.sort()).toEqual(['AF', 'BD', 'IN', 'PK'])
    for (const r of Object.values(COUNTRY_RULES)) expect(r.asr === undefined || r.asr === 'hanafi').toBe(true)
  })

  it('the precaution minutes the tables state: London’s allowances, Kemenag’s ihtiyat and the Islamic Foundation’s Maghrib (add-on 0072-add34 §B4), nothing else', () => {
    const withAdjust = Object.entries(COUNTRY_RULES).filter(([, r]) => r.adjust).map(([c, r]) => [c, r.adjust])
    expect(withAdjust).toEqual([
      ['GB', { sunrise: -3, asr: 2 }],
      ['ID', { fajr: 2, sunrise: -2, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 }],
      ['BD', { maghrib: 3 }],
    ])
  })

  it('the country from the time zone: every zone of a listed country, and nothing for another', () => {
    const zones: [string, string][] = [
      ['Asia/Riyadh', 'SA'], ['Africa/Cairo', 'EG'], ['Europe/Istanbul', 'TR'], ['Asia/Istanbul', 'TR'], ['Europe/London', 'GB'],
      ['Europe/Paris', 'FR'], ['America/New_York', 'US'], ['America/Los_Angeles', 'US'], ['America/Chicago', 'US'],
      ['America/Indiana/Indianapolis', 'US'], ['America/Kentucky/Louisville', 'US'], ['America/North_Dakota/Center', 'US'],
      ['Pacific/Honolulu', 'US'], ['America/Toronto', 'CA'], ['America/Vancouver', 'CA'], ['America/St_Johns', 'CA'],
      ['Asia/Jakarta', 'ID'], ['Asia/Makassar', 'ID'], ['Asia/Jayapura', 'ID'], ['Asia/Pontianak', 'ID'], ['Asia/Karachi', 'PK'],
      ['Asia/Kolkata', 'IN'], ['Asia/Calcutta', 'IN'], ['Asia/Dhaka', 'BD'], ['Asia/Kabul', 'AF'], ['Asia/Kuala_Lumpur', 'MY'],
      ['Asia/Kuching', 'MY'], ['Asia/Singapore', 'SG'], ['Asia/Dubai', 'AE'], ['Asia/Qatar', 'QA'], ['Asia/Kuwait', 'KW'], ['Asia/Amman', 'JO'],
    ]
    for (const [z, c] of zones) expect(countryOfZone(z), z).toBe(c)
    for (const z of ['Asia/Bahrain', 'Africa/Casablanca', 'Europe/Berlin', 'Asia/Tehran', 'Africa/Lagos', 'UTC', '', undefined])
      expect(countryOfZone(z), String(z)).toBeNull()
  })

  it('the city list’s country comes first; a place saved before it, or a located one, goes by its zone', () => {
    expect(placeCountry({ country: 'EG', timeZone: 'Asia/Riyadh' })).toBe('EG')
    expect(placeCountry({ country: 'eg' })).toBe('EG')
    expect(autoRule({ country: 'DE', timeZone: 'Europe/Berlin' })).toEqual({ method: 'MuslimWorldLeague' })
    expect(placeCountry({ timeZone: 'Africa/Cairo' })).toBe('EG')
    expect(placeCountry({ country: 'x1', timeZone: 'Europe/London' })).toBe('GB')
    expect(autoRule({ timeZone: 'Europe/London' })).toEqual({ method: 'MoonsightingCommittee', adjust: { sunrise: -3, asr: 2 } })
    expect(autoRule({ timeZone: 'Asia/Kolkata' })).toEqual({ method: 'MuslimWorldLeague', asr: 'hanafi' })
    expect(placeFromCity(['Cairo', 'القاهرة', 30.063, 31.25, 'EG', 'Africa/Cairo', 0])).toMatchObject({ country: 'EG', timeZone: 'Africa/Cairo', source: 'city' })
  })

  it('nothing stored: automatic method and Asr, by the saved place', () => {
    expect(loadPrayerChoices()).toEqual(AUTO)
    store.setItem('muslim.place.v1', JSON.stringify(CAIRO))
    expect(loadPrayerPrefs()).toEqual({ ...AUTO, method: 'Egyptian', asr: 'shafi', adjust: {} })
    store.setItem('muslim.place.v1', JSON.stringify(KARACHI))
    expect(loadPrayerPrefs()).toEqual({ ...AUTO, method: 'Karachi', asr: 'hanafi', adjust: {} })
    store.removeItem('muslim.place.v1')
    expect(loadPrayerPrefs()).toEqual({ ...AUTO, method: 'MuslimWorldLeague', asr: 'shafi', adjust: {} })
    // A place given (the screen's own) wins over the saved one; the minutes come with the country's method.
    expect(loadPrayerPrefs({ lat: 51.5, lng: -0.1, timeZone: 'Europe/London', source: 'gps' })).toEqual({ ...AUTO, method: 'MoonsightingCommittee', asr: 'shafi', adjust: { sunrise: -3, asr: 2 } })
  })

  it('a record of 1.0: its Umm al-Qura is automatic, its Hanafi Asr stays, its majority Asr follows the country', () => {
    store.setItem('muslim.place.v1', JSON.stringify(KARACHI))
    store.setItem('muslim.prayer.v1', JSON.stringify({ method: 'UmmAlQura', asr: 'shafi' }))
    expect(loadPrayerPrefs()).toEqual({ ...AUTO, method: 'Karachi', asr: 'hanafi', adjust: {} })
    store.setItem('muslim.place.v1', JSON.stringify(CAIRO))
    store.setItem('muslim.prayer.v1', JSON.stringify({ method: 'UmmAlQura', asr: 'hanafi' }))
    expect(loadPrayerPrefs()).toEqual({ choice: 'auto', asrChoice: 'hanafi', method: 'Egyptian', asr: 'hanafi', adjust: {} })
    // Another method from before stays chosen by hand, without the country's minutes.
    store.setItem('muslim.place.v1', JSON.stringify({ ...CAIRO, lat: -6.215, lng: 106.845, timeZone: 'Asia/Jakarta', country: 'ID' }))
    store.setItem('muslim.prayer.v1', JSON.stringify({ method: 'Singapore', asr: 'shafi' }))
    expect(loadPrayerPrefs()).toEqual({ choice: 'Singapore', asrChoice: 'auto', method: 'Singapore', asr: 'shafi', adjust: {} })
    // Unreadable: the default, automatic.
    store.setItem('muslim.prayer.v1', JSON.stringify({ method: 'Nope', asr: 'x' }))
    expect(loadPrayerChoices()).toEqual(AUTO)
    store.setItem('muslim.prayer.v1', '{')
    expect(loadPrayerChoices()).toEqual(AUTO)
  })

  it('stored with its version; a choice by hand, of the method or the Asr, stays as chosen', () => {
    savePrayerPrefs({ choice: 'auto', asrChoice: 'shafi' })
    expect(JSON.parse(store.getItem('muslim.prayer.v1')!)).toEqual({ v: 2, method: 'auto', asr: 'shafi' })
    expect(loadPrayerPrefs(KARACHI)).toEqual({ choice: 'auto', asrChoice: 'shafi', method: 'Karachi', asr: 'shafi', adjust: {} })
    savePrayerPrefs({ choice: 'UmmAlQura', asrChoice: 'auto' })
    expect(loadPrayerPrefs(KARACHI)).toEqual({ choice: 'UmmAlQura', asrChoice: 'auto', method: 'UmmAlQura', asr: 'hanafi', adjust: {} })
    savePrayerPrefs({ choice: 'Tehran', asrChoice: 'hanafi' })
    expect(loadPrayerChoices()).toEqual({ choice: 'Tehran', asrChoice: 'hanafi' })
    expect(prayerOptions(resolvePrayer(AUTO, { lat: -6.2, lng: 106.8, timeZone: 'Asia/Jakarta', source: 'gps' }))).toEqual({
      method: 'Singapore',
      asr: 'shafi',
      adjust: { fajr: 2, sunrise: -2, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 },
    })
  })

  it('the app’s local alerts carry the country’s minutes, as the times screen', async () => {
    const { planAlerts } = await import('../../web/src/native/bells')
    const place = { lat: -6.215, lng: 106.845, timeZone: 'Asia/Jakarta' }
    const r = resolvePrayer(AUTO, { ...place, source: 'gps' })
    const input = { place, bells: ['fajr', 'sunrise'], ward: false, method: r.method, asr: r.asr, lang: 'ar', now: new Date('2026-10-22T12:00:00Z'), limit: 2 }
    const [plain, withMinutes] = [planAlerts(input), planAlerts({ ...input, adjust: r.adjust })]
    expect(withMinutes.map((a) => a.kind)).toEqual(['fajr', 'sunrise'])
    expect((withMinutes[0].at - plain[0].at) / 60_000).toBe(2)
    expect((withMinutes[1].at - plain[1].at) / 60_000).toBe(-2)
    expect(withMinutes[0].at).toBe(dayTimes(place, DAY, prayerOptions(r)).fajr.getTime())
  })

  describe('23 October 2026: the rule against the published table', () => {
    for (const [city, country, lat, lng, tz, table, asr, bound] of TABLES)
      it(`${city} (${country}): ${autoMethod({ country })} within ${bound} min, no further than Umm al-Qura`, () => {
        const rule = autoRule({ country, timeZone: tz })
        if (country !== 'DE') expect(autoRule({ timeZone: tz })).toEqual(rule)
        // The table's own Asr school is compared with ours of the same school.
        const after = maxDiff(lat, lng, tz, table, { method: rule.method, asr, adjust: rule.adjust })
        const before = maxDiff(lat, lng, tz, table, { method: 'UmmAlQura', asr })
        expect(after).toBeLessThanOrEqual(bound)
        expect(after).toBeLessThanOrEqual(before)
      })
  })
})

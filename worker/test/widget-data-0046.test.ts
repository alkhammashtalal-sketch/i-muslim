// Reply 0046: the iOS widgets show what the app shows. The file the app writes (web/src/native/widget-data.ts) holds,
// for each day, the times, the dates, the ayah and the hadith that the app itself gives for that day: nine cities on
// three dates, one in Ramadan by the Umm al-Qura calendar and one in the northern summer (clocks moved in London and
// New York). The widget extension reaches no network, and the strings exist in the ten languages.
import fs from 'node:fs'
import path from 'node:path'
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
const realFetch = globalThis.fetch

const ROOT = path.resolve(__dirname, '../..')
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')

const { buildWidgetData, zonedMidnight, digitsOf, WIDGET_DAYS } = await import('../../web/src/native/widget-data')
const { dayTimes, ymdIn, isRamadan } = await import('../../web/src/daily/prayer')
const { timeOf, gregorianText } = await import('../../web/src/v2/daily/format')
const { hijriDisc } = await import('../../web/src/v2/home/hijri-disc')
const { dailyAyah } = await import('../../web/src/v2/home/daily-ayah')
const { WIDGET_STRINGS } = await import('../../web/src/native/widget-strings')

// Coordinates from GeoNames (data/processed/cities.json), not from memory.
const CITIES: [string, number, number, string][] = [
  ['الرياض', 24.6877, 46.7219, 'Asia/Riyadh'],
  ['جدة', 21.4901, 39.1862, 'Asia/Riyadh'],
  ['مكة', 21.4266, 39.8256, 'Asia/Riyadh'],
  ['الطائف', 21.2703, 40.4158, 'Asia/Riyadh'],
  ['الدمام', 26.4344, 50.1033, 'Asia/Riyadh'],
  ['القاهرة', 30.0626, 31.2497, 'Africa/Cairo'],
  ['London', 51.5085, -0.1257, 'Europe/London'],
  ['New York', 40.7143, -74.006, 'America/New_York'],
  ['Jakarta', -6.2146, 106.8451, 'Asia/Jakarta'],
]
// 14 October 2026, 20 February 2027 (13 Ramadan 1448 by Umm al-Qura, checked below), 21 June 2027.
const DATES = ['2026-10-14T09:00:00Z', '2027-02-20T09:00:00Z', '2027-06-21T09:00:00Z']

const AYAH_TEXT = (s: number, a: number) => `نص الآية ${s}:${a}`
const HADITH_ID = (day: string) => String(1000 + Number(day.replaceAll('-', '')) % 997)

beforeAll(() => {
  vi.stubGlobal('fetch', async (url: string) => {
    const u = new URL(url, 'https://x.test')
    const pass = u.pathname.match(/^\/api\/passage\/quran:(\d+):(\d+)$/)
    if (pass) {
      const [s, a] = [Number(pass[1]), Number(pass[2])]
      return new Response(JSON.stringify({ id: `quran:${s}:${a}`, text: AYAH_TEXT(s, a), ref: `x:${a}`, ayah: { sura: s, aya: a, page: 1, suraName: 'البقرة', suraAyat: 286 } }))
    }
    if (u.pathname === '/api/today/days') {
      const n = Number(u.searchParams.get('n'))
      const now = Date.now()
      const days = Array.from({ length: n }, (_, k) => {
        const day = new Date(now + k * 86_400_000 + 3 * 3600_000).toISOString().slice(0, 10)
        return { day, hadith: { id: HADITH_ID(day), text: `حديث ${day}`, grade: 'صحيح', attribution: 'متفق عليه' } }
      })
      return new Response(JSON.stringify({ from: days[0].day, days }))
    }
    // Tasbih texts and the adhkar list: not needed for these checks.
    return new Response('{}', { status: 404 })
  })
})
afterAll(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('the widgets show what the app shows (reply 0046)', () => {
  it('the dates are checked: 20 February 2027 is in Ramadan', () => {
    expect(isRamadan({ y: 2027, m: 2, d: 20 })).toBe(true)
    expect(isRamadan({ y: 2026, m: 10, d: 14 })).toBe(false)
  })

  for (const iso of DATES)
    for (const [name, lat, lng, tz] of CITIES)
      it(`${name} on ${iso.slice(0, 10)}: times, dates, ayah and hadith as the app gives them`, async () => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(iso))
        store.clear()
        store.setItem('imuslim.settings.v1', JSON.stringify({ lang: 'ar', content: 'ar' }))
        store.setItem('muslim.place.v1', JSON.stringify({ lat, lng, timeZone: tz, name, source: 'city' }))
        const now = new Date(iso)
        const data = await buildWidgetData(now)
        expect(data.days).toHaveLength(WIDGET_DAYS)
        expect(data.place).toEqual({ name, tz })
        const place = { lat, lng }
        for (const k of [0, 1, 29, 59]) {
          const day = data.days[k]
          const ymd = ymdIn(new Date(day.start + 12 * 3600_000), tz)
          // The day is the civil date at the place, from its midnight to the next.
          expect(day.date).toBe(`${ymd.y}-${String(ymd.m).padStart(2, '0')}-${String(ymd.d).padStart(2, '0')}`)
          expect(ymdIn(new Date(day.start), tz)).toEqual(ymd)
          expect(ymdIn(new Date(day.start - 1), tz)).not.toEqual(ymd)
          expect(day.start).toBe(zonedMidnight(ymd, tz))
          // The times: dayTimes and timeOf, as the times screen (PrayerTimes.tsx prayerState, no settings saved).
          const t = dayTimes(place, ymd, {})
          const want = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'midnight', 'lastThird'].map((key) => ({
            key,
            at: (t as unknown as Record<string, Date>)[key].getTime(),
            text: timeOf((t as unknown as Record<string, Date>)[key], 'ar', tz),
          }))
          expect(day.times.map(({ key, at, text }) => ({ key, at, text }))).toEqual(want)
          expect(day.times.filter((x) => x.prayer).map((x) => x.key)).toEqual(['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'])
          // The dates: the day card's disc and the app's Gregorian.
          const noon = new Date(day.start + 12 * 3600_000)
          const disc = hijriDisc('ar', noon, tz)!
          expect(day.hijri).toEqual({ day: disc.day, month: disc.month, year: disc.year, text: disc.full })
          expect(day.gregorian).toBe(gregorianText(noon, 'ar', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, tz))
          // The ayah: the card's own rule, its text as the app received it, never shortened.
          const pick = dailyAyah(noon.getTime())!
          expect(day.ayah?.url).toBe(`imuslim://quran/${pick.sura}/${pick.aya}`)
          expect(day.ayah?.text).toBe(AYAH_TEXT(pick.sura, pick.aya))
          // The hadith: the server's rule for that day.
          expect(day.hadith?.url).toBe(`imuslim://hadith/${HADITH_ID(day.date)}`)
        }
        // In Ramadan the Umm al-Qura Isha (90 minutes after Maghrib becomes 120) is what the app shows too.
        if (iso.startsWith('2027-02') && tz === 'Asia/Riyadh') {
          const t0 = dayTimes(place, ymdIn(now, tz), {})
          expect(t0.ramadanIsha).toBe(true)
          expect(data.days[0].times.find((x) => x.key === 'isha')!.text).toBe(timeOf(t0.isha, 'ar', tz))
        }
      })

  it('without a place: the dates, ayah and hadith, no times', async () => {
    vi.setSystemTime(new Date(DATES[0]))
    store.clear()
    const data = await buildWidgetData(new Date(DATES[0]))
    expect(data.place).toBeNull()
    expect(data.days[0].times).toEqual([])
    expect(data.days[0].hijri.day).toBeTruthy()
  })

  it('the widget writes the count in the app’s own digits, and speaks the app’s ten languages', () => {
    expect(digitsOf('ar')).toBe('٠١٢٣٤٥٦٧٨٩')
    expect(digitsOf('bn')).toBe('০১২৩৪৫৬৭৮৯')
    expect(digitsOf('en')).toBe('0123456789')
    for (const [lang, s] of Object.entries(WIDGET_STRINGS)) {
      for (const k of ['next', 'times', 'date', 'ayah', 'hadith', 'tasbih', 'adhkar'] as const) expect(s.names[k].name, `${lang} ${k}`).toBeTruthy()
      expect(s.of, lang).toMatch(/\{n\}.*\{t\}|\{t\}.*\{n\}/)
      expect(s.after, lang).toContain('{t}')
    }
  })

  it('each widget opens its own screen in the app (imuslim:// through @capacitor/app appUrlOpen)', async () => {
    const { widgetPath } = await import('../../web/src/native/NativeDevice')
    const { parseRoute } = await import('../../web/src/quran/route')
    const open = (url: string) => parseRoute(widgetPath(url)!)
    expect(open('imuslim://today/times')).toEqual({ view: 'today', tool: 'times' })
    expect(open('imuslim://today/calendar')).toEqual({ view: 'today', tool: 'calendar' })
    expect(open('imuslim://today/tasbih')).toEqual({ view: 'tools', tool: 'tasbih' })
    expect(open('imuslim://today/adhkar')).toEqual({ view: 'tools', tool: 'adhkar' })
    expect(open('imuslim://quran/2/37')).toEqual({ view: 'quran', sura: 2, aya: 37 })
    expect(open('imuslim://hadith/4814')).toEqual({ view: 'hadith', id: '4814' })
    expect(open('imuslim://today')).toEqual({ view: 'chat' })
    expect(widgetPath('https://example.com/today/times')).toBeNull()
    // The links the Swift widgets set (Widgets.swift widgetURL), all among the above.
    const swift = read('web/ios/App/MuslimWidgets/Widgets.swift') + read('web/ios/App/MuslimWidgets/Views.swift')
    expect(open('imuslim://mawaqif')).toEqual({ view: 'today', tool: 'mawaqif' }) // the eighth (reply 0051)
    for (const m of swift.matchAll(/"imuslim:\/\/([a-z/]+)"/g)) expect(['today', 'today/times', 'today/calendar', 'today/tasbih', 'today/adhkar', 'mawaqif', 'mawaqif/']).toContain(m[1])
  })

  it('no network in the extension; the App Group on both sides; the links registered', () => {
    const dir = path.join(ROOT, 'web/ios/App/MuslimWidgets')
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.swift'))) expect(fs.readFileSync(path.join(dir, f), 'utf8'), f).not.toMatch(/URLSession|URLRequest|NWConnection|http:\/\/|https:\/\//)
    for (const f of ['web/ios/App/App/App.entitlements', 'web/ios/App/MuslimWidgets/MuslimWidgets.entitlements']) expect(read(f), f).toContain('<string>group.com.alkhammashtalal.imuslim</string>')
    expect(read('web/ios/App/MuslimWidgets/WidgetData.swift')).toContain('static let group = "group.com.alkhammashtalal.imuslim"')
    expect(read('web/ios/App/App/WidgetBridgePlugin.swift')).toContain('static let group = "group.com.alkhammashtalal.imuslim"')
    expect(read('web/ios/App/App/Info.plist')).toMatch(/<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>imuslim<\/string>/)
    const pbx = read('web/ios/App/App.xcodeproj/project.pbxproj')
    expect(pbx).toContain('PRODUCT_BUNDLE_IDENTIFIER = com.alkhammashtalal.imuslim.widgets;')
    expect(pbx).toContain('productType = "com.apple.product-type.app-extension";')
    expect(pbx.match(/CODE_SIGN_ENTITLEMENTS = App\/App.entitlements;/g)).toHaveLength(2)
    expect(read('web/ios/App/App/AppViewController.swift')).toContain('bridge?.registerPluginInstance(WidgetBridgePlugin())')
  })
})

// WIDGET_SAMPLES=<dir>: the file the app writes in Taif on 14 October 2026 at 14:03, in Arabic and English, from a
// local server on next (wr.sh dev --remote --env next --port 8796), for the widget renders in out/v2-shots/0046.
describe.runIf(!!process.env.WIDGET_SAMPLES)('widget samples for the renders', () => {
  it('writes sample-ar.json and sample-en.json', async () => {
    vi.stubGlobal('fetch', (url: string) => realFetch(new URL(url, 'http://localhost:8796')))
    vi.useFakeTimers({ toFake: ['Date'] })
    const now = new Date('2026-10-14T11:03:00Z')
    vi.setSystemTime(now)
    const counts = (JSON.parse(read('data/adhkar-counts.json')) as { counts: { id: string; count: number }[] }).counts
    for (const lang of ['ar', 'en']) {
      store.clear()
      store.setItem('imuslim.settings.v1', JSON.stringify({ lang, content: lang }))
      store.setItem('muslim.place.v1', JSON.stringify({ lat: 21.2703, lng: 40.4158, timeZone: 'Asia/Riyadh', name: lang === 'ar' ? 'الطائف' : 'Taif', source: 'city' }))
      const day = now.toLocaleDateString('en-CA')
      store.setItem('muslim.tasbih.v1', JSON.stringify({ day, total: 45, word: 0, limit: 33, n: 12, custom: '', vibrate: true, after: true, step: 1 }))
      store.setItem('muslim.adhkar.v1', JSON.stringify({ day, n: Object.fromEntries(counts.slice(0, 1).map((c) => [c.id, c.count])) }))
      const data = await buildWidgetData(now)
      expect(data.days[0].ayah?.text).toBeTruthy()
      fs.writeFileSync(path.join(process.env.WIDGET_SAMPLES!, `sample-${lang}.json`), JSON.stringify(data, null, 1))
    }
  })
})

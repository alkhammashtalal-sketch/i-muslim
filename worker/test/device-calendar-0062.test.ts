// «أضف إلى تقويم الجهاز» (reply 0062 §2–§4; reply 0072 item 14): the dates handed to the phone's calendar, computed by
// the calendar page's own Umm al-Qura days (calendar-model.ts eventsOn, the user's and the global offset as the page
// adds them), and what the iPhone and Android code may and may not do (write-only, never read; no calendar permission
// on Android). The simulator runs are in relay/w1/0072-calendar/README.md.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { totalOffset } from '../../web/src/daily/hijri'
import { eventsOn, noon } from '../../web/src/v2/daily/calendar-model'
import { alarmsFor, calDate, dayEvent, hijriOf, occasionEvents, occasionSpans, YEARLY, type Span } from '../../web/src/v2/daily/device-calendar'
import { androidTimes } from '../../web/src/native/android/calendar'
import { hijriParts } from '../../web/src/daily/hijri'
import { DEVCAL } from '../../web/src/v2/daily/strings-devcal'
import { TODAY } from '../../web/src/v2/daily/strings-today'

const ROOT = path.resolve(import.meta.dirname, '../..')
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')
const DAY = 86_400_000
const TEN = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
const iso = (d: Date) => {
  const c = calDate(d)
  return `${c.y}-${String(c.m).padStart(2, '0')}-${String(c.d).padStart(2, '0')}`
}
const has = (d: Date, key: string, offset: number) => eventsOn(hijriParts(d, offset)!, d.getDay()).some((e) => e.key === key)
// Saturday 24 October 2026 (13 Jumada I 1448), the day of this work.
const TODAY_0 = new Date(2026, 9, 24, 12)
const KEYS = YEARLY.map((e) => e.key)

describe('the occasions offered: the calendar page’s yearly ones, nothing else', () => {
  it('twelve, from data/calendar-events.json: not the odd nights, not Monday and Thursday, not the white days', () => {
    expect(KEYS).toEqual(['ramadan', 'last_ten', 'eid_fitr', 'six_shawwal', 'dhul_hijjah_ten', 'arafah', 'eid_adha', 'tashreeq', 'muharram', 'tasua', 'ashura', 'shaban'])
    // Their names are the page's own, in each language.
    for (const l of TEN) for (const k of KEYS) expect(TODAY[l].events[k as keyof (typeof TODAY)['ar']['events']], `${l} ${k}`).toBeTruthy()
  })
})

describe('three years of occasions on their Umm al-Qura days', () => {
  const spans = occasionSpans(KEYS, TODAY_0, 0, 3)
  const of = (k: string) => spans.filter((s) => s.key === k)

  it('each occasion in three Hijri years: 1448 to 1450, and Muharram’s (after today) 1449 to 1451', () => {
    for (const k of KEYS) {
      const years = [...new Set(of(k).map((s) => s.hYear))]
      expect(years, k).toEqual(['muharram', 'tasua', 'ashura'].includes(k) ? [1449, 1450, 1451] : [1448, 1449, 1450])
    }
    // One event a year, Sha'ban two (its 15th is never marked).
    for (const k of KEYS) expect(of(k), k).toHaveLength(k === 'shaban' ? 6 : 3)
  })

  it('every day of each event is a day the page marks with that occasion, and the days just outside are not', () => {
    for (const s of spans) {
      for (let t = s.start.getTime(); t <= s.end.getTime(); t += DAY) expect(has(noon(new Date(t)), s.key, 0), `${s.key} ${iso(new Date(t))}`).toBe(true)
      expect(has(noon(new Date(s.start.getTime() - DAY)), s.key, 0), `${s.key} before`).toBe(false)
      expect(has(noon(new Date(s.end.getTime() + DAY)), s.key, 0), `${s.key} after`).toBe(false)
    }
  })

  it('their Hijri days: Ramadan the whole month, the Eids on the 1st of Shawwal and the 10th of Dhul-Hijjah, Arafah the 9th, Ashura the 10th of Muharram, Sha’ban without its 15th', () => {
    const h = (d: Date) => hijriParts(d, 0)!
    for (const s of of('ramadan')) {
      expect([h(s.start).month, h(s.start).day]).toEqual([9, 1])
      expect([h(new Date(s.end.getTime() + DAY)).month, h(new Date(s.end.getTime() + DAY)).day]).toEqual([10, 1])
    }
    for (const s of of('eid_fitr')) expect([h(s.start).month, h(s.start).day, iso(s.end)]).toEqual([10, 1, iso(s.start)])
    for (const s of of('arafah')) expect([h(s.start).month, h(s.start).day]).toEqual([12, 9])
    for (const s of of('eid_adha')) expect([h(s.start).month, h(s.start).day]).toEqual([12, 10])
    for (const s of of('ashura')) expect([h(s.start).month, h(s.start).day]).toEqual([1, 10])
    for (const s of of('muharram')) expect(h(s.start).day).toBe(2) // the 1st is never marked
    const sh = of('shaban')
    for (let i = 0; i < sh.length; i += 2) {
      expect([h(sh[i].start).day, h(sh[i].end).day, h(sh[i + 1].start).day, h(sh[i + 1].end).day]).toEqual([1, 14, 16, 29])
    }
  })

  it('the dates, as the device’s Umm al-Qura calendar (ICU) gives them to the page', () => {
    const at = (k: string, i = 0) => [iso(of(k)[i].start), iso(of(k)[i].end)]
    expect(at('ramadan')).toEqual(['2027-02-08', '2027-03-08'])
    expect(at('eid_fitr')).toEqual(['2027-03-09', '2027-03-09'])
    expect(at('arafah')).toEqual(['2027-05-15', '2027-05-15'])
    expect(at('eid_adha', 1)).toEqual(['2028-05-05', '2028-05-05'])
    expect(at('ramadan', 2)).toEqual(['2029-01-16', '2029-02-13'])
    expect(at('ashura', 2)).toEqual(['2029-05-23', '2029-05-23'])
  })

  it('the user’s offset as the page adds it: +1 day brings every event a day earlier, −1 a day later', () => {
    for (const [user, global, shift] of [
      [1, 0, -1],
      [-1, 0, 1],
      [1, 1, -2],
    ] as const) {
      const moved = occasionSpans(KEYS, TODAY_0, totalOffset(user, global), 3)
      const key = (s: Span) => `${s.key}:${s.hYear}:${iso(s.start)}`
      // The same occasions of the same years (none lies within two days of today, so none drops out).
      expect(moved.map((s) => `${s.key}:${s.hYear}`).sort()).toEqual(spans.map((s) => `${s.key}:${s.hYear}`).sort())
      for (const m of moved) {
        const base = spans.find((s) => s.key === m.key && s.hYear === m.hYear && (m.key !== 'shaban' || Math.abs(s.start.getTime() - m.start.getTime()) < 3 * DAY))!
        expect(Math.round((m.start.getTime() - base.start.getTime()) / DAY), key(m)).toBe(shift)
        expect(Math.round((m.end.getTime() - base.end.getTime()) / DAY), key(m)).toBe(shift)
      }
    }
  })

  it('an occasion in progress counts from its first day; one that ended is the next year’s', () => {
    // 15 Ramadan 1448.
    const mid = new Date(2027, 1, 22, 12)
    const r = occasionSpans(['ramadan', 'eid_adha'], mid, 0, 3)
    expect(r.filter((s) => s.key === 'ramadan').map((s) => [s.hYear, iso(s.start)])[0]).toEqual([1448, '2027-02-08'])
    expect(r.filter((s) => s.key === 'ramadan').map((s) => s.hYear)).toEqual([1448, 1449, 1450])
    // The day after Eid al-Fitr 1448: Ramadan's next is 1449.
    expect(occasionSpans(['ramadan'], new Date(2027, 2, 10, 12), 0, 3).map((s) => s.hYear)).toEqual([1449, 1450, 1451])
  })
})

describe('the events handed to the phone', () => {
  it('occasions: all day, the page’s name as the title, the Hijri days and the Umm al-Qura line in the notes; a reminder a day before at 9:00 or none', () => {
    const spans = occasionSpans(['ramadan', 'eid_fitr'], TODAY_0, 0, 1)
    const s = TODAY.ar
    const ev = occasionEvents(spans, 0, 'ar', s.events as Record<string, string>, s.courtLine, 'dayBefore')
    expect(ev.map((e) => e.title)).toEqual(['رمضان', 'عيد الفطر'])
    expect(ev[0]).toMatchObject({ allDay: true, start: { y: 2027, m: 2, d: 8 }, end: { y: 2027, m: 3, d: 8 }, alarms: [-15 * 3600] })
    expect(ev[0].notes).toBe(`١ رمضان ١٤٤٨ هـ – ٢٩ رمضان ١٤٤٨ هـ\n${s.courtLine}`)
    expect(ev[1].notes.split('\n')[0]).toBe('١ شوال ١٤٤٨ هـ')
    expect(occasionEvents(spans, 0, 'en', TODAY.en.events as Record<string, string>, TODAY.en.courtLine, 'none')[1]).toMatchObject({ title: 'Eid al-Fitr', alarms: [] })
  })

  it('a day: the typed title, the Hijri date with its weekday in the notes; all day or an hour from its time; the reminders', () => {
    const d = new Date(2026, 9, 24, 12)
    const all = dayEvent('  زيارة  ', d, 0, 'ar', null, 'at')
    expect(all).toEqual({ title: 'زيارة', notes: 'السبت، ١٣ جمادى الأولى ١٤٤٨ هـ', start: { y: 2026, m: 10, d: 24 }, end: { y: 2026, m: 10, d: 24 }, allDay: true, alarms: [9 * 3600] })
    const timed = dayEvent('Visit', d, 0, 'en', { h: 17, min: 30 }, 'dayBefore')
    expect(timed).toMatchObject({ allDay: false, time: { h: 17, min: 30 }, alarms: [-86_400] })
    expect(timed.notes).toMatch(/Saturday.*13.*1448/)
    // The user's offset moves the Hijri date written, as on the page.
    expect(dayEvent('x', d, 1, 'ar', null, 'none').notes).toBe(hijriOf(new Date(d.getTime() + DAY), 0, 'ar', true))
    expect(alarmsFor('none', false)).toEqual([])
    expect(alarmsFor('at', false)).toEqual([0])
  })

  it('Android: an all-day event at UTC midnights (CalendarContract), a timed one an hour from its local time', () => {
    const d = new Date(2026, 9, 24, 12)
    expect(androidTimes(dayEvent('x', d, 0, 'ar', null, 'none'))).toEqual({ begin: Date.UTC(2026, 9, 24), end: Date.UTC(2026, 9, 25) })
    const t = androidTimes(dayEvent('x', d, 0, 'ar', { h: 9, min: 0 }, 'none'))
    expect(t).toEqual({ begin: new Date(2026, 9, 24, 9).getTime(), end: new Date(2026, 9, 24, 10).getTime() })
  })
})

describe('the strings in the ten languages', () => {
  it('every key in every language; the hint as the coordinator wrote it, in the phone’s own names', () => {
    for (const l of TEN) for (const k of Object.keys(DEVCAL.en)) expect(DEVCAL[l][k as keyof (typeof DEVCAL)['en']], `${l} ${k}`).toBeTruthy()
    expect(DEVCAL.ar.hint).toBe('لعرض التاريخ الهجري في تطبيق التقويم: الإعدادات ← التطبيقات ← التقويم ← تقويمات بديلة ← الهجري (أم القرى)')
    for (const l of TEN) expect(DEVCAL[l].hint, l).toMatch(l === 'ar' || l === 'ur' ? /←/ : /→/)
    // «مسلم» by its name only (CLAUDE.md §8): no «i».
    for (const l of TEN) for (const v of Object.values(DEVCAL[l])) expect(JSON.stringify(v)).not.toMatch(/\bi ?Muslim|i مسلم/)
  })
})

describe('the native code: write-only on the iPhone, nothing read; no calendar permission on Android', () => {
  const swift = read('web/ios/App/App/DeviceCalendarPlugin.swift')
  const code = swift.replace(/\/\/.*$/gm, '')
  it('iPhone: requestWriteOnlyAccessToEvents only, iOS 17 and later; no fetch of events or calendars, no full access, no reminders', () => {
    expect(code).toContain('requestWriteOnlyAccessToEvents')
    expect(code).toMatch(/#available\(iOS 17\.0, \*\)/)
    expect(code).not.toMatch(/requestFullAccess|requestAccess\(to|events\(matching|predicateForEvents|calendars\(for|\.reminder|EKReminder|remove\(/)
    expect(code).toContain('defaultCalendarForNewEvents')
  })
  it('iPhone: registered, in the project, the write-only text in Info.plist and in the ten InfoPlist.strings; no other calendar key', () => {
    expect(read('web/ios/App/App/AppViewController.swift')).toContain('bridge?.registerPluginInstance(DeviceCalendarPlugin())')
    expect(read('web/ios/App/App.xcodeproj/project.pbxproj').match(/DeviceCalendarPlugin\.swift/g)).toHaveLength(6)
    const info = read('web/ios/App/App/Info.plist')
    expect(info).toMatch(/<key>NSCalendarsWriteOnlyAccessUsageDescription<\/key>\s*<string>[^<]*cannot read your calendar\.<\/string>/)
    expect(info).not.toMatch(/NSCalendarsFullAccessUsageDescription|NSCalendarsUsageDescription|NSReminders/)
    for (const l of TEN) expect(read(`web/ios/App/App/${l}.lproj/InfoPlist.strings`), l).toMatch(/"NSCalendarsWriteOnlyAccessUsageDescription" = "[^"]+";/)
    expect(read('web/ios/App/App/ar.lproj/InfoPlist.strings')).toContain('ولا يستطيع قراءة تقويمك')
    // No new npm plugin for the iPhone (the tool is this file; docs/COMPONENTS.csv says why).
    expect(read('web/ios/App/CapApp-SPM/Package.swift')).not.toMatch(/calendar/i)
    expect(read('docs/COMPONENTS.csv')).toMatch(/EventKit/)
  })
  it('Android: the insert intent, no calendar permission in the manifest; the shared code reaches it behind isAndroid()', () => {
    const java = read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/AndroidCalendarPlugin.java')
    expect(java).toContain('Intent.ACTION_INSERT')
    expect(java).toContain('CalendarContract.Events.CONTENT_URI')
    expect(java).not.toMatch(/ContentResolver|query\(/)
    expect(read('web/android/app/src/main/AndroidManifest.xml')).not.toMatch(/CALENDAR/)
    expect(read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/MainActivity.java')).toContain('registerPlugin(AndroidCalendarPlugin.class);')
    expect(read('web/src/native/device-calendar.ts')).toMatch(/if \(isAndroid\(\)\) return \(await androidCalendarInsert/)
  })
  it('the page offers them only where the phone can take them', () => {
    const page = read('web/src/v2/daily/Calendar.tsx')
    expect(page).toContain("onAdd={device.day ? () => setAddDay(true) : undefined}")
    expect(page).toContain('{device.many && <p className="dt-note dt-devcal-hint">')
  })
})

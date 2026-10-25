// Add-on 0072-add34 §ب6 «منبّه الفجر» (AlarmKit, iOS 26) and §ب7 «عدّاد الصلاة القادمة» (a Live Activity): the plans are
// the app's own Swift (web/ios/App/Shared/PrayerPlan.swift), compiled on the Mac (skipped elsewhere) and asked here on
// files shaped as the app writes widgets.json, with the times of the app's own engine (web/src/daily/prayer.ts). Then
// the settings' and the times page's rules (fajr-alarm.ts, prayer-countdown.ts), and what the build must carry.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { dayTimes, ymdIn, type Ymd } from '../../web/src/daily/prayer'
import { timeOf } from '../../web/src/v2/daily/format'
import { ALARM_TEXT } from '../../web/src/native/alarm-strings'
import { ALARM_DEFAULTS, alarmSoundFile, alarmSounds, enableResult, loadAlarmPrefs, saveAlarmPrefs } from '../../web/src/native/fajr-alarm'
import { countdownMessage } from '../../web/src/native/prayer-countdown'
import type { SoundManifest } from '../../web/src/native/alert-sounds'

const ROOT = path.resolve(import.meta.dirname, '../..')
const IOS = path.join(ROOT, 'web/ios/App')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')
const strings = (f: string) =>
  Object.fromEntries([...fs.readFileSync(path.join(IOS, f), 'utf8').matchAll(/^"((?:[^"\\]|\\.)*)" = "((?:[^"\\]|\\.)*)";$/gm)].map((m) => [m[1], m[2]]))
const H = 3_600_000
const DAY = 86_400_000

// ---- widgets.json as the app writes it (web/src/native/widget-data.ts buildWidgetData: 60 days, the eight times) ----
const NAMES = { fajr: 'الفجر', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' } as const
const nextYmd = (d: Ymd): Ymd => {
  const t = new Date(Date.UTC(d.y, d.m - 1, d.d + 1))
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}
const ymdText = (d: Ymd) => `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
/** The instant of a civil day's midnight in a time zone (as widget-data.ts zonedMidnight). */
function midnight(d: Ymd, tz: string): number {
  let t = Date.UTC(d.y, d.m - 1, d.d)
  for (let i = 0; i < 3; i++) {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(t))
    const g = (k: string) => Number(p.find((x) => x.type === k)!.value)
    const shown = Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'))
    t += Date.UTC(d.y, d.m - 1, d.d) - shown
  }
  return t
}
type Place = { lat: number; lng: number; timeZone: string; name: string }
const RIYADH: Place = { lat: 24.7136, lng: 46.6753, timeZone: 'Asia/Riyadh', name: 'الرياض' }
const LONDON: Place = { lat: 51.5074, lng: -0.1278, timeZone: 'Europe/London', name: 'London' }
const OSLO: Place = { lat: 59.9139, lng: 10.7522, timeZone: 'Europe/Oslo', name: 'Oslo' }
function widgets(place: Place | null, from: Date, days = 60, lang = 'ar') {
  const tz = place?.timeZone ?? 'Asia/Riyadh'
  const out = []
  let ymd = ymdIn(from, tz)
  for (let k = 0; k < days; k++, ymd = nextYmd(ymd)) {
    const times = []
    if (place) {
      const d = dayTimes(place, ymd, { method: place === RIYADH ? 'UmmAlQura' : 'MuslimWorldLeague', asr: 'shafi' })
      for (const key of ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) times.push({ key, name: NAMES[key], at: d[key].getTime(), text: timeOf(d[key], 'ar', tz), prayer: key !== 'sunrise' })
      times.push({ key: 'midnight', name: 'منتصف الليل', at: d.midnight.getTime(), text: '', prayer: false })
      times.push({ key: 'lastThird', name: 'الثلث الأخير', at: d.lastThird.getTime(), text: '', prayer: false })
    }
    out.push({ date: ymdText(ymd), start: midnight(ymd, tz), end: midnight(nextYmd(ymd), tz), weekday: '', gregorian: '', gregorianShort: '', hijri: { day: '', month: '', year: '', text: '' }, times, sky: [] })
  }
  return {
    v: 1, lang, rtl: lang === 'ar' || lang === 'ur', built: from.getTime(),
    place: place ? { name: place.name, tz } : null,
    labels: { nextPrayer: 'الصلاة القادمة', remaining: 'المتبقي', after: 'بعد {t}', ayahOfDay: '', hadithOfDay: '', tasbih: '', adhkarNow: '', cont: '', openApp: 'افتح التطبيق لتحديث المواقيت', noPlace: 'حدّد مدينتك في التطبيق', names: {} },
    days: out,
    tasbih: { steps: [], step: 0, n: 0, after: false, total: 0, day: '', digits: '٠١٢٣٤٥٦٧٨٩' },
    adhkar: { day: '', morning: { title: '', progress: '', none: '', fraction: 0, url: '' }, evening: { title: '', progress: '', none: '', fraction: 0, url: '' } },
  }
}
type File = ReturnType<typeof widgets>
const timeOfKey = (f: File, date: string, key: string) => f.days.find((d) => d.date === date)!.times.find((t) => t.key === key)!.at

let swiftc = true
try {
  execFileSync('xcrun', ['--find', 'swiftc'], { stdio: 'ignore' })
} catch {
  swiftc = false
}

describe.skipIf(!swiftc)('PrayerPlan.swift, as the iPhone runs it', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alarm-live-'))
  const bin = path.join(dir, 'plan')
  let n = 0
  const put = (v: unknown) => {
    const f = path.join(dir, `f${n++}.json`)
    fs.writeFileSync(f, JSON.stringify(v))
    return f
  }
  const run = (...a: (string | number)[]) => JSON.parse(execFileSync(bin, a.map(String), { encoding: 'utf8' }))
  beforeAll(() => {
    fs.mkdirSync(path.join(dir, 'main'))
    fs.copyFileSync(path.join(import.meta.dirname, 'swift/alarm-live-main.swift'), path.join(dir, 'main/main.swift'))
    execFileSync('xcrun', ['swiftc', '-o', bin, path.join(IOS, 'Shared/PrayerPlan.swift'), path.join(dir, 'main/main.swift')], { stdio: 'pipe' })
  }, 180_000)

  // Sunday 25 October 2026 in Riyadh.
  const riyadh = widgets(RIYADH, new Date('2026-10-25T00:30:00+03:00'))
  const fR = () => put(riyadh)
  const at = (date: string, key: string) => timeOfKey(riyadh, date, key)

  it('the next prayer: today’s Fajr before it, Dhuhr after Fajr (sunrise is not one of the five), and after Isha the next day’s Fajr across midnight', () => {
    const f = fR()
    expect(run('next', f, at('2026-10-25', 'fajr') - 60_000)).toMatchObject({ key: 'fajr', at: at('2026-10-25', 'fajr'), name: 'الفجر' })
    expect(run('next', f, at('2026-10-25', 'fajr') + 60_000).key).toBe('dhuhr')
    expect(run('next', f, at('2026-10-25', 'sunrise') + 60_000).key).toBe('dhuhr')
    const afterIsha = at('2026-10-25', 'isha') + 60_000
    expect(run('next', f, afterIsha)).toMatchObject({ key: 'fajr', at: at('2026-10-26', 'fajr') })
    // Just before midnight and just after it: the same Fajr.
    const mid = riyadh.days.find((d) => d.date === '2026-10-26')!.start
    expect(run('next', f, mid - 1000).at).toBe(at('2026-10-26', 'fajr'))
    expect(run('next', f, mid + 1000).at).toBe(at('2026-10-26', 'fajr'))
    // At the very instant of a prayer, the next one.
    expect(run('next', f, at('2026-10-25', 'asr')).key).toBe('maghrib')
    // The time as the app wrote it, in its digits.
    expect(run('next', f, at('2026-10-25', 'fajr') - 60_000).text).toMatch(/^[٠-٩]{1,2}:[٠-٩]{2} ص$/)
  })

  it('the next prayer: none without a file, without a place, or once the file’s days are behind', () => {
    expect(run('next', path.join(dir, 'none.json'), Date.now())).toBeNull()
    expect(run('next', put(widgets(null, new Date('2026-10-25T00:30:00+03:00'))), Date.parse('2026-10-25T12:00:00+03:00'))).toBeNull()
    expect(run('next', fR(), Date.parse('2027-01-10T12:00:00+03:00'))).toBeNull()
    expect(run('countdown', fR(), Date.parse('2027-01-10T12:00:00+03:00')).kind).toBe('noData')
    expect(run('countdown', path.join(dir, 'none.json'), Date.now()).kind).toBe('noData')
  })

  it('the countdown: within Apple’s twelve hours (8 active + 4 on the Lock Screen) it starts; beyond, it says so', () => {
    const f = fR()
    expect(run('countdown', f, at('2026-10-25', 'dhuhr') - 3 * H)).toMatchObject({ kind: 'start', key: 'dhuhr' })
    // Riyadh, after Isha: Fajr about nine hours away (over the eight active hours, inside the twelve).
    const afterIsha = at('2026-10-25', 'isha') + 60_000
    const gap = at('2026-10-26', 'fajr') - afterIsha
    expect(gap).toBeGreaterThan(8 * H)
    expect(gap).toBeLessThan(12 * H)
    expect(run('countdown', f, afterIsha)).toMatchObject({ kind: 'start', key: 'fajr' })
    // Oslo in December after Isha: Fajr more than twelve hours away, so nothing starts.
    const oslo = widgets(OSLO, new Date('2026-12-20T00:30:00+01:00'))
    const isha = timeOfKey(oslo, '2026-12-20', 'isha') + 60_000
    const fajr = timeOfKey(oslo, '2026-12-21', 'fajr')
    expect(fajr - isha).toBeGreaterThan(12 * H)
    expect(run('countdown', put(oslo), isha)).toMatchObject({ kind: 'tooFar', key: 'fajr' })
    // Exactly twelve hours: still within.
    expect(run('countdown', put(oslo), fajr - 12 * H).kind).toBe('start')
  })

  it('«حان وقت {p}» with the prayer’s name', () => {
    expect(run('fill', 'حان وقت {p}', 'العصر')).toBe('حان وقت العصر')
    expect(run('fill', 'It’s time for {p}', 'Asr')).toBe('It’s time for Asr')
  })

  it('the alarm’s window: each day’s own Fajr ahead, at most the days asked, none less than a minute away', () => {
    const f = fR()
    const before = at('2026-10-25', 'fajr') - 10 * 60_000
    const s = run('slots', f, before, 14)
    expect(s).toHaveLength(14)
    expect(s[0]).toEqual({ day: '2026-10-25', at: at('2026-10-25', 'fajr') })
    for (const x of s) expect(x.at).toBe(at(x.day, 'fajr'))
    expect(new Set(s.map((x: { day: string }) => x.day)).size).toBe(14)
    for (let i = 1; i < s.length; i++) expect(s[i].at - s[i - 1].at).toBeGreaterThan(DAY - 5 * 60_000)
    // Thirty seconds before Fajr: today's is not set again (it is ringing or about to), the window starts tomorrow.
    expect(run('slots', f, at('2026-10-25', 'fajr') - 30_000, 14)[0].day).toBe('2026-10-26')
    // After Fajr: tomorrow first.
    expect(run('slots', f, at('2026-10-25', 'fajr') + 60_000, 3).map((x: { day: string }) => x.day)).toEqual(['2026-10-26', '2026-10-27', '2026-10-28'])
    // The file's 60 days are the most: near its end, fewer.
    expect(run('slots', f, riyadh.days[55].start, 14)).toHaveLength(5)
    expect(run('slots', f, before, 0)).toEqual([])
    expect(run('slots', path.join(dir, 'none.json'), before, 14)).toEqual([])
    expect(run('slots', put(widgets(null, new Date('2026-10-25T00:30:00+03:00'))), before, 14)).toEqual([])
  })

  it('the alarm’s window across a clock change: London on 25 October 2026 (BST ends), each civil day once, its own Fajr', () => {
    const london = widgets(LONDON, new Date('2026-10-23T00:30:00+01:00'))
    const s = run('slots', put(london), Date.parse('2026-10-23T00:30:00+01:00'), 5)
    expect(s.map((x: { day: string }) => x.day)).toEqual(['2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'])
    for (const x of s) expect(x.at).toBe(timeOfKey(london, x.day, 'fajr'))
    // The night of the change is an hour longer: the gap from the 24th's Fajr to the 25th's is over 24 hours.
    expect(s[2].at - s[1].at).toBeGreaterThan(DAY)
  })

  it('each day’s alarm id: the same from one renewal to the next, recognisably ours', () => {
    expect(run('id', '2026-10-25')).toEqual({ id: '4D55534C-494D-4641-8A52-202610250000', ours: true })
    expect(run('id', '2026-10-26').id).not.toBe(run('id', '2026-10-25').id)
    expect(run('id', 'tomorrow').id).toBeNull()
  })

  const id = (day: string) => run('id', day).id as string
  it('renewal: what is right stays, a moved time or a day behind is cancelled, a missing day is added, others’ alarms are never touched', () => {
    const f = fR()
    const now = at('2026-10-25', 'fajr') - 10 * 60_000
    const wanted = run('slots', f, now, 14) as { day: string; at: number }[]
    // First time: everything is added.
    const r0 = run('reconcile', put({ existing: [], wanted }))
    expect(r0).toEqual({ cancel: [], add: wanted })
    // The next day after its Fajr rang: yesterday's alarm is still listed; the window has moved by a day.
    const set = wanted.map((w) => ({ id: id(w.day), at: w.at }))
    const tomorrow = run('slots', f, at('2026-10-25', 'fajr') + 2 * H, 14) as { day: string; at: number }[]
    const foreign = { id: '11111111-2222-4333-8444-555555555555', at: 1 }
    const r1 = run('reconcile', put({ existing: [...set, foreign], wanted: tomorrow }))
    expect(r1.cancel).toEqual([id('2026-10-25')])
    expect(r1.add).toEqual([tomorrow[13]])
    // A new place moves every time: all cancelled, all added again.
    const jeddah = widgets({ lat: 21.4858, lng: 39.1925, timeZone: 'Asia/Riyadh', name: 'جدة' }, new Date('2026-10-25T00:30:00+03:00'))
    const moved = run('slots', put(jeddah), now, 14) as { day: string; at: number }[]
    const r2 = run('reconcile', put({ existing: set, wanted: moved }))
    expect(r2.cancel).toHaveLength(14)
    expect(r2.add).toEqual(moved)
    // A new sound or language (the signature changed): the set ones come without their date, so all are made again.
    const r3 = run('reconcile', put({ existing: set.map((x) => ({ id: x.id })), wanted }))
    expect(r3.cancel).toHaveLength(14)
    expect(r3.add).toEqual(wanted)
    // Turned off: every one of ours cancelled, the foreign one kept.
    const r4 = run('reconcile', put({ existing: [...set, foreign], wanted: [] }))
    expect(r4.cancel).toEqual(set.map((x) => x.id))
    expect(r4.add).toEqual([])
    // Nothing changed: nothing to do.
    expect(run('reconcile', put({ existing: set, wanted }))).toEqual({ cancel: [], add: [] })
  })
})

describe('the settings’ rules (fajr-alarm.ts) and the times page’s (prayer-countdown.ts)', () => {
  const store = new Map<string, string>()
  const ls = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) }
  afterEach(() => {
    store.clear()
    delete (globalThis as { localStorage?: unknown }).localStorage
  })

  it('off by default; the choice kept on the phone only', () => {
    expect(ALARM_DEFAULTS).toEqual({ on: false, sound: 'default' })
    expect(loadAlarmPrefs()).toEqual({ on: false, sound: 'default' })
    ;(globalThis as { localStorage?: unknown }).localStorage = ls
    expect(loadAlarmPrefs()).toEqual({ on: false, sound: 'default' })
    saveAlarmPrefs({ on: true, sound: 'adhan' })
    expect(store.get('muslim.fajrAlarm.v1')).toBe('{"on":true,"sound":"adhan"}')
    expect(loadAlarmPrefs()).toEqual({ on: true, sound: 'adhan' })
    store.set('muslim.fajrAlarm.v1', '{"on":"yes","sound":"loud"}')
    expect(loadAlarmPrefs()).toEqual({ on: false, sound: 'default' })
  })

  const file = { path: '/sounds/adhan-fajr-short.caf', sha256: 'a'.repeat(64), bytes: 1000, seconds: 20 }
  const credit = { source: 's', url: 'u', license: 'l' }
  it('«الأذان مرة» only once the server offers the short adhan approved; its verified file by name with extension', () => {
    expect(alarmSounds({ v: 1, sounds: [] })).toEqual(['default'])
    const not: SoundManifest = { v: 1, sounds: [{ id: 'adhan-fajr-short', approved: false, files: { ios: file }, credit }] }
    expect(alarmSounds(not)).toEqual(['default'])
    const yes: SoundManifest = { v: 1, sounds: [{ id: 'adhan-fajr-short', approved: true, files: { ios: file }, credit }] }
    expect(alarmSounds(yes)).toEqual(['default', 'adhan'])
    const common: SoundManifest = { v: 1, sounds: [{ id: 'adhan-short', approved: true, files: { ios: { ...file, path: '/sounds/adhan-short.caf' } }, credit }] }
    expect(alarmSounds(common)).toEqual(['default', 'adhan'])
    // Android files only: not for the iPhone's alarm.
    expect(alarmSounds({ v: 1, sounds: [{ id: 'adhan-fajr-short', approved: true, files: { android: { ...file, path: '/sounds/a.ogg' } }, credit }] })).toEqual(['default'])
    expect(alarmSoundFile('default', { 'adhan-fajr-short': 'muslim-adhan-fajr-short-6dee51f16e84.caf' })).toBeNull()
    expect(alarmSoundFile('adhan', { 'adhan-fajr-short': 'muslim-adhan-fajr-short-6dee51f16e84.caf', 'adhan-short': 'muslim-adhan-short-1.caf' })).toBe('muslim-adhan-fajr-short-6dee51f16e84.caf')
    expect(alarmSoundFile('adhan', { 'adhan-short': 'muslim-adhan-short-6dee51f16e84.caf' })).toBe('muslim-adhan-short-6dee51f16e84.caf')
    expect(alarmSoundFile('adhan', {})).toBeNull()
    expect(alarmSoundFile('adhan', { 'adhan-short': '../x.caf' })).toBeNull()
    expect(alarmSoundFile('adhan', { 'adhan-short': 'muslim-adhan-short.m4a' })).toBeNull()
  })

  it('the answers of a tap become the settings’ lines', () => {
    expect(enableResult({ ok: true, scheduled: 14 })).toBe('ok')
    expect(enableResult({ ok: true, error: 'limit', scheduled: 9 })).toBe('ok')
    expect(enableResult({ ok: false, error: 'denied', scheduled: 0 })).toBe('denied')
    expect(enableResult({ ok: false, error: 'noData', scheduled: 0 })).toBe('no_place')
    expect(enableResult({ ok: false, error: 'unsupported', scheduled: 0 })).toBe('error')
    expect(countdownMessage({ ok: true, prayer: 'العصر' })).toBe('on')
    expect(countdownMessage({ ok: false, error: 'disabled' })).toBe('off')
    expect(countdownMessage({ ok: false, error: 'tooFar' })).toBe('tooFar')
    expect(countdownMessage({ ok: false, error: 'noData' })).toBe('noPlace')
    expect(countdownMessage({ ok: false, error: 'failed' })).toBe('error')
  })

  it('the words in the ten languages: every one written, calm (no exclamation), and the app never named with i', () => {
    const keys = Object.keys(ALARM_TEXT.ar)
    for (const l of LANGS) {
      expect(Object.keys(ALARM_TEXT[l]).sort(), l).toEqual([...keys].sort())
      for (const k of keys) {
        const v = ALARM_TEXT[l][k as keyof (typeof ALARM_TEXT)['ar']]
        expect(v, `${l}.${k}`).toMatch(/\S/)
        expect(v, `${l}.${k}`).not.toMatch(/[!！]|i مسلم|iMuslim/)
      }
      expect(ALARM_TEXT[l].scheduled, l).toContain('{n}')
      expect(ALARM_TEXT[l].countdownOn, l).toContain('{p}')
    }
  })
})

describe('what the iPhone build carries', () => {
  it('NSAlarmKitUsageDescription in Info.plist and in the ten languages; a background refresh for the renewals', () => {
    const plist = read('web/ios/App/App/Info.plist')
    expect(plist).toMatch(/<key>NSAlarmKitUsageDescription<\/key>\s*<string>[^<]{20,}<\/string>/)
    expect(plist).toMatch(/<key>UIBackgroundModes<\/key>\s*<array>\s*<string>audio<\/string>\s*<string>fetch<\/string>\s*<\/array>/)
    expect(plist).toMatch(/<key>BGTaskSchedulerPermittedIdentifiers<\/key>\s*<array>\s*<string>com\.alkhammashtalal\.imuslim\.refresh<\/string>\s*<\/array>/)
    expect(read('web/ios/App/App/MuslimBackground.swift')).toContain('static let refreshID = "com.alkhammashtalal.imuslim.refresh"')
    for (const l of LANGS) {
      const s = strings(`App/${l}.lproj/InfoPlist.strings`)
      expect(s.NSAlarmKitUsageDescription, l).toMatch(/\S{3}/)
      const c = strings(`App/${l}.lproj/Countdown.strings`)
      for (const k of ['countdown.start.title', 'countdown.start.description', 'alarm.stopped.title']) expect(c[k], `${l} ${k}`).toMatch(/\S/)
    }
  })

  it('the files are in their targets: the plan and the activity in both, the alarm in the app only, the views in the extension', () => {
    const pbx = read('web/ios/App/App.xcodeproj/project.pbxproj')
    const count = (name: string) => (pbx.match(new RegExp(`/\\* ${name.replace('.', '\\.')} in Sources \\*/ = \\{isa = PBXBuildFile`, 'g')) ?? []).length
    expect(count('PrayerPlan.swift')).toBe(2)
    expect(count('PrayerCountdown.swift')).toBe(2)
    for (const f of ['FajrAlarm.swift', 'FajrAlarmPlugin.swift', 'PrayerCountdownPlugin.swift', 'MuslimBackground.swift', 'CountdownViews.swift', 'CountdownWidgets.swift']) expect(count(f), f).toBe(1)
    for (const l of LANGS) expect(pbx).toContain(`path = ${l}.lproj/Countdown.strings;`)
    // No new entitlement: AlarmKit, Live Activities and the background refresh need none.
    expect(read('web/ios/App/App/App.entitlements').match(/<key>/g)).toHaveLength(1)
    expect(read('web/ios/App/App/AppViewController.swift')).toMatch(/registerPluginInstance\(FajrAlarmPlugin\(\)\)[\s\S]*registerPluginInstance\(PrayerCountdownPlugin\(\)\)/)
    const w = read('web/ios/App/MuslimWidgets/Widgets.swift')
    expect(w).toMatch(/TasbihSessionActivity\(\)\n\s+PrayerCountdownActivity\(\)/)
    expect(w).toContain('PrayerCountdownControl()')
  })

  it('the alarm: off until the user’s tap, the permission asked from that tap only, the days ahead within what AlarmKit took', () => {
    const plugin = read('web/ios/App/App/FajrAlarmPlugin.swift')
    const alarm = read('web/ios/App/App/FajrAlarm.swift')
    expect(alarm).toContain('return Saved(on: false, sound: nil, stop: "إيقاف")')
    // requestAuthorization: in enable() alone (and the Debug probe).
    expect(plugin.match(/requestAuthorization/g)).toHaveLength(1)
    expect(plugin.slice(plugin.indexOf('@objc func enable'), plugin.indexOf('@objc func disable'))).toContain('requestAuthorization')
    expect(alarm.replace(/#if DEBUG[\s\S]*?#endif\n#endif/, '').match(/AlarmManager\.shared\.requestAuthorization/g)).toHaveLength(1)
    expect(alarm).toContain('.alarm(schedule: .fixed(')
    expect(alarm).toContain('stopIntent: FajrAlarmStoppedIntent()')
    expect(alarm).toContain('catch AlarmManager.AlarmError.maximumLimitReached')
    expect(alarm).toMatch(/if #available\(iOS 26\.1, \*\) \{\n\s+alert = AlarmPresentation\.Alert\(title:/)
    const days = Number(/static let days = (\d+)/.exec(alarm)![1])
    expect(days).toBeGreaterThan(0)
    expect(days).toBeLessThanOrEqual(60) // the widgets' data holds 60 days (WIDGET_DAYS)
    expect(read('web/src/native/widget-data.ts')).toContain('export const WIDGET_DAYS = 60')
    // Renewed at every open, when the app writes its times, in the background, and at each stop.
    expect(read('web/ios/App/App/AppDelegate.swift')).toContain('MuslimBackground.register()')
    expect(read('web/ios/App/App/WidgetBridgePlugin.swift')).toContain('MuslimBackground.dataChanged()')
    expect(read('web/ios/App/App/MuslimBackground.swift')).toContain('UIApplication.didBecomeActiveNotification')
  })

  it('the countdown: the system’s own timer, stale at the prayer’s time, no push', () => {
    const shared = read('web/ios/App/Shared/PrayerCountdown.swift')
    expect(shared).toContain('ActivityContent(state: state, staleDate: at)')
    expect(shared).toContain('pushType: nil')
    expect(shared).toContain('struct StartPrayerCountdownIntent: LiveActivityIntent')
    expect(shared).not.toMatch(/pushToStart|PushType\.token/)
    const plan = read('web/ios/App/Shared/PrayerPlan.swift')
    expect(plan).toContain('static let activeLimitMs: Double = 8 * 3_600_000')
    expect(plan).toContain('static let lockLimitMs: Double = 12 * 3_600_000')
    const views = read('web/ios/App/MuslimWidgets/CountdownViews.swift')
    expect(views).toContain('Text(timerInterval: m.span, countsDown: true)')
    expect(read('web/ios/App/MuslimWidgets/CountdownWidgets.swift')).toContain('stale: context.isStale')
    // The Swift words: ten languages, «حان وقت {p}» carries the name.
    for (const l of LANGS) expect(shared, l).toMatch(new RegExp(`"${l}": Words\\(now: "[^"]*\\{p\\}[^"]*"`))
    expect(shared).not.toMatch(/!"/)
  })

  it('the shared code: shown only inside the app, the first screen untouched, iOS only', () => {
    expect(read('web/src/components/Sheets.tsx')).toContain('{isNative() && <FajrAlarmSettings lang={lang} />}')
    expect(read('web/src/v2/daily/PrayerTimes.tsx')).toContain('{isNative() && <LockCountdown lang={lang} />}')
    // Nothing for Android (CLAUDE.md §14): no plugin of these names there; the components hide when the plugin is missing.
    const android = path.join(ROOT, 'web/android')
    if (fs.existsSync(android)) {
      let hits = ''
      try {
        hits = execFileSync('grep', ['-rl', '--include=*.java', '--include=*.kt', '-e', 'FajrAlarm', '-e', 'PrayerCountdown', android], { encoding: 'utf8' }).trim()
      } catch {
        hits = '' // grep: no match
      }
      expect(hits).toBe('')
    }
  })
})

// Add-ons 0072-add18, 0072-add19 and the app side of 0072-add20 §1 / 0072-add21 §3: the morning and evening adhkar
// reminders in the same 64 as the bells, the prayer alert's sound (system, calm tone, the adhan slot hidden until its
// file is on our server and approved), the sounds' manifest and its checks (SHA-256, under 30 seconds), the calm tone
// itself, the tasbih session's steps verbatim from the hadith's text, and the native projects' new parts.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { dayTimes, ymdIn } from '../../web/src/daily/prayer'
import { ADHKAR_DEFAULTS, ADHKAR_MINUTES, alertId, ALL_KINDS, IOS_PENDING_LIMIT, KINDS, PLAN_DAYS, planAlerts, type AdhkarTexts, type PlanInput } from '../../web/src/native/bells'
import { applyLocal, reschedule, toNotification, type AlertContext, type NotifyApi } from '../../web/src/native/notify'
import {
  CALM,
  channelOf,
  EMPTY_MANIFEST,
  fileProblem,
  localName,
  MAX_ALERT_SECONDS,
  offeredChoices,
  parseManifest,
  fromProductionRecord,
  slotOf,
  SOUND_SLOTS,
  soundFor,
  usable,
  type SoundManifest,
} from '../../web/src/native/alert-sounds'
import { ALERT_TEXT } from '../../web/src/native/alert-strings'
import { WIDGET_STRINGS } from '../../web/src/native/widget-strings'

const ROOT = path.resolve(import.meta.dirname, '../..')
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const RIYADH = { lat: 24.7136, lng: 46.6753, timeZone: 'Asia/Riyadh' }
const ALL = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']
const TEXTS: AdhkarTexts = { title: 'مسلم', morning: 'أذكار الصباح', evening: 'أذكار المساء', morningUrl: '/today/adhkar', eveningUrl: '/today/adhkar' }
const NOW = new Date('2026-10-13T09:00:00Z')
const plan = (p: Partial<PlanInput> = {}) =>
  planAlerts({ place: RIYADH, bells: ALL, ward: true, method: 'UmmAlQura', asr: 'shafi', lang: 'ar', now: NOW, adhkarTexts: TEXTS, ...p })
const both = { ...ADHKAR_DEFAULTS, morning: true, evening: true }

describe('adhkar reminders (add-on 0072-add18 §2)', () => {
  it('are off by default: the plan is the bells and the portion only, as before', () => {
    expect(ADHKAR_DEFAULTS).toEqual({ morning: false, evening: false, morningMin: 15, eveningMin: 15 })
    expect(plan({ adhkar: ADHKAR_DEFAULTS }).map((a) => a.kind)).toEqual(plan().map((a) => a.kind))
    expect(plan({ adhkar: both }).length).toBe(IOS_PENDING_LIMIT)
    expect(KINDS).toEqual(['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'ward'])
  })

  it('ring a quarter of an hour after sunrise and after Asr, with their texts and pages', () => {
    const p = plan({ bells: [], ward: false, adhkar: both })
    const times = (at: number) => dayTimes(RIYADH, ymdIn(new Date(at), RIYADH.timeZone), { method: 'UmmAlQura', asr: 'shafi' })
    const m = p.find((a) => a.kind === 'adhkarMorning')!
    const e = p.find((a) => a.kind === 'adhkarEvening')!
    expect(m.at).toBe(times(m.at).sunrise.getTime() + 15 * 60_000)
    expect(e.at).toBe(times(e.at).asr.getTime() + 15 * 60_000)
    for (const a of p) expect(a.at - (a.kind === 'adhkarMorning' ? times(a.at).sunrise : times(a.at).asr).getTime()).toBe(15 * 60_000)
    expect(e).toMatchObject({ title: 'مسلم', body: 'أذكار المساء', url: '/today/adhkar' })
    expect(p.find((a) => a.kind === 'adhkarMorning')).toMatchObject({ body: 'أذكار الصباح' })
  })

  it('the minutes are adjustable, among the offered ones only', () => {
    const p = plan({ bells: [], ward: false, adhkar: { morning: false, evening: true, morningMin: 15, eveningMin: 45 } })
    const a = p[0]
    const t = dayTimes(RIYADH, ymdIn(new Date(a.at), RIYADH.timeZone), { method: 'UmmAlQura', asr: 'shafi' })
    expect(a.at).toBe(t.asr.getTime() + 45 * 60_000)
    expect(ADHKAR_MINUTES).toEqual([5, 15, 30, 45, 60])
    // Anything else falls back to the quarter of an hour.
    const odd = plan({ bells: [], ward: false, adhkar: { morning: false, evening: true, morningMin: 15, eveningMin: 7 } })[0]
    expect(odd.at).toBe(t.asr.getTime() + 15 * 60_000)
  })

  it('share the 64 with the bells: the days planned follow what is on', () => {
    // Everything on: nine a day, 64 in time order (seven days and a part).
    const all = plan({ adhkar: both })
    expect(all).toHaveLength(64)
    expect(new Set(all.map((a) => a.id)).size).toBe(64)
    expect(all.every((a, i) => i === 0 || a.at >= all[i - 1].at)).toBe(true)
    expect(all.every((a) => a.at > NOW.getTime())).toBe(true)
    // One reminder only: PLAN_DAYS days, not 64.
    const one = plan({ bells: [], ward: false, adhkar: { ...ADHKAR_DEFAULTS, morning: true } })
    expect(one.length).toBeLessThanOrEqual(PLAN_DAYS)
    expect(one.length).toBeGreaterThanOrEqual(PLAN_DAYS - 1)
    // Both reminders: 64 over 32 days.
    expect(plan({ bells: [], ward: false, adhkar: both })).toHaveLength(64)
  })

  it('ids stay unique across the nine kinds and the days', () => {
    expect(ALL_KINDS).toEqual([...KINDS, 'adhkarMorning', 'adhkarEvening'])
    const day = { y: 2026, m: 10, d: 13 }
    const ids = new Set<number>()
    for (let k = 0; k < 400; k++) for (const kind of ALL_KINDS) ids.add(alertId({ ...day, d: day.d + k }, kind))
    expect(ids.size).toBe(400 * ALL_KINDS.length)
    expect(Math.max(...ids)).toBeLessThan(2 ** 31)
  })

  it('without the texts no adhkar reminder is planned', () => {
    expect(plan({ bells: [], ward: false, adhkar: both, adhkarTexts: undefined })).toEqual([])
  })

  it('a tap asks for the permission only when a reminder is turned on, and an adhkar reminder alone counts as on', async () => {
    const st = { display: 'prompt' as string, asked: 0, pending: [] as { id: number }[] }
    const api = {
      checkPermissions: async () => ({ display: st.display }),
      requestPermissions: async () => (st.asked++, (st.display = 'granted'), { display: st.display }),
      getPending: async () => ({ notifications: st.pending }),
      cancel: async () => void (st.pending = []),
      schedule: async ({ notifications }: { notifications: { id: number }[] }) => ((st.pending = notifications.slice(0, 64)), { notifications }),
      checkExactNotificationSetting: async () => ({ exact_alarm: 'denied' }),
    } as unknown as NotifyApi
    const ctx: AlertContext = { place: { ...RIYADH, source: 'city' }, method: 'UmmAlQura', asr: 'shafi', lang: 'ar', platform: 'ios', adhkarTexts: TEXTS }
    const saved: unknown[] = []
    expect(await applyLocal(api, { bells: [], ward: false, adhkar: { ...ADHKAR_DEFAULTS, morning: true } }, ctx, (p) => saved.push(p))).toBe('ok')
    expect(st.asked).toBe(1)
    expect(st.pending.length).toBeGreaterThan(50)
    // Off again: never asks, nothing pending.
    expect(await applyLocal(api, { bells: [], ward: false, adhkar: ADHKAR_DEFAULTS }, ctx, () => undefined)).toBe('ok')
    expect(st.pending).toEqual([])
    expect(await reschedule(api, { bells: [], ward: false, adhkar: ADHKAR_DEFAULTS }, ctx)).toBe(0)
  })
})

describe('the prayer alert sound (add-on 0072-add18 §1)', () => {
  const at = plan()[0]
  const prayer = plan().find((a) => a.kind === 'dhuhr')!
  const fajr = plan().find((a) => a.kind === 'fajr')!
  const sunrise = plan().find((a) => a.kind === 'sunrise')!
  const ward = plan().find((a) => a.kind === 'ward')!

  it('iOS: always a sound (the plugin rings nothing without one); the system default by a name no file has', () => {
    expect(toNotification(at, false, 'ios')).toMatchObject({ sound: 'default' })
    expect(toNotification(prayer, false, 'ios', { choice: 'calm', ready: {} })).toMatchObject({ sound: CALM.ios })
    expect(toNotification(sunrise, false, 'ios', { choice: 'calm', ready: {} })).toMatchObject({ sound: CALM.ios })
  })

  it('the adhan only for the prayers, only once its verified file is on the phone; otherwise the system sound', () => {
    const ready = { 'adhan-short': 'muslim-adhan-short-0123456789ab.caf' }
    expect(toNotification(prayer, false, 'ios', { choice: 'adhan', ready })).toMatchObject({ sound: ready['adhan-short'] })
    expect(toNotification(fajr, false, 'ios', { choice: 'adhan', ready })).toMatchObject({ sound: ready['adhan-short'] })
    expect(toNotification(fajr, false, 'ios', { choice: 'adhan', ready: { ...ready, 'adhan-fajr-short': 'muslim-adhan-fajr-short-ba9876543210.caf' } })).toMatchObject({
      sound: 'muslim-adhan-fajr-short-ba9876543210.caf',
    })
    // «يُسمع الأذان عند دخول الوقت فقط»: never at sunrise, the portion or the adhkar.
    expect(toNotification(sunrise, false, 'ios', { choice: 'adhan', ready })).toMatchObject({ sound: 'default' })
    expect(toNotification(ward, false, 'ios', { choice: 'adhan', ready })).toMatchObject({ sound: 'default' })
    expect(soundFor('adhkar', 'adhan', 'ios', ready)).toEqual({ sound: 'default' })
    expect(toNotification(prayer, false, 'ios', { choice: 'adhan', ready: {} })).toMatchObject({ sound: 'default' })
  })

  it('Android: the sound’s own channel, only once the app has made it; the plugin’s default channel otherwise', () => {
    expect(soundFor('prayer', 'system', 'android', {})).toEqual({})
    expect(soundFor('prayer', 'calm', 'android', {})).toEqual({})
    const ready = { 'channel:system': 'alert-system', 'channel:calm': 'alert-calm', 'adhan-short': 'muslim-adhan-short-0123456789ab.ogg', 'channel:adhan-short': 'alert-adhan-short-0123456789ab' }
    expect(soundFor('prayer', 'system', 'android', ready)).toEqual({ channelId: 'alert-system' })
    expect(soundFor('prayer', 'calm', 'android', ready)).toEqual({ channelId: 'alert-calm' })
    expect(soundFor('prayer', 'adhan', 'android', ready)).toEqual({ channelId: 'alert-adhan-short-0123456789ab' })
    expect(soundFor('sunrise', 'adhan', 'android', ready)).toEqual({ channelId: 'alert-system' })
    expect(channelOf('adhan-short', ready['adhan-short'])).toBe('alert-adhan-short-0123456789ab')
    expect(toNotification(prayer, false, 'android', { choice: 'calm', ready })).toMatchObject({ channelId: 'alert-calm', smallIcon: 'ic_stat_muslim' })
  })

  it('the web gets no sound field (its bells are Web Push)', () => {
    expect(soundFor('prayer', 'calm', 'web', {})).toEqual({})
  })
})

describe('the sounds’ manifest (add-on 0072-add20 §1)', () => {
  const sha = 'a'.repeat(64)
  const good = (id: string, seconds = 27, approved = true): unknown => ({
    id,
    approved,
    files: { ios: { path: `/sounds/${id}.caf`, sha256: sha, bytes: 500_000, seconds }, android: { path: `/sounds/${id}.ogg`, sha256: sha, bytes: 200_000, seconds } },
    credit: { source: 'Adhan Recordings from Doha, Qatar', url: 'https://archive.org/details/adhan.recordings.from.doha.qatar', license: 'Public Domain Mark 1.0' },
  })

  it('the server’s manifest today is empty: the adhan option is hidden until Talal has listened', () => {
    const shipped = parseManifest(JSON.parse(read('web/public/sounds/manifest.json')))
    expect(shipped).toEqual(EMPTY_MANIFEST)
    expect(offeredChoices(shipped, 'ios')).toEqual(['system', 'calm'])
    expect(offeredChoices(shipped, 'android')).toEqual(['system', 'calm'])
    expect(offeredChoices(shipped, 'web')).toEqual([])
    // No recorded sound in the repository before the approval (add-on 0072-add21 §3).
    expect(fs.readdirSync(path.join(ROOT, 'web/public/sounds'))).toEqual(['manifest.json'])
  })

  it('the manifest is readable by the app from its own origin (a static file: _headers, not the Worker’s CORS)', () => {
    const block = read('web/public/_headers').split(/\n(?=\S)/).find((b) => b.startsWith('/sounds/*\n')) ?? ''
    expect(block).toMatch(/Access-Control-Allow-Origin: \*/)
    expect(block).toMatch(/Cache-Control: public, max-age=300/)
  })

  it('an approved, valid adhan is offered; unapproved or broken it is not', () => {
    const m = parseManifest({ v: 1, sounds: [good('adhan-short')] })
    expect(offeredChoices(m, 'ios')).toEqual(['system', 'calm', 'adhan'])
    expect(offeredChoices(parseManifest({ v: 1, sounds: [good('adhan-short', 27, false)] }), 'ios')).toEqual(['system', 'calm'])
    expect(usable(m, 'adhan-short', 'android')).not.toBeNull()
  })

  it('30 seconds is the limit for an alert (Apple: less than 30 s); the full adhan is in-app only and may be longer', () => {
    expect(MAX_ALERT_SECONDS).toBe(30)
    expect(parseManifest({ v: 1, sounds: [good('adhan-short', 30)] }).sounds).toEqual([])
    expect(parseManifest({ v: 1, sounds: [good('adhan-short', 29.9)] }).sounds).toHaveLength(1)
    expect(parseManifest({ v: 1, sounds: [good('adhan-full', 180)] }).sounds).toHaveLength(1)
    expect(SOUND_SLOTS['adhan-full']).toBe('inApp')
  })

  it('refuses a bad hash, path or format per system, and anything that is not a slot', () => {
    expect(fileProblem({ path: '/sounds/a.caf', sha256: 'xyz', bytes: 1, seconds: 1 }, 'ios', true)).toBe('sha256')
    expect(fileProblem({ path: '/elsewhere/a.caf', sha256: sha, bytes: 1, seconds: 1 }, 'ios', true)).toBe('path')
    expect(fileProblem({ path: '/sounds/a.m4a', sha256: sha, bytes: 1, seconds: 1 }, 'ios', true)).toBe('format') // AAC is not an alert format on iOS
    expect(fileProblem({ path: '/sounds/a.caf', sha256: sha, bytes: 1, seconds: 1 }, 'android', true)).toBe('format')
    expect(fileProblem({ path: '/sounds/a.ogg', sha256: sha, bytes: 9_000_000, seconds: 1 }, 'android', true)).toBe('bytes')
    expect(parseManifest({ v: 1, sounds: [good('ringtone')] }).sounds).toEqual([])
    expect(parseManifest({ v: 2, sounds: [good('adhan-short')] })).toEqual(EMPTY_MANIFEST)
    expect(parseManifest('nonsense')).toEqual(EMPTY_MANIFEST)
    expect(parseManifest({ v: 1, sounds: [{ ...(good('adhan-short') as object), credit: undefined }] }).sounds).toEqual([])
  })

  it('every recorded slot of the brief has its id; English and the other languages take a suffix', () => {
    expect(Object.keys(SOUND_SLOTS)).toEqual(
      expect.arrayContaining(['adhan-short', 'adhan-fajr-short', 'adhan-full', 'adhan-fajr-full', 'call-fajr', 'call-sunrise', 'call-dhuhr', 'call-asr', 'call-maghrib', 'call-isha', 'adhkar-morning', 'adhkar-evening', 'ward']),
    )
    expect(slotOf('call-fajr-en')).toBe('call-fajr')
    expect(slotOf('adhan-fajr-short')).toBe('adhan-fajr-short')
    expect(parseManifest({ v: 1, sounds: [good('call-isha-en')] }).sounds).toHaveLength(1)
  })

  it('a downloaded file’s name carries its hash, so a new edition never meets the old one', () => {
    const m = parseManifest({ v: 1, sounds: [good('adhan-short')] }) as SoundManifest
    expect(localName('adhan-short', m.sounds[0].files.ios!)).toBe(`muslim-adhan-short-${sha.slice(0, 12)}.caf`)
    // The native sides accept exactly this shape.
    expect(read('web/ios/App/App/AlertSoundsPlugin.swift')).toContain('^muslim-([a-z0-9-]+)-([0-9a-f]{12})\\\\.(caf|wav|aiff?)$')
    expect(read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/AlertSoundsPlugin.java')).toContain('^muslim-([a-z0-9-]+)-([0-9a-f]{12})\\\\.(ogg|m4a|wav)$')
  })
})

describe('the recordings’ production record → the server’s manifest (relay/w1/0072-alerts/adhan/manifest.json)', () => {
  // The relay folder is outside git: in the main checkout, or three levels up from a worktree under .claude/worktrees.
  const RECORD = [path.join(ROOT, 'relay/w1/0072-alerts/adhan/manifest.json'), path.join(ROOT, '../../../relay/w1/0072-alerts/adhan/manifest.json')].find((f) => fs.existsSync(f))
  const record = RECORD ? JSON.parse(fs.readFileSync(RECORD, 'utf8')) : null
  it.skipIf(!record)('each recorded file becomes its slot; nothing is offered before Talal approves', () => {
    const m = fromProductionRecord(record, false)
    const ids = m.sounds.map((s) => s.id).sort()
    expect(ids).toEqual(expect.arrayContaining(['adhan-short', 'adhan-fajr-short', 'adhan-full-fajr', 'adhan-full-dhuhr', 'adhan-full-asr', 'adhan-full-maghrib', 'adhan-full-isha']))
    for (const id of ['adhan-short', 'adhan-fajr-short'] as const) {
      const e = m.sounds.find((s) => s.id === id)!
      expect(e.files.ios!.path).toMatch(/\.caf$/)
      expect(e.files.android!.path).toMatch(/\.ogg$/)
      expect(e.files.ios!.seconds).toBeLessThan(MAX_ALERT_SECONDS)
      expect(e.credit).toMatchObject({ license: 'Public Domain Mark 1.0', url: 'https://archive.org/details/adhan.recordings.from.doha.qatar' })
    }
    expect(offeredChoices(m, 'ios')).toEqual(['system', 'calm'])
    expect(offeredChoices(fromProductionRecord(record, true), 'ios')).toEqual(['system', 'calm', 'adhan'])
    expect(offeredChoices(fromProductionRecord(record, true), 'android')).toEqual(['system', 'calm', 'adhan'])
  })
})

/** Seconds of a WAV (PCM) file. */
function wavSeconds(b: Buffer) {
  expect(b.toString('ascii', 0, 4)).toBe('RIFF')
  const rate = b.readUInt32LE(24)
  const bytesPerSec = b.readUInt32LE(28)
  let at = 12
  while (at < b.length) {
    const id = b.toString('ascii', at, at + 4)
    const size = b.readUInt32LE(at + 4)
    if (id === 'data') return { seconds: size / bytesPerSec, rate }
    at += 8 + size
  }
  throw new Error('no data chunk')
}
/** Seconds and format of a CAF file (its desc and pakt chunks). */
function cafSeconds(b: Buffer) {
  expect(b.toString('ascii', 0, 4)).toBe('caff')
  let at = 8
  let rate = 0
  let format = ''
  let framesPerPacket = 0
  let frames = 0
  while (at < b.length) {
    const id = b.toString('ascii', at, at + 4)
    const size = Number(b.readBigInt64BE(at + 4))
    const body = at + 12
    if (id === 'desc') {
      rate = b.readDoubleBE(body)
      format = b.toString('ascii', body + 8, body + 12)
      framesPerPacket = b.readUInt32BE(body + 20)
    }
    if (id === 'pakt') frames = Number(b.readBigInt64BE(body + 8)) || Number(b.readBigInt64BE(body)) * framesPerPacket
    at = body + size
    if (id === 'data' && size < 0) break
  }
  return { seconds: frames / rate, format, rate }
}

describe('the calm tone (our own work, web/scripts/make-calm-tone.py)', () => {
  it('iOS: IMA4 in CAF, a format UNNotificationSound plays, under 30 seconds, in the app bundle', () => {
    const c = cafSeconds(fs.readFileSync(path.join(ROOT, 'web/ios/App/App/muslim-calm.caf')))
    expect(c.format).toBe('ima4')
    expect(c.seconds).toBeGreaterThan(5)
    expect(c.seconds).toBeLessThan(MAX_ALERT_SECONDS)
    const pbx = read('web/ios/App/App.xcodeproj/project.pbxproj')
    expect(pbx).toMatch(/muslim-calm\.caf in Resources/)
  })
  it('Android: a PCM WAV in res/raw under the name the channel asks for, under 30 seconds', () => {
    const w = wavSeconds(fs.readFileSync(path.join(ROOT, `web/android/app/src/main/res/raw/${CALM.android}.wav`)))
    expect(w.seconds).toBeGreaterThan(5)
    expect(w.seconds).toBeLessThan(MAX_ALERT_SECONDS)
  })
  it('is in the components register as our own work', () => {
    expect(read('docs/COMPONENTS.csv')).toMatch(/muslim-calm/)
  })
})

describe('the tasbih session on the lock screen (add-on 0072-add19 §3)', () => {
  const data = JSON.parse(read('data/tasbih-after-prayer.json'))
  const strip = (s: string) => s.replace(/[ً-ْٰـ‌‍]/g, '').replace(/\s+/g, ' ').trim()
  const HADITH = path.join(ROOT, 'data/processed/hadith.jsonl')
  const has = fs.existsSync(HADITH)
  const arabic = () => {
    const m = new Map<string, { hadeeth: string; tier?: string; grade: string; attribution: string }>()
    for (const line of fs.readFileSync(HADITH, 'utf8').split('\n')) {
      if (!line.includes('"lang":"ar"') && !line.includes('"lang": "ar"')) continue
      const o = JSON.parse(line)
      if (o.lang === 'ar' && !m.has(o.id)) m.set(o.id, o)
    }
    return m
  }

  it('the two narrations: 33, 33, 33 and the hundredth (10948); 33, 33, 34 (6259)', () => {
    expect(data.steps.map((s: { count: number }) => s.count)).toEqual([33, 33, 33, 1])
    expect(data.alt.id).toBe('6259')
    expect(data.alt.steps.map((s: { count: number }) => s.count)).toEqual([33, 33, 34])
  })

  it.skipIf(!has)('6259 is sahih (Muslim), after the obligatory prayer, and every step’s words and number are in its text', () => {
    const r = arabic().get('6259')!
    expect(r.grade).toBe('صحيح')
    expect(r.attribution).toBe('رواه مسلم')
    const text = strip(r.hadeeth)
    expect(text).toContain('دبر كل صلاة مكتوبة')
    const words: Record<number, string> = { 33: 'ثلاث وثلاثون', 34: 'أربع وثلاثون' }
    for (const s of data.alt.steps) {
      expect(text).toContain(strip(s.phrase))
      expect(text).toContain(strip(s.label))
      expect(strip(s.evidence)).toContain(words[s.count])
    }
  })

  it('the session’s texts: no sacred text written by us; the source line names the encyclopedia', () => {
    for (const [l, t] of Object.entries(ALERT_TEXT)) {
      expect(Object.keys(t).sort(), l).toEqual(Object.keys(ALERT_TEXT.ar).sort())
      for (const v of Object.values(t)) expect(v, l).not.toMatch(/!|！/)
    }
    expect(Object.keys(ALERT_TEXT).sort()).toEqual(['ar', 'bn', 'en', 'es', 'fr', 'hi', 'id', 'ms', 'tr', 'ur'])
    expect(ALERT_TEXT.ar.adhanNote).toBe('يُسمع الأذان عند دخول الوقت فقط')
    // The name is «مسلم», never with the letter i.
    for (const t of Object.values(ALERT_TEXT)) for (const v of Object.values(t)) expect(v).not.toMatch(/iMuslim|i Muslim|i مسلم/)
  })
})

describe('the native projects (add-ons 0072-add18 §3, 0072-add19)', () => {
  const pbx = read('web/ios/App/App.xcodeproj/project.pbxproj')
  it('the session and the controls’ open intent are in the app and the extension both (Apple: OpenIntent, LiveActivityIntent)', () => {
    for (const f of ['TasbihSession.swift', 'OpenPageIntent.swift']) expect(pbx.match(new RegExp(`${f.replace('.', '\\.')} in Sources \\*/ = \\{isa = PBXBuildFile`, 'g'))).toHaveLength(2)
    for (const f of ['LockViews.swift', 'LockWidgets.swift', 'AlertSoundsPlugin.swift', 'TasbihSessionPlugin.swift']) expect(pbx).toContain(`${f} in Sources`)
    expect(read('web/ios/App/App/Info.plist')).toMatch(/<key>NSSupportsLiveActivities<\/key>\s*<true\/>/)
  })
  it('«+١» runs from the lock screen without Face ID (authenticationPolicy .alwaysAllowed) and without opening the app', () => {
    const t = read('web/ios/App/MuslimWidgets/TasbihIntent.swift')
    expect(t).toContain('static let authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed')
    expect(t).toContain('static let openAppWhenRun: Bool = false')
  })
  it('the lock-screen families and the iOS 18 controls are declared, each behind its iOS version', () => {
    const w = read('web/ios/App/MuslimWidgets/Widgets.swift')
    expect(w).toMatch(/\.systemSmall, \.accessoryCircular, \.accessoryRectangular/)
    expect(w).toMatch(/\.systemSmall, \.accessoryRectangular/)
    expect(w).toMatch(/if #available\(iOS 18\.0, \*\) \{\s*MuslimControls\(\)/)
    expect(w).toMatch(/if #available\(iOS 16\.2, \*\) \{\s*TasbihSessionActivity\(\)/)
    const l = read('web/ios/App/MuslimWidgets/LockWidgets.swift')
    for (const k of ['TasbihCountControl', 'TasbihPageControl', 'AdhkarPageControl', 'QiblaControl']) expect(l).toContain(`struct ${k}: ControlWidget`)
  })
  it('no Time Sensitive interruption level in 1.1 (README: the decision), no new entitlement', () => {
    for (const f of ['web/src/native/notify.ts', 'web/src/native/alert-sounds.ts']) expect(read(f)).not.toMatch(/interruptionLevel|timeSensitive/)
    expect(read('web/ios/App/App/App.entitlements')).not.toMatch(/time-sensitive/)
  })
  it('Android: the tile «سبّح» with its permission, the same tap as the widget, the channels’ plugin, the sound folder lent', () => {
    const m = read('web/android/app/src/main/AndroidManifest.xml')
    expect(m).toMatch(/\.widget\.TasbihTileService[\s\S]*BIND_QUICK_SETTINGS_TILE[\s\S]*action\.QS_TILE/)
    const tile = read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/widget/TasbihTileService.java')
    expect(tile).toContain('WidgetActions.tap(t, WidgetActions.today())')
    expect(read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/MainActivity.java')).toContain('registerPlugin(AlertSoundsPlugin.class)')
    expect(read('web/android/app/src/main/res/xml/file_paths.xml')).toContain('<files-path name="alert_sounds" path="sounds/" />')
    for (const d of ['values', 'values-en', 'values-ur', 'values-in', 'values-ms', 'values-tr', 'values-fr', 'values-es', 'values-bn', 'values-hi'])
      expect(read(`web/android/app/src/main/res/${d}/alert_strings.xml`)).toMatch(/<string name="tile_tasbih_name">[^<]+<\/string>/)
  })
  it('the controls’ and the tile’s names are in the ten languages', () => {
    for (const [l, w] of Object.entries(WIDGET_STRINGS)) for (const k of ['ctlCount', 'ctlTasbih', 'ctlAdhkar', 'ctlQibla'] as const) expect(w.names[k].name, `${l} ${k}`).toBeTruthy()
    expect(WIDGET_STRINGS.ar.names.ctlCount.name).toBe('سبّح')
  })
})

// The approval pictures' data (web/scripts/alerts-render.sh): a widgets.json as the app writes it, for Riyadh on
// 25 October 2026, in Arabic and English, with the tasbih at 12 of 33 and the morning adhkar at 4 of 12.
//   ALERT_SAMPLES=<dir> npx vitest run test/alerts-0072.test.ts -t samples
describe.skipIf(!process.env.ALERT_SAMPLES)('samples', () => {
  it('samples', async () => {
    const { timeOf, num, fill } = await import('../../web/src/v2/daily/format')
    const { TODAY } = await import('../../web/src/v2/daily/strings-today')
    const { digitsOf, zonedMidnight, mawaqifButtons } = await import('../../web/src/native/widget-data')
    const dir = process.env.ALERT_SAMPLES!
    fs.mkdirSync(dir, { recursive: true })
    for (const lang of ['ar', 'en'] as const) {
      const w = WIDGET_STRINGS[lang]
      const t = TODAY[lang]
      const days = []
      for (let k = 0; k < 3; k++) {
        const ymd = { y: 2026, m: 10, d: 25 + k }
        const start = zonedMidnight(ymd, RIYADH.timeZone)
        const end = zonedMidnight({ ...ymd, d: ymd.d + 1 }, RIYADH.timeZone)
        const d = dayTimes(RIYADH, ymd, { method: 'UmmAlQura', asr: 'shafi' })
        const times = (['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((key) => ({ key, name: t.prayers[key], at: d[key].getTime(), text: timeOf(d[key], lang, RIYADH.timeZone), prayer: key !== 'sunrise' }))
        days.push({ date: `2026-10-${25 + k}`, start, end, weekday: '', gregorian: '', gregorianShort: '', hijri: { day: '', month: '', year: '', text: '' }, times, ayah: null, hadith: null, sky: [] })
      }
      const { midnight: _m, lastThird: _l, morning, evening, of, allAdhkar: _a, names, ...labels } = w
      const part = (title: string, done: number) => ({ title, progress: fill(of, { n: num(done, lang), t: num(12, lang) }), none: fill(of, { n: num(0, lang), t: num(12, lang) }), fraction: done / 12, url: 'imuslim://today/adhkar' })
      const data = {
        v: 1,
        lang,
        rtl: lang === 'ar',
        built: Date.UTC(2026, 9, 25, 4),
        place: { name: lang === 'ar' ? 'الرياض' : 'Riyadh', tz: RIYADH.timeZone },
        labels: { ...labels, names, mawaqif: mawaqifButtons(lang) },
        days,
        tasbih: { steps: [{ zikr: 'سُبْحَانَ اللَّهِ', target: 33 }], step: 0, n: 12, after: false, total: 112, day: '2026-10-25', digits: digitsOf(lang) },
        adhkar: { day: '2026-10-25', morning: part(morning, 4), evening: part(evening, 0) },
        nameDays: [],
        salafDays: [],
      }
      fs.writeFileSync(path.join(dir, `${lang}.json`), JSON.stringify(data))
    }
  })
})

// Add-on 0072-add34 §ب5: «حساس للوقت». The five prayers' entry alerts (and only they) carry the interruption level
// timeSensitive on the iPhone when the switch is on (its default) and the app carries the entitlement; on Android the
// same five go to their own high-importance channel. Times, sounds and every other alert stay as they were.
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { planAlerts, type AdhkarTexts, type PlanInput } from '../../web/src/native/bells'
import { reschedule, toNotification, type AlertContext, type NotifyApi } from '../../web/src/native/notify'
import { interruptionLevelFor, loadSoundPrefs, loadTimeSensitive, saveSoundPrefs, saveTimeSensitive, TIME_SENSITIVE_KINDS, timeSensitiveFor, type TimeSensitiveSetting } from '../../web/src/native/alert-sounds'
import { alertChannels, ENTRY_TEXT, entryChannel } from '../../web/src/native/android/alert-channels'
import { ALERT_TEXT } from '../../web/src/native/alert-strings'

const ROOT = path.resolve(import.meta.dirname, '../..')
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
const RIYADH = { lat: 24.7136, lng: 46.6753, timeZone: 'Asia/Riyadh' }
const TEXTS: AdhkarTexts = { title: 'مسلم', morning: 'أذكار الصباح', evening: 'أذكار المساء', morningUrl: '/today/adhkar', eveningUrl: '/today/adhkar' }
const NOW = new Date('2026-10-13T09:00:00Z')
const BOTH = { morning: true, evening: true, morningMin: 15, eveningMin: 15 }
const plan = (p: Partial<PlanInput> = {}) =>
  planAlerts({ place: RIYADH, bells: ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'], ward: true, adhkar: BOTH, method: 'UmmAlQura', asr: 'shafi', lang: 'ar', now: NOW, adhkarTexts: TEXTS, ...p })
const FIVE = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
const OTHERS = ['sunrise', 'ward', 'adhkarMorning', 'adhkarEvening']

describe('the interruption level (iPhone)', () => {
  it('timeSensitive for the five entries alone, with the switch on and the system able to', () => {
    expect([...TIME_SENSITIVE_KINDS].sort()).toEqual([...FIVE].sort())
    for (const setting of ['enabled', 'disabled', 'notDetermined'] as TimeSensitiveSetting[]) {
      for (const k of FIVE) expect(interruptionLevelFor(k, 'ios', { on: true, setting })).toBe('timeSensitive')
      for (const k of OTHERS) expect(interruptionLevelFor(k, 'ios', { on: true, setting })).toBeUndefined()
    }
  })

  it('nothing when the switch is off, without the entitlement (notSupported), when unknown, or off the iPhone', () => {
    for (const k of FIVE) {
      expect(interruptionLevelFor(k, 'ios', { on: false, setting: 'enabled' })).toBeUndefined()
      expect(interruptionLevelFor(k, 'ios', { on: true, setting: 'notSupported' })).toBeUndefined()
      expect(interruptionLevelFor(k, 'ios', { on: true, setting: null })).toBeUndefined()
      expect(interruptionLevelFor(k, 'ios', undefined)).toBeUndefined()
      expect(interruptionLevelFor(k, 'android', { on: true, setting: 'enabled' })).toBeUndefined()
      expect(interruptionLevelFor(k, 'web', { on: true, setting: 'enabled' })).toBeUndefined()
      expect(timeSensitiveFor(k, true, 'notSupported')).toBe(false)
    }
  })

  it('the notifications: the level on the five, and each one otherwise exactly as without the switch', () => {
    const ts = { on: true, setting: 'enabled' as const }
    const sound = { choice: 'calm' as const, ready: {} }
    const alerts = plan()
    expect(new Set(alerts.map((a) => a.kind))).toEqual(new Set([...FIVE, ...OTHERS]))
    for (const a of alerts) {
      const before = toNotification(a, false, 'ios', sound)
      const after = toNotification(a, false, 'ios', sound, ts)
      if (FIVE.includes(a.kind)) expect(after).toEqual({ ...before, interruptionLevel: 'timeSensitive' })
      else expect(after).toEqual(before)
      expect(before).not.toHaveProperty('interruptionLevel')
      expect(toNotification(a, false, 'ios', sound, { on: true, setting: 'notSupported' })).toEqual(before)
      expect(toNotification(a, false, 'ios', sound, { on: false, setting: 'enabled' })).toEqual(before)
    }
  })

  it('reschedule passes the level through and plans the same alerts at the same times', async () => {
    const got: { notifications: { id: number; schedule: { at: Date }; interruptionLevel?: string }[] }[] = []
    const api = {
      checkPermissions: async () => ({ display: 'granted' }),
      getPending: async () => ({ notifications: [] }),
      cancel: async () => undefined,
      schedule: async (o: (typeof got)[number]) => (got.push(o), o),
      checkExactNotificationSetting: async () => ({ exact_alarm: 'denied' }),
    } as unknown as NotifyApi
    const ctx: AlertContext = { place: { ...RIYADH, source: 'city' }, method: 'UmmAlQura', asr: 'shafi', lang: 'ar', platform: 'ios', adhkarTexts: TEXTS }
    const prefs = { bells: ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'], ward: true, adhkar: BOTH }
    const n1 = await reschedule(api, prefs, ctx, NOW)
    const n2 = await reschedule(api, prefs, { ...ctx, timeSensitive: { on: true, setting: 'enabled' } }, NOW)
    expect(n2).toBe(n1)
    const [a, b] = got.map((g) => g.notifications)
    expect(b.map((n) => [n.id, +n.schedule.at])).toEqual(a.map((n) => [n.id, +n.schedule.at]))
    expect(a.some((n) => n.interruptionLevel)).toBe(false)
    const kinds = new Map(plan().map((p) => [p.id, p.kind]))
    for (const n of b) expect(n.interruptionLevel === 'timeSensitive').toBe(FIVE.includes(kinds.get(n.id)!))
  })
})

describe('Android: the five entries’ own high-importance channel', () => {
  const ready = { 'channel:system': 'alert-system', 'channel:calm': 'alert-calm', 'channel:entry-system': 'alert-entry-system', 'channel:entry-calm': 'alert-entry-calm' }

  it('the entry channels are made only with the switch on, one per sound, named in the ten languages', () => {
    expect(alertChannels({}, 'ar').map((c) => c.key)).toEqual(['system', 'calm'])
    expect(alertChannels({}, 'ar', true).map((c) => c.key)).toEqual(['system', 'calm', 'entry-system', 'entry-calm'])
    const withAdhan = alertChannels({ 'adhan-short': 'muslim-adhan-short-0123456789ab.ogg' }, 'en', true)
    expect(withAdhan.find((c) => c.key === 'entry-adhan-short')).toMatchObject({ file: 'muslim-adhan-short-0123456789ab.ogg' })
    expect(withAdhan.find((c) => c.key === 'entry-calm')?.raw).toBe(alertChannels({}, 'en')[1].raw)
    for (const c of withAdhan) expect(c.key).toMatch(/^[a-z0-9-]+$/)
  })

  it('the five go to the entry channel of their sound once it is made; the others and the switch off keep theirs', () => {
    for (const k of FIVE) {
      expect(entryChannel(k, { channelId: 'alert-system' }, ready, true)).toEqual({ channelId: 'alert-entry-system' })
      expect(entryChannel(k, { channelId: 'alert-calm' }, ready, true)).toEqual({ channelId: 'alert-entry-calm' })
      expect(entryChannel(k, { channelId: 'alert-system' }, ready, false)).toEqual({ channelId: 'alert-system' })
      expect(entryChannel(k, { channelId: 'alert-adhan-short-0123456789ab' }, ready, true)).toEqual({ channelId: 'alert-adhan-short-0123456789ab' })
      expect(entryChannel(k, {}, ready, true)).toEqual({})
    }
    for (const k of OTHERS) expect(entryChannel(k, { channelId: 'alert-system' }, ready, true)).toEqual({ channelId: 'alert-system' })
    for (const a of plan()) {
      const n = toNotification(a, true, 'android', { choice: 'system', ready }, { on: true, setting: null })
      expect(n.channelId).toBe(FIVE.includes(a.kind) ? 'alert-entry-system' : 'alert-system')
      expect(n).not.toHaveProperty('interruptionLevel')
      expect({ ...n, channelId: 'x' }).toEqual({ ...toNotification(a, true, 'android', { choice: 'system', ready }), channelId: 'x' })
    }
  })

  it('the Java plugin makes every channel it is given at high importance, and the entry key reads back as its own', () => {
    const java = read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/AlertSoundsPlugin.java')
    expect(java).toContain('new NotificationChannel(id, label, NotificationManager.IMPORTANCE_HIGH)')
    expect(java).toContain('if (!key.matches("[a-z0-9-]+")) continue;')
    expect(java).toContain('id.substring("alert-".length()).replaceAll("-[0-9a-f]{12}$", "")')
  })
})

describe('the switch: on by default, kept with the sound, never changing the sound', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('reads on before anything is saved and from a key saved before it; saving one keeps the other', () => {
    const m = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) })
    expect(loadTimeSensitive()).toBe(true)
    m.set('muslim.alertSound.v1', JSON.stringify({ prayer: 'calm' }))
    expect(loadSoundPrefs()).toEqual({ prayer: 'calm', timeSensitive: true })
    saveTimeSensitive(false)
    expect(loadSoundPrefs()).toEqual({ prayer: 'calm', timeSensitive: false })
    saveSoundPrefs({ prayer: 'system' })
    expect(loadSoundPrefs()).toEqual({ prayer: 'system', timeSensitive: false })
    expect(m.get('muslim.alertSound.v1')).toBe('{"prayer":"system","timeSensitive":false}')
    saveTimeSensitive(true)
    expect(loadSoundPrefs()).toEqual({ prayer: 'system', timeSensitive: true })
    // On (the default) is not written: the saved choice reads as it did before the switch.
    expect(m.get('muslim.alertSound.v1')).toBe('{"prayer":"system"}')
  })
})

describe('the texts', () => {
  it('ten languages on both platforms, short and welcoming: no exclamation marks, the five named, the rest left out', () => {
    for (const l of LANGS) {
      const t = ALERT_TEXT[l]
      const e = ENTRY_TEXT[l]
      for (const s of [t.tsTitle, t.tsHint, t.tsOff, e.title, e.hint, e.channel]) {
        expect(s.trim().length).toBeGreaterThan(3)
        expect(s).not.toMatch(/[!¡！]/)
      }
      expect(t.tsHint.length).toBeLessThan(400)
      expect(e.hint.length).toBeLessThan(400)
    }
    expect(ALERT_TEXT.ar.tsHint.length).toBeLessThan(300)
    expect(ALERT_TEXT.ar.tsHint).toContain('الصلوات الخمس')
    expect(ALERT_TEXT.ar.tsHint).toContain('ولا يشمل الشروق ولا الورد ولا الأذكار')
    expect(ENTRY_TEXT.ar.hint).toContain('ولا يشمل الشروق ولا الورد ولا الأذكار')
  })
})

describe('the iPhone project', () => {
  it('the Time Sensitive entitlement in App.entitlements, which Debug and Release both sign with; not in the widgets', () => {
    const ent = read('web/ios/App/App/App.entitlements')
    expect(ent).toMatch(/<key>com\.apple\.developer\.usernotifications\.time-sensitive<\/key>\s*<true\/>/)
    const pbx = read('web/ios/App/App.xcodeproj/project.pbxproj')
    const app = [...pbx.matchAll(/buildSettings = \{([\s\S]*?)\n\t\t\t\};\n\t\t\tname = (Debug|Release);/g)].filter((m) => /PRODUCT_BUNDLE_IDENTIFIER = com\.alkhammashtalal\.imuslim;/.test(m[1]))
    expect(app.map((m) => m[2]).sort()).toEqual(['Debug', 'Release'])
    for (const m of app) expect(m[1]).toContain('CODE_SIGN_ENTITLEMENTS = App/App.entitlements;')
    expect(read('web/ios/App/MuslimWidgets/MuslimWidgets.entitlements')).not.toMatch(/time-sensitive/)
    const sw = read('web/scripts/timesensitive-switch.sh')
    expect(sw).toContain("KEY='\t<key>com.apple.developer.usernotifications.time-sensitive</key>'")
  })

  it('the native method answers the system setting, and the plugin keeps its other methods', () => {
    const swift = read('web/ios/App/App/AlertSoundsPlugin.swift')
    expect(swift).toContain('CAPPluginMethod(name: "timeSensitive", returnType: CAPPluginReturnPromise)')
    expect(swift).toContain('settings.timeSensitiveSetting')
    for (const m of ['status', 'prepare', 'channels']) expect(swift).toContain(`CAPPluginMethod(name: "${m}"`)
    for (const s of ['enabled', 'disabled', 'notSupported', 'notDetermined']) expect(swift).toContain(`"${s}"`)
    // @capacitor/local-notifications sets UNMutableNotificationContent.interruptionLevel from the field since 8.1.0.
    const v = (JSON.parse(read('web/package.json')).dependencies['@capacitor/local-notifications'] as string).replace(/^[^\d]*/, '').split('.').map(Number)
    expect(v[0] > 8 || (v[0] === 8 && v[1] >= 1)).toBe(true)
  })

  it('Android code stays out of web/ios, and the iPhone path reads no Android channel', () => {
    for (const f of ['web/ios/App/App/AlertSoundsPlugin.swift', 'web/ios/App/App/App.entitlements']) expect(read(f)).not.toMatch(/entry-|NotificationChannel/)
    expect(read('web/src/native/alert-sounds-device.ts')).toMatch(/if \(isAndroid\(\)\) \{\s*const \{ alertChannels \} = await import\('\.\/android\/alert-channels'\)/)
  })
})

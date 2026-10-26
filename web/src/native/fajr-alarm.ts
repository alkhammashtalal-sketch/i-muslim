// «منبّه الفجر» (add-on 0072-add34 §ب6): an AlarmKit alarm at each day's Fajr on iOS 26 and later, which rings through
// the silent mode and Focus. Off by default; only the user's tap on its switch turns it on, and that tap is the only
// moment the system's permission is asked. Before iOS 26 the settings do not show it: the Fajr bell (a notification)
// is what the phone has. The native side (web/ios/App/App/FajrAlarm.swift, FajrAlarmPlugin.swift) keeps the alarms of
// the days ahead from the times the app writes for its widgets, and renews them by itself; this file only says what the
// user chose. Pure but for the plugin's registration: worker/test/alarm-live-0072.test.ts.
import { registerPlugin } from '@capacitor/core'
import { deviceStorage } from '../storage/device'
import { ALARM_TEXT } from './alarm-strings'
import { platform } from './platform'
import { usable, type Ready, type SoundManifest } from './alert-sounds'

export type AlarmSound = 'default' | 'adhan'
/** `file`: the adhan file last given to the alarm (FajrAlarm.enable / setSound), so a new edition is noticed. */
export type AlarmPrefs = { on: boolean; sound: AlarmSound; file?: string }
export const ALARM_DEFAULTS: AlarmPrefs = { on: false, sound: 'default' }
export type AlarmAuth = 'notDetermined' | 'denied' | 'authorized'

type Plugin = {
  /** iOS 26 and later only; the system's answer so far; whether it is on; how many days are set. */
  available(): Promise<{ supported: boolean; auth: AlarmAuth; on: boolean; scheduled: number }>
  /** The user's tap: asks the system once, then sets the days ahead. `sound`: a verified file in Library/Sounds. */
  enable(o: { sound: string | null; stop: string }): Promise<{ ok: boolean; error?: string; scheduled: number }>
  disable(): Promise<{ scheduled: number }>
  setSound(o: { sound: string | null; stop: string }): Promise<{ scheduled: number }>
}
export const FajrAlarm = registerPlugin<Plugin>('FajrAlarm')

/** The settings' copy of the choice, in the storage layer (web/src/storage/device.ts) like the other settings, not in
 *  iCloud (storage/cloud.ts CLOUD_KEYS); the phone's own answer (FajrAlarm.available) wins over it. */
const KEY = 'muslim.fajrAlarm.v1'
export function loadAlarmPrefs(): AlarmPrefs {
  try {
    const v = JSON.parse(deviceStorage.getItem(KEY) ?? '{}') as Partial<AlarmPrefs>
    const p: AlarmPrefs = { on: v.on === true, sound: v.sound === 'adhan' ? 'adhan' : 'default' }
    if (typeof v.file === 'string' && SOUND_FILE.test(v.file)) p.file = v.file
    return p
  } catch {
    return { ...ALARM_DEFAULTS }
  }
}
export function saveAlarmPrefs(p: AlarmPrefs) {
  try {
    deviceStorage.setItem(KEY, JSON.stringify(p))
  } catch {}
}

/** «الأذان مرة» is offered only once our server offers the short adhan approved, as the alerts' «مطلع الأذان» is
 *  (alert-sounds.ts offeredChoices): the Fajr one, or the common one. */
export function alarmSounds(m: SoundManifest): AlarmSound[] {
  return usable(m, 'adhan-fajr-short', 'ios') || usable(m, 'adhan-short', 'ios') ? ['default', 'adhan'] : ['default']
}

/** The file the alarm rings with: the verified Fajr adhan (or the common one) when chosen and on the phone; otherwise
 *  none, which is the system's alarm sound. AlarmKit wants the name with its extension. */
export function alarmSoundFile(choice: AlarmSound, ready: Ready): string | null {
  if (choice !== 'adhan') return null
  const f = ready['adhan-fajr-short'] ?? ready['adhan-short']
  return f && SOUND_FILE.test(f) ? f : null
}
const SOUND_FILE = /^[A-Za-z0-9._-]+\.(caf|wav|aiff?)$/

export type AlarmSoundDeps = {
  load: () => AlarmPrefs
  save: (p: AlarmPrefs) => void
  /** The phone's answer: iOS 26 and the alarm on there. */
  available: () => Promise<{ supported: boolean; on: boolean }>
  /** The short adhan's files on the phone, downloaded and verified when missing (alert-sounds-device.ts). */
  prepare: () => Promise<Ready>
  setSound: (o: { sound: string | null; stop: string }) => Promise<unknown>
}

/** Back in the app (NativeDevice.tsx, after the alerts' own renewal): with the alarm on and «الأذان مرة» chosen, the
 *  file the phone has now goes to the alarm when it is not the one last given, so a new edition of the short adhan
 *  reaches the alarm without opening the settings. Nothing is asked when the alarm is off or on its usual sound; a file
 *  not on the phone (download failed) changes nothing, and the alarm keeps the system's sound (its signature,
 *  FajrAlarm.swift). Returns whether the alarm was given a new file. */
export async function refreshAlarmSound(stop: string, deps: AlarmSoundDeps): Promise<boolean> {
  const prefs = deps.load()
  if (!prefs.on || prefs.sound !== 'adhan') return false
  const a = await deps.available().catch(() => null)
  if (!a?.supported || !a.on) return false
  const file = alarmSoundFile('adhan', await deps.prepare().catch(() => ({})))
  if (!file || file === prefs.file) return false
  await deps.setSound({ sound: file, stop })
  deps.save({ ...prefs, file })
  return true
}

/** What the settings say after a tap, from the plugin's answer. */
export type EnableResult = 'ok' | 'denied' | 'no_place' | 'error'
export function enableResult(r: { ok: boolean; error?: string; scheduled: number }): EnableResult {
  if (r.ok && r.scheduled > 0) return 'ok'
  if (r.error === 'denied') return 'denied'
  if (r.error === 'noData') return 'no_place'
  return r.ok ? 'ok' : 'error'
}

/** refreshAlarmSound with the app's own parts, on the iPhone only; the device code is imported when used. */
export function refreshAlarmSoundNow(lang: string): Promise<boolean> {
  if (platform() !== 'ios') return Promise.resolve(false)
  return refreshAlarmSound((ALARM_TEXT[lang] ?? ALARM_TEXT.ar).stop, {
    load: loadAlarmPrefs,
    save: saveAlarmPrefs,
    available: () => FajrAlarm.available(),
    prepare: async () => (await import('./alert-sounds-device')).prepareSounds('adhan', lang),
    setSound: (o) => FajrAlarm.setSound(o),
  }).catch(() => false)
}

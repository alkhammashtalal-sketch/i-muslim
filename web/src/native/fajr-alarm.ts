// «منبّه الفجر» (add-on 0072-add34 §ب6): an AlarmKit alarm at each day's Fajr on iOS 26 and later, which rings through
// the silent mode and Focus. Off by default; only the user's tap on its switch turns it on, and that tap is the only
// moment the system's permission is asked. Before iOS 26 the settings do not show it: the Fajr bell (a notification)
// is what the phone has. The native side (web/ios/App/App/FajrAlarm.swift, FajrAlarmPlugin.swift) keeps the alarms of
// the days ahead from the times the app writes for its widgets, and renews them by itself; this file only says what the
// user chose. Pure but for the plugin's registration: worker/test/alarm-live-0072.test.ts.
import { registerPlugin } from '@capacitor/core'
import { usable, type Ready, type SoundManifest } from './alert-sounds'

export type AlarmSound = 'default' | 'adhan'
export type AlarmPrefs = { on: boolean; sound: AlarmSound }
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

const KEY = 'muslim.fajrAlarm.v1'
export function loadAlarmPrefs(): AlarmPrefs {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<AlarmPrefs>
    return { on: v.on === true, sound: v.sound === 'adhan' ? 'adhan' : 'default' }
  } catch {
    return { ...ALARM_DEFAULTS }
  }
}
export function saveAlarmPrefs(p: AlarmPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
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
  return f && /^[A-Za-z0-9._-]+\.(caf|wav|aiff?)$/.test(f) ? f : null
}

/** What the settings say after a tap, from the plugin's answer. */
export type EnableResult = 'ok' | 'denied' | 'no_place' | 'error'
export function enableResult(r: { ok: boolean; error?: string; scheduled: number }): EnableResult {
  if (r.ok && r.scheduled > 0) return 'ok'
  if (r.error === 'denied') return 'denied'
  if (r.error === 'noData') return 'no_place'
  return r.ok ? 'ok' : 'error'
}

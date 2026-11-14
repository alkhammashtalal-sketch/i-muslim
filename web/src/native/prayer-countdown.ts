// «عدّاد الصلاة القادمة» (add-on 0072-add34 §ب7): the Live Activity that counts down to the next prayer on the
// iPhone's Lock Screen and in the Dynamic Island, and says «حان وقت …» at its time. Started here from the times page,
// or without the app from the «عدّاد الصلاة» control and Siri (web/ios/App/Shared/PrayerCountdown.swift). The native side
// reads the times the app writes for its widgets, so the page writes them first. No server, no push.
import { registerPlugin } from '@capacitor/core'

export type CountdownStart = { ok: boolean; error?: string; prayer?: string; at?: number; text?: string }
type Plugin = {
  /** iOS 16.2 and later; Live Activities allowed in the phone's Settings; a countdown running now; Ramadan's
   *  countdown on the Lock Screen now (one at a time: this one, once shown, takes its place). */
  available(): Promise<{ supported: boolean; enabled: boolean; active: boolean; fasting?: boolean }>
  start(): Promise<CountdownStart>
  end(): Promise<void>
}
export const PrayerCountdown = registerPlugin<Plugin>('PrayerCountdown')

export type CountdownMessage = 'on' | 'off' | 'tooFar' | 'noPlace' | 'error'
/** What the page says after «اعرض العدّ على شاشة القفل». */
export function countdownMessage(r: CountdownStart): CountdownMessage {
  if (r.ok) return 'on'
  switch (r.error) {
    case 'disabled':
      return 'off'
    case 'tooFar':
      return 'tooFar'
    case 'noData':
      return 'noPlace'
    default:
      return 'error'
  }
}

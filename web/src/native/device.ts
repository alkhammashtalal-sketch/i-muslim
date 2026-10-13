// The app's device side (reply 0033 §ب3), loaded only inside the iOS/Android app (dynamic imports from the shared
// code, so the web bundle never runs it): local notifications for the bells and the portion reminder, and where a
// tapped notification leads.
import { LocalNotifications } from '@capacitor/local-notifications'
import { savedPlace, type Place } from '../daily/location'
import type { AsrSchool, Method } from '../daily/prayer'
import { loadPushPrefs, savePushPrefs, type PushPrefs } from '../v2/daily/push'
import { loadPrayerPrefs } from '../v2/daily/store'
import { alertQueue, applyLocal, reschedule, type ApplyResult } from './notify'
import { platform } from './platform'

const ctxOf = (place: Place | null, lang: string) => {
  const p = loadPrayerPrefs()
  return { place, method: p.method as Method, asr: p.asr as AsrSchool, lang, platform: platform() }
}

// Taps and reschedules go through one queue (notify.ts alertQueue), so they never interleave.
const queue = alertQueue()

/** A tap on a bell or on the reminder switch. */
export function applyNativeAlerts(next: PushPrefs, place: Place | null, lang: string): Promise<ApplyResult> {
  return queue.tap(() => applyLocal(LocalNotifications, next, ctxOf(place, lang), (p) => savePushPrefs(p as PushPrefs)))
}

/** Plan the alerts again from the saved choice, place and settings (launch, return to the foreground, a change),
 *  read when its turn in the queue comes. Calls that arrive while one is waiting are folded into it. */
export function rescheduleAlerts(lang: string): Promise<number> {
  return queue.reschedule(() => reschedule(LocalNotifications, loadPushPrefs(), ctxOf(savedPlace(), lang)).catch(() => 0))
}

/** Where a tapped alert leads (the url pushMessage gave it: the prayer times, or the reader for the portion). */
export function onAlertTap(go: (path: string) => void) {
  const h = LocalNotifications.addListener('localNotificationActionPerformed', (a) => {
    const url = (a.notification.extra as { url?: unknown } | undefined)?.url
    if (typeof url === 'string' && url.startsWith('/')) go(url)
  })
  return () => void h.then((x) => x.remove())
}

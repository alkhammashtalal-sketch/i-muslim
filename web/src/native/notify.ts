// The app's bells and portion reminder (reply 0033 §ب3) through @capacitor/local-notifications: the plan of
// web/src/native/bells.ts handed to the system, which rings them with the app closed. Nothing leaves the device.
//
// - Permission is asked only from the user's tap on a bell or on the reminder switch (applyLocal). A reschedule (at
//   launch, on return to the foreground, after a change of place, method or language) never asks: without the
//   permission it schedules nothing (since plugin 8.3 schedule() itself would ask, so it is not called).
// - Every reschedule replaces the whole set: what is pending is cancelled, the new plan is scheduled. All the app's
//   notifications are these alerts, so «pending» is only ours.
// - Android (deferred by reply 0034, the code stays common): POST_NOTIFICATIONS is the same requestPermissions() call
//   on Android 13+. Exact time on Android 12+ needs «Alarms & reminders» (SCHEDULE_EXACT_ALARM), which the user grants
//   in the system settings; the app never opens that screen by itself. Each alert asks for exactness only when that
//   grant is already there (isExactNotification), otherwise it is an inexact alarm allowed while idle (allowWhileIdle).
//   The plugin's own default (exact, opening the settings screen at every schedule()) is never used.
import type { LocalNotificationsPlugin } from '@capacitor/local-notifications'
import type { Place } from '../daily/location'
import type { AsrSchool, Method } from '../daily/prayer'
import { planAlerts, type PlannedAlert } from './bells'

export type NotifyApi = Pick<LocalNotificationsPlugin, 'checkPermissions' | 'requestPermissions' | 'getPending' | 'cancel' | 'schedule' | 'checkExactNotificationSetting'>
export type AlertPrefs = { bells: string[]; ward: boolean }
export type AlertContext = { place: Place | null; method: Method; asr: AsrSchool; lang: string; platform: 'ios' | 'android' | 'web' }
export type ApplyResult = 'ok' | 'denied' | 'no_place' | 'error'

const anyOn = (p: AlertPrefs) => p.bells.length > 0 || p.ward

async function cancelAll(api: NotifyApi) {
  const { notifications } = await api.getPending()
  if (notifications.length) await api.cancel({ notifications: notifications.map((n) => ({ id: n.id })) })
}

/** Android 12+ only: whether the user has already allowed exact alarms (never asks). */
async function exactAllowed(api: NotifyApi, platform: AlertContext['platform']) {
  if (platform !== 'android') return false
  try {
    return (await api.checkExactNotificationSetting()).exact_alarm === 'granted'
  } catch {
    return false
  }
}

/** Android draws a notification's status-bar icon in one colour from its shape: the app's own (the disc with «مسلم» cut
 *  out, web/scripts/android-assets.mjs), tinted with the icon's ground (reply 0066). iOS shows the app icon itself. */
const ANDROID_ICON = { smallIcon: 'ic_stat_muslim', iconColor: '#1E3A6B' }

/** The plugin's notification for one planned alert. */
export const toNotification = (a: PlannedAlert, exact: boolean, platform?: AlertContext['platform']) => ({
  id: a.id,
  title: a.title,
  body: a.body,
  schedule: { at: new Date(a.at), allowWhileIdle: true },
  isExactNotification: exact,
  extra: { url: a.url, kind: a.kind },
  ...(platform === 'android' ? ANDROID_ICON : {}),
})

/**
 * Put the system's pending alerts in line with the choice: nothing when everything is off, when no place is set, or
 * when the permission is not granted; otherwise the next 64 at most. Returns how many are pending now.
 */
export async function reschedule(api: NotifyApi, prefs: AlertPrefs, ctx: AlertContext, now = new Date()): Promise<number> {
  if (!anyOn(prefs) || !ctx.place || (await api.checkPermissions()).display !== 'granted') {
    await cancelAll(api)
    return 0
  }
  const plan = planAlerts({ place: ctx.place, bells: prefs.bells, ward: prefs.ward, method: ctx.method, asr: ctx.asr, lang: ctx.lang, now })
  const exact = await exactAllowed(api, ctx.platform)
  await cancelAll(api)
  if (plan.length) await api.schedule({ notifications: plan.map((a) => toNotification(a, exact, ctx.platform)) })
  return plan.length
}

/**
 * The user's tap on a bell or on the reminder switch: ask for the permission when something is being turned on,
 * then reschedule. `save` keeps the new choice on the device once it holds.
 */
export async function applyLocal(api: NotifyApi, next: AlertPrefs, ctx: AlertContext, save: (p: AlertPrefs) => void): Promise<ApplyResult> {
  try {
    if (!anyOn(next)) {
      save(next)
      await reschedule(api, next, ctx)
      return 'ok'
    }
    if (!ctx.place) return 'no_place'
    let perm = (await api.checkPermissions()).display
    if (perm !== 'granted' && perm !== 'denied') perm = (await api.requestPermissions()).display
    if (perm !== 'granted') return 'denied'
    save(next)
    await reschedule(api, next, ctx)
    return 'ok'
  } catch {
    return 'error'
  }
}

/**
 * One line for every change to the system's pending alerts. A tap and a reschedule (launch, return to the foreground, a
 * new place) each run getPending → cancel → schedule; they run one after the other, never interleaved, so a reschedule
 * that started before a tap cannot leave the alerts the tap removed. A reschedule reads the saved choice when its turn
 * comes (its function is called then), and the reschedules asked while one is waiting, with no tap between, are folded
 * into it, with the latest function.
 */
export function alertQueue() {
  let tail: Promise<unknown> = Promise.resolve()
  const run = <T>(f: () => Promise<T>): Promise<T> => {
    const p = tail.then(f, f)
    tail = p.catch(() => undefined)
    return p
  }
  // The reschedule waiting for its turn, if any: later asks fold into it until it starts or a tap is queued.
  let slot: { fn: () => Promise<number>; p?: Promise<number> } | null = null
  return {
    tap(f: () => Promise<ApplyResult>): Promise<ApplyResult> {
      slot = null // a reschedule asked after the tap runs after it
      return run(f)
    },
    reschedule(f: () => Promise<number>): Promise<number> {
      if (slot?.p) {
        slot.fn = f
        return slot.p
      }
      const mine: { fn: () => Promise<number>; p?: Promise<number> } = { fn: f }
      mine.p = run(() => {
        if (slot === mine) slot = null
        return mine.fn()
      })
      slot = mine
      return mine.p
    },
  }
}

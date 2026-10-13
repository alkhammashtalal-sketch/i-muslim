// Prayer bells and the daily-portion reminder on this device (reply 0032 part E). The device sends the push
// subscription, a 0.1° cell (about 11 km: never its position), its time zone, the calculation settings, the enabled
// bells, the reminder choice and the interface language; turning everything off deletes the server's row.
// In the iOS/Android app (reply 0033 §ب3) the same bells and reminder are local notifications computed on the device
// (web/src/native/notify.ts): alertsAvailable() and applyAlerts() choose the path, and nothing is sent there.
import type { Place } from '../../daily/location'
import { isNative } from '../../native/platform'
import { api } from '../../api/base'

export type Bell = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
export type PushPrefs = { bells: Bell[]; ward: boolean }
const KEY = 'muslim.push.v1'

export function loadPushPrefs(): PushPrefs {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<PushPrefs>
    return { bells: Array.isArray(p.bells) ? p.bells : [], ward: p.ward === true }
  } catch {
    return { bells: [], ward: false }
  }
}
export function savePushPrefs(p: PushPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {}
}

// Never in the iOS/Android app (reply 0033 §ب2): its bells are local notifications, behind the same isNative() switch.
export const pushSupported = () => !isNative() && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
/** iOS delivers web push only to the app added to the home screen (iOS 16.4 and later). Never said inside the iOS app,
 *  whose web view looks like Safari on an iPhone but whose bells are local notifications. */
export const iosNeedsHomeScreen = () =>
  !isNative() &&
  /iP(hone|ad|od)/.test(navigator.userAgent) && !(navigator as Navigator & { standalone?: boolean }).standalone && !matchMedia('(display-mode: standalone)').matches

let keyMemo: Promise<string | null> | null = null
/** The server's public key, or null while bells are not configured (then the interface shows no bell). */
export function pushKey(): Promise<string | null> {
  keyMemo ??= fetch(api('/api/push/key'))
    .then(async (r) => (r.ok ? ((await r.json()) as { publicKey: string }).publicKey : null))
    .catch(() => null)
  return keyMemo
}

const b64 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0))
export const cellOf = (p: { lat: number; lng: number }) => ({ lat: Math.round(p.lat * 10) / 10, lng: Math.round(p.lng * 10) / 10 })

/** Apply the new choice: subscribe (asking permission, from a tap) and send the settings, or remove everything. */
export async function applyPush(
  next: PushPrefs,
  ctx: { place: Place | null; method: string; asr: string; lang: string },
): Promise<'ok' | 'denied' | 'unsupported' | 'no_place' | 'error'> {
  const reg = pushSupported() ? await navigator.serviceWorker.ready : null
  const existing = await reg?.pushManager.getSubscription()
  if (!next.bells.length && !next.ward) {
    if (existing) {
      await fetch(api('/api/push/unsubscribe'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ endpoint: existing.endpoint }) }).catch(() => {})
      await existing.unsubscribe().catch(() => {})
    }
    savePushPrefs(next)
    return 'ok'
  }
  if (!reg) return 'unsupported'
  if (!ctx.place) return 'no_place'
  const key = await pushKey()
  if (!key) return 'unsupported'
  if ((await Notification.requestPermission()) !== 'granted') return 'denied'
  const sub = existing ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) }))
  const body = {
    subscription: sub.toJSON(),
    cell: cellOf(ctx.place),
    tz: ctx.place.timeZone,
    method: ctx.method,
    asr: ctx.asr,
    prayers: next.bells,
    ward: next.ward ? 'after_isha' : null,
    lang: ctx.lang,
  }
  const r = await fetch(api('/api/push/subscribe'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null)
  if (!r?.ok) return 'error'
  savePushPrefs(next)
  return 'ok'
}

/** Whether the bells and the reminder can be offered here: always in the app (local notifications); on the web only
 *  with Web Push in this browser and the server's key. */
export function alertsAvailable(): Promise<boolean> {
  if (isNative()) return Promise.resolve(true)
  return pushSupported() ? pushKey().then(Boolean) : Promise.resolve(false)
}

/** A tap on a bell or on the reminder switch: local notifications in the app, Web Push in the browser. */
export async function applyAlerts(
  next: PushPrefs,
  ctx: { place: Place | null; method: string; asr: string; lang: string },
): Promise<'ok' | 'denied' | 'unsupported' | 'no_place' | 'error'> {
  if (!isNative()) return applyPush(next, ctx)
  const { applyNativeAlerts } = await import('../../native/device')
  return applyNativeAlerts(next, ctx.place, ctx.lang)
}

/** After a change of place or calculation settings: the app plans its local alerts again (the web's server row keeps
 *  the settings it was sent with, as before). */
export function alertsChanged(lang: string) {
  if (isNative()) void import('../../native/device').then((d) => d.rescheduleAlerts(lang))
}

/** The note under refused bells: the app's own setting on iOS/Android, the site's in a browser. */
export const deniedIn = (): 'app' | 'site' => (isNative() ? 'app' : 'site')

// Prayer bells and the daily-portion reminder on this device (reply 0032 part E). The device sends the push
// subscription, a 0.1° cell (about 11 km: never its position), its time zone, the calculation settings, the enabled
// bells, the reminder choice and the interface language; turning everything off deletes the server's row.
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
function savePushPrefs(p: PushPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {}
}

// Never in the iOS/Android app (reply 0033 §ب2): its bells are local notifications, behind the same isNative() switch.
export const pushSupported = () => !isNative() && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
/** iOS delivers web push only to the app added to the home screen (iOS 16.4 and later). */
export const iosNeedsHomeScreen = () =>
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

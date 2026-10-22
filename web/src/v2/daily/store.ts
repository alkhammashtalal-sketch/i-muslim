// What the daily screens keep on the device (localStorage, wrapped: private modes may refuse it). Nothing is sent.
import { API_BASE, api } from '../../api/base'
import { savedPlace, type Place } from '../../daily/location'
import { autoMethod } from '../../daily/method-auto'
import { METHODS, type AsrSchool, type Method } from '../../daily/prayer'

const get = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key)
    return v == null ? fallback : (JSON.parse(v) as T)
  } catch {
    return fallback
  }
}
const set = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    // storage unavailable: the choice lives for this visit only
  }
}

/** The method as the user chose it: «تلقائي حسب البلد» (add-on 0071-add13 §1) or one of the twelve by hand. */
export type MethodChoice = Method | 'auto'
/** `method` is the one the times use: the chosen one, or for 'auto' the place's country's (web/src/daily/method-auto.ts). */
export type PrayerPrefs = { choice: MethodChoice; method: Method; asr: AsrSchool }
const PRAYER_KEY = 'muslim.prayer.v1'

/** The method the times use for a choice at a place. */
export const methodOf = (choice: MethodChoice, place: Place | null): Method => (choice === 'auto' ? autoMethod(place) : choice)

/** Stored as before ({ method, asr }), with 'auto' as a value of `method`. Nothing stored means 'auto'; a method
 *  stored by an earlier version was picked in the sheet (or saved with the Asr school), and stays as it is. */
export function loadPrayerPrefs(place: Place | null = savedPlace()): PrayerPrefs {
  const p = get<{ method?: unknown; asr?: unknown }>(PRAYER_KEY, {})
  const choice: MethodChoice = typeof p.method === 'string' && (METHODS as readonly string[]).includes(p.method) ? (p.method as Method) : 'auto'
  return { choice, method: methodOf(choice, place), asr: p.asr === 'hanafi' ? 'hanafi' : 'shafi' }
}
export const savePrayerPrefs = (p: Pick<PrayerPrefs, 'choice' | 'asr'>) => {
  set(PRAYER_KEY, { method: p.choice, asr: p.asr })
  // The iOS widgets' times follow the calculation (reply 0046).
  window.dispatchEvent(new Event('muslim:widgets'))
}

const OFFSET_KEY = 'muslim.hijri.offset.v1'
export const loadHijriOffset = () => Math.max(-2, Math.min(2, Math.trunc(get<number>(OFFSET_KEY, 0)) || 0))
export const saveHijriOffset = (n: number) => set(OFFSET_KEY, Math.max(-2, Math.min(2, Math.trunc(n))))

/** The global Hijri offset from our server's config file (public/config/hijri.json, set after the Supreme Court's
 *  announcement); 0 when it cannot be read. The web reads the static file; the iOS/Android app reads the server's
 *  through /api/config/hijri with the connection, and the copy inside the app without it (reply 0037 §3.4). */
export const hijriHref = () => (API_BASE ? api('/api/config/hijri') : '/config/hijri.json')
let globalOffset: Promise<number> | null = null
export function loadGlobalOffset(): Promise<number> {
  globalOffset ??= fetch(hijriHref())
    .then((r) => (r.ok ? r.json() : { offset: 0 }))
    .then((j: { offset?: number }) => Math.max(-2, Math.min(2, Math.trunc(Number(j.offset)) || 0)))
    .catch(() => 0)
  return globalOffset
}

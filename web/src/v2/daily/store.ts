// What the daily screens keep on the device (localStorage, wrapped: private modes may refuse it). Nothing is sent.
import { API_BASE, api } from '../../api/base'
import { savedPlace, type Place } from '../../daily/location'
import { autoRule, type Adjust } from '../../daily/method-auto'
import { METHODS, type AsrSchool, type Method } from '../../daily/prayer'
import { deviceStorage } from '../../storage/device'

const get = <T,>(key: string, fallback: T): T => {
  try {
    const v = deviceStorage.getItem(key)
    return v == null ? fallback : (JSON.parse(v) as T)
  } catch {
    return fallback
  }
}
const set = (key: string, v: unknown) => {
  try {
    deviceStorage.setItem(key, JSON.stringify(v))
  } catch {
    // storage unavailable: the choice lives for this visit only
  }
}

/** The method as the user chose it: «تلقائي حسب البلد» (add-on 0071-add13 §1) or one of the twelve by hand. */
export type MethodChoice = Method | 'auto'
/** The Asr school as the user chose it: by default the one the country's table prints (add-on 0071-add15 §1.2). */
export type AsrChoice = AsrSchool | 'auto'
export type PrayerChoices = { choice: MethodChoice; asrChoice: AsrChoice }
/** What the times use: the chosen method or the country's, the chosen Asr or the country's, and the country's
 *  precaution minutes when the method is the country's own (web/src/daily/method-auto.ts). */
export type PrayerPrefs = PrayerChoices & { method: Method; asr: AsrSchool; adjust: Adjust }
const PRAYER_KEY = 'muslim.prayer.v1'
/** The stored shape's version: 2 since «تلقائي» (add-on 0071-add15 §1); without it, a record of 1.0. */
const PRAYER_V = 2

/** The times' settings for choices at a place. */
export function resolvePrayer(c: PrayerChoices, place: Place | null): PrayerPrefs {
  const rule = autoRule(place)
  return {
    choice: c.choice,
    asrChoice: c.asrChoice,
    method: c.choice === 'auto' ? rule.method : c.choice,
    asr: c.asrChoice === 'auto' ? (rule.asr ?? 'shafi') : c.asrChoice,
    adjust: c.choice === 'auto' ? { ...rule.adjust } : {},
  }
}

/** The options dayTimes takes, from resolved settings. */
export const prayerOptions = (p: Pick<PrayerPrefs, 'method' | 'asr' | 'adjust'>) => ({ method: p.method, asr: p.asr, adjust: p.adjust })

const isMethod = (m: unknown): m is Method => typeof m === 'string' && (METHODS as readonly string[]).includes(m)

/** The stored choices. Nothing stored: automatic. A record of 1.0 ({ method, asr }, written when the sheet was used):
 *  its Umm al-Qura is automatic, since 1.0 had nothing else (add-on 0071-add15 §1.1); another method stays chosen;
 *  its Hanafi Asr was chosen by hand and stays, while its majority Asr was 1.0's default and becomes the country's. */
export function loadPrayerChoices(): PrayerChoices {
  const p = get<{ v?: unknown; method?: unknown; asr?: unknown } | null>(PRAYER_KEY, null) ?? {}
  if (p.v === PRAYER_V)
    return { choice: isMethod(p.method) ? p.method : 'auto', asrChoice: p.asr === 'hanafi' || p.asr === 'shafi' ? p.asr : 'auto' }
  return { choice: isMethod(p.method) && p.method !== 'UmmAlQura' ? p.method : 'auto', asrChoice: p.asr === 'hanafi' ? 'hanafi' : 'auto' }
}

/** The settings the times use at a place (by default the saved one). */
export const loadPrayerPrefs = (place: Place | null = savedPlace()): PrayerPrefs => resolvePrayer(loadPrayerChoices(), place)

export const savePrayerPrefs = (c: PrayerChoices) => {
  set(PRAYER_KEY, { v: PRAYER_V, method: c.choice, asr: c.asrChoice })
  // The iOS widgets' times follow the calculation (reply 0046).
  window.dispatchEvent(new Event('muslim:widgets'))
}

const OFFSET_KEY = 'muslim.hijri.offset.v1'
export const loadHijriOffset = () => Math.max(-2, Math.min(2, Math.trunc(get<number>(OFFSET_KEY, 0)) || 0))
export const saveHijriOffset = (n: number) => {
  set(OFFSET_KEY, Math.max(-2, Math.min(2, Math.trunc(n))))
  // The widgets' Hijri date takes the same offset (native/widget-data.ts): write their file again now, not only when
  // the app next comes to the front (add-on 0072-add23 §4.6).
  window.dispatchEvent(new Event('muslim:widgets'))
}

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

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
/** The user's own minutes per prayer (add-on 0072-add69 §3): to follow a mosque's or a local table, by their hand,
 *  never a guess of ours (add-on 0071-add17 §1). Added to whatever the method and the country give. */
export type MyMinutes = Partial<Record<'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', number>>
/** Each prayer's own minutes, at most this many either way: a mosque's table, not another method; and with the
 *  country's few minutes still within the 30 the server keeps for the web's bells (worker/src/push/routes.ts). */
export const MY_MINUTES_MAX = 15
export const MY_PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
export type PrayerChoices = { choice: MethodChoice; asrChoice: AsrChoice; mine?: MyMinutes }
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
    adjust: withMine(c.choice === 'auto' ? { ...rule.adjust } : {}, c.mine),
  }
}

/** The country's minutes (or none) and the user's own, added prayer by prayer; a prayer at 0 is left out. */
function withMine(base: Adjust, mine: MyMinutes | undefined): Adjust {
  const out: Adjust = { ...base }
  for (const k of MY_PRAYERS) {
    const n = (out[k] ?? 0) + (mine?.[k] ?? 0)
    if (n) out[k] = n
    else delete out[k]
  }
  return out
}

/** Whole minutes within ±MY_MINUTES_MAX, the five prayers only; anything else is dropped. */
export function cleanMine(x: unknown): MyMinutes {
  const out: MyMinutes = {}
  if (!x || typeof x !== 'object') return out
  for (const k of MY_PRAYERS) {
    const v = (x as Record<string, unknown>)[k]
    if (typeof v === 'number' && Number.isFinite(v)) {
      const n = Math.max(-MY_MINUTES_MAX, Math.min(MY_MINUTES_MAX, Math.trunc(v)))
      if (n) out[k] = n
    }
  }
  return out
}
const MINE_KEY = 'muslim.prayer.minutes.v1'

/** The options dayTimes takes, from resolved settings. */
export const prayerOptions = (p: Pick<PrayerPrefs, 'method' | 'asr' | 'adjust'>) => ({ method: p.method, asr: p.asr, adjust: p.adjust })

const isMethod = (m: unknown): m is Method => typeof m === 'string' && (METHODS as readonly string[]).includes(m)

/** The stored choices. Nothing stored: automatic. A record of 1.0 ({ method, asr }, written when the sheet was used):
 *  its Umm al-Qura is automatic, since 1.0 had nothing else (add-on 0071-add15 §1.1); another method stays chosen;
 *  its Hanafi Asr was chosen by hand and stays, while its majority Asr was 1.0's default and becomes the country's. */
export function loadPrayerChoices(): PrayerChoices {
  const p = get<{ v?: unknown; method?: unknown; asr?: unknown } | null>(PRAYER_KEY, null) ?? {}
  // The user's own minutes in a key of their own, so the record above stays as 1.0 and 1.1 wrote it.
  const mine = cleanMine(get<unknown>(MINE_KEY, null))
  const withM = (c: PrayerChoices): PrayerChoices => (Object.keys(mine).length ? { ...c, mine } : c)
  if (p.v === PRAYER_V)
    return withM({ choice: isMethod(p.method) ? p.method : 'auto', asrChoice: p.asr === 'hanafi' || p.asr === 'shafi' ? p.asr : 'auto' })
  return withM({ choice: isMethod(p.method) && p.method !== 'UmmAlQura' ? p.method : 'auto', asrChoice: p.asr === 'hanafi' ? 'hanafi' : 'auto' })
}

/** The settings the times use at a place (by default the saved one). */
export const loadPrayerPrefs = (place: Place | null = savedPlace()): PrayerPrefs => resolvePrayer(loadPrayerChoices(), place)

export const savePrayerPrefs = (c: PrayerChoices) => {
  set(PRAYER_KEY, { v: PRAYER_V, method: c.choice, asr: c.asrChoice })
  // Only when given: a caller that passes no minutes leaves the user's as they are; {} sets them back to the calculation.
  if (c.mine !== undefined) set(MINE_KEY, cleanMine(c.mine))
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
  // …and the app plans its reminders of al-ayyam al-bid again on the new date (add-on 0072-add30 §5, NativeDevice.tsx).
  window.dispatchEvent(new Event('muslim:hijri'))
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

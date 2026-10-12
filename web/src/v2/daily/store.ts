// What the daily screens keep on the device (localStorage, wrapped: private modes may refuse it). Nothing is sent.
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

export type PrayerPrefs = { method: Method; asr: AsrSchool }
const PRAYER_KEY = 'muslim.prayer.v1'
export function loadPrayerPrefs(): PrayerPrefs {
  const p = get<Partial<PrayerPrefs>>(PRAYER_KEY, {})
  return {
    method: (METHODS as readonly string[]).includes(p.method ?? '') ? (p.method as Method) : 'UmmAlQura',
    asr: p.asr === 'hanafi' ? 'hanafi' : 'shafi',
  }
}
export const savePrayerPrefs = (p: PrayerPrefs) => set(PRAYER_KEY, p)

const OFFSET_KEY = 'muslim.hijri.offset.v1'
export const loadHijriOffset = () => Math.max(-2, Math.min(2, Math.trunc(get<number>(OFFSET_KEY, 0)) || 0))
export const saveHijriOffset = (n: number) => set(OFFSET_KEY, Math.max(-2, Math.min(2, Math.trunc(n))))

/** The global Hijri offset from our server's config file (public/config/hijri.json, set after the Supreme Court's
 *  announcement); 0 when it cannot be read. */
let globalOffset: Promise<number> | null = null
export function loadGlobalOffset(): Promise<number> {
  globalOffset ??= fetch('/config/hijri.json')
    .then((r) => (r.ok ? r.json() : { offset: 0 }))
    .then((j: { offset?: number }) => Math.max(-2, Math.min(2, Math.trunc(Number(j.offset)) || 0)))
    .catch(() => 0)
  return globalOffset
}

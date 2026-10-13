// The prayer bells and the daily-portion reminder as LOCAL notifications in the iOS/Android app (reply 0033 §ب3).
// Computed on the device with the engine the web app uses (web/src/daily/prayer.ts, adhan 4.4.4) for the saved place,
// method and Asr school; the portion's reminder «كل يوم بعد العشاء بنصف ساعة» is Isha + 30 minutes, as the Worker's
// Web Push does (worker/src/push/schedule.ts, AFTER_ISHA_MS). Nothing is sent to any server.
//
// iOS keeps at most 64 pending notifications per app (it silently drops the rest), so the plan is the next 64 at most,
// in time order: with all six bells and the reminder that is nine days, with one bell two months (PLAN_DAYS caps it).
// The app plans again at every launch and every return to the foreground (web/src/native/NativeDevice.tsx), so the
// window keeps moving while the app is used. This file is pure (no Capacitor): worker/test/native-device.test.ts.
import { dayTimes, type AsrSchool, type LatLng, type Method, type Ymd, ymdIn } from '../daily/prayer'
import { pushMessage } from '../daily/notify-text'

export type BellKind = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
export type AlertKind = BellKind | 'ward'
/** The order of a day's alerts, also each kind's slot in the notification id. */
export const KINDS: readonly AlertKind[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'ward']

/** iOS: «an app can have only the last 64 scheduled local notifications» (UNUserNotificationCenter). */
export const IOS_PENDING_LIMIT = 64
/** However few alerts are on, plan no further than this many days ahead. */
export const PLAN_DAYS = 60
/** The reminder after Isha (board WardAfter, reply 0031-add16 §7): the same 30 minutes as the Worker. */
export const AFTER_ISHA_MS = 30 * 60_000
const DAY_MS = 86_400_000

export type PlanInput = {
  place: LatLng & { timeZone: string }
  bells: readonly string[]
  ward: boolean
  method: Method
  asr: AsrSchool
  /** The interface language of the texts (one of the ten; any other falls back to Arabic, as pushMessage does). */
  lang: string
  now: Date
  limit?: number
  days?: number
}

export type PlannedAlert = { id: number; at: number; kind: AlertKind; title: string; body: string; url: string }

/** Days since 1970-01-01 of a civil date (no time zone involved). */
const dayNumber = (d: Ymd) => Math.round(Date.UTC(d.y, d.m - 1, d.d) / DAY_MS)
/** The civil date `k` days after `d`, by the calendar (never by adding 24 hours, which a DST change can skip). */
export const addDays = (d: Ymd, k: number): Ymd => {
  const t = new Date(Date.UTC(d.y, d.m - 1, d.d + k))
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}
/** A stable id for one alert of one civil day: the same alert keeps its id from one plan to the next (fits in 32 bits). */
export const alertId = (day: Ymd, kind: AlertKind) => dayNumber(day) * 8 + KINDS.indexOf(kind) + 1

/** The next alerts after `now`, at most `limit` (64), in time order. */
export function planAlerts(input: PlanInput): PlannedAlert[] {
  const limit = Math.max(0, Math.min(input.limit ?? IOS_PENDING_LIMIT, IOS_PENDING_LIMIT))
  const days = Math.max(1, Math.min(input.days ?? PLAN_DAYS, PLAN_DAYS))
  const on = new Set(KINDS.filter((k) => k !== 'ward' && input.bells.includes(k)))
  if (input.ward) on.add('ward')
  if (!on.size || !limit) return []
  const now = input.now.getTime()
  const out: PlannedAlert[] = []
  // From yesterday (an Isha + 30 minutes may fall after midnight) until the limit is passed by whole days.
  const today = ymdIn(input.now, input.place.timeZone)
  for (let k = -1; k < days; k++) {
    const day = addDays(today, k)
    const t = dayTimes(input.place, day, { method: input.method, asr: input.asr })
    for (const kind of KINDS) {
      if (!on.has(kind)) continue
      const at = kind === 'ward' ? t.isha.getTime() + AFTER_ISHA_MS : t[kind].getTime()
      if (at <= now) continue
      const m = pushMessage(input.lang, kind)
      out.push({ id: alertId(day, kind), at, kind, title: m.title, body: m.body, url: m.url })
    }
    // Every alert of a later day comes after all of this one's (a day is a day later), so once the limit is reached
    // with a whole day planned, nothing later can enter the first `limit`.
    if (out.length >= limit) break
  }
  return out.sort((a, b) => a.at - b.at).slice(0, limit)
}

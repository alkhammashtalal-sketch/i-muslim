// The prayer bells and the daily-portion reminder as LOCAL notifications in the iOS/Android app (reply 0033 §ب3).
// Computed on the device with the engine the web app uses (web/src/daily/prayer.ts, adhan 4.4.4) for the saved place,
// method and Asr school; the portion's reminder «كل يوم بعد العشاء بنصف ساعة» is Isha + 30 minutes, as the Worker's
// Web Push does (worker/src/push/schedule.ts, AFTER_ISHA_MS). Nothing is sent to any server.
//
// iOS keeps at most 64 pending notifications per app (it silently drops the rest), so the plan is the next 64 at most,
// in time order: with all six bells and the reminder that is nine days, with one bell two months (PLAN_DAYS caps it).
// The morning and evening adhkar reminders (add-on 0072-add18 §2) share the same 64: with everything on, seven days.
// So do the optional reminders of add-on 0072-add30 §5 (reminders.ts): the days planned follow what is on, as before.
// The app plans again at every launch and every return to the foreground (web/src/native/NativeDevice.tsx), so the
// window keeps moving while the app is used. This file is pure (no Capacitor): worker/test/native-device.test.ts.
import { dayTimes, type AsrSchool, type LatLng, type Method, type PrayerOptions, type Ymd, ymdIn } from '../daily/prayer'
import { pushMessage } from '../daily/notify-text'
import { anyExtraOn, REMINDER_KINDS, remindersOfDay, type ExtraReminders, type ReminderHadiths, type ReminderKind } from './reminders'

export type BellKind = 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
export type AdhkarKind = 'adhkarMorning' | 'adhkarEvening'
export type AlertKind = BellKind | 'ward' | AdhkarKind | ReminderKind
/** The order of a day's bells and the portion reminder. */
export const KINDS: readonly AlertKind[] = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha', 'ward']
/** Every kind, also each kind's slot in the notification id: the bells, the portion, then the morning and evening
 *  adhkar reminders (add-on 0072-add18 §2), then the optional reminders of add-on 0072-add30 §5 (reminders.ts: Friday,
 *  al-ayyam al-bid, Monday and Thursday, the Name of the day). 13 kinds, within the id's 16 slots a day. */
export const ALL_KINDS: readonly AlertKind[] = [...KINDS, 'adhkarMorning', 'adhkarEvening', ...REMINDER_KINDS]
/** The adhkar reminders: off by default, a quarter of an hour after sunrise and after Asr, the minutes adjustable. */
export type AdhkarReminders = { morning: boolean; evening: boolean; morningMin: number; eveningMin: number }
export const ADHKAR_DEFAULTS: AdhkarReminders = { morning: false, evening: false, morningMin: 15, eveningMin: 15 }
/** The minutes the settings offer after sunrise and after Asr. */
export const ADHKAR_MINUTES = [5, 15, 30, 45, 60] as const
export const adhkarMinutes = (n: unknown, fallback = 15) => (ADHKAR_MINUTES as readonly number[]).includes(n as number) ? (n as number) : fallback

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
  /** The morning and evening adhkar reminders (add-on 0072-add18 §2); none when absent. */
  adhkar?: AdhkarReminders
  /** Their texts in the interface language (device.ts adhkarTexts); without them no adhkar reminder is planned. */
  adhkarTexts?: AdhkarTexts
  /** The optional reminders (add-on 0072-add30 §5, reminders.ts); none when absent. */
  extra?: ExtraReminders
  /** The Hijri offset of the calendar and the date card (the user's and the server's), for al-ayyam al-bid. */
  hijriOffset?: number
  /** Their hadiths in the text (reminders.ts REMINDER_HADITHS by default: none while REMINDER_VIRTUE is off). */
  reminderHadiths?: ReminderHadiths
  method: Method
  asr: AsrSchool
  /** The country's precaution minutes with «تلقائي حسب البلد» (add-on 0071-add15 §1.3), as the times screen. */
  adjust?: PrayerOptions['adjust']
  /** The interface language of the texts (one of the ten; any other falls back to Arabic, as pushMessage does). */
  lang: string
  now: Date
  limit?: number
  days?: number
}

export type PlannedAlert = { id: number; at: number; kind: AlertKind; title: string; body: string; url: string }
/** The adhkar reminders' texts (the widgets' own words, web/src/native/widget-strings.ts) and the page each opens. */
export type AdhkarTexts = { title: string; morning: string; evening: string; morningUrl: string; eveningUrl: string }

/** Days since 1970-01-01 of a civil date (no time zone involved). */
const dayNumber = (d: Ymd) => Math.round(Date.UTC(d.y, d.m - 1, d.d) / DAY_MS)
/** The civil date `k` days after `d`, by the calendar (never by adding 24 hours, which a DST change can skip). */
export const addDays = (d: Ymd, k: number): Ymd => {
  const t = new Date(Date.UTC(d.y, d.m - 1, d.d + k))
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}
/** A stable id for one alert of one civil day: the same alert keeps its id from one plan to the next (fits in 32 bits). */
export const alertId = (day: Ymd, kind: AlertKind) => dayNumber(day) * 16 + ALL_KINDS.indexOf(kind) + 1

/** The next alerts after `now`, at most `limit` (64), in time order. */
export function planAlerts(input: PlanInput): PlannedAlert[] {
  const limit = Math.max(0, Math.min(input.limit ?? IOS_PENDING_LIMIT, IOS_PENDING_LIMIT))
  const days = Math.max(1, Math.min(input.days ?? PLAN_DAYS, PLAN_DAYS))
  const on = new Set(KINDS.filter((k) => k !== 'ward' && input.bells.includes(k)))
  if (input.ward) on.add('ward')
  const ad = input.adhkar
  if (ad?.morning && input.adhkarTexts) on.add('adhkarMorning')
  if (ad?.evening && input.adhkarTexts) on.add('adhkarEvening')
  const ex = anyExtraOn(input.extra) ? input.extra : undefined
  if ((!on.size && !ex) || !limit) return []
  const now = input.now.getTime()
  const out: PlannedAlert[] = []
  // From yesterday (an Isha + 30 minutes may fall after midnight) until the limit is passed by whole days.
  const today = ymdIn(input.now, input.place.timeZone)
  for (let k = -1; k < days; k++) {
    const day = addDays(today, k)
    const t = dayTimes(input.place, day, { method: input.method, asr: input.asr, adjust: input.adjust })
    for (const kind of ALL_KINDS) {
      if (!on.has(kind)) continue
      const at =
        kind === 'ward'
          ? t.isha.getTime() + AFTER_ISHA_MS
          : kind === 'adhkarMorning'
            ? t.sunrise.getTime() + adhkarMinutes(ad?.morningMin) * 60_000
            : kind === 'adhkarEvening'
              ? t.asr.getTime() + adhkarMinutes(ad?.eveningMin) * 60_000
              : t[kind as BellKind].getTime()
      if (!Number.isFinite(at) || at <= now) continue
      if (kind === 'adhkarMorning' || kind === 'adhkarEvening') {
        const x = input.adhkarTexts!
        const m = kind === 'adhkarMorning'
        out.push({ id: alertId(day, kind), at, kind, title: x.title, body: m ? x.morning : x.evening, url: m ? x.morningUrl : x.eveningUrl })
        continue
      }
      const m = pushMessage(input.lang, kind)
      out.push({ id: alertId(day, kind), at, kind, title: m.title, body: m.body, url: m.url })
    }
    // The optional reminders of the day (each on its own days: Fridays, the evenings before a fast, every morning).
    if (ex) for (const r of remindersOfDay(day, t, ex, input.lang, input.hijriOffset ?? 0, input.reminderHadiths)) if (r.at > now) out.push({ id: alertId(day, r.kind), ...r })
    // Every alert of a later day comes after all of this one's (a day is a day later), so once the limit is reached
    // with a whole day planned, nothing later can enter the first `limit`.
    if (out.length >= limit) break
  }
  return out.sort((a, b) => a.at - b.at).slice(0, limit)
}

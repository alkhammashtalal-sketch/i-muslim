// «رمضان» (add-ons 0072-add26 §4 and 0072-add34 §ب8): the month's days by the Umm al-Qura calendar with the Hijri
// offset the calendar and the date card apply (the user's and the server's), the month's table from the app's own
// prayer times (web/src/daily/prayer.ts, the user's method, Asr and minutes), and the two countdowns. The end of suhoor
// is the Fajr adhan itself: there is no «imsak» minute before it (Ibn Baz 11916 under the table, data/fatwas.json).
// The page appears from 1 Sha'ban (a countdown to Ramadan) and is complete in Ramadan; before Sha'ban the home shows
// no card. Pure functions: worker/test/ramadan-0072.test.ts.
import { hijriParts } from '../../../daily/hijri'
import { dayTimes, ymdIn, type LatLng, type PrayerOptions, type Ymd } from '../../../daily/prayer'

const DAY = 86_400_000
/** Apple's limit for a Live Activity: active for up to eight hours (ActivityKit, «Displaying live data…»). */
export const LIVE_MAX_MS = 8 * 3600_000

export type Hijri = { day: number; month: number; year: number }
export type Phase = 'before' | 'shaban' | 'ramadan'

/** A civil day `n` days after `d`. */
export const addDays = (d: Ymd, n: number): Ymd => {
  const t = new Date(Date.UTC(d.y, d.m - 1, d.d) + n * DAY)
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}
const dayNumber = (d: Ymd) => Math.round(Date.UTC(d.y, d.m - 1, d.d) / DAY)
/** Whole days from `a` to `b`. */
export const daysBetween = (a: Ymd, b: Ymd) => dayNumber(b) - dayNumber(a)
export const sameDay = (a: Ymd, b: Ymd) => a.y === b.y && a.m === b.m && a.d === b.d

/** The Hijri date of a civil day, after the offset: the calendar is a table by civil date, so the day is read at its
 *  noon in UTC, whatever the place's time zone (null where the engine has no Umm al-Qura). */
export const hijriOf = (d: Ymd, offset = 0): Hijri | null => hijriParts(new Date(Date.UTC(d.y, d.m - 1, d.d, 12)), offset, 'UTC')

/** The Ramadan that is under way on `from`, or the next one: its Hijri year and its civil days in order (29 or 30). */
export function ramadanOf(from: Ymd, offset = 0): { year: number; days: Ymd[] } | null {
  const h = hijriOf(from, offset)
  if (!h) return null
  // Back to its first day when inside it; else forward to the next first of Ramadan (at most a year and a little).
  let d = from
  if (h.month === 9) d = addDays(from, 1 - h.day)
  else
    for (let i = 0; i < 400; i++) {
      const x = hijriOf(d, offset)
      if (x?.month === 9) break
      d = addDays(d, 1)
    }
  const first = hijriOf(d, offset)
  if (first?.month !== 9) return null
  const days: Ymd[] = []
  for (let i = 0; i < 31; i++) {
    const x = hijriOf(addDays(d, i), offset)
    if (x?.month !== 9) break
    days.push(addDays(d, i))
  }
  return { year: first.year, days }
}

export type RamadanState = {
  phase: Phase
  today: Ymd
  hijri: Hijri
  ramadan: { year: number; days: Ymd[] }
  /** In Ramadan: today's number in the month. */
  dayN?: number
  /** Before Ramadan: whole days until its first day. */
  daysLeft?: number
}

/** Where the year is for the page and the home's card: Sha'ban (the countdown), Ramadan, or before both. */
export function ramadanState(today: Ymd, offset = 0): RamadanState | null {
  const hijri = hijriOf(today, offset)
  const ramadan = ramadanOf(today, offset)
  if (!hijri || !ramadan) return null
  if (hijri.month === 9) return { phase: 'ramadan', today, hijri, ramadan, dayN: hijri.day }
  return { phase: hijri.month === 8 ? 'shaban' : 'before', today, hijri, ramadan, daysLeft: daysBetween(today, ramadan.days[0]) }
}

/** The home's card shows from 1 Sha'ban to the last day of Ramadan. */
export const cardShown = (s: RamadanState | null) => s?.phase === 'shaban' || s?.phase === 'ramadan'

export type TableRow = {
  n: number
  day: Ymd
  fajr: Date
  sunrise: Date
  dhuhr: Date
  asr: Date
  maghrib: Date
  isha: Date
  /** From the Fajr adhan to the Maghrib adhan. */
  fastMs: number
}

/** The month's table: each day's six times from the same engine and options as the times screen, with Umm al-Qura's
 *  Ramadan Isha on every day of the month as the calendar here counts it (the offset included). */
export function monthTable(at: LatLng, days: Ymd[], opts: PrayerOptions): TableRow[] {
  return days.map((day, i) => {
    const t = dayTimes(at, day, { ...opts, ramadan: true })
    return { n: i + 1, day, fajr: t.fajr, sunrise: t.sunrise, dhuhr: t.dhuhr, asr: t.asr, maghrib: t.maghrib, isha: t.isha, fastMs: t.maghrib.getTime() - t.fajr.getTime() }
  })
}

/** Hours and minutes, «١٢:٣١», in the interface's digits (rounded to the minute). */
export function hoursMinutes(ms: number, locale: string): string {
  const total = Math.round(ms / 60_000)
  const f = (n: number, w: number) => new Intl.NumberFormat(locale, { minimumIntegerDigits: w, useGrouping: false }).format(n)
  return `${f(Math.floor(total / 60), 1)}:${f(total % 60, 2)}`
}

export type Countdown = { kind: 'iftar' | 'suhoor'; at: Date }

/** In Ramadan, what the countdown counts to now: before today's Fajr the end of suhoor (the Fajr adhan); from Fajr to
 *  Maghrib the iftar; after Maghrib the next day's Fajr when that day is in Ramadan. Null outside the month, and after
 *  the last iftar. `days` are the month's civil days; `tz` the place's time zone. */
export function countdownAt(at: LatLng & { timeZone: string }, now: Date, days: Ymd[], opts: PrayerOptions): Countdown | null {
  const today = ymdIn(now, at.timeZone)
  const inMonth = (d: Ymd) => days.some((x) => sameDay(x, d))
  if (inMonth(today)) {
    const t = dayTimes(at, today, { ...opts, ramadan: true })
    if (now < t.fajr) return { kind: 'suhoor', at: t.fajr }
    if (now < t.maghrib) return { kind: 'iftar', at: t.maghrib }
  }
  const tomorrow = addDays(today, 1)
  // After today's Maghrib (on the eve of the first day too): tomorrow's suhoor ends at its Fajr.
  if (inMonth(tomorrow) && now >= dayTimes(at, today, opts).maghrib) return { kind: 'suhoor', at: dayTimes(at, tomorrow, { ...opts, ramadan: true }).fajr }
  return null
}

/** Whether a countdown can go on the Lock Screen now: Apple keeps a Live Activity for eight hours at most. */
export const liveFits = (c: Countdown, now: Date) => c.at.getTime() - now.getTime() > 60_000 && c.at.getTime() - now.getTime() <= LIVE_MAX_MS

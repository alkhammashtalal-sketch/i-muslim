// When the app may ask the system for a rating (add-on 0072-add26 §5), the pure part: no Capacitor, no clock of its
// own, tested in worker/test/review-0072.test.ts. The system's own sheet (iOS SKStoreReviewController / AppStore, the
// Android In-App Review API) is asked by review.ts; the system then decides whether it shows at all.
//
// The moments: a prayer lesson finished (its last step reached), a portion of the khatma marked read («وردي»), or the
// seventh day of use with five active days in the last seven. At most once in 120 days.
// Never: in the first run of the app or on the first day of use; around a prayer's time (from 10 minutes before each
// of the six bells to 40 minutes after: the adhan, the prayer, and the minutes right after its alert); within 30
// minutes of opening an alert; within 24 hours of an error or a wait in «اسأل». And no «قيّمنا» button anywhere.
// All of it on this device only: nothing is sent.

export const REVIEW_KEY = 'muslim.review.v1'
const DAY_MS = 86_400_000
export const REVIEW_CAP_MS = 120 * DAY_MS
export const ASK_TROUBLE_MS = 24 * 3_600_000
export const ALERT_TAP_MS = 30 * 60_000
export const PRAYER_BEFORE_MS = 10 * 60_000
export const PRAYER_AFTER_MS = 40 * 60_000
/** The 7/5 rule: a window of this many days ending today, with at least this many active days in it. */
export const USE_DAYS = 7
export const ACTIVE_DAYS = 5
/** How many active days are kept (only the last USE_DAYS are ever counted). */
const KEEP_DAYS = 14

export type Moment = 'lesson' | 'ward' | 'days'
/** Why the app does not ask now. */
export type Refusal = 'web' | 'firstRun' | 'firstDay' | 'cap' | 'prayer' | 'alert' | 'ask' | 'notYet'

export type ReviewState = {
  /** The first day of use on this device (local YYYY-MM-DD), from the first launch of the version with this file. */
  first: string | null
  /** The distinct days the app was opened, oldest first (local YYYY-MM-DD), the last KEEP_DAYS. */
  days: string[]
  /** When the system's sheet was last asked for (ms). */
  asked: number | null
  /** The last error or wait in «اسأل» (ms). */
  askTrouble: number | null
  /** The last alert opened (ms). */
  alertTap: number | null
}
export const EMPTY_REVIEW: ReviewState = { first: null, days: [], asked: null, askTrouble: null, alertTap: null }

export type ReviewContext = {
  now: number
  /** The device's local date of `now`, YYYY-MM-DD. */
  today: string
  /** The iOS or Android app (the web has no rating sheet). */
  native: boolean
  /** This launch is the app's first run (its welcome page not yet seen when it started). */
  firstRun: boolean
  /** The bells' times around now (ms): yesterday's, today's and tomorrow's six, or none without a place. */
  prayerTimes: readonly number[]
}

const isDay = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** A stored record as it may be (anything else: empty). */
export function parseReview(raw: string | null): ReviewState {
  try {
    const v = JSON.parse(raw ?? 'null') as Partial<Record<keyof ReviewState, unknown>> | null
    if (!v || typeof v !== 'object') return { ...EMPTY_REVIEW }
    const days = Array.isArray(v.days) ? [...new Set(v.days.filter(isDay))].sort().slice(-KEEP_DAYS) : []
    return { first: isDay(v.first) ? v.first : (days[0] ?? null), days, asked: num(v.asked), askTrouble: num(v.askTrouble), alertTap: num(v.alertTap) }
  } catch {
    return { ...EMPTY_REVIEW }
  }
}

/** The local date of a moment, YYYY-MM-DD. */
export const localDay = (at: Date) => `${at.getFullYear()}-${String(at.getMonth() + 1).padStart(2, '0')}-${String(at.getDate()).padStart(2, '0')}`
/** Days from `a` to `b` by the calendar (both YYYY-MM-DD). */
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS)

/** The app opened on `today`: the day counted once. */
export function noteDay(s: ReviewState, today: string): ReviewState {
  if (s.days.includes(today)) return s.first ? s : { ...s, first: today }
  const days = [...s.days, today].sort().slice(-KEEP_DAYS)
  return { ...s, first: s.first ?? today, days }
}

/** The 7/5 rule: used on seven days or more (the first day six days before today, or earlier), and opened on five of
 *  the last seven days, today included. */
export function sevenFive(s: ReviewState, today: string): boolean {
  if (!s.first || daysBetween(s.first, today) < USE_DAYS - 1) return false
  const recent = s.days.filter((d) => {
    const k = daysBetween(d, today)
    return k >= 0 && k < USE_DAYS
  })
  return recent.length >= ACTIVE_DAYS
}

/** Inside a prayer's window: from 10 minutes before a bell to 40 minutes after it. */
export const inPrayerWindow = (now: number, times: readonly number[]) => times.some((t) => now >= t - PRAYER_BEFORE_MS && now <= t + PRAYER_AFTER_MS)

/** Whether the app asks the system for a rating at this moment, and if not, why. The order is the order of the
 *  checks; every «never» comes before the moment's own condition. */
export function reviewDecision(s: ReviewState, moment: Moment, c: ReviewContext): { ask: true } | { ask: false; why: Refusal } {
  const no = (why: Refusal) => ({ ask: false as const, why })
  if (!c.native) return no('web')
  if (c.firstRun) return no('firstRun')
  if (!s.first || s.first >= c.today) return no('firstDay')
  if (s.asked != null && c.now - s.asked < REVIEW_CAP_MS) return no('cap')
  if (inPrayerWindow(c.now, c.prayerTimes)) return no('prayer')
  if (s.alertTap != null && c.now - s.alertTap >= 0 && c.now - s.alertTap < ALERT_TAP_MS) return no('alert')
  if (s.askTrouble != null && c.now - s.askTrouble >= 0 && c.now - s.askTrouble < ASK_TROUBLE_MS) return no('ask')
  if (moment === 'days' && !sevenFive(s, c.today)) return no('notYet')
  return { ask: true }
}

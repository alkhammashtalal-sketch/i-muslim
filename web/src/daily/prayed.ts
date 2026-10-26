// «صليت»: a gentle log of the five prayers (add-on 0071-add13 §5), on the device only, like the goals (./goals.ts).
// The user marks each prayer of the day; what is counted is the number of days on which all five were marked. Never a
// streak: a day not completed takes nothing away, and nothing is shown for it. Nothing is sent anywhere.
//
// The log's day runs from Fajr to Fajr when the place's Fajr is known, so Isha marked after midnight belongs to the
// day it was prayed for; without a place it runs from midnight to midnight on the device.
import { deviceStorage } from '../storage/device'

export const FIVE = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
export type Five = (typeof FIVE)[number]

/** `full`: the days (YYYY-MM-DD) on which all five were marked, sorted, without repeats. `day` and `prayed`: the
 *  current day's marks (only the current day is kept: an earlier day that was not completed is not stored).
 *  `hidden`: the user hid the card in «أهدافي»; the count is kept. */
export type PrayedLog = { full: string[]; day: string; prayed: Five[]; hidden?: boolean }

export const PRAYED_KEY = 'muslim.prayed.v1'
type Store = Pick<Storage, 'getItem' | 'setItem'>
const EMPTY: PrayedLog = { full: [], day: '', prayed: [] }
const isDay = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

export function loadPrayed(storage: Store | undefined = deviceStorage): PrayedLog {
  try {
    const v = JSON.parse(storage?.getItem(PRAYED_KEY) ?? 'null') as Partial<PrayedLog> | null
    if (!v || typeof v !== 'object') return EMPTY
    return {
      full: Array.isArray(v.full) ? [...new Set(v.full.filter(isDay))].sort() : [],
      day: isDay(v.day) ? v.day : '',
      prayed: Array.isArray(v.prayed) ? FIVE.filter((p) => v.prayed!.includes(p)) : [],
      ...(v.hidden === true ? { hidden: true } : {}),
    }
  } catch {
    return EMPTY
  }
}

export function savePrayed(log: PrayedLog, storage: Store | undefined = deviceStorage) {
  try {
    storage?.setItem(PRAYED_KEY, JSON.stringify(log))
  } catch {
    // storage unavailable: kept for this visit only
  }
}

/** The marks of `day`: the stored ones when the log is on that day, else none (a new day starts empty). */
export const marksOn = (log: PrayedLog, day: string): Five[] => (log.day === day ? log.prayed : [])

/** Mark one prayer of `day` as prayed or not. Completing the five adds the day to `full`; unmarking one of a
 *  completed day takes that day out again (the user corrected a mark), and nothing else ever leaves `full`. */
export function setPrayed(log: PrayedLog, day: string, prayer: Five, done: boolean): PrayedLog {
  const marks = new Set(marksOn(log, day))
  if (done) marks.add(prayer)
  else marks.delete(prayer)
  const prayed = FIVE.filter((p) => marks.has(p))
  const full = new Set(log.full)
  if (prayed.length === FIVE.length) full.add(day)
  else full.delete(day)
  return { ...log, full: [...full].sort(), day, prayed }
}

/** How many days all five were marked: no streaks, no reset. */
export const fullDays = (log: PrayedLog) => new Set(log.full).size

/** The log's day at `now`: the civil date in `timeZone` (the device's when absent), or the day before when `now` is
 *  before that date's Fajr (`fajrOf` gives it; absent when the place is not known). */
export function prayedDay(now: Date, timeZone?: string, fajrOf?: (ymd: { y: number; m: number; d: number }) => Date): string {
  const parts = (at: Date) => {
    const p = new Intl.DateTimeFormat('en-CA', { ...(timeZone ? { timeZone } : {}), year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at)
    const n = (t: string) => Number(p.find((x) => x.type === t)!.value)
    return { y: n('year'), m: n('month'), d: n('day') }
  }
  let ymd = parts(now)
  if (fajrOf && now < fajrOf(ymd)) {
    // The civil day before, by the calendar (not by subtracting 24 hours, which a clock change would upset).
    const prev = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d - 1))
    ymd = { y: prev.getUTCFullYear(), m: prev.getUTCMonth() + 1, d: prev.getUTCDate() }
  }
  return `${ymd.y}-${String(ymd.m).padStart(2, '0')}-${String(ymd.d).padStart(2, '0')}`
}

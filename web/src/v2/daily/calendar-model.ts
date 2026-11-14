// The calendar's month (reply 0032 D-4): Umm al-Qura days from Intl (web/src/daily/hijri.ts, the calendar named
// explicitly) after the user's and the global offsets, and the marked days of data/calendar-events.json (each with a
// sahih or hasan hadith, its grade shown as written, checked by worker/test/calendar-events.test.ts). Days left unmarked by decision stay unmarked.
import calendar from '../../../../data/calendar-events.json'
import { hijriParts } from '../../daily/hijri'

export type CalEvent = { key: string; name: string; hadith_id: string; when: { month?: number | 'each'; days?: string; weekdays?: string[]; night?: boolean }[] }
export const EVENTS = calendar.events as CalEvent[]
/** The days the coordinator decided are never marked (12 Rabi' I, 27 Rajab, 15 Sha'ban, 1 Muharram): no mark of any
 *  kind, even when a range covers them (Sha'ban's month, the white days on the 15th). */
const NOT_MARKED = new Set((calendar.not_marked.days as { month: number; day: number }[]).map((d) => `${d.month}-${d.day}`))

/** Days on which fasting is recommended (the dot): not Ramadan (obligatory), and never the two Eids or Tashreeq. */
export const FASTING = new Set(['six_shawwal', 'dhul_hijjah_ten', 'arafah', 'muharram', 'tasua', 'ashura', 'shaban', 'mon_thu', 'white_days'])
/** A recommended day that is also an Eid, a Tashreeq day (the 13th of Dhul-Hijjah is a «white day») or in Ramadan gets no dot. */
const NO_DOT = new Set(['eid_fitr', 'eid_adha', 'tashreeq', 'ramadan'])

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const DAY = 86_400_000

export function dayList(spec: string | undefined): Set<number> {
  const out = new Set<number>()
  for (const part of (spec ?? '').split(',')) {
    const [a, b] = part.split('-').map((x) => Number.parseInt(x, 10))
    if (Number.isFinite(a)) for (let d = a; d <= (Number.isFinite(b) ? b : a); d++) out.add(d)
  }
  return out
}

/** The events of a day: by its Hijri month and day, or by its weekday (0 = Sunday). */
export function eventsOn(h: { month: number; day: number }, weekday: number): CalEvent[] {
  if (NOT_MARKED.has(`${h.month}-${h.day}`)) return []
  return EVENTS.filter((e) =>
    e.when.some((w) => (w.weekdays ? w.weekdays.includes(WEEKDAYS[weekday]) : (w.month === 'each' || w.month === h.month) && dayList(w.days).has(h.day))),
  )
}

export type CalDay = { date: Date; h: { day: number; month: number; year: number }; weekday: number; events: CalEvent[]; fasting: boolean }

/** Local noon of a date (DST-safe stepping). */
export const noon = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
export { sameDay }

/** The Hijri month around `anchor` (local dates), with the offset in days; null without Umm al-Qura. */
export function monthAround(anchor: Date, offset: number): CalDay[] | null {
  const at = noon(anchor)
  const h0 = hijriParts(at, offset)
  if (!h0) return null
  const first = new Date(at.getTime() - (h0.day - 1) * DAY)
  const days: CalDay[] = []
  for (let i = 0; i < 31; i++) {
    const date = noon(new Date(first.getTime() + i * DAY))
    const h = hijriParts(date, offset)!
    if (i > 0 && h.day === 1) break
    const events = eventsOn(h, date.getDay())
    const fasting = events.some((e) => FASTING.has(e.key)) && !events.some((e) => NO_DOT.has(e.key))
    days.push({ date, h, weekday: date.getDay(), events, fasting })
  }
  return days
}

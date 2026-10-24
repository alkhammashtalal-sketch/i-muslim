// «أضف إلى تقويم الجهاز» (reply 0062 §2): what the calendar page hands to the phone's own calendar. Computed on the
// device, from the page's own data only; nothing is stored by us and nothing leaves the phone (the event goes to the
// device's calendar through web/src/native/device-calendar.ts).
//   - A day: the title the user typed, all day or at a time, its reminder, and the day's Hijri date in the notes.
//   - The occasions: the calendar page's yearly occasions of data/calendar-events.json (no other occasion, no text of
//     ours), each an all-day event per Hijri year for the next three years, on the Umm al-Qura days the page itself
//     computes (calendar-model.ts eventsOn), after the same offsets (the user's and the global one). A day the page
//     never marks (12 Rabi' I, 27 Rajab, 15 Sha'ban, 1 Muharram) is never covered either: Sha'ban is two events,
//     the 1st to the 14th and the 16th to the 29th. The phone's calendar repeats yearly by the Gregorian year, so
//     each year is an event of its own.
import type { Lang } from '../../../../shared/api'
import { hijriParts } from '../../daily/hijri'
import { EVENTS, eventsOn, noon, type CalEvent } from './calendar-model'
import { hijriWritten } from './format'

const DAY = 86_400_000

/** A Gregorian date on the phone's calendar (month 1–12). */
export type CalDate = { y: number; m: number; d: number }
/** One event for the phone's calendar. `time` only when not all day (an hour long); `alarms` in seconds from the
 *  event's start (for an all-day event, from its midnight). */
export type DeviceEvent = { title: string; notes: string; start: CalDate; end: CalDate; allDay: boolean; time?: { h: number; min: number }; alarms: number[] }

export type Reminder = 'none' | 'at' | 'dayBefore'
/** At the time, and a day before. For an all-day event, as the phone's calendar offers them: 9:00 on the day, and 9:00
 *  the day before. */
export function alarmsFor(r: Reminder, allDay: boolean): number[] {
  if (r === 'none') return []
  if (allDay) return [r === 'at' ? 9 * 3600 : -15 * 3600]
  return [r === 'at' ? 0 : -DAY / 1000]
}

export const calDate = (d: Date): CalDate => ({ y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() })

/** The Hijri date of a local day after the offset, written in the language, with its year («٣ جمادى الأولى ١٤٤٨ هـ»). */
export const hijriOf = (date: Date, offset: number, lang: Lang, weekday = false) =>
  hijriWritten(new Date(noon(date).getTime() + offset * DAY), lang, { ...(weekday ? { weekday: 'long' } : {}), day: 'numeric', month: 'long', year: 'numeric' }) ?? ''

/** The occasions offered: those of the calendar page that come once a Hijri year on fixed days (not the odd nights,
 *  which are nights, and not Monday and Thursday or the white days, which are weekly and monthly). */
export const YEARLY: CalEvent[] = EVENTS.filter((e) => e.when.every((w) => typeof w.month === 'number' && !w.night))

/** One run of an occasion: consecutive marked days of one Hijri year. */
export type Span = { key: string; hYear: number; start: Date; end: Date }

/** The runs of the chosen occasions in the next `years` Hijri years, from `today` (a run in progress counts, from its
 *  first day). Ordered by date. */
export function occasionSpans(keys: string[], today: Date, offset: number, years = 3): Span[] {
  const want = new Set(keys)
  const t0 = noon(today)
  const out: Span[] = []
  const open = new Map<string, Span>()
  // Two months back covers a run in progress (the longest, six of Shawwal, is 28 days), and four Hijri years ahead
  // covers the third year of the latest occasion.
  for (let i = -60; i < 4 * 355 + 30; i++) {
    const date = noon(new Date(t0.getTime() + i * DAY))
    const h = hijriParts(date, offset)
    if (!h) return []
    const on = new Set(eventsOn(h, date.getDay()).map((e) => e.key))
    for (const key of want) {
      const run = open.get(key)
      if (on.has(key)) {
        if (run && run.hYear === h.year) run.end = date
        else {
          const s = { key, hYear: h.year, start: date, end: date }
          open.set(key, s)
          out.push(s)
        }
      } else if (run) open.delete(key)
    }
  }
  // Each occasion's first `years` Hijri years whose run has not ended before today.
  const kept: Span[] = []
  for (const key of want) {
    const runs = out.filter((s) => s.key === key && s.end.getTime() >= t0.getTime())
    const yearsOf = [...new Set(runs.map((s) => s.hYear))].slice(0, years)
    kept.push(...runs.filter((s) => yearsOf.includes(s.hYear)))
  }
  return kept.sort((a, b) => a.start.getTime() - b.start.getTime() || keys.indexOf(a.key) - keys.indexOf(b.key))
}

/** The occasions' events: the occasion's name in the language as the title, and in the notes its Hijri days and the
 *  calendar page's own line on Umm al-Qura and the Supreme Court. */
export function occasionEvents(
  spans: Span[],
  offset: number,
  lang: Lang,
  names: Record<string, string>,
  courtLine: string,
  reminder: 'none' | 'dayBefore',
): DeviceEvent[] {
  return spans.map((s) => {
    const a = hijriOf(s.start, offset, lang)
    const b = hijriOf(s.end, offset, lang)
    return {
      title: names[s.key] ?? s.key,
      notes: `${a === b ? a : `${a} – ${b}`}\n${courtLine}`,
      start: calDate(s.start),
      end: calDate(s.end),
      allDay: true,
      alarms: alarmsFor(reminder, true),
    }
  })
}

/** A day's event: the user's title, and the day's Hijri date (with its weekday) in the notes. */
export function dayEvent(title: string, date: Date, offset: number, lang: Lang, time: { h: number; min: number } | null, reminder: Reminder): DeviceEvent {
  const day = calDate(date)
  return {
    title: title.trim(),
    notes: hijriOf(date, offset, lang, true),
    start: day,
    end: day,
    allDay: !time,
    ...(time ? { time } : {}),
    alarms: alarmsFor(reminder, !time),
  }
}

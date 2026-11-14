// Android (reply 0072 item 14; CLAUDE.md §14): «أضف إلى تقويم الجهاز» opens the calendar app's own «new event» screen
// through the system's insert intent (CalendarContract, AndroidCalendarPlugin.java), filled with the title, the day or
// its time and the Hijri date in the description. The app asks for no calendar permission and reads nothing; the person
// saves the event there, with the reminder their calendar app sets. Called from web/src/native/device-calendar.ts
// behind isAndroid() only.
import { registerPlugin } from '@capacitor/core'
import type { DeviceEvent } from '../../v2/daily/device-calendar'

type Plugin = { insert(o: { title: string; notes: string; begin: number; end: number; allDay: boolean }): Promise<{ opened: boolean }> }
const AndroidCalendar = registerPlugin<Plugin>('AndroidCalendar')

/** The event's start and end in milliseconds: an hour from its local time, or, all day, the day's midnight in UTC to
 *  the next one, as CalendarContract.Events keeps all-day events («eventTimezone must be TIMEZONE_UTC and the time must
 *  correspond to a midnight boundary»). */
export function androidTimes(e: DeviceEvent): { begin: number; end: number } {
  if (e.time) {
    const begin = new Date(e.start.y, e.start.m - 1, e.start.d, e.time.h, e.time.min).getTime()
    return { begin, end: begin + 3_600_000 }
  }
  return { begin: Date.UTC(e.start.y, e.start.m - 1, e.start.d), end: Date.UTC(e.end.y, e.end.m - 1, e.end.d + 1) }
}

export async function androidCalendarInsert(e: DeviceEvent): Promise<boolean> {
  const r = await AndroidCalendar.insert({ title: e.title, notes: e.notes, allDay: e.allDay, ...androidTimes(e) })
  return r.opened
}

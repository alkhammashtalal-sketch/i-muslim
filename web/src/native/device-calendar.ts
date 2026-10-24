// The phone's own calendar (reply 0062 §2–§3): the calendar page adds events to it, and we never read it.
//   - iPhone: the app's plugin DeviceCalendarPlugin.swift (EventKit), with «write-only» access (iOS 17 and later): the
//     person is asked once; the events go to the calendar they choose for new events. Nothing is read, not even the
//     events the app created. Before iOS 17 there is no write-only access, so nothing is offered there.
//   - Android: the system's «new event» screen of the calendar app (android/calendar.ts), no calendar permission; one
//     day at a time, which the person saves there (the occasions' list is the iPhone's only, reply 0072 item 14).
//   - The browser: nothing (the buttons are not shown).
// Nothing is stored by us and nothing leaves the phone.
import { registerPlugin } from '@capacitor/core'
import type { DeviceEvent } from '../v2/daily/device-calendar'
import { androidCalendarInsert } from './android/calendar'
import { isAndroid, platform } from './platform'

type Plugin = {
  available(): Promise<{ available: boolean }>
  add(o: { events: DeviceEvent[] }): Promise<{ added: number; denied?: boolean }>
}
const DeviceCalendar = registerPlugin<Plugin>('DeviceCalendar')

export type Ability = { day: boolean; many: boolean; reminders: boolean }
const NONE: Ability = { day: false, many: false, reminders: false }

/** What this device can add: a day (iPhone with iOS 17, Android), the occasions' list and reminders (iPhone only). */
export async function deviceCalendarAbility(): Promise<Ability> {
  if (isAndroid()) return { day: true, many: false, reminders: false }
  if (platform() !== 'ios') return NONE
  try {
    return (await DeviceCalendar.available()).available ? { day: true, many: true, reminders: true } : NONE
  } catch {
    return NONE
  }
}

/** «added» (iPhone), «opened» (Android: the calendar app's own screen, where the person saves it), «denied» (the person
 *  did not allow the app to add events: a calm line, no error), «failed». */
export type AddResult = { kind: 'added'; n: number } | { kind: 'opened' } | { kind: 'denied' } | { kind: 'failed' }

export async function addToDeviceCalendar(events: DeviceEvent[]): Promise<AddResult> {
  try {
    if (isAndroid()) return (await androidCalendarInsert(events[0])) ? { kind: 'opened' } : { kind: 'failed' }
    const r = await DeviceCalendar.add({ events })
    return r.denied ? { kind: 'denied' } : { kind: 'added', n: r.added }
  } catch {
    return { kind: 'failed' }
  }
}

// When each subscription's next bell rings (reply 0032 part E): the prayer times for the centre of its 0.1° cell with
// the engine the device uses (web/src/daily/prayer.ts, adhan 4.4.4), in its time zone and settings; and the daily
// portion's reminder at its local time.
import { dayTimes, METHODS, ymdIn, type Method, type PrayerOptions } from '../../../web/src/daily/prayer'

export const BELLS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
export type Bell = (typeof BELLS)[number]
export type Kind = Bell | 'ward'
export type SubPrefs = { cell_lat: number; cell_lng: number; tz: string; method: string; asr: string; adjust: string; prayers: string; ward: string | null }

const DAY = 86_400_000

/** The instant a local wall-clock time (HH:MM) occurs on a civil day in a time zone. */
export function localInstant(day: { y: number; m: number; d: number }, hhmm: string, tz: string): Date {
  const [h, mi] = hhmm.split(':').map(Number)
  const guess = Date.UTC(day.y, day.m - 1, day.d, h, mi)
  // The zone's offset at that moment, by formatting the guess in the zone (two passes cover a DST edge).
  const off = (t: number) => {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(t))
    const n = (k: string) => Number(p.find((x) => x.type === k)!.value)
    return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute')) - t
  }
  let t = guess - off(guess)
  t = guess - off(t)
  return new Date(t)
}

/** The next bell strictly after `now` (looking at today and tomorrow in the subscription's zone). */
export function nextBell(sub: SubPrefs, now: Date): { at: number; kind: Kind } | null {
  const enabled = new Set((JSON.parse(sub.prayers) as string[]).filter((p): p is Bell => (BELLS as readonly string[]).includes(p)))
  const opts: PrayerOptions = {
    method: (METHODS as readonly string[]).includes(sub.method) ? (sub.method as Method) : 'UmmAlQura',
    asr: sub.asr === 'hanafi' ? 'hanafi' : 'shafi',
    adjust: JSON.parse(sub.adjust || '{}'),
  }
  let best: { at: number; kind: Kind } | null = null
  for (const offset of [0, 1]) {
    const day = ymdIn(new Date(now.getTime() + offset * DAY), sub.tz)
    const t = dayTimes({ lat: sub.cell_lat, lng: sub.cell_lng }, day, opts)
    for (const b of BELLS) if (enabled.has(b) && t[b].getTime() > now.getTime() && (!best || t[b].getTime() < best.at)) best = { at: t[b].getTime(), kind: b }
    if (sub.ward && /^\d{2}:\d{2}$/.test(sub.ward)) {
      const w = localInstant(day, sub.ward, sub.tz).getTime()
      if (w > now.getTime() && (!best || w < best.at)) best = { at: w, kind: 'ward' }
    }
  }
  return best
}

/** A cell sent by the device: both coordinates rounded to 0.1° (anything more precise is refused). */
export function validCell(lat: unknown, lng: unknown): boolean {
  const ok = (v: unknown, max: number) => typeof v === 'number' && Number.isFinite(v) && Math.abs(v) <= max && Math.abs(Math.round(v * 10) - v * 10) < 1e-9
  return ok(lat, 90) && ok(lng, 180)
}

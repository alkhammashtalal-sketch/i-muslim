// Prayer times on the device (reply 0031-add10, §1), with adhan 4.4.4 (MIT, pinned). Nothing leaves the device.
// Default: Umm al-Qura (Fajr 18.5°, Isha 90 minutes after Maghrib), Asr by the majority (Shafi'i) shadow, the
// recommended high-latitude rule, and the nearest-day polar resolution. In Ramadan Umm al-Qura's Isha is 120 minutes
// after Maghrib: adhan does not add it, so we add 30 minutes (adhan's own docs; SPA: «ساعتان بين المغرب والعشاء في
// رمضان»). Dhuhr is adhan's solar transit (the zawal) rounded to the nearest minute: up to 30 s before the zawal.
import { CalculationMethod, Coordinates, HighLatitudeRule, Madhab, PolarCircleResolution, PrayerTimes, SunnahTimes } from 'adhan'
import { hijriParts } from './hijri'

export const METHODS = ['UmmAlQura', 'MuslimWorldLeague', 'Egyptian', 'Karachi', 'Dubai', 'Kuwait', 'Qatar', 'Singapore', 'Turkey', 'Tehran', 'NorthAmerica', 'MoonsightingCommittee'] as const
export type Method = (typeof METHODS)[number]
export type AsrSchool = 'shafi' | 'hanafi'
export type LatLng = { lat: number; lng: number }
export type Ymd = { y: number; m: number; d: number }

export type PrayerOptions = {
  method?: Method
  asr?: AsrSchool
  /** 'auto' (default): Umm al-Qura's Ramadan Isha whenever the date falls in Ramadan by the Umm al-Qura calendar. */
  ramadan?: 'auto' | boolean
  /** Minutes the user adds to each time (settings). */
  adjust?: Partial<Record<'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha', number>>
}

export type DayTimes = {
  fajr: Date
  sunrise: Date
  dhuhr: Date
  asr: Date
  maghrib: Date
  isha: Date
  /** Suhoor ends at Fajr; iftar is at Maghrib. */
  suhoorEnd: Date
  iftar: Date
  /** From SunnahTimes: the middle of the night and the start of its last third (for tahajjud). */
  midnight: Date
  lastThird: Date
  method: Method
  asrSchool: AsrSchool
  ramadanIsha: boolean
}

const ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

/** The civil date (y, m, d) at a place, from an instant and the place's IANA time zone. */
export function ymdIn(at: Date, timeZone: string): Ymd {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(at)
  const n = (t: string) => Number(p.find((x) => x.type === t)!.value)
  return { y: n('year'), m: n('month'), d: n('day') }
}

/** Times for one civil day at one place. adhan reads the date from the Date's local fields, so it gets a local
 *  midnight carrying the place's (y, m, d); the results are absolute instants, shown in the place's time zone. */
export function dayTimes(at: LatLng, day: Ymd, opts: PrayerOptions = {}): DayTimes {
  const method: Method = opts.method ?? 'UmmAlQura'
  const asrSchool: AsrSchool = opts.asr ?? 'shafi'
  const coords = new Coordinates(at.lat, at.lng)
  const params = CalculationMethod[method]()
  params.madhab = asrSchool === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi
  params.highLatitudeRule = HighLatitudeRule.recommended(coords)
  params.polarCircleResolution = PolarCircleResolution.AqrabYaum
  const inRamadan = opts.ramadan === 'auto' || opts.ramadan === undefined ? isRamadan(day) : opts.ramadan
  const ramadanIsha = method === 'UmmAlQura' && inRamadan
  for (const k of ORDER) params.adjustments[k] = opts.adjust?.[k] ?? 0
  if (ramadanIsha) params.adjustments.isha += 30
  const date = new Date(day.y, day.m - 1, day.d)
  const t = new PrayerTimes(coords, date, params)
  const s = new SunnahTimes(t)
  return {
    fajr: t.fajr,
    sunrise: t.sunrise,
    dhuhr: t.dhuhr,
    asr: t.asr,
    maghrib: t.maghrib,
    isha: t.isha,
    suhoorEnd: t.fajr,
    iftar: t.maghrib,
    midnight: s.middleOfTheNight,
    lastThird: s.lastThirdOfTheNight,
    method,
    asrSchool,
    ramadanIsha,
  }
}

/** Ramadan by the Umm al-Qura calendar at noon UTC of that civil day; false when the calendar is unavailable. */
export function isRamadan(day: Ymd): boolean {
  const h = hijriParts(new Date(Date.UTC(day.y, day.m - 1, day.d, 12)))
  return h?.month === 9
}

/** The next of the five prayers (sunrise excluded) after `now`, looking into tomorrow after Isha. */
export function nextPrayer(at: LatLng, now: Date, timeZone: string, opts: PrayerOptions = {}): { name: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'; at: Date } {
  const today = ymdIn(now, timeZone)
  for (const offset of [0, 1]) {
    const d = offset ? ymdIn(new Date(now.getTime() + 36 * 3600 * 1000), timeZone) : today
    const t = dayTimes(at, d, opts)
    for (const name of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) if (t[name] > now) return { name, at: t[name] }
  }
  throw new Error('no next prayer')
}

/** "HH:MM" in the place's time zone (24-hour, Latin digits; the interface localises). */
export const hhmm = (d: Date, timeZone: string) =>
  new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)

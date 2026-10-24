// One clock and one adhan object for the home's next-prayer line and the date card's sky (add-on 0071-add16 §4, Team B
// §1 and §3–4 in relay/w1/0071-market/sky-review/sky-teamB.md). Each evaluation takes `now` once and gives it to both,
// so the line and the sky change in the same frame at a prayer's bound.
//
// - The day's object is adhan's PrayerTimes for today's date in the PLACE's time zone, with the app's settings resolved
//   for that place exactly as the times page resolves them (store.ts resolvePrayer: «تلقائي حسب البلد», the Asr the
//   table prints, the minutes; plus the high-latitude rule and Ramadan's Isha), kept until the date or a setting
//   changes (the stale-object guard: a new date in the place's zone is a new key).
// - The line keeps its 30-second pulse (its «بعد ٣ ساعات» counts down). The sky is evaluated only when the home opens,
//   when the app comes back (visibilitychange, Capacitor's «resume», pageshow), when the place or the settings change,
//   and at the next bound, by ONE timer (no minute timer of its own). A pulse that finds a bound already passed counts
//   as that bound, so the line never runs ahead of the sky.
// - No place: no times on the line, so no sky (Team B §3.6).
import { useSyncExternalStore } from 'react'
import { hijriParts } from '../../daily/hijri'
import { savedPlace, type Place } from '../../daily/location'
import { dayObject, timesOf, ymdIn, type DayObject, type DayTimes, type Ymd } from '../../daily/prayer'
import { nextBound, skyLight, skyStateOf, starSet, type SkyLight, type SkyState } from '../home/sky-state'
import { loadPrayerPrefs, prayerOptions, type PrayerPrefs } from './store'

type Day = { key: string; obj: DayObject; times: DayTimes }
export type LineSnap = { now: Date; place: Place | null; prefs: PrayerPrefs; today: DayTimes | null }
/** `animate`: this snapshot came from a bound crossed while the page was open (a fade may show it). */
export type SkySnap = { state: SkyState | null; light: SkyLight | null; stars: number; at: Date; animate: boolean }
type Reason = 'open' | 'pulse' | 'bound' | 'resume' | 'settings'

const PULSE_MS = 30_000
let day: Day | null = null
let line: LineSnap | null = null
let sky: SkySnap | null = null
let nextAt: number | null = null
let bound: ReturnType<typeof setTimeout> | null = null
let pulse: ReturnType<typeof setInterval> | null = null
const lineSubs = new Set<() => void>()
const skySubs = new Set<() => void>()

const key = (ymd: Ymd, place: Place, prefs: PrayerPrefs) =>
  `${ymd.y}-${ymd.m}-${ymd.d}|${place.lat},${place.lng}|${place.timeZone}|${prefs.method}|${prefs.asr}|${JSON.stringify(prefs.adjust ?? {})}`
function dayFor(place: Place, prefs: PrayerPrefs, ymd: Ymd): Day {
  const k = key(ymd, place, prefs)
  if (day?.key === k) return day
  const obj = dayObject(place, ymd, prayerOptions(prefs))
  day = { key: k, obj, times: timesOf(obj) }
  return day
}
const nextYmd = ({ y, m, d }: Ymd): Ymd => {
  const t = new Date(Date.UTC(y, m - 1, d + 1))
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

function arm(place: Place | null, prefs: PrayerPrefs, d: Day | null, now: Date) {
  if (bound) clearTimeout(bound)
  bound = null
  nextAt = null
  if (!place || !d || !skySubs.size || !sky?.state) return
  const after = d.times.isha.getTime() <= now.getTime() ? dayObject(place, nextYmd(ymdIn(now, place.timeZone)), prayerOptions(prefs)).pt.fajr : d.times.fajr
  const at = nextBound(d.times, after, now).getTime()
  if (!Number.isFinite(at)) return
  nextAt = at
  // A little after the bound, so the minute has turned; if the clock was set back, the evaluation re-arms.
  bound = setTimeout(() => evaluate('bound'), Math.max(0, at - Date.now()) + 50)
}

function evaluate(reason: Reason, silent = false) {
  const now = new Date()
  const place = savedPlace()
  const prefs = loadPrayerPrefs(place)
  const d = place ? dayFor(place, prefs, ymdIn(now, place.timeZone)) : null
  line = { now, place, prefs, today: d?.times ?? null }
  // The sky follows only its own moments; a pulse past a bound is that bound. A bound seen more than 2 s late is a
  // catch-up (the app slept in the background, where WKWebView's timers stop): applied at once, never faded.
  const crossed = nextAt != null && now.getTime() >= nextAt
  const fresh = crossed && now.getTime() - nextAt! < 2000
  if (reason !== 'pulse' || crossed || !sky) {
    const state = d ? skyStateOf(d.obj.pt, now) : null
    const h = hijriParts(now)
    sky = {
      state,
      light: state && d ? skyLight(state, d.times, now) : null,
      stars: starSet(h?.day ?? null),
      at: now,
      animate: (reason === 'bound' || reason === 'pulse') && fresh,
    }
    arm(place, prefs, d, now)
  }
  if (!silent) for (const f of [...lineSubs, ...skySubs]) f()
}

const onVisible = () => document.visibilityState === 'visible' && evaluate('resume')
const onResume = () => evaluate('resume')
const onSettings = () => evaluate('settings')
function start() {
  document.addEventListener('visibilitychange', onVisible)
  document.addEventListener('resume', onResume)
  window.addEventListener('pageshow', onResume)
  window.addEventListener('muslim:place', onSettings)
  window.addEventListener('storage', onSettings)
  // savePrayerPrefs announces a new method or Asr school with this event (web/src/v2/daily/store.ts).
  window.addEventListener('muslim:widgets', onSettings)
}
function stop() {
  document.removeEventListener('visibilitychange', onVisible)
  document.removeEventListener('resume', onResume)
  window.removeEventListener('pageshow', onResume)
  window.removeEventListener('muslim:place', onSettings)
  window.removeEventListener('storage', onSettings)
  window.removeEventListener('muslim:widgets', onSettings)
  if (bound) clearTimeout(bound)
  bound = null
  nextAt = null
}
function subscribe(set: Set<() => void>, f: () => void, reason: Reason) {
  const first = !lineSubs.size && !skySubs.size
  set.add(f)
  if (first) start()
  if (lineSubs.size && !pulse) pulse = setInterval(() => evaluate('pulse'), PULSE_MS)
  // The screen opens: a fresh evaluation, applied at once.
  evaluate(reason)
  return () => {
    set.delete(f)
    if (!lineSubs.size && pulse) {
      clearInterval(pulse)
      pulse = null
    }
    if (!skySubs.size && bound) {
      clearTimeout(bound)
      bound = null
      nextAt = null
    }
    if (!lineSubs.size && !skySubs.size) stop()
  }
}

const lineSnap = () => {
  if (!line) evaluate('open', true)
  return line!
}
const skySnap = () => {
  if (!sky) evaluate('open', true)
  return sky!
}

// Stable subscribe functions: React subscribes again whenever the function changes.
const subLine = (f: () => void) => subscribe(lineSubs, f, 'open')
const subSky = (f: () => void) => subscribe(skySubs, f, 'open')

/** The next-prayer line's clock: `now` every 30 seconds and at each bound, the place, the settings and today's times
 *  from the same adhan object as the sky. */
export const useDayLine = (): LineSnap => useSyncExternalStore(subLine, lineSnap, lineSnap)
/** The date card's sky: its state and light, changed only at its own moments. */
export const useDaySky = (): SkySnap => useSyncExternalStore(subSky, skySnap, skySnap)

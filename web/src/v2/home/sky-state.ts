// The sky with the time of day (add-on 0071-add16, after the two teams' reviews in relay/w1/0071-market/sky-review/):
// six separate states and the light's place, from adhan's own object for the day, the one the home's next-prayer line
// reads (web/src/v2/daily/day-clock.ts). Pure functions, tested in worker/test/sky-0071.test.ts.
//
// State (Team B §1): adhan's currentPrayer(now): none → night, fajr → fajr, sunrise → morning, dhuhr → dhuhr,
// asr → asr, maghrib → maghrib, isha → night. A time begins at its bound (adhan's own ≥ ladder, on its rounded minute).
// If any of the six moments is not a valid date (a polar day adhan cannot resolve), there is no state: no layer.
//
// The light (Team A §5): between sunrise and Maghrib, p = (now − sunrise) ÷ (Maghrib − sunrise), θ = πp; the light's
// centre is 58·cos θ east of the sky's middle (the east is the reading's start: right in Arabic, mirrored in CSS for
// left-to-right) and at 70 − 76·sin θ % down the sky; the warm heart's strength 0.42·(1 − 0.5·sin θ), the lit lapis'
// 0.14 + 0.30·sin θ. In Fajr, q from Fajr to sunrise lifts the pearl band (× (0.6 + 0.4q)); in Maghrib, q from
// Maghrib to Isha shrinks the vermilion (× (1 − 0.7q)) and deepens the sky to the night's at Isha.
import type { PrayerTimes } from 'adhan'
import type { DayTimes } from '../../daily/prayer'

export const SKY_STATES = ['night', 'fajr', 'morning', 'dhuhr', 'asr', 'maghrib'] as const
export type SkyState = (typeof SKY_STATES)[number]
export type Current = 'none' | 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'

/** adhan's current prayer → the sky's state (Team B's table). */
export const SKY_OF: Record<Current, SkyState> = { none: 'night', fajr: 'fajr', sunrise: 'morning', dhuhr: 'dhuhr', asr: 'asr', maghrib: 'maghrib', isha: 'night' }

type Six = Pick<DayTimes, 'fajr' | 'sunrise' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'>
const SIX = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
const valid = (t: Six) => SIX.every((k) => t[k] instanceof Date && Number.isFinite(t[k].getTime()))

/** The state at `now` from adhan's object, or null when a moment of the day is not valid (no layer). */
export function skyStateOf(pt: Pick<PrayerTimes, 'currentPrayer'> & Six, now: Date): SkyState | null {
  if (!valid(pt)) return null
  return SKY_OF[pt.currentPrayer(now) as Current] ?? null
}

/** The light's place and strengths for CSS (sky.css): `dx` east of the middle and `y` down, in % of the sky box;
 *  `warm` and `lapis` the day light's strengths; `k` the Fajr band's or Maghrib red's factor; `q` the share of Fajr or
 *  Maghrib gone. */
export type SkyLight = { dx: number; y: number; warm: number; lapis: number; k: number; q: number }

const frac = (now: Date, a: Date, b: Date) => Math.min(1, Math.max(0, (now.getTime() - a.getTime()) / (b.getTime() - a.getTime())))
const round = (n: number) => Math.round(n * 1000) / 1000

export function skyLight(state: SkyState, t: Six, now: Date): SkyLight {
  const p = frac(now, t.sunrise, t.maghrib)
  const th = Math.PI * p
  const sin = Math.sin(th)
  const base = { dx: round(58 * Math.cos(th)), y: round(70 - 76 * sin), warm: round(0.42 * (1 - 0.5 * sin)), lapis: round(0.14 + 0.3 * sin), k: 1, q: 0 }
  if (state === 'fajr') {
    const q = frac(now, t.fajr, t.sunrise)
    return { ...base, q: round(q), k: round(0.6 + 0.4 * q) }
  }
  if (state === 'maghrib') {
    const q = frac(now, t.maghrib, t.isha)
    return { ...base, q: round(q), k: round(1 - 0.7 * q) }
  }
  return base
}

/** The next moment the state can change after `now`: the next of the day's six, or the next day's Fajr after Isha. */
export function nextBound(t: Six, nextFajr: Date, now: Date): Date {
  for (const k of SIX) if (t[k].getTime() > now.getTime()) return t[k]
  return nextFajr
}

/** The night's brightest stars (Team A §6): one of three sets of four of the painting's own stars, by the Hijri day,
 *  so each night's sky differs from the last with no motion. The stars by the corner dates are left out. */
export const starSet = (hijriDay: number | null) => (hijriDay == null ? 0 : ((hijriDay % 3) + 3) % 3)

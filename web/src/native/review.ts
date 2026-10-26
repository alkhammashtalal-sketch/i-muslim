// Asking for a rating at the right time (add-on 0072-add26 §5): the system's own sheet through
// @capawesome/capacitor-app-review (iOS AppStore.requestReview / SKStoreReviewController, the Android In-App Review
// API), only inside the app, by the rules of review-rules.ts. The system decides whether its sheet shows (iOS at most
// three times a year); the app never shows a «قيّمنا» button or a sheet of its own, and never asks twice in 120 days.
// What it keeps (the active days, when it last asked, the last trouble in «اسأل», the last alert opened) stays on this
// device, in the app's storage under one key.
import { savedPlace } from '../daily/location'
import { dayTimes, type Ymd } from '../daily/prayer'
import { loadPrayerPrefs, prayerOptions } from '../v2/daily/store'
import { welcomeSeen } from '../v2/welcome/seen'
import { addDays } from './bells'
import { isNative } from './platform'
import { localDay, noteDay, parseReview, REVIEW_KEY, reviewDecision, type Moment, type ReviewState } from './review-rules'
import { deviceStorage } from '../storage/device'

/** The app's storage layer (add-on 0072-add25: Preferences in the app, localStorage on the web). */
const store = (): Pick<Storage, 'getItem' | 'setItem'> | null => deviceStorage
const load = (): ReviewState => {
  try {
    return parseReview(store()?.getItem(REVIEW_KEY) ?? null)
  } catch {
    return parseReview(null)
  }
}
const save = (s: ReviewState) => {
  try {
    store()?.setItem(REVIEW_KEY, JSON.stringify(s))
  } catch {
    // no storage: nothing is asked that the rules could not check again
  }
}

/** This launch is the first run: the welcome page had not been seen when the app started (noteLaunch). */
let firstRun: boolean | null = null

/** The app has started or come back to the foreground (NativeDevice): today is an active day. */
export function noteLaunch(now = new Date()) {
  if (!isNative()) return
  if (firstRun == null) firstRun = !welcomeSeen()
  const s = load()
  const next = noteDay(s, localDay(now))
  if (next !== s) save(next)
}

/** An error, a refusal or a wait in «اسأل» (api/client.ts): no rating is asked for a day after it. */
export function noteAskTrouble(now = Date.now()) {
  if (!isNative()) return
  save({ ...load(), askTrouble: now })
}

/** An alert was opened (NativeDevice's onAlertTap): none in the half hour after it. */
export function noteAlertTap(now = Date.now()) {
  if (!isNative()) return
  save({ ...load(), alertTap: now })
}

/** The six bells of yesterday, today and tomorrow at the saved place, by the times screen's own settings; none
 *  without a place. */
function bellTimes(now: Date): number[] {
  try {
    const place = savedPlace()
    if (!place) return []
    const opts = prayerOptions(loadPrayerPrefs(place))
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: place.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
    const n = (t: string) => Number(p.find((x) => x.type === t)!.value)
    const today: Ymd = { y: n('year'), m: n('month'), d: n('day') }
    return [-1, 0, 1].flatMap((k) => {
      const t = dayTimes(place, addDays(today, k), opts)
      return [t.fajr, t.sunrise, t.dhuhr, t.asr, t.maghrib, t.isha].map((d) => d.getTime())
    })
  } catch {
    return []
  }
}

/** The moment's decision now (exported for the tests and the simulator's check). */
export function decideNow(moment: Moment, now = new Date()) {
  return reviewDecision(load(), moment, { now: now.getTime(), today: localDay(now), native: isNative(), firstRun: firstRun ?? !welcomeSeen(), prayerTimes: bellTimes(now) })
}

/** After a moment (a lesson finished, a portion read, the 7/5 check): a little later, so the screen has shown what
 *  was done, the rules are checked again and, if they allow it, the system is asked. Never throws. */
export function reviewMoment(moment: Moment, delayMs = moment === 'days' ? 60_000 : 1_500) {
  if (!isNative()) return
  setTimeout(() => {
    if (document.visibilityState !== 'visible') return
    const d = decideNow(moment)
    if (!d.ask) return
    // Marked first: whatever the system does with it, the next ask is 120 days away.
    save({ ...load(), asked: Date.now() })
    void import('@capawesome/capacitor-app-review').then(({ AppReview }) => AppReview.requestReview()).catch(() => undefined)
  }, delayMs)
}

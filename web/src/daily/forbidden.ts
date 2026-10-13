// The times in which voluntary prayer is not prayed (reply 0031-add10, §2), from the day's times:
//   after sunrise: sunrise → +15 minutes
//   before the zawal: Dhuhr −20 minutes → Dhuhr. The two sheikhs estimate this time differently (Ibn Baz, fatwa 12348:
//   «يقارب ربع ساعة أو ثلث ساعة»; Ibn Uthaymeen, al-Sharh al-Mumti 4/88: «نحو عشر دقائق»), so the window shown covers
//   both estimates, and the screen says so under the two quotes (reply 0031-add16 §4; rule 11: a difference is stated,
//   not settled).
//   after Asr: from after the Asr *prayer* to sunset; the start shown is «من بعد صلاة العصر», not the Asr adhan time,
//   so `from` here is the adhan time and `fromLabel` says it begins after the prayer itself.
// The texts shown with each window are quoted with their links in docs/SOURCES.md, and stay hidden until verified.
import type { DayTimes } from './prayer'

export type ForbiddenKey = 'after_sunrise' | 'before_zawal' | 'after_asr'
export type ForbiddenWindow = { key: ForbiddenKey; from: Date; to: Date; fromLabel: 'time' | 'after_asr_prayer' }

const MIN = 60_000
/** Minutes before Dhuhr: the longer of the two estimates, a third of an hour (reply 0031-add16 §4). */
export const BEFORE_ZAWAL_MIN = 20

export function forbiddenWindows(t: Pick<DayTimes, 'sunrise' | 'dhuhr' | 'asr' | 'maghrib'>): ForbiddenWindow[] {
  return [
    { key: 'after_sunrise', from: t.sunrise, to: new Date(t.sunrise.getTime() + 15 * MIN), fromLabel: 'time' },
    { key: 'before_zawal', from: new Date(t.dhuhr.getTime() - BEFORE_ZAWAL_MIN * MIN), to: t.dhuhr, fromLabel: 'time' },
    { key: 'after_asr', from: t.asr, to: t.maghrib, fromLabel: 'after_asr_prayer' },
  ]
}

/** The window `now` falls in, or null. After Asr counts only once the user has prayed Asr (`asrPrayed`). */
export function forbiddenNow(t: Pick<DayTimes, 'sunrise' | 'dhuhr' | 'asr' | 'maghrib'>, now: Date, asrPrayed = false): ForbiddenWindow | null {
  for (const w of forbiddenWindows(t)) {
    if (w.key === 'after_asr' && !asrPrayed) continue
    if (now >= w.from && now < w.to) return w
  }
  return null
}

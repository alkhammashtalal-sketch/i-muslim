// The ayah of the day (reply 0031-add16 §1): data/daily-ayat.json, a list made by a fixed rule (the Beautiful Names'
// Quran evidence and the ayat beginning with «رَبَّنَا»; scripts/daily/daily-ayat-build.mjs), chosen by no one. One
// ayah a day for everyone: (the Riyadh day − the list's epoch day) mod the list length. Ids only; the text is D1's.
import data from '../../../../data/daily-ayat.json'

export type DailyAyah = { id: string; sura: number; aya: number; ref: string; sources: string[]; names?: string[] }

export const DAILY_AYAT = (data.ayat as DailyAyah[]).filter((x) => /^quran:\d{1,3}:\d{1,3}$/.test(x.id))
export const DAILY_EPOCH = data.epoch

const DAY = 86_400_000
/** Days since 1970-01-01 of the date in Riyadh (UTC+3, no daylight saving) at `now`: the card's own notion of the day,
 *  the same as the hadith's (worker/src/hadith.ts dayIndex). */
export const riyadhDayNumber = (now = Date.now()) => Math.floor((now + 3 * 3600_000) / DAY)
const epochDay = Math.floor(Date.parse(`${DAILY_EPOCH}T00:00:00Z`) / DAY)

/** The list position for the day at `now`: never negative, also for a date before the epoch. */
export function dailyAyahIndex(now = Date.now(), n = DAILY_AYAT.length): number {
  if (n <= 0) return -1
  const d = riyadhDayNumber(now) - epochDay
  return ((d % n) + n) % n
}

/** The ayah of the day, or null while the list is empty. */
export const dailyAyah = (now = Date.now()): DailyAyah | null => DAILY_AYAT[dailyAyahIndex(now)] ?? null

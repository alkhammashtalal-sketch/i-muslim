// The next occasion under the Hijri date (add-on 0071-add13 §3, after the competing app's «بداية الأشهر الحرم بعد نحو
// 3 أشهر»): the occasions fixed by the Sharia alone (Ramadan, the two Eids, Arafah, the ten of Dhul-Hijjah, Ashura, the
// sacred months, the white days), each by the Umm al-Qura day it begins on and its hadith (data/occasions.json, its
// evidence checked in worker/test). Computed on the device from the same Intl calendar as the calendar page, with the
// same offsets (the user's and the global one set after the Supreme Court's announcement). Nothing leaves the phone.
//
// The line names the occasion that begins today, else the next one to begin: «الأيام البيض · بعد يومين». An occasion
// longer than a day is named on its first day; on the days after it the line looks ahead to the next one (in Ramadan,
// to the Eid; in the ten days, to Arafah).
import type { Lang } from '../../../../shared/api'
import calendar from '../../../../data/calendar-events.json'
import data from '../../../../data/occasions.json'
import { EVENTS } from '../daily/calendar-model'
import { hijriParts } from '../../daily/hijri'
import { plural } from '../daily/format'
import { hijriDisc } from './hijri-disc'
import type { OccasionStrings } from './strings'

export type OccasionKey = 'ramadan' | 'eid_fitr' | 'dhul_hijjah_ten' | 'arafah' | 'eid_adha' | 'ashura' | 'sacred_rajab' | 'sacred_dhul_qadah' | 'white_days'
/** `day` the Umm al-Qura day it begins on; `to` the last day the line still says «today» (the three white days; the
 *  others on their first day only, then the line looks ahead). */
export type Occasion = { key: OccasionKey; month: number | 'each'; day: number; to: number; notIn: number[]; hadithId: string }
type Row = { key: string; month: number | string; day: number; to?: number; not_in?: number[]; event?: string; hadith_id?: string }

/** The occasions in their file's order (which also decides between two that begin on the same day; none do today). */
export const OCCASIONS: Occasion[] = (data.occasions as Row[]).map((o) => {
  const hadithId = o.hadith_id ?? EVENTS.find((e) => e.key === o.event)?.hadith_id
  if (!hadithId) throw new Error(`occasion ${o.key}: no hadith`)
  return { key: o.key as OccasionKey, month: o.month === 'each' ? 'each' : Number(o.month), day: o.day, to: o.to ?? o.day, notIn: o.not_in ?? [], hadithId }
})

type HDay = { day: number; month: number }

/** The days the calendar never marks (12 Rabi' I, 27 Rajab, 15 Sha'ban, 1 Muharram; the coordinator's decision, even
 *  when a range covers them, as the white days cover the 15th of Sha'ban): never named by the line either. */
const NOT_MARKED = new Set((calendar.not_marked.days as HDay[]).map((d) => `${d.month}-${d.day}`))
const inMonth = (o: Occasion, month: number) => (o.month === 'each' ? !o.notIn.includes(month) : o.month === month)
const marked = (h: HDay) => !NOT_MARKED.has(`${h.month}-${h.day}`)
/** Whether an occasion begins on a Hijri day. */
export const beginsOn = (o: Occasion, h: HDay) => o.day === h.day && inMonth(o, h.month) && marked(h)
/** Whether the line says «today» for an occasion on a Hijri day: from its first day to its `to`. */
export const holdsOn = (o: Occasion, h: HDay) => h.day >= o.day && h.day <= o.to && inMonth(o, h.month) && marked(h)

/** The occasion of today (`days` 0), else the next one to begin, `days` local days from `today`; null when the Hijri
 *  date cannot be computed (no Umm al-Qura in this engine) or nothing begins within `horizon` days. */
export function nextOccasion(today: Date, hijriOf: (d: Date) => HDay | null, horizon = 400): { occasion: Occasion; days: number } | null {
  for (let i = 0; i <= horizon; i++) {
    // Local noon, stepped by the calendar date (safe across a daylight-saving change).
    const h = hijriOf(new Date(today.getFullYear(), today.getMonth(), today.getDate() + i, 12))
    if (!h) return null
    const o = OCCASIONS.find((x) => (i === 0 ? holdsOn(x, h) : beginsOn(x, h)))
    if (o) return { occasion: o, days: i }
  }
  return null
}

/** The date card's Hijri date and its occasion line, from one offset (add-on 0071-add15 §3: the disc applies the same
 *  offset as the line, the user's and the global one), so the two never name different days. */
export function cardHijri(lang: string, now: Date, offset: number) {
  return { disc: hijriDisc(lang, now, undefined, offset), occasion: nextOccasion(now, (d) => hijriParts(d, offset)) }
}

/** How far it is, in the words the line uses: today, tomorrow, in n days (under a month), in about n months. */
export type When = { kind: 'today' } | { kind: 'tomorrow' } | { kind: 'days' | 'months'; n: number }
export function whenOf(days: number): When {
  if (days <= 0) return { kind: 'today' }
  if (days === 1) return { kind: 'tomorrow' }
  if (days < 30) return { kind: 'days', n: days }
  return { kind: 'months', n: Math.max(1, Math.round(days / 29.5)) }
}

/** The line's second half in the interface language: «اليوم», «غدًا», «بعد ٣ أيام», «بعد نحو شهرين». */
export function occasionWhen(days: number, o: OccasionStrings, lang: Lang) {
  const w = whenOf(days)
  if (w.kind === 'today') return o.today
  if (w.kind === 'tomorrow') return o.tomorrow
  return plural(w.kind === 'days' ? o.days : o.months, w.n, lang)
}

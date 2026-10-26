// The optional reminders of add-on 0072-add30 §5, all off by default, under the adhkar reminders in the app's
// settings: Friday (Surat al-Kahf, and sending much salawat on the Prophet ﷺ), fasting al-ayyam al-bid and Monday and
// Thursday (each the evening before, so the night can be planned), and «اسم الله لليوم» in the morning. Each carries its
// hadith from HadeethEnc (data/reminders.json): a quote that is a verbatim part of its text, the reader's language only
// when HadeethEnc has the hadith in it and the Arabic always (CLAUDE.md §4), and the grade and takhrij as the Arabic row
// gives them (rule 10). Its page (/today/reminder/<kind>) shows the whole hadith from D1 by its id, with its link.
// They share the 64 pending notifications with the bells and the adhkar reminders (bells.ts planAlerts). Pure, no
// Capacitor: worker/test/reminders-0072.test.ts.
// Named imports, so that with REMINDER_VIRTUE off the build leaves the hadiths out of the app altogether (Vite keeps a
// JSON file's unused named exports out of the bundle): only the names' rotation ships.
import { hadiths, names } from '../../../data/reminders.json'
import { hijriParts } from '../daily/hijri'
import type { DayTimes, Ymd } from '../daily/prayer'
import { REMINDER_TEXT } from './reminder-strings'

export type ReminderKind = 'friday' | 'fastBid' | 'fastMonThu' | 'nameDay'
export const REMINDER_KINDS: readonly ReminderKind[] = ['friday', 'fastBid', 'fastMonThu', 'nameDay']

/** The choice: each switch and its minutes (Friday and the name after sunrise; the fasting ones after Maghrib). */
export type ExtraReminders = { friday: boolean; fastBid: boolean; fastMonThu: boolean; nameDay: boolean; fridayMin: number; fastBidMin: number; fastMonThuMin: number; nameDayMin: number }
export const EXTRA_DEFAULTS: ExtraReminders = { friday: false, fastBid: false, fastMonThu: false, nameDay: false, fridayMin: 60, fastBidMin: 30, fastMonThuMin: 30, nameDayMin: 30 }
/** The minutes offered, as the adhkar reminders (bells.ts ADHKAR_MINUTES). */
export const EXTRA_MINUTES = [5, 15, 30, 45, 60] as const
export const extraMinutes = (n: unknown, fallback: number) => ((EXTRA_MINUTES as readonly number[]).includes(n as number) ? (n as number) : fallback)
/** What each reminder's time follows. */
export const ANCHOR: Record<ReminderKind, 'sunrise' | 'maghrib'> = { friday: 'sunrise', fastBid: 'maghrib', fastMonThu: 'maghrib', nameDay: 'sunrise' }
export const minKey = (k: ReminderKind) => `${k}Min` as const

export const anyExtraOn = (r: ExtraReminders | undefined) => !!r && REMINDER_KINDS.some((k) => r[k])

export function readExtra(v: Partial<ExtraReminders> | null | undefined): ExtraReminders {
  const o = v ?? {}
  const r = { ...EXTRA_DEFAULTS }
  for (const k of REMINDER_KINDS) {
    r[k] = o[k] === true
    r[minKey(k)] = extraMinutes(o[minKey(k)], EXTRA_DEFAULTS[minKey(k)])
  }
  return r
}

export type ReminderHadith = { id: string; version: string; gradeAr: string; attributionAr: string; quote: Record<string, string>; translated: string[] }
/**
 * The reminders' hadiths (their «فضل»), off until the coordinator's approval add-on (add-on 0072-add34 §أ3: a religious
 * text not yet reviewed is not shipped; the review is relay/w1/0072-review-queue/reminders.html). Off: each reminder is
 * its own line only, and its page has no hadith. On after the approval: this line becomes `true` (a build with
 * VITE_REMINDER_VIRTUE=1 shows it before, for the review's shots only).
 */
export const REMINDER_VIRTUE: boolean = import.meta.env.VITE_REMINDER_VIRTUE === '1'
export type ReminderHadiths = Partial<Record<ReminderKind, ReminderHadith>>
/** The hadiths, only while REMINDER_VIRTUE is on: off, the build carries none of their texts (Opus review of c9b80f1). */
export const REMINDER_HADITHS: ReminderHadiths = REMINDER_VIRTUE ? (hadiths as ReminderHadiths) : {}
/** The hadiths the reminders' pages read by id: they go into the app's offline copy (web/scripts/native-offline-gen.ts),
 *  only while they are shown. */
export const reminderHadithIds = (h: ReminderHadiths = REMINDER_HADITHS) => REMINDER_KINDS.map((k) => h[k]?.id).filter((x): x is string => !!x)

/** The page a reminder opens: its words, the hadith with its link, and the way on (the sura, the name, the calendar). */
export const reminderPath = (k: ReminderKind) => `/today/reminder/${k}`
export const isReminderKind = (k: unknown): k is ReminderKind => (REMINDER_KINDS as readonly unknown[]).includes(k)

const DAY_MS = 86_400_000
/** The weekday of a civil date (0 Sunday … 5 Friday, 6 Saturday), with no time zone involved. */
export const weekday = (d: Ymd) => new Date(Date.UTC(d.y, d.m - 1, d.d)).getUTCDay()
const nextDay = (d: Ymd): Ymd => {
  const t = new Date(Date.UTC(d.y, d.m - 1, d.d + 1))
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}
/** The Umm al-Qura date of a civil date, with the Hijri offset the calendar and the date card apply (the user's and the
 *  server's, hijri.ts totalOffset): noon UTC of that date read in UTC, so no time zone moves it. Null when the engine
 *  lacks Umm al-Qura (no fasting-day reminder then, rather than a guessed date). */
export const hijriOf = (d: Ymd, offset: number) => hijriParts(new Date(Date.UTC(d.y, d.m - 1, d.d, 12)), offset, 'UTC')

/** A day on which no voluntary fast is reminded: Ramadan (its fast is the obligation), the two Eids (1 Shawwal,
 *  10 Dhu al-Hijjah; HadeethEnc 10603, agreed upon: «ولا صوم في يومين: الفطر والأضحى») and the days of Tashreeq (11–13
 *  Dhu al-Hijjah; HadeethEnc 65519, Muslim: «أيام التشريق أيام أكل وشرب»). */
export function noVoluntaryFast(h: { day: number; month: number }) {
  if (h.month === 9) return true
  if (h.month === 10 && h.day === 1) return true
  if (h.month === 12 && h.day >= 10 && h.day <= 13) return true
  return false
}

/** The name of a Riyadh date, by the daily names file's rule (its epoch and order, copied into data/reminders.json without the readings, which reach the app from the server only): days from the epoch, mod the entries, never negative. */
export function nameOfRiyadhDay(day: string): string {
  const list = names.list
  const d = Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${names.epoch}T00:00:00Z`)) / DAY_MS)
  return list[((d % list.length) + list.length) % list.length]
}
/** The Riyadh date (UTC+3, no daylight saving) at an instant: the day the name's card shows then. */
export const riyadhDay = (at: number) => new Date(at + 3 * 3600_000).toISOString().slice(0, 10)

/** Which of the day's fasting reminders apply on the evening of `day` (for the fast of the day after). The Monday and
 *  Thursday one gives way when tomorrow is also one of al-ayyam al-bid: one reminder that evening, not two. */
export function fastingFor(day: Ymd, offset: number, on: Pick<ExtraReminders, 'fastBid' | 'fastMonThu'>): { bid?: 13 | 14 | 15; monThu?: 'mon' | 'thu' } {
  const tomorrow = nextDay(day)
  const h = hijriOf(tomorrow, offset)
  if (!h || noVoluntaryFast(h)) return {}
  const bid = on.fastBid && (h.day === 13 || h.day === 14 || h.day === 15) ? (h.day as 13 | 14 | 15) : undefined
  const w = weekday(tomorrow)
  const monThu = on.fastMonThu && !bid && (w === 1 || w === 4) ? (w === 1 ? 'mon' : 'thu') : undefined
  return { ...(bid ? { bid } : {}), ...(monThu ? { monThu } : {}) }
}

/** The quote's marks per script: «…» for Arabic and Urdu, « … » for French, “…” for the others. */
const mark = (lang: string, q: string) => (lang === 'ar' || lang === 'ur' ? `«${q}»` : lang === 'fr' ? `« ${q} »` : `“${q}”`)

/** A reminder's body after its own line: the Arabic quote; the reader's language from HadeethEnc when it has it; then
 *  the grade and the takhrij as the Arabic row gives them. */
export function hadithLines(k: ReminderKind, lang: string, source: ReminderHadiths = REMINDER_HADITHS): string[] {
  const h = source[k]
  if (!h?.quote.ar) return []
  const out = [mark('ar', h.quote.ar)]
  if (lang !== 'ar' && h.quote[lang]) out.push(mark(lang, h.quote[lang]))
  out.push(`${h.gradeAr} · ${h.attributionAr}`)
  return out
}

export type ReminderAlert = { kind: ReminderKind; at: number; title: string; body: string; url: string }

/** The reminders of one civil day of the place, after `now` (the planner keeps the 64). */
export function remindersOfDay(day: Ymd, t: Pick<DayTimes, 'sunrise' | 'maghrib'>, r: ExtraReminders, lang: string, hijriOffset: number, source: ReminderHadiths = REMINDER_HADITHS): ReminderAlert[] {
  const s = REMINDER_TEXT[lang] ?? REMINDER_TEXT.ar
  const L = REMINDER_TEXT[lang] ? lang : 'ar'
  const at = (k: ReminderKind) => t[ANCHOR[k]].getTime() + r[minKey(k)] * 60_000
  const out: ReminderAlert[] = []
  const push = (kind: ReminderKind, title: string, line: string, when = at(kind)) => {
    if (!Number.isFinite(when)) return
    out.push({ kind, at: when, title, body: [line, ...hadithLines(kind, L, source)].join('\n'), url: reminderPath(kind) })
  }
  if (r.friday && weekday(day) === 5) push('friday', s.fridayTitle, s.fridayLine)
  if (r.fastBid || r.fastMonThu) {
    const f = fastingFor(day, hijriOffset, r)
    if (f.bid) push('fastBid', s.bidTitle, s.bidLine[f.bid])
    if (f.monThu) push('fastMonThu', f.monThu === 'mon' ? s.monTitle : s.thuTitle, f.monThu === 'mon' ? s.monLine : s.thuLine)
  }
  if (r.nameDay) {
    const when = at('nameDay')
    if (Number.isFinite(when)) push('nameDay', s.nameTitle, nameOfRiyadhDay(riyadhDay(when)), when)
  }
  return out
}

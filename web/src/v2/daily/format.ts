// Formatting for the daily screens: every number, time and date through Intl in the interface language (Arabic with
// Eastern Arabic digits, like the rest of the interface), plural forms through Intl.PluralRules.
import type { Lang } from '../../../../shared/api'
import { numberLocale } from '../../i18n'
import type { Plural } from './strings-today'

export const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? `{${k}}`))

const loc = (lang: Lang) => numberLocale(lang)

/** «٣:٠٠ م» / "3:00 PM" in the place's time zone. */
export const timeOf = (d: Date, lang: Lang, timeZone: string) =>
  new Intl.DateTimeFormat(loc(lang), { timeZone, hour: 'numeric', minute: '2-digit' }).format(d)

/** A number in the interface language's digits. */
export const num = (n: number, lang: Lang, digits = 0) =>
  new Intl.NumberFormat(loc(lang), { maximumFractionDigits: digits, useGrouping: false }).format(n)

/** The plural form for n. */
export function plural(p: Plural, n: number, lang: Lang, vars: Record<string, string | number> = {}) {
  const rule = n === 0 && p.zero ? 'zero' : (new Intl.PluralRules(lang).select(n) as keyof Plural)
  return fill(p[rule] ?? p.other, { n: num(n, lang), ...vars })
}

/** A time left («ساعتين و٣٥ دقيقة», "2 hours 35 minutes"), in the forms that follow «بعد» / "in". */
export function duration(ms: number, lang: Lang, st: { hours: Plural; minutes: Plural; hm: string }): string {
  const total = Math.max(1, Math.round(ms / 60_000))
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (!hours) return plural(st.minutes, minutes, lang)
  if (!minutes) return plural(st.hours, hours, lang)
  return fill(st.hm, { h: plural(st.hours, hours, lang), m: plural(st.minutes, minutes, lang) })
}

/** A distance: metres under 1 km (rounded to 10), else km with one decimal. */
export const distanceText = (m: number, lang: Lang) =>
  m < 1000
    ? new Intl.NumberFormat(loc(lang), { style: 'unit', unit: 'meter', unitDisplay: 'short' }).format(Math.round(m / 10) * 10)
    : new Intl.NumberFormat(loc(lang), { style: 'unit', unit: 'kilometer', unitDisplay: 'short', maximumFractionDigits: 1 }).format(m / 1000)

const gregTag = (lang: Lang) => `${lang}-u-ca-gregory${lang === 'ar' ? '-nu-arab' : ''}`

/** The Gregorian date written in the interface language («١٣ أكتوبر»), in a time zone. */
export const gregorianText = (d: Date, lang: Lang, opts: Intl.DateTimeFormatOptions, timeZone?: string) =>
  new Intl.DateTimeFormat(gregTag(lang), { ...opts, ...(timeZone ? { timeZone } : {}) }).format(d)

/** The Hijri date (Umm al-Qura, named explicitly) written in the interface language, or null without the calendar. */
export function hijriWritten(d: Date, lang: Lang, opts: Intl.DateTimeFormatOptions, timeZone?: string): string | null {
  try {
    const f = new Intl.DateTimeFormat(`${lang === 'ar' ? 'ar-SA' : lang}-u-ca-islamic-umalqura${lang === 'ar' ? '-nu-arab' : ''}`, {
      ...opts,
      ...(timeZone ? { timeZone } : {}),
    })
    return f.resolvedOptions().calendar === 'islamic-umalqura' ? f.format(d) : null
  } catch {
    return null
  }
}

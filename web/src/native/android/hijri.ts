// Umm al-Qura dates in the Android app (reply 0067): Android's web view keeps the calendar's numbers but writes the
// Gregorian month names and era for every language but Arabic («May 4, 1448 BC» where the iPhone writes «Jumada I 4,
// 1448 AH»; WebView 113 and 145). In the Android app only, and only for a language the web view gets wrong (checked
// once, at start), Intl.DateTimeFormat for the islamic-umalqura calendar is given CLDR's own month and era names
// (hijri-names.ts), inside the web view's own parts: its order, its digits, its punctuation. Everything else is the
// engine's. So daily/hijri.ts, v2/home/hijri-disc.ts and v2/daily/format.ts (the card, the calendar, the times page and
// the widgets' data) write what the iPhone writes, with no change of their own.
import { isAndroid } from '../platform'
import { HIJRI_NAMES } from './hijri-names'

type Parts = Intl.DateTimeFormatPart[]

/** The month's number (1–12) of an instant in Umm al-Qura, in a time zone. */
const monthNumber = (Real: typeof Intl.DateTimeFormat, at: Date | number | undefined, timeZone: string) =>
  Number(
    new Real('en-u-ca-islamic-umalqura-nu-latn', { month: 'numeric', timeZone })
      .formatToParts(at ?? Date.now())
      .find((p) => p.type === 'month')?.value,
  )

/** The web view's parts with CLDR's month (long or short, as asked) and era names in place of the Gregorian ones. */
export function fixParts(parts: Parts, lang: string, month: number, style: string | undefined): Parts {
  const names = HIJRI_NAMES[lang]
  if (!names || !(month >= 1 && month <= 12)) return parts
  return parts.map((p) => {
    if (p.type === 'month' && (style === 'long' || style === 'short') && !/^[\p{Nd}]+$/u.test(p.value)) return { ...p, value: names[style][month - 1] }
    if (p.type === 'era') return { ...p, value: names.era }
    return p
  })
}

/** The languages whose Umm al-Qura month the engine writes with a Gregorian name (15 October 2026 is Jumada I 4). */
export function wrongLanguages(Real: typeof Intl.DateTimeFormat = Intl.DateTimeFormat): string[] {
  const at = new Date(Date.UTC(2026, 9, 15, 12))
  return Object.keys(HIJRI_NAMES).filter((l) => {
    try {
      const hijri = new Real(`${l}-u-ca-islamic-umalqura`, { month: 'long', timeZone: 'UTC' }).format(at)
      const gregorian = new Real(`${l}-u-ca-gregory`, { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 4, 15)))
      return hijri === gregorian
    } catch {
      return false
    }
  })
}

let installed = false
export function installAndroidHijri() {
  if (!isAndroid() || installed) return
  installed = true
  const Real = Intl.DateTimeFormat
  const wrong = new Set(wrongLanguages(Real))
  if (!wrong.size) return
  const Patched = function (this: unknown, locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
    const f = new Real(locales, options)
    const ro = f.resolvedOptions()
    const lang = ro.locale.split('-')[0]
    if (ro.calendar !== 'islamic-umalqura' || !wrong.has(lang)) return f
    const parts = (at?: Date | number) => fixParts(f.formatToParts(at), lang, monthNumber(Real, at, ro.timeZone), ro.month)
    // Own properties: the prototype's format is a getter, which an assignment cannot override.
    const own = (value: unknown) => ({ value, enumerable: false, configurable: true, writable: true })
    return Object.create(Real.prototype, {
      format: own((at?: Date | number) => parts(at).map((p) => p.value).join('')),
      formatToParts: own(parts),
      resolvedOptions: own(() => ro),
      formatRange: own(f.formatRange?.bind(f)),
      formatRangeToParts: own(f.formatRangeToParts?.bind(f)),
    }) as Intl.DateTimeFormat
  } as unknown as typeof Intl.DateTimeFormat
  Object.defineProperty(Patched, 'prototype', { value: Real.prototype })
  if (Real.supportedLocalesOf) Object.defineProperty(Patched, 'supportedLocalesOf', { value: Real.supportedLocalesOf.bind(Real) })
  Intl.DateTimeFormat = Patched
}

// The Hijri date (reply 0031-add10, §5): Intl with the Umm al-Qura calendar named explicitly
// (…-u-ca-islamic-umalqura). Never plain `islamic` (a day off at times) nor plain ar-SA (Gregorian in some engines).
// When the engine lacks Umm al-Qura (Intl.supportedValuesOf('calendar')), nothing is shown: no fallback table.
// Offsets: the user's (±1/±2) plus a global one from the server's config, set after the Supreme Court's announcement.

export const HIJRI_NOTE = 'وفق تقويم أم القرى، والعبرة في رمضان والعيدين بإعلان المحكمة العليا'

export function umalquraSupported(): boolean {
  try {
    const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('calendar')
    if (list) return list.includes('islamic-umalqura')
    return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura').resolvedOptions().calendar === 'islamic-umalqura'
  } catch {
    return false
  }
}

const DAY = 86_400_000

/** Day, month, year in Umm al-Qura for an instant (in `timeZone`, default the device's), after `offsetDays`. */
export function hijriParts(at: Date, offsetDays = 0, timeZone?: string): { day: number; month: number; year: number } | null {
  if (!umalquraSupported()) return null
  const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric', ...(timeZone ? { timeZone } : {}) })
  const p = f.formatToParts(new Date(at.getTime() + offsetDays * DAY))
  const n = (t: string) => Number.parseInt(p.find((x) => x.type === t)?.value ?? '', 10)
  const r = { day: n('day'), month: n('month'), year: n('year') }
  return Number.isFinite(r.day) && Number.isFinite(r.month) && Number.isFinite(r.year) ? r : null
}

/** The date written in a language (Arabic default), e.g. «٢١ ربيع الآخر ١٤٤٨ هـ». */
export function hijriText(at: Date, lang = 'ar', offsetDays = 0, timeZone?: string): string | null {
  if (!umalquraSupported()) return null
  const tag = `${lang === 'ar' ? 'ar-SA' : lang}-u-ca-islamic-umalqura`
  return new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric', ...(timeZone ? { timeZone } : {}) }).format(new Date(at.getTime() + offsetDays * DAY))
}

/** The total offset: the user's (clamped to ±2) plus the server's global one (clamped to ±2). */
export const totalOffset = (user: number, global: number) => Math.max(-2, Math.min(2, Math.trunc(user) || 0)) + Math.max(-2, Math.min(2, Math.trunc(global) || 0))

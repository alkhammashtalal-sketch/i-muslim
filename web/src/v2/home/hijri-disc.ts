// The Hijri date on the day card's disc (Umm al-Qura through Intl), shared with the iOS widgets (reply 0046), so the
// widget's date is the card's own: the day, the month, the year (with «هـ» in Arabic), and the full date.
import { umalquraSupported } from '../../daily/hijri'

export type HijriDisc = { day: string; month: string; year: string; full: string }

export function hijriDisc(lang: string, at: Date, timeZone?: string): HijriDisc | null {
  if (!umalquraSupported()) return null
  const tag = `${lang === 'ar' ? 'ar' : lang}-u-ca-islamic-umalqura${lang === 'ar' ? '-nu-arab' : ''}`
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric', ...(timeZone ? { timeZone } : {}) }
  const p = new Intl.DateTimeFormat(tag, opts).formatToParts(at)
  const v = (t: string) => p.find((x) => x.type === t)?.value ?? ''
  // The era «هـ» as on the board, in Arabic; other languages write it as a word (ہجری, AH…) that does not fit the
  // disc, so there the disc shows the year alone and the card's label carries the full date with its era.
  const era = v('era')
  const year = era && lang === 'ar' ? `${v('year')}${era.trim()}` : v('year')
  return { day: v('day'), month: v('month'), year, full: new Intl.DateTimeFormat(tag, opts).format(at) }
}

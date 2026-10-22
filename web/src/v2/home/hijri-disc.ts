// The Hijri date on the day card's disc (Umm al-Qura through Intl), shared with the iOS widgets (reply 0046), so the
// widget's date is the card's own: the day, the month, the year (with «هـ» in Arabic), and the full date. The card
// passes the Hijri offset (add-on 0071-add15 §3); the widgets' file (native/widget-data.ts) does not yet.
import { umalquraSupported } from '../../daily/hijri'

export type HijriDisc = { day: string; month: string; year: string; full: string }

/** `offsetDays`: the Hijri offset in days (the user's and the global one, web/src/daily/hijri.ts totalOffset), applied
 *  as hijriParts applies it, so the card's disc and its occasion line name the same day (add-on 0071-add15 §3). */
export function hijriDisc(lang: string, at: Date, timeZone?: string, offsetDays = 0): HijriDisc | null {
  if (!umalquraSupported()) return null
  if (offsetDays) at = new Date(at.getTime() + offsetDays * 86_400_000)
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

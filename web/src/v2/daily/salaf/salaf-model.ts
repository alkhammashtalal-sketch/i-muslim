// «من أقوال السلف» (reply 0072 item 11; add-on 0072-add4): one short saying a day for everyone, from
// data/salaf-daily.json (scripts/salaf/salaf-build.mjs, from the cards reviewed in relay/w1/0072-salaf). The day's card:
// (the Riyadh day − the list's epoch, 2026-01-01) mod the list length, in the list's pre-set order, so that no two
// consecutive days share a sayer or a topic, the wrap included (§5 ب). New batches go at the end; the old order stays.
// Arabic interface only (§5 أ): no translation, no machine translation, so nothing in any other interface.
import data from '../../../../../data/salaf-daily.json'
import { riyadhDayNumber } from '../../home/daily-ayah'

export type SalafCard = {
  n: number
  day: number
  topic: string
  /** The text as shown: the source's words without the edition's diacritics, with the logged fixes (§3, §5 ج). */
  text: string
  /** The narrator's gloss inside the text (card 23), shown in a lighter ink (§3). */
  gloss?: string
  attribution: 'qala' | 'yurwa'
  sayer: string
  book: string
  book_title: string
  /** The author as known (add-on 0072-add7 §3.4), and as read after «لـ» on the card: «للإمام أحمد بن حنبل». */
  author: string
  author_by: string
  vol_page: string
  url: string
}

export const SALAF_CARDS = data.cards as SalafCard[]
export const SALAF_EPOCH = data.epoch

const DAY = 86_400_000
const epochDay = Math.floor(Date.parse(`${SALAF_EPOCH}T00:00:00Z`) / DAY)

/** The card is shown in the Arabic interface only (data `show_when_interface_lang`). */
export const salafShown = (lang: string): boolean => lang === data.show_when_interface_lang

/** The list position for the day at `now`, by the Riyadh date: never negative, also before the epoch. */
export function salafIndex(now = Date.now(), n = SALAF_CARDS.length): number {
  if (n <= 0) return -1
  const d = riyadhDayNumber(now) - epochDay
  return ((d % n) + n) % n
}

export const salafOfDay = (now = Date.now()): SalafCard | null => SALAF_CARDS[salafIndex(now)] ?? null

/** The Riyadh date of `now` (UTC+3): the day whose saying it is, for the share image's Hijri date. */
export const salafDay = (now = Date.now()) => new Date(now + 3 * 3600_000).toISOString().slice(0, 10)

/** «قال فلان» or «يُروى عن فلان», as the review decided for each card (§1). */
export const salafAttribution = (c: SalafCard): string => (c.attribution === 'yurwa' ? `يُروى عن ${c.sayer}` : `قال ${c.sayer}`)

/** «ج3، ص65» from the Shamela form «ج3 - ص65»; «ص99» as it is. */
export const salafVolPage = (c: SalafCard): string => c.vol_page.replace(/\s*-\s*/g, '، ')

/** The source line before the link (add-on 0072-add7 §3.4): «الزهد» للإمام أحمد بن حنبل، ص99. */
export const salafSource = (c: SalafCard): string => `«${c.book_title}» ${c.author_by}، ${salafVolPage(c)}`

/** The text in its parts: the gloss apart, so it takes the lighter ink; the parts joined are the text exactly. */
export function salafParts(c: SalafCard): { text: string; gloss: boolean }[] {
  const at = c.gloss ? c.text.indexOf(c.gloss) : -1
  if (!c.gloss || at < 0) return [{ text: c.text, gloss: false }]
  return [
    { text: c.text.slice(0, at), gloss: false },
    { text: c.gloss, gloss: true },
    { text: c.text.slice(at + c.gloss.length), gloss: false },
  ].filter((p) => p.text)
}

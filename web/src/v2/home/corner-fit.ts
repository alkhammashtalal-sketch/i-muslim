// Where the date card's weekday and Gregorian date go (add-on 0071-add16 §5, Team B §6): in the sky's two lower corners
// while each fits, on one line, in one of the two gold-free boxes of its corner; otherwise both on one line under the
// card. The painting's own gold (its rays and stars) bounds what a corner holds: a date that wrapped there crossed the
// gold even with no wash (2.15:1 at 320 px).
//
// The boxes, measured on the painting, in shares of the sky box (1034 × 711 of the 1200 × 865 painting), each set
// 1.7% in from the side and 7.3% up from the foot (where the corner texts already sit):
//   M1: 24.6% wide and 13.0% tall;  M2: 30.8% wide and 9.2% tall.
// Decided once per language, text size and card width, with the longest weekday of the seven and the longest date of
// the year's twelve months (so the layout does not move from one month to the next), and the font is never made
// smaller to fit (Sama follows the phone's text size). The long date form when every month's fits, else the short form
// when every month's fits, else under the card.
import { useLayoutEffect, useState, type RefObject } from 'react'

export type CornerMode = 'long' | 'short' | 'under'
export const BOXES = [
  { w: 0.246, h: 0.13 },
  { w: 0.308, h: 0.092 },
] as const
const SKY_W = 1034 / 1200
const SKY_H = 711 / 865

/** Whether a text of this one-line width and line height fits one of the boxes of a card this size (the texts sit on
 *  the boxes' own anchors, home.css .dd-corner). */
export const fitsCorner = (width: number, lineHeight: number, card: { width: number; height: number }) =>
  BOXES.some((b) => width <= b.w * SKY_W * card.width && lineHeight <= b.h * SKY_H * card.height)

/** The longest strings to try: the seven weekdays, and the twelve months' dates (on the 28th) in both forms. */
export function cornerTexts(locale: string, year: number) {
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, o)
  const wd = f({ weekday: 'long' })
  const long = f({ day: 'numeric', month: 'long', year: 'numeric' })
  const short = f({ day: 'numeric', month: 'short', year: 'numeric' })
  // 22–28 October 2026 is a whole week; noon, so no time zone moves the day.
  const weekdays = Array.from({ length: 7 }, (_, i) => wd.format(new Date(2026, 9, 22 + i, 12)))
  const months = Array.from({ length: 12 }, (_, m) => new Date(year, m, 28, 12))
  return { weekdays, long: months.map((d) => long.format(d)), short: months.map((d) => short.format(d)) }
}

export function useCornerMode(card: RefObject<HTMLElement | null>, locale: string, year: number): CornerMode {
  const [mode, setMode] = useState<CornerMode>('long')
  useLayoutEffect(() => {
    const el = card.current
    if (!el) return
    // Two hidden probes in the corner's own type (home.css .dd-probe): one measures, one stays as it is so a change of
    // text size shows.
    const probe = document.createElement('span')
    probe.className = 'dd-probe'
    probe.setAttribute('aria-hidden', 'true')
    const sentinel = probe.cloneNode() as HTMLSpanElement
    sentinel.textContent = 'م'
    // In the body, out of the card React draws.
    document.body.append(probe, sentinel)
    const texts = cornerTexts(locale, year)
    let frame = 0
    const measure = () => {
      const box = el.getBoundingClientRect()
      if (!box.width) return
      const lh = parseFloat(getComputedStyle(probe).lineHeight) || 16
      const fits = (t: string) => {
        probe.textContent = t
        return fitsCorner(probe.getBoundingClientRect().width, lh, box)
      }
      const days = texts.weekdays.every(fits)
      setMode(days && texts.long.every(fits) ? 'long' : days && texts.short.every(fits) ? 'short' : 'under')
    }
    const later = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(measure)
    }
    measure()
    const ro = new ResizeObserver(later)
    ro.observe(el)
    ro.observe(sentinel)
    document.fonts?.ready.then(later, () => undefined)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      probe.remove()
      sentinel.remove()
    }
  }, [card, locale, year])
  return mode
}

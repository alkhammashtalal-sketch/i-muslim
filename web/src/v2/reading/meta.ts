// Positions in the Mushaf (reply 0032 C), from quran-meta.json (scripts/reading/build-reading.mjs: QuranData of the
// KSU archive and mp3quran's reads.json). Numbers only; the Quran's text always comes from D1.
import meta from './quran-meta.json'

export type Pos = [number, number] // [sura, aya]
export const JUZ = meta.juz as Pos[]
export const QUARTERS = meta.quarters as Pos[]
export const PAGES = meta.pages as Pos[]
export const SAJDA = meta.sajda as Pos[]
export const SURA_TYPE = meta.suraType as ('makki' | 'madani' | null)[]
export const RIWAYA = meta.riwaya as Record<string, string | null>

const cmp = (a: Pos, b: Pos) => a[0] - b[0] || a[1] - b[1]
/** Index of the last start at or before a position (starts sorted). */
function lastAtOrBefore(starts: Pos[], p: Pos) {
  let lo = 0
  let hi = starts.length - 1
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (cmp(starts[mid], p) <= 0) lo = mid
    else hi = mid - 1
  }
  return lo
}

/** The Mushaf page (1–604) of an ayah. */
export const pageOf = (sura: number, aya: number) => lastAtOrBefore(PAGES, [sura, aya]) + 1
/** The juz (1–30) of an ayah. */
export const juzOf = (sura: number, aya: number) => lastAtOrBefore(JUZ, [sura, aya]) + 1
export const isSajda = (sura: number, aya: number) => SAJDA.some(([s, a]) => s === sura && a === aya)

/** The quarter at index q (0–239): its hizb (1–60) and its place in the hizb (0 = the hizb's start, 1–3 quarters). */
export const quarterInfo = (q: number) => ({ hizb: Math.floor(q / 4) + 1, part: q % 4, juz: Math.floor(q / 8) + 1 })

/** The first words of an ayah's text, cut from the text itself (never typed): four words, the quarter sign ۞ when it
 *  opens the ayah counted apart; «…» only when the ayah goes on. */
export function firstWords(text: string, words = 4): { cut: string; more: boolean } {
  const tokens = text.trim().split(/\s+/)
  const n = tokens[0] === '۞' ? words + 1 : words
  return { cut: tokens.slice(0, n).join(' '), more: tokens.length > n }
}

export const SURA_AYAT = meta.suraAyat as number[]

/** The ayah just before a position (the last ayah of the previous sura at an ayah 1). */
export const before = ([s, a]: Pos): Pos => (a > 1 ? [s, a - 1] : [s - 1, SURA_AYAT[s - 1]])

/** Ayah ranges dividing the Quran into `days` portions: by juz for 30, else by pages (604 / days, rounded); each
 *  portion runs from its start to the ayah before the next one, the last to the end of the Mushaf. */
export function portions(days: number): { from: Pos; to: Pos }[] {
  const n = Math.max(1, Math.min(604, Math.round(days)))
  const starts: Pos[] = n === 30 ? JUZ : Array.from({ length: n }, (_, i) => PAGES[Math.min(603, Math.round((i * 604) / n))])
  const uniq = starts.filter((p, i) => i === 0 || cmp(p, starts[i - 1]) !== 0)
  return uniq.map((from, i) => ({ from, to: i + 1 < uniq.length ? before(uniq[i + 1]) : [114, SURA_AYAT[114]] }))
}

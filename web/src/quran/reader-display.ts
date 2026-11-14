import { useSyncExternalStore } from 'react'
import { loadPrefs, savePrefs } from './prefs'
import { arabicDigits } from './format'

// The reader's font and sizes (add-on 0072-add60 §5): the Mushaf's font, the size of the Quranic text, of the
// translation of the meanings and of the tafsir, each on its own, and the digits of the ayah markers. Kept with the
// reader's preferences («imuslim.reader.v1», which the iPhone copies to the person's iCloud: storage/cloud.ts), and set
// on the root as CSS variables that quran.css reads. Display only: the Quranic text is never changed, only drawn
// larger or smaller, in one of the two faces of the Amiri family (OFL, shipped with the app: CLAUDE.md §8), or in the
// King Fahd Complex's «KFGQPC HAFS Uthmanic Script» (add-on 0072-add62 §4: an exception to §8 on its licence).

/** Amiri (the app's Naskh), Amiri Quran (the same family's face drawn for the Mushaf), or «حفص العثماني», the King Fahd
 *  Complex's Uthmanic Hafs font, version 0.13 from its own site, shipped unmodified as its licence requires (the only
 *  version of it that has every code point of source (أ)'s text, U+0622 among them: docs/sources-quran-reader.md). */
export const QURAN_FONTS = ['amiri', 'amiri-quran', 'hafs'] as const
export type QuranFont = (typeof QURAN_FONTS)[number]
/** The ayah markers' digits: Arabic-Indic «١٢٣», as in the Mushaf (the default), or «123». */
export const DIGITS = ['arab', 'latn'] as const
export type Digits = (typeof DIGITS)[number]
/** The steps of each size, as a factor of the size the reader had before (1). The Quranic text goes further up. */
export const QURAN_STEPS = [0.85, 1, 1.15, 1.3, 1.5, 1.75] as const
export const TEXT_STEPS = [0.9, 1, 1.15, 1.3, 1.5] as const
export type ReaderDisplay = { quran: number; translation: number; tafsir: number; digits: Digits; font: QuranFont }
export const DEFAULT_DISPLAY: ReaderDisplay = { quran: 1, translation: 1, tafsir: 1, digits: 'arab', font: 'amiri' }

const pick = <T>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback)
/** A stored value made safe: unknown steps, digits or fonts fall back to the defaults. */
export function cleanDisplay(v: unknown): ReaderDisplay {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<Record<keyof ReaderDisplay, unknown>>
  return {
    quran: pick(o.quran, QURAN_STEPS as readonly number[], 1),
    translation: pick(o.translation, TEXT_STEPS as readonly number[], 1),
    tafsir: pick(o.tafsir, TEXT_STEPS as readonly number[], 1),
    digits: pick(o.digits, DIGITS, 'arab'),
    font: pick(o.font, QURAN_FONTS, 'amiri'),
  }
}

let display: ReaderDisplay = cleanDisplay(loadPrefs().display)
const listeners = new Set<() => void>()

/** The CSS variables and the font's attribute on the root (quran.css). */
export function applyDisplay(d: ReaderDisplay = display, root: HTMLElement | null = typeof document === 'undefined' ? null : document.documentElement) {
  if (!root) return
  root.style.setProperty('--rd-quran-scale', String(d.quran))
  root.style.setProperty('--rd-trans-scale', String(d.translation))
  root.style.setProperty('--rd-tafsir-scale', String(d.tafsir))
  if (d.font === 'amiri') delete root.dataset.quranFont
  else root.dataset.quranFont = d.font
}
applyDisplay()

export function setDisplay(patch: Partial<ReaderDisplay>) {
  display = cleanDisplay({ ...display, ...patch })
  savePrefs({ display })
  applyDisplay()
  for (const f of listeners) f()
}
export const resetDisplay = () => setDisplay(DEFAULT_DISPLAY)
export const getDisplay = () => display

export function useReaderDisplay(): ReaderDisplay {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f)
      return () => void listeners.delete(f)
    },
    () => display,
    () => display,
  )
}

/** The next step up or down from a value (the same value at either end). */
export function stepFrom(steps: readonly number[], v: number, d: 1 | -1): number {
  const i = Math.max(0, steps.indexOf(v))
  return steps[Math.min(steps.length - 1, Math.max(0, i + d))]
}

/** An ayah marker's number in the digits chosen. */
export const ayahDigits = (n: number, digits: Digits) => (digits === 'latn' ? String(n) : arabicDigits(n))


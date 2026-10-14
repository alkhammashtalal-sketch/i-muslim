// The tasbih's words, steps and saved state, shared by the screen (Tasbih.tsx) and the iOS widgets (reply 0046,
// web/src/native/widget-data.ts), so both count the same words the same way. The words are cut at run time from
// sahih hadiths (data/tasbih-after-prayer.json: 5475 and 10947), and «بعد الصلاة» follows hadith 10948 word for word.
import data from '../../../../../data/tasbih-after-prayer.json'
import { cutVerbatim } from '../verbatim'

export type Limit = 33 | 100 | 0
export type TasbihSaved = { day: string; total: number; word: number; limit: Limit; n: number; custom: string; vibrate: boolean; after: boolean; step: number }
export const TASBIH_KEY = 'muslim.tasbih.v1'
export const tasbihToday = () => new Date().toLocaleDateString('en-CA')
export const TASBIH_DEFAULTS: TasbihSaved = { day: tasbihToday(), total: 0, word: 0, limit: 33, n: 0, custom: '', vibrate: true, after: false, step: 0 }
export const TASBIH_HADITHS = [...new Set([data.id, ...data.words.map((w) => w.id)])]

export function loadTasbih(): TasbihSaved {
  try {
    const v = { ...TASBIH_DEFAULTS, ...(JSON.parse(localStorage.getItem(TASBIH_KEY) ?? '{}') as Partial<TasbihSaved>) }
    return v.day === tasbihToday() ? v : { ...v, day: tasbihToday(), total: 0 }
  } catch {
    return TASBIH_DEFAULTS
  }
}

/** The words, with the source's own diacritics, cut from the hadith texts. */
export const tasbihWords = (texts: Record<string, { text: string }>) =>
  data.words.map((w) => {
    const located = cutVerbatim(texts[w.id].text, w.phrase)
    return located && w.cut ? cutVerbatim(located, w.cut) : located
  })

/** «بعد الصلاة»: 33, 33, 33, then the hundredth, as hadith 10948 words them. */
export const tasbihSteps = (texts: Record<string, { text: string }>) =>
  data.steps.map((x) => ({ words: cutVerbatim(texts[data.id].text, x.phrase), label: x.label ? cutVerbatim(texts[data.id].text, x.label) : null, count: x.count }))

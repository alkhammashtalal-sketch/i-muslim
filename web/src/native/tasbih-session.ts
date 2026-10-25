// «جلسة تسبيح بعد الصلاة» on the iPhone's Lock Screen and Dynamic Island (add-on 0072-add19 §3): a Live Activity
// started from the tasbih page, going through the steps of the hadith with their numbers as the hadith gives them
// (hadith 10948: 33, 33, 33, then the hundredth; or hadith 6259: 33, 33, 34), «+١» in the card and the Island, the
// next step by itself at each step's number, and its end by itself once done or at Apple's limit (8 hours active).
// The words of each step are cut from the hadith's own text (tasbih-model.ts); no count is shown without its text.
// Native side: web/ios/App/App/TasbihSessionPlugin.swift and web/ios/App/Shared/TasbihSession.swift.
import { registerPlugin } from '@capacitor/core'
import type { ToolHadith } from '../v2/daily/api'
import { tasbihAltSteps, tasbihSteps, TASBIH_ALT_ID } from '../v2/daily/tasbih/tasbih-model'
import data from '../../../data/tasbih-after-prayer.json'
import type { AlertText } from './alert-strings'

export type Narration = 'hundred' | 'thirtyFour'
export type SessionStep = { zikr: string; target: number }
export type SessionStart = {
  title: string
  steps: SessionStep[]
  /** «صحيح — رواه مسلم · موسوعة الأحاديث النبوية»: the hadith's grade and attribution as served, and the source. */
  source: string
  done: string
  digits: string
  rtl: boolean
}
type Plugin = {
  available(): Promise<{ supported: boolean; enabled: boolean }>
  start(o: SessionStart): Promise<{ ok: boolean; error?: string }>
  end(): Promise<void>
  active(): Promise<{ active: boolean }>
}
export const TasbihSession = registerPlugin<Plugin>('TasbihSession')

/** The hadith each narration counts from. */
export const NARRATION_ID: Record<Narration, string> = { hundred: data.id, thirtyFour: TASBIH_ALT_ID }

/** The steps of a narration, each word from its hadith's text; null when a word is not found (then no session). */
export function sessionSteps(n: Narration, texts: Record<string, { text: string }>): SessionStep[] | null {
  if (!texts[NARRATION_ID[n]]) return null
  const steps = n === 'hundred' ? tasbihSteps(texts) : tasbihAltSteps(texts)
  const out = steps.map((x) => ({ zikr: x.label ?? x.words ?? '', target: x.count }))
  return out.every((x) => x.zikr && x.target > 0) ? out : null
}

/** The session's source line, in the interface language when the hadith's translation carries it. */
export function sessionSource(h: ToolHadith, t: AlertText): string {
  const grade = h.translation?.grade ?? h.grade ?? ''
  const by = h.translation?.attribution ?? h.attribution ?? ''
  return [[grade, by].filter(Boolean).join(' — '), t.source].filter(Boolean).join(' · ')
}

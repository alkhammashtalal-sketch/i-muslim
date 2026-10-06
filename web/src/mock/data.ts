// DEMO DATA ONLY — the local demo (VITE_ASK_MODE=mock) answers with what the live link answers, never with a text the
// app does not have: «ما أركان الإسلام؟» → the creed passage aqeedah:usul:005 (الأصول الثلاثة – ص 14–15), copied
// verbatim with its reference and link in answer-pillars.json (shared with the voice tests in web/e2e). No hadith:
// hadith is not indexed yet (reply 0027). The demo banner «بيانات تجريبية» stays.
import type { AnswerResponse, Lang, PassageResponse } from '../../../shared/api'
import pillars from './answer-pillars.json'

const { _about, ...answer } = pillars as typeof pillars & { _about: string }
void _about
const PILLARS = answer as unknown as AnswerResponse

export function mockAnswer(lang: Lang): AnswerResponse {
  return { ...PILLARS, answer_lang: lang, machineTranslated: lang !== 'ar' && lang !== 'en' }
}

export function mockPassage(id: string): PassageResponse | null {
  const q = PILLARS.quotes.find((x) => x.id === id)
  return q ? { ...q } : null
}

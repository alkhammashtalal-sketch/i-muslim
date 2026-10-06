import { describe, expect, it } from 'vitest'
import type { Lang } from '../../shared/api'
import { mockAnswer, mockPassage } from '../../web/src/mock/data'

// The local demo (VITE_ASK_MODE=mock, which the README leads to) answers with what the live link answers, never with
// a text the app does not have (reply 0027): no hadith, since hadith is not indexed yet.
const LANGS: Lang[] = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']

describe('the demo answer', () => {
  it('is the live answer to «ما أركان الإسلام؟», in every language, with no hadith', () => {
    for (const lang of LANGS) {
      const a = mockAnswer(lang)
      const all = JSON.stringify(a)
      expect(all).not.toMatch(/hadith:|sunnah\.com|البخاري|Bukhari/)
      expect(a.quotes.map((q) => q.id)).toEqual(['aqeedah:usul:005'])
      expect(a.quotes[0].kind).toBe('aqeedah')
      expect(a.quotes[0].ref).toBe('الأصول الثلاثة – ص 14–15')
      expect(a.answer_lang).toBe(lang)
      expect(a.machineTranslated).toBe(lang !== 'ar' && lang !== 'en')
      expect(a).not.toHaveProperty('_about')
    }
  })
  it('opens only its own passage', () => {
    expect(mockPassage('aqeedah:usul:005')?.text).toContain('فَأَرْكَانُ الإِسْلامِ')
    expect(mockPassage('hadith:bukhari:8')).toBeNull()
  })
})

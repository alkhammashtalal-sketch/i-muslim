// Plan B (reply 0040, Talal 21:12): on an answer, levels A and B are one badge; C and D keep theirs. levelLabel itself
// stays exact (the four levels in «عن التطبيق» and the measured levels on /verify).
import { describe, expect, it } from 'vitest'
import type { Lang } from '../../shared/api'
import ar from '../../web/src/i18n/ar'
import bn from '../../web/src/i18n/bn'
import en from '../../web/src/i18n/en'
import es from '../../web/src/i18n/es'
import fr from '../../web/src/i18n/fr'
import hi from '../../web/src/i18n/hi'
import id from '../../web/src/i18n/id'
import ms from '../../web/src/i18n/ms'
import tr from '../../web/src/i18n/tr'
import ur from '../../web/src/i18n/ur'
import { answerLevelLabel, LEVELS } from '../../web/src/trust/level-strings'

const T = { ar, en, ur, id, ms, tr, fr, es, bn, hi } as const

describe('answerLevelLabel', () => {
  it('A and B give the one combined badge, in every language', () => {
    for (const [lang, t] of Object.entries(T) as [Lang, (typeof T)[keyof typeof T]][]) {
      expect(answerLevelLabel(t, lang, 'A')).toBe(LEVELS[lang].levelAB)
      expect(answerLevelLabel(t, lang, 'B')).toBe(LEVELS[lang].levelAB)
      // Never the single level's own label, which could be the wrong one of the two.
      expect(answerLevelLabel(t, lang, 'A')).not.toBe(t.levelA)
      expect(answerLevelLabel(t, lang, 'B')).not.toBe(t.levelB)
    }
  })

  it('C and D are unchanged', () => {
    for (const [lang, t] of Object.entries(T) as [Lang, (typeof T)[keyof typeof T]][]) {
      expect(answerLevelLabel(t, lang, 'C')).toBe(t.levelC)
      expect(answerLevelLabel(t, lang, 'D')).toBe(t.levelD)
    }
  })

  it('the combined badge keeps each language\'s level word and names both levels', () => {
    expect(LEVELS.ar.levelAB).toBe('المستوى أ–ب · إجابة من نص معتمد')
    expect(LEVELS.en.levelAB).toBe('Level A–B · Answered from an approved text')
    for (const [lang, t] of Object.entries(T) as [Lang, (typeof T)[keyof typeof T]][]) {
      const word = t.levelA.split(' ')[0] // «المستوى», "Level", «درجہ», "Tingkat", …
      expect(LEVELS[lang].levelAB.startsWith(word), lang).toBe(true)
      expect(LEVELS[lang].levelAB).toMatch(lang === 'ar' ? /أ–ب/ : lang === 'ur' ? /الف–ب/ : /A–B/)
    }
  })
})

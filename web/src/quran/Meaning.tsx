import { useState } from 'react'
import type { Meaning } from '../../../shared/api'
import { useI18n } from '../i18n'
import { namedTranslator } from './meaning-credit'

// The languages with a human translation of the meanings in the Ayat archive (command 22; worker/src/meaning.ts).
export const MEANING_LANGS = ['ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn']
export const meaningLang = (lang: string): string | null => (MEANING_LANGS.includes(lang) ? lang : null)

/** The meaning of an ayah in the reader's language, with its translator as the Ayat project names it; the Sahih
 *  International meaning stays one press away. Shown in place of the English meaning in the seven languages. */
export function MeaningBlock({ meaning, textEn }: { meaning: Meaning; textEn?: string | null }) {
  const { t } = useI18n()
  const [en, setEn] = useState(false)
  return (
    <section className="section meaning-block">
      <p className="section-label">
        {t.meaningMine} · <bdi>{namedTranslator(meaning) ?? t.meaningArchive}</bdi>
      </p>
      <p className="translation" lang={meaning.lang} dir={meaning.lang === 'ur' ? 'rtl' : 'ltr'}>
        {meaning.text}
      </p>
      {textEn &&
        (en ? (
          <>
            <p className="section-label">{t.meaningAyah}</p>
            <p className="translation" lang="en" dir="ltr">
              {textEn}
            </p>
          </>
        ) : (
          <button type="button" className="text-link" onClick={() => setEn(true)}>
            {t.meaningEnButton}
          </button>
        ))}
    </section>
  )
}

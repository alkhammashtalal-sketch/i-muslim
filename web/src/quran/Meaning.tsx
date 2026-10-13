import { useState } from 'react'
import type { Meaning } from '../../../shared/api'
import { useI18n } from '../i18n'
import { fmt } from './format'
import { namedTranslator, quranEncUrl } from './meaning-credit'
import { contentDir } from '../v2/lang/served'

/** The meaning of an ayah in the reader's language, with its translator; the Sahih International meaning stays one
 *  press away. From QuranEnc (source ط, reply 0032 A): the line «ترجمة معاني» names the translator, the encyclopedia
 *  and the version, links the translation's page, and the footnotes fold under the meaning, as received. */
// The direction of the translation's own script (reply 0033 §أ1: from the data, then Intl, then the Arabic-script list).
export function MeaningBlock({ meaning, textEn }: { meaning: Meaning; textEn?: string | null }) {
  const { t, lang } = useI18n()
  const [en, setEn] = useState(false)
  return (
    <section className="section meaning-block">
      <p className="section-label">
        {t.meaningMine} · <bdi>{namedTranslator(meaning) ?? t.meaningArchive}</bdi>
      </p>
      <p className="translation" lang={meaning.lang} dir={contentDir(meaning.lang)}>
        {meaning.text}
      </p>
      {meaning.source_key && (
        <p className="small meaning-credit">
          <a className="text-link" href={quranEncUrl(meaning.source_key, lang)} target="_blank" rel="noopener noreferrer">
            {fmt(t.quranEncEdition, { v: meaning.version ?? '' })}
          </a>
        </p>
      )}
      {meaning.footnotes && (
        <details className="meaning-notes">
          <summary>{t.meaningFootnotes}</summary>
          <p className="translation small" lang={meaning.lang} dir={contentDir(meaning.lang)}>
            {meaning.footnotes}
          </p>
        </details>
      )}
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

import { useEffect, useState } from 'react'
import { Rose } from '../components/Ornaments'
import { useI18n } from '../i18n'
import { getReviewed, type Reviewed } from '../quran/reviewed'
import './trust.css'

/** «اشرح لي بلغتي» outside Arabic, for an ayah (command 21): shown only when a reviewed translation of al-Muyassar was
 *  published for it in this language (the button appears once the file has answered, so it never flickers). The text
 *  is the translation as published, labelled machine translation that passed an independent review, with its source. */
export function ReviewedBox({ id, sourceUrl }: { id: string; sourceUrl?: string }) {
  const { t, lang } = useI18n()
  const key = `${id}|${lang}`
  const [found, setFound] = useState<{ key: string; r: Reviewed | null } | null>(null)
  const [openKey, setOpenKey] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    getReviewed(id, lang).then((r) => alive && setFound({ key, r }))
    return () => {
      alive = false
    }
  }, [id, lang, key])

  const r = found?.key === key ? found.r : null
  if (!r) return null
  if (openKey !== key)
    return (
      <button type="button" className="btn explain-btn" onClick={() => setOpenKey(key)}>
        <Rose size={22} />
        {t.explainMine}
      </button>
    )
  const date = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${r.reviewed_at}T12:00:00`))
  return (
    <section className="explain-box" aria-label={t.reviewedTitle}>
      <p className="section-label explain-title">{t.reviewedTitle}</p>
      <div className="badges">
        <span className="badge">{t.reviewedTag}</span>
        <span className="badge">{date}</span>
      </div>
      <p className="explanation" lang={lang} dir={lang === 'ur' ? 'rtl' : 'ltr'}>
        {r.text}
      </p>
      {sourceUrl && (
        <a className="text-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">
          {t.muyassarSource}
        </a>
      )}
    </section>
  )
}

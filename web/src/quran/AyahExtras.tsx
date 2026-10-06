import { useState } from 'react'
import type { PassageResponse, Quote } from '../../../shared/api'
import { useI18n } from '../i18n'
import { getAyah } from './api'
import { ReaderLink } from './QuranIndex'
import { quranPath } from './route'

// Under an ayah source on the answer card (command 20), on request only: Tafsir al-Saʿdi and (in the Arabic
// interface, where it is not shown already) the Sahih International meaning, both from D1 as in the Mushaf's ayah
// sheet, with their links; and «افتحها في المصحف» to the ayah sheet itself. al-Muyassar and, outside Arabic, the
// English meaning stay shown by default on the card (CLAUDE.md rule 12).

type Open = 'saadi' | null

export function AyahExtras({ q }: { q: Quote }) {
  const { t } = useI18n()
  const [open, setOpen] = useState<Open>(null)
  const [p, setP] = useState<PassageResponse | null | 'error' | 'loading'>(null)
  const m = q.id.match(/^quran:(\d{1,3}):(\d{1,3})$/)
  if (!m) return null
  const sura = Number(m[1])
  const aya = Number(m[2])
  const panel = `x-${q.id.replace(/:/g, '-')}`

  const toggle = (what: Exclude<Open, null>) => {
    const next = open === what ? null : what
    setOpen(next)
    if (next === 'saadi' && (p === null || p === 'error')) {
      setP('loading')
      getAyah(sura, aya).then(
        (r) => setP(r),
        () => setP('error'),
      )
    }
  }
  const saadi = p && p !== 'error' && p !== 'loading' ? p.tafsir?.find((x) => x.key === 'saadi') : undefined

  return (
    <div className="ayah-extras">
      <div className="ayah-extras-buttons">
        <button type="button" className="btn" aria-expanded={open === 'saadi'} aria-controls={`${panel}-saadi`} onClick={() => toggle('saadi')}>
          {t.tafsirSaadi}
        </button>
        <ReaderLink to={quranPath(sura, aya)} className="btn">
          {t.openInMushaf}
        </ReaderLink>
      </div>
      {open === 'saadi' && (
        <div className="section tafsir" id={`${panel}-saadi`}>
          <p className="section-label">{t.tafsirSaadi}</p>
          {p === 'loading' ? (
            <p className="small" role="status">
              {t.readerLoading}
            </p>
          ) : p === 'error' || p === null ? (
            <p className="small" role="alert">
              {t.errConnection}
            </p>
          ) : !saadi || saadi.empty ? (
            <p className="small">{t.saadiEmpty}</p>
          ) : (
            <>
              <div className="tafsir-text" lang="ar" dir="rtl">
                {(saadi.paragraphs ?? [saadi.text]).map((x, i) => (
                  <p key={i}>{x}</p>
                ))}
              </div>
              <a className="text-link" href={saadi.url} target="_blank" rel="noopener noreferrer">
                {t.originalSource}
              </a>
            </>
          )}
        </div>
      )}
    </div>
  )
}

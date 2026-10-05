import { useEffect, useState } from 'react'
import type { PassageResponse } from '../../../shared/api'
import { Sheet } from '../components/Sheet'
import { useI18n } from '../i18n'
import { displayRef, fmt, numFmt } from '../quran/format'
import { bookPath } from '../quran/route'
import { getSegment } from './api'
import { isShurutPassage } from '../trust/shurut'
import { ShurutNote } from '../trust/ShurutNote'

type Props = {
  open: boolean
  id: string
  bookName: string
  onClose: () => void
  onAsk: (draft: string) => void
}

/** One aqeedah segment: text as stored, edition footnotes, reference and shamela link. */
export function SegmentSheet({ open, id, bookName, onClose, onAsk }: Props) {
  const { t, lang } = useI18n()
  const num = numFmt(lang)
  const [state, setState] = useState<{ id: string; p: PassageResponse | null } | 'error' | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [copied, setCopied] = useState<'copy' | 'share' | null>(null)

  useEffect(() => {
    if (!open) return
    let alive = true
    getSegment(id).then(
      (p) => alive && setState({ id, p }),
      () => alive && setState('error'),
    )
    return () => {
      alive = false
    }
  }, [open, id, attempt])

  const loaded = !!state && state !== 'error' && state.id === id
  const p = loaded ? state.p : null
  const seg = p?.segment
  // Arabic UI: «الأصول الثلاثة – ص ١٣» in one line. Other languages: the Arabic book name as the title,
  // and the page in the interface language on its own line below (no mixed-direction title).
  const title = lang === 'ar' && seg ? fmt(t.segmentSheetTitle, { book: seg.book, page: num(seg.page) }) : (seg?.book ?? bookName)

  const flash = (what: 'copy' | 'share') => {
    setCopied(what)
    setTimeout(() => setCopied(null), 1800)
  }
  const copy = async () => {
    if (!p) return
    try {
      await navigator.clipboard.writeText(`«${p.text}»\n[${displayRef(p.ref, lang)}]\n${p.url}`)
      flash('copy')
    } catch {
      // clipboard blocked
    }
  }
  const share = async () => {
    if (!p || !seg) return
    const url = `${location.origin}${bookPath(seg.bookKey, p.id)}`
    if (navigator.share) {
      try {
        await navigator.share({ title: displayRef(p.ref, lang), url })
      } catch {
        // dismissed
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      flash('share')
    } catch {
      // clipboard blocked
    }
  }
  const ask = () => {
    if (!seg) return
    onAsk(seg.chapter && seg.chapter !== seg.book ? fmt(t.askAboutSegmentDraft, { chapter: seg.chapter, book: seg.book }) : fmt(t.askAboutBookDraft, { book: seg.book }))
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {state === 'error' ? (
        <div className="reader-state">
          <p className="card-body" role="alert">
            {t.errConnection}
          </p>
          <button type="button" className="btn" onClick={() => setAttempt((n) => n + 1)}>
            {t.retry}
          </button>
        </div>
      ) : !loaded ? (
        <p className="small" role="status">
          {t.readerLoading}
        </p>
      ) : !p ? (
        <p className="card-body" role="status">
          {t.bookNotFound}
        </p>
      ) : (
        <div className="ayah-sheet">
          {lang !== 'ar' && seg && <p className="segment-page-line">{fmt(t.pageShort, { n: seg.pageEnd > seg.page ? `${num(seg.page)}–${num(seg.pageEnd)}` : num(seg.page) })}</p>}
          {seg?.chapter && (
            <p className="section-label" lang="ar" dir="rtl">
              {seg.chapter}
            </p>
          )}
          <div className="segment-box">
            <p className="segment-text" lang="ar" dir="rtl">
              {p.text}
            </p>
          </div>
          {isShurutPassage(p.id) && <ShurutNote />}
          <div className="quote-meta">
            <span className="ref" lang="ar" dir="rtl">
              {displayRef(p.ref, lang)}
            </span>
            {p.verified && <span className="badge badge-verified">✓ {t.badgeVerified}</span>}
          </div>
          <a className="text-link" href={p.url} target="_blank" rel="noopener noreferrer">
            {t.originalSource}
          </a>

          {seg?.footnotes && (
            <details className="footnotes">
              <summary>{t.footnotes}</summary>
              <p className="footnotes-text" lang="ar" dir="rtl">
                {seg.footnotes}
              </p>
            </details>
          )}

          <div className="actions">
            <button type="button" className="btn" onClick={copy}>
              {copied === 'copy' ? t.copied : t.copyWithRef}
            </button>
            <button type="button" className="btn" onClick={share}>
              {copied === 'share' ? t.copied : t.share}
            </button>
            <button type="button" className="btn btn-wide" onClick={ask}>
              {t.askAboutSegment}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

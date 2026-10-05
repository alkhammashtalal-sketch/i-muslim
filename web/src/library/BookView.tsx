import { useEffect, useRef, useState } from 'react'
import type { BookResponse, BookSegment } from '../../../shared/api'
import { useI18n } from '../i18n'
import { fmt, numFmt } from '../quran/format'
import { SuraCartouche } from '../quran/ornaments'
import { ReaderLink } from '../quran/QuranIndex'
import { getBook } from './api'

type Props = {
  book: string
  selected?: string
  scrollTo?: string
  onOpen: (s: BookSegment) => void
  onLoaded?: (b: BookResponse) => void
}

export function BookView({ book, selected, scrollTo, onOpen, onLoaded }: Props) {
  const { t, lang } = useI18n()
  const num = numFmt(lang)
  const [data, setData] = useState<{ key: string; b: BookResponse | null } | 'error' | null>(null)
  const [attempt, setAttempt] = useState(0)
  const loadedRef = useRef(onLoaded)
  useEffect(() => {
    loadedRef.current = onLoaded
  })

  useEffect(() => {
    let alive = true
    getBook(book).then(
      (b) => {
        if (!alive) return
        setData({ key: book, b })
        if (b) loadedRef.current?.(b)
      },
      () => alive && setData('error'),
    )
    return () => {
      alive = false
    }
  }, [book, attempt])

  const b = data && data !== 'error' && data.key === book ? data.b : null

  useEffect(() => {
    if (b && scrollTo) document.getElementById(`s-${scrollTo}`)?.scrollIntoView({ block: 'center' })
  }, [b, scrollTo])

  if (data === 'error')
    return (
      <div className="reader-state">
        <p className="card-body" role="alert">
          {t.errConnection}
        </p>
        <button type="button" className="btn" onClick={() => setAttempt((n) => n + 1)}>
          {t.retry}
        </button>
      </div>
    )
  if (data && data.key === book && !data.b)
    return (
      <div className="reader-state">
        <p className="card-body">{t.bookNotFound}</p>
        <ReaderLink to="/books" className="text-link">
          {t.tabBooks}
        </ReaderLink>
      </div>
    )

  const pages = (s: BookSegment) => (s.pageEnd > s.page ? `${num(s.page)}–${num(s.pageEnd)}` : num(s.page))
  const count = b ? b.chapters.reduce((n, c) => n + c.segments.length, 0) : 0

  return (
    <article className="sura book" aria-busy={!b}>
      <SuraCartouche>
        <h2 className="sura-title book-title" lang="ar" dir="rtl">
          {b?.name ?? ' '}
        </h2>
      </SuraCartouche>
      {b && <p className="sura-meta small">{fmt(t.bookMeta, { c: num(b.chapters.length), s: num(count) })}</p>}
      {t.booksInArabic && <p className="small">{t.booksInArabic}</p>}

      {!b ? (
        <p className="small" role="status">
          {t.readerLoading}
        </p>
      ) : (
        <>
          {b.chapters.length > 1 && (
            <details className="book-toc">
              <summary>
                {t.bookChapters} ({num(b.chapters.length)})
              </summary>
              <ol lang="ar" dir="rtl">
                {b.chapters.map((c, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => document.getElementById(`ch-${i}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })}
                    >
                      {c.title}
                    </button>
                  </li>
                ))}
              </ol>
            </details>
          )}

          {b.chapters.map((c, i) => (
            <section key={i} className="book-chapter" aria-labelledby={`ch-${i}`}>
              <h3 id={`ch-${i}`} className="book-chapter-title" lang="ar" dir="rtl">
                {c.title}
              </h3>
              {c.segments.map((s) => (
                <div
                  key={s.id}
                  id={`s-${s.id}`}
                  className={`segment${selected === s.id ? ' is-selected' : ''}`}
                  onClick={() => onOpen(s)}
                >
                  <p className="segment-text" lang="ar" dir="rtl">
                    {s.text}
                  </p>
                  <button type="button" className="segment-page" aria-label={fmt(t.segmentButton, { n: num(s.page) })} aria-haspopup="dialog">
                    {fmt(t.pageShort, { n: pages(s) })}
                  </button>
                </div>
              ))}
            </section>
          ))}
        </>
      )}
    </article>
  )
}

import { useEffect, useState } from 'react'
import type { BookSummary } from '../../../shared/api'
import { useI18n } from '../i18n'
import { fmt, numFmt } from '../quran/format'
import { Mkp } from '../components/Ornaments'
import { ReaderLink } from '../quran/QuranIndex'
import { bookPath } from '../quran/route'
import { getBooks } from './api'
import { LibraryTabs } from './LibraryTabs'

export function BooksIndex() {
  const { t, lang } = useI18n()
  const num = numFmt(lang)
  const [books, setBooks] = useState<BookSummary[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    getBooks().then(
      (b) => alive && setBooks(b),
      () => alive && setFailed(true),
    )
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="reader-index">
      <LibraryTabs current="books" />
      {t.booksInArabic && <p className="small">{t.booksInArabic}</p>}
      {failed && (
        <p className="card-body" role="alert">
          {t.errConnection}
        </p>
      )}
      {!books && !failed && (
        <p className="small" role="status">
          {t.readerLoading}
        </p>
      )}
      {books && (
        <ol className="sura-list">
          {books.map((b, i) => (
            <li key={b.key}>
              <ReaderLink to={bookPath(b.key)} className="sura-row">
                <span className="sura-num">
                  <Mkp n={num(i + 1)} size={36} />
                </span>
                <span className="sura-row-main">
                  <span className="sura-row-name" lang="ar" dir="rtl">
                    {b.name}
                  </span>
                </span>
                <span className="small">{fmt(t.bookMeta, { c: num(b.chapters), s: num(b.segments) })}</span>
              </ReaderLink>
            </li>
          ))}
        </ol>
      )}
      <p className="small reader-source">{t.booksSourceNote}</p>
    </div>
  )
}

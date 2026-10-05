import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { SuraSummary } from '../../../shared/api'
import { useI18n } from '../i18n'
import { getSuras } from './api'
import { arabicDigits, fmt, foldArabic, numFmt } from './format'
import { KhatamStar } from './ornaments'
import { loadPrefs } from './prefs'
import { navigate, quranPath } from './route'
import { LibraryTabs } from '../library/LibraryTabs'

/** Internal link that navigates without a reload (and still works as a normal link). */
export function ReaderLink({
  to,
  className,
  children,
  label,
  current,
}: {
  to: string
  className?: string
  children: ReactNode
  label?: string
  current?: boolean
}) {
  return (
    <a
      href={to}
      className={className}
      aria-label={label}
      aria-current={current ? 'page' : undefined}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        navigate(to)
      }}
    >
      {children}
    </a>
  )
}

/** "2:255", "2 255", "٢:٢٥٥" → {sura, aya} */
function parseRef(q: string): { sura: number; aya?: number } | null {
  const western = q.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
  const m = western.trim().match(/^(\d{1,3})(?:\s*[:：.\s]\s*(\d{1,3}))?$/)
  if (!m) return null
  return { sura: Number(m[1]), aya: m[2] ? Number(m[2]) : undefined }
}

export function QuranIndex() {
  const { t, lang } = useI18n()
  const num = numFmt(lang)
  const [suras, setSuras] = useState<SuraSummary[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [q, setQ] = useState('')
  const last = loadPrefs().last

  useEffect(() => {
    let alive = true
    getSuras().then(
      (s) => alive && setSuras(s),
      () => alive && setFailed(true),
    )
    return () => {
      alive = false
    }
  }, [])

  const ref = parseRef(q)
  const jump = ref && suras ? suras.find((s) => s.n === ref.sura && (!ref.aya || ref.aya <= s.ayat)) : undefined
  const shown = useMemo(() => {
    if (!suras) return []
    const needle = q.trim()
    if (!needle) return suras
    if (ref) return suras.filter((s) => s.n === ref.sura)
    const fq = foldArabic(needle)
    return suras.filter((s) => foldArabic(s.name).includes(fq))
  }, [suras, q, ref])

  const lastSura = last && suras?.find((s) => s.n === last.sura)
  // The router sends /quran/<n> with an n outside 1–114 here; say so instead of showing the index silently.
  const badLink = /^\/quran\/\d/.test(location.pathname)

  return (
    <div className="reader-index">
      <LibraryTabs current="quran" />
      {badLink && (
        <p className="card-body" role="status">
          {t.readerNotFound}
        </p>
      )}
      {lastSura && (
        <ReaderLink to={quranPath(last.sura, last.aya)} className="continue-card">
          <span className="continue-label">{t.continueReading}</span>
          <span className="continue-ref">
            <span className="sura-name-inline" lang="ar" dir="rtl">
              {lastSura.name}
            </span>
            {lang === 'ar' ? `: ${arabicDigits(last.aya)}` : ` · ${fmt(t.ayahButton, { n: num(last.aya) })}`}
          </span>
        </ReaderLink>
      )}

      <form
        className="reader-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          if (jump) navigate(quranPath(jump.n, ref?.aya))
          else if (shown.length === 1) navigate(quranPath(shown[0].n))
        }}
      >
        <label htmlFor="sura-q" className="sr-only">
          {t.suraSearchLabel}
        </label>
        <input
          id="sura-q"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.suraSearchPlaceholder}
          autoComplete="off"
          enterKeyHint="go"
        />
      </form>

      {jump && ref?.aya && (
        <ReaderLink to={quranPath(jump.n, ref.aya)} className="jump-link">
          {fmt(t.goToAyah, { ref: `${jump.name}: ${lang === 'ar' ? arabicDigits(ref.aya) : num(ref.aya)}` })}
        </ReaderLink>
      )}

      {failed && (
        <p className="card-body" role="alert">
          {t.errConnection}
        </p>
      )}
      {!suras && !failed && (
        <p className="small" role="status">
          {t.readerLoading}
        </p>
      )}
      {suras && shown.length === 0 && <p className="card-body">{t.suraNoResults}</p>}

      <h2 className="sr-only">{t.quranIndexTitle}</h2>
      <ol className="sura-list">
        {shown.map((s) => (
          <li key={s.n}>
            <ReaderLink to={quranPath(s.n)} className="sura-row">
              <span className="sura-num">
                <KhatamStar />
                <span>{num(s.n)}</span>
              </span>
              <span className="sura-row-main">
                <span className="sura-row-name" lang="ar">
                  {s.name}
                </span>
                {lang !== 'ar' && <span className="small">{fmt(t.suraNum, { n: num(s.n) })}</span>}
              </span>
              <span className="small">{fmt(t.ayatCount, { n: num(s.ayat) })}</span>
            </ReaderLink>
          </li>
        ))}
      </ol>
      <p className="small reader-source">{t.readerSourceNote}</p>
    </div>
  )
}

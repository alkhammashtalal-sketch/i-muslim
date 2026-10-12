import { useEffect, useMemo, useState, type ReactNode } from 'react'
import type { SuraSummary } from '../../../shared/api'
import { useI18n } from '../i18n'
import { getSuras } from './api'
import { arabicDigits, fmt, foldArabic, numFmt } from './format'
import { Mkp } from '../components/Ornaments'
import { loadPrefs } from './prefs'
import { navigate, quranPath } from './route'
import { LibraryTabs } from '../library/LibraryTabs'
import { IcBook, IcBookmark, IcChevron, IcMic } from '../v2/reading/icons'
import { JuzIndex } from '../v2/reading/JuzIndex'
import { juzOf, pageOf } from '../v2/reading/meta'
import { Tabs, useReadingStrings } from '../v2/reading/ui'
import { WardReminderLine } from '../v2/reading/Ward'

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
  const r = useReadingStrings()
  // Suras or juz and quarters (reply 0032 C-1); the choice lasts for the visit.
  const [by, setBy] = useState<'suras' | 'juz'>(() => (sessionStorage.getItem('muslim.index.by') === 'juz' ? 'juz' : 'suras'))
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
      {last && (
        <section className="rd-card">
          <ReaderLink to={quranPath(last.sura, last.aya)} className="rd-row continue-card">
            <span className="rd-tile">
              <IcBook />
            </span>
            <span className="rd-row-main">
              <span className="rd-row-label continue-label">{r.continueFrom}</span>
              <span className="rd-row-title continue-ref">
                {lastSura && (
                  <span className="sura-name-inline" lang="ar" dir="rtl">
                    {lastSura.name}
                  </span>
                )}
                {' · '}
                {lang === 'ar' ? arabicDigits(last.aya) : fmt(t.ayahButton, { n: num(last.aya) })}
                {' · '}
                {fmt(r.page, { n: lang === 'ar' ? arabicDigits(pageOf(last.sura, last.aya)) : num(pageOf(last.sura, last.aya)) })}
              </span>
            </span>
            <span className="rd-chev">
              <IcChevron />
            </span>
          </ReaderLink>
        </section>
      )}
      <WardReminderLine />
      <nav className="rd-shortcuts" aria-label={r.myReading}>
        <ReaderLink to="/quran/saved" className="rd-shortcut">
          <IcBookmark />
          {r.savedTitle}
        </ReaderLink>
        <ReaderLink to="/quran/ward" className="rd-shortcut">
          <IcBook />
          {r.wardTitle}
        </ReaderLink>
        <ReaderLink to="/quran/reciters" className="rd-shortcut">
          <IcMic />
          {r.recitersTitle}
        </ReaderLink>
      </nav>

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
          placeholder={by === 'juz' ? r.searchSuraJuz : t.suraSearchPlaceholder}
          autoComplete="off"
          enterKeyHint="go"
        />
      </form>

      <Tabs
        value={by}
        onChange={(v) => {
          setBy(v)
          try {
            sessionStorage.setItem('muslim.index.by', v)
          } catch {
            // storage unavailable
          }
        }}
        options={[
          { value: 'suras', label: r.tabSuras },
          { value: 'juz', label: r.tabJuz },
        ]}
      />

      {jump && ref?.aya && (
        <ReaderLink to={quranPath(jump.n, ref.aya)} className="jump-link">
          {fmt(t.goToAyah, { ref: `${jump.name}: ${lang === 'ar' ? arabicDigits(ref.aya) : num(ref.aya)}` })}
        </ReaderLink>
      )}

      {by === 'juz' && <JuzIndex query={q} initialOpen={last ? juzOf(last.sura, last.aya) : 1} />}
      {by === 'suras' && failed && (
        <p className="card-body" role="alert">
          {t.errConnection}
        </p>
      )}
      {by === 'suras' && !suras && !failed && (
        <p className="small" role="status">
          {t.readerLoading}
        </p>
      )}
      {by === 'suras' && suras && shown.length === 0 && <p className="card-body">{t.suraNoResults}</p>}

      <h2 className="sr-only">{t.quranIndexTitle}</h2>
      <ol className="sura-list" hidden={by !== 'suras'}>
        {shown.map((s) => (
          <li key={s.n}>
            <ReaderLink to={quranPath(s.n)} className="sura-row">
              <span className="sura-num">
                  <Mkp n={num(s.n)} size={36} />
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

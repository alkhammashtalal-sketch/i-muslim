import { useEffect, useRef, useState } from 'react'
import type { SuraAyah, SuraResponse } from '../../../shared/api'
import { useI18n } from '../i18n'
import { getSura } from './api'
import { arabicDigits, fmt, numFmt } from './format'
import { AyahRing, SuraCartouche } from './ornaments'
import { loadPrefs, savePrefs, type ReadMode } from './prefs'
import { ReaderLink } from './QuranIndex'

type Props = {
  sura: number
  selected?: number
  scrollTo?: number
  onOpen: (aya: number) => void
  onLoaded?: (s: SuraResponse) => void
}

function AyahNumber({ aya }: { aya: number }) {
  const { t, lang } = useI18n()
  return (
    <button type="button" className="ayah-num" aria-label={fmt(t.ayahButton, { n: numFmt(lang)(aya) })} aria-haspopup="dialog">
      <AyahRing />
      <span aria-hidden="true">{arabicDigits(aya)}</span>
    </button>
  )
}

/** Split into runs of ayat that share a mushaf page. */
function byPage(ayat: SuraAyah[]) {
  const groups: { page: number; ayat: SuraAyah[] }[] = []
  for (const a of ayat) {
    const g = groups.at(-1)
    if (g && g.page === a.page) g.ayat.push(a)
    else groups.push({ page: a.page, ayat: [a] })
  }
  return groups
}

export function SuraView({ sura, selected, scrollTo, onOpen, onLoaded }: Props) {
  const { t, lang } = useI18n()
  const num = numFmt(lang)
  const [mode, setMode] = useState<ReadMode>(() => loadPrefs().mode ?? (lang === 'ar' ? 'mushaf' : 'ayah'))
  const [data, setData] = useState<{ key: string; s: SuraResponse | null } | 'error' | null>(null)
  const [attempt, setAttempt] = useState(0)
  const withEn = mode === 'ayah'
  const key = `${sura}|${withEn}`
  const loadedRef = useRef(onLoaded)
  useEffect(() => {
    loadedRef.current = onLoaded
  })

  useEffect(() => {
    let alive = true
    getSura(sura, withEn).then(
      (s) => {
        if (!alive) return
        setData({ key: `${sura}|${withEn}`, s })
        if (s) loadedRef.current?.(s)
      },
      () => alive && setData('error'),
    )
    return () => {
      alive = false
    }
  }, [sura, withEn, attempt])

  const s = data && data !== 'error' && data.key === key ? data.s : null

  useEffect(() => {
    if (!s || !scrollTo) return
    const el = document.getElementById(`a-${scrollTo}`)
    el?.scrollIntoView({ block: 'center' })
  }, [s, scrollTo])

  const chooseMode = (m: ReadMode) => {
    setMode(m)
    savePrefs({ mode: m })
  }

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
  if (data && data.key === key && !data.s)
    return (
      <div className="reader-state">
        <p className="card-body">{t.readerNotFound}</p>
        <ReaderLink to="/quran" className="text-link">
          {t.quranIndexTitle}
        </ReaderLink>
      </div>
    )

  const ayahProps = (a: SuraAyah) => ({
    id: `a-${a.aya}`,
    className: `ayah${selected === a.aya ? ' is-selected' : ''}`,
    onClick: () => onOpen(a.aya),
  })

  return (
    <article className="sura" aria-busy={!s}>
      <SuraCartouche>
        <h2 className="sura-title" lang="ar">
          {s?.name ?? ' '}
        </h2>
      </SuraCartouche>
      <p className="sura-meta small">
        {fmt(t.suraNum, { n: num(sura) })}
        {s && ` · ${fmt(t.ayatCount, { n: num(s.ayat.length) })}`}
      </p>

      <div className="row reader-mode">
        <span className="row-label" id="read-mode">
          {t.modeLabel}
        </span>
        <div className="segmented" role="radiogroup" aria-labelledby="read-mode">
          {(
            [
              ['mushaf', t.modeMushaf],
              ['ayah', t.modeAyah],
            ] as const
          ).map(([v, label]) => (
            <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => chooseMode(v)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {!s ? (
        <p className="small" role="status">
          {t.readerLoading}
        </p>
      ) : (
        <>
          {s.basmala && (
            <p className="basmala" lang="ar" dir="rtl">
              {s.basmala}
            </p>
          )}

          {mode === 'mushaf' ? (
            <div className="mushaf" lang="ar" dir="rtl">
              {byPage(s.ayat).map((g, gi) => (
                <section key={g.page} aria-label={fmt(t.pageMark, { n: num(g.page) })}>
                  {gi > 0 && (
                    <p className="page-mark" aria-hidden="true">
                      <span>{fmt(t.pageMark, { n: num(g.page) })}</span>
                    </p>
                  )}
                  <p className="mushaf-text">
                    {g.ayat.map((a) => (
                      <span key={a.aya} {...ayahProps(a)}>
                        {a.text}
                        {' '}
                        <AyahNumber aya={a.aya} />{' '}
                      </span>
                    ))}
                  </p>
                </section>
              ))}
            </div>
          ) : (
            <>
              <p className="section-label ayah-list-label">
                {t.englishMeaning}
                <span className="badge" lang="en" dir="ltr">
                  Sahih International
                </span>
              </p>
              <ol className="ayah-list">
                {byPage(s.ayat).map((g, gi) => [
                  gi > 0 && (
                    <li key={`p${g.page}`} className="page-mark" aria-hidden="true">
                      <span>{fmt(t.pageMark, { n: num(g.page) })}</span>
                    </li>
                  ),
                  ...g.ayat.map((a) => (
                    <li key={a.aya} className="ayah-item">
                      <p className="ayah-line" lang="ar" dir="rtl">
                        <span {...ayahProps(a)}>
                          {a.text}
                          {' '}
                          <AyahNumber aya={a.aya} />
                        </span>
                      </p>
                      {a.text_en && (
                        <p className="translation" lang="en" dir="ltr">
                          {a.text_en}
                        </p>
                      )}
                    </li>
                  )),
                ])}
              </ol>
            </>
          )}
        </>
      )}
    </article>
  )
}

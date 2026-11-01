import { useEffect, useRef, useState } from 'react'
import type { SuraAyah, SuraResponse } from '../../../shared/api'
import { useI18n } from '../i18n'
import { contentDir } from '../v2/lang/served'
import { getSura } from './api'
import { namedTranslator, quranEncUrl } from './meaning-credit'
import { fmt, numFmt } from './format'
import { Divider, Mkp, SuraHead } from '../components/Ornaments'
import { AyahEnd } from './AyahEnd'
import { loadPrefs, savePrefs, type ReadMode } from './prefs'
import { ReaderLink } from './QuranIndex'
import { ListenBar } from './Listen'
import { useRecitationHighlight } from './recitation'
import { MushafLinesNote } from '../v2/daily/MushafLinesNote'
import { isSajda } from '../v2/reading/meta'
import { SajdaBadge } from '../v2/reading/SajdaBadge'
import { ayahDigits, useReaderDisplay } from './reader-display'
import { IcTextSize, ReaderDisplaySheet } from '../v2/reading/ReaderDisplay'
import { DISPLAY } from '../v2/reading/display-strings'

type Props = {
  sura: number
  selected?: number
  scrollTo?: number
  onOpen: (aya: number) => void
  onLoaded?: (s: SuraResponse) => void
}

/** The ayah's marker, in the digits and at the size the reader chose (add-on 0072-add60 §5; reader-display.ts). */
function AyahNumber({ aya }: { aya: number }) {
  const { t, lang } = useI18n()
  const d = useReaderDisplay()
  return (
    <button type="button" className="ayah-num" aria-label={fmt(t.ayahButton, { n: numFmt(lang)(aya) })} aria-haspopup="dialog">
      <Mkp n={ayahDigits(aya, d.digits)} size={Math.round(28 * d.quran)} />
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
  const { t, lang, content } = useI18n()
  const num = numFmt(lang)
  const [mode, setMode] = useState<ReadMode>(() => loadPrefs().mode ?? (lang === 'ar' ? 'mushaf' : 'ayah'))
  const [data, setData] = useState<{ key: string; s: SuraResponse | null } | 'error' | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [displayOpen, setDisplayOpen] = useState(false)
  // No English meaning in the Arabic interface (Talal, 6 October 19:00); the seven languages read their own.
  const withEn = mode === 'ayah' && lang !== 'ar'
  // The meanings in the content language (reply 0033 §أ1): the interface's, or another served one with English buttons.
  const key = `${sura}|${withEn}|${content}`
  const loadedRef = useRef(onLoaded)
  useEffect(() => {
    loadedRef.current = onLoaded
  })

  useEffect(() => {
    let alive = true
    getSura(sura, withEn, content).then(
      (s) => {
        if (!alive) return
        setData({ key: `${sura}|${withEn}|${content}`, s })
        if (s) loadedRef.current?.(s)
      },
      () => alive && setData('error'),
    )
    return () => {
      alive = false
    }
  }, [sura, withEn, content, attempt])

  const s = data && data !== 'error' && data.key === key ? data.s : null
  useRecitationHighlight(sura, !!s)

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
      <SuraHead>
        <h2 className="sura-title" lang="ar">
          {s?.name ?? ' '}
        </h2>
      </SuraHead>
      <p className="sura-meta small">
        {fmt(t.suraNum, { n: num(sura) })}
        {s && ` · ${fmt(t.ayatCount, { n: num(s.ayat.length) })}`}
      </p>
      {s && <ListenBar sura={sura} ayat={s.ayat} name={s.name} onOpenAyah={onOpen} />}

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
      {/* «الخط والحجم» (add-on 0072-add60 §5): a sheet over the page, so a recitation goes on. */}
      <div className="row reader-display-row">
        <button type="button" className="rdd-open" aria-haspopup="dialog" onClick={() => setDisplayOpen(true)} data-testid="open-display">
          <IcTextSize size={20} />
          {DISPLAY[lang].open}
        </button>
      </div>
      <ReaderDisplaySheet open={displayOpen} onClose={() => setDisplayOpen(false)} sura={sura} aya={selected ?? scrollTo ?? 1} />
      <MushafLinesNote pageMode={mode === 'mushaf'} />

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
              {byPage(s.ayat).map((g) => (
                <section key={g.page} aria-label={fmt(t.pageMark, { n: num(g.page) })}>
                  <p className="mushaf-text">
                    {g.ayat.map((a) => (
                      <span key={a.aya} {...ayahProps(a)}>
                        <AyahEnd text={a.text}>
                          <AyahNumber aya={a.aya} />
                        </AyahEnd>{' '}
                      </span>
                    ))}
                  </p>
                  {/* Under a page whose text carries ۩: the place, with no ruling (reply 0032 C-8). */}
                  {g.ayat
                    .filter((a) => isSajda(sura, a.aya))
                    .map((a) => (
                      <SajdaBadge key={`sj${a.aya}`} aya={num(a.aya)} />
                    ))}
                  {/* The page number closes its page, as at the foot of a Mushaf page (from the data). */}
                  <div className="page-mark" aria-hidden="true">
                    <Divider label={fmt(t.pageMark, { n: num(g.page) })} />
                  </div>
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
              {s.meaning_translator && (
                <p className="small meaning-credit">
                  {t.meaningMine} · <bdi>{namedTranslator({ lang: s.meaning_lang ?? '', translator: s.meaning_translator, source_key: s.meaning_key }) ?? t.meaningArchive}</bdi>
                  {s.meaning_key && (
                    <>
                      {' · '}
                      <a className="text-link" href={quranEncUrl(s.meaning_key, lang)} target="_blank" rel="noopener noreferrer">
                        {fmt(t.quranEncEdition, { v: s.meaning_version ?? '' })}
                      </a>
                    </>
                  )}
                </p>
              )}
              <ol className="ayah-list">
                {byPage(s.ayat).map((g) => [
                  ...g.ayat.map((a) => (
                    <li key={a.aya} className="ayah-item">
                      <p className="ayah-line" lang="ar" dir="rtl">
                        <span {...ayahProps(a)}>
                          <AyahEnd text={a.text}>
                            <AyahNumber aya={a.aya} />
                          </AyahEnd>
                        </span>
                      </p>
                      {isSajda(sura, a.aya) && <SajdaBadge />}
                      {a.meaning ? (
                        <p className="translation" lang={s.meaning_lang ?? content} dir={contentDir(s.meaning_lang ?? content)}>
                          {a.meaning}
                        </p>
                      ) : (
                        a.text_en && (
                          <p className="translation" lang="en" dir="ltr">
                            {a.text_en}
                          </p>
                        )
                      )}
                    </li>
                  )),
                  <li key={`p${g.page}`} className="page-mark" aria-hidden="true">
                    <Divider label={fmt(t.pageMark, { n: num(g.page) })} />
                  </li>,
                ])}
              </ol>
            </>
          )}
        </>
      )}
    </article>
  )
}

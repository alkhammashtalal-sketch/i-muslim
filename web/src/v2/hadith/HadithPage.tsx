import { useEffect, useState, type ReactNode } from 'react'
import { Sheet } from '../../components/Sheet'
import { IconChevronBack } from '../../components/Icons'
import { useI18n } from '../../i18n'
import { fmt, numFmt } from '../../quran/format'
import { hadithPath, navigate } from '../../quran/route'
import { getHadith, getSameTopic, isWeak, NotFound, splitIntro, type Hadith, type HadithBrief, type HadithPair } from './api'
import { DorarGrade } from './DorarGrade'
import { GradeBadge } from './GradeBadge'
import { HADITH } from './strings'
import './hadith.css'

const RTL = new Set(['ar', 'ur'])
const LONG = 700

function IconShare() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 3v12" />
      <path d="m7.5 7.5 4.5-4.5 4.5 4.5" />
      <path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12" />
    </svg>
  )
}
function IconSource() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 6.5C10 5 7 4.6 4 5v13c3-.4 6 0 8 1.5 2-1.5 5-1.9 8-1.5V5c-3-.4-6 0-8 1.5Z" />
    </svg>
  )
}
function IconChevronOpen({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ transform: open ? 'rotate(180deg)' : undefined }}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

/** One part of the page (V2 §3): a card, its heading, and its light source line at the foot. */
export function Part({ id, title, children, source }: { id: string; title: string; children: ReactNode; source?: ReactNode }) {
  return (
    <section className="hd-part" id={id} aria-labelledby={`${id}-h`}>
      <h2 className="hd-part-h" id={`${id}-h`}>
        {title}
      </h2>
      {children}
      {source}
    </section>
  )
}

/** The light source line (V2 rule 1): one line; a press opens «عن المصدر» in the app, the site's link is inside. */
export function SourceLine({ name, detail, onOpen, label }: { name: string; detail?: string; onOpen: () => void; label: string }) {
  return (
    <button type="button" className="hd-source" onClick={onOpen} aria-label={label} aria-haspopup="dialog">
      <span className="hd-source-icon">
        <IconSource />
      </span>
      <span className="hd-source-text">
        <span className="hd-source-name">{name}</span>
        {detail && <> · {detail}</>}
      </span>
      <span className="hd-source-chev" aria-hidden="true">
        <IconChevronBack size={15} />
      </span>
    </button>
  )
}

function Row({ k, children, lang }: { k: string; children: ReactNode; lang?: string }) {
  return (
    <div className="hd-row">
      <span className="hd-row-k">{k}</span>
      <span className="hd-row-v" lang={lang} dir={lang ? (RTL.has(lang) ? 'rtl' : 'ltr') : undefined}>
        {children}
      </span>
    </div>
  )
}

/** The hadith page (V2 §3, c03, c07, c17, c19; §11 for the weak): one page, each part a card with its source line.
 *  Parts whose source has not arrived are absent (rule 3): the Dorar grade (no token yet), the Riyad al-Salihin
 *  explanation (no written permission yet) and Ibn Baz's audio (not linked yet). */
export function HadithPage({ id }: { id: string }) {
  const { lang } = useI18n()
  const s = HADITH[lang]
  const num = numFmt(lang)
  const [pair, setPair] = useState<HadithPair | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading')
  const [same, setSame] = useState<HadithBrief[] | null>(null)
  const [sheet, setSheet] = useState(false)
  const [more, setMore] = useState(false)
  const [copied, setCopied] = useState(false)
  const [n, setN] = useState(0)

  useEffect(() => {
    let alive = true
    setState('loading')
    getHadith(id, lang).then(
      (p) => {
        if (!alive) return
        setPair(p)
        setState('ok')
        if (isWeak(p.ar)) getSameTopic(id).then((x) => alive && setSame(x), () => alive && setSame([]))
      },
      (e) => alive && setState(e instanceof NotFound ? 'missing' : 'error'),
    )
    window.scrollTo?.(0, 0)
    return () => {
      alive = false
    }
  }, [id, lang, n])

  const back = () => (history.length > 1 ? history.back() : navigate('/'))
  const header = (
    <header className="hd-head">
      <button type="button" className="v2-icon-btn" onClick={back} aria-label={s.back}>
        <IconChevronBack />
      </button>
      <h1 className="hd-title">{s.title}</h1>
      {pair && (
        <button type="button" className="v2-icon-btn" onClick={() => void share(pair.ar)} aria-label={s.share}>
          <IconShare />
        </button>
      )}
    </header>
  )

  async function share(h: Hadith) {
    const url = `${location.origin}${hadithPath(h.id)}`
    const text = [h.text, [h.grade, h.attribution].filter(Boolean).join(' · '), `${s.sourceName} · ${h.url}`].join('\n')
    try {
      if (navigator.share) return await navigator.share({ text, url })
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // closed by the user
    }
  }

  if (state !== 'ok' || !pair)
    return (
      <div className="hd-page">
        {header}
        <p className="hd-status" role={state === 'loading' ? 'status' : 'alert'}>
          {state === 'loading' ? s.loading : state === 'missing' ? s.notFound : s.networkError}
        </p>
        {state === 'error' && (
          <button type="button" className="hd-fold" onClick={() => setN((x) => x + 1)}>
            {s.retry}
          </button>
        )}
      </div>
    )

  const { ar, tr } = pair
  const split = splitIntro(ar)
  const weak = isWeak(ar)
  // The explanation and benefits in the reader's language when HadeethEnc translated them, else in Arabic.
  const ex = lang !== 'ar' && tr?.explanation ? tr : ar
  const exLang = ex === tr ? lang : 'ar'
  const long = (ex.explanation?.length ?? 0) > LONG
  const version = ar.version?.replace(/^v/, '')
  const sourceDetail = version ? fmt(s.sourceVersion, { v: version }) : undefined
  const sourceLabel = fmt(s.aboutSource, { name: s.sourceName })

  return (
    <div className={`hd-page${weak ? ' is-weak' : ''}`}>
      {header}
      {copied && (
        <p className="hd-copied" role="status">
          {s.copied}
        </p>
      )}
      <main className="hd-main">
        <Part id="hd-text" title={s.hadith} source={<SourceLine name={s.sourceName} detail={sourceDetail} label={sourceLabel} onOpen={() => setSheet(true)} />}>
          {/* A weak, fabricated or mixed grade is said before the text is read (V2 §11: a prominent badge). */}
          {weak && (
            <>
              <div className="hd-grade-line is-first">
                <GradeBadge h={ar} alt={lang !== 'ar' ? tr?.grade : null} large />
              </div>
              <p className="hd-weak-note">{s.weakNote}</p>
            </>
          )}
          <div className={`hd-frame${weak ? ' is-weak' : ''}`}>
            {split.intro && (
              <p className="hd-intro" lang="ar" dir="rtl">
                {split.intro}
              </p>
            )}
            <p className="hd-text" lang="ar" dir="rtl" data-hadith={ar.id}>
              {split.body}
            </p>
          </div>
          {lang !== 'ar' && tr && (
            <div className="hd-tr">
              <p className="hd-part-sub">{s.translation}</p>
              <p className="hd-tr-text" lang={lang} dir={RTL.has(lang) ? 'rtl' : 'ltr'}>
                {tr.text}
              </p>
            </div>
          )}
          {!weak && (
            <div className="hd-grade-line">
              <GradeBadge h={ar} alt={lang !== 'ar' ? tr?.grade : null} large />
            </div>
          )}
          {ar.attribution && (
            <Row k={s.narrated} lang="ar">
              {ar.attribution}
              {lang !== 'ar' && tr?.attribution && tr.attribution !== ar.attribution && (
                <span className="hd-row-tr" lang={lang} dir={RTL.has(lang) ? 'rtl' : 'ltr'}>
                  {tr.attribution}
                </span>
              )}
            </Row>
          )}
          {ar.reference && (
            <Row k={s.reference} lang="ar">
              {ar.reference}
            </Row>
          )}
        </Part>

        {weak && same && same.length > 0 && (
          <Part id="hd-same" title={s.sameTopic}>
            <ul className="hd-same">
              {same.map((x) => (
                <li key={x.id}>
                  <a href={hadithPath(x.id)} onClick={(e) => (e.preventDefault(), navigate(hadithPath(x.id)))}>
                    <span className="hd-same-text" lang="ar" dir="rtl">
                      {x.text}
                    </span>
                    <span className="hd-same-meta">
                      <GradeBadge h={{ grade: x.grade, class: 'sahih' }} />
                      {x.attribution && (
                        <span lang="ar" dir="rtl">
                          {x.attribution}
                        </span>
                      )}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Part>
        )}

        <DorarGrade />

        {(ex.explanation || ex.hints.length > 0 || ar.words.length > 0) && (
          <Part id="hd-sharh" title={s.explanation} source={<SourceLine name={s.sourceName} detail={sourceDetail} label={sourceLabel} onOpen={() => setSheet(true)} />}>
            {ex.explanation && (
              <div className={`hd-ex${long && !more ? ' is-cut' : ''}`} lang={exLang} dir={RTL.has(exLang) ? 'rtl' : 'ltr'}>
                {ex.explanation}
              </div>
            )}
            {long && (
              <button type="button" className="hd-fold" aria-expanded={more} onClick={() => setMore((x) => !x)}>
                <span>{more ? s.showLess : s.showMore}</span>
                <IconChevronOpen open={more} />
              </button>
            )}
            {ex.hints.length > 0 && (
              <>
                <p className="hd-part-sub">{s.benefits}</p>
                <ol className="hd-hints" lang={exLang} dir={RTL.has(exLang) ? 'rtl' : 'ltr'}>
                  {ex.hints.map((h, k) => (
                    <li key={k}>
                      <span className="hd-num" aria-hidden="true">
                        {num(k + 1)}
                      </span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}
            {ar.words.length > 0 && (
              <>
                <p className="hd-part-sub">{s.words}</p>
                <dl className="hd-words" lang="ar" dir="rtl">
                  {ar.words.map((w, k) => (
                    <div key={k}>
                      <dt>{w.word}</dt>
                      <dd>{w.meaning.trim()}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </Part>
        )}
      </main>

      <Sheet open={sheet} onClose={() => setSheet(false)} title={s.sourceSheetTitle}>
        <div className="hd-sheet">
          <p className="hd-sheet-name">{s.sourceName}</p>
          {version && <Row k={s.rowVersion}>{version}</Row>}
          <Row k={s.rowVia}>{s.rowVia_value}</Row>
          <Row k={s.rowShow}>{s.rowShow_value}</Row>
          <a className="hd-open" href={(lang !== 'ar' && tr ? tr : ar).url} target="_blank" rel="noopener noreferrer">
            {s.openSource}
          </a>
        </div>
      </Sheet>
    </div>
  )
}

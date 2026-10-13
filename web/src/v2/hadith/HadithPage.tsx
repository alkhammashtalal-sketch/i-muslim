import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { Sheet } from '../../components/Sheet'
import { IconChevronBack } from '../../components/Icons'
import { useI18n } from '../../i18n'
import { fmt, numFmt } from '../../quran/format'
import { hadithPath, navigate } from '../../quran/route'
import { webOrigin } from '../../api/base'
import { getHadith, getQuiz, getSameTopic, isWeak, NotFound, quizLang, splitIntro, type Hadith, type HadithBrief, type HadithPair, type QuizQuestion } from './api'
import { DorarGrade } from './DorarGrade'
import { GradeBadge } from './GradeBadge'
import { splitReferences } from './references'
import { HADITH } from './strings'
import { SourceFoot } from '../sources/ReportError'
import { UNDERSTAND } from './strings-understand'
import { Understand } from './Understand'
import './hadith.css'
import { shareLink } from '../../native/share'

const RTL = new Set(['ar', 'ur'])
const LONG = 700
// The lines the explanation keeps once an answer folds it (understand.css, .hd-ex.is-folded).
const FOLD_LINES = 5

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
 *  explanation (no written permission yet) and Ibn Baz's audio (not linked yet). The references show their first two
 *  lines, the rest under «كل المراجع» (reply 0031-add16 §3). */
export function HadithPage({ id }: { id: string }) {
  const { lang, content } = useI18n()
  const s = HADITH[lang]
  const num = numFmt(lang)
  const [sheet, setSheet] = useState(false)
  const [more, setMore] = useState(false)
  // «كل المراجع» is open for one hadith only: the page stays mounted from one hadith to the next (same-topic links, back).
  const [refsOpenFor, setRefsOpenFor] = useState<string | null>(null)
  const allRefs = refsOpenFor === id
  const [copied, setCopied] = useState(false)
  const [n, setN] = useState(0)
  // Results are kept with the request they answer, so a new id, language or retry reads as loading by itself.
  const key = `${id}|${content}|${n}`
  const [res, setRes] = useState<{ key: string; state: 'ok' | 'missing' | 'error'; pair?: HadithPair } | null>(null)
  const [sameRes, setSameRes] = useState<{ id: string; items: HadithBrief[] } | null>(null)
  // «تأكد من فهمك» (reply 0033 §أ2): the questions of the row in the quiz's language, and whether an answer has folded
  // the explanation (for this hadith only: the page stays mounted between hadiths).
  const qLang = quizLang(content)
  const [quizRes, setQuizRes] = useState<{ key: string; questions: QuizQuestion[] } | null>(null)
  const [foldedFor, setFoldedFor] = useState<string | null>(null)
  const exRef = useRef<HTMLDivElement>(null)
  const [exOverflows, setExOverflows] = useState(false)
  const state = res?.key === key ? res.state : 'loading'
  const pair = res?.key === key ? (res.pair ?? null) : null
  const same = sameRes?.id === id ? sameRes.items : null

  useEffect(() => {
    let alive = true
    getHadith(id, content).then(
      (p) => {
        if (!alive) return
        setRes({ key, state: 'ok', pair: p })
        // Only a shown hadith with benefits in the quiz's language asks for its questions (one read by key).
        const row = qLang === 'ar' ? p.ar : p.tr?.lang === qLang ? p.tr : undefined
        if (!isWeak(p.ar) && row?.hints.length)
          getQuiz(id, qLang).then(
            (questions) => alive && setQuizRes({ key, questions }),
            () => alive && setQuizRes({ key, questions: [] }),
          )
        if (isWeak(p.ar))
          getSameTopic(id).then(
            (items) => alive && setSameRes({ id, items }),
            () => alive && setSameRes({ id, items: [] }),
          )
      },
      (e) => alive && setRes({ key, state: e instanceof NotFound ? 'missing' : 'error' }),
    )
    window.scrollTo?.(0, 0)
    return () => {
      alive = false
    }
  }, [id, content, key, qLang])

  // After an answer the explanation folds to its first lines; «الشرح كاملًا» shows only if there is more to read.
  const folded = foldedFor === key
  useLayoutEffect(() => {
    const el = exRef.current
    if (folded && el && el.classList.contains('is-folded')) setExOverflows(el.scrollHeight > el.clientHeight + 1)
  }, [folded, more, res])

  const back = () => (history.length > 1 ? history.back() : navigate('/'))
  const share = async (h: Hadith) => {
    const url = `${webOrigin()}${hadithPath(h.id)}`
    const text = [h.text, [h.grade, h.attribution].filter(Boolean).join(' · '), `${s.sourceName} · ${h.url}`].join('\n')
    try {
      if ((await shareLink({ text, url })) === 'shared') return
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // closed by the user
    }
  }
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
  const refs = splitReferences(ar.reference)
  // «تأكد من فهمك»: shown when the row in the quiz's language has benefits and kept questions; until they are known
  // the benefits wait, so they never show before the question.
  const quizRow = qLang === 'ar' ? ar : tr?.lang === qLang ? tr : undefined
  const quizHints = !weak && quizRow ? quizRow.hints : []
  const quiz = quizHints.length ? (quizRes?.key === key ? quizRes.questions : null) : []
  const quizOn = !!quiz && quiz.length > 0
  const exCut = quizOn ? folded && !more : long && !more
  const exFold = quizOn ? !!ex.explanation && folded && (exOverflows || more) : long
  const u = UNDERSTAND[lang]
  const reread = () => {
    setMore(true)
    requestAnimationFrame(() => {
      const part = document.getElementById('hd-sharh')
      part?.scrollIntoView({ block: 'start', behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
      const h = document.getElementById('hd-sharh-h')
      h?.setAttribute('tabindex', '-1')
      h?.focus({ preventScroll: true })
    })
  }

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
          {/* One reference per line, as written: the first two, the rest under «كل المراجع» (reply 0031-add16 §3). */}
          {refs.shown.length > 0 && (
            <Row k={refs.shown.length + refs.rest.length > 1 ? s.references : s.reference} lang="ar">
              {refs.shown.map((l, k) => (
                <span key={k} className="hd-ref">
                  {l}
                </span>
              ))}
              {refs.rest.length > 0 && (
                <span id="hd-refs-rest" className="hd-refs-rest" hidden={!allRefs}>
                  {refs.rest.map((l, k) => (
                    <span key={k} className="hd-ref">
                      {l}
                    </span>
                  ))}
                </span>
              )}
            </Row>
          )}
          {refs.rest.length > 0 && (
            <button type="button" className="hd-fold hd-refs-fold" aria-expanded={allRefs} aria-controls="hd-refs-rest" onClick={() => setRefsOpenFor((x) => (x === id ? null : id))}>
              <span>{s.allReferences}</span>
              <IconChevronOpen open={allRefs} />
            </button>
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

        {(ex.explanation || (!quizOn && ex.hints.length > 0) || ar.words.length > 0) && (
          <Part id="hd-sharh" title={s.explanation} source={<SourceLine name={s.sourceName} detail={sourceDetail} label={sourceLabel} onOpen={() => setSheet(true)} />}>
            {ex.explanation && (
              <div
                ref={exRef}
                id="hd-ex"
                className={`hd-ex${exCut ? (quizOn ? ' is-folded' : ' is-cut') : ''}`}
                lang={exLang}
                dir={RTL.has(exLang) ? 'rtl' : 'ltr'}
              >
                {ex.explanation}
              </div>
            )}
            {exFold && (
              <button type="button" className="hd-fold" aria-expanded={more} onClick={() => setMore((x) => !x)}>
                <span>{more ? s.showLess : s.showMore}</span>
                <IconChevronOpen open={more} />
              </button>
            )}
            {/* With the quiz, the benefits have their own part after it (folded until an answer); while it loads, none. */}
            {quiz && !quizOn && ex.hints.length > 0 && (
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

        {quizOn && quizRow && (
          <Understand
            key={key}
            lang={quizRow.lang as typeof lang}
            questions={quiz}
            hints={quizRow.hints}
            onAnswer={() => {
              // Whether the folded explanation hides anything is known before it folds, so the page changes once.
              const el = exRef.current
              if (el) setExOverflows(el.scrollHeight > FOLD_LINES * parseFloat(getComputedStyle(el).lineHeight) + 1)
              setFoldedFor(key)
              setMore(false)
            }}
            onReread={reread}
            source={<SourceLine name={u.sourceName} detail={u.sourceDetail} label={fmt(s.aboutSource, { name: u.sourceName })} onOpen={() => setSheet(true)} />}
          />
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
          {/* «أبلغ عن خطأ» with this hadith's place, and «المصادر والشكر» (reply 0033 §أ3). */}
          <SourceFoot loc={{ type: 'hadith', id: ar.id, lang: content, source: 'hadeethenc', version: (lang !== 'ar' && tr ? tr : ar).version ?? undefined, byKind: { text: { source: 'hadeethenc', version: ar.version ?? undefined } } }} onLeave={() => setSheet(false)} />
        </div>
      </Sheet>
    </div>
  )
}

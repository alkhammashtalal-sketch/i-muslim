import { useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import type { Lang } from '../../../../shared/api'
import { useI18n } from '../../i18n'
import { fmt, numFmt } from '../../quran/format'
import { hadithPath, navigate } from '../../quran/route'
import type { QuizQuestion } from './api'
import { HADITH } from './strings'
import { UNDERSTAND } from './strings-understand'
import { contentDir } from '../lang/served'
import './understand.css'

// The questions' direction from the served languages' data (reply 0033-add2 §2), as on the hadith page.
const RTL = { has: (l: string) => contentDir(l) === 'rtl' }

function IconCheckCircle({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.6" />
      <path d="m8.4 12.4 2.5 2.5 4.8-5.1" />
    </svg>
  )
}
function IconXCircle() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.6" />
      <path d="m9.2 9.2 5.6 5.6" />
      <path d="m14.8 9.2-5.6 5.6" />
    </svg>
  )
}
function IconBook() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 6.6C10 5.1 7 4.7 4 5.1v12.6c3-.4 6 0 8 1.5 2-1.5 5-1.9 8-1.5V5.1c-3-.4-6 0-8 1.5Z" />
      <path d="M12 6.6v12.6" />
    </svg>
  )
}
function IconChevronDown() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  )
}

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
/** What scrolls the page: the app's scrolling column (.scroll), or the document. */
function scroller(el: Element | null): Element {
  for (let e = el?.parentElement; e; e = e.parentElement) {
    const o = getComputedStyle(e).overflowY
    if ((o === 'auto' || o === 'scroll') && e.scrollHeight > e.clientHeight) return e
  }
  return document.scrollingElement ?? document.documentElement
}

/**
 * «تأكد من فهمك» (reply 0033 §أ2; boards Understand, UnderstandWrong, UnderstandN), then «من فوائد الحديث».
 * One question per benefit (five at most), each with the hadith's own benefit and three benefits of other hadiths,
 * all as stored, in the order fixed at load time. Checking is a comparison on the device: nothing about the answer is
 * sent, stored or counted, and there is no score. The benefits stay folded until the question is answered (or the
 * reader asks for them), so the answer is not seen before the question.
 */
export function Understand({
  lang,
  questions,
  hints,
  onAnswer,
  onReread,
  source,
}: {
  /** The language of the benefits (the row the quiz was built for). */
  lang: Lang
  questions: QuizQuestion[]
  hints: string[]
  /** An answer was checked: the page folds the explanation. */
  onAnswer: () => void
  /** «اقرأ الشرح مرة ثانية»: the page opens the explanation and goes to it. */
  onReread: () => void
  /** The source line «موسوعة الأحاديث النبوية المترجمة · فوائد الحديث» (opens «عن المصدر»). */
  source: ReactNode
}) {
  const { lang: ui } = useI18n()
  const u = UNDERSTAND[ui]
  const s = HADITH[ui]
  const num = numFmt(ui)
  const dir = RTL.has(lang) ? 'rtl' : 'ltr'
  const [k, setK] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [finished, setFinished] = useState(false)
  const [shownByReader, setShownByReader] = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const questionRef = useRef<HTMLParagraphElement>(null)
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const reopenRef = useRef<HTMLButtonElement>(null)
  const benefitsRef = useRef<HTMLHeadingElement>(null)
  // After «تحقّق» the explanation above folds: the section keeps its place on screen, and focus goes to the choice.
  const pending = useRef<{ top: number; focus: 'choice' | 'question' | 'reopen' | 'benefits' } | null>(null)

  const q = questions[Math.min(k, questions.length - 1)]
  const last = k >= questions.length - 1
  const benefitsOpen = answered || finished || shownByReader

  useLayoutEffect(() => {
    const p = pending.current
    if (!p) return
    pending.current = null
    const top = sectionRef.current?.getBoundingClientRect().top
    if (top != null && p.focus === 'choice' && Math.abs(top - p.top) > 1) scroller(sectionRef.current).scrollBy(0, top - p.top)
    if (p.focus === 'choice' && selected != null) optionRefs.current[selected]?.focus({ preventScroll: true })
    if (p.focus === 'question') {
      questionRef.current?.focus({ preventScroll: true })
      const r = sectionRef.current?.getBoundingClientRect()
      const sc = scroller(sectionRef.current)
      const edge = sc === document.scrollingElement ? 0 : sc.getBoundingClientRect().top
      if (r && r.top < edge) sectionRef.current?.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' })
    }
    if (p.focus === 'reopen') reopenRef.current?.focus({ preventScroll: true })
    if (p.focus === 'benefits') benefitsRef.current?.focus({ preventScroll: true })
  })

  const choose = (i: number) => {
    if (!answered) setSelected(i)
  }
  const check = () => {
    if (selected == null || answered) return
    pending.current = { top: sectionRef.current?.getBoundingClientRect().top ?? 0, focus: 'choice' }
    setAnswered(true)
    onAnswer()
  }
  const next = () => {
    if (last) {
      pending.current = { top: 0, focus: 'reopen' }
      setFinished(true)
      return
    }
    pending.current = { top: 0, focus: 'question' }
    setK((x) => x + 1)
    setSelected(null)
    setAnswered(false)
  }
  const reopen = () => {
    pending.current = { top: 0, focus: 'question' }
    setFinished(false)
    setK(0)
    setSelected(null)
    setAnswered(false)
  }
  // The radio group's keys (one tab stop; arrows move and choose, the left arrow is «next» in a right-to-left page).
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const rtl = document.documentElement.dir === 'rtl'
    const step =
      e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : e.key === 'ArrowLeft' ? (rtl ? 1 : -1) : e.key === 'ArrowRight' ? (rtl ? -1 : 1) : 0
    if (!step) return
    e.preventDefault()
    const n = q.options.length
    const j = (i + step + n) % n
    optionRefs.current[j]?.focus()
    choose(j)
  }

  // «هذه الفائدة من شرح حديث «العنوان»»: the whole line is the link to that hadith (a 44-point target), its title as
  // HadeethEnc wrote it.
  const fromOther = (title: string | null, id: string, noteId: string) => {
    const [before, after = ''] = u.fromOther.split('{title}')
    return (
      <a
        className="hd-opt-note hd-opt-link"
        id={noteId}
        href={hadithPath(id)}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
          e.preventDefault()
          navigate(hadithPath(id))
        }}
      >
        {before}
        <span className="hd-opt-title" lang={lang} dir={dir}>
          {title ?? num(Number(id))}
        </span>
        {after}
      </a>
    )
  }

  return (
    <>
      <section ref={sectionRef} className={`hd-part hd-quiz${finished ? ' is-folded' : ''}`} id="hd-quiz" aria-labelledby="hd-quiz-h">
        {finished ? (
          <h2 className="hd-quiz-h" id="hd-quiz-h">
            <button ref={reopenRef} type="button" className="hd-quiz-reopen" aria-expanded="false" aria-controls="hd-quiz" onClick={reopen}>
              <span className="hd-quiz-icon">
                <IconCheckCircle />
              </span>
              <span className="hd-quiz-title">{u.title}</span>
              <IconChevronDown />
            </button>
          </h2>
        ) : (
          <>
            <div className="hd-quiz-head">
              <h2 className="hd-quiz-h" id="hd-quiz-h">
                <span className="hd-quiz-icon">
                  <IconCheckCircle />
                </span>
                {u.title}
              </h2>
              <span className="hd-quiz-count">{fmt(u.counter, { n: num(k + 1), total: num(questions.length) })}</span>
            </div>
            <p className="hd-quiz-q" id="hd-quiz-q" ref={questionRef} tabIndex={-1}>
              {u.question}
            </p>
            <div className="hd-quiz-opts" role="radiogroup" aria-labelledby="hd-quiz-q">
              {q.options.map((o, i) => {
                const right = answered && i === q.answer
                const wrong = answered && !right && i === selected
                const state = right ? 'is-right' : wrong ? 'is-wrong' : !answered && i === selected ? 'is-selected' : ''
                const noteId = `hd-quiz-note-${i}`
                return (
                  <div key={`${q.n}-${i}`} className={`hd-opt ${state}`}>
                    <button
                      ref={(el) => {
                        optionRefs.current[i] = el
                      }}
                      type="button"
                      role="radio"
                      className="hd-opt-btn"
                      aria-checked={selected === i}
                      aria-disabled={answered || undefined}
                      aria-describedby={right || wrong ? noteId : undefined}
                      tabIndex={(selected ?? 0) === i ? 0 : -1}
                      onClick={() => choose(i)}
                      onKeyDown={(e) => onKey(e, i)}
                    >
                      <span className="hd-opt-mark" aria-hidden="true">
                        {right ? <IconCheckCircle size={24} /> : wrong ? <IconXCircle /> : <span className="hd-radio" />}
                      </span>
                      <span className="hd-opt-text" lang={lang} dir={dir}>
                        {o.text}
                      </span>
                    </button>
                    {right && (
                      <p className="hd-opt-note" id={noteId}>
                        {u.thisHadith}
                      </p>
                    )}
                    {wrong && (
                      fromOther(o.title, o.id, noteId)
                    )}
                  </div>
                )
              })}
            </div>
            {!answered ? (
              <>
                <div className="hd-quiz-actions">
                  <button type="button" className="hd-quiz-primary" disabled={selected == null} onClick={check}>
                    {u.check}
                  </button>
                </div>
                <p className="hd-quiz-private">{u.private}</p>
              </>
            ) : (
              <div className="hd-quiz-actions">
                <button type="button" className="hd-quiz-primary" onClick={next}>
                  {last ? u.done : u.next}
                </button>
                <button type="button" className="hd-quiz-secondary" onClick={onReread}>
                  <IconBook />
                  {u.reread}
                </button>
              </div>
            )}
            <p className="hd-quiz-note">{u.note}</p>
            {source}
          </>
        )}
      </section>

      <section className="hd-part hd-benefits" id="hd-benefits" aria-labelledby="hd-benefits-h">
        <h2 className="hd-part-h" id="hd-benefits-h" ref={benefitsRef} tabIndex={-1}>
          {s.benefits}
        </h2>
        {benefitsOpen ? (
          <>
            <ul className="hd-benefit-list" lang={lang} dir={dir}>
              {hints.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
            {source}
          </>
        ) : (
          <>
            <p className="hd-benefits-hidden">{u.benefitsHidden}</p>
            <button
              type="button"
              className="hd-fold"
              aria-expanded="false"
              onClick={() => {
                pending.current = { top: 0, focus: 'benefits' }
                setShownByReader(true)
              }}
            >
              <span>{u.showNow}</span>
              <IconChevronDown />
            </button>
          </>
        )}
      </section>
    </>
  )
}

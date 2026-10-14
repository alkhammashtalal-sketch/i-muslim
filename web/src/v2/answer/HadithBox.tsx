// A hadith in an answer (reply 0048; 0047-report §5 أ-8), and the answer to «هل حديث كذا صحيح؟».
//   HadithBox: under the hadith's frame, its grade as HadeethEnc writes it (rule 10) and its takhrij, then — from
//   GET /api/hadith/:id in the reader's content language — HadeethEnc's translation and, on a press, its explanation,
//   both as stored, and the hadith's page. No «بسّط لي» on a hadith (reply 0048: the explanation is HadeethEnc's only).
//   HadithText: the text as stored; a long one folds under «النص كاملًا», whole one press away (as the day card).
//   GradeCard: the hadith the question quotes, the fixed line «درجته في موسوعة الأحاديث النبوية: …», its badge and
//   takhrij, its page here and on HadeethEnc. Nothing of ours is said about it.
import { useEffect, useId, useState, type MouseEvent } from 'react'
import type { GradeResponse, Quote } from '../../../../shared/api'
import { useI18n } from '../../i18n'
import { MushafFrame } from '../../components/Ornaments'
import { hadithPath, navigate } from '../../quran/route'
import { getHadith, type HadithPair } from '../hadith/api'
import { GradeBadge } from '../hadith/GradeBadge'
import { HADITH } from '../hadith/strings'
import { contentDir } from '../lang/served'
import { ANSWER } from './strings'
import './hadith-box.css'

/** Longer than this, the text folds (the whole of it one press away). */
export const FOLD_CHARS = 700

export function HadithText({ text }: { text: string }) {
  const { t, lang } = useI18n()
  const [open, setOpen] = useState(false)
  const id = useId()
  const long = text.length > FOLD_CHARS
  return (
    <>
      <p id={id} className={`sacred hd-ans-text${long && !open ? ' is-folded' : ''}`} lang="ar" dir="rtl">
        {text}
      </p>
      {long && (
        <button type="button" className="text-link hd-ans-more" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          {open ? HADITH[lang].showLess : t.fullText}
        </button>
      )}
    </>
  )
}

const openPage = (id: string) => (e: MouseEvent) => {
  e.preventDefault()
  navigate(hadithPath(id))
}

export function HadithBox({ q }: { q: Quote }) {
  const { lang, content } = useI18n()
  const s = HADITH[lang]
  const a = ANSWER[lang]
  const [pair, setPair] = useState<HadithPair | null>(null)
  const [explain, setExplain] = useState(false)
  const h = q.hadith
  useEffect(() => {
    if (!h) return
    let alive = true
    getHadith(h.id, content).then(
      (p) => alive && setPair(p),
      () => undefined, // offline: the grade and takhrij from the answer stay
    )
    return () => {
      alive = false
    }
  }, [h, content])
  if (!h) return null
  const tr = content !== 'ar' ? pair?.tr : undefined
  const explanation = tr?.explanation ?? pair?.ar.explanation ?? null
  const exLang = tr?.explanation ? content : 'ar'
  return (
    <div className="hd-ans" data-hadith={h.id}>
      <div className="hd-ans-grade">
        <GradeBadge h={{ grade: q.grade ?? null, class: h.class }} alt={tr?.grade} />
        {/* The takhrij once: it is the quote's reference line already when the two are the same. */}
        {h.attribution && h.attribution.trim() !== q.ref.trim() && (
          <span className="hd-ans-attr" lang="ar" dir="rtl">
            {h.attribution}
          </span>
        )}
      </div>
      {tr?.text && (
        <div className="section">
          <p className="section-label">{s.translation}</p>
          <p className="translation" lang={content} dir={contentDir(content)}>
            {tr.text}
          </p>
        </div>
      )}
      {explanation && (
        <div className="hd-ans-ex">
          <button type="button" className="text-link" aria-expanded={explain} onClick={() => setExplain(!explain)}>
            {s.explanation}
          </button>
          {explain && (
            <p className="hd-ans-ex-text" lang={exLang} dir={contentDir(exLang)}>
              {explanation}
            </p>
          )}
        </div>
      )}
      <a className="text-link hd-ans-page" href={hadithPath(h.id)} onClick={openPage(h.id)}>
        {a.hadithPage}
      </a>
    </div>
  )
}

export function GradeCard({ res }: { res: GradeResponse }) {
  const { lang } = useI18n()
  const s = HADITH[lang]
  const a = ANSWER[lang]
  const h = res.hadith
  return (
    <article className="card v2-card hd-grade" data-testid="grade-card">
      <p className="hd-grade-line" lang={lang} dir={lang === 'ar' || lang === 'ur' ? 'rtl' : 'ltr'}>
        {res.message}
      </p>
      {res.grade_tr && res.grade_tr.grade !== h.grade && (
        <p className="small hd-grade-tr" lang={res.grade_tr.lang} dir={contentDir(res.grade_tr.lang)}>
          {res.grade_tr.grade}
        </p>
      )}
      <MushafFrame>
        <HadithText text={h.text} />
      </MushafFrame>
      <div className="hd-ans-grade">
        <GradeBadge h={{ grade: h.grade, class: h.class }} />
        {h.attribution && (
          <span className="hd-ans-attr" lang="ar" dir="rtl">
            {h.attribution}
          </span>
        )}
      </div>
      <p className="small hd-grade-src">
        {s.sourceName} ·{' '}
        <a href={h.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
          {a.openHadith}
        </a>
      </p>
      <a className="text-link hd-ans-page" href={hadithPath(h.id)} onClick={openPage(h.id)}>
        {a.hadithPage}
      </a>
    </article>
  )
}

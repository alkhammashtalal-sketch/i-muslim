// The luxury name card (add-on 0072-add11 §1; Talal 25 October 00:34: «كرت شكله فاخر على نفس التصميم والتوجه حقنا …
// اسم الله فوق، وتحته البيانات … الآية أو الإثبات على الاسم، وبعده يجي التفسير والإيضاح»). One design for the home
// («يومك», NameOfDay.tsx) and the name's page (/today/name/<n>, NamePage.tsx).
// - The header: the welcome painting's lapis and gold, its frame, and the name large inside the shamsa as «مسلم» is in
//   the welcome's (the widgets' medallion.png, drawn whole: never cut, stretched or recompressed); under it «اسم الله
//   لليوم · <n> من 96 · <the Hijri date>» (another name's page: «اسم من أسماء الله · <n> من 96», no date). From Isha to
//   Fajr the night painting: the lapis deepened toward indigo and the stars raised, as the home's date card at night.
// - The sections in order, each on the painting's paper under a gold divider and a small ornamented head, each only
//   when there is something in it (present-only: a section the server does not send is absent, never filled):
//   1 الدليل (the ayah in the Mushaf face with its place, or the hadith with its grade and takhrij; the ayah for the
//   meaning with its own label); 2 معنى الاسم عند العلماء and 3 من أقوال السلف في الاسم (quoted letter for letter,
//   «قال» or «يُروى عن», the book, its author, volume and page and the link); 4 أثره في قلبك (the readings, or their
//   rewrite when sent, under «شرح تعليمي أعدّه التطبيق، وليس نقلًا عن العلماء»); 5 ادعُ الله به (the Quranic or
//   prophetic duas of the entry); 6 تفسير الآية (al-Saʿdi, then Ibn Kathir, folded).
// - The footer: «شارك» (the share image's page, /today/name/<n>/share: add-on 0072-add10, another branch), the
//   previous and next names, «كل الأسماء», and the name in «القواعد المثلى».
// - On the home, the card opens in place, with no navigation: the header, the evidence, the first meaning quote and
//   one saying of the Salaf, then «أكمل القراءة» shows the rest in place (the focus goes to the first part it shows).
// - Outside Arabic (add-on 0071-add5 §2.3): the name in Arabic alone (no source of ours gives it in Latin letters, and
//   none is written by the app); the ayah with its meaning in the reader's language from our sources; the quotes and
//   the readings in Arabic under a line in the reader's language; the tafsir in the reader's language where we have
//   it (Ibn Kathir abridged in English, Quran Foundation), else the Arabic.
// - The listen button (add-on 0072-add14, its own branch) in its two places: under the name, «استمع» to the name in its
//   evidence ayah, and under the evidence ayah, its recitation (name-card-listen.tsx; `data-listen-slot`). Empty, and
//   not drawn, while the button is not in the build or has nothing to say.
import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import type { PassageResponse, TafsirText } from '../../../../../shared/api'
import { Mkp } from '../../../components/Ornaments'
import { useI18n } from '../../../i18n'
import { AyahEnd } from '../../../quran/AyahEnd'
import { getKatheerEn, type QfTafsir } from '../../../quran/api'
import { arabicDigits, fmt, numFmt } from '../../../quran/format'
import { navigate, quranPath } from '../../../quran/route'
import { hijriDisc } from '../../home/hijri-disc'
import { SURA_TYPE } from '../../reading/meta'
import { IcShare } from '../../reading/icons'
import { SourceLine, useReadingStrings } from '../../reading/ui'
import { meaningSource, type ReportLoc } from '../../sources/place'
import { useDaySky } from '../day-clock'
import { IcChevron } from '../icons'
import { openToday } from '../Screen'
import { HadithBlock, useTools } from '../ToolParts'
import { fill } from '../strings-tools'
import { loadGlobalOffset, loadHijriOffset } from '../store'
import { totalOffset } from '../../../daily/hijri'
import { cardPlan, heartOf, quoteAttribution, quoteSite, quoteSource, riyadhNoon, shownCount, shownQuotes, type SectionKey } from './name-card-model'
import { NAMES_PATH, namePath, type NameEnriched, type NameEntry, type NameQuote, type NameReadings, type NameRef } from './name-day-api'
import { AyahMeaning, Readings, type Loaded } from './NameEntry'
import { bookNamesOf, NameSheet, useSuraNames, type Name } from './Names'
import { EvidenceSlot, NameSlot, nameHeard } from './name-card-listen'
import { NAME_CARD } from './strings-name-card'
import { NAME_DAY } from './strings-name-day'
import './name-card.css'

/** The shamsa: the widgets' picture (660 × 660), its light disc 150 px of radius at its centre. */
export const SHAMSA_SRC = '/art/medallion.png'
const DISC = 300 / 660

export type CardData = { entry: NameEntry; count: number; readings?: NameReadings; prev?: NameRef; next?: NameRef } & NameEnriched

type Props = {
  mode: 'home' | 'page'
  data: CardData
  /** The quoted texts, in the order of partsOf; on the home they may come in two steps (the first, then the rest). */
  parts: Loaded[]
  /** The Riyadh day whose name this is, or null for another name's page (no date then). */
  day: string | null
  /** The home: the rest is still loading («أكمل القراءة» waits for it). */
  pending?: boolean
}

/** The Hijri offset the calendar and the home's date card apply (the user's and the global one): the same date here. */
function useHijriOffset() {
  const [user] = useState(loadHijriOffset)
  const [global, setGlobal] = useState(0)
  useEffect(() => {
    let alive = true
    loadGlobalOffset().then((n) => alive && setGlobal(n))
    return () => {
      alive = false
    }
  }, [])
  return totalOffset(user, global)
}

const go = (path: string, home: boolean) => (e: MouseEvent) => {
  e.preventDefault()
  if (home) openToday(path)
  else navigate(path)
  window.scrollTo?.(0, 0)
  document.querySelector('.dt-main')?.scrollTo?.(0, 0)
}

/** The name inside the shamsa's disc, as large as the disc holds it: one line, or two for a pair («القابض الباسط»). */
function ShamsaName({ name }: { name: string }) {
  const box = useRef<HTMLDivElement>(null)
  const text = useRef<HTMLHeadingElement>(null)
  const [size, setSize] = useState<number | null>(null)
  const words = name.split(/\s+/).filter(Boolean)
  const lines = words.length > 1 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [name]
  useLayoutEffect(() => {
    const b = box.current
    const t = text.current
    if (!b || !t) return
    const fit = () => {
      const d = b.getBoundingClientRect().width * DISC
      if (!(d > 0)) return
      // Inside a circle: the lines' box within the square inscribed in it, with the ink's own margins.
      const maxW = d * (lines.length > 1 ? 0.84 : 0.86)
      const maxH = d * (lines.length > 1 ? 0.8 : 0.66)
      let s = Math.round(d * (lines.length > 1 ? 0.3 : 0.4))
      for (; s > 14; s -= 1) {
        t.style.fontSize = `${s}px`
        if (t.scrollWidth <= maxW && t.getBoundingClientRect().height <= maxH) break
      }
      setSize(s)
    }
    fit()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null
    ro?.observe(b)
    let alive = true
    void document.fonts?.ready.then(() => alive && fit())
    return () => {
      alive = false
      ro?.disconnect()
    }
  }, [name, lines.length])
  return (
    <div className="nc-shamsa" ref={box}>
      <img className="nc-shamsa-art" src={SHAMSA_SRC} alt="" width={660} height={660} decoding="async" draggable={false} />
      <div className="nc-disc">
        <h2 ref={text} className="nc-name nd-name" lang="ar" dir="rtl" style={size ? { fontSize: `${size}px` } : undefined}>
          {lines.map((l, i) => (
            <span key={i} className="nc-name-line">
              {l}
            </span>
          ))}
        </h2>
      </div>
    </div>
  )
}

/** A small four-pointed star of the board (✦), drawn in gold beside the section heads. Decoration only. */
const Star = () => (
  <svg className="nc-star" width="10" height="10" viewBox="-5 -5 10 10" aria-hidden="true" focusable="false">
    <path d="M0-5Q.9-.9 5 0Q.9.9 0 5Q-.9.9-5 0Q-.9-.9 0-5Z" />
  </svg>
)

/** A chevron pointing down: what is folded below (the tafsir's folds, «أكمل القراءة»). */
const IcDown = () => (
  <svg className="nc-down" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="m6 9.5 6 6 6-6" />
  </svg>
)

/** The gold divider between sections: two gold rules and an eight-pointed star between them. */
const Divider = () => (
  <div className="nc-div" aria-hidden="true">
    <span className="nc-div-rule" />
    <svg className="nc-div-star" width="14" height="14" viewBox="-7 -7 14 14" focusable="false">
      <rect x="-4.2" y="-4.2" width="8.4" height="8.4" />
      <rect x="-4.2" y="-4.2" width="8.4" height="8.4" transform="rotate(45)" />
      <circle r="1.6" className="nc-div-heart" />
    </svg>
    <span className="nc-div-rule" />
  </div>
)

function Section({ k, title, children, sub }: { k: SectionKey; title: string; children: ReactNode; sub?: ReactNode }) {
  const id = useId()
  return (
    <section className="nc-sec" data-sec={k} aria-labelledby={id}>
      <Divider />
      <h3 className="nc-h" id={id} tabIndex={-1}>
        <Star />
        <span>{title}</span>
        <Star />
      </h3>
      {sub}
      {children}
    </section>
  )
}

/** The ayah's place: «هود · ٥٧ · مكية», as in the reader. */
function useRefLine() {
  const { t, lang } = useI18n()
  const r = useReadingStrings()
  const num = numFmt(lang)
  return (a: NonNullable<PassageResponse['ayah']>) =>
    [lang === 'ar' ? a.suraName : fmt(t.suraNum, { n: num(a.sura) }), lang === 'ar' ? arabicDigits(a.aya) : num(a.aya), SURA_TYPE[a.sura] ? r[SURA_TYPE[a.sura]!] : null].filter(Boolean).join(' · ')
}

/** An ayah, letter for letter from D1 by its id, in the Mushaf face with its marker, its place and its source line; outside
 *  Arabic its meaning in the reader's language. */
function AyahQuote({ part, label }: { part: Extract<Loaded, { kind: 'ayah' }>; label?: string }) {
  const { lang } = useI18n()
  const r = useReadingStrings()
  const refOf = useRefLine()
  const p = part.p
  const a = p.ayah!
  const refLine = refOf(a)
  const byKind = lang !== 'ar' ? meaningSource(p.meaning) : undefined
  const loc: ReportLoc = { type: 'ayah', id: `${a.sura}:${a.aya}`, lang, source: 'ksu', label: refLine, ...(byKind ? { byKind } : {}) }
  return (
    <div className="nd-part nc-item" data-part="ayah" data-id={p.id}>
      {label && <p className="nd-label nc-label">{label}</p>}
      <p className="nd-ayah" lang="ar" dir="rtl">
        <AyahEnd text={p.text}>
          <Mkp n={arabicDigits(a.aya)} size={26} />
        </AyahEnd>
      </p>
      <p className="nd-ref">{refLine}</p>
      <SourceLine k="mushaf" name={r.srcMushaf} via={r.srcKsu} url={p.url} loc={loc} />
      {lang !== 'ar' && <AyahMeaning p={p} />}
    </div>
  )
}

function HadithQuote({ part, label }: { part: Extract<Loaded, { kind: 'hadith' }>; label?: string }) {
  return (
    <div className="nd-part nc-item" data-part="hadith" data-id={part.h.id}>
      {label && <p className="nd-label nc-label">{label}</p>}
      <HadithBlock h={part.h} />
    </div>
  )
}

const Quoted = ({ x, label }: { x: Loaded; label?: string }) => (x.kind === 'ayah' ? <AyahQuote part={x} label={label} /> : <HadithQuote part={x} label={label} />)

/** The reader's page of an ayah id «quran:s:a», or null. */
const ayahPath = (id: string) => {
  const m = id.match(/^quran:(\d{1,3}):(\d{1,3})$/)
  return m ? quranPath(Number(m[1]), Number(m[2])) : null
}

/** A scholar's words, letter for letter: the text, «قال …» or «يُروى عن …», then the book, its author, its place and its
 *  page, which opens outside the app. Arabic in every interface. */
function Quote({ q }: { q: NameQuote }) {
  const site = quoteSite(q.url)
  return (
    <figure className="nc-quote" data-part="quote" lang="ar" dir="rtl" data-context={q.context ? (q.context_required ? 'required' : 'shown') : undefined}>
      <blockquote className="nc-quote-box" cite={q.url}>
        {/* The ayah the scholar is explaining, against his words: for a prophet's words in the ayah it is what says whose
            they are, so it is never apart from them. */}
        {q.context && (
          <p className="nc-context">
            {q.ayah && ayahPath(q.ayah) ? (
              <a className="nc-context-link" href={ayahPath(q.ayah)!} onClick={(ev) => (ev.preventDefault(), navigate(ayahPath(q.ayah!)!))}>
                {q.context}
              </a>
            ) : (
              q.context
            )}
          </p>
        )}
        <p className="nc-quote-text">{q.text}</p>
      </blockquote>
      <figcaption>
        <p className="nc-sayer">{quoteAttribution(q)}</p>
        {q.via && <p className="nc-via">{q.via}</p>}
        <p className="nc-src">
          <span>{quoteSource(q)}</span>
          {site && (
            <span className="nc-src-site">
              <span aria-hidden="true"> · </span>
              <a className="nc-link" href={q.url} target="_blank" rel="noopener noreferrer">
                {site}
              </a>
            </span>
          )}
        </p>
      </figcaption>
    </figure>
  )
}

/** Paragraphs of a tafsir, all of them: the fold is the section's own. */
function TafsirParagraphs({ x }: { x: TafsirText }) {
  const ps = x.paragraphs?.length ? x.paragraphs : [x.text]
  return (
    <>
      {ps.map((p, i) => (
        <p key={i} className={`nd-tafsir${x.empty ? ' is-empty' : ''}`} lang="ar" dir="rtl">
          {p}
        </p>
      ))}
    </>
  )
}

/** «تفسير الآية»: al-Saʿdi, then Ibn Kathir, each folded under its name. In English, Ibn Kathir abridged in English from
 *  Quran Foundation where our server has it (add-on 0071-add14), in the Arabic's place (add-on 0071-add5 §2.3). */
function TafsirFolds({ part }: { part: Extract<Loaded, { kind: 'ayah' }> }) {
  const { lang } = useI18n()
  const r = useReadingStrings()
  const refOf = useRefLine()
  const p = part.p
  const a = p.ayah!
  const saadi = p.tafsir?.find((x) => x.key === 'saadi')
  const katheer = p.tafsir?.find((x) => x.key === 'katheer')
  const [en, setEn] = useState<QfTafsir | null>(null)
  useEffect(() => {
    if (lang !== 'en') return
    let alive = true
    getKatheerEn(a.sura, a.aya).then(
      (t) => alive && setEn(t),
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [lang, a.sura, a.aya])
  const loc: ReportLoc = { type: 'ayah', id: `${a.sura}:${a.aya}`, lang, source: 'ksu', label: refOf(a) }
  return (
    <>
      <p className="nd-ref nc-of">{refOf(a)}</p>
      {saadi && (
        <details className="nc-fold" data-part="tafsir" data-key="saadi">
          <summary>
            <span>{r.srcSaadi}</span>
            <IcDown />
          </summary>
          <TafsirParagraphs x={saadi} />
          <SourceLine k="saadi" name={r.srcSaadi} via={r.srcKsu} url={saadi.url} loc={loc} />
        </details>
      )}
      {en ? (
        <details className="nc-fold" data-part="tafsir" data-key="katheer-en">
          <summary>
            <span>{r.katheerEn}</span>
            <IcDown />
          </summary>
          <div className="nc-qf" lang="en" dir="ltr">
            {en.blocks.map((b, i) =>
              b.type === 'h' ? (
                <h4 key={i} dir="auto" className="nc-qf-h">
                  {b.text}
                </h4>
              ) : (
                <p key={i} dir="auto" className="nd-tafsir">
                  {b.text}
                </p>
              ),
            )}
          </div>
          <p className="nc-qf-src">
            <a className="nc-link" href={en.source.url} target="_blank" rel="noopener noreferrer" lang="en" dir="ltr">
              {en.resource.name} · {en.source.name}
            </a>
          </p>
        </details>
      ) : (
        katheer && (
          <details className="nc-fold" data-part="tafsir" data-key="katheer">
            <summary>
              <span>{r.srcKatheer}</span>
              <IcDown />
            </summary>
            <TafsirParagraphs x={katheer} />
            <SourceLine k="katheer" name={r.srcKatheer} via={r.srcKsu} url={katheer.url} loc={loc} />
          </details>
        )
      )}
    </>
  )
}

/** The footer: «شارك», the name in «القواعد المثلى», the previous and next names, «كل الأسماء». */
function Footer({ entry, count, prev, next, home }: { entry: NameEntry; count: number; prev?: NameRef; next?: NameRef; home: boolean }) {
  const { lang } = useI18n()
  const { s: tools } = useTools()
  const c = NAME_CARD[lang] ?? NAME_CARD.ar
  const s = NAME_DAY[lang] ?? NAME_DAY.ar
  const num = numFmt(lang)
  const suras = useSuraNames()
  const [book, setBook] = useState<Name | null>(null)
  const inBook = bookNamesOf(entry.name)
  // The share image's page (add-on 0072-add10 §1: imuslim://today/name/<n>/share), the sheet built on its own branch.
  const share = `${namePath(entry.n)}/share`
  return (
    <footer className="nc-foot" data-testid="name-foot">
      <Divider />
      <div className="nc-actions">
        <a className="nc-btn" href={share} onClick={go(share, home)} aria-label={fill(c.shareLabel, { name: entry.name })} data-testid="name-share">
          <IcShare size={18} />
          <span>{c.share}</span>
        </a>
        {inBook.map((n) => (
          <button key={n.name} type="button" className="nc-btn" onClick={() => setBook(n)} aria-haspopup="dialog" data-testid="name-book">
            {fill(s.inBook, { book: tools.bookName })}
            {inBook.length > 1 ? ` · ${n.name}` : ''}
          </button>
        ))}
      </div>
      <nav className="nc-nav" aria-label={c.navLabel} data-testid="name-nav">
        {prev && next && (
          <div className="nd-nav nc-pn">
            <a href={namePath(prev.n)} onClick={go(namePath(prev.n), home)} rel="prev" data-testid="name-prev">
              <span className="nd-nav-k">{s.prev}</span>
              <span className="nd-nav-name" lang="ar" dir="rtl">
                {prev.name}
              </span>
            </a>
            <a href={namePath(next.n)} onClick={go(namePath(next.n), home)} rel="next" data-testid="name-next">
              <span className="nd-nav-k">{s.next}</span>
              <span className="nd-nav-name" lang="ar" dir="rtl">
                {next.name}
              </span>
            </a>
          </div>
        )}
        <a className="nd-all nc-all" href={NAMES_PATH} onClick={go(NAMES_PATH, home)} data-testid="name-all">
          <span>
            {s.allNames} <span className="nd-count">({num(count)})</span>
          </span>
          <IcChevron />
        </a>
      </nav>
      <NameSheet n={book} onClose={() => setBook(null)} suras={suras} />
    </footer>
  )
}

export function NameCard({ mode, data, parts, day, pending = false }: Props) {
  const { lang } = useI18n()
  const c = NAME_CARD[lang] ?? NAME_CARD.ar
  const d = NAME_DAY[lang] ?? NAME_DAY.ar
  const num = numFmt(lang)
  const sky = useDaySky()
  const offset = useHijriOffset()
  const e = data.entry
  const home = mode === 'home'
  const [open, setOpen] = useState(!home)
  const [focusFirst, setFocusFirst] = useState(false)
  const moreId = useId()

  // The parts by section: the evidence (the ayah or hadith, and the ayah for the meaning), the duas, and the tafsir's ayah.
  const isEvidence = (x: Loaded) => (x.kind === 'ayah' ? x.id === e.ayah || x.id === e.meaningAyah : x.id === e.hadith)
  const evidence = parts.filter(isEvidence)
  const duas = parts.filter((x) => !isEvidence(x))
  const tafsir = parts.find((x): x is Extract<Loaded, { kind: 'ayah' }> => x.kind === 'ayah' && x.tafsir && !!x.p.tafsir?.some((t) => t.key === 'saadi' || t.key === 'katheer'))
  // The ayah «استمع» under the name recites: the evidence ayah itself, when it is shown.
  const nameAyah = evidence.find((x): x is Extract<Loaded, { kind: 'ayah' }> => x.kind === 'ayah' && x.id === e.ayah)
  const meaningOf = (x: Extract<Loaded, { kind: 'ayah' }>) =>
    lang === 'ar' ? null : x.p.meaning ? { text: x.p.meaning.text, lang: x.p.meaning.lang, ayah: x.id } : x.p.text_en ? { text: x.p.text_en, lang: 'en', ayah: x.id } : null
  const meanings = shownQuotes(data.meaning)
  const salaf = shownQuotes(data.salaf)
  const heart = heartOf(data)
  const has: Record<SectionKey, number> = { evidence: evidence.length, meaning: meanings.length, salaf: salaf.length, heart: heart ? 1 : 0, dua: duas.length, tafsir: tafsir ? 1 : 0 }
  const plan = cardPlan(has, mode)
  const n = (k: SectionKey) => shownCount(k, has[k], open, plan)

  // «أكمل القراءة»: the focus goes to the head of the first section it shows (or of the first shown one that grew).
  const article = useRef<HTMLElement>(null)
  useEffect(() => {
    if (!open || !focusFirst) return
    const k = plan.present.find((x) => !plan.lead.includes(x)) ?? plan.lead.find((x) => has[x] > 1)
    article.current?.querySelector<HTMLElement>(`[data-sec="${k}"] .nc-h`)?.focus({ preventScroll: true })
    setFocusFirst(false)
  })

  const hijri = day ? hijriDisc(lang, riyadhNoon(day), 'Asia/Riyadh', offset)?.full ?? '' : ''
  // The line's parts apart, a small gold star between them: a middle dot beside Arabic digits reads as a zero («٠»).
  const line = [day ? c.today : c.other, fill(c.ofCount, { n: num(e.n), count: num(data.count) }), hijri].filter(Boolean)
  const outside = lang !== 'ar'
  const quoteNote = outside ? (
    <p className="nc-note" lang={lang}>
      {c.quoteInArabic}
    </p>
  ) : undefined
  const evLabel = (x: Loaded) => (x.kind === 'ayah' && x.id === e.meaningAyah && x.id !== e.ayah ? d.meaningAyah : undefined)
  const duaLabel = (x: Loaded) => x.label

  return (
    <article
      ref={article}
      className="nc nd-card"
      data-testid="name-day"
      data-mode={mode}
      data-n={e.n}
      data-open={open ? 'true' : 'false'}
      data-night={sky.state === 'night' ? 'true' : undefined}
      aria-label={fmt(day ? c.cardLabel : d.cardLabel, { name: e.name })}
    >
      <header className="nc-head">
        <span className="nc-frame" aria-hidden="true" />
        <ShamsaName name={e.name} />
        <p className="nc-line" data-testid="name-line">
          {line.map((x, i) => (
            <Fragment key={i}>
              {i > 0 && (
                <span className="nc-sep">
                  <Star />
                  <span className="nc-sep-say">{lang === "ar" || lang === "ur" ? "، " : ", "}</span>
                </span>
              )}
              <span className="nc-line-part">{x}</span>
            </Fragment>
          ))}
        </p>
        {/* The listen button's place under the name (add-on 0072-add14, another branch). */}
        <div className="nc-listen" data-listen-slot="name" data-name={e.name}>
          <NameSlot name={e.name} ayahId={nameAyah?.id ?? null} ayahText={nameAyah?.p.text ?? null} />
        </div>
      </header>
      <div className="nc-body" id={moreId} data-testid="name-day-quoted">
        {n('evidence') > 0 && (
          <Section k="evidence" title={c.evidence}>
            {evidence.slice(0, n('evidence')).map((x, i) => (
              <div key={`${x.kind}${x.id}`}>
                <Quoted x={x} label={evLabel(x)} />
                {/* The listen button's place under the evidence (add-on 0072-add14, another branch). */}
                {i === 0 && (
                  <div className="nc-listen" data-listen-slot="evidence" data-id={x.kind === 'ayah' ? x.id : `hadith:${x.h.id}`}>
                    {/* One button for one recitation: in Arabic the evidence ayah is heard from the name's place when the
                        name is a word of it; here, another ayah, or outside Arabic with its meaning. */}
                    {x.kind === 'ayah' && !(lang === 'ar' && x === nameAyah && nameHeard(e.name, x.p.text)) && <EvidenceSlot id={x.id} meaning={meaningOf(x)} />}
                  </div>
                )}
              </div>
            ))}
          </Section>
        )}
        {n('meaning') > 0 && (
          <Section k="meaning" title={c.meaning} sub={quoteNote}>
            {meanings.slice(0, n('meaning')).map((q, i) => (
              <Quote key={i} q={q} />
            ))}
          </Section>
        )}
        {n('salaf') > 0 && (
          <Section k="salaf" title={c.salaf} sub={quoteNote}>
            {salaf.slice(0, n('salaf')).map((q, i) => (
              <Quote key={i} q={q} />
            ))}
          </Section>
        )}
        {n('heart') > 0 && heart && (
          <Section k="heart" title={c.heart}>
            <Readings rd={heart.kind === 'readings' ? heart.readings : undefined} heart={heart.kind === 'heart' ? heart.paragraphs : undefined} />
          </Section>
        )}
        {/* Three entries' only Quranic text is a dua the file lists (الحكم، المعطي، المنان): on the home it leads. */}
        {n('dua') > 0 && (
          <Section k="dua" title={c.dua}>
            {duas.slice(0, n('dua')).map((x) => (
              <Quoted key={`${x.kind}${x.id}`} x={x} label={duaLabel(x)} />
            ))}
          </Section>
        )}
        {n('tafsir') > 0 && tafsir && (
          <Section k="tafsir" title={c.tafsir}>
            <TafsirFolds part={tafsir} />
          </Section>
        )}
        {!open && plan.more && (
          <div className="nc-more-wrap">
            <button
              type="button"
              className="nc-more"
              aria-expanded={false}
              aria-controls={moreId}
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={() => {
                setOpen(true)
                setFocusFirst(true)
              }}
              data-testid="name-more"
            >
              <span>{c.readMore}</span>
              <IcDown />
            </button>
          </div>
        )}
      </div>
      {open && <Footer entry={e} count={data.count} prev={data.prev} next={data.next} home={home} />}
    </article>
  )
}

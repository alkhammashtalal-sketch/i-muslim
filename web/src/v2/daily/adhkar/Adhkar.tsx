// Adhkar (reply 0032 D-5; boards Adhkar and AdhkarN): HadeethEnc's eight adhkar categories, sahih and hasan only,
// each hadith under its HadeethEnc title, whole and verbatim, with the words to say highlighted where they are clear
// (data/adhkar-highlights.json; reply 0031-add16 §2: all of a dhikr's segments or none, and none in a hadith with more
// than one «…» pair until the coordinator's review, decided by the Worker), and a counter only where the hadith states
// the number (data/adhkar-counts.json). Counts stay on the device and start again each day. No audio.
import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useI18n } from '../../../i18n'
import { getAdhkar, type ToolHadith } from '../api'
import { Failed, HadithBlock, HadithTitle, Highlighted, Loading, SourceLine, ToolHead, useTools } from '../ToolParts'
import { getHadith, hadeethEncUrl } from '../hadith-client'
import { Words } from '../mawaqif/Words'
import { ADHKAR_SECTIONS, isSection, sectionItems, sectionsShown, situation, type AdhkarSection } from '../mawaqif/mawaqif-model'
import { fill } from '../strings-tools'
import { buzz } from '../../../native/haptics'
import { QuranBox } from './QuranBox'
import { ADHKAR_SPLIT, boxText, CATS, chipsOf, countKey, isNightDhikr, isPart, loadCounts, MORNING_EVENING, partItems, partNow, saveCounts, type AdhkarChip, type AdhkarItem, type AdhkarPart } from './adhkar-model'

export { CATS }

function Counter({ h, part }: { h: ToolHadith; part: AdhkarPart | null }) {
  const { s, num } = useTools()
  const total = h.count!.n
  // Two lists (0048-add1 §ب): each counts on its own, so the morning's count is not the evening's.
  const key = countKey(h.id, part)
  const [n, setN] = useState(() => loadCounts()[key] ?? 0)
  const tap = () => {
    const next = n >= total ? 0 : n + 1
    setN(next)
    saveCounts({ ...loadCounts(), [key]: next })
    if (next === total) buzz(60)
  }
  return (
    <div className="tool-count">
      <button type="button" onClick={tap} aria-label={fill(s.countAria, { n: num(n), of: num(total) })} data-testid={`count-${h.id}`}>
        {n >= total ? s.done : `${num(n)}/${num(total)}`}
      </button>
      <span>
        {s.tapEach}
        <br />
        {s.resetsDaily}
      </span>
    </div>
  )
}

/** A dhikr of the two lists ready to say (0049 د): our line «تقول في الصباح:» with the hadith's count, then the words in
 *  a box, the list's segments of the hadith's own text in their order (3008's morning built from them by the
 *  replacements its text and explanation name, 0049-add1 أ), or the ayat when the dhikr is reading the Quran (0049-add1
 *  ب). The hadith follows whole. */
function SayBox({ h, part }: { h: AdhkarItem; part: AdhkarPart }) {
  const { s, num } = useTools()
  if (!h.box.length && !h.quran) return null
  const n = h.count?.n
  const times = n ? (s.times[n] ?? fill(s.times.n, { n: num(n) })) : ''
  const intro = h.quran
    ? h.read === 'night'
      ? s.readNight
      : h.read === 'sleep'
        ? s.readSleep
        : n
          ? fill(s.readInTimes[part], { times })
          : s.readIn[part]
    : n
      ? fill(s.sayInTimes[part], { times })
      : s.sayIn[part]
  return (
    <>
      <p className="dhikr-intro">{intro}</p>
      {h.quran ? (
        <QuranBox h={h} />
      ) : (
        <p className="dhikr-box" id={`adhkar-${h.id}`} lang="ar" dir="rtl" data-testid={`box-${h.id}`}>
          ({boxText(h.box)})
        </p>
      )}
    </>
  )
}

/** «الحديث كاملًا» (0049-add2): under the box, the source line that never folds (the grade, the attribution and the
 *  counter), then a button that opens the hadith in the card itself, under it; every card folded at each opening of the
 *  list, a link to the hadith opening its card. Closing keeps the card's head in view. */
function DhikrCard({
  id,
  labelled,
  label,
  head,
  grade,
  tier,
  attribution,
  counter,
  open: startOpen,
  children,
}: {
  id: string
  labelled: boolean
  label: string
  head: ReactNode
  grade: string | null
  tier: string
  attribution: string | null
  counter?: ReactNode
  open: boolean
  children: ReactNode
}) {
  const { s } = useTools()
  const [open, setOpen] = useState(startOpen)
  const card = useRef<HTMLElement>(null)
  useEffect(() => {
    if (startOpen) card.current?.scrollIntoView({ block: 'start' })
  }, [startOpen])
  const toggle = () => {
    if (open && card.current && card.current.getBoundingClientRect().top < 0) card.current.scrollIntoView({ block: 'start' })
    setOpen(!open)
  }
  const foldId = `fold-${id}`
  return (
    <section ref={card} className="tool-card" data-hadith={id} {...(labelled ? { 'aria-labelledby': `adhkar-${id}` } : { 'aria-label': label })}>
      {head}
      <div className="dhikr-src">
        {grade && (
          <span className={`tool-badge${tier === '3' ? ' hasan' : ''}`} lang="ar" dir="rtl">
            {grade}
          </span>
        )}
        {attribution && (
          <span className="tool-muted" lang="ar" dir="rtl">
            {attribution}
          </span>
        )}
      </div>
      {counter}
      <button type="button" className="dhikr-more" aria-expanded={open} aria-controls={foldId} onClick={toggle} data-testid={`more-${id}`}>
        <span>{s.fullHadith}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div id={foldId} className="dhikr-fold" hidden={!open} data-testid={`fold-${id}`}>
        {open && children}
      </div>
    </section>
  )
}

/** The hadith in the fold: its text with the highlights, the translation, the encyclopedia's line and number. */
function FoldBody({ h }: { h: ToolHadith }) {
  const { lang, s, num } = useTools()
  const tr = lang !== 'ar' ? h.translation : undefined
  return (
    <>
      <div className="tool-text">
        <p lang="ar" dir="rtl">
          <Highlighted text={h.text} phrases={h.highlights ?? []} />
        </p>
      </div>
      {tr && (
        <p className="tool-tr" lang={tr.lang} dir={tr.lang === 'ur' ? 'rtl' : 'ltr'}>
          <span className="lbl">{s.translationLabel}</span>
          {tr.text}
        </p>
      )}
      <SourceLine name={s.hadithSource} detail={fill(s.hadithNo, { n: num(Number(h.id)) })} href={hadeethEncUrl(h.id, lang)}>
        <p className="small">{h.version ? `${s.hadithSource} · ${h.version}` : s.hadithSource}</p>
      </SourceLine>
    </>
  )
}

/** A dhikr of «أذكار المواقف» in the adhkar page's new sections (0050 ب): its hadith loaded when opened. */
function SectionFold({ hadith, highlights }: { hadith: string; highlights: string[] }) {
  const { content } = useI18n()
  const { s } = useTools()
  const [h, setH] = useState<ToolHadith | null | 'failed'>(null)
  useEffect(() => {
    let alive = true
    void getHadith(hadith, content).then((v) =>
      alive && setH(v ? { id: hadith, title: null, text: v.text, grade: v.grade, attribution: v.attribution, tier: '1', version: null, highlights, ...(v.translation ? { translation: { lang: v.translation.lang, text: v.translation.text } as ToolHadith['translation'] } : {}) } : 'failed'),
    )
    return () => {
      alive = false
    }
  }, [hadith, content, highlights])
  if (h === 'failed') return <p className="tool-note">{s.failed}</p>
  return h ? <FoldBody h={h} /> : <Loading />
}

function SectionCards({ k }: { k: AdhkarSection }) {
  const { lang } = useTools()
  const opened = new URLSearchParams(location.search).get('hadith')
  return (
    <>
      {sectionItems(k).map(({ situation: sit, step }, i, all) => {
        const it = step.item
        const id = `${sit.id}-${step.index}`
        const stageHead = (all[i - 1]?.situation.id !== sit.id || all[i - 1]?.step.stage.id !== step.stage.id) && (step.stage.name || ADHKAR_SECTIONS[k].length > 1)
        return (
          <Fragment key={id}>
            {stageHead && <h2 className="tool-subhead">{step.stage.name ? step.stage.name[lang] : sit.name[lang]}</h2>}
            <DhikrCard
              id={id}
              labelled
              label=""
              open={opened === it.hadith}
              grade={it.grade}
              tier={/حسن/.test(it.grade) && !/صحيح/.test(it.grade) ? '3' : '1'}
              attribution={it.attribution}
              head={
                <>
                  <p className="dhikr-intro">{it.intro[lang]}</p>
                  <Words item={it} id={`adhkar-${id}`} open="(" close=")" boxClass="dhikr-words" textClass="dhikr-box" />
                </>
              }
            >
              <SectionFold hadith={it.hadith} highlights={it.segments} />
            </DhikrCard>
          </Fragment>
        )
      })}
    </>
  )
}

export function Adhkar() {
  const { s, num, lang } = useTools()
  // HadeethEnc's translation in the content language (reply 0033 §أ1); none for a language it does not cover.
  const { content } = useI18n()
  // The two lists, when reviewed (0048-add1 §ب): the one the time asks for, or the one a link names (?part=).
  const [cat, setCat] = useState<AdhkarChip | AdhkarSection>(() => {
    const asked = new URLSearchParams(location.search).get('part')
    if (asked && isSection(asked) && sectionsShown().includes(asked)) return asked
    if (!ADHKAR_SPLIT) return MORNING_EVENING
    return asked && isPart(asked) ? asked : partNow()
  })
  const part = isPart(cat) ? cat : null
  const section = isSection(cat) ? cat : null
  const [state, setState] = useState<{ items?: (ToolHadith | AdhkarItem)[]; error?: boolean }>({})
  // A list that arrives after another category was chosen is dropped, so a quick second tap never shows the first
  // category's adhkar under the second's chip.
  const load = useCallback(() => {
    let current = true
    setState({})
    if (isSection(cat)) return
    getAdhkar(isPart(cat) ? MORNING_EVENING : cat, content).then(
      (r) => current && setState({ items: isPart(cat) ? partItems(r.items, cat) : r.items }),
      () => current && setState({ error: true }),
    )
    return () => {
      current = false
    }
  }, [cat, content])
  useEffect(load, [load])
  // The chips: the two lists, then «أذكار المواقف»'s four sections once its table is reviewed (0050 ب), then the rest.
  const chips = chipsOf()
  const sections = sectionsShown()
  const allChips: (AdhkarChip | AdhkarSection)[] = ADHKAR_SPLIT ? [...chips.slice(0, 2), ...sections, ...chips.slice(2)] : [...chips, ...sections]
  const opened = new URLSearchParams(location.search).get('hadith')
  const chipName = (c: AdhkarChip | AdhkarSection) =>
    isSection(c) ? (c === 'sleep' ? s.sleepWaking : (situation(ADHKAR_SECTIONS[c][0])?.name[lang] ?? c)) : s.cat[c]

  return (
    <>
      <ToolHead title={s.adhkarTitle} />
      <main id="main" className="tool scroll">
        <div role="group" aria-label={s.categories} className="tool-chips">
          {allChips.map((c) => (
            <button key={c} type="button" className="tool-chip" aria-pressed={cat === c} onClick={() => setCat(c)}>
              {chipName(c)}
            </button>
          ))}
        </div>
        {section ? (
          <SectionCards key={section} k={section} />
        ) : state.error ? (
          <Failed onRetry={load} />
        ) : !state.items ? (
          <Loading />
        ) : state.items.length === 0 ? (
          <p className="tool-note">{s.empty}</p>
        ) : (
          state.items.map((h, i, all) => (
            <Fragment key={`${cat}:${h.id}`}>
              {/* «من أذكار الليل» (0048-add4 أ): once, over the night's adhkar at the end of the evening list. */}
              {part === 'evening' && isNightDhikr(h.id) && !isNightDhikr(all[i - 1]?.id ?? '') && (
                <h2 className="tool-subhead" data-testid="night-adhkar">
                  {s.nightAdhkar}
                </h2>
              )}
              {part ? (
                // In the two lists, the words to say first and the hadith folded under them (0049 د, 0049-add2).
                <DhikrCard
                  id={h.id}
                  labelled={!!((h as AdhkarItem).box.length || (h as AdhkarItem).quran)}
                  label={fill(s.hadithNo, { n: num(Number(h.id)) })}
                  open={opened === h.id}
                  head={<SayBox h={h as AdhkarItem} part={part} />}
                  grade={h.grade}
                  tier={h.tier}
                  attribution={h.attribution}
                  counter={h.count && <Counter key={`${part}:${h.id}`} h={h} part={part} />}
                >
                  {(h as AdhkarItem).composed && (
                    <p className="dhikr-composed" data-testid={`composed-${h.id}`}>
                      {s.composedLine}
                    </p>
                  )}
                  <FoldBody h={h} />
                </DhikrCard>
              ) : (
                <section className="tool-card" data-hadith={h.id} aria-labelledby={`adhkar-${h.id}`}>
                  <HadithTitle h={h} id={`adhkar-${h.id}`} />
                  <HadithBlock h={h}>{h.count && <Counter key={h.id} h={h} part={null} />}</HadithBlock>
                </section>
              )}
            </Fragment>
          ))
        )}
        <p className="tool-note">{s.adhkarNote}</p>
      </main>
    </>
  )
}

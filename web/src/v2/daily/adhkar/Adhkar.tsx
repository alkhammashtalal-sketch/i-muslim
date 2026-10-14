// Adhkar (reply 0032 D-5; boards Adhkar and AdhkarN): HadeethEnc's eight adhkar categories, sahih and hasan only,
// each hadith under its HadeethEnc title, whole and verbatim, with the words to say highlighted where they are clear
// (data/adhkar-highlights.json; reply 0031-add16 §2: all of a dhikr's segments or none, and none in a hadith with more
// than one «…» pair until the coordinator's review, decided by the Worker), and a counter only where the hadith states
// the number (data/adhkar-counts.json). Counts stay on the device and start again each day. No audio.
import { Fragment, useCallback, useEffect, useState } from 'react'
import { useI18n } from '../../../i18n'
import { getAdhkar, type ToolHadith } from '../api'
import { Failed, HadithBlock, HadithTitle, Loading, ToolHead, useTools } from '../ToolParts'
import { fill } from '../strings-tools'
import { buzz } from '../../../native/haptics'
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
 *  a box, the list's segments of the hadith's own text in their order, then (3008's morning) a line quoted from the
 *  explanation. The hadith follows whole. None of it when the hadith has no highlight. */
function SayBox({ h, part }: { h: AdhkarItem; part: AdhkarPart }) {
  const { s, num } = useTools()
  if (!h.box.length) return null
  const n = h.count?.n
  const times = n ? (s.times[n] ?? fill(s.times.n, { n: num(n) })) : ''
  return (
    <>
      <p className="dhikr-intro">{n ? fill(s.sayInTimes[part], { times }) : s.sayIn[part]}</p>
      <p className="dhikr-box" id={`adhkar-${h.id}`} lang="ar" dir="rtl" data-testid={`box-${h.id}`}>
        ({boxText(h.box)})
      </p>
      {h.note && (
        <div className="dhikr-note" data-testid={`note-${h.id}`}>
          <p lang="ar" dir="rtl">
            {h.note}
          </p>
          <p className="tool-muted">({s.fromSharh})</p>
        </div>
      )}
    </>
  )
}

export function Adhkar() {
  const { s, num } = useTools()
  // HadeethEnc's translation in the content language (reply 0033 §أ1); none for a language it does not cover.
  const { content } = useI18n()
  // The two lists, when reviewed (0048-add1 §ب): the one the time asks for, or the one a link names (?part=).
  const [cat, setCat] = useState<AdhkarChip>(() => {
    if (!ADHKAR_SPLIT) return MORNING_EVENING
    const asked = new URLSearchParams(location.search).get('part')
    return asked && isPart(asked) ? asked : partNow()
  })
  const part = isPart(cat) ? cat : null
  const [state, setState] = useState<{ items?: (ToolHadith | AdhkarItem)[]; error?: boolean }>({})
  // A list that arrives after another category was chosen is dropped, so a quick second tap never shows the first
  // category's adhkar under the second's chip.
  const load = useCallback(() => {
    let current = true
    setState({})
    getAdhkar(isPart(cat) ? MORNING_EVENING : cat, content).then(
      (r) => current && setState({ items: isPart(cat) ? partItems(r.items, cat) : r.items }),
      () => current && setState({ error: true }),
    )
    return () => {
      current = false
    }
  }, [cat, content])
  useEffect(load, [load])

  return (
    <>
      <ToolHead title={s.adhkarTitle} />
      <main id="main" className="tool scroll">
        <div role="group" aria-label={s.categories} className="tool-chips">
          {chipsOf().map((c) => (
            <button key={c} type="button" className="tool-chip" aria-pressed={cat === c} onClick={() => setCat(c)}>
              {s.cat[c]}
            </button>
          ))}
        </div>
        {state.error ? (
          <Failed onRetry={load} />
        ) : !state.items ? (
          <Loading />
        ) : state.items.length === 0 ? (
          <p className="tool-note">{s.empty}</p>
        ) : (
          state.items.map((h, i, all) => (
            <Fragment key={h.id}>
              {/* «من أذكار الليل» (0048-add4 أ): once, over the night's adhkar at the end of the evening list. */}
              {part === 'evening' && isNightDhikr(h.id) && !isNightDhikr(all[i - 1]?.id ?? '') && (
                <h2 className="tool-subhead" data-testid="night-adhkar">
                  {s.nightAdhkar}
                </h2>
              )}
            {/* In the two lists, the words to say first and no HadeethEnc title (in the morning 3008's names the evening). */}
            <section
              className="tool-card"
              data-hadith={h.id}
              {...(part && !(h as AdhkarItem).box.length ? { 'aria-label': fill(s.hadithNo, { n: num(Number(h.id)) }) } : { 'aria-labelledby': `adhkar-${h.id}` })}
            >
              {part ? <SayBox h={h as AdhkarItem} part={part} /> : <HadithTitle h={h} id={`adhkar-${h.id}`} />}
              <HadithBlock h={h}>{h.count && <Counter key={`${part ?? ''}:${h.id}`} h={h} part={part} />}</HadithBlock>
            </section>
            </Fragment>
          ))
        )}
        <p className="tool-note">{s.adhkarNote}</p>
      </main>
    </>
  )
}

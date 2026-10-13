// Adhkar (reply 0032 D-5; boards Adhkar and AdhkarN): HadeethEnc's eight adhkar categories, sahih and hasan only,
// each hadith under its HadeethEnc title, whole and verbatim, with the words to say highlighted where they are clear
// (data/adhkar-highlights.json; reply 0031-add16 §2: all of a dhikr's segments or none, and none in a hadith with more
// than one «…» pair until the coordinator's review, decided by the Worker), and a counter only where the hadith states
// the number (data/adhkar-counts.json). Counts stay on the device and start again each day. No audio.
import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../../../i18n'
import { getAdhkar, type ToolHadith } from '../api'
import { Failed, HadithBlock, HadithTitle, Loading, ToolHead, useTools } from '../ToolParts'
import { fill } from '../strings-tools'
import { buzz } from '../../../native/haptics'

export const CATS = ['301', '465', '313', '302', '303', '306', '307', '308'] as const
const KEY = 'muslim.adhkar.v1'
const today = () => new Date().toLocaleDateString('en-CA')

function loadCounts(): Record<string, number> {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as { day?: string; n?: Record<string, number> }
    return v.day === today() ? (v.n ?? {}) : {}
  } catch {
    return {}
  }
}
function saveCounts(n: Record<string, number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ day: today(), n }))
  } catch {}
}

function Counter({ h }: { h: ToolHadith }) {
  const { s, num } = useTools()
  const total = h.count!.n
  const [n, setN] = useState(() => loadCounts()[h.id] ?? 0)
  const tap = () => {
    const next = n >= total ? 0 : n + 1
    setN(next)
    saveCounts({ ...loadCounts(), [h.id]: next })
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

export function Adhkar() {
  const { s } = useTools()
  // HadeethEnc's translation in the content language (reply 0033 §أ1); none for a language it does not cover.
  const { content } = useI18n()
  const [cat, setCat] = useState<(typeof CATS)[number]>('301')
  const [state, setState] = useState<{ items?: ToolHadith[]; error?: boolean }>({})
  const load = useCallback(() => {
    setState({})
    getAdhkar(cat, content).then(
      (r) => setState({ items: r.items }),
      () => setState({ error: true }),
    )
  }, [cat, content])
  useEffect(load, [load])

  return (
    <>
      <ToolHead title={s.adhkarTitle} />
      <main id="main" className="tool scroll">
        <div role="group" aria-label={s.categories} className="tool-chips">
          {CATS.map((c) => (
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
          state.items.map((h) => (
            <section key={h.id} className="tool-card" data-hadith={h.id} aria-labelledby={`adhkar-${h.id}`}>
              <HadithTitle h={h} id={`adhkar-${h.id}`} />
              <HadithBlock h={h}>{h.count && <Counter h={h} />}</HadithBlock>
            </section>
          ))
        )}
        <p className="tool-note">{s.adhkarNote}</p>
      </main>
    </>
  )
}

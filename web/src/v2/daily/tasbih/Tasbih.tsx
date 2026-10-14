// Tasbih (reply 0032 D-6; boards Tasbih and TasbihN): count by tapping the circle or anywhere on the screen; a limit
// of 33, 100 or none; a vibration where the browser has one (iOS Safari has no navigator.vibrate), and the Taptic
// Engine in the iOS/Android app (@capacitor/haptics, reply 0033 §ب3, web/src/native/haptics.ts); everything kept on
// the device. The words are cut at run time from sahih hadiths (data/tasbih-after-prayer.json: 5475 and 10947), and
// «بعد الصلاة» follows hadith 10948 word for word: 33, 33, 33, then the hundredth once, the counter moving on by
// itself (Talal 22:58: «طيب والعداد حطه حتى مع التسبيح»).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import data from '../../../../../data/tasbih-after-prayer.json'
import { getToolHadith, type ToolHadith } from '../api'
import { Failed, HadithBlock, Loading, ToolHead, useTools } from '../ToolParts'
import { fill } from '../strings-tools'
import { loadTasbih, TASBIH_HADITHS, TASBIH_KEY, tasbihSteps, tasbihWords, type Limit, type TasbihSaved } from './tasbih-model'
import { buzz as feel, canBuzz } from '../../../native/haptics'

type Saved = TasbihSaved
const KEY = TASBIH_KEY
const load = loadTasbih

export const canVibrate = canBuzz

export function Tasbih() {
  const { lang, s, num } = useTools()
  const [st, setSt] = useState<Saved>(load)
  const [texts, setTexts] = useState<Record<string, ToolHadith> | null>(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(st))
    } catch {}
    // The iOS widget «المسبحة» counts the same (reply 0046).
    window.dispatchEvent(new Event('muslim:widgets'))
  }, [st])
  // Counted on the widget while this screen stayed open: the app reads the widget's count back when it comes to the
  // front (web/src/native/widget-data.ts syncWidgets), and the screen takes it, so its next tap adds to it.
  useEffect(() => {
    const reload = () => setSt(load())
    window.addEventListener('muslim:tasbih', reload)
    return () => window.removeEventListener('muslim:tasbih', reload)
  }, [])

  const fetchAll = useCallback(() => {
    setError(false)
    Promise.all(TASBIH_HADITHS.map((id) => getToolHadith(id, lang))).then(
      (rows) => setTexts(Object.fromEntries(rows.map((r) => [r.id, r]))),
      () => setError(true),
    )
  }, [lang])
  useEffect(fetchAll, [fetchAll])

  // The words, with the source's own diacritics, cut from the hadith texts (tasbih-model.ts, shared with the widgets).
  const words = useMemo(() => (texts ? tasbihWords(texts) : []), [texts])
  const steps = useMemo(
    () => (texts ? tasbihSteps(texts) : []),
    [texts],
  )

  const limit = st.after ? (steps[st.step]?.count ?? 33) : st.limit
  const current = st.after ? (steps[st.step]?.label ?? steps[st.step]?.words) : st.word < words.length ? words[st.word] : st.custom
  const tap = useCallback(() => {
    setSt((v) => {
      const buzz = (ms: number) => v.vibrate && canVibrate() && feel(ms)
      if (v.after) {
        // After the prayer: 33, 33, 33, then the hundredth; each step moves on by itself, and the last one stays done.
        const lim = steps[v.step]?.count ?? 1
        const last = v.step >= steps.length - 1
        if (last && v.n >= lim) return v
        const n = v.n + 1
        if (n < lim) return buzz(15), { ...v, total: v.total + 1, n }
        buzz(200)
        return last ? { ...v, total: v.total + 1, n } : { ...v, total: v.total + 1, n: 0, step: v.step + 1 }
      }
      // A free count: at the limit it stays full; the next tap starts again at one.
      const n = v.limit && v.n >= v.limit ? 1 : v.n + 1
      buzz(v.limit && n === v.limit ? 200 : 15)
      return { ...v, total: v.total + 1, n }
    })
  }, [steps])

  // A tap anywhere on the screen counts, except on another control.
  const mainRef = useRef<HTMLElement>(null)
  const onScreenTap = (e: React.MouseEvent) => {
    const el = e.target as HTMLElement
    if (el.closest('button, a, input, [role="switch"], [role="tab"], dialog')) return
    tap()
  }
  const reset = () => setSt((v) => ({ ...v, n: 0, step: 0 }))
  const p = limit ? Math.min(1, st.n / limit) : 0
  const afterDone = st.after && st.step === steps.length - 1 && st.n >= (steps[st.step]?.count ?? 1)

  return (
    <>
      <ToolHead title={s.tasbihTitle} />
      <main id="main" ref={mainRef} className="tool scroll" onClick={onScreenTap}>
        {error ? (
          <Failed onRetry={fetchAll} />
        ) : !texts ? (
          <Loading />
        ) : (
          <>
            <section className="tool-card pad">
              <div role="group" aria-label={s.wordsGroup} className="tool-chips">
                {words.map((w, i) => (
                  <button key={i} type="button" className="tool-chip" lang="ar" aria-pressed={!st.after && st.word === i} onClick={() => setSt((v) => ({ ...v, after: false, word: i, n: 0 }))}>
                    {w}
                  </button>
                ))}
                <button type="button" className="tool-chip" aria-pressed={!st.after && st.word === words.length} onClick={() => setSt((v) => ({ ...v, after: false, word: words.length, n: 0 }))}>
                  {s.customDhikr}
                </button>
              </div>
              {!st.after && st.word === words.length && (
                <p>
                  <input
                    className="tool-field"
                    value={st.custom}
                    maxLength={80}
                    placeholder={s.customPlaceholder}
                    aria-label={s.customDhikr}
                    onChange={(e) => setSt((v) => ({ ...v, custom: e.target.value }))}
                  />
                </p>
              )}
              <p className="tasbih-word" lang="ar" dir="rtl" data-testid="tasbih-word">
                {current || ' '}
              </p>
              <button
                type="button"
                className="tasbih-ring"
                style={{ ['--p' as string]: String(p) }}
                onClick={(e) => (e.stopPropagation(), tap())}
                aria-label={limit ? fill(s.countAria, { n: num(st.n), of: num(limit) }) : num(st.n)}
                data-testid="tasbih-ring"
              >
                <span className="n">{num(st.n)}</span>
                {limit ? <span className="of">{fill(s.ofN, { n: num(limit) })}</span> : null}
              </button>
              <p className="tool-note" style={{ textAlign: 'center', margin: '8px 0 12px' }}>
                {s.tapHint}
              </p>
              {!st.after && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <div role="tablist" className="tool-seg" style={{ flex: '1 1 12rem' }}>
                    {([33, 100, 0] as Limit[]).map((l) => (
                      <button key={l} type="button" role="tab" aria-selected={st.limit === l} onClick={() => setSt((v) => ({ ...v, limit: l, n: 0 }))}>
                        {l ? num(l) : s.limitNone}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="tool-btn" onClick={reset}>
                    {s.reset}
                  </button>
                </div>
              )}
            </section>

            <section className="tool-card pad">
              <h2>{s.afterPrayer}</h2>
              <div className="tasbih-steps">
                {steps.map((x, i) => (
                  <span key={i} aria-current={st.after && st.step === i ? 'step' : undefined}>
                    <span className="w" lang="ar" dir="rtl">
                      {x.label ?? x.words}
                    </span>
                    <span className="tool-muted">{st.after && st.step === i ? `${num(st.n)}/${num(x.count)}` : num(x.count)}</span>
                  </span>
                ))}
              </div>
              <p className="tool-note" style={{ margin: '10px 0' }}>
                {s.autoNext}
              </p>
              <button type="button" className="tool-btn" aria-pressed={st.after} onClick={() => setSt((v) => ({ ...v, after: !v.after, step: 0, n: 0 }))} data-testid="after-prayer">
                {st.after ? (afterDone ? s.done : s.reset) : s.afterPrayer}
              </button>
            </section>

            <div className="tool-row-head" style={{ padding: '0 4px', margin: 0 }}>
              <span className="tool-muted">{s.todayTotal}</span>
              <span style={{ fontWeight: 600 }} data-testid="tasbih-total">
                {fill(s.tasbihUnit, { n: num(st.total) })}
              </span>
            </div>

            <section className="tool-card">
              <div className="tool-switch-row">
                <span>
                  <span className="a">{s.vibrate}</span>
                  <span className="tool-muted">{canVibrate() ? s.vibrateSub : s.vibrateNone}</span>
                </span>
                <button
                  type="button"
                  role="switch"
                  className="tool-switch"
                  aria-checked={st.vibrate && canVibrate()}
                  aria-label={s.vibrate}
                  disabled={!canVibrate()}
                  onClick={() => setSt((v) => ({ ...v, vibrate: !v.vibrate }))}
                />
              </div>
            </section>

            <section className="tool-card">
              <HadithBlock h={{ ...texts[data.id], highlights: data.steps.map((x) => x.phrase) }} />
            </section>
          </>
        )}
      </main>
    </>
  )
}

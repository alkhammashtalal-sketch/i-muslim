// Word meanings (reply 0032 D-11; board WordByWord): the whole screen stays off (WORD_MEANINGS_SOURCE) until Talal's
// registration with the King Fahd Quran Complex brings the data. No data from any other source: the tests put their
// own sample on window.__wordMeaningsTest before the page loads, and only then does the screen render.
import { WORD_MEANINGS_SOURCE } from '../flags'
import { SourceLine, ToolHead, useTools } from '../ToolParts'

export type WordSample = { ref: string; words: { ar: string; meaning: string }[] }
const testSample = () => (globalThis as { __wordMeaningsTest?: WordSample }).__wordMeaningsTest

/** True when the screen may show: the source is on, or a test supplied its sample. */
export const wordsAvailable = () => WORD_MEANINGS_SOURCE === 'on' || !!testSample()

export function WordByWord() {
  const { s } = useTools()
  const sample = testSample()
  if (!wordsAvailable() || !sample) return null
  return (
    <>
      <ToolHead title={s.wordsTitle} />
      <main id="main" className="tool scroll">
        <section className="tool-card pad" data-testid="words">
          <div className="tool-row-head">
            <span className="t" lang="ar">
              {sample.ref}
            </span>
            <span className="lines-pending">{s.wordsPending}</span>
          </div>
          <div className="words-row" lang="ar" dir="rtl">
            {sample.words.map((w, i) => (
              <span key={i}>
                <span className="ar">{w.ar}</span>
                <span className="m">{w.meaning}</span>
              </span>
            ))}
          </div>
          <p className="tool-note" style={{ marginTop: 10 }}>
            {s.wordsNote}
          </p>
          <SourceLine name={s.mushafText} detail={s.ekfu} />
        </section>
      </main>
    </>
  )
}

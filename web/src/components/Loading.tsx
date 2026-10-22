import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'

/** «اسأل»'s work under way (add-on 0071-add4 §2): 'search' while the request runs (the search is in it), 'review' once
 *  the server says the texts are in review (the question waits for the model's turn, worker/src/queue.ts). Each line is
 *  shown only while its work runs; no place in line, no time. Without a stage (the other screens) as before. */
export type AskStage = 'search' | 'review'

export function Loading({ stage }: { stage?: AskStage } = {}) {
  const { t } = useI18n()
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    if (stage) return
    const id = setTimeout(() => setPhase(1), 800)
    return () => clearTimeout(id)
  }, [stage])
  const text = stage ? (stage === 'search' ? t.askSearching : t.askReviewing) : phase === 0 ? t.loadingSearch : t.loadingVerify
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span key={text} className="loading-line">
        {text}
      </span>
    </div>
  )
}

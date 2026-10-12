import { useState } from 'react'
import { useI18n } from '../../i18n'
import { GradeBadge } from './GradeBadge'
import { HADITH } from './strings'

// «درجة الحديث» from Dorar (V2 §3 part 2, c19; StatesAfter): loading, arrived, not arrived («حاول مرة ثانية»).
// Hidden until the Dorar token exists (CLAUDE.md dorar row; reply 0031-add13): the server route is not built, and no
// Dorar text is ever shown from anywhere else. The three states can be seen only in a build made with
// VITE_DORAR_STATES=stub (for the design check), driven by ?dorar=loading|ok|failed, with placeholder values.
const STUB = import.meta.env.VITE_DORAR_STATES === 'stub'

type State = 'loading' | 'ok' | 'failed'

export function DorarGrade() {
  const { lang } = useI18n()
  const s = HADITH[lang]
  const [state, setState] = useState<State>(() => {
    const q = new URLSearchParams(location.search).get('dorar')
    return q === 'ok' || q === 'failed' ? q : 'loading'
  })
  if (!STUB) return null
  return (
    <section className="hd-part" id="hd-grade" aria-labelledby="hd-grade-h" aria-busy={state === 'loading'}>
      <h2 className="hd-part-h" id="hd-grade-h">
        {s.gradeTitle}
      </h2>
      {state === 'loading' && (
        <div className="hd-dorar-loading" role="status">
          <span>{s.gradeLoading}</span>
          <span className="hd-bars" aria-hidden="true">
            <span />
            <span />
          </span>
        </div>
      )}
      {state === 'ok' && (
        <>
          <div className="hd-grade-line">
            <GradeBadge h={{ grade: '—', class: 'sahih' }} />
            <span>{s.gradeSummary}</span>
          </div>
          <div className="hd-row">
            <span className="hd-row-k">{s.gradeMuhaddith}</span>
            <span className="hd-row-v">—</span>
          </div>
          <div className="hd-row">
            <span className="hd-row-k">{s.gradeSource}</span>
            <span className="hd-row-v">—</span>
          </div>
        </>
      )}
      {state === 'failed' && (
        <div className="hd-dorar-failed" role="alert">
          <p className="hd-dorar-failed-h">{s.gradeFailed}</p>
          <p className="hd-weak-note">{s.gradeFailedNote}</p>
          <button type="button" className="hd-fold" onClick={() => setState('loading')}>
            {s.retry}
          </button>
        </div>
      )}
      <p className="hd-source is-static">
        <span className="hd-source-text">
          <span className="hd-source-name">{s.dorarName}</span> · dorar.net
        </span>
      </p>
    </section>
  )
}

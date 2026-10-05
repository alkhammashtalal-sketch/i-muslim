import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { getExplainStatus, postExplain, type ExplainResult } from '../quran/api'
import { fmt } from '../quran/format'
import './trust.css'

type Props = {
  /** Passage id: an ayah (explained from al-Muyassar) or a book passage (explained from its own text). */
  id: string
  /** Name of what the explanation is made from, in the interface language when we have it (e.g. t.tafsirMuyassar). */
  sourceName: string
  sourceUrl: string
}

/**
 * Rule 12 (CLAUDE.md §3): the text first; a generated explanation only on request. The button reads «بسّط لي» in
 * Arabic and «اشرح لي بلغتي» in the other languages. The box is labelled «شرح آلي», plus «ترجمة آلية» outside
 * Arabic and English, plus «تجريبي» in mock mode, with a link to its source. Hidden when the server switch is off.
 */
export function ExplainBox({ id, sourceName, sourceUrl }: Props) {
  const { t, lang } = useI18n()
  const [enabled, setEnabled] = useState(false)
  const [state, setState] = useState<{ key: string; r: ExplainResult | 'loading' } | null>(null)
  const key = `${id}|${lang}`

  useEffect(() => {
    let alive = true
    getExplainStatus().then((s) => alive && setEnabled(s.enabled))
    return () => {
      alive = false
    }
  }, [])

  if (!enabled) return null
  const cur = state?.key === key ? state.r : null
  const run = async () => {
    setState({ key, r: 'loading' })
    const r = await postExplain(id, lang)
    setState((s) => (s?.key === key ? { key, r } : s))
  }

  if (!cur)
    return (
      <button type="button" className="btn explain-btn" onClick={run}>
        {lang === 'ar' ? t.simplify : t.explainMine}
      </button>
    )
  if (cur === 'loading')
    return (
      <p className="small" role="status">
        {t.readerLoading}
      </p>
    )
  if ('error' in cur)
    return (
      <p className="card-body" role="alert">
        {cur.error === 'rate_limited' ? t.errRateLimited : cur.error === 'monthly_cap' ? t.errMonthlyCap : t.explainUnavailable}
      </p>
    )
  return (
    <section className="explain-box" aria-label={fmt(t.explainFrom, { source: sourceName })}>
      <p className="section-label explain-title">{fmt(t.explainFrom, { source: sourceName })}</p>
      <div className="badges">
        <span className="badge">{t.machineExplanation}</span>
        {lang !== 'ar' && lang !== 'en' && <span className="badge badge-mt">{t.badgeMT}</span>}
        {cur.mock && <span className="badge">{t.demoTag}</span>}
      </div>
      <p className="explanation" dir="auto">
        {cur.text}
      </p>
      <a className="text-link" href={sourceUrl} target="_blank" rel="noopener noreferrer">
        {fmt(t.explainSourceLink, { source: sourceName })}
      </a>
    </section>
  )
}

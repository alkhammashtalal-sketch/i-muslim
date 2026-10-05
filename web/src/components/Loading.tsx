import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'

export function Loading() {
  const { t } = useI18n()
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    const id = setTimeout(() => setPhase(1), 800)
    return () => clearTimeout(id)
  }, [])
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
      <span>{phase === 0 ? t.loadingSearch : t.loadingVerify}</span>
    </div>
  )
}

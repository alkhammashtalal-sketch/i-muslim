import type { Hadith } from './api'
import { isWeak } from './api'
import './hadith.css'

/** The grade as HadeethEnc writes it, verbatim (rule 10). Sahih and hasan in green with a check; weak, fabricated and
 *  mixed grades in the warning colour (V2 §11), the mixed one with its whole text, so the reader sees which part is
 *  sound. `alt` adds the language's own wording of the grade from the translation row, beside the Arabic. */
export function GradeBadge({ h, alt, large = false }: { h: Pick<Hadith, 'grade' | 'class'>; alt?: string | null; large?: boolean }) {
  if (!h.grade) return null
  const weak = isWeak(h)
  return (
    <span className={`grade-badge${weak ? ' is-weak' : ''}${large ? ' is-large' : ''}`}>
      <span className="grade-icon" aria-hidden="true">
        {weak ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8v5" />
            <path d="M12 16.5h.01" />
            <path d="M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" />
            <path d="m7.5 12.2 3 3 6-6.4" fill="none" stroke="var(--card)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span lang="ar" dir="rtl" className="grade-text">
        {h.grade}
      </span>
      {alt && alt !== h.grade && <span className="grade-alt">· {alt}</span>}
    </span>
  )
}

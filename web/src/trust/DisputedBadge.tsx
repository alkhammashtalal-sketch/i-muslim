import type { Quote } from '../../../shared/api'
import { MushafFrame } from '../components/Ornaments'
import { useI18n } from '../i18n'
import { displayRef } from '../quran/format'
import './trust.css'

/**
 * Rule 11 (CLAUDE.md §3): a matter with more than one scholarly view is stated plainly, never settled by the model.
 * Badge «فيها أكثر من قول» and the fixed sentence. Prefer `message` from the referral response (the server's
 * fixed text, worker/src/config/messages.json); the i18n copy is the same text, used when no message is given.
 */
export function DisputedBadge({ message }: { message?: string }) {
  const { t } = useI18n()
  return (
    <div className="disputed" role="note">
      <span className="badge badge-disputed">{t.disputedBadge}</span>
      <p className="disputed-text">{message || t.disputedText}</p>
    </div>
  )
}

/** The retrieved texts of a disputed referral, with their references, and nothing generated. */
export function DisputedQuotes({ quotes }: { quotes: Quote[] }) {
  const { t, lang } = useI18n()
  return (
    <div className="disputed-quotes">
      {quotes.map((q) => (
        <section key={q.id} className="section" aria-label={q.ref}>
          {q.kind === 'ayah' || q.kind === 'hadith' ? (
            <MushafFrame>
              <p className="sacred" lang="ar" dir="rtl">
                {q.text}
              </p>
            </MushafFrame>
          ) : (
            <div className="segment-box">
              <p className="trust-plain-text" lang="ar" dir="rtl">
                {q.text}
              </p>
            </div>
          )}
          <div className="quote-meta">
            <span className="ref" lang="ar" dir="rtl">
              {displayRef(q.ref, lang)}
            </span>
            {q.verified && <span className="badge badge-verified">✓ {t.badgeVerified}</span>}
            <a className="text-link" href={q.url} target="_blank" rel="noopener noreferrer">
              {t.originalSource}
            </a>
          </div>
        </section>
      ))}
    </div>
  )
}

import { useState, type ReactNode } from 'react'
import type { AnswerResponse, Cite, ErrorResponse, Quote, Sentence } from '../../../shared/api'
import { ALIFTA_URL, USE_MOCK } from '../api/client'
import { levelLabel, numberLocale, useI18n } from '../i18n'
import { IconExternal, IconLock } from './Icons'
import { MushafFrame } from './Ornaments'

function useNum() {
  const { lang } = useI18n()
  const nf = new Intl.NumberFormat(numberLocale(lang))
  return (n: number) => nf.format(n)
}

function Cites({ cites, quotes, anchor }: { cites: Cite[]; quotes: Quote[]; anchor: string }) {
  const num = useNum()
  return (
    <>
      {cites.map((c) => {
        const i = quotes.findIndex((q) => q.id === c)
        if (i < 0) return null
        return (
          <a key={c} className="cite" href={`#${anchor}-${i}`} aria-label={quotes[i].ref}>
            [{num(i + 1)}]
          </a>
        )
      })}
    </>
  )
}

function SentenceText({ s, quotes, anchor }: { s: Sentence; quotes: Quote[]; anchor: string }) {
  return (
    <>
      {s.text}
      <Cites cites={s.cites} quotes={quotes} anchor={anchor} />{' '}
    </>
  )
}

function DemoBadge() {
  const { t } = useI18n()
  return USE_MOCK ? <span className="badge">{t.demoTag}</span> : null
}

function copyText(text: string) {
  return navigator.clipboard?.writeText(text).then(
    () => true,
    () => false,
  ) ?? Promise.resolve(false)
}

type AnswerProps = {
  res: AnswerResponse
  question: string
  anchor: string
  onFullText: (q: Quote) => void
  onReport: (quotes: Quote[]) => void
}

export function AnswerCard({ res, question, anchor, onFullText, onReport }: AnswerProps) {
  const { t, lang } = useI18n()
  const [copied, setCopied] = useState(false)
  const showEnglish = lang !== 'ar'

  const plain = [
    res.direct.text,
    ...res.quotes.map((q) => `${q.text}\n${q.ref}\n${q.url}`),
    `— ${t.appName}`,
  ].join('\n\n')

  const doCopy = async () => {
    if (await copyText(plain)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  const doShare = async () => {
    const url = `${location.origin}/?q=${encodeURIComponent(question)}&lang=${lang}`
    if (navigator.share) {
      try {
        await navigator.share({ title: t.appName, text: `${res.direct.text}\n\n${res.quotes[0]?.ref ?? ''}`, url })
      } catch {
        // user dismissed the share sheet
      }
    } else if (await copyText(url)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <>
      <article className="card" aria-label={levelLabel(t, res.level)}>
        <div className="badges">
          <span className="badge badge-level">{levelLabel(t, res.level)}</span>
          {res.reviewed && (
            <span className="badge badge-reviewed">
              {t.badgeReviewed} · {res.reviewed.by} · {res.reviewed.at}
            </span>
          )}
          {res.fromCache && <span className="badge">{t.fromCache}</span>}
          <DemoBadge />
        </div>

        <p className="direct">
          <SentenceText s={res.direct} quotes={res.quotes} anchor={anchor} />
        </p>

        {res.quotes.map((q, i) => (
          <section key={q.id} id={`${anchor}-${i}`} className="section" aria-label={q.ref}>
            <div className="badges">
              {res.quotes.length > 1 && <span className="badge">{new Intl.NumberFormat(numberLocale(lang)).format(i + 1)}</span>}
              {q.verified && <span className="badge badge-verified">✓ {t.badgeVerified}</span>}
              {q.grade && <span className="small">{q.grade}</span>}
            </div>
            <MushafFrame>
              <p className="sacred" lang="ar" dir="rtl">
                {q.text}
              </p>
            </MushafFrame>
            <div className="quote-meta">
              <span className="ref">{q.ref}</span>
              <div className="quote-links">
                <a className="text-link" href={q.url} target="_blank" rel="noopener noreferrer">
                  {t.originalSource}
                </a>
                <button type="button" className="text-link" onClick={() => onFullText(q)}>
                  {t.fullText}
                </button>
              </div>
            </div>
            {showEnglish && q.text_en && (
              <div className="section">
                <p className="section-label">{q.kind === 'ayah' ? t.meaningAyah : t.meaningHadith}</p>
                <p className="translation" lang="en" dir="ltr">
                  {q.text_en}
                </p>
              </div>
            )}
          </section>
        ))}

        <hr className="divider" />

        <section className="section" aria-label={t.plainExplanation}>
          <p className="section-label">
            {t.plainExplanation}
            {res.machineTranslated && <span className="badge badge-mt">{t.badgeMT}</span>}
          </p>
          <p className="explanation">
            {res.explanation.map((s, i) => (
              <SentenceText key={i} s={s} quotes={res.quotes} anchor={anchor} />
            ))}
          </p>
          {res.tafsir && res.tafsir.length > 0 && (
            <p className="small">
              {t.tafsirFrom}:{' '}
              {res.tafsir.map((x, i) => (
                <span key={x.url}>
                  {i > 0 && ' · '}
                  <a href={x.url} target="_blank" rel="noopener noreferrer">
                    {x.name} – {x.ref}
                  </a>
                </span>
              ))}
            </p>
          )}
          <p className="small">{t.generatedTag}</p>
        </section>

        <div className="actions">
          <button type="button" className="btn" onClick={doCopy} aria-live="polite">
            {copied ? t.copied : t.copyWithRef}
          </button>
          <button type="button" className="btn" onClick={doShare}>
            {t.share}
          </button>
          <button type="button" className="btn" onClick={() => onReport(res.quotes)}>
            {t.report}
          </button>
          <a className="btn" href={ALIFTA_URL} target="_blank" rel="noopener noreferrer">
            {t.askScholar}
          </a>
        </div>
      </article>
      <p className="disclaimer">{t.disclaimer}</p>
    </>
  )
}

export function ReferralCard({ level, link }: { level: 'C' | 'D'; link: string }) {
  const { t } = useI18n()
  return (
    <article className="card card-center" aria-label={t.referralTitle}>
      <div className="badges">
        <span className="badge">{levelLabel(t, level)}</span>
        <DemoBadge />
      </div>
      <IconLock />
      <p className="card-title">{t.referralTitle}</p>
      <p className="card-body">{t.referralBody}</p>
      <a className="btn btn-primary" href={link || ALIFTA_URL} target="_blank" rel="noopener noreferrer">
        <span>{t.referralButton}</span>
        <IconExternal />
      </a>
    </article>
  )
}

export function AbstainCard({ link }: { link: string }) {
  const { t } = useI18n()
  return (
    <article className="card" aria-label={t.abstainTitle}>
      <div className="badges">
        <span className="badge">{t.abstainTitle}</span>
        <DemoBadge />
      </div>
      <p className="card-body-strong">{t.abstainBody}</p>
      <p className="card-body">{t.abstainHint}</p>
      <a className="text-link" href={link || ALIFTA_URL} target="_blank" rel="noopener noreferrer">
        {t.abstainButton}
      </a>
    </article>
  )
}

export function ErrorCard({
  code,
  onRetry,
  suggestions,
}: {
  code: ErrorResponse['code'] | 'network'
  onRetry?: () => void
  suggestions?: ReactNode
}) {
  const { t } = useI18n()
  const msg = {
    network: t.errConnection,
    rate_limited: t.errRateLimited,
    monthly_cap: t.errMonthlyCap,
    bad_input: t.errBadInput,
    server: t.errServer,
  }[code]
  return (
    <article className="card" role="alert">
      {USE_MOCK && (
        <div className="badges">
          <DemoBadge />
        </div>
      )}
      <p className="card-body-strong">{msg}</p>
      {(code === 'network' || code === 'server') && onRetry && (
        <button type="button" className="btn" onClick={onRetry}>
          {t.retry}
        </button>
      )}
      {code === 'monthly_cap' && suggestions}
    </article>
  )
}

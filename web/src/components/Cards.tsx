import { useState, type ReactNode } from 'react'
import type { AnswerResponse, Cite, ErrorResponse, Quote, ReferralResponse, Sentence } from '../../../shared/api'
import { ALIFTA_URL, USE_MOCK } from '../api/client'
import { LANGS, levelLabel, numberLocale, useI18n } from '../i18n'
import { IconExternal, IconLock } from './Icons'
import { DisputedBadge, DisputedQuotes } from '../trust/DisputedBadge'
import { ExplainBox } from '../trust/ExplainBox'
import { answerLevelLabel } from '../trust/level-strings'
import { ReviewedBox } from '../trust/ReviewedBox'
import { HowFoundButton } from '../trust/HowFound'
import { ShurutNote } from '../trust/ShurutNote'
import { isShurutPassage } from '../trust/shurut'
import { arabicDigits, ayahOf, displayRef, suraTitle } from '../quran/format'
import { Mkp, MushafFrame } from './Ornaments'
import { AyahEnd } from '../quran/AyahEnd'
import { ReaderLink } from '../quran/QuranIndex'
import { quranPath } from '../quran/route'
import { IconCheck, IconCopy, IconExternalV2, IconInfoCircle, IconThumbDown, IconThumbUp } from '../v2/answer/icons'
import { SourceLine, SourceSheet } from '../v2/answer/SourceSheets'
import { bookTitle, sourceOfQuote, type SourceKey } from '../v2/answer/sources'
import { ANSWER } from '../v2/answer/strings'
import { TafsirBox } from '../v2/answer/TafsirBox'
import { placeOfQuote, type ReportLoc } from '../v2/sources/place'
import '../v2/answer/answer.css'
import './witness.css'
import { MeaningBlock } from '../quran/Meaning'

// Right-to-left scripts an answer may come back in (any language can be asked).
const RTL_LANGS = new Set(['ar', 'ur', 'fa', 'he', 'yi', 'ps', 'sd', 'ug', 'dv', 'ckb'])

function useNum() {
  const { lang } = useI18n()
  const nf = new Intl.NumberFormat(numberLocale(lang))
  return (n: number) => nf.format(n)
}

function Cites({ cites, quotes, anchor }: { cites: Cite[]; quotes: Quote[]; anchor: string }) {
  const num = useNum()
  const { lang } = useI18n()
  return (
    <>
      {cites.map((c) => {
        const i = quotes.findIndex((q) => q.id === c)
        if (i < 0) return null
        return (
          <a key={c} className="cite" href={`#${anchor}-${i}`} aria-label={displayRef(quotes[i].ref, lang)}>
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
  onHowFound: () => void
}

// `question` stays in the props (the share link of the first version); the second version's card has no share button.
export function AnswerCard({ res, anchor, onFullText, onReport, onHowFound }: AnswerProps) {
  const { t, lang } = useI18n()
  const a = ANSWER[lang]
  const [copied, setCopied] = useState(false)
  const [rated, setRated] = useState(false)
  const [src, setSrc] = useState<{ key: SourceKey; name?: string; url?: string; loc?: ReportLoc } | null>(null)
  const showEnglish = lang !== 'ar'
  // The explanation is in the language the model answered in (command 08), which may differ from the interface.
  const ansLang = res.answer_lang ?? lang
  const ansBase = ansLang.split('-')[0].toLowerCase()
  const ansDir = RTL_LANGS.has(ansBase) ? 'rtl' : 'ltr'
  const untested = !LANGS.some((l) => l.code === ansBase)
  const hasExplanation = res.explanation.length > 0
  const muyassarUrl = res.tafsir?.find((x) => x.name === 'التفسير الميسر')?.url
  // Several texts (command 20; V2 §5): the ayat as a strip of buttons over the card, one text shown at a time.
  const many = res.quotes.length > 1
  const [sel, setSel] = useState(0)
  const tabKeys = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    const rtl = document.documentElement.dir === 'rtl'
    const step = e.key === 'ArrowRight' ? (rtl ? -1 : 1) : e.key === 'ArrowLeft' ? (rtl ? 1 : -1) : 0
    const to = e.key === 'Home' ? 0 : e.key === 'End' ? res.quotes.length - 1 : step ? (i + step + res.quotes.length) % res.quotes.length : -1
    if (to < 0) return
    e.preventDefault()
    setSel(to)
    document.getElementById(`${anchor}-tab-${to}`)?.focus()
  }
  // A citation in the generated explanation ([2]) points at a source: show that one.
  const followCite = (e: React.MouseEvent) => {
    const href = (e.target as HTMLElement).closest('a')?.getAttribute('href') ?? ''
    const m = href.match(new RegExp(`^#${anchor}-(\\d+)$`))
    if (m) setSel(Number(m[1]))
  }

  const plain = [
    ...(res.direct?.text ? [res.direct.text] : []),
    ...res.quotes.map((q) => `${q.text}\n${displayRef(q.ref, lang)}\n${q.url}`),
    `— ${t.appName}`,
  ].join('\n\n')

  const doCopy = async () => {
    if (await copyText(plain)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }
  // The quoted text's place goes with it, for «أبلغ عن خطأ» at the sheet's foot (reply 0033 §أ3).
  const openSource = (key: SourceKey, name?: string, url?: string, q?: Quote) => setSrc({ key, name, url, loc: q && placeOfQuote(q, key, lang) })
  const shownQuote = res.quotes[many ? sel : 0]

  return (
    <>
      <article className="card v2-answer" aria-label={answerLevelLabel(t, lang, res.level)} onClickCapture={many ? followCite : undefined}>
        {many && (
          <div className="v2-ayat-seg" role="tablist" aria-label={a.ayatGroup}>
            {res.quotes.map((q, i) => (
              <button
                key={q.id}
                type="button"
                role="tab"
                id={`${anchor}-tab-${i}`}
                aria-selected={sel === i}
                aria-controls={`${anchor}-${i}`}
                tabIndex={sel === i ? 0 : -1}
                onClick={() => setSel(i)}
                onKeyDown={(e) => tabKeys(e, i)}
              >
                <span lang="ar" dir="rtl">
                  {displayRef(q.ref, lang)}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="v2-ans-card">
          <div className="v2-ans-head">
            <span className="v2-pill">
              <span className="v2-dot" aria-hidden="true" />
              {answerLevelLabel(t, lang, res.level)}
            </span>
            {shownQuote?.verified && (
              <span className="v2-pill badge-verified">
                <IconCheck />
                {t.badgeVerified}
              </span>
            )}
            {res.reviewed && (
              <span className="v2-pill badge-reviewed">
                {t.badgeReviewed} · {res.reviewed.at}
              </span>
            )}
            {res.fromCache && <span className="v2-pill is-plain">{t.fromCache}</span>}
            <DemoBadge />
          </div>

          {res.direct?.text && (
            <p className="direct" lang={ansLang} dir={ansDir}>
              <SentenceText s={res.direct} quotes={res.quotes} anchor={anchor} />
            </p>
          )}

          {res.quotes.map((q, i) => {
            const source = sourceOfQuote(q)
            return (
              <section
                key={q.id}
                id={`${anchor}-${i}`}
                className="v2-quote"
                aria-label={many ? undefined : displayRef(q.ref, lang)}
                role={many ? 'tabpanel' : undefined}
                aria-labelledby={many ? `${anchor}-tab-${i}` : undefined}
                hidden={many && sel !== i}
              >
                {q.grade && <span className="small">{q.grade}</span>}
                <MushafFrame title={q.kind === 'ayah' ? suraTitle(q.ref) : undefined} ayah={q.kind === 'ayah' ? q.id : undefined} listenShort>
                  <p className="sacred" lang="ar" dir="rtl">
                    {q.kind === 'ayah' ? (
                      <AyahEnd text={q.text}>
                        <Mkp n={arabicDigits(ayahOf(q.id))} size={30} />
                      </AyahEnd>
                    ) : (
                      q.text
                    )}
                  </p>
                </MushafFrame>
                {/* Rule 1 (CLAUDE.md §3): the reference under the text; then the light source line (V2 rule 1). */}
                <div className="quote-meta">
                  <span className="ref">{displayRef(q.ref, lang)}</span>
                  <div className="quote-links">
                    <button type="button" className="text-link" onClick={() => onFullText(q)}>
                      {t.fullText}
                    </button>
                    {q.kind === 'ayah' && (() => {
                      const m = q.id.match(/^quran:(\d{1,3}):(\d{1,3})$/)
                      return m ? (
                        <ReaderLink to={quranPath(Number(m[1]), Number(m[2]))} className="text-link">
                          {t.openInMushaf}
                        </ReaderLink>
                      ) : null
                    })()}
                  </div>
                </div>
                <SourceLine source={source} name={source === 'book239' || source === 'tawhid' ? bookTitle(q.ref) : undefined} onOpen={(s, n) => openSource(s, n, q.url, q)} />
                {q.meaning && <MeaningBlock meaning={q.meaning} textEn={q.text_en} />}
                {showEnglish && !q.meaning && q.text_en && (
                  <div className="section">
                    <p className="section-label">{q.kind === 'ayah' ? t.meaningAyah : t.meaningHadith}</p>
                    <p className="translation" lang="en" dir="ltr">
                      {q.text_en}
                    </p>
                  </div>
                )}
                {isShurutPassage(q.id) && <ShurutNote />}
                {q.kind === 'ayah' && <TafsirBox q={q} answerId={anchor} onSource={(s, n, u) => openSource(s, n, u, q)} />}
                {res.explain_mode === 'on_demand' && (
                  <ExplainBox
                    id={q.id}
                    sourceName={q.kind === 'ayah' ? t.tafsirMuyassar : displayRef(q.ref, lang)}
                    sourceUrl={q.kind === 'ayah' ? (muyassarUrl ?? q.url) : q.url}
                  />
                )}
                {q.kind === 'ayah' && <ReviewedBox id={q.id} sourceUrl={muyassarUrl ?? q.url} />}
              </section>
            )
          })}

          {hasExplanation && (
            <section className="section" aria-label={t.plainExplanation}>
              <p className="section-label">
                {t.plainExplanation}
                {res.machineTranslated && <span className="badge badge-mt">{untested ? t.badgeMTUntested : t.badgeMT}</span>}
              </p>
              <p className="explanation" lang={ansLang} dir={ansDir}>
                {res.explanation.map((s, i) => (
                  <SentenceText key={i} s={s} quotes={res.quotes} anchor={anchor} />
                ))}
              </p>
              {res.tafsir && res.tafsir.length > 0 && (
                <p className="small">
                  {t.tafsirFrom}:{' '}
                  {res.tafsir.map((x, i) => (
                    <span key={`${i}-${x.ref}`}>
                      {i > 0 && ' · '}
                      <a href={x.url} target="_blank" rel="noopener noreferrer">
                        {displayRef(x.ref, lang)}
                      </a>
                    </span>
                  ))}
                </p>
              )}
              <p className="small">{t.generatedTag}</p>
            </section>
          )}

          {/* «للاستزادة» (c08): the referral to the fatwas through the existing mechanism (source د), a line of its own. */}
          <a className="v2-more" href={ALIFTA_URL} target="_blank" rel="noopener noreferrer">
            <span className="v2-more-lead">
              <IconInfoCircle />
            </span>
            <span className="v2-more-text">
              {a.more}
              <br />
              <span className="v2-more-org">{a.moreOrg}</span>
            </span>
            <span className="v2-more-end">
              <IconExternalV2 />
            </span>
          </a>

          <div className="v2-actions-row">
            <HowFoundButton onClick={onHowFound} />
            <span className="v2-flex" />
            <button type="button" className="v2-act" onClick={doCopy} aria-label={copied ? a.copied : a.copy} aria-live="polite">
              {copied ? <IconCheck /> : <IconCopy />}
            </button>
            <button type="button" className="v2-act" aria-pressed={rated} aria-label={rated ? a.thanks : a.useful} onClick={() => setRated(true)}>
              <IconThumbUp />
            </button>
            {/* «Not helpful» opens the existing report sheet: what is wrong, for which text. */}
            <button type="button" className="v2-act" aria-label={a.notUseful} aria-haspopup="dialog" onClick={() => onReport(res.quotes)}>
              <IconThumbDown />
            </button>
          </div>
        </div>
      </article>
      <p className="disclaimer">{t.disclaimer}</p>
      <SourceSheet open={!!src} onClose={() => setSrc(null)} source={src?.key ?? null} name={src?.name} url={src?.url} loc={src?.loc} />
    </>
  )
}

export function ReferralCard({ res }: { res: ReferralResponse }) {
  const { t } = useI18n()
  const button = (
    <a className="btn btn-primary" href={res.link || ALIFTA_URL} target="_blank" rel="noopener noreferrer">
      <span>{t.referralButton}</span>
      <IconExternal />
    </a>
  )
  if (res.disputed) {
    // Rule 11: the fixed sentence, then the texts with their references; nothing generated.
    return (
      <article className="card" aria-label={res.message}>
        <div className="badges">
          <span className="badge badge-level">{levelLabel(t, res.level)}</span>
          <DemoBadge />
        </div>
        <DisputedBadge message={res.message} />
        <DisputedQuotes quotes={res.quotes ?? []} />
        <p className="card-body">{t.referralBody}</p>
        {button}
      </article>
    )
  }
  return (
    <article className="card card-center" aria-label={t.referralTitle}>
      <div className="badges">
        <span className="badge">{levelLabel(t, res.level)}</span>
        <DemoBadge />
      </div>
      <IconLock />
      <p className="card-title">{t.referralTitle}</p>
      <p className="card-body">{t.referralBody}</p>
      {button}
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

import { useEffect, useState } from 'react'
import type { Lang, PassageResponse, Quote, ReportReason } from '../../../shared/api'
import { getPassage, sendReport, type DemoKind } from '../api/client'
import { LANGS, useI18n } from '../i18n'
import { useInstall } from '../install'
import type { FontSize, Settings, Theme } from '../settings'
import { IconCheck, IconPlusSquare, IconShareIos } from './Icons'
import { MushafFrame } from './Ornaments'
import { Sheet } from './Sheet'

type Base = { open: boolean; onClose: () => void }

export function SourcesSheet({ open, onClose }: Base) {
  const { t } = useI18n()
  const rows = [
    [t.srcQuran, t.srcQuranBy, 'https://quran.ksu.edu.sa'],
    [t.srcHadith, t.srcHadithBy, 'https://sunnah.com'],
    [t.srcAqeedah, t.srcAqeedahBy, 'https://shamela.ws'],
    [t.srcFatwa, t.srcFatwaBy, 'https://www.alifta.gov.sa'],
  ]
  return (
    <Sheet open={open} onClose={onClose} title={t.sourcesTitle}>
      <p className="card-body">{t.sourcesIntro}</p>
      <div className="section">
        <p className="section-label">{t.approvedSources}</p>
        <ul className="list">
          {rows.map(([title, by, url]) => (
            <li key={url}>
              <span className="list-title">{title}</span>
              <a className="list-sub" href={url} target="_blank" rel="noopener noreferrer">
                {by} ↗
              </a>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  )
}

export function LanguageGrid({ value, onChange }: { value: Lang; onChange: (l: Lang) => void }) {
  const { t } = useI18n()
  return (
    <div className="lang-grid">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          className="lang-btn"
          aria-pressed={value === l.code}
          onClick={() => onChange(l.code)}
        >
          <span lang={l.code} dir={l.dir}>
            {l.native}
          </span>
          <span className="tag">{l.reviewed ? t.reviewedLang : t.mtLang}</span>
        </button>
      ))}
    </div>
  )
}

export function LanguageSheet({ open, onClose, value, onChange }: Base & { value: Lang; onChange: (l: Lang) => void }) {
  const { t } = useI18n()
  return (
    <Sheet open={open} onClose={onClose} title={t.language}>
      <LanguageGrid
        value={value}
        onChange={(l) => {
          onChange(l)
          onClose()
        }}
      />
      <p className="small">{t.langNote}</p>
    </Sheet>
  )
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: [T, string][]
  onChange: (v: T) => void
}) {
  return (
    <div className="row">
      <span className="row-label" id={`seg-${label}`}>
        {label}
      </span>
      <div className="segmented" role="radiogroup" aria-labelledby={`seg-${label}`}>
        {options.map(([v, text]) => (
          <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

type SettingsProps = Base & {
  settings: Settings
  update: (p: Partial<Settings>) => void
  onClear: () => void
  onSources: () => void
  onAbout: () => void
  onInstall: () => void
  onDemo?: (kind: DemoKind) => void // demo buttons, local development only
}

export function SettingsSheet({ open, onClose, settings, update, onClear, onSources, onAbout, onInstall, onDemo }: SettingsProps) {
  const { t } = useI18n()
  const demos: [DemoKind, string][] = [
    ['answer', t.demoAnswer],
    ['referral', t.demoReferral],
    ['abstain', t.demoAbstain],
    ['rate', t.demoRate],
    ['cap', t.demoCap],
    ['server', t.demoServer],
  ]
  return (
    <Sheet open={open} onClose={onClose} title={t.settings}>
      <div className="section">
        <p className="section-label">{t.language}</p>
        <LanguageGrid value={settings.lang} onChange={(lang) => update({ lang })} />
        <p className="small">{t.langNote}</p>
      </div>

      <Segmented<Theme>
        label={t.theme}
        value={settings.theme}
        options={[
          ['light', t.themeLight],
          ['dark', t.themeDark],
          ['auto', t.themeAuto],
        ]}
        onChange={(theme) => update({ theme })}
      />
      <Segmented<FontSize>
        label={t.fontSize}
        value={settings.fontSize}
        options={[
          ['sm', t.fontSmall],
          ['md', t.fontMedium],
          ['lg', t.fontLarge],
        ]}
        onChange={(fontSize) => update({ fontSize })}
      />

      <div className="section">
        <div className="row">
          <span className="row-label" id="simple-label">
            {t.simpleMode}
          </span>
          <span className="switch-wrap">
            <button
              type="button"
              role="switch"
              className="switch"
              aria-checked={settings.simple}
              aria-labelledby="simple-label"
              onClick={() => update({ simple: !settings.simple })}
            />
          </span>
        </div>
        <p className="small">{t.simpleModeHint}</p>
      </div>

      <div className="actions">
        <button type="button" className="btn" onClick={onSources}>
          {t.sources}
        </button>
        <button type="button" className="btn" onClick={onAbout}>
          {t.about}
        </button>
        <button type="button" className="btn" onClick={onInstall}>
          {t.install}
        </button>
        <button type="button" className="btn" onClick={onClear}>
          {t.clearChat}
        </button>
      </div>

      {onDemo && (
        <div className="section">
          <p className="section-label">{t.demoTitle}</p>
          <p className="small">{t.demoNote}</p>
          <div className="actions">
            {demos.map(([k, label]) => (
              <button key={k} type="button" className="btn" onClick={() => onDemo(k)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="small" style={{ textAlign: 'center' }}>
        {t.versionLine}
      </p>
    </Sheet>
  )
}

export function FullTextSheet({ open, onClose, quote }: Base & { quote: Quote | null }) {
  const { t, lang } = useI18n()
  const [loaded, setLoaded] = useState<{ key: string; p: PassageResponse | null } | null>(null)
  const [copied, setCopied] = useState(false)
  const key = quote ? `${quote.id}|${lang}` : ''

  useEffect(() => {
    if (!open || !quote) return
    let alive = true
    getPassage(quote.id, lang).then((p) => {
      if (alive) setLoaded({ key: `${quote.id}|${lang}`, p })
    })
    return () => {
      alive = false
    }
  }, [open, quote, lang])

  const p = loaded?.key === key ? loaded.p : null
  const shown = p ?? quote
  const copy = async () => {
    if (!shown) return
    try {
      await navigator.clipboard.writeText(`${shown.text}\n${shown.ref}\n${shown.url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard blocked
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.fullTextTitle}>
      {shown && (
        <>
          {p?.before?.map((c) => (
            <p key={c.id} className="ctx" lang="ar" dir="rtl">
              {c.text}
            </p>
          ))}
          <div className="section">
            <p className="section-label">{t.arabicText}</p>
            <MushafFrame>
              <p className="sacred" lang="ar" dir="rtl">
                {shown.text}
              </p>
            </MushafFrame>
            <span className="ref">{shown.ref}</span>
          </div>
          {p?.after?.map((c) => (
            <p key={c.id} className="ctx" lang="ar" dir="rtl">
              {c.text}
            </p>
          ))}
          {shown.text_en && (
            <div className="section">
              <p className="section-label">{shown.kind === 'ayah' ? t.meaningAyah : t.meaningHadith}</p>
              <p className="translation" lang="en" dir="ltr">
                {shown.text_en}
              </p>
            </div>
          )}
          {p?.tafsir?.map((x) => (
            <div key={x.name} className="section">
              <p className="section-label">{x.name}</p>
              {(x.paragraphs?.length ? x.paragraphs : [x.text]).map((para, i) => (
                <p key={i} className="translation" lang="ar" dir="rtl">
                  {para}
                </p>
              ))}
              <a className="text-link" href={x.url} target="_blank" rel="noopener noreferrer">
                {x.ref} ↗
              </a>
            </div>
          ))}
          <div className="actions">
            <a className="btn" href={shown.url} target="_blank" rel="noopener noreferrer">
              {t.openSource}
            </a>
            <button type="button" className="btn" onClick={copy} aria-live="polite">
              {copied ? t.copied : t.copy}
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}

export function ReportSheet({ open, onClose, quotes }: Base & { quotes: Quote[] }) {
  const { t } = useI18n()
  return (
    <Sheet open={open} onClose={onClose} title={t.reportTitle}>
      <ReportForm quotes={quotes} />
    </Sheet>
  )
}

// Mounted fresh each time the sheet opens, so its state starts clean.
function ReportForm({ quotes }: { quotes: Quote[] }) {
  const { t } = useI18n()
  const [passage, setPassage] = useState<string>(quotes[0]?.id ?? '')
  const [reason, setReason] = useState<ReportReason | null>(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  const reasons: [ReportReason, string][] = [
    ['text_mismatch', t.reasonMismatch],
    ['wrong_ref', t.reasonRef],
    ['bad_translation', t.reasonTranslation],
    ['other', t.reasonOther],
  ]

  const submit = async () => {
    if (!reason || !passage) return
    setBusy(true)
    setFailed(false)
    try {
      await sendReport({ passageId: passage, reason })
      setSent(true)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  if (sent)
    return (
      <p className="card-body-strong" role="status">
        {t.reportSent}
      </p>
    )

  return (
    <>
      {quotes.length > 1 && (
        <fieldset className="radio-list" style={{ border: 0, padding: 0, margin: 0 }}>
          {quotes.map((q) => (
            <label key={q.id} className="radio">
              <input type="radio" name="passage" checked={passage === q.id} onChange={() => setPassage(q.id)} />
              {q.ref}
            </label>
          ))}
        </fieldset>
      )}
      <fieldset className="radio-list" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="section-label" style={{ marginBottom: 8 }}>
          {t.reportIntro}
        </legend>
        {reasons.map(([k, label]) => (
          <label key={k} className="radio">
            <input type="radio" name="reason" checked={reason === k} onChange={() => setReason(k)} />
            {label}
          </label>
        ))}
      </fieldset>
      <p className="small">{t.reportPrivacy}</p>
      {failed && (
        <p className="card-body-strong" role="alert">
          {t.errConnection}
        </p>
      )}
      <button type="button" className="btn btn-primary" disabled={!reason || busy} onClick={submit}>
        {t.reportSend}
      </button>
    </>
  )
}

export function InstallSheet({ open, onClose }: Base) {
  const { t } = useI18n()
  const inst = useInstall()
  return (
    <Sheet open={open} onClose={onClose} title={t.installTitle}>
      {inst.installed ? (
        <p className="card-body-strong">{t.installed}</p>
      ) : inst.ios ? (
        <ol className="steps">
          <li>
            <span className="step-icon">
              <IconShareIos />
            </span>
            <span>{t.iosStep1}</span>
          </li>
          <li>
            <span className="step-icon">
              <IconPlusSquare />
            </span>
            <span>{t.iosStep2}</span>
          </li>
          <li>
            <span className="step-icon">
              <IconCheck />
            </span>
            <span>{t.iosStep3}</span>
          </li>
        </ol>
      ) : inst.canPrompt ? (
        <button type="button" className="btn btn-primary" onClick={inst.prompt}>
          {t.androidButton}
        </button>
      ) : (
        <p className="card-body">{t.installFallback}</p>
      )}
    </Sheet>
  )
}

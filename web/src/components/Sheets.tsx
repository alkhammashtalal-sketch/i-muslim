import { useEffect, useState } from 'react'
import type { PassageResponse, Quote, ReportReason } from '../../../shared/api'
import { getPassage, sendReport, type DemoKind } from '../api/client'
import { useI18n } from '../i18n'
import { useInstall } from '../install'
import { isNative } from '../native/platform'
import type { FontSize, Settings } from '../settings'
import { IconCheck, IconPlusSquare, IconShareIos } from './Icons'
import { displayRef, fmt } from '../quran/format'
import { ShurutNote } from '../trust/ShurutNote'
import { isShurutPassage } from '../trust/shurut'
import { MushafFrame } from './Ornaments'
import { Sheet } from './Sheet'
import { ReciterSelect } from '../quran/Listen'
import { MeaningBlock } from '../quran/Meaning'
import { IconChevronEnd, IconPin } from '../v2/answer/icons'
import { useSources, type PinType } from '../v2/answer/pins'
import { PinSheet } from '../v2/answer/SourceSheets'
import { ANSWER } from '../v2/answer/strings'
import { nativeName } from '../v2/lang/served'
import { SOURCES_UI } from '../v2/sources/strings'
import { sitePage } from '../v2/site/links'
import { SITE_LINKS } from '../v2/site/strings'

type Base = { open: boolean; onClose: () => void }

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  hideLabel = false,
}: {
  label: string
  value: T
  options: [T, string][]
  onChange: (v: T) => void
  /** The row above already shows the title (reply 0045 ج: «حجم الخط» once): the label is for screen readers only. */
  hideLabel?: boolean
}) {
  return (
    <div className={hideLabel ? 'row row-seg-only' : 'row'}>
      <span className={hideLabel ? 'sr-only' : 'row-label'} id={`seg-${label}`}>
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
  onLanguage: () => void // the language picker screen (reply 0033 §أ1)
  onDemo?: (kind: DemoKind) => void // demo buttons, local development only
}

export function SettingsSheet({ open, onClose, settings, update, onClear, onSources, onAbout, onInstall, onLanguage, onDemo }: SettingsProps) {
  const { t, lang } = useI18n()
  const a = ANSWER[lang]
  const pins = useSources().pins
  const [pinFor, setPinFor] = useState<PinType | null>(null)
  const pinName = (type: PinType) => {
    const v = pins[type]
    if (v === 'muyassar') return t.tafsirMuyassar
    if (v === 'saadi') return t.tafsirSaadi
    if (v === 'all') return type === 'tafsir' ? a.pinAllTafsir : a.pinAllHadith
    return a.pinBest
  }
  const pinRow = (type: PinType, label: string) => (
    <button type="button" className="v2-set-row" aria-haspopup="dialog" onClick={() => setPinFor(type)}>
      <span className="v2-set-label">{label}</span>
      <span className="v2-set-value">
        {pinName(type)}
        {pins[type] !== 'best' && pins[type] !== 'all' && (
          <span className="v2-pinmark">
            <IconPin />
          </span>
        )}
      </span>
      <span className="v2-set-end">
        <IconChevronEnd />
      </span>
    </button>
  )
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
      {/* V2 (c13, SettingsAfter): where the explanation comes from first, one choice per type, kept on the device. */}
      <section className="v2-set-section" aria-labelledby="set-sources">
        <h3 id="set-sources">{a.setSources}</h3>
        <p className="v2-set-hint">{a.setSourcesHint}</p>
        <div className="v2-set-group">
          {pinRow('tafsir', a.setTafsir)}
          {pinRow('hadith', a.setHadith)}
        </div>
      </section>
      <PinSheet open={pinFor !== null} onClose={() => setPinFor(null)} type={pinFor ?? 'tafsir'} />
      {/* The language (reply 0033 §أ1): one row that opens the picker screen, with the content language's own name. */}
      <section className="v2-set-section" aria-label={t.language}>
        <div className="v2-set-group">
          <button type="button" className="v2-set-row" onClick={onLanguage}>
            <span className="v2-set-label">{t.language}</span>
            <span className="v2-set-value">
              <bdi lang={settings.content}>{nativeName(settings.content)}</bdi>
            </span>
            <span className="v2-set-end">
              <IconChevronEnd />
            </span>
          </button>
        </div>
      </section>

      {/* «القراءة»: text follows the phone's setting (c21: rem sizes); these steps add to it, the middle one is the phone's own. */}
      <section className="v2-set-section" aria-labelledby="set-reading">
        <h3 id="set-reading">{a.setReading}</h3>
        <div className="v2-set-group">
          <div className="v2-set-row" role="presentation">
            <span className="v2-set-label">{a.setFont}</span>
            <span className="v2-set-value">{settings.fontSize === 'md' ? a.setFontPhone : settings.fontSize === 'sm' ? t.fontSmall : t.fontLarge}</span>
          </div>
          <Segmented<FontSize>
            hideLabel
            label={t.fontSize}
            value={settings.fontSize}
            options={[
              ['sm', t.fontSmall],
              ['md', a.setFontPhone],
              ['lg', t.fontLarge],
            ]}
            onChange={(fontSize) => update({ fontSize })}
          />
        </div>
      </section>

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

      {/* «التلاوة»: the reciter heard in the Mushaf, the answer card and voice conversation (command 20). */}
      <section className="v2-set-section" aria-labelledby="set-recitation">
        <h3 id="set-recitation">{a.setRecitation}</h3>
        <div className="v2-set-group">
          <ReciterSelect className="reciter-settings" />
        </div>
      </section>

      <div className="actions">
        {/* «المصادر والشكر» (reply 0033 §أ3): its own page, at /sources. */}
        <button type="button" className="btn" onClick={onSources}>
          {SOURCES_UI[lang].title}
        </button>
        {/* «سياسة الخصوصية» (reply 0033 §ج; Apple 5.1.1): the site's page in the interface language, in the browser. */}
        <a className="btn" href={sitePage('privacy', lang)} target="_blank" rel="noopener noreferrer">
          {SITE_LINKS[lang].privacy}
          <span className="sr-only"> ({SITE_LINKS[lang].opensOutside})</span>
        </a>
        {/* «تواصل معنا» (reply 0038 §2): the site's support page (its form and the support address), in the browser. */}
        <a className="btn" href={sitePage('support', lang)} target="_blank" rel="noopener noreferrer">
          {SITE_LINKS[lang].contact}
          <span className="sr-only"> ({SITE_LINKS[lang].opensOutside})</span>
        </a>
        <button type="button" className="btn" onClick={onAbout}>
          {t.about}
        </button>
        {/* No «install» in the iOS/Android app: it is already installed (reply 0033 §ب1). */}
        {!isNative() && (
          <button type="button" className="btn" onClick={onInstall}>
            {t.install}
          </button>
        )}
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
        {fmt(t.versionLine, { v: __APP_VERSION__ })}
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
      await navigator.clipboard.writeText(`${shown.text}\n${displayRef(shown.ref, lang)}\n${shown.url}`)
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
            <span className="ref">{displayRef(shown.ref, lang)}</span>
            {isShurutPassage(shown.id) && <ShurutNote />}
          </div>
          {p?.after?.map((c) => (
            <p key={c.id} className="ctx" lang="ar" dir="rtl">
              {c.text}
            </p>
          ))}
          {lang !== 'ar' && quote?.meaning && <MeaningBlock meaning={quote.meaning} textEn={shown.text_en} />}
          {lang !== 'ar' && !quote?.meaning && shown.text_en && (
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
                {displayRef(x.ref, lang)} ↗
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
  const { t, lang } = useI18n()
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
              {displayRef(q.ref, lang)}
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

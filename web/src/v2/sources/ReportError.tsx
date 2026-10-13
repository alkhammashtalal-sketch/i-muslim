// «أبلغ عن خطأ» (reply 0033 §أ3): the type (نص، ترجمة، شرح، غير ذلك), the place filled in by the screen that opened it
// (an ayah or hadith number, the language, the source and its version; none from the sources page), and an optional
// note of up to 500 characters with «لا تكتب اسمك ولا أي بيانات عنك.» under it. Sent to POST /api/report with `kind`;
// the server keeps these and the day only. Also the line that ends each «عن المصدر» sheet: «أبلغ عن خطأ» there, with
// the place, and the link to «المصادر والشكر».
import { useId, useState } from 'react'
import type { SourceReportKind } from '../../../../shared/api'
import { useI18n } from '../../i18n'
import { fmt, numFmt } from '../../quran/format'
import { IconOpenBook } from '../answer/icons'
import { V2Sheet } from '../answer/SourceSheets'
import { openToday } from '../daily/Screen'
import { sendSourceReport, type SendOutcome } from './api'
import { IconFlag } from './icons'
import { NOTE_MAX, SOURCES_PATH, type ReportLoc } from './place'
import { langName, sourceById, text } from './registry'
import { SOURCES_UI } from './strings'
import './sources.css'

const KINDS: { kind: Exclude<SourceReportKind, 'support'>; key: 'typeText' | 'typeTranslation' | 'typeExplanation' | 'typeOther' }[] = [
  { kind: 'text', key: 'typeText' },
  { kind: 'translation', key: 'typeTranslation' },
  { kind: 'explanation', key: 'typeExplanation' },
  { kind: 'other', key: 'typeOther' },
]

export function ReportErrorSheet({ open, onClose, loc }: { open: boolean; onClose: () => void; loc?: ReportLoc | null }) {
  const { lang } = useI18n()
  return (
    <V2Sheet open={open} onClose={onClose} title={SOURCES_UI[lang].reportTitle}>
      {/* Mounted afresh each time the sheet opens, so the form starts clean. */}
      {open && <ReportForm loc={loc ?? null} />}
    </V2Sheet>
  )
}

function ReportForm({ loc }: { loc: ReportLoc | null }) {
  const { lang } = useI18n()
  const s = SOURCES_UI[lang]
  const num = numFmt(lang)
  const id = useId()
  const [kind, setKind] = useState<SourceReportKind | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<SendOutcome | null>(null)
  const src = loc ? sourceById(loc.source) : undefined

  const send = async () => {
    if (!kind || busy) return
    setBusy(true)
    const place = loc ? { type: loc.type, id: loc.id, lang: loc.lang, source: loc.source, ...(loc.version ? { version: loc.version } : {}) } : undefined
    setOutcome(await sendSourceReport({ kind, ...(place ? { loc: place } : {}), ...(note.trim() ? { note: note.trim() } : {}) }))
    setBusy(false)
  }

  if (outcome === 'sent')
    return (
      <p className="sr-sent" role="status">
        {s.sent}
      </p>
    )

  const whereLabel = loc?.type === 'ayah' ? s.whereAyah : loc?.type === 'hadith' ? s.whereHadith : s.wherePassage
  const whereValue = loc ? (loc.label ?? (loc.type === 'hadith' ? fmt(s.hadithNo, { n: num(Number(loc.id)) }) : loc.id)) : ''

  return (
    <form
      className="sr-form"
      onSubmit={(e) => {
        e.preventDefault()
        void send()
      }}
    >
      {loc && (
        <section className="sr-where" aria-labelledby={`${id}-where`}>
          <h3 id={`${id}-where`}>{s.where}</h3>
          <dl>
            <div>
              <dt>{whereLabel}</dt>
              <dd>{whereValue}</dd>
            </div>
            <div>
              <dt>{s.whereLang}</dt>
              <dd>{langName(loc.lang, lang)}</dd>
            </div>
            {src && (
              <div>
                <dt>{s.whereSource}</dt>
                <dd>
                  {typeof src.name === 'string' ? <bdi dir="ltr">{src.name}</bdi> : text(src.name, lang)}
                  {loc.version && (
                    <>
                      {' · '}
                      <bdi dir="ltr" className="sr-ver">
                        {loc.version}
                      </bdi>
                    </>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <fieldset className="sr-types">
        <legend>{s.typeLegend}</legend>
        <div className="sr-chips">
          {KINDS.map((k) => (
            <label key={k.kind} className="sr-chip">
              <input type="radio" name={`${id}-kind`} value={k.kind} checked={kind === k.kind} onChange={() => setKind(k.kind)} />
              <span>{s[k.key]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="sr-note">
        <label htmlFor={`${id}-note`}>{s.noteLabel}</label>
        <textarea id={`${id}-note`} rows={4} maxLength={NOTE_MAX} value={note} onChange={(e) => setNote(e.target.value)} aria-describedby={`${id}-hint ${id}-count`} dir="auto" />
        <div className="sr-note-foot">
          <p id={`${id}-hint`}>{s.noteHint}</p>
          <span id={`${id}-count`} className="sr-count">
            {fmt(s.noteCount, { n: num(note.length), max: num(NOTE_MAX) })}
          </span>
        </div>
      </div>

      <p className="sr-privacy">{s.privacy}</p>
      {outcome === 'failed' && (
        <p className="sr-msg" role="alert">
          {s.failed}
        </p>
      )}
      {outcome === 'limited' && (
        <p className="sr-msg" role="status">
          {s.limited}
        </p>
      )}
      <button type="submit" className="sr-btn sr-btn-primary" disabled={!kind || busy || outcome === 'limited'}>
        {busy ? s.sending : s.send}
      </button>
    </form>
  )
}

/** The line at the foot of an «عن المصدر» sheet: «أبلغ عن خطأ» with the place, and «كل المصادر والشكر». */
export function SourceFoot({ loc, onLeave }: { loc?: ReportLoc | null; onLeave: () => void }) {
  const { lang } = useI18n()
  const s = SOURCES_UI[lang]
  const [open, setOpen] = useState(false)
  return (
    <div className="sr-foot">
      {loc && (
        <button type="button" className="sr-foot-btn" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          <IconFlag size={17} />
          {s.report}
        </button>
      )}
      <a
        className="sr-foot-btn"
        href={SOURCES_PATH}
        onClick={(e) => {
          e.preventDefault()
          onLeave()
          openToday(SOURCES_PATH)
        }}
      >
        <IconOpenBook size={17} />
        {s.allSources}
      </a>
      {loc && <ReportErrorSheet open={open} onClose={() => setOpen(false)} loc={loc} />}
    </div>
  )
}

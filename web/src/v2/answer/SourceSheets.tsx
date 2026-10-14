// The light source line under each part (V2 rule 1, c09), and the two bottom sheets of the answer screen: «عن المصدر»
// (SourceAfter) and the pin sheet (PinAfter, c13/c15). Sheets are <dialog> elements (focus trap, Esc closes).
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { fmt } from '../../quran/format'
import { IconChevronEnd, IconExternalV2, IconOpenBook, IconPin, IconRadio, IconX } from './icons'
import { setPin, useSources, type PinType, type PinValue } from './pins'
import { SOURCES, type SourceKey } from './sources'
import type { ReportLoc } from '../sources/place'
import { SourceFoot } from '../sources/ReportError'
import { ANSWER } from './strings'

export function V2Sheet({ open, onClose, title, label, children }: { open: boolean; onClose: () => void; title: string; label?: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const { t } = useI18n()
  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      d.showModal()
      // The sheet itself takes the focus, not its first button (0058 §2): WebKit draws a focus-visible ring around a
      // button focused on opening, even after a tap. The modal dialog keeps the focus inside it, and Tab reaches «×»,
      // whose ring then shows; a screen reader reads the sheet by its title.
      d.focus({ preventScroll: true })
    }
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      className="v2-sheet"
      tabIndex={-1}
      aria-labelledby={titleId}
      aria-label={label}
      // A sheet opened from inside this one (the report form) closes alone: React passes its close event up the tree.
      onClose={(e) => e.target === ref.current && openRef.current && onClose()}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {open && (
        <div className="v2-sheet-body">
          <span className="v2-sheet-handle" aria-hidden="true" />
          <div className="v2-sheet-head">
            <h2 id={titleId}>{title}</h2>
            <button type="button" className="v2-icon-btn" onClick={onClose} aria-label={t.close}>
              <IconX />
            </button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}

/** «التفسير الميسر · المصحف الإلكتروني»: one light line; tapping it opens «عن المصدر». */
export function SourceLine({ source, name, onOpen }: { source: SourceKey; name?: string; onOpen: (s: SourceKey, name?: string) => void }) {
  const { lang } = useI18n()
  const a = ANSWER[lang]
  const info = SOURCES[source]
  const full = name ?? (info.name ? a[info.name] : '')
  return (
    <button type="button" className="v2-srcline" aria-label={fmt(a.aboutSourceOf, { name: full })} onClick={() => onOpen(source, name)}>
      <span className="v2-srcline-lead">
        <IconOpenBook />
      </span>
      <span className="v2-srcline-text">
        <span className="v2-srcline-name">{full}</span>
        {info.via !== info.name && <> · {a[info.via]}</>}
      </span>
      <span className="v2-srcline-end">
        <IconChevronEnd />
      </span>
    </button>
  )
}

/** «عن المصدر»: the name, then documented rows only, then «افتح … في موقعه»; at the foot «أبلغ عن خطأ» (with the
 *  text's place, when the screen gives one) and the link to «المصادر والشكر» (reply 0033 §أ3). */
export function SourceSheet({ open, onClose, source, name, url, loc }: { open: boolean; onClose: () => void; source: SourceKey | null; name?: string; url?: string; loc?: ReportLoc }) {
  const { lang } = useI18n()
  const a = ANSWER[lang]
  const info = source ? SOURCES[source] : null
  return (
    <V2Sheet open={open && !!info} onClose={onClose} title={a.aboutSource}>
      {info && (
        <>
          <div className="v2-src-head">
            <span className="v2-src-badge">
              <IconOpenBook size={24} />
            </span>
            <div>
              <div className="v2-src-name">{name ?? (info.name ? a[info.name] : '')}</div>
              <div className="v2-src-sub">{a.aboutSource}</div>
            </div>
          </div>
          {info.rows.map((r) => (
            <div key={r.label} className="v2-src-row">
              <span className="v2-src-label">{a[r.label]}</span>
              <span className="v2-src-value">{a[r.value]}</span>
            </div>
          ))}
          <a className="v2-src-open" href={url ?? info.home} target="_blank" rel="noopener noreferrer">
            {a[info.open]}
            <IconExternalV2 size={17} />
          </a>
          <SourceFoot loc={loc} onLeave={onClose} />
        </>
      )}
    </V2Sheet>
  )
}

/** The pin sheet: one list, the choice saved at once (no «save»). Sources listed are the ones that exist for the type. */
export function PinSheet({ open, onClose, type }: { open: boolean; onClose: () => void; type: PinType }) {
  const { lang, t } = useI18n()
  const a = ANSWER[lang]
  const pins = useSources().pins
  const current = pins[type]
  // Hadith explanations have no source yet (Riyad al-Salihin awaits the foundation's permission): best and all only.
  const options: [PinValue, string, string?][] =
    type === 'tafsir'
      ? [
          ['best', a.pinBest, a.pinBestHint],
          ['muyassar', t.tafsirMuyassar],
          ['saadi', t.tafsirSaadi],
          ['all', a.pinAllTafsir, a.pinAllHint],
        ]
      : [
          ['best', a.pinBest, a.pinBestHint],
          ['all', a.pinAllHadith, a.pinAllHint],
        ]
  const title = type === 'tafsir' ? a.pinTafsirTitle : a.pinHadithTitle
  return (
    <V2Sheet open={open} onClose={onClose} title={title}>
      <p className="v2-pin-q">{type === 'tafsir' ? a.pinTafsirQ : a.pinHadithQ}</p>
      <div className="v2-pin-list" role="radiogroup" aria-label={title}>
        {options.map(([v, label, hint]) => {
          const on = current === v
          const isSource = v !== 'best' && v !== 'all'
          return (
            <button key={v} type="button" role="radio" aria-checked={on} className="v2-pin-row" onClick={() => setPin(type, v)}>
              <span className="v2-pin-radio">
                <IconRadio on={on} />
              </span>
              <span className="v2-pin-text">
                <span className="v2-pin-label">{label}</span>
                {(on && isSource) || hint ? <span className="v2-pin-hint">{on && isSource ? a.pinNow : hint}</span> : null}
              </span>
              {on && isSource && (
                <span className="v2-pin-mark">
                  <IconPin size={17} />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className="v2-pin-note">{type === 'tafsir' ? a.pinTafsirNote : a.pinHadithNote}</p>
    </V2Sheet>
  )
}

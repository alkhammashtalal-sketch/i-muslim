// Small shared pieces of the reader's V2 screens: the page head, the source line, tabs, chips and a short toast.
import { useEffect, useId, useState, type ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { fmt } from '../../quran/format'
import { IconChevronBack } from '../../components/Icons'
import { IcSource } from './icons'
import { READING } from './strings'
import './reading.css'

export const useReadingStrings = () => READING[useI18n().lang]

/** A sub-page's head: back and the title (boards SavedAfter, WardAfter, RecitersFav). */
export function PageHead({ title, onBack, children }: { title: string; onBack: () => void; children?: ReactNode }) {
  const { t } = useI18n()
  return (
    <div className="rd-head">
      <button type="button" className="rd-icon-btn" onClick={onBack} aria-label={t.back}>
        <IconChevronBack />
      </button>
      <h1>{title}</h1>
      {children}
    </div>
  )
}

export type SourceKey = 'mushaf' | 'muyassar' | 'saadi' | 'mp3quran'

/** The light source line under a part (V2 rule 1). Pressing it opens «about the source»: the app-wide sheet when one
 *  answers the event 'muslim:about-source' (part B), else these few documented facts inline, with the link to the
 *  source's own site inside them, never on the line itself. */
export function SourceLine({ k, name, via, url }: { k: SourceKey; name: string; via: string; url?: string }) {
  const r = useReadingStrings()
  const [open, setOpen] = useState(false)
  const id = useId()
  const press = () => {
    const handled = !window.dispatchEvent(new CustomEvent('muslim:about-source', { cancelable: true, detail: { key: k, name, url } }))
    if (!handled) setOpen((v) => !v)
  }
  return (
    <>
      <button type="button" className="rd-source" aria-label={fmt(r.aboutSource, { name })} aria-expanded={open} aria-controls={id} onClick={press}>
        <span className="rd-source-icon">
          <IcSource />
        </span>
        <span>
          <b>{name}</b> · {via}
        </span>
      </button>
      {open && (
        <div className="rd-source-facts" id={id}>
          <dl>
            <dt>{r.sourceVia}</dt>
            <dd>{via}</dd>
            <dt>{r.sourceShown}</dt>
            <dd>{r.sourceAsIs}</dd>
          </dl>
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer">
              {fmt(r.openSourceSite, { name })}
            </a>
          )}
        </div>
      )}
    </>
  )
}

/** Segmented tabs that switch a view in place (role=tablist, arrow keys move between them). */
export function Tabs<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="rd-tabs" role="tablist" aria-label={label}>
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            const rtl = document.documentElement.dir === 'rtl'
            const step = e.key === 'ArrowLeft' ? (rtl ? 1 : -1) : e.key === 'ArrowRight' ? (rtl ? -1 : 1) : 0
            if (!step) return
            const next = options[(i + step + options.length) % options.length]
            onChange(next.value)
            ;(e.currentTarget.parentElement?.children[options.indexOf(next)] as HTMLElement | undefined)?.focus()
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Choice chips (aria-pressed), the chosen one light (V2 rule 4). */
export function Chips<T extends string | number>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="rd-chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o.value)} type="button" className="rd-chip" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** A short status line that fades after a moment (role=status, read by screen readers). */
export function useToast(): [ReactNode, (text: string) => void] {
  const [text, setText] = useState<string | null>(null)
  useEffect(() => {
    if (!text) return
    const t = window.setTimeout(() => setText(null), 1800)
    return () => window.clearTimeout(t)
  }, [text])
  return [
    <p key="toast" className="rd-toast" role="status" hidden={!text}>
      {text}
    </p>,
    setText,
  ]
}

/** «Today», «Yesterday», «n days ago»… from an ISO time, in the interface's digits. */
export function whenLabel(iso: string, r: { today: string; yesterday: string; daysAgo: string; weeksAgo: string }, num: (n: number) => string) {
  const d = new Date(iso)
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((start(new Date()) - start(d)) / 86_400_000)
  if (days <= 0) return r.today
  if (days === 1) return r.yesterday
  if (days < 14) return fmt(r.daysAgo, { n: num(days) })
  return fmt(r.weeksAgo, { n: num(Math.floor(days / 7)) })
}

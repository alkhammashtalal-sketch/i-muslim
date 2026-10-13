// Shared parts of the daily tools: the screen header, the source line and its «عن المصدر» sheet, the hadith's title
// (HadeethEnc's own, reply 0031-add16 §2), and the hadith block (the text in its gold frame, verbatim, with the
// highlighted words; its grade and attribution as in HadeethEnc; the encyclopedia's translation for the other
// languages; the source line). V2 rules 1, 4, 8.
import { useState, type ReactNode } from 'react'
import { IconChevronBack } from '../../components/Icons'
import { Sheet } from '../../components/Sheet'
import { useI18n } from '../../i18n'
import { numFmt } from '../../quran/format'
import { navigate } from '../../quran/route'
import type { ToolHadith } from './api'
import { hadeethEncUrl } from './api'
import { fill, TOOLS } from './strings-tools'
import { highlightParts } from './verbatim'

export function useTools() {
  const { lang, t } = useI18n()
  return { lang, t, s: TOOLS[lang], num: numFmt(lang) }
}

export function ToolHead({ title }: { title: string }) {
  const { t } = useI18n()
  return (
    <div className="tool-head">
      <button type="button" className="v2-icon-btn" aria-label={t.back} onClick={() => (history.length > 1 ? history.back() : navigate('/'))}>
        <IconChevronBack />
      </button>
      <h1>{title}</h1>
    </div>
  )
}

/** One light line under each part (V2 rule 1); a tap opens «عن المصدر», where the link to the site lives. */
export function SourceLine({ name, detail, href, children }: { name: string; detail?: string; href?: string; children?: ReactNode }) {
  const { s } = useTools()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className="tool-source" aria-label={fill(s.sourceAbout, { name })} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span>
          <b>{name}</b>
          {detail ? ` · ${detail}` : ''}
        </span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={name}>
        {children}
        {href && (
          <p>
            <a className="text-link" href={href} target="_blank" rel="noopener noreferrer">
              {s.openSource} ↗
            </a>
          </p>
        )}
      </Sheet>
    </>
  )
}

export function Highlighted({ text, phrases }: { text: string; phrases: string[] }) {
  return (
    <>
      {highlightParts(text, phrases).map((p, i) => (p.mark ? <mark key={i}>{p.text}</mark> : <span key={i}>{p.text}</span>))}
    </>
  )
}

/** The card's title (reply 0031-add16 §2, board Adhkar): HadeethEnc's own `title`, verbatim. Outside Arabic, the
 *  language row's title when the encyclopedia has one, else the Arabic title, marked as Arabic. */
export function HadithTitle({ h, id }: { h: ToolHadith; id?: string }) {
  const { lang } = useTools()
  const tr = lang !== 'ar' && h.translation?.title ? h.translation : undefined
  const title = tr ? tr.title : h.title
  if (!title) return null
  const l = tr ? tr.lang : 'ar'
  return (
    <h2 id={id} className="tool-title" lang={l} dir={l === 'ar' || l === 'ur' ? 'rtl' : 'ltr'}>
      {title}
    </h2>
  )
}

export function HadithBlock({ h, children }: { h: ToolHadith; children?: ReactNode }) {
  const { lang, s, num } = useTools()
  const tr = lang !== 'ar' ? h.translation : undefined
  return (
    <>
      <div className="tool-text">
        <p lang="ar" dir="rtl">
          <Highlighted text={h.text} phrases={h.highlights ?? []} />
        </p>
      </div>
      {tr && (
        <p className="tool-tr" lang={tr.lang} dir={tr.lang === 'ur' ? 'rtl' : 'ltr'}>
          <span className="lbl">{s.translationLabel}</span>
          {tr.text}
        </p>
      )}
      <div className="tool-meta">
        {/* The grade and the attribution as written in the source (rule 10). */}
        {h.grade && (
          <span className={`tool-badge${h.tier === '3' ? ' hasan' : ''}`} lang="ar" dir="rtl">
            {h.grade}
          </span>
        )}
        {h.attribution && (
          <span className="tool-muted" lang="ar" dir="rtl">
            {h.attribution}
          </span>
        )}
      </div>
      {children}
      <SourceLine name={s.hadithSource} detail={fill(s.hadithNo, { n: num(Number(h.id)) })} href={hadeethEncUrl(h.id, lang)}>
        <p className="small">{h.version ? `${s.hadithSource} · ${h.version}` : s.hadithSource}</p>
      </SourceLine>
    </>
  )
}

export function Loading() {
  const { s } = useTools()
  return (
    <p className="tool-note" role="status">
      {s.loading}
    </p>
  )
}

export function Failed({ onRetry }: { onRetry: () => void }) {
  const { s } = useTools()
  return (
    <div className="tool-card pad" role="alert">
      <p className="tool-note">{s.failed}</p>
      <button type="button" className="tool-btn" onClick={onRetry}>
        {s.retry}
      </button>
    </div>
  )
}

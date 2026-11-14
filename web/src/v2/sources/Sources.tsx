// «المصادر والشكر» at /sources (reply 0033 §أ3; boards Sources and SourcesN): every source the app uses, from the one
// registry data/sources.json, grouped as on the board; a row opens its sheet; «نتابع إصداراتهم» with the date of the
// last monthly check (from the Worker, never written by hand); «وجدت خطأ؟» opens «أبلغ عن خطأ» without a place; the
// du'a at the foot as on the board. Opened from the settings and from every «عن المصدر» sheet.
import { useEffect, useState } from 'react'
import type { Lang, SourcesStatus } from '../../../../shared/api'
import { useI18n } from '../../i18n'
import { fmt } from '../../quran/format'
import { IconChevronEnd } from '../answer/icons'
import { Screen } from '../daily/Screen'
import { getSourcesStatus } from './api'
import { GroupIconOf, IconFlag, IconHeart, IconSync } from './icons'
import { dateText, GROUPS, isProper, SOURCES, takeText, text, type Source } from './registry'
import { ReportErrorSheet } from './ReportError'
import { SourceInfoSheet } from './SourceInfoSheet'
import { SOURCES_UI, type SourcesStrings } from './strings'
import './sources.css'

/** What the row shows at its end: an update waiting, else the version, else the fetch date (no version API). */
function rowMeta(src: Source, lang: Lang, s: SourcesStrings, status: SourcesStatus | null) {
  if (status?.pending.some((p) => p.source === src.id)) return <span className="sr-badge">{s.pending}</span>
  const v = src.version ?? src.versions?.[lang]
  if (v)
    return (
      <bdi dir="ltr" className="sr-ver">
        {v}
      </bdi>
    )
  if (src.versionFrom) return null
  const last = src.fetched?.[src.fetched.length - 1]
  return last ? <span className="sr-date">{dateText(last, lang)}</span> : null
}

function Row({ src, onOpen, status }: { src: Source; onOpen: (s: Source) => void; status: SourcesStatus | null }) {
  const { lang } = useI18n()
  const s = SOURCES_UI[lang]
  const meta = rowMeta(src, lang, s, status)
  return (
    <button type="button" className="sr-row" aria-haspopup="dialog" onClick={() => onOpen(src)} data-source={src.id}>
      <span className="sr-row-text">
        <span className="sr-row-name">{isProper(src.name) ? <bdi dir="ltr">{text(src.name, lang)}</bdi> : text(src.name, lang)}</span>
        {/* A photo's row carries its credit word for word (reply 0047 §1); what it is used for is in its sheet. */}
        <span className="sr-row-sub">
          {src.credit ? (
            isProper(src.credit) ? (
              <bdi dir="ltr">{text(src.credit, lang)}</bdi>
            ) : (
              text(src.credit, lang)
            )
          ) : (
            <>
              {src.by && `${text(src.by, lang)}: `}
              {takeText(src, lang)}
              {src.tail && (
                <>
                  {' · '}
                  {src.tailLabel === 'licence' && `${s.licenceWord} `}
                  <bdi dir="ltr">{src.tail}</bdi>
                </>
              )}
            </>
          )}
        </span>
      </span>
      {meta && <span className="sr-row-meta">{meta}</span>}
      <span className="sr-row-chev">
        <IconChevronEnd />
      </span>
    </button>
  )
}

export function Sources() {
  // The status carries the meaning translation of the reader's content language (reply 0033 §أ1, §أ3).
  const { lang, content } = useI18n()
  const s = SOURCES_UI[lang]
  const [status, setStatus] = useState<{ lang: string; value: SourcesStatus } | null>(null)
  const [open, setOpen] = useState<Source | null>(null)
  const [report, setReport] = useState(false)
  const live = status?.lang === content ? status.value : null

  useEffect(() => {
    let alive = true
    getSourcesStatus(content).then(
      (value) => alive && setStatus({ lang: content, value }),
      () => undefined, // offline or not yet migrated: the page stands on the registry alone
    )
    return () => {
      alive = false
    }
  }, [content])

  return (
    <Screen title={s.title}>
      <p className="sr-intro">{s.intro}</p>
      {GROUPS.map((g) => (
        <section key={g.id} className="sr-group" aria-labelledby={`sr-g-${g.id}`}>
          <div className="sr-group-h">
            <span aria-hidden="true">
              <GroupIconOf icon={g.icon} />
            </span>
            <h2 id={`sr-g-${g.id}`}>{text(g.name, lang)}</h2>
          </div>
          <div className="sr-card sr-list">
            {SOURCES.filter((x) => x.group === g.id).map((src) => (
              <Row key={src.id} src={src} onOpen={setOpen} status={live} />
            ))}
          </div>
        </section>
      ))}

      <section className="sr-card sr-follow" aria-labelledby="sr-follow-h">
        <span className="sr-follow-icon" aria-hidden="true">
          <IconSync />
        </span>
        <div>
          <h2 id="sr-follow-h">{s.followTitle}</h2>
          <p>
            {s.followBody}
            {live?.checked_at && (
              <>
                {' '}
                <span className="sr-checked">{fmt(s.lastCheck, { date: dateText(live.checked_at, lang) })}</span>
              </>
            )}
          </p>
        </div>
      </section>

      <section className="sr-card sr-err" aria-labelledby="sr-err-h">
        <h2 id="sr-err-h">{s.errTitle}</h2>
        <p>{s.errBody}</p>
        <button type="button" className="sr-btn sr-btn-primary" aria-haspopup="dialog" onClick={() => setReport(true)}>
          <IconFlag />
          {s.report}
        </button>
      </section>

      <p className="sr-dua">
        <span aria-hidden="true">
          <IconHeart />
        </span>
        <span>{s.dua}</span>
      </p>

      <SourceInfoSheet source={open} onClose={() => setOpen(null)} status={live} />
      <ReportErrorSheet open={report} onClose={() => setReport(false)} />
    </Screen>
  )
}

// The sheet behind each row of «المصادر والشكر» (reply 0033 §أ3): who prepared it, who published it, what we take, how
// it reached us, its version (QuranEnc and al-Mukhtasar: the reader's language translation, from D1), the fetch date,
// the last monthly check, the terms or licence with their link, and «افتح في موقعه». Only documented rows are shown;
// every outside link opens without a Referer.
import type { ReactNode } from 'react'
import type { Lang, SourcesStatus } from '../../../../shared/api'
import { useI18n } from '../../i18n'
import { fmt } from '../../quran/format'
import { IconExternalV2 } from '../answer/icons'
import { V2Sheet } from '../answer/SourceSheets'
import { GroupIconOf } from './icons'
import { dateText, GROUPS, isProper, langName, takeText, text, type Source } from './registry'
import { SOURCES_UI, type SourcesStrings } from './strings'

/** An outside link: a new tab, no opener, no Referer. */
export function OutLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
      {children}
    </a>
  )
}

/** «{l}: {v}» (a language, then its value) with the value kept in its own direction. */
function LangValue({ tpl, code, value, lang }: { tpl: string; code: string; value: ReactNode; lang: Lang }) {
  const [before, after = ''] = tpl.split('{v}')
  return (
    <>
      {fmt(before, { l: langName(code, lang) })}
      {value}
      {after}
    </>
  )
}

const ltr = (v: string) => (
  <bdi dir="ltr" className="sr-ver">
    {v}
  </bdi>
)

/** The version row's content, or null when the source has none to show. */
function versionOf(src: Source, lang: Lang, s: SourcesStrings, status: SourcesStatus | null): ReactNode {
  if (src.version) return ltr(src.version)
  if (src.versions) {
    const mine = src.versions[lang]
    const ar = src.versions.ar
    return (
      <>
        {mine && <span className="sr-line">{lang === 'ar' ? ltr(mine) : <LangValue tpl={s.langValue} code={lang} value={ltr(mine)} lang={lang} />}</span>}
        {lang !== 'ar' && ar && (
          <span className="sr-line">
            <LangValue tpl={s.langValue} code="ar" value={ltr(ar)} lang={lang} />
          </span>
        )}
      </>
    )
  }
  if (src.versionFrom) {
    const mine = src.versionFrom === 'meanings' ? status?.meaning : status?.mukhtasar
    const pending = status?.pending.filter((p) => p.source === src.id) ?? []
    const minePending = mine ? pending.find((p) => p.key === mine.key) : undefined
    return (
      <>
        {mine?.version ? (
          <span className="sr-line">
            <LangValue tpl={s.langValue} code={lang} value={ltr(mine.version)} lang={lang} />
          </span>
        ) : (
          <span className="sr-line">{src.versionFrom === 'meanings' ? s.versionEach : s.versionEachTafsir}</span>
        )}
        {minePending?.theirs ? (
          <span className="sr-line sr-pending-line">{fmt(s.pendingVersion, { v: minePending.theirs })}</span>
        ) : pending.length > 0 ? (
          <span className="sr-line sr-pending-line">{s.pendingSome}</span>
        ) : null}
      </>
    )
  }
  return null
}

export function SourceInfoSheet({ source, onClose, status }: { source: Source | null; onClose: () => void; status: SourcesStatus | null }) {
  const { lang, content } = useI18n()
  const s = SOURCES_UI[lang]
  const group = source ? GROUPS.find((g) => g.id === source.group) : undefined
  const rows: [string, ReactNode][] = []
  if (source) {
    const prop = (v: Source['prepared']) => (isProper(v) ? <bdi dir="ltr">{text(v, lang)}</bdi> : text(v, lang))
    if (source.versionFrom === 'meanings' && status?.meaning) {
      rows.push([s.rowPrepared, <LangValue key="p" tpl={s.langValue} code={content} value={<bdi dir="auto">{status.meaning.translator}</bdi>} lang={lang} />])
    } else if (source.prepared) rows.push([s.rowPrepared, prop(source.prepared)])
    if (source.published) rows.push([s.rowPublished, prop(source.published)])
    rows.push([s.rowTake, takeText(source, lang)])
    if (source.via)
      rows.push([
        s.rowVia,
        <bdi key="via" dir="ltr">
          {source.via}
        </bdi>,
      ])
    const version = versionOf(source, lang, s, status)
    if (version) rows.push([s.rowVersion, version])
    if (source.fetched?.length) rows.push([s.rowFetched, source.fetched.map((d) => dateText(d, lang)).join(' · ')])
    else if (source.fetchedNote) rows.push([s.rowFetched, text(source.fetchedNote, lang)])
    if (source.check && status?.checked_at) rows.push([s.rowChecked, dateText(status.checked_at, lang)])
    if (source.licence)
      rows.push([
        s.rowLicence,
        <>
          <bdi dir="ltr">{source.licence.name}</bdi>
          <OutLink className="sr-inline-link" href={source.licence.url}>
            {s.licenceLink}
          </OutLink>
        </>,
      ])
    else if (source.terms)
      rows.push([
        source.termsLabel === 'licence' ? s.rowLicence : s.rowTerms,
        <>
          {text(source.terms, lang)}
          {source.termsUrl && (
            <OutLink className="sr-inline-link" href={source.termsUrl}>
              {source.termsLabel === 'licence' ? s.licenceLink : s.termsLink}
            </OutLink>
          )}
        </>,
      ])
  }
  return (
    <V2Sheet open={!!source} onClose={onClose} title={s.sheetTitle}>
      {source && (
        <>
          <div className="v2-src-head">
            <span className="v2-src-badge">{group && <GroupIconOf icon={group.icon} />}</span>
            <div>
              <div className="v2-src-name">{isProper(source.name) ? <bdi dir="ltr">{text(source.name, lang)}</bdi> : text(source.name, lang)}</div>
              {group && <div className="v2-src-sub">{text(group.name, lang)}</div>}
            </div>
          </div>
          <dl className="sr-facts">
            {rows.map(([label, value], i) => (
              <div key={i} className="v2-src-row">
                <dt className="v2-src-label">{label}</dt>
                <dd className="v2-src-value">{value}</dd>
              </div>
            ))}
          </dl>
          {source.site && (
            <OutLink className="v2-src-open" href={source.site}>
              {s.openSite}
              <IconExternalV2 size={17} />
            </OutLink>
          )}
        </>
      )}
    </V2Sheet>
  )
}

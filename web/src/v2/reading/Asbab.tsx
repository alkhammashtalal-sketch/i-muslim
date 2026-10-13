import { useEffect, useId, useState } from 'react'
import { asbabFold, asbabIds } from '../../../../shared/asbab'
import { useI18n } from '../../i18n'
import { fmt, numFmt } from '../../quran/format'
import { hadithPath, navigate } from '../../quran/route'
import { IconOpenBook } from '../answer/icons'
import { getAsbab, type HadithPair } from '../hadith/api'
import { GradeBadge } from '../hadith/GradeBadge'
import type { ReportLoc } from '../sources/place'
import { SourceLine, useReadingStrings } from './ui'

const RTL = new Set(['ar', 'ur'])

/** One hadith of the section: its whole text in the gold frame as HadeethEnc stores it (the Arabic always, CLAUDE.md
 *  §4, and the content language's text under it when the encyclopedia has that translation), the grade in its own
 *  words and the takhrij, «شرح الحديث وفوائده» to the hadith page, and the source line with its number. Nothing is
 *  added before the text: a mawquf report is never introduced as the Prophet's saying. */
function AsbabHadith({ pair }: { pair: HadithPair }) {
  const { lang, content } = useI18n()
  const r = useReadingStrings()
  const num = numFmt(lang)
  const { ar, tr } = pair
  const shown = tr ?? ar
  const loc: ReportLoc = {
    type: 'hadith',
    id: ar.id,
    lang: content,
    source: 'hadeethenc',
    ...(shown.version ? { version: shown.version } : {}),
    byKind: { text: { source: 'hadeethenc', ...(ar.version ? { version: ar.version } : {}) } },
  }
  return (
    <div className="rd-asbab-item">
      <div className="rd-asbab-frame">
        <p className="rd-asbab-text" lang="ar" dir="rtl" data-hadith={ar.id}>
          {ar.text}
        </p>
        {tr && (
          <p className="rd-asbab-tr" lang={tr.lang} dir={RTL.has(tr.lang) ? 'rtl' : 'ltr'}>
            {tr.text}
          </p>
        )}
      </div>
      <div className="rd-asbab-grade">
        <GradeBadge h={ar} alt={tr?.grade ?? null} />
        {ar.attribution && (
          <span className="rd-asbab-attr">
            <span lang="ar" dir="rtl">
              {ar.attribution}
            </span>
            {tr?.attribution && tr.attribution !== ar.attribution && (
              <span lang={tr.lang} dir={RTL.has(tr.lang) ? 'rtl' : 'ltr'}>
                {' · '}
                {tr.attribution}
              </span>
            )}
          </span>
        )}
      </div>
      <div className="rd-asbab-open">
        <a className="rd-asbab-btn" href={hadithPath(ar.id)} onClick={(e) => (e.preventDefault(), navigate(hadithPath(ar.id)))}>
          <IconOpenBook size={19} />
          {r.asbabExplain}
        </a>
      </div>
      <SourceLine k="hadeethenc" name={r.asbabSourceName} via={`${r.asbabChapter} · ${fmt(r.asbabHadithN, { n: num(Number(ar.id)) })}`} url={shown.url} loc={loc} end />
    </div>
  )
}

/** «سبب النزول» after the tafsir in the ayah panel (reply 0036 §أ; boards AsbabAyah, AsbabAyahN). Shown only for an
 *  ayah that shared/asbab.ts lists (an accepted link or the coordinator's review, tiers 1–3, never mixed) and whose
 *  hadiths the Worker read from D1 by key; otherwise nothing at all, and an ayah not listed asks nothing. The first
 *  hadith shows; the others fold under «أحاديث أخرى في نزولها (n)». */
export function AsbabSection({ sura, aya }: { sura: number; aya: number }) {
  const { lang, content } = useI18n()
  const r = useReadingStrings()
  const num = numFmt(lang)
  const listed = asbabIds(sura, aya).length > 0
  const key = `${sura}:${aya}:${content}`
  const [res, setRes] = useState<{ key: string; items: HadithPair[] } | null>(null)
  const [openFor, setOpenFor] = useState<string | null>(null)
  const restId = useId()
  useEffect(() => {
    if (!listed) return
    let alive = true
    getAsbab(sura, aya, content).then(
      (items) => alive && setRes({ key, items }),
      () => alive && setRes({ key, items: [] }),
    )
    return () => {
      alive = false
    }
  }, [listed, sura, aya, content, key])
  const { first, folded: rest } = asbabFold(listed && res?.key === key ? res.items : [])
  if (!first) return null
  const open = openFor === key
  return (
    <section className="rd-section rd-asbab" aria-labelledby="ayp-asbab-h">
      <h3 className="rd-section-title" id="ayp-asbab-h">
        {r.asbabHeading}
      </h3>
      <p className="rd-asbab-intro">{r.asbabIntro}</p>
      <AsbabHadith pair={first} />
      {rest.length > 0 && (
        <>
          <button type="button" className="rd-asbab-more" aria-expanded={open} aria-controls={restId} onClick={() => setOpenFor((x) => (x === key ? null : key))}>
            <span>{fmt(r.asbabMore, { n: num(rest.length) })}</span>
            <svg className={`rd-asbab-chev${open ? ' is-open' : ''}`} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          <div id={restId} className="rd-asbab-rest" hidden={!open}>
            {open && rest.map((p) => <AsbabHadith key={p.ar.id} pair={p} />)}
          </div>
        </>
      )}
    </section>
  )
}

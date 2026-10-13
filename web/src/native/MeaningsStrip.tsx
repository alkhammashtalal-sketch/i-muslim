// The content language's meanings being saved on the device, in the iOS/Android app (reply 0037 §3.6): one quiet line
// above the bottom bar while it happens, with the language, the download's size and a progress bar, and no other
// figure (CLAUDE.md §11: no counters, slow and little motion). When it is done, or cut short by the connection, it says
// so for a few seconds and goes. A download larger than 20 MB (none today: the largest is under 7 MB) asks first, with
// «Save» and «Not now»; «Not now» holds until the app is opened again. Mounted by NativeDevice, inside the app only.
import { useEffect, useState } from 'react'
import { numberLocale, useI18n } from '../i18n'
import { nativeName } from '../v2/lang/served'
import type { Offline, MeaningsStatus } from './offline'
import { sizeLabel } from './offline-data'
import './meanings-strip.css'

/** How long «saved» and «the rest later» stay before the line goes. */
const SAY_MS = 3500
// «Not now» for this run of the app (asked again at the next launch, never at each return to it).
const notNow = new Set<string>()

export function MeaningsStrip({ offline, content }: { offline: Offline; content: string }) {
  const { t, lang } = useI18n()
  // The offline layer keeps each language's last state; a new one for the content language re-renders the line.
  const [, setSeen] = useState<MeaningsStatus | null>(null)
  const [gone, setGone] = useState(false)
  useEffect(
    () =>
      offline.onMeanings((s) => {
        if (s.lang !== content) return
        setSeen(s)
        setGone(false)
      }),
    [offline, content],
  )
  const st = offline.meaningsStatus(content)

  // «Saved» and «the rest later» are said once, then the line goes.
  useEffect(() => {
    if (st?.state !== 'done' && st?.state !== 'partial') return
    const id = setTimeout(() => setGone(true), SAY_MS)
    return () => clearTimeout(id)
  }, [st])

  if (!st || gone || (st.state === 'ask' && notNow.has(st.lang))) return null
  const size = st.bytes ? sizeLabel(st.bytes, numberLocale(lang)) : null
  const text = { ask: t.meaningsAsk, saving: t.meaningsSaving, done: t.meaningsSaved, partial: t.meaningsLater }[st.state]
  const pct = Math.round((100 * st.saved) / st.total)

  return (
    <section className="ml-strip" role={st.state === 'ask' ? 'region' : 'status'} aria-label={st.state === 'ask' ? text : undefined}>
      <p className="ml-strip-text">{text}</p>
      <p className="ml-strip-meta">
        <bdi lang={st.lang}>{nativeName(st.lang)}</bdi>
        {size && (
          <>
            {' · '}
            <bdi>{size}</bdi>
          </>
        )}
      </p>
      {st.state === 'ask' ? (
        <div className="ml-strip-actions">
          <button type="button" className="ml-strip-btn is-primary" onClick={() => void offline.ensureMeanings(st.lang, { approved: true })}>
            {t.meaningsSaveNow}
          </button>
          <button
            type="button"
            className="ml-strip-btn"
            onClick={() => {
              notNow.add(st.lang)
              setGone(true)
            }}
          >
            {t.meaningsNotNow}
          </button>
        </div>
      ) : (
        st.state === 'saving' && (
          <div className="ml-strip-bar" role="progressbar" aria-label={t.meaningsProgress} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <span style={{ inlineSize: `${pct}%` }} />
          </div>
        )
      )}
    </section>
  )
}

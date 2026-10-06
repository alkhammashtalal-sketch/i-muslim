import { useEffect } from 'react'
import { useI18n } from '../i18n'
import { fmt, numFmt } from './format'
import {
  SHOW_RECITER_NAME,
  hasRecitation,
  parseAyahId,
  pause,
  play,
  prime,
  recitationSite,
  reciterName,
  resume,
  stop,
  useOnline,
  useRecitation,
  type RecitationState,
} from './recitation'
import { RECITATION } from './recitation-strings'

const IconPlay = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M7 4.5v15l12.5-7.5z" fill="currentColor" />
  </svg>
)
const IconPause = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z" fill="currentColor" />
  </svg>
)
const IconStop = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="5" y="5" width="14" height="14" rx="1.5" fill="currentColor" />
  </svg>
)

type R = { sura: number; from: number; to: number }

/** This player's share of the shared state: idle unless the recitation on is exactly its range. */
function useMine({ sura, from, to }: R) {
  const s: RecitationState = useRecitation()
  const online = useOnline()
  const status = s.status === 'idle' || s.sura !== sura || s.from !== from || s.to !== to ? 'idle' : s.status
  const on = status === 'loading' || status === 'playing' || status === 'paused'
  return { s, status, on, online, offline: !online && !on }
}

const noteId = ({ sura, from, to }: R) => `listen-note-${sura}-${from}-${to}`

/** The buttons. The first keeps its place (and the keyboard focus) as it turns from listen to pause to resume; stop
 *  appears beside it while a recitation is on. */
function Buttons({ r, label, name }: { r: R; label: string; name?: string }) {
  const { lang } = useI18n()
  const t = RECITATION[lang]
  const { status, on, online, offline } = useMine(r)

  // Our own timing file only (same origin): a press can then start the audio at once.
  useEffect(() => {
    if (online) prime(r.sura).catch(() => undefined)
  }, [online, r.sura])

  const playingish = status === 'playing' || status === 'loading'
  const main = () => {
    if (playingish) pause()
    else if (status === 'paused') resume()
    else play(r.sura, r.from, r.to)
  }
  return (
    <div className="listen-buttons">
      <button
        type="button"
        className="btn listen-main"
        onClick={main}
        disabled={offline}
        aria-describedby={offline || status === 'error' ? noteId(r) : undefined}
        aria-busy={status === 'loading'}
        aria-label={name && !on ? name : undefined}
      >
        {playingish ? <IconPause /> : <IconPlay />}
        {playingish ? t.pause : status === 'paused' ? t.resume : label}
      </button>
      {on && (
        <button type="button" className="btn listen-stop" onClick={stop}>
          <IconStop />
          {t.stop}
        </button>
      )}
    </div>
  )
}

/** The attribution near the player, and the offline or failure line. */
function Notes({ r, credit, className = '' }: { r: R; credit: 'always' | 'active'; className?: string }) {
  const { lang } = useI18n()
  const t = RECITATION[lang]
  const { status, on, offline } = useMine(r)
  const name = lang === 'ar' ? reciterName.ar : reciterName.en
  if (!offline && status !== 'error' && credit === 'active' && !on) return null
  return (
    <div className={`listen-notes ${className}`.trim()}>
      {(offline || status === 'error') && (
        <p className="small listen-note" id={noteId(r)} role="status">
          {offline ? t.offline : t.failed}
        </p>
      )}
      {(credit === 'always' || on) && (
        <p className="listen-credit">
          <a className="text-link" href={recitationSite} target="_blank" rel="noopener noreferrer">
            {SHOW_RECITER_NAME && name ? fmt(t.creditNamed, { name }) : t.credit}
          </a>
        </p>
      )}
    </div>
  )
}

/** «استمع» at the head of a sura page: from its first ayah to its last. */
export function ListenBar({ sura, ayat }: { sura: number; ayat: number }) {
  const { lang } = useI18n()
  const s = useRecitation()
  const t = RECITATION[lang]
  if (!hasRecitation(sura) || !ayat) return null
  const r = { sura, from: 1, to: ayat }
  const now = (s.status === 'playing' || s.status === 'paused') && s.sura === sura && s.from === 1 && s.to === ayat ? s.aya : 0
  return (
    <div className="listen listen-bar">
      <Buttons r={r} label={t.listen} />
      {now > 0 && (
        <p className="small listen-now" aria-hidden="true">
          {fmt(t.nowAyah, { n: numFmt(lang)(now) })}
        </p>
      )}
      <Notes r={r} credit="always" />
    </div>
  )
}

/** «استمع للآية» on an ayah frame, at its foot facing the cartouche (the ayah sheet, the answer card, the featured
 *  ayah). The notes go under the frame, never over the ayah. */
export function ListenAyah({ id, short }: { id: string; short?: boolean }) {
  const { lang } = useI18n()
  const a = parseAyahId(id)
  if (!a || !hasRecitation(a.sura)) return null
  const t = RECITATION[lang]
  return (
    <div className="frame-listen">
      <Buttons r={{ sura: a.sura, from: a.aya, to: a.aya }} label={short ? t.listen : t.listenAyah} name={short ? t.listenAyah : undefined} />
    </div>
  )
}

export function ListenAyahNotes({ id }: { id: string }) {
  const a = parseAyahId(id)
  if (!a || !hasRecitation(a.sura)) return null
  return <Notes r={{ sura: a.sura, from: a.aya, to: a.aya }} credit="active" className="frame-listen-notes" />
}

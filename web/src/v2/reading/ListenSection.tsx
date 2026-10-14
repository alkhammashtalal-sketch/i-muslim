import { useEffect } from 'react'
import { useI18n } from '../../i18n'
import { hasRecitation, pause, play, playableOffline, prime, recitationSite, reciterLabel, resume, stop, useOnline, useRecitation, useReciter } from '../../quran/recitation'
import { RECITATION } from '../../quran/recitation-strings'
import { useDownloads } from '../../quran/downloads'
import { RecitationCredit } from '../../quran/Listen'
import { IcPause, IcPlay, IcStop } from './icons'
import { RIWAYA } from './meta'
import { ReciterAvatar } from './ReciterAvatar'
import { SourceLine, useReadingStrings } from './ui'

/** «Listen to the ayah» on the ayah page (board AyahAfter): the chosen reciter's recorded voice from mp3quran, his
 *  photo or initial (reply 0047 §1), name and riwaya, play/pause and stop, and the source line. Nothing is asked of
 *  mp3quran before the press. */
export function ListenSection({ sura, aya }: { sura: number; aya: number }) {
  const { lang } = useI18n()
  const r = useReadingStrings()
  const t = RECITATION[lang]
  const reciter = useReciter()
  const s = useRecitation()
  const online = useOnline()
  useDownloads()
  // A downloaded sura plays with no connection (reply 0056 أ).
  const here = playableOffline(sura)
  useEffect(() => {
    if ((online || here) && hasRecitation(sura)) prime(sura).catch(() => undefined)
  }, [online, here, sura, reciter.read])
  if (!hasRecitation(sura)) return null
  const mine = s.status !== 'idle' && s.sura === sura && s.from === aya && s.to === aya
  const status = mine ? s.status : 'idle'
  const playing = status === 'playing' || status === 'loading'
  const on = playing || status === 'paused'
  const name = reciterLabel(reciter, lang)
  const main = () => {
    if (playing) pause()
    else if (status === 'paused') resume()
    else play(sura, aya, aya)
  }
  return (
    <section className="rd-section" aria-labelledby="ayp-audio-h">
      <h3 className="rd-section-title" id="ayp-audio-h">
        {r.listenHeading}
      </h3>
      <div className="rd-listen">
        <ReciterAvatar reciter={reciter} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.96875rem', fontWeight: 500, lineHeight: 1.4 }}>{name}</div>
          {RIWAYA[reciter.read] && (
            <div className="rd-row-sub" lang="ar">
              {RIWAYA[reciter.read]}
            </div>
          )}
        </div>
        {on && (
          <button type="button" className="rd-icon-btn listen-stop" onClick={stop} aria-label={t.stop}>
            <IcStop />
          </button>
        )}
        <button
          type="button"
          className="rd-play listen-main"
          onClick={main}
          disabled={!online && !on && !here}
          aria-busy={status === 'loading'}
          aria-label={playing ? t.pause : status === 'paused' ? t.resume : t.listenAyah}
        >
          {playing ? <IcPause /> : <IcPlay />}
        </button>
      </div>
      {on && (
        <p className="listen-credit small">
          <RecitationCredit />
        </p>
      )}
      {((!online && !here) || status === 'error') && (
        <p className="small listen-note" role="status">
          {!online && !here ? t.offline : t.failed}
        </p>
      )}
      <SourceLine k="mp3quran" name="mp3quran.net" via={r.srcMp3} url={recitationSite} />
    </section>
  )
}

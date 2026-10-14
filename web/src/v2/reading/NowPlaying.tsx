import { useState, type ReactNode } from 'react'
import { Sheet } from '../../components/Sheet'
import { Cartouche, Mkp } from '../../components/Ornaments'
import { langMeta, useI18n } from '../../i18n'
import { AyahEnd } from '../../quran/AyahEnd'
import { arabicDigits, fmt, numFmt } from '../../quran/format'
import { RecitationCredit } from '../../quran/Listen'
import {
  RATES,
  RECITERS,
  SLEEP_MINUTES,
  pause,
  play,
  reciterLabel,
  resume,
  setAfterSura,
  setRate,
  setReciter,
  setSleep,
  stepAyah,
  useOnline,
  usePlayerOptions,
  useRecitation,
  useReciter,
  type Rate,
} from '../../quran/recitation'
import { RECITATION } from '../../quran/recitation-strings'
import { IcBook, IcPause, IcPlay, IcRepeat } from './icons'
import { RIWAYA, STYLE } from './meta'
import { PLAYER, timesText } from './player-strings'
import { ReciterAvatar } from './ReciterAvatar'
import { RepeatSheet } from './RepeatSheet'
import { useRepeat } from './repeat'
import './player.css'

type Ayah = { aya: number; text: string }
type Props = { open: boolean; onClose: () => void; sura: number; suraName: string; ayat: Ayah[]; onOpenAyah: (aya: number) => void }

const P = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, focusable: false } as const
// Filled, as on the board: a bar and a triangle.
const IcPrev = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="5.5" y="5.5" width="2.2" height="13" rx="1" fill="currentColor" />
    <path d="M18.5 6.2v11.6a.8.8 0 0 1-1.2.7L9 12.7a.8.8 0 0 1 0-1.4l8.3-5.8a.8.8 0 0 1 1.2.7Z" fill="currentColor" />
  </svg>
)
const IcNext = () => (
  <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect x="16.3" y="5.5" width="2.2" height="13" rx="1" fill="currentColor" />
    <path d="M5.5 6.2v11.6a.8.8 0 0 0 1.2.7l8.3-5.8a.8.8 0 0 0 0-1.4L6.7 5.5a.8.8 0 0 0-1.2.7Z" fill="currentColor" />
  </svg>
)
const IcSpeed = () => (
  <svg {...P} width={18} height={18}>
    <path d="M4.5 16a8 8 0 1 1 15 0" />
    <path d="m12 13 3.5-4.5" />
  </svg>
)
// A list with the next item playing.
const IcAfter = () => (
  <svg {...P} width={18} height={18}>
    <path d="M4 7h12M4 12h12M4 17h7" />
    <path d="M15 15v5l4-2.5Z" fill="currentColor" />
  </svg>
)
const IcTimer = () => (
  <svg {...P} width={18} height={18}>
    <circle cx="12" cy="13" r="7.5" />
    <path d="M12 9.5V13l2.5 1.5M9.5 3h5" />
  </svg>
)

/** The reciters to choose from without leaving the sura (leaving it would end its recitation): a recitation on goes on
 *  from the same ayah in the new voice (setReciter). */
export function ReciterPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useI18n()
  const p = PLAYER[lang]
  const chosen = useReciter()
  return (
    <Sheet open={open} onClose={onClose} title={p.pickReciter}>
      <div className="np-picker" role="list">
        {RECITERS.map((x) => (
          <button
            key={x.read}
            type="button"
            role="listitem"
            className="np-pick"
            aria-pressed={x.read === chosen.read}
            onClick={() => {
              setReciter(x.read)
              onClose()
            }}
          >
            <ReciterAvatar reciter={x} small />
            <span className="np-pick-text">
              <span className="np-pick-name">{reciterLabel(x, lang)}</span>
              {RIWAYA[x.read] && (
                <span className="np-sub" lang="ar">
                  {RIWAYA[x.read]}
                </span>
              )}
            </span>
            <span className="np-pick-check" aria-hidden="true">
              {x.read === chosen.read ? '✓' : ''}
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}

/** One option of the player (board RepeatAfter): its icon, its name, its value; a press moves to the next value. */
function Tile({ icon, label, value, onPress, strong = false, testId }: { icon: ReactNode; label: string; value: string; onPress: () => void; strong?: boolean; testId: string }) {
  const { lang } = useI18n()
  return (
    <button type="button" className="np-tile" onClick={onPress} data-testid={testId} aria-label={`${label}: ${value}. ${PLAYER[lang].tapToChange}`}>
      <span className={`np-tile-icon${strong ? ' is-strong' : ''}`} aria-hidden="true">
        {icon}
      </span>
      <span className="np-tile-text" aria-hidden="true">
        <span className="np-tile-label">{label}</span>
        <span className="np-tile-value">{value}</span>
      </span>
    </button>
  )
}

const next = <T,>(list: readonly T[], v: T) => list[(list.indexOf(v) + 1) % list.length]

/** «تُتلى الآن» (reply 0047 §4, board RepeatAfter): the reciter and «تغيير القارئ», the sura, the ayah being recited
 *  and the next one (a press opens its tafsir), «الآية ٥ من ٨» over a bar of the range, the previous and next ayah,
 *  and the options: the memorising repeat, the speed, what follows the sura, the sleep timer. The ayat are the sura
 *  page's own, as stored. */
export function NowPlaying({ open, onClose, sura, suraName, ayat, onOpenAyah }: Props) {
  const { lang } = useI18n()
  const p = PLAYER[lang]
  const t = RECITATION[lang]
  const num = numFmt(lang)
  const reciter = useReciter()
  const rec = useRecitation()
  const opts = usePlayerOptions()
  const rep = useRepeat()
  const online = useOnline()
  const [picker, setPicker] = useState(false)
  const [repeat, setRepeat] = useState(false)

  const mine = rec.status !== 'idle' && rec.status !== 'error' && rec.sura === sura
  const from = mine ? rec.from : 1
  const to = mine ? rec.to : ayat.length
  const current = mine ? rec.aya : from
  const playing = mine && (rec.status === 'playing' || rec.status === 'loading')
  const total = to - from + 1
  const index = current - from + 1
  const now = ayat.find((a) => a.aya === current)
  const after = current < to ? ayat.find((a) => a.aya === current + 1) : undefined
  const style = STYLE[reciter.read]

  const main = () => {
    if (playing) pause()
    else if (mine && rec.status === 'paused') resume()
    else play(sura, 1, ayat.length)
  }
  const rateText = (r: Rate) => (r === 1 ? p.speedNormal : fmt(p.speedValue, { n: num(r) }))
  const repeatText = rep.active && rep.sura === sura ? (rep.total === null ? p.repeatEndless : timesText(rep.total, lang, num)) : p.repeatOff

  return (
    <Sheet open={open} onClose={onClose} title={mine ? p.nowPlaying : p.title}>
      <div className="np" data-testid="now-playing">
        <ReciterAvatar reciter={reciter} large />
        <div className="np-who">
          <div className="np-name">{reciterLabel(reciter, lang)}</div>
          <div className="np-sub">
            {RIWAYA[reciter.read] && <span lang="ar">{RIWAYA[reciter.read]}</span>}
            {style && (
              <>
                {' · '}
                <span lang="ar">{style}</span>
              </>
            )}
            {' · '}
            <button type="button" className="np-link" onClick={() => setPicker(true)} aria-haspopup="dialog">
              {p.changeReciter}
            </button>
          </div>
        </div>
        <Cartouche>
          <span lang="ar">سورة {suraName}</span>
        </Cartouche>
        {now && (
          <button
            type="button"
            className="np-ayah"
            lang="ar"
            dir="rtl"
            onClick={() => {
              onClose()
              onOpenAyah(now.aya)
            }}
          >
            <AyahEnd text={now.text}>
              <Mkp n={arabicDigits(now.aya)} size={30} />
            </AyahEnd>
          </button>
        )}
        {after && (
          <p className="np-ayah-next" lang="ar" dir="rtl" aria-hidden="true">
            <AyahEnd text={after.text}>
              <Mkp n={arabicDigits(after.aya)} size={22} />
            </AyahEnd>
          </p>
        )}
        <p className="np-hint">
          <IcBook size={15} />
          {p.tapForTafsir}
        </p>
        <div className="np-progress">
          {total <= 30 ? (
            // Filled from the start of the line in the interface's direction (board RepeatAfter: rtl in Arabic).
            <div className="np-segs" dir={langMeta(lang).dir} aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <span key={i} className={`np-seg${i < index ? ' is-done' : ''}${i === index - 1 ? ' is-now' : ''}`} />
              ))}
            </div>
          ) : (
            <div className="np-bar" aria-hidden="true">
              <span style={{ width: `${(index / total) * 100}%` }} />
            </div>
          )}
          <div className="np-progress-text">
            <span data-testid="np-ayah-of">{fmt(p.ayahOf, { n: num(index), m: num(total) })}</span>
            <span>{p.litWith}</span>
          </div>
        </div>
        <div className="np-controls" dir="ltr">
          <button type="button" className="np-step" onClick={() => stepAyah(-1)} disabled={!mine || current <= from} aria-label={p.prevAyah}>
            <IcPrev />
          </button>
          <button
            type="button"
            className="np-main"
            onClick={main}
            disabled={!online && !mine}
            aria-busy={mine && rec.status === 'loading'}
            aria-label={playing ? t.pause : mine && rec.status === 'paused' ? t.resume : t.listen}
          >
            {playing ? <IcPause size={26} /> : <IcPlay size={26} />}
          </button>
          <button type="button" className="np-step" onClick={() => stepAyah(1)} disabled={!mine || current >= to} aria-label={p.nextAyah}>
            <IcNext />
          </button>
        </div>
        <div className="np-tiles">
          <Tile testId="np-repeat" strong icon={<IcRepeat size={18} />} label={p.repeat} value={repeatText} onPress={() => setRepeat(true)} />
          <Tile testId="np-speed" icon={<IcSpeed />} label={p.speed} value={rateText(opts.rate)} onPress={() => setRate(next(RATES, opts.rate))} />
          <Tile testId="np-after" icon={<IcAfter />} label={p.after} value={opts.after === 'next' ? p.afterNext : p.afterStop} onPress={() => setAfterSura(opts.after === 'next' ? 'stop' : 'next')} />
          <Tile
            testId="np-sleep"
            icon={<IcTimer />}
            label={p.sleep}
            value={opts.sleep ? fmt(p.sleepMin, { n: num(opts.sleep) }) : p.sleepOff}
            onPress={() => setSleep(next(SLEEP_MINUTES, opts.sleep))}
          />
        </div>
        <p className="np-credit">
          <RecitationCredit />
        </p>
      </div>
      <ReciterPicker open={picker} onClose={() => setPicker(false)} />
      <RepeatSheet open={repeat} onClose={() => setRepeat(false)} sura={sura} aya={current} suraName={suraName} suraAyat={ayat.length} />
    </Sheet>
  )
}

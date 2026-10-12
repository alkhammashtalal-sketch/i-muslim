import { useEffect, useId, useRef, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { useI18n } from '../../i18n'
import { arabicDigits, fmt, numFmt } from '../../quran/format'
import { hasRecitation, useRecitation } from '../../quran/recitation'
import { IcRepeat, IcStop } from './icons'
import { startRepeat, stopRepeat, useRepeat } from './repeat'
import { Chips, Tabs, useReadingStrings } from './ui'

type Props = { open: boolean; onClose: () => void; sura: number; aya: number; suraName: string; suraAyat: number }

/** Repeat to memorise (reply 0032 C-4, board RepeatAfter): this ayah or a range of this sura, a count (or, holding
 *  «+», without end) and a pause between rounds; in the chosen reciter's own voice from the existing timings. */
export function RepeatSheet({ open, onClose, sura, aya, suraName, suraAyat }: Props) {
  const { lang } = useI18n()
  const r = useReadingStrings()
  const num = lang === 'ar' ? arabicDigits : numFmt(lang)
  const [scope, setScope] = useState<'one' | 'range'>('one')
  const [from, setFrom] = useState(aya)
  const [to, setTo] = useState(Math.min(aya + 3, suraAyat))
  const [count, setCount] = useState<number | null>(3)
  const [pauseMs, setPauseMs] = useState(2000)
  const rep = useRepeat()
  const rec = useRecitation()
  const hold = useRef(0)
  const fromId = useId()
  const toId = useId()

  useEffect(() => {
    if (!open) return
    setFrom(aya)
    setTo(Math.min(aya + 3, suraAyat))
  }, [open, aya, suraAyat])
  // Another «stop» (a player elsewhere) ends the repeat as well.
  useEffect(() => {
    if (rep.active && !rep.waiting && rec.status === 'idle') stopRepeat()
  }, [rep, rec.status])

  const mine = rep.active && rep.sura === sura
  const range = scope === 'one' ? { from: aya, to: aya } : { from: Math.min(from, to), to: Math.max(from, to) }
  const ayahOptions = Array.from({ length: suraAyat }, (_, i) => i + 1)
  const can = hasRecitation(sura)

  return (
    <Sheet open={open} onClose={onClose} title={r.repeatTitle}>
      <p className="rd-intro">{r.repeatIntro}</p>
      {!can ? (
        <p className="rd-status" role="status">
          {r.repeatNoRecitation}
        </p>
      ) : (
        <>
          <Tabs
            value={scope}
            onChange={setScope}
            options={[
              { value: 'one', label: r.repeatOne },
              { value: 'range', label: r.repeatRange },
            ]}
          />
          {scope === 'range' && (
            <div className="rd-range">
              <label htmlFor={fromId}>
                {r.from}
                <select id={fromId} value={from} onChange={(e) => setFrom(Number(e.target.value))}>
                  {ayahOptions.map((a) => (
                    <option key={a} value={a}>
                      {suraName} · {num(a)}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor={toId}>
                {r.to}
                <select id={toId} value={to} onChange={(e) => setTo(Number(e.target.value))}>
                  {ayahOptions.map((a) => (
                    <option key={a} value={a}>
                      {suraName} · {num(a)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <div className="rd-block" style={{ marginTop: 8 }}>
            <div className="rd-stepper">
              <span>
                <span style={{ display: 'block', fontSize: '0.96875rem', fontWeight: 500 }}>{r.howMany}</span>
                <span className="rd-row-sub">{r.howManyHint}</span>
              </span>
              <button type="button" aria-label={r.less} onClick={() => setCount((c) => (c === null ? 9 : Math.max(1, c - 1)))}>
                −
              </button>
              <span className="rd-count" aria-live="polite">
                {count === null ? '∞' : num(count)}
                {count === null && <span className="sr-only">{r.endless}</span>}
              </span>
              <button
                type="button"
                aria-label={r.more}
                onClick={() => setCount((c) => (c === null ? null : Math.min(99, c + 1)))}
                onPointerDown={() => {
                  window.clearTimeout(hold.current)
                  hold.current = window.setTimeout(() => setCount(null), 650)
                }}
                onPointerUp={() => window.clearTimeout(hold.current)}
                onPointerLeave={() => window.clearTimeout(hold.current)}
                onContextMenu={(e) => e.preventDefault()}
              >
                +
              </button>
            </div>
          </div>
          <div className="rd-block">
            <p className="rd-block-title">{r.pauseBetween}</p>
            <Chips
              label={r.pauseBetween}
              value={pauseMs}
              onChange={setPauseMs}
              options={[
                { value: 0, label: r.noPause },
                { value: 2000, label: r.sec2 },
                { value: 5000, label: r.sec5 },
              ]}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            {mine ? (
              <button type="button" className="rd-primary" onClick={stopRepeat}>
                <IcStop />
                {r.repeatStop}
              </button>
            ) : (
              <button type="button" className="rd-primary" onClick={() => startRepeat(sura, range.from, range.to, count, pauseMs)}>
                <IcRepeat />
                {r.repeatStart}
              </button>
            )}
            {mine && (
              <p className="rd-status" role="status">
                {rep.total === null ? fmt(r.repeatRoundEndless, { n: num(rep.round) }) : fmt(r.repeatRound, { n: num(rep.round), total: num(rep.total) })}
              </p>
            )}
          </div>
        </>
      )}
    </Sheet>
  )
}

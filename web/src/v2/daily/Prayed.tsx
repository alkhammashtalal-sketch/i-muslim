// «صليت» in «أهدافي» (add-on 0071-add13 §5): the five prayers of the day, each marked by the user once prayed, and
// the number of days all five were marked. On the device only (web/src/daily/prayed.ts). Nothing is shown for a
// prayer not marked: no red, no streak, no reminder, no badge.
import { useEffect, useId, useMemo, useState } from 'react'
import { type Place } from '../../daily/location'
import { dayTimes } from '../../daily/prayer'
import { FIVE, fullDays, marksOn, prayedDay, setPrayed, type PrayedLog } from '../../daily/prayed'
import { useI18n } from '../../i18n'
import { fill, plural } from './format'
import { IcChecked, IcClose, IcUnchecked } from './icons'
import { usePlace } from './place'
import { loadPrayerPrefs } from './store'
import { TODAY } from './strings-today'

/** The log's day now: from Fajr to Fajr at the saved place, else the device's calendar day. */
function logDay(place: Place | null, now: Date): string {
  if (!place) return prayedDay(now)
  const prefs = loadPrayerPrefs()
  return prayedDay(now, place.timeZone, (ymd) => dayTimes(place, ymd, { method: prefs.method, asr: prefs.asr }).fajr)
}

/** A clock for the day's turn: every minute, and when the page is shown again. */
function useMinute() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setNow(new Date())
    const id = setInterval(tick, 60_000)
    const vis = () => document.visibilityState === 'visible' && tick()
    document.addEventListener('visibilitychange', vis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])
  return now
}

export function PrayedCard({ log, onChange, editing }: { log: PrayedLog; onChange: (l: PrayedLog) => void; editing: boolean }) {
  const { lang } = useI18n()
  const s = TODAY[lang]
  const id = useId()
  const [place] = usePlace()
  const now = useMinute()
  const day = useMemo(() => logDay(place, now), [place, now])
  const marks = marksOn(log, day)
  const n = fullDays(log)
  return (
    <section className="dt-card dt-prayed" aria-labelledby={id}>
      <div className="dt-prayed-head">
        <h2 id={id}>{s.prayedTitle}</h2>
        {editing && (
          <button type="button" className="dt-goal-tick" aria-label={fill(s.hideGoal, { g: s.prayedTitle })} onClick={() => onChange({ ...log, hidden: true })}>
            <IcClose />
          </button>
        )}
      </div>
      <div className="dt-prayed-five">
        {FIVE.map((p) => {
          const done = marks.includes(p)
          return (
            <button
              key={p}
              type="button"
              role="checkbox"
              aria-checked={done}
              className={`dt-prayed-tick${done ? ' is-done' : ''}`}
              aria-label={fill(s.prayedOne, { prayer: s.prayers[p] })}
              onClick={() => onChange(setPrayed(log, day, p, !done))}
            >
              {done ? <IcChecked /> : <IcUnchecked />}
              <span>{s.prayers[p]}</span>
            </button>
          )
        })}
      </div>
      <p className="dt-row-sub dt-prayed-count" aria-live="polite">
        {n ? plural(s.prayedDays, n, lang) : s.prayedNone}
      </p>
    </section>
  )
}

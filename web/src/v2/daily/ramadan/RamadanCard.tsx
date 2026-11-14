// «رمضان» on the home (add-on 0072-add34 §ب8): a card under «يومك» from 1 Sha'ban to the last day of Ramadan, by
// the Umm al-Qura calendar with the user's and the server's Hijri offset; before Sha'ban and after Ramadan, nothing.
// In Sha'ban: the days left; in Ramadan: the day of the month and, with a place, today's iftar. Opens /today/ramadan.
import { useMemo, type MouseEvent } from 'react'
import { useI18n } from '../../../i18n'
import { savedPlace } from '../../../daily/location'
import { dayTimes, ymdIn } from '../../../daily/prayer'
import { fill, num, timeOf } from '../format'
import { useHijriOffset } from '../hijri-offset'
import { IcCalendar, IcChevron } from '../icons'
import { useNow } from '../PrayerTimes'
import { openToday } from '../Screen'
import { loadPrayerPrefs, prayerOptions } from '../store'
import { TODAY } from '../strings-today'
import { daysText, RAMADAN_PATH } from './RamadanPage'
import { cardShown, ramadanState } from './ramadan-model'
import { RAMADAN } from './strings-ramadan'
import './ramadan.css'

export function RamadanCard() {
  const { lang } = useI18n()
  const R = RAMADAN[lang]
  const s = TODAY[lang]
  const offset = useHijriOffset()
  const now = useNow(60_000)
  const place = savedPlace()
  const tz = place?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const today = ymdIn(now, tz)
  const key = `${today.y}-${today.m}-${today.d}`
  const state = useMemo(() => ramadanState(today, offset), [key, offset]) // eslint-disable-line
  if (!cardShown(state) || !state) return null
  let line: string
  if (state.phase === 'shaban') line = fill(R.untilRamadan, { d: daysText(state.daysLeft ?? 0, lang) })
  else {
    line = fill(R.dayOf, { n: num(state.dayN ?? 1, lang) })
    if (place) line += ` · ${s.iftar} ${timeOf(dayTimes(place, today, { ...prayerOptions(loadPrayerPrefs(place)), ramadan: true }).maghrib, lang, place.timeZone)}`
  }
  const go = (e: MouseEvent) => {
    e.preventDefault()
    openToday(RAMADAN_PATH)
  }
  return (
    <a href={RAMADAN_PATH} className="dt-mawaqif rm-card" onClick={go} data-testid="home-ramadan" data-phase={state.phase} aria-label={fill(R.cardLabel, { line })}>
      <span className="dt-tool-ic is-blue" aria-hidden="true">
        <IcCalendar />
      </span>
      <span className="dt-mawaqif-text">
        <b>{fill(R.yearTitle, { y: num(state.ramadan.year, lang) })}</b>
        <span>{line}</span>
      </span>
      <IcChevron />
    </a>
  )
}

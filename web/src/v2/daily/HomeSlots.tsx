// The daily features' places on the home page (reply 0032 D-1, boards HomeToday and HomeTodayN): the next-prayer line
// above «اسأل» (tapping opens the prayer times; before a place is set it asks for the city), and the «يومك» grid of
// eight tools. The home page (part B) renders these two.
import { useMemo, useState, type MouseEvent, type ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { fill, duration, timeOf } from './format'
import { IcBook, IcCalendar, IcChevron, IcClock, IcMosque, IcQibla, IcStar, IcTarget, IcTasbih } from './icons'
import { usePlace, usePlaceName } from './place'
import { prayerState, useNow } from './PrayerTimes'
import { openToday } from './Screen'
import { loadPrayerPrefs } from './store'
import { TODAY } from './strings-today'
import { mawaqifShown } from './mawaqif/mawaqif-model'
import { SituationIcon } from './mawaqif/icons'
import { MAWAQIF } from './mawaqif/strings-mawaqif'
import './today.css'

/** The daily routes: these five here, and the other daily fork's (adhkar, tasbih, names, Mushaf page, word meanings). */
export const TODAY_PATHS = {
  times: '/today/times',
  qibla: '/today/qibla',
  adhkar: '/today/adhkar',
  tasbih: '/today/tasbih',
  calendar: '/today/calendar',
  mosques: '/today/mosques',
  names: '/today/names',
  goals: '/today/goals',
} as const

const go = (path: string) => (e: MouseEvent) => {
  e.preventDefault()
  openToday(path)
}

export function NextPrayerLine() {
  const { lang } = useI18n()
  const s = TODAY[lang]
  const [place] = usePlace()
  const placeName = usePlaceName(place)
  const [prefs] = useState(loadPrayerPrefs)
  const now = useNow()
  const state = useMemo(() => (place ? prayerState(place, now, prefs) : null), [place, now, prefs])
  if (!place || !state)
    return (
      <a className="dt-nextline" href={TODAY_PATHS.times} onClick={go(TODAY_PATHS.times)}>
        <span className="dt-nextline-ic">
          <IcClock size={20} />
        </span>
        <span className="dt-nextline-text">
          <span className="dt-nextline-main">{s.setCity}</span>
        </span>
        <IcChevron />
      </a>
    )
  const at = timeOf(state.next.at, lang, place.timeZone)
  const when = fill(s.inDuration, { d: duration(state.next.at.getTime() - now.getTime(), lang, s) })
  return (
    <a
      className="dt-nextline"
      href={TODAY_PATHS.times}
      onClick={go(TODAY_PATHS.times)}
      aria-label={fill(s.nextLineLabel, { prayer: `${s.prayers[state.next.name]} ${at}`, when })}
    >
      <span className="dt-nextline-ic">
        <IcClock size={20} />
      </span>
      <span className="dt-nextline-text">
        <span className="dt-nextline-main">
          {s.prayers[state.next.name]} {at}
        </span>
        <span className="dt-nextline-sub">
          {when}
          {placeName ? ` · ${placeName}` : ''}
        </span>
      </span>
      <IcChevron />
    </a>
  )
}

const TOOLS: [keyof typeof TODAY_PATHS, ReactNode, 'blue' | 'gold' | 'green'][] = [
  ['times', <IcClock />, 'blue'],
  ['qibla', <IcQibla />, 'gold'],
  ['adhkar', <IcBook />, 'green'],
  ['tasbih', <IcTasbih />, 'blue'],
  ['calendar', <IcCalendar />, 'gold'],
  ['mosques', <IcMosque />, 'green'],
  ['names', <IcStar />, 'blue'],
  ['goals', <IcTarget />, 'gold'],
]

export function TodayGrid() {
  const { lang } = useI18n()
  const s = TODAY[lang]
  return (
    <section className="dt-today" aria-labelledby="dt-today-h">
      <h2 id="dt-today-h">{s.todayTitle}</h2>
      <div className="dt-today-grid">
        {TOOLS.map(([k, icon, tint]) => (
          <a key={k} href={TODAY_PATHS[k]} className="dt-tool" onClick={go(TODAY_PATHS[k])}>
            <span className={`dt-tool-ic is-${tint}`}>{icon}</span>
            <span className="dt-tool-label">{s.tools[k]}</span>
          </a>
        ))}
      </div>
      {/* «أذكار المواقف» (reply 0050 ج): a card under the tools, once its table is reviewed. Its icon is not the tile
          «الأذكار»'s book on green (reply 0060): the raised hands of its own board (the situation «التعزية»), on gold. */}
      {mawaqifShown() && (
        <a href="/mawaqif" className="dt-mawaqif" onClick={go('/mawaqif')} data-testid="home-mawaqif">
          <span className="dt-tool-ic is-gold" data-icon="hands">
            <SituationIcon name="hands" size={22} />
          </span>
          <span className="dt-mawaqif-text">
            <b>{MAWAQIF[lang].title}</b>
            <span>{MAWAQIF[lang].cardSub}</span>
          </span>
          <IcChevron />
        </a>
      )}
    </section>
  )
}

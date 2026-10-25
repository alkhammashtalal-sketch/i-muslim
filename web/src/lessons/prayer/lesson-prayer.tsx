// «علّمني الصلاة» in the app (add-on 0072): the reviewed page relay/w1/0071-prayer, its renderer (lesson.js), its
// companion (companion.js), its stylesheet scoped to #lsn-prayer and its data (../prayer-data.json), the last two made
// by scripts/lessons/build.mjs. A lazy chunk: loaded on /today/lesson/prayer only. Al-Fatiha's transliteration is not
// in the data: it is asked of our server (/api/qf/translit/1) when the page opens, and nothing shows if it does not
// answer.
// Each prayer step by step (add-on 0072-add13; review page relay/w1/0072-prayers/batch-1): the lesson opens with the
// choice of a prayer, from the bundled definitions (prayers-batch-1.json, the five) and what our server adds to them
// later (prayers.js loadPrayers; the bundled set is the lesson offline), each card with today's time from the
// prayer-times screen's own engine and settings for the saved place.
import { useMemo } from 'react'
import type { Lang } from '../../../../shared/api'
import { savedPlace } from '../../daily/location'
import { dayTimes, ymdIn } from '../../daily/prayer'
import { timeOf } from '../../v2/daily/format'
import { loadPrayerPrefs, prayerOptions } from '../../v2/daily/store'
import data from '../prayer-data.json'
import { api } from '../../api/base'
import { getOurs, LessonHost, type MountedLesson } from '../lesson-host'
import { mountLesson } from './lesson.js'
import { loadPrayers } from './prayers.js'
import bundled from './prayers-batch-1.json'
import '../lesson-app.css'
import './lesson.css'
import './prayers.css'

const FIVE = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const

/** Today's five times for the saved place, as the prayer-times screen computes them; null without a place. */
function todayTimes(lang: Lang): Record<string, string> | null {
  try {
    const place = savedPlace()
    if (!place) return null
    const t = dayTimes(place, ymdIn(new Date(), place.timeZone), prayerOptions(loadPrayerPrefs(place)))
    return Object.fromEntries(FIVE.map((k) => [k, timeOf(t[k], lang, place.timeZone)]))
  } catch {
    return null
  }
}

// our server's set, merged with the bundled one, once per lesson opened (nothing kept: offline, the bundled set)
function onMounted(lesson: MountedLesson, alive: () => boolean) {
  void loadPrayers({ bundled, data, fetchJson: () => getOurs(api('/api/lessons/prayers')) }).then((set) => {
    if (alive() && set !== bundled) lesson.setPrayers?.(set)
  })
}

export default function PrayerLesson({ lang }: { lang: Lang }) {
  const more = useMemo(() => ({ prayers: bundled, times: todayTimes(lang) }), [lang])
  return <LessonHost id="prayer" lang={lang} data={data} mount={mountLesson} translitSura={1} more={more} onMounted={onMounted} />
}

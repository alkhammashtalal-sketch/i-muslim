// «علّمني الصلاة» in the app (add-on 0072): the reviewed page relay/w1/0071-prayer, its renderer (lesson.js), its
// companion (companion.js), its stylesheet scoped to #lsn-prayer and its data (../prayer-data.json), the last two made
// by scripts/lessons/build.mjs. A lazy chunk: loaded on /today/lesson/prayer only. Al-Fatiha's transliteration is not
// in the data: it is asked of our server (/api/qf/translit/1) when the page opens, and nothing shows if it does not
// answer.
import type { Lang } from '../../../../shared/api'
import data from '../prayer-data.json'
import { LessonHost } from '../lesson-host'
import { mountLesson } from './lesson.js'
import '../lesson-app.css'
import './lesson.css'

export default function PrayerLesson({ lang }: { lang: Lang }) {
  return <LessonHost id="prayer" lang={lang} data={data} mount={mountLesson} translitSura={1} />
}

// «علّمني الوضوء» in the app (add-on 0072): the reviewed page relay/w1/0072-wudu, its renderer (lesson.js), its
// companion (companion.js), its stylesheet scoped to #lsn-wudu and its data (../wudu-data.json), the last two made by
// scripts/lessons/build.mjs. A lazy chunk: loaded on /today/lesson/wudu only.
import type { Lang } from '../../../../shared/api'
import data from '../wudu-data.json'
import { LessonHost } from '../lesson-host'
import { mountLesson } from './lesson.js'
import '../lesson-app.css'
import './lesson.css'

export default function WuduLesson({ lang }: { lang: Lang }) {
  return <LessonHost id="wudu" lang={lang} data={data} mount={mountLesson} />
}

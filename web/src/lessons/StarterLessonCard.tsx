// The lesson on a step of the starting path (add-on 0072): «الصلاة» offers «علّمني الصلاة», «الطهارة» offers
// «علّمني الوضوء», once that lesson is in the app (registry.ts). Inside the step's question card, under its button, so
// the board's order (where, the question, the stories, «أنهيت») stays as it is. Nothing for a step without a lesson.
import type { Lang } from '../../../shared/api'
import { openToday } from '../v2/daily/Screen'
import { lessonForStarter, lessonPath } from './registry'
import { LESSON_CARD } from './strings'

export function StarterLessonCard({ step, lang }: { step: string; lang: Lang }) {
  const meta = lessonForStarter(step)
  if (!meta) return null
  const s = LESSON_CARD[lang] ?? LESSON_CARD.en
  const href = lessonPath(meta.id)
  return (
    <div className="ss-lesson" data-testid="starter-lesson">
      <a className="dt-btn dt-btn-wide" href={href} onClick={(e) => (e.preventDefault(), openToday(href))} aria-describedby={`ss-lesson-${meta.id}`}>
        {meta.title[lang] ?? meta.title.en}
      </a>
      <p id={`ss-lesson-${meta.id}`} className="ss-lesson-lead">
        {s.lead}
      </p>
    </div>
  )
}

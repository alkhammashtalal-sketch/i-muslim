// The «علّمني» lessons in the app (add-on 0072, the review pages relay/w1/0071-prayer and relay/w1/0072-wudu): each
// lesson is a folder here with a small meta.ts, read at start (its title for the starter path's card and the route),
// and its page (<id>/lesson-<id>.tsx), a lazy chunk with three.js, the companion and the lesson's data, loaded only on its route.
// A lesson is in the app when its folder is: the prayer and wudu lessons are merged each on its own approval, and
// the links between them appear only when both are here (hasLesson).
import type { Lang } from '../../../shared/api'

export type LessonMeta = {
  id: string
  /** The starter path's step whose page offers this lesson (web/src/config/starter-path.json). */
  starter: string
  /** The page's title in the ten interface languages: ar/en as reviewed on its review page, the rest machine-translated. */
  title: Record<Lang, string>
}

export type LessonPage = {
  default: import('react').ComponentType<{ lang: Lang }>
}

const metas = import.meta.glob<LessonMeta>('./*/meta.ts', { eager: true, import: 'META' })
const pages = import.meta.glob<LessonPage>('./*/lesson-*.tsx')

export const LESSONS: Record<string, LessonMeta> = Object.fromEntries(Object.values(metas).map((m) => [m.id, m]))

export const lessonPath = (id: string) => `/today/lesson/${id}`

/** The lesson a /today/lesson/<id> path asks for, or null. */
export const lessonOfPath = (pathname: string): string | null => pathname.match(/^\/today\/lesson\/([a-z]{2,20})\/?$/)?.[1] ?? null

export const hasLesson = (id: string) => id in LESSONS

/** A route the lessons may link to: another lesson only when it is in the app; the app's own screens always. */
export const hasRoute = (href: string) => {
  const id = lessonOfPath(href)
  return id ? hasLesson(id) : href.startsWith('/')
}

export const lessonForStarter = (step: string): LessonMeta | undefined => Object.values(LESSONS).find((m) => m.starter === step)

export const loadLesson = (id: string): (() => Promise<LessonPage>) | undefined => pages[`./${id}/lesson-${id}.tsx`]

// /today/lesson/<id>: a lesson in the daily screens' frame (back and title). The page itself is a lazy chunk
// (registry.ts), so three.js and the lesson's texts are fetched only when the lesson is opened, never on the home page.
import { lazy, Suspense, useEffect, useState, type ComponentType, type LazyExoticComponent } from 'react'
import type { Lang } from '../../../shared/api'
import { useI18n } from '../i18n'
import { navigate } from '../quran/route'
import { Screen } from '../v2/daily/Screen'
import { LESSONS, lessonOfPath, loadLesson } from './registry'
import { LESSON_CARD } from './strings'

const cache = new Map<string, LazyExoticComponent<ComponentType<{ lang: Lang }>>>()
function pageOf(id: string) {
  let c = cache.get(id)
  const load = loadLesson(id)
  if (!c && load) {
    c = lazy(load)
    cache.set(id, c)
  }
  return c
}

function usePathname() {
  const [p, setP] = useState(() => location.pathname)
  useEffect(() => {
    const h = () => setP(location.pathname)
    window.addEventListener('popstate', h)
    window.addEventListener('imuslim:navigate', h)
    return () => {
      window.removeEventListener('popstate', h)
      window.removeEventListener('imuslim:navigate', h)
    }
  }, [])
  return p
}

export function LessonScreen() {
  const { lang } = useI18n()
  const id = lessonOfPath(usePathname())
  const meta = id ? LESSONS[id] : undefined
  const Page = meta ? pageOf(meta.id) : undefined
  useEffect(() => {
    if (!Page) navigate('/', { replace: true })
  }, [Page])
  if (!meta || !Page) return null
  return (
    <Screen title={meta.title[lang] ?? meta.title.en}>
      <Suspense fallback={<p className="lsn-wait">{LESSON_CARD[lang].loading}</p>}>
        <Page key={meta.id} lang={lang} />
      </Suspense>
    </Screen>
  )
}

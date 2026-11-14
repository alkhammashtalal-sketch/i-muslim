// «قصص من السنة» (reply 0036 part ب): GET /api/starter/:step/stories (worker/src/starter.ts). Every title, grade and
// takhrij is HadeethEnc's, from D1 by id; the chapters' names are HadeethEnc's own titles (Arabic). Shown as returned.
import { api } from '../api/base'

export type Story = { id: string; title: string; lang: string; grade: string | null; attribution: string | null; grade_tr?: string; attribution_tr?: string }
export type Chapter = { id: string; title: string }
export type StoriesResponse = { step: string; stories: Story[]; chapters: Chapter[] }

const memo = new Map<string, Promise<StoriesResponse>>()

/** The step's stories in the content language; an error reads as none (the page then shows no card). */
export function getStories(step: string, lang: string): Promise<StoriesResponse> {
  const key = `${step}|${lang}`
  let p = memo.get(key)
  if (!p) {
    p = fetch(api(`/api/starter/${encodeURIComponent(step)}/stories?lang=${encodeURIComponent(lang)}`)).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const v = (await r.json()) as StoriesResponse
      return { step: v.step, stories: Array.isArray(v.stories) ? v.stories : [], chapters: Array.isArray(v.chapters) ? v.chapters : [] }
    })
    p.catch(() => memo.delete(key))
    memo.set(key, p)
  }
  return p
}

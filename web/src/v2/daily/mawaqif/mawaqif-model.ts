// «أذكار المواقف» (reply 0050): the situations and their adhkar from data/mawaqif.json, each dhikr a hadith's own words.
// Nothing is shown until the coordinator has reviewed the table (status «reviewed»); a test may show the draft by
// setting globalThis.__mawaqifPreview (e2e only, as the word meanings' sample).
import data from '../../../../../data/mawaqif.json'
import type { Lang } from '../../../../../shared/api'
import type { QuranRange } from '../adhkar/adhkar-model'

export type MawaqifItem = {
  hadith: string
  kind: 'say' | 'action' | 'quran'
  segments: string[]
  /** «quran»: the suras (or ayat) recited, from the Mushaf data (0049-add1 ج). */
  quran?: QuranRange[]
  quranLinks?: boolean
  /** Parallel to segments: the narrator's words kept in place inside the box, set smaller (0050-add1 ج, 3293). */
  asides?: boolean[]
  count?: number
  grade: string
  attribution: string | null
  intro: Record<Lang, string>
}
export type MawaqifStage = { id: string | null; name?: Record<Lang, string>; items: MawaqifItem[] }
export type Situation = { id: string; icon: string; name: Record<Lang, string>; proposed?: boolean; stages: MawaqifStage[] }
type Doc = { status: string; situations: Situation[] }
const DOC = data as unknown as Doc

const preview = () => !!(globalThis as { __mawaqifPreview?: boolean }).__mawaqifPreview
/** Shown once reviewed (or in a test's preview). */
export const mawaqifShown = () => DOC.status === 'reviewed' || preview()
export const situations = (): Situation[] => (mawaqifShown() ? DOC.situations : [])
export const situation = (id: string) => situations().find((s) => s.id === id) ?? null

/** One page of a situation: a stage's item, in order, across the stages. */
export type MawaqifStep = { stage: MawaqifStage; item: MawaqifItem; index: number }
export const stepsOf = (s: Situation): MawaqifStep[] =>
  s.stages.flatMap((stage) => stage.items.map((item) => ({ stage, item }))).map((x, index) => ({ ...x, index }))

/** The words of a box: the segments joined by a comma, nothing of ours between (as the adhkar's, 0049 د). */
export const boxText = (segs: string[]) => segs.reduce((acc, x) => (acc ? `${acc}${/[،,.؛:]$/.test(acc) ? ' ' : '، '}${x}` : x), '')

/** /mawaqif, /mawaqif/auto, /mawaqif/<situation> (the app's link imuslim://mawaqif/<situation>?step=<stage>). */
export function mawaqifRoute(pathname: string, search: string): { page: 'grid' } | { page: 'auto' } | { page: 'situation'; id: string; step: string | null } | null {
  const m = /^\/mawaqif(?:\/([a-z_]+))?\/?$/.exec(pathname)
  if (!m) return null
  if (!m[1]) return { page: 'grid' }
  if (m[1] === 'auto') return { page: 'auto' }
  return { page: 'situation', id: m[1], step: new URLSearchParams(search).get('step') }
}

/** The adhkar page's sections from this table (0050 ب): travel, sleep with waking, the restroom, food. */
export const ADHKAR_SECTIONS = { travel: ['travel'], sleep: ['sleep', 'waking'], toilet: ['toilet'], food: ['food'] } as const
export type AdhkarSection = keyof typeof ADHKAR_SECTIONS
export const isSection = (c: string): c is AdhkarSection => c in ADHKAR_SECTIONS
export const sectionsShown = (): AdhkarSection[] => (mawaqifShown() ? (Object.keys(ADHKAR_SECTIONS) as AdhkarSection[]).filter((k) => ADHKAR_SECTIONS[k].some((id) => situation(id))) : [])
export const sectionItems = (k: AdhkarSection): { situation: Situation; step: MawaqifStep }[] =>
  ADHKAR_SECTIONS[k].flatMap((id) => {
    const s = situation(id)
    return s ? stepsOf(s).map((step) => ({ situation: s, step })) : []
  })

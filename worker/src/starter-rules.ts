// «قصص من السنة» in the steps of the starting path (reply 0036 part ب): the file's format and the card's rules, kept
// free of imports so the Worker (worker/src/starter.ts) and the e2e spec (web/e2e/v2-0036-starter.spec.ts) build the
// card from D1's rows with the very same code.
//   • data/starter-stories.json holds ids only: per step, HadeethEnc hadith ids (`stories`, in the order shown) and
//     optionally the HadeethEnc category ids they were taken from (`chapters`). Talal writes it; nothing in it is text.
//   • A story is shown only when its Arabic row, whose grade the card shows, and its row in the content language (when
//     there is one) are graded as accepted: tier 1–3, class not weak, mawdu or mixed (rule 10; the hadith page's
//     isWeak). The card is never built on a weak or fabricated hadith.
//   • The title is HadeethEnc's own: the content language's row when it has one, else the Arabic row's, marked Arabic
//     (the rule «بعض الأحاديث بالعربية»). The grade and the takhrij are the Arabic row's, verbatim, with the language
//     row's wording beside them when it differs, as on the hadith page.
//   • The source line names the step's chapters that at least one shown story belongs to (its Arabic row's
//     categories), by HadeethEnc's titles; a step that names no chapters shows the source's name alone.

export const MAX_STORIES = 12
const ID = /^\d{1,7}$/
const CAT = /^\d{1,5}$/
export const STEP_ID = /^[a-z]{2,20}$/

export type StepEntry = { stories: string[]; chapters?: string[] }
export type StoriesFile = { _about?: string; steps: Record<string, StepEntry> }

/** The fields of a hadiths row the card reads (categories already parsed). */
export type StoryRow = { id: string; lang: string; title: string | null; grade: string | null; attribution: string | null; tier: string; class: string; categories: string[] }
export type Story = {
  id: string
  /** HadeethEnc's title, in `lang` (the content language's row, or Arabic when it has none). */
  title: string
  lang: string
  /** The Arabic row's grade and takhrij, verbatim. */
  grade: string | null
  attribution: string | null
  /** The content language's wording of them, only when it differs from the Arabic. */
  grade_tr?: string
  attribution_tr?: string
}
export type Chapter = { id: string; title: string }
export type StoriesResponse = { step: string; stories: Story[]; chapters: Chapter[] }

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/** The problems of a stories file, by place; empty when it is well formed. `steps` (the path's step ids) and `titles`
 *  (HadeethEnc's categories) are checked when given. */
export function checkStoriesFile(v: unknown, steps?: readonly string[], titles?: Record<string, string>): string[] {
  const bad: string[] = []
  if (!isObj(v)) return ['the file is not an object']
  for (const k of Object.keys(v)) if (k !== '_about' && k !== 'steps') bad.push(`unknown key «${k}»`)
  if ('_about' in v && typeof v._about !== 'string') bad.push('_about is not a string')
  if (!isObj(v.steps)) return [...bad, 'steps is not an object']
  for (const [step, e] of Object.entries(v.steps)) {
    const at = `steps.${step}`
    if (!STEP_ID.test(step) || (steps && !steps.includes(step))) bad.push(`${at}: not a step of the path`)
    if (!isObj(e)) {
      bad.push(`${at}: not an object`)
      continue
    }
    for (const k of Object.keys(e)) if (k !== 'stories' && k !== 'chapters') bad.push(`${at}: unknown key «${k}»`)
    const ids = e.stories
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > MAX_STORIES) bad.push(`${at}.stories: 1 to ${MAX_STORIES} ids`)
    else {
      ids.forEach((id, i) => {
        if (typeof id !== 'string' || !ID.test(id)) bad.push(`${at}.stories[${i}]: not a hadith id (a string of digits)`)
      })
      if (new Set(ids).size !== ids.length) bad.push(`${at}.stories: an id repeats`)
    }
    if ('chapters' in e) {
      const cs = e.chapters
      if (!Array.isArray(cs)) bad.push(`${at}.chapters: not a list`)
      else {
        cs.forEach((c, i) => {
          if (typeof c !== 'string' || !CAT.test(c)) bad.push(`${at}.chapters[${i}]: not a category id (a string of digits)`)
          else if (titles && !(c in titles)) bad.push(`${at}.chapters[${i}]: category ${c} is not in HadeethEnc's list`)
        })
        if (new Set(cs).size !== cs.length) bad.push(`${at}.chapters: an id repeats`)
      }
    }
  }
  return bad
}

/** The step's entry, or null when the file is absent or malformed, or the step has no stories. */
export function entryFor(file: unknown, step: string): StepEntry | null {
  if (!STEP_ID.test(step) || checkStoriesFile(file).length) return null
  const e = (file as StoriesFile).steps[step]
  return e && e.stories.length ? e : null
}

/** Graded as accepted and shown (tier 1–3, not weak, mawdu or mixed), as worker/src/hadith.ts shownRow. */
export const acceptedRow = (r: Pick<StoryRow, 'tier' | 'class'> | undefined) => !!r && ['1', '2', '3'].includes(r.tier) && !['mixed', 'weak', 'mawdu'].includes(r.class)

/** The card from the rows read for the entry's ids, in its order: `pairs[i]` is the Arabic row of `entry.stories[i]`
 *  and its row in the content language (absent in Arabic or when HadeethEnc has no translation). */
export function buildStories(step: string, entry: StepEntry, pairs: { ar?: StoryRow; tr?: StoryRow }[], titles: Record<string, string>): StoriesResponse {
  const stories: Story[] = []
  const cats = new Set<string>()
  entry.stories.forEach((id, i) => {
    const { ar, tr } = pairs[i] ?? {}
    if (!ar || ar.id !== id || ar.lang !== 'ar' || !acceptedRow(ar)) return
    if (tr && (tr.id !== id || !acceptedRow(tr))) return
    const own = tr?.title?.trim() ? tr : undefined
    const title = own ? own.title : ar.title
    if (!title?.trim()) return
    stories.push({
      id,
      title,
      lang: own ? own.lang : 'ar',
      grade: ar.grade,
      attribution: ar.attribution,
      ...(tr?.grade && tr.grade !== ar.grade ? { grade_tr: tr.grade } : {}),
      ...(tr?.attribution && tr.attribution !== ar.attribution ? { attribution_tr: tr.attribution } : {}),
    })
    for (const c of ar.categories) cats.add(String(c))
  })
  const chapters = stories.length ? (entry.chapters ?? []).filter((c) => cats.has(c) && titles[c]).map((c) => ({ id: c, title: titles[c] })) : []
  return { step, stories, chapters }
}

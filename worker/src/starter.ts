// «قصص من السنة» in the steps of the starting path (reply 0036 part ب; the rules in worker/src/starter-rules.ts):
//   GET /api/starter/:step/stories?lang=xx → { step, stories: Story[], chapters: Chapter[] }
// The ids come from data/starter-stories.json (Talal's, ids only); every title, grade and takhrij is D1's, read by
// primary key (id, lang) in one batch (CLAUDE.md §12), and the chapters' names are HadeethEnc's own titles
// (worker/src/config/hadith-categories.json). A step with no stories answers an empty list, and the page shows no card.
import stories from '../../data/starter-stories.json'
import categories from './config/hadith-categories.json'
import { HADITH_LANGS } from './hadith'
import type { Env } from './index'
import { json } from './reader'
import { buildStories, entryFor, STEP_ID, type StoriesResponse, type StoryRow } from './starter-rules'

const TITLES = (categories as { titles: Record<string, string> }).titles
const TRANSLATED = new Set<string>(HADITH_LANGS.filter((l) => l !== 'ar'))
const COLS = 'id, lang, title, grade, attribution, tier, class, categories, mawquf'
const CACHE = 'public, max-age=600, s-maxage=3600'

type Raw = Omit<StoryRow, 'categories' | 'mawquf'> & { categories: string | null; mawquf?: number | boolean | null }
const parse = (r: Raw | undefined): StoryRow | undefined => {
  if (!r) return undefined
  let cats: unknown = []
  try {
    cats = JSON.parse(r.categories ?? '[]')
  } catch {
    cats = []
  }
  return { ...r, categories: Array.isArray(cats) ? cats.map(String) : [], mawquf: r.mawquf === true || r.mawquf === 1 }
}

/** The card of a step in the content language; `file` is the stories file (undefined when absent: no stories). */
export async function starterStories(env: Env, step: string, lang: string, file: unknown): Promise<StoriesResponse> {
  const entry = entryFor(file, step)
  if (!entry) return { step, stories: [], chapters: [] }
  const tl = TRANSLATED.has(lang) ? lang : null
  const stmts = entry.stories.flatMap((id) => [
    env.DB.prepare(`SELECT ${COLS} FROM hadiths WHERE id = ? AND lang = 'ar'`).bind(id),
    ...(tl ? [env.DB.prepare(`SELECT ${COLS} FROM hadiths WHERE id = ? AND lang = ?`).bind(id, tl)] : []),
  ])
  const res = await env.DB.batch(stmts)
  const per = tl ? 2 : 1
  const pairs = entry.stories.map((_, i) => ({
    ar: parse((res[i * per].results as Raw[])[0]),
    tr: tl ? parse((res[i * per + 1].results as Raw[])[0]) : undefined,
  }))
  return buildStories(step, entry, pairs, TITLES)
}

/** `opts.file` replaces the stories file in tests (`{ file: undefined }`: the file absent). */
export async function handleStarter(request: Request, env: Env, url: URL, opts: { file?: unknown } = { file: stories }): Promise<Response | null> {
  const m = url.pathname.match(/^\/api\/starter\/([^/]+)\/stories$/)
  if (!m || request.method !== 'GET') return null
  if (!STEP_ID.test(m[1])) return json({ ok: false, error: 'not_found' }, 404)
  return json(await starterStories(env, m[1], url.searchParams.get('lang') ?? 'ar', opts.file), 200, CACHE)
}

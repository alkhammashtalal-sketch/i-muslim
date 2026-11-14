// The source line of «قصص من السنة» (reply 0037 §1): each step's `chapters` in data/starter-stories.json, computed, never
// typed. Talal writes the `stories` (ids only); this script adds, for every step, the HadeethEnc categories its stories
// belong to among the categories data/starter-story-cats.json ties to that step (`categories`, then `more`). A story
// filed under none of them (66313, «حديث الإسراء والمعراج», is in category 390) brings its own categories. Categories
// are read from the Arabic records as fetched (data/raw/hadeethenc/ar/<id>.json, field `categories`). The stories are
// kept exactly as written.
//   node scripts/daily/starter-chapters.mjs          → rewrites data/starter-stories.json (stories unchanged, chapters, _about)
//   node scripts/daily/starter-chapters.mjs --check  → exits 1 if the file's chapters are not what the data gives
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const FILE = path.join(ROOT, 'data/starter-stories.json')
const CATS = path.join(ROOT, 'data/starter-story-cats.json')
const RAW = path.join(ROOT, 'data/raw/hadeethenc/ar')

const ABOUT =
  "«قصص من السنة» in the starter path's steps (reply 0036 part ب; reply 0037 §1). `stories`: HadeethEnc hadith ids chosen by the coordinator, in the order shown (a clear story that teaches the step, no fighting or punishments for the new Muslim, no repeats between steps). `chapters`: computed by scripts/daily/starter-chapters.mjs, never typed: the categories (data/starter-story-cats.json) the shown stories belong to, from the Arabic records' own `categories`; a story under none of the step's categories brings its own. Ids only; every text is read from D1 by id (worker/src/starter.ts)."

export function computeChapters(stories, step, catsOf) {
  const tied = [...(step.categories ?? []), ...(step.more ?? [])].map((c) => String(c.id))
  const out = []
  const add = (c) => {
    if (!out.includes(c)) out.push(c)
  }
  const own = stories.map((id) => (catsOf(id) ?? []).map(String))
  // The step's own categories first, in the order the mapping gives them; then the stories' own when none is tied.
  for (const c of tied) if (own.some((cs) => cs.includes(c))) add(c)
  own.forEach((cs) => {
    if (!cs.some((c) => tied.includes(c))) cs.forEach(add)
  })
  return out
}

const catsOf = (id) => {
  const f = path.join(RAW, `${id}.json`)
  if (!fs.existsSync(f)) throw new Error(`data/raw/hadeethenc/ar/${id}.json is missing (run the HadeethEnc fetch)`)
  return JSON.parse(fs.readFileSync(f, 'utf8')).categories ?? []
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const file = JSON.parse(fs.readFileSync(FILE, 'utf8'))
  const steps = new Map(JSON.parse(fs.readFileSync(CATS, 'utf8')).steps.map((s) => [s.id, s]))
  const next = { _about: ABOUT, steps: {} }
  for (const [id, e] of Object.entries(file.steps)) {
    const step = steps.get(id)
    if (!step) throw new Error(`step «${id}» is not in data/starter-story-cats.json`)
    next.steps[id] = { stories: [...e.stories], chapters: computeChapters(e.stories, step, catsOf) }
  }
  const text = JSON.stringify(next, null, 2) + '\n'
  if (process.argv.includes('--check')) {
    const same = JSON.stringify(file.steps) === JSON.stringify(next.steps)
    console.log(same ? 'starter-chapters: up to date' : 'starter-chapters: chapters differ from the data')
    process.exit(same ? 0 : 1)
  }
  fs.writeFileSync(FILE, text)
  for (const [id, e] of Object.entries(next.steps)) console.log(`${id}: ${e.stories.length} stories, chapters ${e.chapters.join(', ')}`)
}

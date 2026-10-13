// «قصص من السنة» in the steps of the starting path (reply 0036 part ب): the format of data/starter-stories.json, the
// card hidden when the file is absent or the step has no stories, the rules (rule 10, the Arabic fallback, the
// chapters), and GET /api/starter/:step/stories reading D1 by primary key only (CLAUDE.md §12), on an in-memory D1
// built from migrations 0008 and 0009.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import stories from '../../data/starter-stories.json'
import fixture from './fixtures/starter-stories.json'
import categories from '../src/config/hadith-categories.json'
import type { Env } from '../src/index'
import { handleStarter } from '../src/starter'
import { buildStories, checkStoriesFile, entryFor, MAX_STORIES } from '../src/starter-rules'
import { SqliteD1 } from './d1-sqlite'

const ROOT = path.resolve(import.meta.dirname, '../..')
const MIGRATIONS = ['0008_hadiths.sql', '0009_hadith_mawquf.sql'].map((f) => path.join(ROOT, 'worker/migrations', f))
const STEPS = (JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/config/starter-path.json'), 'utf8')) as { steps: { id: string }[] }).steps.map((s) => s.id)
const TITLES = (categories as { titles: Record<string, string> }).titles
const PROCESSED = path.join(ROOT, 'data/processed/hadith.jsonl')
const CATS_RAW = path.join(ROOT, 'data/raw/hadeethenc/categories-list-ar.json')

type R = { id: string; lang: string; title: string | null; grade: string; attribution: string; cls: string; tier: string; cats?: string[] }

/** An in-memory D1 whose every statement is kept, so the reads can be checked by their query plan. */
function envWith(rows: R[]) {
  const db = new DatabaseSync(':memory:')
  for (const m of MIGRATIONS) db.exec(fs.readFileSync(m, 'utf8'))
  const ins = db.prepare('INSERT INTO hadiths (id, lang, title, text, attribution, grade, categories, class, tier, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  for (const r of rows) ins.run(r.id, r.lang, r.title, 'نص', r.attribution, r.grade, JSON.stringify(r.cats ?? []), r.cls, r.tier, 'v1')
  const d1 = new SqliteD1(db)
  const seen: { sql: string; args: unknown[] }[] = []
  const prepare = d1.prepare.bind(d1)
  d1.prepare = (sql: string) => {
    const st = prepare(sql)
    const bind = st.bind.bind(st)
    st.bind = (...args: (string | number | null)[]) => (seen.push({ sql, args }), bind(...args))
    return st
  }
  let batches = 0
  const batch = d1.batch.bind(d1)
  d1.batch = (s) => (batches++, batch(s))
  return { env: { DB: d1 } as unknown as Env, db, seen, batches: () => batches }
}

const get = async (env: Env, p: string, ...file: unknown[]) => {
  const url = new URL(`https://x.test${p}`)
  // No file given: the fixture; `undefined` given: the file absent.
  const res = await handleStarter(new Request(url), env, url, { file: file.length ? file[0] : fixture })
  return res ? { status: res.status, body: (await res.json()) as any, cache: res.headers.get('cache-control') } : null
}

// Rows for the fixture's ids, with their categories as HadeethEnc files them; texts are placeholders of the test.
const ROWS: R[] = [
  { id: '3185', lang: 'ar', title: 'عنوان ٣١٨٥', grade: 'صحيح', attribution: 'متفق عليه', cls: 'sahih', tier: '1', cats: ['464'] },
  { id: '3185', lang: 'en', title: 'Title 3185', grade: 'Authentic', attribution: 'Agreed upon', cls: 'sahih', tier: '1', cats: ['464'] },
  { id: '4968', lang: 'ar', title: 'عنوان ٤٩٦٨', grade: 'صحيح', attribution: 'متفق عليه', cls: 'sahih', tier: '1', cats: ['457'] },
  { id: '4968', lang: 'en', title: 'Title 4968', grade: 'Authentic', attribution: 'Agreed upon', cls: 'sahih', tier: '1', cats: ['457'] },
  { id: '65044', lang: 'ar', title: 'عنوان ٦٥٠٤٤', grade: 'صحيح', attribution: 'متفق عليه', cls: 'sahih', tier: '1', cats: ['59', '456', '500'] },
  { id: '65044', lang: 'en', title: 'Title 65044', grade: 'Authentic', attribution: 'Agreed upon', cls: 'sahih', tier: '1', cats: ['59', '456', '500'] },
  // Arabic only on HadeethEnc: its title stays Arabic in every language.
  { id: '66313', lang: 'ar', title: 'عنوان ٦٦٣١٣', grade: 'صحيح', attribution: 'متفق عليه', cls: 'sahih', tier: '1', cats: ['390'] },
  { id: '3365', lang: 'ar', title: 'عنوان ٣٣٦٥', grade: 'صحيح', attribution: 'متفق عليه', cls: 'sahih', tier: '1', cats: ['277', '457'] },
  { id: '3365', lang: 'en', title: 'Title 3365', grade: 'Authentic', attribution: 'Agreed upon', cls: 'sahih', tier: '1', cats: ['277', '457'] },
]
const ids = (body: { stories: { id: string }[] }) => body.stories.map((s) => s.id)

describe('data/starter-stories.json: the format', () => {
  it('ids only, keyed by a step of the path, with its _about; the fixture in the same format', () => {
    expect(checkStoriesFile(stories, STEPS, TITLES)).toEqual([])
    expect(typeof (stories as { _about?: string })._about).toBe('string')
    expect(checkStoriesFile(fixture, STEPS, TITLES)).toEqual([])
  })
  it('every story an id of digits, 1 to 12 per step, no repeat; chapters in HadeethEnc\'s list; no other key', () => {
    const ok = { steps: { salah: { stories: ['3185'] } } }
    expect(checkStoriesFile(ok, STEPS, TITLES)).toEqual([])
    const bad: [unknown, RegExp][] = [
      [{ steps: { salah: { stories: ['ارجع فصل، فإنك لم تصل'] } } }, /not a hadith id/],
      [{ steps: { salah: { stories: [3185] } } }, /not a hadith id/],
      [{ steps: { salah: { stories: [] } } }, /1 to 12/],
      [{ steps: { salah: { stories: Array.from({ length: MAX_STORIES + 1 }, (_, i) => String(i + 1)) } } }, /1 to 12/],
      [{ steps: { salah: { stories: ['1', '1'] } } }, /repeats/],
      [{ steps: { salat: { stories: ['1'] } } }, /not a step/],
      [{ steps: { salah: { stories: ['1'], title: 'قصص' } } }, /unknown key «title»/],
      [{ steps: { salah: { stories: ['1'], chapters: ['999999'] } } }, /not a category id/],
      [{ steps: { salah: { stories: ['1'], chapters: ['99999'] } } }, /not in HadeethEnc/],
      [{ steps: { salah: { stories: ['1'], chapters: ['صفة الصلاة'] } } }, /not a category id/],
      [{ steps: {}, intro: 'نص' }, /unknown key «intro»/],
      [{ steps: [] }, /steps is not an object/],
      [null, /not an object/],
    ]
    for (const [v, re] of bad) expect(checkStoriesFile(v, STEPS, TITLES).join('; '), JSON.stringify(v)).toMatch(re)
  })
  it('the chapters\' names are HadeethEnc\'s own titles, as received (when the raw list is present)', () => {
    if (!fs.existsSync(CATS_RAW)) return
    const raw = JSON.parse(fs.readFileSync(CATS_RAW, 'utf8')) as { id: string; title: string }[]
    expect(Object.keys(TITLES).length).toBe(raw.length)
    for (const c of raw) expect(TITLES[String(c.id)]).toBe(c.title)
  })
})

describe('the card hidden', () => {
  it('when the file is absent, malformed, empty, or the step has no stories: an empty list, no read', async () => {
    const t = envWith(ROWS)
    for (const file of [undefined, null, {}, { steps: {} }, { steps: { salah: { stories: ['x'] } } }, stories]) {
      const r = await get(t.env, '/api/starter/salah/stories?lang=ar', file)
      expect(r?.status).toBe(200)
      expect(r?.body).toEqual({ step: 'salah', stories: [], chapters: [] })
    }
    // A step of the path the fixture names no stories for.
    expect((await get(t.env, '/api/starter/taharah/stories?lang=ar'))?.body).toEqual({ step: 'taharah', stories: [], chapters: [] })
    expect(entryFor(undefined, 'salah')).toBeNull()
    expect(t.seen).toEqual([])
  })
  it('when every story of the step is weak, fabricated, mixed or missing: no stories and no chapters', async () => {
    const weak = ROWS.map((r) => ({ ...r, cls: 'weak', tier: 'X', grade: 'ضعيف' }))
    const r = await get(envWith(weak).env, '/api/starter/salah/stories?lang=ar')
    expect(r?.body).toEqual({ step: 'salah', stories: [], chapters: [] })
    expect((await get(envWith([]).env, '/api/starter/salah/stories?lang=ar'))?.body.stories).toEqual([])
  })
})

describe('GET /api/starter/:step/stories', () => {
  it('Arabic: HadeethEnc\'s titles, grade and takhrij as stored, in the file\'s order; the chapters the stories belong to', async () => {
    const t = envWith(ROWS)
    const r = (await get(t.env, '/api/starter/salah/stories?lang=ar'))!
    expect(r.status).toBe(200)
    expect(r.cache).toMatch(/max-age=600/)
    expect(ids(r.body)).toEqual(['3185', '4968', '65044', '66313', '3365'])
    expect(r.body.stories[0]).toEqual({ id: '3185', title: 'عنوان ٣١٨٥', lang: 'ar', grade: 'صحيح', attribution: 'متفق عليه' })
    // 464, 457 and 456 are the fixture's chapters; 59, 500, 390 and 277 are other categories of its stories, not named.
    expect(r.body.chapters).toEqual([
      { id: '464', title: TITLES['464'] },
      { id: '457', title: TITLES['457'] },
      { id: '456', title: TITLES['456'] },
    ])
  })
  it('another language: its row\'s title, else the Arabic title marked Arabic; the Arabic grade with the translation\'s wording', async () => {
    const r = (await get(envWith(ROWS).env, '/api/starter/salah/stories?lang=en'))!
    expect(r.body.stories[0]).toEqual({ id: '3185', title: 'Title 3185', lang: 'en', grade: 'صحيح', attribution: 'متفق عليه', grade_tr: 'Authentic', attribution_tr: 'Agreed upon' })
    expect(r.body.stories[3]).toEqual({ id: '66313', title: 'عنوان ٦٦٣١٣', lang: 'ar', grade: 'صحيح', attribution: 'متفق عليه' })
    // A language HadeethEnc has no rows in, or one outside the ten: Arabic throughout, no second read.
    for (const l of ['fr', 'fa', 'xx']) expect((await get(envWith(ROWS).env, `/api/starter/salah/stories?lang=${l}`))!.body.stories.every((s: { lang: string }) => s.lang === 'ar')).toBe(true)
  })
  it('rule 10: a weak, fabricated or mixed story is not shown, in Arabic or in the language\'s row; hasan is', async () => {
    const rows = ROWS.map((r) => {
      if (r.id === '4968' && r.lang === 'ar') return { ...r, cls: 'weak', tier: 'X', grade: 'ضعيف' }
      if (r.id === '65044' && r.lang === 'ar') return { ...r, cls: 'mixed', tier: 'X', grade: 'صحيح دون قوله' }
      if (r.id === '3365' && r.lang === 'en') return { ...r, cls: 'mawdu', tier: 'X', grade: 'Fabricated' }
      if (r.id === '66313') return { ...r, cls: 'hasan', tier: '3', grade: 'حسن' }
      return r
    })
    expect(ids((await get(envWith(rows).env, '/api/starter/salah/stories?lang=ar'))!.body)).toEqual(['3185', '66313', '3365'])
    const en = (await get(envWith(rows).env, '/api/starter/salah/stories?lang=en'))!.body
    expect(ids(en)).toEqual(['3185', '66313'])
    // The chapters follow the stories shown: 457 (4968, 3365) and 456 (65044) are gone with them.
    expect(en.chapters.map((c: { id: string }) => c.id)).toEqual(['464'])
  })
  it('no chapters named in the file: no chapter on the line', async () => {
    const file = { steps: { salah: { stories: ['3185', '4968'] } } }
    expect((await get(envWith(ROWS).env, '/api/starter/salah/stories?lang=ar', file))!.body.chapters).toEqual([])
  })
  it('reads by primary key only, in one batch: (id, \'ar\') and (id, lang) per story', async () => {
    const t = envWith(ROWS)
    await get(t.env, '/api/starter/salah/stories?lang=en')
    expect(t.batches()).toBe(1)
    expect(t.seen).toHaveLength(10)
    for (const { sql, args } of t.seen) {
      expect(sql).toMatch(/FROM hadiths WHERE id = \? AND lang = (\?|'ar')$/)
      const plan = (t.db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all(...(args as string[])) as { detail: string }[]).map((p) => p.detail).join(' | ')
      expect(plan, sql).toMatch(/^SEARCH hadiths USING INDEX sqlite_autoindex_hadiths_1 \(id=\? AND lang=\?\)$/)
    }
    const ar = envWith(ROWS)
    await get(ar.env, '/api/starter/salah/stories?lang=ar')
    expect(ar.seen).toHaveLength(5)
  })
  it('a malformed step is not found; another method or path is not this route\'s', async () => {
    const t = envWith(ROWS)
    for (const p of ['/api/starter/Salah/stories', '/api/starter/s%27/stories', '/api/starter/1/stories']) expect((await get(t.env, p))?.status).toBe(404)
    expect(await get(t.env, '/api/starter/salah')).toBeNull()
    const url = new URL('https://x.test/api/starter/salah/stories')
    expect(await handleStarter(new Request(url, { method: 'POST' }), t.env, url, { file: fixture })).toBeNull()
  })
})

describe('with the processed data (when present)', () => {
  it('the fixture\'s stories are D1\'s rows: titles, grades and takhrij exactly as loaded', () => {
    if (!fs.existsSync(PROCESSED)) return
    const want = new Set(fixture.steps.salah.stories)
    const rows = fs
      .readFileSync(PROCESSED, 'utf8')
      .split('\n')
      .filter((l) => l && want.has(JSON.parse(l).id))
      .map((l) => JSON.parse(l) as { id: string; lang: string; title: string; grade: string; attribution: string; class: string; tier: string; categories: string[] })
    const row = (id: string, lang: string) => {
      const r = rows.find((x) => x.id === id && x.lang === lang)
      return r && { ...r, categories: r.categories.map(String) }
    }
    for (const lang of ['ar', 'en', 'ur']) {
      const pairs = fixture.steps.salah.stories.map((id) => ({ ar: row(id, 'ar'), tr: lang === 'ar' ? undefined : row(id, lang) }))
      const card = buildStories('salah', fixture.steps.salah, pairs, TITLES)
      expect(card.stories.map((s) => s.id)).toEqual(fixture.steps.salah.stories)
      for (const s of card.stories) {
        expect(s.title).toBe((row(s.id, s.lang) ?? { title: '' }).title)
        expect([s.grade, s.attribution]).toEqual([row(s.id, 'ar')!.grade, row(s.id, 'ar')!.attribution])
      }
      expect(card.chapters.map((c) => c.id)).toEqual(['464', '457', '456'])
    }
  })
})

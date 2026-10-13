// «سبب النزول» in the ayah panel (reply 0036 §أ): which hadiths of data/asbab-map.json an ayah shows (shared/asbab.ts),
// GET /api/asbab/:sura/:aya on an in-memory D1 built from migrations 0008 and 0009 (the texts below are invented
// placeholders, never source text), the folding, the reads by key, the app's offline copy of it; and, when
// data/processed is here, every shown id against next's data.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { ASBAB_ALL_IDS, ASBAB_INDEX, asbabFold, asbabIds, asbabIndex, asbabShown, type AsbabEntry } from '../../shared/asbab'
import { createOffline } from '../../web/src/native/offline'
import { asbabFrom, asbabPairFrom, offlineRoute, type HadithRow } from '../../web/src/native/offline-data'
import { READING } from '../../web/src/v2/reading/strings'
import { getAsbab, handleAsbab } from '../src/asbab'
import { handleHadith } from '../src/hadith'
import type { Env } from '../src/index'
import { SqliteD1 } from './d1-sqlite'

const ROOT = path.resolve(import.meta.dirname, '../..')
const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/asbab-map.json'), 'utf8'))
const e = (o: Partial<AsbabEntry>): AsbabEntry => ({ ayat: ['quran:93:3'], method: 'bracket', tier: '1', class: 'sahih', mawquf: false, ...o })

describe('the conditions (shared/asbab.ts)', () => {
  it('an accepted automatic method, or the coordinator’s review', () => {
    for (const method of ['bracket', 'full_text', 'longest_run']) expect(asbabShown(e({ method })), method).toBe(true)
    expect(asbabShown(e({ method: 'review', ayat: [], reviewed: false }))).toBe(false)
    // Reviewed with its ayat: shown at the next build, nothing else to change.
    expect(asbabShown(e({ method: 'review', reviewed: true }))).toBe(true)
    expect(asbabShown(e({ method: 'review', reviewed: true, ayat: [] }))).toBe(false)
    // An automatic link set back by the coordinator stays hidden.
    expect(asbabShown(e({ method: 'bracket', reviewed: false }))).toBe(false)
    expect(asbabShown(e({ method: 'similar' }))).toBe(false)
  })
  it('tiers 1–3 only, never mixed', () => {
    for (const tier of ['1', '2', '3']) expect(asbabShown(e({ tier })), tier).toBe(true)
    for (const tier of ['X', '4', '']) expect(asbabShown(e({ tier })), tier).toBe(false)
    expect(asbabShown(e({ tier: '3', class: 'mixed' }))).toBe(false)
    expect(asbabShown(e({ tier: '3', class: 'mawquf', mawquf: true }))).toBe(true)
  })
  it('the index: the soundest first, then the id; nothing for an ayah without a kept entry', () => {
    const ix = asbabIndex({
      '30': e({ tier: '2', ayat: ['quran:5:93'] }),
      '20': e({ tier: '1', ayat: ['quran:5:93', 'quran:5:94'] }),
      '10': e({ tier: '3', ayat: ['quran:5:93'] }),
      '40': e({ tier: 'X', ayat: ['quran:5:93'] }),
      '50': e({ method: 'review', reviewed: false, ayat: ['quran:5:93'] }),
      '60': e({ class: 'mixed', ayat: ['quran:5:93'] }),
      abc: e({ ayat: ['quran:5:93'] }),
      '70': e({ ayat: ['not-a-key'] }),
    })
    expect(ix).toEqual({ 'quran:5:93': ['20', '30', '10'], 'quran:5:94': ['20'] })
  })
  it('the real map: only its `hadiths`, never the review list outside category 14', () => {
    const outside = new Set(Object.keys(MAP.outside_category.hadiths))
    expect(outside.size).toBeGreaterThan(0)
    for (const id of ASBAB_ALL_IDS) {
      expect(outside.has(id), id).toBe(false)
      const h = MAP.hadiths[id]
      expect(asbabShown(h), id).toBe(true)
    }
    // The kept entries are exactly the builder's by_ayah (the automatic links and the reviewed ones), tiers 1–3.
    expect(Object.keys(ASBAB_INDEX).sort()).toEqual(Object.keys(MAP.by_ayah).sort())
    for (const [k, ids] of Object.entries(MAP.by_ayah) as [string, string[]][]) expect([...ASBAB_INDEX[k]].sort(), k).toEqual([...ids].sort())
    // After the coordinator's decisions (reply 0037 §2): 75 ayat, 54 hadiths.
    expect(Object.keys(ASBAB_INDEX)).toHaveLength(75)
    expect(ASBAB_ALL_IDS).toHaveLength(54)
    // Of the three left for review: 65334 (الروم 1–3) and 65335 (الأحزاب 35) linked; 65958 nowhere (its page only).
    expect(asbabIds(30, 1)).toEqual(['65334'])
    expect(asbabIds(30, 3)).toEqual(['65334'])
    expect(ASBAB_ALL_IDS.includes('65958')).toBe(false)
    // 10558 on العلق 6–17, 65310 on الأنفال 33 and 34.
    for (let a = 6; a <= 17; a++) expect(asbabIds(96, a), `96:${a}`).toEqual(['10558'])
    expect(asbabIds(96, 5)).toEqual([])
    expect(asbabIds(8, 33)).toEqual(['65310'])
    expect(asbabIds(93, 3)).toEqual(['65351'])
    expect(asbabIds(1, 1)).toEqual([])
  })
  it('several hadiths: the first shown, the others folded', () => {
    expect(asbabFold(['a', 'b', 'c'])).toEqual({ first: 'a', folded: ['b', 'c'] })
    expect(asbabFold(['a'])).toEqual({ first: 'a', folded: [] })
    expect(asbabFold([])).toEqual({ first: null, folded: [] })
    // 5:93 has two in the map, the tier-1 one first (rule 10: the sahih first); الأحزاب 35 the sahih before the hasan.
    expect(asbabIds(5, 93)).toEqual(['66034', '65301'])
    expect(asbabIds(33, 35)).toEqual(['65336', '65335'])
  })
  it('the texts: the reply’s Arabic word for word, ten languages, no «قال رسول الله ﷺ» anywhere', () => {
    const ar = READING.ar
    expect([ar.asbabHeading, ar.asbabIntro, ar.asbabExplain, ar.asbabSourceName, ar.asbabChapter, ar.asbabHadithN, ar.asbabMore]).toEqual([
      'سبب النزول',
      'ما ورد في نزول هذه الآية، بحديث مقبول بدرجته.',
      'شرح الحديث وفوائده',
      'موسوعة الأحاديث النبوية المترجمة',
      'باب أسباب النزول',
      'الحديث {n}',
      'أحاديث أخرى في نزولها ({n})',
    ])
    for (const [l, s] of Object.entries(READING)) {
      for (const k of ['asbabHeading', 'asbabIntro', 'asbabExplain', 'asbabSourceName', 'asbabChapter', 'asbabHadithN', 'asbabMore'] as const) {
        expect(s[k], `${l}.${k}`).toBeTruthy()
        expect(s[k]).not.toMatch(/قال رسول الله/)
      }
    }
    const src = fs.readFileSync(path.join(ROOT, 'web/src/v2/reading/Asbab.tsx'), 'utf8')
    expect(src).not.toMatch(/قال رسول الله|صلى الله عليه وسلم|ﷺ/)
    expect(src).not.toMatch(/جديد/)
  })
})

type R = { id: string; lang: string; text: string; grade: string; attribution: string; cls: string; tier: string }
function envWith(rows: R[]) {
  const db = new DatabaseSync(':memory:')
  for (const m of ['0008_hadiths.sql', '0009_hadith_mawquf.sql']) db.exec(fs.readFileSync(path.join(ROOT, 'worker/migrations', m), 'utf8'))
  const ins = db.prepare('INSERT INTO hadiths (id, lang, title, text, attribution, grade, explanation, hints, categories, class, tier, version) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  for (const r of rows) ins.run(r.id, r.lang, 'عنوان', r.text, r.attribution, r.grade, 'شرح', '["فائدة"]', '["14"]', r.cls, r.tier, 'v1.7.0')
  const d1 = new SqliteD1(db)
  const sql: string[] = []
  let batches = 0
  const spy = {
    prepare: (q: string) => {
      sql.push(q)
      return d1.prepare(q)
    },
    batch: (s: Parameters<SqliteD1['batch']>[0]) => {
      batches++
      return d1.batch(s)
    },
  }
  return { env: { DB: spy } as unknown as Env, sql, batches: () => batches }
}
const ROWS: R[] = [
  { id: '65351', lang: 'ar', text: 'نص تجريبي للحديث', grade: 'صحيح', attribution: 'متفق عليه', cls: 'sahih', tier: '1' },
  { id: '65351', lang: 'en', text: 'A test text', grade: 'Authentic', attribution: 'Agreed upon', cls: 'sahih', tier: '1' },
  { id: '66034', lang: 'ar', text: 'نص أول', grade: 'صحيح', attribution: 'متفق عليه', cls: 'sahih', tier: '1' },
  { id: '65301', lang: 'ar', text: 'نص ثان', grade: 'صحيح', attribution: 'رواه الترمذي', cls: 'sahih', tier: '2' },
  // 65277 (2:198, tier 1 in the map) stored weak here: left out whatever the map says; 65278 has no row at all.
  { id: '65277', lang: 'ar', text: 'نص ضعيف', grade: 'ضعيف', attribution: 'رواه أحمد', cls: 'weak', tier: 'X' },
]
const get = async (env: Env, p: string) => {
  const url = new URL(`https://x.test${p}`)
  const res = await handleAsbab(new Request(url), env, url)
  return res ? { status: res.status, body: (await res.json()) as any } : null
}

describe('GET /api/asbab/:sura/:aya', () => {
  it('الضحى 3: the hadith as stored, its grade and takhrij in their own words; the language row outside Arabic', async () => {
    const { env } = envWith(ROWS)
    const ar = await get(env, '/api/asbab/93/3?lang=ar')
    expect(ar!.status).toBe(200)
    expect(ar!.body.ayah).toBe('quran:93:3')
    expect(ar!.body.items).toHaveLength(1)
    expect(ar!.body.items[0].ar).toMatchObject({ id: '65351', text: 'نص تجريبي للحديث', grade: 'صحيح', attribution: 'متفق عليه', url: 'https://hadeethenc.com/ar/browse/hadith/65351' })
    expect(ar!.body.items[0].tr).toBeUndefined()
    const en = await get(env, '/api/asbab/93/3?lang=en')
    expect(en!.body.items[0].tr).toMatchObject({ lang: 'en', text: 'A test text', grade: 'Authentic' })
    // A language HadeethEnc lacks for it, or one the Worker does not serve: the Arabic alone.
    expect((await get(env, '/api/asbab/93/3?lang=fr'))!.body.items[0].tr).toBeUndefined()
    expect((await get(env, '/api/asbab/93/3?lang=de'))!.body.items[0].tr).toBeUndefined()
  })
  it('no link: no items and not one read', async () => {
    const { env, sql } = envWith(ROWS)
    for (const p of ['/api/asbab/1/1', '/api/asbab/2/255?lang=en', '/api/asbab/93/1']) expect((await get(env, p))!.body.items).toEqual([])
    expect(sql).toEqual([])
  })
  it('several hadiths in their order; a row missing or stored as not accepted is left out', async () => {
    const { env } = envWith(ROWS)
    expect((await get(env, '/api/asbab/5/93'))!.body.items.map((x: any) => x.ar.id)).toEqual(['66034', '65301'])
    expect((await get(env, '/api/asbab/2/198'))!.body.items).toEqual([])
  })
  it('reads by key only: one batch, each statement on (id, lang)', async () => {
    const { env, sql, batches } = envWith(ROWS)
    await getAsbab(env, 5, 93, 'en')
    expect(batches()).toBe(1)
    expect(sql).toHaveLength(4)
    for (const q of sql) expect(q).toMatch(/^SELECT \* FROM hadiths WHERE id = \? AND lang = (?:'ar'|\?)$/)
  })
  it('real suras and ayat only; other paths are not this route', async () => {
    const { env } = envWith(ROWS)
    for (const p of ['/api/asbab/0/1', '/api/asbab/115/1', '/api/asbab/2/0', '/api/asbab/2/287']) expect((await get(env, p))!.status, p).toBe(404)
    for (const p of ['/api/asbab/abc/1', '/api/asbab/93', '/api/asbab/93/3/x', '/api/asbabs/93/3']) expect(await get(env, p), p).toBeNull()
  })
})

describe('offline: the app answers the section and its hadith pages as the Worker does', () => {
  it('the routes', () => {
    const r = (p: string) => offlineRoute(new URL(`https://x.test${p}`), [])
    expect(r('/api/asbab/93/3?lang=en')).toEqual({ kind: 'asbab', sura: 93, aya: 3, lang: 'en' })
    expect(r('/api/hadith/65351?lang=en')).toEqual({ kind: 'asbabHadith', id: '65351', lang: 'en' })
    // Any other hadith page stays the network's, as before.
    expect(r('/api/hadith/1751?lang=en')).toBeNull()
    expect(r('/api/hadith/65351/quiz?lang=en')).toBeNull()
  })
  it('rebuilt from one row per file: the same answers', async () => {
    const { env } = envWith(ROWS)
    const files = new Map<string, string>()
    const langs: Record<string, string[]> = {}
    for (const [s, a] of [[93, 3], [5, 93], [2, 198]]) {
      for (const lang of ['ar', 'en']) {
        for (const it of (await getAsbab(env, s, a, lang)).items) {
          files.set(`${it.ar.id}.ar`, JSON.stringify(it.ar))
          langs[it.ar.id] ??= ['ar']
          if (it.tr) {
            files.set(`${it.ar.id}.${it.tr.lang}`, JSON.stringify(it.tr))
            if (!langs[it.ar.id].includes(it.tr.lang)) langs[it.ar.id].push(it.tr.lang)
          }
        }
      }
    }
    const row = async (id: string, lang: string) => (files.has(`${id}.${lang}`) ? (JSON.parse(files.get(`${id}.${lang}`)!) as HadithRow) : null)
    const manifest = { asbab: langs }
    for (const [s, a] of [[93, 3], [5, 93], [2, 198], [1, 1]]) {
      for (const lang of ['ar', 'en', 'fr', 'de']) expect(await asbabFrom(s, a, lang, manifest, row), `${s}:${a} ${lang}`).toEqual(await getAsbab(env, s, a, lang))
    }
    for (const lang of ['ar', 'en', 'fr']) {
      const u = new URL(`https://x.test/api/hadith/65351?lang=${lang}`)
      const w = await (await handleHadith(new Request(u), env, u))!.json()
      expect(await asbabPairFrom('65351', lang, langs['65351'], row)).toEqual(w)
    }
    // A hadith the build's Worker did not show has no file: nothing from the device.
    expect(await asbabPairFrom('65277', 'ar', langs['65277'], row)).toBeNull()

    // The layer without a connection: the app's files (asbab/<id>.<lang>.json and the manifest), nothing asked.
    const app = new Map<string, string>([...files].map(([k, v]) => [`asbab/${k}.json`, v]))
    app.set('manifest.json', JSON.stringify({ built: '', suras: 0, adhkar: { categories: [], langs: ['ar'] }, hadiths: [], langs: ['ar'], asbab: langs }))
    const calls: string[] = []
    const kept = new Map<string, string>()
    const offline = createOffline({
      kv: { get: async (k) => kept.get(k) ?? null, put: async (k, v) => void kept.set(k, v), remove: async (k) => void kept.delete(k), list: async () => [] },
      net: async (href) => {
        calls.push(href)
        throw new TypeError('Failed to fetch')
      },
      bundle: async (rel) => app.get(rel) ?? null,
      apiBase: 'https://api.test',
      meaningLangs: [],
      timeoutMs: 20,
    })
    const answer = async (p: string) => (await (await offline.answer(`https://api.test${p}`))!.json()) as unknown
    expect(await answer('/api/asbab/93/3?lang=en')).toEqual(await getAsbab(env, 93, 3, 'en'))
    expect(await answer('/api/asbab/5/93?lang=ar')).toEqual(await getAsbab(env, 5, 93, 'ar'))
    expect(await answer('/api/asbab/1/1?lang=ar')).toEqual({ ayah: 'quran:1:1', items: [] })
    const u = new URL('https://x.test/api/hadith/65351?lang=en')
    expect(await answer('/api/hadith/65351?lang=en')).toEqual(await (await handleHadith(new Request(u), env, u))!.json())
    expect(calls.length).toBeGreaterThan(0)
  })
})

const HADITH = path.join(ROOT, 'data/processed/hadith.jsonl')
describe.skipIf(!fs.existsSync(HADITH))('next’s data (data/processed/hadith.jsonl)', () => {
  it('every shown id has its Arabic row, accepted by its grade', () => {
    const want = new Set(ASBAB_ALL_IDS)
    const found = new Map<string, { tier: string; class: string }>()
    for (const line of fs.readFileSync(HADITH, 'utf8').split('\n')) {
      if (!line.includes('"lang":"ar"')) continue
      const m = line.match(/"id":"(\d+)"/)
      if (!m || !want.has(m[1])) continue
      const r = JSON.parse(line)
      if (r.lang === 'ar') found.set(r.id, { tier: r.tier, class: r.class })
    }
    expect([...want].filter((id) => !found.has(id))).toEqual([])
    for (const [id, g] of found) {
      expect(['1', '2', '3'], id).toContain(g.tier)
      expect(['mixed', 'weak', 'mawdu'], id).not.toContain(g.class)
    }
  })
})

// The HadeethEnc routes (worker/src/hadith.ts, reply 0032 B) on an in-memory D1 built from migration 0008.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import dayConfig from '../src/config/hadith-day.json'
import { dayIndex, handleHadith, hadithUrl } from '../src/hadith'
import type { Env } from '../src/index'
import { SqliteD1 } from './d1-sqlite'

const MIGRATION = path.resolve(import.meta.dirname, '../migrations/0008_hadiths.sql')
const N = (dayConfig as { tier1_ar: number }).tier1_ar

type R = { id: string; lang: string; text: string; grade: string; attribution: string; cls: string; tier: string; seq?: number | null; cats?: string[]; hints?: string[] }

function envWith(rows: R[]) {
  const db = new DatabaseSync(':memory:')
  db.exec(fs.readFileSync(MIGRATION, 'utf8'))
  const ins = db.prepare(
    'INSERT INTO hadiths (id, lang, title, text, intro, attribution, grade, explanation, hints, words_meanings, reference, categories, class, tier, version, seq) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
  const cat = db.prepare('INSERT OR REPLACE INTO hadith_categories (category, id, tier) VALUES (?, ?, ?)')
  for (const r of rows) {
    ins.run(r.id, r.lang, 't', r.text, null, r.attribution, r.grade, 'شرح', JSON.stringify(r.hints ?? []), JSON.stringify([{ word: 'ك', meaning: 'م' }]), 'مرجع', JSON.stringify(r.cats ?? []), r.cls, r.tier, 'v1', r.seq ?? null)
    if (r.lang === 'ar') for (const c of r.cats ?? []) cat.run(c, r.id, r.tier)
  }
  return { DB: new SqliteD1(db) } as unknown as Env
}
const get = async (env: Env, p: string) => {
  const url = new URL(`https://x.test${p}`)
  const res = (await handleHadith(new Request(url), env, url))!
  return { status: res.status, body: (await res.json()) as any, cache: res.headers.get('cache-control') }
}

const ROWS: R[] = [
  { id: '100', lang: 'ar', text: 'نص عربي', grade: 'صحيح', attribution: 'متفق عليه', cls: 'sahih', tier: '1', seq: dayIndex() % N, cats: ['301'], hints: ['فائدة'] },
  { id: '100', lang: 'en', text: 'English text', grade: 'Authentic', attribution: 'Agreed upon', cls: 'sahih', tier: '1', cats: ['301'] },
  { id: '200', lang: 'ar', text: 'نص ثان', grade: 'صحيح', attribution: 'رواه أبو داود', cls: 'sahih', tier: '2', cats: ['301'] },
  { id: '300', lang: 'ar', text: 'نص ضعيف', grade: 'ضعيف', attribution: 'رواه الترمذي', cls: 'weak', tier: 'X', cats: ['301'] },
  { id: '400', lang: 'ar', text: 'نص حسن', grade: 'حسن', attribution: 'رواه أحمد', cls: 'hasan', tier: '3', cats: ['301'] },
]

describe('GET /api/hadith/:id', () => {
  it('the Arabic row as stored, and the language row outside Arabic', async () => {
    const env = envWith(ROWS)
    const ar = await get(env, '/api/hadith/100?lang=ar')
    expect(ar.status).toBe(200)
    expect(ar.body.ar).toMatchObject({ id: '100', text: 'نص عربي', grade: 'صحيح', attribution: 'متفق عليه', class: 'sahih', tier: '1', hints: ['فائدة'], url: hadithUrl('100', 'ar') })
    expect(ar.body.ar.words).toEqual([{ word: 'ك', meaning: 'م' }])
    expect(ar.body.tr).toBeUndefined()
    const en = await get(env, '/api/hadith/100?lang=en')
    expect(en.body.tr).toMatchObject({ lang: 'en', text: 'English text', grade: 'Authentic' })
    // No translation in that language: the Arabic alone.
    expect((await get(env, '/api/hadith/100?lang=fr')).body.tr).toBeUndefined()
  })
  it('the weak keep their class (shown with the badge, never as an answer)', async () => {
    expect((await get(envWith(ROWS), '/api/hadith/300')).body.ar).toMatchObject({ class: 'weak', grade: 'ضعيف' })
  })
  it('unknown or malformed ids are not found', async () => {
    const env = envWith(ROWS)
    for (const p of ['/api/hadith/999', '/api/hadith/abc', '/api/hadith/1%27', '/api/hadith/12345678']) expect((await get(env, p)).status).toBe(404)
  })
})

describe('GET /api/today', () => {
  it('the tier-1 hadith whose seq is the Riyadh day index modulo N, cached briefly', async () => {
    const r = await get(envWith(ROWS), '/api/today?lang=en')
    expect(r.body.hadith.ar.id).toBe('100')
    expect(r.body.hadith.tr.text).toBe('English text')
    expect(r.body.day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(r.cache).toMatch(/max-age=600/)
  })
  it('no tier-1 row for the day: null, never a lower tier', async () => {
    const rows = ROWS.map((x) => ({ ...x, seq: null }))
    expect((await get(envWith(rows), '/api/today')).body.hadith).toBeNull()
  })
  it('only a grade of exactly «صحيح» (reply 0031-add14 §2): a qualified or partial grade gives no hadith', async () => {
    for (const grade of ['صحيح دون قوله: (ولم يستدر)', 'صحيحان', 'حسن صحيح', 'صحيح وحديث جابر حسن']) {
      const rows = ROWS.map((x) => (x.id === '100' && x.lang === 'ar' ? { ...x, grade } : x))
      expect((await get(envWith(rows), '/api/today')).body.hadith, grade).toBeNull()
    }
  })
  it('never a mawquf report, once the column exists (migration 0009); absent column = not mawquf', async () => {
    const env = envWith(ROWS)
    const db = (env.DB as unknown as { db: DatabaseSync }).db
    db.exec('ALTER TABLE hadiths ADD COLUMN mawquf INTEGER')
    expect((await get(env, '/api/today')).body.hadith.ar.mawquf).toBe(false)
    db.exec("UPDATE hadiths SET mawquf = 1 WHERE id = '100'")
    expect((await get(env, '/api/today')).body.hadith).toBeNull()
    expect((await get(env, '/api/hadith/100')).body.ar.mawquf).toBe(true)
    // …nor among «أحاديث صحيحة في الموضوع نفسه».
    expect((await get(env, '/api/hadith/300/same-topic')).body.items.map((x: { id: string }) => x.id)).toEqual(['200'])
  })
  it('the day index follows Riyadh: 21:00 UTC is already the next day', () => {
    const before = Date.parse('2026-10-13T20:59:00Z')
    expect(dayIndex(before + 60_000 * 2)).toBe(dayIndex(before) + 1)
  })
})

describe('GET /api/hadith/:id/same-topic', () => {
  it('sahih only (tiers 1-2, class sahih), not the hadith itself, not the weak or the hasan', async () => {
    const r = await get(envWith(ROWS), '/api/hadith/300/same-topic')
    expect(r.body.items.map((x: { id: string }) => x.id).sort()).toEqual(['100', '200'])
    expect(r.body.items[0]).toHaveProperty('grade')
  })
  it('no category: nothing', async () => {
    const rows = ROWS.map((x) => ({ ...x, cats: [] }))
    expect((await get(envWith(rows), '/api/hadith/300/same-topic')).body.items).toEqual([])
  })
})

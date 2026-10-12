import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import type { Env } from '../src/index'
import { handleReader } from '../src/reader'
import { SqliteD1 } from './d1-sqlite'

const MIGRATION = path.resolve(import.meta.dirname, '../migrations/0006_mukhtasar.sql')

function envWith(flag: string | undefined, withTable = true): Env {
  const db = new DatabaseSync(':memory:')
  if (withTable) {
    db.exec(fs.readFileSync(MIGRATION, 'utf8'))
    db.prepare('INSERT INTO mukhtasar (lang, sura, aya, text, book_id, book_title, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run('en', 2, 255, 'text as received', 7, 'Al-Mukhtasar', '2026-10-12')
  }
  return { DB: new SqliteD1(db), MUKHTASAR_PUBLIC: flag } as unknown as Env
}
const get = async (env: Env, p: string) => {
  const url = new URL(`https://i-muslim.test${p}`)
  const res = (await handleReader(new Request(url), env, url))!
  return { status: res.status, body: (await res.json()) as any }
}

describe('MUKHTASAR_PUBLIC (reply 0031-add9)', () => {
  it('is "false" in both environments of wrangler.jsonc', () => {
    const cfg = fs.readFileSync(path.resolve(import.meta.dirname, '../wrangler.jsonc'), 'utf8')
    expect(cfg.match(/"MUKHTASAR_PUBLIC": "false"/g)).toHaveLength(2)
    expect(cfg).not.toMatch(/"MUKHTASAR_PUBLIC": "true"/)
  })
  it('404 while switched off, whatever the table holds', async () => {
    for (const flag of [undefined, 'false', 'TRUE', '1']) expect((await get(envWith(flag), '/api/mukhtasar/2/255?lang=en')).status).toBe(404)
  })
  it('switched on: the text as stored, by (lang, sura, aya)', async () => {
    const env = envWith('true')
    expect((await get(env, '/api/mukhtasar/2/255?lang=en')).body).toEqual({ text: 'text as received', book_title: 'Al-Mukhtasar', lang: 'en' })
    expect((await get(env, '/api/mukhtasar/2/256?lang=en')).body).toEqual({ found: false })
    expect((await get(env, '/api/mukhtasar/2/255?lang=fr')).body).toEqual({ found: false })
  })
  it('switched on: no Arabic, no unknown language, no sura outside 1-114', async () => {
    const env = envWith('true')
    for (const p of ['/api/mukhtasar/2/255?lang=ar', '/api/mukhtasar/2/255?lang=xx', '/api/mukhtasar/2/255', '/api/mukhtasar/115/1?lang=en', '/api/mukhtasar/0/1?lang=en'])
      expect((await get(env, p)).status).toBe(404)
  })
  it('switched on before migration 0006: no text, no error', async () => {
    expect((await get(envWith('true', false), '/api/mukhtasar/2/255?lang=en')).body).toEqual({ found: false })
  })
})

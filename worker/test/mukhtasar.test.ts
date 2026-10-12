import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import type { Env } from '../src/index'
import { handleReader } from '../src/reader'
import { SqliteD1 } from './d1-sqlite'

const MIG = (f: string) => fs.readFileSync(path.resolve(import.meta.dirname, '../migrations', f), 'utf8')

function envWith(vars: { MUKHTASAR_PUBLIC?: string; MUKHTASAR_QURANENC?: string }, withTables = true): Env {
  const db = new DatabaseSync(':memory:')
  if (withTables) {
    db.exec(MIG('0006_mukhtasar.sql'))
    db.exec(MIG('0010_tafsir_translations.sql'))
    db.prepare('INSERT INTO mukhtasar (lang, sura, aya, text, book_id, book_title, fetched_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run('en', 2, 255, 'publisher text', 7, 'Al-Mukhtasar', '2026-10-12')
    const qe = db.prepare('INSERT INTO tafsir_translations (source, lang, sura, aya, text, version, source_key) VALUES (?, ?, ?, ?, ?, ?, ?)')
    qe.run('quranenc', 'fr', 2, 255, 'texte reçu', '1.0.0', 'french_mokhtasar')
    qe.run('quranenc', 'ar', 2, 255, 'نص عربي', '1.0.0', 'arabic_mokhtasar')
    qe.run('quranenc', 'it', 2, 255, 'testo', '1.0.0', 'italian_mokhtasar')
  }
  return { DB: new SqliteD1(db), ...vars } as unknown as Env
}
const get = async (env: Env, p: string) => {
  const url = new URL(`https://i-muslim.test${p}`)
  const res = (await handleReader(new Request(url), env, url))!
  return { status: res.status, body: (await res.json()) as any }
}

describe('Mukhtasar switches (replies 0031-add9 and add14)', () => {
  it('in both environments: QuranEnc on, mokhtasr.com off', () => {
    const cfg = fs.readFileSync(path.resolve(import.meta.dirname, '../wrangler.jsonc'), 'utf8')
    expect(cfg.match(/"MUKHTASAR_PUBLIC": "false"/g)).toHaveLength(2)
    expect(cfg).not.toMatch(/"MUKHTASAR_PUBLIC": "true"/)
    expect(cfg.match(/"MUKHTASAR_QURANENC": "true"/g)).toHaveLength(2)
  })
  it('404 while both are off', async () => {
    for (const v of [{}, { MUKHTASAR_PUBLIC: 'false', MUKHTASAR_QURANENC: 'false' }, { MUKHTASAR_PUBLIC: 'TRUE' }]) expect((await get(envWith(v), '/api/mukhtasar/2/255?lang=fr')).status).toBe(404)
  })
  it('QuranEnc on: its text with version and key; the publisher’s rows stay unseen while its switch is off', async () => {
    const env = envWith({ MUKHTASAR_QURANENC: 'true', MUKHTASAR_PUBLIC: 'false' })
    expect((await get(env, '/api/mukhtasar/2/255?lang=fr')).body).toEqual({ text: 'texte reçu', book_title: 'المختصر في تفسير القرآن الكريم', lang: 'fr', source: 'quranenc', version: '1.0.0', source_key: 'french_mokhtasar' })
    expect((await get(env, '/api/mukhtasar/2/255?lang=en')).body).toEqual({ found: false })
  })
  it('Arabic and Italian are never served (rule 7; Italian kept only)', async () => {
    const env = envWith({ MUKHTASAR_QURANENC: 'true', MUKHTASAR_PUBLIC: 'true' })
    for (const p of ['/api/mukhtasar/2/255?lang=ar', '/api/mukhtasar/2/255?lang=it', '/api/mukhtasar/2/255?lang=xyz', '/api/mukhtasar/115/1?lang=fr']) expect((await get(env, p)).status).toBe(404)
  })
  it('mokhtasr.com on (only in a private preview): its row when QuranEnc has none', async () => {
    const env = envWith({ MUKHTASAR_QURANENC: 'true', MUKHTASAR_PUBLIC: 'true' })
    expect((await get(env, '/api/mukhtasar/2/255?lang=en')).body).toEqual({ text: 'publisher text', book_title: 'Al-Mukhtasar', lang: 'en', source: 'mokhtasr.com' })
  })
  it('before the migrations: no text, no error', async () => {
    expect((await get(envWith({ MUKHTASAR_QURANENC: 'true' }, false), '/api/mukhtasar/2/255?lang=fr')).body).toEqual({ found: false })
  })
})

// POST /api/lang-request (reply 0033 §أ1): validation, normalisation, the daily limit (bump, scope 'lang', 5 a day) and
// the monthly upsert keyed by (text, month), with no IP, no exact time and no identifier stored.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import type { Env } from '../src/index'
import { countRequest, handleLangRequest, LANG_REQUESTS_PER_DAY, requestText } from '../src/lang-request'
import { normalizeName } from '../../shared/lang-norm'
import { SqliteD1 } from './d1-sqlite'

const MIG = path.resolve(import.meta.dirname, '../migrations')
function envWith(): Env & { db: DatabaseSync } {
  const db = new DatabaseSync(':memory:')
  db.exec(fs.readFileSync(path.join(MIG, '0001_init.sql'), 'utf8'))
  db.exec(fs.readFileSync(path.join(MIG, '0012_lang_requests.sql'), 'utf8'))
  return { DB: new SqliteD1(db) as unknown as D1Database, IP_SALT: 'test-salt', db } as unknown as Env & { db: DatabaseSync }
}
const post = (env: Env, body: unknown, ip = '203.0.113.7') =>
  handleLangRequest(
    new Request('https://x/api/lang-request', { method: 'POST', headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip }, body: typeof body === 'string' ? body : JSON.stringify(body) }),
    env,
  )

describe('validation and normalisation', () => {
  it('accepts 2 to 40 letters and spaces, folded the same way as on the device', () => {
    expect(requestText('hmong')).toBe('hmong')
    expect(requestText('Hmong')).toBe('hmong')
    expect(requestText('  Kiswahili   ya  Kenya ')).toBe('kiswahili ya kenya')
    expect(requestText('الهَوسا')).toBe('الهوسا') // the server folds; the «ال» was already dropped on the device
    expect(requestText(normalizeName('الهَوسا'))).toBe('هوسا')
    // A name that begins with «أل» keeps it, and its forms meet in one text: German is one row, not three
    expect(requestText(normalizeName('ألماني'))).toBe('الماني')
    expect(requestText(normalizeName('ألمانية'))).toBe('المانيه')
    expect(requestText(normalizeName('الألمانية'))).toBe('المانيه')
    expect(requestText(normalizeName('ألباني'))).toBe('الباني')
    expect(requestText(normalizeName('الألبانية'))).toBe('البانيه')
    expect(requestText('Ελληνικά')).toBe('ελληνικα')
  })
  it('refuses anything else', () => {
    for (const v of ['', 'a', 'x'.repeat(41), 'hmong2', 'hm-ong', '<script>', 'a b!', 42, null, undefined, ['hmong'], { t: 'hmong' }, 'x'.repeat(201)]) expect(requestText(v), String(v)).toBeNull()
    expect(requestText('x'.repeat(40))).toBe('x'.repeat(40))
  })
  it('the migration can run twice (idempotent)', () => {
    const env = envWith()
    expect(() => env.db.exec(fs.readFileSync(path.join(MIG, '0012_lang_requests.sql'), 'utf8'))).not.toThrow()
  })
})

describe('the route', () => {
  it('counts per (text, month): two requests for the same name are one row with 2', async () => {
    const env = envWith()
    expect((await post(env, { text: 'hmong' })).status).toBe(200)
    expect((await post(env, { text: 'Hmong' }, '198.51.100.1')).status).toBe(200)
    expect((await post(env, { text: 'yoruba' })).status).toBe(200)
    const rows = env.db.prepare('SELECT * FROM lang_requests ORDER BY text').all() as { text: string; month: string; count: number }[]
    expect(rows).toEqual([
      { text: 'hmong', month: expect.stringMatching(/^\d{4}-\d{2}$/), count: 2 },
      { text: 'yoruba', month: expect.stringMatching(/^\d{4}-\d{2}$/), count: 1 },
    ])
  })
  it('stores no IP, no time and no identifier: the table has only text, month and count', () => {
    const env = envWith()
    const cols = (env.db.prepare("SELECT name FROM pragma_table_info('lang_requests')").all() as { name: string }[]).map((c) => c.name)
    expect(cols).toEqual(['text', 'month', 'count'])
  })
  it('a new month starts a new row', async () => {
    const env = envWith()
    await countRequest(env, 'hmong', Date.parse('2026-10-31T12:00:00Z'))
    await countRequest(env, 'hmong', Date.parse('2026-10-31T22:00:00Z')) // 01:00 on 1 November in Riyadh
    expect(env.db.prepare('SELECT month, count FROM lang_requests ORDER BY month').all()).toEqual([
      { month: '2026-10', count: 1 },
      { month: '2026-11', count: 1 },
    ])
  })
  it('refuses bad input with 400 and counts nothing', async () => {
    const env = envWith()
    for (const b of [{ text: 'a' }, { text: 'abc1' }, {}, 'not json']) expect((await post(env, b)).status).toBe(400)
    expect(env.db.prepare('SELECT count(*) AS n FROM lang_requests').get()).toEqual({ n: 0 })
    expect(env.db.prepare('SELECT count(*) AS n FROM usage_daily').get()).toEqual({ n: 0 })
  })
  it('5 a day per device, then 429; the limit is the shared daily counter under its own scope', async () => {
    const env = envWith()
    for (let i = 0; i < LANG_REQUESTS_PER_DAY; i++) expect((await post(env, { text: `lang ${'abcdef'[i]}` })).status).toBe(200)
    const sixth = await post(env, { text: 'one more' })
    expect(sixth.status).toBe(429)
    expect(await sixth.json()).toEqual({ ok: false, error: 'rate_limited' })
    expect((await post(env, { text: 'one more' }, '192.0.2.44')).status).toBe(200) // another device
    const keys = (env.db.prepare('SELECT ip_hash FROM usage_daily').all() as { ip_hash: string }[]).map((r) => r.ip_hash)
    expect(keys.every((k) => /^lang:[0-9a-f]{64}$/.test(k))).toBe(true)
    expect(keys.some((k) => k.includes('203.0.113.7'))).toBe(false)
    expect(env.db.prepare("SELECT count FROM lang_requests WHERE text = 'one more'").get()).toEqual({ count: 1 })
  })
  it('500 without the salt (no limit can be kept)', async () => {
    const env = envWith()
    delete (env as { IP_SALT?: string }).IP_SALT
    expect((await post(env, { text: 'hmong' })).status).toBe(500)
  })
})

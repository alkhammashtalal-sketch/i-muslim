// The content language beside the interface language (reply 0033 §أ1, decision 2): an answer asked with an English
// interface and Persian content carries the ayat's meanings in Persian (body.ml), from the card built at answer time,
// so a cached answer gets them too; the generated answer stays in the interface language. Unknown or non-meaning
// languages fall back to the interface language.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AnswerResponse } from '../../shared/api'
import { handleAsk, type AskDeps } from '../src/ask'
import type { Env } from '../src/index'
import { mockReply } from '../src/llm'
import type { RetrieveResult } from '../src/retrieve'
import { SqliteD1 } from './d1-sqlite'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SAMPLES = ['quran.sample.jsonl', 'aqeedah.sample.jsonl'].flatMap((f) =>
  fs.readFileSync(path.join(ROOT, 'data/samples', f), 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>),
)
const COLUMNS = ['id', 'source', 'kind', 'ref', 'url', 'text', 'text_en', 'text_search', 'embed_text', 'book', 'chapter', 'sura', 'aya', 'page']

function sampleDb(): SqliteD1 {
  const db = new DatabaseSync(':memory:')
  const files = fs.readdirSync(path.join(ROOT, 'worker/migrations')).filter((f) => f.endsWith('.sql')).sort()
  const run = (f: string) => db.exec(fs.readFileSync(path.join(ROOT, 'worker/migrations', f), 'utf8'))
  files.filter((f) => f < '0004').forEach(run)
  const ins = db.prepare(`INSERT INTO passages (${COLUMNS.join(', ')}, extra) VALUES (${COLUMNS.map(() => '?').join(', ')}, ?)`)
  for (const r of SAMPLES) ins.run(...COLUMNS.map((c) => (r[c] ?? null) as string | number | null), JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => !COLUMNS.includes(k)))))
  files.filter((f) => f >= '0004').forEach(run)
  const tr = db.prepare('INSERT INTO ayah_translations (lang, sura, aya, text, translator, version, source_key) VALUES (?, ?, ?, ?, ?, ?, ?)')
  tr.run('fa', 5, 6, 'متن فارسی ۵:۶', 'Rowwad', '1.1.3', 'persian_ih')
  tr.run('ps', 5, 6, 'پښتو متن ۵:۶', 'Rowwad', '1.0.1', 'pashto_rwwad')
  tr.run('tr', 5, 6, 'Türkçe metin 5:6', 'Rowwad', '1.0.4', 'turkish_rwwad')
  return new SqliteD1(db)
}

const ids = ['quran:5:6', 'quran:2:183', 'aqeedah:usul:001']
const retrieved = (): RetrieveResult => ({
  passages: ids.map((id, i) => ({ id, score: 1 / (i + 61), foundBy: { vector: i + 1 } })),
  ranked: ids.map((id, i) => ({ id, score: 1 / (i + 61), foundBy: { vector: i + 1 } })),
  abstain: false,
  topVectorScore: 0.6,
  topics: [],
  rowsRead: 0,
})

let env: Env
let deps: AskDeps
let uiLangs: string[]
beforeEach(() => {
  env = { DB: sampleDb() as unknown as D1Database, IP_SALT: 'test-salt', LLM_MODE: 'mock', EXPLAIN_MODE: 'generated' } as Env
  uiLangs = []
  deps = {
    retrieve: async () => retrieved(),
    callLlm: async (_env, _messages, sent, uiLang) => {
      uiLangs.push(uiLang)
      return { raw: mockReply(sent, uiLang), usage: { in: 0, out: 0 }, mode: 'mock' }
    },
  }
})
const ask = async (body: Record<string, unknown>) =>
  (await (await handleAsk(new Request('https://x/api/ask', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.9' }, body: JSON.stringify(body) }), env, deps)).json()) as AnswerResponse
const meaningOf = (a: AnswerResponse) => a.quotes.find((q) => q.id === 'quran:5:6')?.meaning

describe('POST /api/ask with a content language (ml)', () => {
  it('English interface, Persian content: the meaning in Persian; the model still answers in English', async () => {
    const a = await ask({ q: 'How do I perform ablution?', lang: 'en', ml: 'fa' })
    expect(a.type).toBe('answer')
    expect(meaningOf(a)).toMatchObject({ lang: 'fa', text: 'متن فارسی ۵:۶', source_key: 'persian_ih' })
    expect(uiLangs).toEqual(['en'])
    expect(a.quotes.find((q) => q.id === 'quran:5:6')?.text_en).toBeTruthy() // Sahih International stays one press away
  })
  it('the cached answer gets the meaning of the asker’s own content language', async () => {
    await ask({ q: 'How do I perform ablution?', lang: 'en', ml: 'fa' })
    const second = await ask({ q: 'How do I perform ablution?', lang: 'en', ml: 'ps' })
    expect(second.fromCache).toBe(true)
    expect(meaningOf(second)).toMatchObject({ lang: 'ps', text: 'پښتو متن ۵:۶' })
    const third = await ask({ q: 'How do I perform ablution?', lang: 'en' })
    expect(meaningOf(third)).toBeUndefined() // English: Sahih International (text_en), no row
  })
  it('without ml, or with one that is not a served translation, the interface language decides (as before)', async () => {
    expect(meaningOf(await ask({ q: 'كيف أتوضأ؟', lang: 'tr' }))).toMatchObject({ lang: 'tr' })
    expect(meaningOf(await ask({ q: 'كيف أتوضأ؟', lang: 'tr', ml: 'xx' }))).toMatchObject({ lang: 'tr' })
    expect(meaningOf(await ask({ q: 'كيف أتوضأ؟', lang: 'ar', ml: 'ar' }))).toBeUndefined()
    expect(meaningOf(await ask({ q: 'كيف أتوضأ؟', lang: 'en', ml: 42 }))).toBeUndefined()
  })
})

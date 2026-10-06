// Answer engine (command 06), all in LLM_MODE=mock style: retrieval and the model are injected.
// The database is built from worker/migrations + data/samples (in git), so these tests need no full data.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnswerResponse, ReferralResponse } from '../../shared/api'
import { handleAsk, type AskDeps } from '../src/ask'
import gateConfig from '../src/config/gate.json'
import limits from '../src/config/limits.json'
import { gate, isDisputedTopic, type GateRule } from '../src/gate'
import type { Env } from '../src/index'
import { riyadhMonth } from '../src/lib/keys'
import { mockReply } from '../src/llm'
import { handleReport } from '../src/report'
import type { RetrieveResult } from '../src/retrieve'
import { verify } from '../src/verify'
import { SqliteD1 } from './d1-sqlite'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SAMPLES = ['quran.sample.jsonl', 'aqeedah.sample.jsonl'].flatMap((f) =>
  fs
    .readFileSync(path.join(ROOT, 'data/samples', f), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l) as Record<string, unknown>),
)
const raw = (id: string) => SAMPLES.find((r) => r.id === id)!
const COLUMNS = ['id', 'source', 'kind', 'ref', 'url', 'text', 'text_en', 'text_search', 'embed_text', 'book', 'chapter', 'sura', 'aya', 'page']

function sampleDb(): SqliteD1 {
  const db = new DatabaseSync(':memory:')
  const files = fs.readdirSync(path.join(ROOT, 'worker/migrations')).filter((f) => f.endsWith('.sql')).sort()
  const run = (f: string) => db.exec(fs.readFileSync(path.join(ROOT, 'worker/migrations', f), 'utf8'))
  files.filter((f) => f < '0004').forEach(run)
  const ins = db.prepare(`INSERT INTO passages (${COLUMNS.join(', ')}, extra) VALUES (${COLUMNS.map(() => '?').join(', ')}, ?)`)
  for (const r of SAMPLES) {
    const extra = Object.fromEntries(Object.entries(r).filter(([k]) => !COLUMNS.includes(k)))
    ins.run(...COLUMNS.map((c) => (r[c] ?? null) as string | number | null), JSON.stringify(extra))
  }
  files.filter((f) => f >= '0004').forEach(run)
  return new SqliteD1(db)
}

const retrieved = (ids: string[], abstain = false): RetrieveResult => ({
  passages: abstain ? [] : ids.map((id, i) => ({ id, score: 1 / (i + 61), foundBy: { vector: i + 1 } })),
  ranked: ids.map((id, i) => ({ id, score: 1 / (i + 61), foundBy: { vector: i + 1 } })),
  abstain,
  topVectorScore: 0.6,
  topics: [],
  rowsRead: 0,
})

let env: Env
let db: SqliteD1
let deps: AskDeps & { calls: { retrieve: number; llm: number } }
let reply: (sent: string[], uiLang?: string) => unknown
let ids: string[]

const ask = (q: string, extra: Record<string, unknown> = {}, ip = '203.0.113.7') =>
  handleAsk(
    new Request('https://x/api/ask', { method: 'POST', headers: { 'cf-connecting-ip': ip }, body: JSON.stringify({ q, lang: 'ar', ...extra }) }),
    env,
    deps,
  )

beforeEach(() => {
  db = sampleDb()
  env = { DB: db as unknown as D1Database, IP_SALT: 'test-salt', LLM_MODE: 'mock', EXPLAIN_MODE: 'generated' } as Env
  ids = ['quran:5:6', 'quran:2:183', 'aqeedah:usul:001']
  reply = (sent, uiLang) => mockReply(sent, uiLang)
  const calls = { retrieve: 0, llm: 0 }
  deps = {
    calls,
    retrieve: async () => {
      calls.retrieve++
      return retrieved(ids)
    },
    callLlm: async (_env, _messages, sent, uiLang) => {
      calls.llm++
      return { raw: reply(sent, uiLang), usage: { in: 0, out: 0 }, mode: 'mock' }
    },
  }
})
afterEach(() => vi.restoreAllMocks())

describe('verify (rule 6)', () => {
  const sent = ['quran:5:6', 'quran:2:183']
  const sacred = { 'quran:5:6': raw('quran:5:6').text as string }
  const base = { level: 'A', answerable: true, disputed: false, used_passages: sent }

  it('drops invented passage ids and abstains when the direct answer has no real support', () => {
    const v = verify({ ...base, used_passages: ['quran:99:99'], direct: { text: 'جملة', cites: ['quran:99:99'] }, explanation: [] }, sent, sacred, 'generated')
    expect(v).toEqual({ kind: 'abstain', reason: 'direct_without_valid_cite' })
  })

  it('removes a sentence without a valid citation and keeps the supported one', () => {
    const v = verify(
      { ...base, direct: { text: 'الجواب', cites: ['quran:5:6', 'bogus'] }, explanation: [{ text: 'بلا شاهد', cites: [] }, { text: 'بشاهد', cites: ['quran:2:183'] }] },
      sent,
      sacred,
      'generated',
    )
    expect(v.kind).toBe('answer')
    if (v.kind !== 'answer') return
    expect(v.direct.cites).toEqual(['quran:5:6'])
    expect(v.explanation).toEqual([{ text: 'بشاهد', cites: ['quran:2:183'] }])
    expect(v.dropped).toBe(1)
  })

  it('turns level C/D into a referral and "disputed" into a disputed referral, with no generated text', () => {
    const d = { text: 'x', cites: sent }
    expect(verify({ ...base, level: 'D', direct: d }, sent, sacred, 'generated')).toEqual({ kind: 'referral', level: 'D', disputed: false })
    expect(verify({ ...base, level: 'C', direct: d }, sent, sacred, 'generated')).toEqual({ kind: 'referral', level: 'C', disputed: false })
    expect(verify({ ...base, disputed: true, direct: d }, sent, sacred, 'generated')).toEqual({ kind: 'referral', level: 'C', disputed: true })
  })

  it('abstains on unanswerable, malformed or non-object output', () => {
    expect(verify({ ...base, answerable: false }, sent, sacred, 'generated').kind).toBe('abstain')
    expect(verify({ level: 'Z' }, sent, sacred, 'generated').kind).toBe('abstain')
    expect(verify('not json', sent, sacred, 'generated').kind).toBe('abstain')
    expect(verify(null, sent, sacred, 'generated').kind).toBe('abstain')
  })

  it('drops a generated sentence that reproduces six or more words of a verse', () => {
    const verseWords = (raw('quran:5:6').text as string).split(/\s+/).slice(0, 8).join(' ')
    const v = verify(
      { ...base, direct: { text: 'الجواب', cites: ['quran:5:6'] }, explanation: [{ text: `قال تعالى ${verseWords}`, cites: ['quran:5:6'] }] },
      sent,
      sacred,
      'generated',
    )
    expect(v.kind === 'answer' && v.explanation.length).toBe(0)
  })

  it('in tafsir_only mode keeps only the chosen passages, with no generated text', () => {
    const v = verify({ ...base, direct: { text: 'ignored', cites: ['quran:5:6'] }, explanation: [{ text: 'ignored', cites: ['quran:5:6'] }] }, sent, sacred, 'tafsir_only')
    expect(v).toMatchObject({ kind: 'answer', direct: { text: '', cites: ['quran:5:6'] }, explanation: [] })
  })
})

describe('level gate', () => {
  const rules = gateConfig.rules as GateRule[]
  it.each([
    ['هل يجوز لي أن أطلق زوجتي؟', 'D'],
    ['هل يجوز الاحتفال بالمولد النبوي؟', 'C'],
    ['توفي أبي وترك بيتًا، كم نصيبي؟', 'D'],
    ['Is it permissible for me to skip fasting?', 'D'],
    ['Sunni or Shia, which is right?', 'C'],
  ])('%s → %s', (q, level) => expect(gate(q, rules)?.level).toBe(level))
  it.each(['كيف أتوضأ؟', 'ما حكم الخمر في الإسلام؟', 'Can I become Muslim?', 'What should I know about Islam?', 'ما أركان الإيمان؟'])(
    'lets through: %s',
    (q) => expect(gate(q, rules)).toBeNull(),
  )
  it('matches the disputed-topics list on whole normalized words', () => {
    expect(isDisputedTopic('ما حكم صلاة الجماعة؟', ['صلاة الجماعة'])).toBe(true)
    expect(isDisputedTopic('ما حكم الجماعات؟', ['صلاة الجماعة'])).toBe(false)
    expect(isDisputedTopic('أي سؤال', [])).toBe(false)
  })
})

describe('POST /api/ask', () => {
  it('builds the card from D1: verbatim text, verified, al-Muyassar excerpt, considered passages', async () => {
    const res = await ask('كيف أتوضأ؟')
    expect(res.status).toBe(200)
    const a = (await res.json()) as AnswerResponse
    expect(a.type).toBe('answer')
    expect(a.fromCache).toBe(false)
    expect(a.machineTranslated).toBe(false)
    expect(a.considered).toEqual(ids)
    expect(a.quotes.map((q) => q.id)).toEqual(['quran:5:6', 'quran:2:183'])
    for (const q of a.quotes) {
      expect(Buffer.from(q.text).equals(Buffer.from(raw(q.id).text as string))).toBe(true)
      expect(q.verified).toBe(true)
      expect(q.tafsirExcerpt).toBe(raw(q.id).muyassar)
    }
    expect(a.tafsir?.map((t) => t.name)).toContain('تفسير السعدي')
  })

  it('serves A/B answers from the cache the second time, without retrieval or a model call', async () => {
    await ask('كيف أتوضأ؟')
    const second = (await (await ask('كيف   أتوضأ')).json()) as AnswerResponse
    expect(second.fromCache).toBe(true)
    expect(deps.calls.llm).toBe(1)
    expect(deps.calls.retrieve).toBe(1)
  })

  it('refers a personal-case question at the gate: no retrieval, no model, nothing cached', async () => {
    const r = (await (await ask('هل يجوز لي أن أطلق زوجتي؟')).json()) as ReferralResponse
    expect(r).toMatchObject({ type: 'referral', level: 'D', message: 'هذا السؤال يحتاج فتوى من جهة مختصة', link: 'https://www.alifta.gov.sa' })
    expect(deps.calls).toEqual({ retrieve: 0, llm: 0 })
    const n = await db.prepare('SELECT count(*) AS n FROM cache').first<{ n: number }>()
    expect(n?.n).toBe(0)
  })

  it('keeps mock-mode answers out of the live cache', async () => {
    await ask('كيف أتوضأ؟')
    env.LLM_MODE = 'live'
    const a = (await (await ask('كيف أتوضأ؟')).json()) as AnswerResponse
    expect(a.fromCache).toBe(false)
  })

  it('does not serve an answer cached under an earlier CACHE_VERSION (made before a retrieval or prompt change)', async () => {
    const { sha256Hex } = await import('../src/lib/keys')
    const { tokenize } = await import('../src/lib/normalize')
    const { CACHE_VERSION } = await import('../src/ask')
    await ask('كيف أتوضأ؟')
    const row = db.db.prepare('SELECT key, lang, level, answer FROM cache').get() as { key: string; lang: string; level: string; answer: string }
    const nq = tokenize('كيف أتوضأ؟').join(' ')
    expect(row.key).toBe(await sha256Hex(`${nq}|ar|0|generated|mock|v${CACHE_VERSION}`))
    // The same answer stored under the previous version's key (and under the key before versions existed).
    db.db.prepare('DELETE FROM cache').run()
    for (const old of [`${nq}|ar|0|generated|mock|v${CACHE_VERSION - 1}`, `${nq}|ar|0|generated|mock`]) {
      db.db.prepare('INSERT INTO cache (key, lang, level, answer) VALUES (?, ?, ?, ?)').run(await sha256Hex(old), row.lang, row.level, row.answer)
    }
    const a = (await (await ask('كيف أتوضأ؟')).json()) as AnswerResponse
    expect(a.fromCache).toBe(false)
    expect(deps.calls.llm).toBe(2)
  })

  it('an ayah in the card carries its meaning in the reader\'s language when there is one (command 22)', async () => {
    db.db.prepare('INSERT INTO ayah_translations (lang, sura, aya, text, translator) VALUES (?, ?, ?, ?, ?)').run('ur', 5, 6, 'اے ایمان والو', 'جالندربرى')
    const ur = (await (await ask('وضو کیسے کریں؟', { lang: 'ur' })).json()) as AnswerResponse
    expect(ur.quotes.find((q) => q.id === 'quran:5:6')?.meaning).toEqual({ lang: 'ur', text: 'اے ایمان والو', translator: 'جالندربرى' })
    const hi = (await (await ask('वुज़ू कैसे करें?', { lang: 'hi' })).json()) as AnswerResponse
    expect(hi.quotes.find((q) => q.id === 'quran:5:6')?.meaning).toBeUndefined()
  })

  it('never caches a model-level C/D answer', async () => {
    reply = (sent) => ({ ...(mockReply(sent) as object), level: 'D' })
    const r = (await (await ask('سؤال يبدو عامًا')).json()) as ReferralResponse
    expect(r.type).toBe('referral')
    expect((await db.prepare('SELECT count(*) AS n FROM cache').first<{ n: number }>())?.n).toBe(0)
  })

  it('a disputed answer shows the retrieved texts with references and nothing generated', async () => {
    reply = (sent) => ({ ...(mockReply(sent) as object), disputed: true })
    const r = (await (await ask('مسألة')).json()) as ReferralResponse
    expect(r).toMatchObject({ type: 'referral', level: 'C', disputed: true, message: 'هذه المسألة فيها أكثر من قول عند أهل العلم' })
    expect(r.quotes?.map((q) => q.id)).toEqual(ids)
    expect(JSON.stringify(r)).not.toContain('وضع المحاكاة')
  })

  it('abstains without calling the model when retrieval is below the threshold', async () => {
    deps.retrieve = async () => retrieved(ids, true)
    const r = await (await ask('من فاز بكأس العالم؟')).json()
    expect(r).toMatchObject({ type: 'abstain', message: 'لم أجد نصًا في المصادر المعتمدة يطابق سؤالك، ولا أُنشئ نصوصًا من عندي.' })
    expect(deps.calls.llm).toBe(0)
  })

  it('abstains (no substitute text) when the model fails or invents every passage', async () => {
    deps.callLlm = async () => ({ raw: null, usage: { in: 0, out: 0 }, mode: 'live', error: 'timeout_or_network' })
    expect((await (await ask('سؤال أول')).json()).type).toBe('abstain')
    deps.callLlm = async () => ({
      raw: { level: 'A', answerable: true, used_passages: ['quran:1:999'], direct: { text: 'x', cites: ['quran:1:999'] }, explanation: [] },
      usage: { in: 0, out: 0 },
      mode: 'live',
    })
    expect((await (await ask('سؤال ثان')).json()).type).toBe('abstain')
  })

  it('on_demand (rule 12): the card has the texts only, no direct answer and no explanation', async () => {
    env.EXPLAIN_MODE = 'on_demand'
    let maxTokens = 0
    deps.callLlm = async (_e, _m, sent, uiLang, max) => {
      deps.calls.llm++
      maxTokens = max ?? 0
      return { raw: { ...(mockReply(sent, uiLang) as object) }, usage: { in: 0, out: 0 }, mode: 'mock' }
    }
    const a = (await (await ask('كيف أتوضأ؟')).json()) as AnswerResponse
    expect(a.type).toBe('answer')
    expect(a.direct).toBeUndefined()
    expect(a.explanation).toEqual([])
    expect(a.explain_mode).toBe('on_demand')
    expect(a.quotes.map((q) => q.id)).toEqual(['quran:5:6', 'quran:2:183'])
    expect(a.quotes.every((q) => q.verified)).toBe(true)
    expect(JSON.stringify(a)).not.toContain('وضع المحاكاة')
    expect(maxTokens).toBe(200)
  })

  it('on_demand abstains when the model chooses no sent passage', async () => {
    env.EXPLAIN_MODE = 'on_demand'
    reply = () => ({ level: 'A', answerable: true, used_passages: ['quran:99:1'] })
    expect((await (await ask('سؤال')).json()).type).toBe('abstain')
  })

  it('keeps the cache separate between explanation modes', async () => {
    env.EXPLAIN_MODE = 'generated'
    await ask('كيف أتوضأ؟')
    env.EXPLAIN_MODE = 'on_demand'
    const a = (await (await ask('كيف أتوضأ؟')).json()) as AnswerResponse
    expect(a.fromCache).toBe(false)
    expect(a.direct).toBeUndefined()
    const b = (await (await ask('كيف أتوضأ؟')).json()) as AnswerResponse
    expect(b.fromCache).toBe(true)
    expect(b.direct).toBeUndefined()
  })

  it('defaults to on_demand when EXPLAIN_MODE is missing or unknown', async () => {
    for (const m of [undefined, 'something']) {
      env.EXPLAIN_MODE = m
      const a = (await (await ask(`كيف أتوضأ؟ ${m}`)).json()) as AnswerResponse
      expect(a.explain_mode).toBe('on_demand')
      expect(a.direct).toBeUndefined()
    }
  })

  it('generated mode is unchanged: direct answer and explanation are shown', async () => {
    env.EXPLAIN_MODE = 'generated'
    const a = (await (await ask('كيف أتوضأ؟')).json()) as AnswerResponse
    expect(a.explain_mode).toBe('generated')
    expect(a.direct?.text).toContain('وضع المحاكاة')
    expect(a.explanation.length).toBe(1)
  })

  it('tafsir_only mode returns the texts with no generated sentence', async () => {
    env.EXPLAIN_MODE = 'tafsir_only'
    const a = (await (await ask('كيف أتوضأ؟')).json()) as AnswerResponse
    expect(a.direct?.text).toBe('')
    expect(a.explanation).toEqual([])
    expect(a.explain_mode).toBe('tafsir_only')
    expect(a.quotes.length).toBeGreaterThan(0)
  })

  it('labels machine-translated languages and localizes fixed texts', async () => {
    const a = (await (await ask('Comment faire les ablutions ?', { lang: 'fr' })).json()) as AnswerResponse
    expect(a.machineTranslated).toBe(true)
    const r = (await (await ask('Is it permissible for me to break my fast?', { lang: 'en' })).json()) as ReferralResponse
    expect(r.message).toBe('This question needs a fatwa from a qualified authority')
  })

  it('takes the explanation language from the model: German is machine-translated, English is not (command 08)', async () => {
    reply = (sent) => ({ ...(mockReply(sent) as object), answer_lang: 'de' })
    const de = (await (await ask('Was ist Zakat?')).json()) as AnswerResponse
    expect(de).toMatchObject({ answer_lang: 'de', machineTranslated: true })
    reply = (sent) => ({ ...(mockReply(sent) as object), answer_lang: 'en' })
    const en = (await (await ask('What is zakat?')).json()) as AnswerResponse
    expect(en).toMatchObject({ answer_lang: 'en', machineTranslated: false })
  })

  it('falls back to the interface language when answer_lang is missing or not a language tag', async () => {
    reply = (sent) => ({ ...(mockReply(sent) as object), answer_lang: '<script>' })
    const a = (await (await ask('Quelle est la zakat ?', { lang: 'fr' })).json()) as AnswerResponse
    expect(a).toMatchObject({ answer_lang: 'fr', machineTranslated: true })
    reply = (sent) => {
      const r = { ...(mockReply(sent) as Record<string, unknown>) }
      delete r.answer_lang
      return r
    }
    const b = (await (await ask('ما هي الزكاة؟')).json()) as AnswerResponse
    expect(b).toMatchObject({ answer_lang: 'ar', machineTranslated: false })
  })

  it('rejects empty, too long and non-text questions', async () => {
    for (const q of ['', '   ', 'x'.repeat(501), 42]) {
      const res = await ask(q as string)
      expect(res.status).toBe(400)
      expect((await res.json()).code).toBe('bad_input')
    }
  })

  it('enforces the daily limit per device (limits.json), counted by a salted hash (the IP is not stored)', async () => {
    deps.retrieve = async () => retrieved(ids, true)
    for (let i = 0; i < limits.dailyPerDevice; i++) expect((await ask(`سؤال ${i}`)).status).toBe(200)
    const res = await ask('سؤال آخر')
    expect(res.status).toBe(429)
    expect((await ask('سؤال من جهاز آخر', {}, '198.51.100.9')).status).toBe(200)
    const dump = JSON.stringify(db.db.prepare('SELECT * FROM usage_daily').all())
    expect(dump).not.toContain('203.0.113.7')
  })

  it('the evaluation bypass of the daily limit needs ADMIN_ENABLED=true and the right token; otherwise nothing changes', async () => {
    deps.retrieve = async () => retrieved(ids, true)
    env.ADMIN_TOKEN = 'secret-token-for-tests-0123456789'
    const withToken = (q: string) =>
      handleAsk(
        new Request('https://x/api/ask', {
          method: 'POST',
          headers: { 'cf-connecting-ip': '203.0.113.50', authorization: 'Bearer secret-token-for-tests-0123456789' },
          body: JSON.stringify({ q, lang: 'ar' }),
        }),
        env,
        deps,
      )
    env.ADMIN_ENABLED = 'false'
    for (let i = 0; i < limits.dailyPerDevice; i++) expect((await withToken(`سؤال ${i}`)).status).toBe(200)
    expect((await withToken('سؤال زائد')).status).toBe(429) // closed admin: the token changes nothing
    env.ADMIN_ENABLED = 'true'
    expect((await withToken('سؤال بعد فتح المسار')).status).toBe(200) // open admin + right token: not counted
    const wrong = await handleAsk(
      new Request('https://x/api/ask', {
        method: 'POST',
        headers: { 'cf-connecting-ip': '203.0.113.50', authorization: 'Bearer wrong-token-wrong-token-wrong-tok' },
        body: JSON.stringify({ q: 'سؤال برمز خاطئ', lang: 'ar' }),
      }),
      env,
      deps,
    )
    expect(wrong.status).toBe(429) // open admin + wrong token: counted
  })

  it('model settings can be overridden only by the evaluation runner (admin open + token), and such runs skip the cache', async () => {
    env.ADMIN_TOKEN = 'secret-token-for-tests-0123456789'
    const seen: unknown[] = []
    deps.callLlm = async (_e, _m, sent, uiLang, _max, settings) => {
      seen.push(settings)
      return { raw: mockReply(sent, uiLang), usage: { in: 10, out: 2 }, mode: 'live', model: settings?.model }
    }
    const withToken = (q: string, token: string) =>
      handleAsk(
        new Request('https://x/api/ask', {
          method: 'POST',
          headers: { 'cf-connecting-ip': '203.0.113.60', authorization: `Bearer ${token}` },
          body: JSON.stringify({ q, lang: 'ar', llm: { model: 'pro', reasoning_effort: 'low', thinking: true } }),
        }),
        env,
        deps,
      )
    env.ADMIN_ENABLED = 'false'
    const closed = (await (await withToken('كيف أتوضأ؟', 'secret-token-for-tests-0123456789')).json()) as Record<string, unknown>
    expect(seen.at(-1)).toMatchObject({ model: '@cf/deepseek-ai/deepseek-v4-flash-0731' }) // ignored
    expect(closed.eval).toBeUndefined()
    env.ADMIN_ENABLED = 'true'
    const open = (await (await withToken('ما الصيام؟', 'secret-token-for-tests-0123456789')).json()) as Record<string, unknown>
    expect(seen.at(-1)).toEqual({ model: '@cf/deepseek-ai/deepseek-v4-pro-0813', reasoningEffort: 'low', thinking: true })
    expect(open.eval).toMatchObject({ model: '@cf/deepseek-ai/deepseek-v4-pro-0813', usage: { in: 10, out: 2 } })
    expect(db.db.prepare('SELECT count(*) AS n FROM cache').get()).toEqual({ n: 1 }) // only the closed-admin answer
    await withToken('ما الصيام؟', 'secret-token-for-tests-0123456789')
    expect(seen).toHaveLength(3) // not served from the cache
    await withToken('ما الصيام؟', 'wrong-token-wrong-token-wrong-tok')
    expect(seen.at(-1)).toMatchObject({ model: '@cf/deepseek-ai/deepseek-v4-flash-0731' }) // wrong token: ignored
  })

  it('an approved FAQ shows the approval date but never the reviewer name (rule 14)', async () => {
    const { sha256Hex } = await import('../src/lib/keys')
    const { tokenize } = await import('../src/lib/normalize')
    const plan = { v: 1, level: 'A', ids: ['quran:5:6'], hashes: {}, direct: { text: 'x', cites: ['quran:5:6'] }, explanation: [], considered: ['quran:5:6'] }
    db.db
      .prepare('INSERT INTO faq (lang, question, question_key, answer, approved_by, approved_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run('ar', 'كيف أتوضأ؟', await sha256Hex(tokenize('كيف أتوضأ؟').join(' ')), JSON.stringify(plan), 'اسم المراجع', '2026-10-05')
    const res = await ask('كيف أتوضأ؟')
    const text = await res.text()
    expect(JSON.parse(text).reviewed).toEqual({ at: '2026-10-05' })
    expect(text).not.toContain('اسم المراجع')
    expect(deps.calls.llm).toBe(0)
  })

  it('marks mock-mode cache rows so go-live can clear them', async () => {
    await ask('كيف أتوضأ؟')
    const row = db.db.prepare('SELECT lang FROM cache').get() as { lang: string }
    expect(row.lang).toBe('ar~mock')
  })

  it('stops model calls at the monthly cap while cached answers keep working', async () => {
    await ask('كيف أتوضأ؟')
    db.db.prepare('INSERT OR REPLACE INTO usage_monthly (month, llm_calls) VALUES (?, 30000)').run(riyadhMonth())
    const cached = (await (await ask('كيف أتوضأ؟')).json()) as AnswerResponse
    expect(cached.fromCache).toBe(true)
    const res = await ask('ما أركان الإيمان؟')
    expect(res.status).toBe(503)
    expect((await res.json()).code).toBe('monthly_cap')
  })

  it('never logs the question text', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    deps.callLlm = async () => ({ raw: null, usage: { in: 0, out: 0 }, mode: 'live', error: 'bad_json' })
    await ask('سؤال سري جدا')
    expect(log.mock.calls.flat().join(' ')).not.toContain('سري')
  })

  it('refuses to answer when IP_SALT is missing', async () => {
    env.IP_SALT = undefined
    expect((await ask('كيف أتوضأ؟')).status).toBe(500)
  })
})

describe('POST /api/report', () => {
  const report = (body: unknown, ip = '203.0.113.7') =>
    handleReport(new Request('https://x/api/report', { method: 'POST', headers: { 'cf-connecting-ip': ip }, body: JSON.stringify(body) }), env)

  it('stores only the passage id and the reason', async () => {
    expect((await report({ passageId: 'quran:5:6', reason: 'wrong_ref' })).status).toBe(200)
    const rows = db.db.prepare('SELECT * FROM reports').all() as Record<string, unknown>[]
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ passage_id: 'quran:5:6', reason: 'wrong_ref', answer_key: null })
  })

  it('validates the reason and the passage', async () => {
    expect((await report({ passageId: 'quran:5:6', reason: 'spam' })).status).toBe(400)
    expect((await report({ passageId: "x'; DROP TABLE reports;--", reason: 'other' })).status).toBe(400)
    expect((await report({ passageId: 'quran:200:1', reason: 'other' })).status).toBe(404)
  })

  it('has its own daily limit', async () => {
    for (let i = 0; i < 10; i++) expect((await report({ passageId: 'quran:5:6', reason: 'other' })).status).toBe(200)
    expect((await report({ passageId: 'quran:5:6', reason: 'other' })).status).toBe(429)
  })
})

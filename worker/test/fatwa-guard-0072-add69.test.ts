// Add-on 0072-add69 §2: the fatwa guard (src/fatwa-guard.ts) before fatwa-ref is turned on on next.
//   - every fatwa number in an answer is a fatwa of our index, with its number and its site; its link is the stored one;
//   - what does not match is removed and not shown, and logged by count and number, never with the question;
//   - the cache: the guard runs before a new answer is cached, and again on an answer read from the cache;
//   - the referral's fatwa is read again by its key: an id not ours, another number or site, and no fatwa is shown;
//   - fatwa-ref is not part of the answers' cache key: turning it on sets no cached answer aside.
// An in-memory D1 built from the migrations, a fake model: no data, no network.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnswerResponse, FatwaQuote } from '../../shared/api'
import { handleAsk, type AskDeps } from '../src/ask'
import { claimsOf, guardFreeText, guardQuote, guardReferralFatwa, guardSentences, type FatwaLookup, type StoredFatwa } from '../src/fatwa-guard'
import { fixesKey, fixesOf } from '../src/fixes'
import type { Env } from '../src/index'
import { SqliteD1 } from './d1-sqlite'

const ROOT = path.resolve(import.meta.dirname, '../..')
const STORED_1001 = 'https://binbaz.org.sa/fatwas/1001/%D8%AD%D9%83%D9%85-%D9%82%D8%B6%D8%A7%D8%A1-%D8%A7%D9%84%D8%B5%D9%8A%D8%A7%D9%85'
const STORED_UTH = 'https://binothaimeen.net/ar/voice_library/lessonDetails/x/5f0c2a7e-0000-4000-8000-000000000001?CategoryTree=true'
const ROWS: StoredFatwa[] = [
  { id: 'fatwa:binbaz:1001', site: 'binbaz.org.sa', number: '1001', url: STORED_1001, general: 1 },
  { id: 'fatwa:binbaz:1002', site: 'binbaz.org.sa', number: '1002', url: 'https://binbaz.org.sa/fatwas/1002/x', general: 0 },
  { id: 'fatwa:binothaimeen:5f0c2a7e-0000-4000-8000-000000000001', site: 'binothaimeen.net', number: null, url: STORED_UTH, general: 1 },
]
const lookup: FatwaLookup = async (ids) => new Map(ROWS.filter((r) => ids.includes(r.id)).map((r) => [r.id, r]))

function db(): SqliteD1 {
  const d = new DatabaseSync(':memory:')
  for (const f of fs.readdirSync(path.join(ROOT, 'worker/migrations')).filter((x) => x.endsWith('.sql')).sort())
    d.exec(fs.readFileSync(path.join(ROOT, 'worker/migrations', f), 'utf8'))
  const ins = d.prepare(
    'INSERT INTO fatwas (id, site, scholar, number, title, question, answer, topic, category, series, url, fetched_at, general) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
  for (const r of ROWS) ins.run(r.id, r.site, r.site === 'binbaz.org.sa' ? 'ابن باز' : 'ابن عثيمين', r.number, 'عنوان', 'سؤال', 'جواب', 'sawm', 'الصيام', null, r.url, '2026-10-22T20:00:00.000Z', r.general)
  d.exec("INSERT INTO passages (id, source, kind, ref, url, text, text_search, embed_text) VALUES ('quran:2:184', 'ksu', 'ayah', 'البقرة 184', 'https://quran.ksu.edu.sa/tafseer/saadi/sura2-aya184.html', 'أياما معدودات فمن كان منكم مريضا أو على سفر فعدة من أيام أخر', 'اياما معدودات', 'أياما معدودات')")
  return new SqliteD1(d)
}

describe('what a sentence claims', () => {
  it('a fatwa number after «فتوى» in the ten languages, in any digits; a link apart', () => {
    expect(claimsOf('كما في فتوى ابن باز رقم ١٠٠١ في الصيام').numbers).toEqual(['1001'])
    expect(claimsOf('رقم 1001 من فتاوى ابن باز').numbers).toEqual(['1001'])
    expect(claimsOf('As in fatwa no. 1001 of Ibn Baz.').numbers).toEqual(['1001'])
    expect(claimsOf('ابن باز کے فتویٰ نمبر ۱۰۰۱ میں').numbers).toEqual(['1001'])
    expect(claimsOf('Fetva 1001 böyle der.').numbers).toEqual(['1001'])
    expect(claimsOf('ইবনে বাযের ফতোয়া নং ১০০১').numbers).toEqual(['1001'])
    expect(claimsOf('इब्न बाज़ का फ़तवा संख्या १००१').numbers).toEqual(['1001'])
    expect(claimsOf('انظر https://binbaz.org.sa/fatwas/77/x').urls).toEqual(['https://binbaz.org.sa/fatwas/77/x'])
  })
  it('no claim: a sentence without the word, «الفتى», a number of an ayah', () => {
    expect(claimsOf('الصيام في رمضان فرض كما في الآية 183.').numbers).toEqual([])
    expect(claimsOf('قال الفتى 12 كلمة.').numbers).toEqual([])
  })
})

describe('the guard on generated sentences', () => {
  const s = (text: string) => ({ text, cites: ['quran:2:184'] })
  it('an invented number: its sentence removed, the number shown nowhere, and noted', async () => {
    const g = await guardSentences(lookup, { direct: s('الصيام فرض.'), explanation: [s('وفي فتوى ابن باز رقم 99999 بيان ذلك.'), s('والمريض يقضي.')] })
    expect(JSON.stringify(g)).not.toContain('99999 بيان')
    expect(g.explanation.map((x) => x.text)).toEqual(['والمريض يقضي.'])
    expect(g.direct?.text).toBe('الصيام فرض.')
    expect(g.note).toMatchObject({ dropped: ['99999'], removedSentences: 1 })
  })
  it('a real number: shown, and a link the model wrote becomes the stored one', async () => {
    const plain = await guardSentences(lookup, { explanation: [s('وفي فتوى ابن باز رقم ١٠٠١ بيان ذلك.')] })
    expect(plain.explanation[0].text).toBe('وفي فتوى ابن باز رقم ١٠٠١ بيان ذلك.')
    const wrong = await guardSentences(lookup, { explanation: [s('فتوى ابن باز 1001: https://islamqa.info/ar/answers/1001 للمزيد.')] })
    expect(wrong.explanation[0].text).toBe(`فتوى ابن باز 1001: ${STORED_1001} للمزيد.`)
    expect(wrong.note.relinked).toBe(1)
    const site = await guardSentences(lookup, { explanation: [s('انظر binbaz.org.sa/fatwas/1001/غير-صحيح')] })
    expect(site.explanation[0].text).toBe(`انظر ${STORED_1001}`)
  })
  it('a fatwa site\'s link to no fatwa of ours: the sentence removed', async () => {
    const g = await guardSentences(lookup, { explanation: [s('انظر https://binbaz.org.sa/fatwas/424242/x'), s('وانظر https://www.alifta.gov.sa/fatwa/9')] })
    expect(g.explanation).toEqual([])
    expect(g.note.removedSentences).toBe(2)
  })
  it('nothing about a fatwa: no read at all', async () => {
    const spy = vi.fn(lookup)
    const g = await guardSentences(spy, { direct: s('الصيام فرض على المستطيع.'), explanation: [s('والمسافر يفطر ويقضي.')] })
    expect(spy).not.toHaveBeenCalled()
    expect(g.note).toEqual({ dropped: [], relinked: 0, removedSentences: 0 })
  })
  it('«بسّط لي»: the sentence removed, the rest unchanged; nothing left is null', async () => {
    expect((await guardFreeText(lookup, 'الصيام فرض.\nوفي فتوى رقم 99999 تفصيل. والمريض يقضي.')).text).toBe('الصيام فرض.\n والمريض يقضي.')
    expect((await guardFreeText(lookup, 'وفي فتوى رقم 99999 تفصيل.')).text).toBeNull()
    expect((await guardFreeText(lookup, 'نص بلا فتوى.\n\nفقرة ثانية.')).text).toBe('نص بلا فتوى.\n\nفقرة ثانية.')
  })
})

describe('the guard on a referral\'s fatwa', () => {
  const q = (o: Partial<FatwaQuote>): FatwaQuote => ({ id: 'fatwa:binbaz:1001', site: 'binbaz.org.sa', scholar: 'ابن باز', number: '1001', title: 't', question: 'q', answer: 'a', url: STORED_1001, ...o })
  it('ours: shown with the stored link, whatever link it came with', async () => {
    expect(guardQuote(q({}), ROWS[0])).toEqual(q({}))
    const g = await guardReferralFatwa(lookup, q({ url: 'https://example.com/fatwa/1001' }))
    expect(g.quote?.url).toBe(STORED_1001)
    expect(g.note.relinked).toBe(1)
    expect(guardQuote(q({ id: ROWS[2].id, site: 'binothaimeen.net', number: undefined, url: 'x' }), ROWS[2])?.url).toBe(STORED_UTH)
  })
  it('not ours: an id not in the index, another number or site, a fatwa not general: none', async () => {
    const g = await guardReferralFatwa(lookup, q({ id: 'fatwa:binbaz:99999', number: '99999' }))
    expect(g.quote).toBeNull()
    expect(g.note).toMatchObject({ quoteDropped: true, dropped: ['99999'] })
    expect(guardQuote(q({ number: '1002' }), ROWS[0])).toBeNull()
    expect(guardQuote(q({ site: 'binothaimeen.net' }), ROWS[0])).toBeNull()
    expect(guardQuote(q({ id: 'fatwa:binbaz:1002', number: '1002' }), ROWS[1])).toBeNull()
  })
})

describe('the guard in «اسأل», fresh and from the cache', () => {
  let d1: SqliteD1
  let env: Env
  let logs: string[]
  const Q = 'هل يجوز للمريض أن يفطر في رمضان؟'
  beforeEach(() => {
    d1 = db()
    logs = []
    vi.spyOn(console, 'log').mockImplementation((x: unknown) => void logs.push(String(x)))
    env = { DB: d1 as unknown as D1Database, IP_SALT: 'test-salt', LLM_MODE: 'live', EXPLAIN_MODE: 'generated', ASK_FIXES: 'level,fatwa-ref' } as Env
  })
  afterEach(() => vi.restoreAllMocks())
  const deps = (explanation: string[]): AskDeps =>
    ({
      retrieve: async () => ({ passages: [{ id: 'quran:2:184', score: 1, foundBy: {} }], ranked: [{ id: 'quran:2:184', score: 1, foundBy: {} }], abstain: false, topVectorScore: 0.7, topics: [], rowsRead: 0 }),
      callLlm: async () => ({
        raw: { level: 'A', answerable: true, disputed: false, answer_lang: 'ar', used_passages: ['quran:2:184'], direct: { text: 'يجوز للمريض الفطر ويقضي.', cites: ['quran:2:184'] }, explanation: explanation.map((text) => ({ text, cites: ['quran:2:184'] })) },
        usage: { in: 1, out: 1 },
        mode: 'live',
      }),
    }) as unknown as AskDeps
  const ask = (d: AskDeps) =>
    handleAsk(new Request('https://x/api/ask', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.21' }, body: JSON.stringify({ q: Q, lang: 'ar' }) }), env, d).then((r) => r.json() as Promise<AnswerResponse>)

  it('an invented number is not shown, nor cached; a real one is, with its stored link; logged without the question', async () => {
    const r = await ask(deps(['وفي فتوى ابن باز رقم 99999 تفصيل.', `وفي فتوى ابن باز رقم 1001 بيانه: https://binbaz.org.sa/fatwas/1001/wrong`]))
    expect(r.type).toBe('answer')
    expect(JSON.stringify(r)).not.toContain('99999')
    expect(r.explanation.map((x) => x.text)).toEqual([`وفي فتوى ابن باز رقم 1001 بيانه: ${STORED_1001}`])
    const cached = d1.db.prepare('SELECT answer FROM cache').all() as { answer: string }[]
    expect(cached).toHaveLength(1)
    expect(cached[0].answer).not.toContain('99999')
    expect(cached[0].answer).toContain(STORED_1001)
    const line = logs.find((l) => l.includes('fatwa_guard'))!
    expect(JSON.parse(line)).toMatchObject({ evt: 'fatwa_guard', where: 'answer', removed: 1, dropped: ['99999'], relinked: 1 })
    expect(logs.join('\n')).not.toContain('المريض')
  })

  it('an answer kept in the cache before the guard is guarded when it is read', async () => {
    await ask(deps(['والمريض يقضي عدة من أيام أخر بعد شفائه.']))
    // As if an older version had kept a sentence with an invented number and a wrong link.
    const row = d1.db.prepare('SELECT key, answer FROM cache').get() as { key: string; answer: string }
    const plan = JSON.parse(row.answer)
    plan.explanation = [
      { text: 'وفي فتوى ابن باز رقم 99999 تفصيل.', cites: ['quran:2:184'] },
      { text: 'وفي فتوى رقم ١٠٠١: https://example.com/1001', cites: ['quran:2:184'] },
    ]
    d1.db.prepare('UPDATE cache SET answer = ? WHERE key = ?').run(JSON.stringify(plan), row.key)
    const never = { ...deps([]), callLlm: async () => { throw new Error('the cache must answer') } } as unknown as AskDeps
    const r = await ask(never)
    expect(r.fromCache).toBe(true)
    expect(JSON.stringify(r)).not.toContain('99999')
    expect(r.explanation.map((x) => x.text)).toEqual([`وفي فتوى رقم ١٠٠١: ${STORED_1001}`])
  })
})

describe('fatwa-ref and the answers\' cache key', () => {
  it('not part of the key: on next, turning it on keeps every cached answer', () => {
    const env = (ASK_FIXES: string) => ({ ASK_FIXES }) as unknown as Env
    const now = 'level,hadith-answer,grade-tr,phrase,understand'
    expect(fixesKey(fixesOf(env(`${now},fatwa-ref`)))).toBe(fixesKey(fixesOf(env(now))))
    expect(fixesKey(fixesOf(env('fatwa-ref')))).toBe('')
  })
})

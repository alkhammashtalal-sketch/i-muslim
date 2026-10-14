// Reply 0048: HadeethEnc's hadiths in the answers, behind HADITH_RETRIEVAL, and «هل حديث كذا صحيح؟».
//   - the passages are built from D1's own rows (byte for byte), sahih and hasan marfu' only; their keyword rows by rowid;
//   - off, the answer path is as before: no hadith table, no hadith index, version 3 of the cache;
//   - on, the hadith vectors join the passages' by score, and the sources keep their order: the Quran, the hadith, the rest;
//   - the grade: Talal's four cases (reply 0048), and the matching rule (a whole quote, or every word in order).
// The database is the migrations with data/samples (hadith.sample.jsonl: 19 HadeethEnc rows), so no full data is needed.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AnswerResponse, GradeResponse, ReferralResponse } from '../../shared/api'
import { handleAsk, type AskDeps } from '../src/ask'
import { findQuoted, gradeQuestionOf, quoteMatch } from '../src/hadith-grade'
import { handleHadithGradeIndex, handleHadithIndex, isRetrievable } from '../src/hadith-index'
import type { Env } from '../src/index'
import { passageIdOf } from '../src/lib/fusion'
import { tokenize } from '../src/lib/normalize'
import { mockReply } from '../src/llm'
import { retrieve, type RetrieveResult } from '../src/retrieve'
import { SqliteD1 } from './d1-sqlite'

const ROOT = path.resolve(import.meta.dirname, '../..')
const lines = (f: string) =>
  fs
    .readFileSync(path.join(ROOT, 'data/samples', f), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l) as Record<string, unknown>)
const PASSAGES = ['quran.sample.jsonl', 'aqeedah.sample.jsonl'].flatMap(lines)
const HADITHS = lines('hadith.sample.jsonl')
const AR = HADITHS.filter((r) => r.lang === 'ar')
const COLUMNS = ['id', 'source', 'kind', 'ref', 'url', 'text', 'text_en', 'text_search', 'embed_text', 'book', 'chapter', 'sura', 'aya', 'page']

function sampleDb(): SqliteD1 {
  const db = new DatabaseSync(':memory:')
  const files = fs.readdirSync(path.join(ROOT, 'worker/migrations')).filter((f) => f.endsWith('.sql')).sort()
  const run = (f: string) => db.exec(fs.readFileSync(path.join(ROOT, 'worker/migrations', f), 'utf8'))
  files.filter((f) => f < '0004').forEach(run)
  const ins = db.prepare(`INSERT INTO passages (${COLUMNS.join(', ')}, extra) VALUES (${COLUMNS.map(() => '?').join(', ')}, ?)`)
  for (const r of PASSAGES) {
    const extra = Object.fromEntries(Object.entries(r).filter(([k]) => !COLUMNS.includes(k)))
    ins.run(...COLUMNS.map((c) => (r[c] ?? null) as string | number | null), JSON.stringify(extra))
  }
  files.filter((f) => f >= '0004').forEach(run)
  const h = db.prepare(
    'INSERT INTO hadiths (id, lang, title, text, intro, attribution, grade, explanation, class, tier, version, mawquf) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  )
  for (const r of HADITHS)
    h.run(...(['id', 'lang', 'title', 'hadeeth', 'hadeeth_intro', 'attribution', 'grade', 'explanation', 'class', 'tier', 'version'].map((k) => (r[k] ?? null) as string | null)), r.mawquf ? 1 : 0)
  return new SqliteD1(db)
}

/** A Vectorize index in memory: what was upserted, and a query that answers `matches`. */
function fakeIndex(matches: { id: string; score: number }[] = []) {
  const upserted: { id: string; values: number[]; metadata?: Record<string, string> }[] = []
  let queried = 0
  return {
    upserted,
    get queried() {
      return queried
    },
    upsert: async (v: typeof upserted) => {
      upserted.push(...v)
      return { mutationId: 'x' }
    },
    query: async () => {
      queried++
      return { matches, count: matches.length }
    },
  }
}
const fakeAi = { run: async (_m: string, i: { text: string[] }) => ({ data: i.text.map(() => Array(4).fill(0.1)) }) }
const post = (body: unknown) => new Request('https://x/api/admin/x', { method: 'POST', body: JSON.stringify(body) })

let db: SqliteD1
let env: Env
let hIndex: ReturnType<typeof fakeIndex>

beforeEach(async () => {
  db = sampleDb()
  hIndex = fakeIndex()
  env = {
    DB: db as unknown as D1Database,
    AI: fakeAi as unknown as Ai,
    VECTORIZE: fakeIndex() as unknown as VectorizeIndex,
    VECTORIZE_HADITH: hIndex as unknown as VectorizeIndex,
    IP_SALT: 'test-salt',
    LLM_MODE: 'mock',
    EXPLAIN_MODE: 'on_demand',
  } as Env
  await handleHadithIndex(post({ ids: AR.map((r) => r.id) }), env)
  await handleHadithGradeIndex(post({ ids: AR.map((r) => r.id) }), env)
})

describe('the hadith passages (worker/src/hadith-index.ts)', () => {
  it('are D1\'s own Arabic rows, byte for byte, sahih and hasan marfu\' only, with takhrij, link and fields', async () => {
    const rows = db.db.prepare("SELECT id, kind, source, ref, url, text, text_en, extra FROM passages WHERE kind = 'hadith' ORDER BY id").all() as Record<string, string>[]
    const want = AR.filter((r) => isRetrievable({ class: String(r.class), tier: String(r.tier), mawquf: !!r.mawquf }))
    expect(rows.map((r) => r.id).sort()).toEqual(want.map((r) => `hadith:${r.id}`).sort())
    // «مقبول», the mawquf and the weak are never passages (reply 0048).
    for (const id of ['5473', '3041', '65065']) expect(rows.some((r) => r.id === `hadith:${id}`)).toBe(false)
    for (const r of rows) {
      const src = db.db.prepare("SELECT text, attribution, grade, class, tier FROM hadiths WHERE id = ? AND lang = 'ar'").get(r.id.slice(7)) as Record<string, string>
      expect(r.text).toBe(src.text)
      expect(r.ref).toBe(src.attribution.trim())
      expect(r.url).toBe(`https://hadeethenc.com/ar/browse/hadith/${r.id.slice(7)}`)
      expect(JSON.parse(r.extra)).toMatchObject({ hadith: r.id.slice(7), grade: src.grade, class: src.class, tier: src.tier })
    }
    // HadeethEnc's English translation where it has one.
    expect(rows.find((r) => r.id === 'hadith:4560')!.text_en).toBe(HADITHS.find((r) => r.id === '4560' && r.lang === 'en')!.hadeeth)
    // Their own keyword rows, by the passage's rowid; nothing in the passages' tables.
    const fts = db.db.prepare('SELECT f.rowid AS rowid, f.id AS id, p.rowid AS prow FROM hadith_fts f JOIN passages p ON p.id = f.id').all() as { rowid: number; prow: number }[]
    expect(fts.length).toBe(rows.length)
    for (const f of fts) expect(f.rowid).toBe(f.prow)
    expect((db.db.prepare("SELECT count(*) AS n FROM passages_fts WHERE id LIKE 'hadith:%'").get() as { n: number }).n).toBe(0)
  })
  it('have a vector each, and one per part of the explanation that maps back to its hadith', () => {
    const own = hIndex.upserted.filter((v) => v.metadata?.kind === 'hadith')
    const parts = hIndex.upserted.filter((v) => v.metadata?.kind === 'hadith_ex')
    expect(own.map((v) => v.id).sort()).toEqual(
      AR.filter((r) => isRetrievable({ class: String(r.class), tier: String(r.tier), mawquf: !!r.mawquf })).map((r) => `hadith:${r.id}`).sort(),
    )
    expect(parts.length).toBeGreaterThan(own.length)
    for (const p of parts) {
      expect(p.id).toMatch(/^hadithex:\d+:\d+$/)
      expect(passageIdOf(p.id)).toBe(p.metadata!.hadith)
    }
  })
  it('the grade search holds every Arabic row, the weak included', () => {
    expect((db.db.prepare('SELECT count(*) AS n FROM hadith_grade_fts').get() as { n: number }).n).toBe(AR.length)
  })
})

describe('«هل حديث كذا صحيح؟» (CLAUDE.md §9, Talal 14 October 09:25)', () => {
  it('reads the quote of a question about soundness, and no other question', () => {
    expect(gradeQuestionOf('هل حديث "إنما الأعمال بالنيات" صحيح؟')).toBe('إنما الأعمال بالنيات')
    expect(gradeQuestionOf('هل حديث «تبسمك في وجه أخيك صدقة» صحيح؟')).toBe('تبسمك في وجه أخيك صدقة')
    expect(gradeQuestionOf('ما درجة حديث «لا تغضب»؟')).toBe('لا تغضب')
    expect(gradeQuestionOf('هل حديث اطلبوا العلم ولو بالصين صحيح؟')).toBe('اطلبوا العلم ولو بالصين')
    expect(gradeQuestionOf('Is the hadith "Do not get angry" authentic?')).toBe('Do not get angry')
    // Not about a grade, or about something else besides.
    expect(gradeQuestionOf('ما فضل الصدق؟')).toBeNull()
    expect(gradeQuestionOf('اشرح لي حديث «إنما الأعمال بالنيات»')).toBeNull()
    expect(gradeQuestionOf('هل حديث «لا تغضب» صحيح وهل يجوز لي أن أغضب على ولدي إذا أخطأ في المدرسة كثيرا كل يوم؟')).toBeNull()
    // A quote's own words do not make the frame («ما» and «صح» inside it).
    expect(gradeQuestionOf('ما معنى «وإنما لكل امرئ ما نوى»؟')).toBeNull()
  })
  it('matches a whole quote of six words or more, or every word in order with at most two between; a word changed, never', () => {
    const h = tokenize('إنما الأعمال بالنيات وإنما لكل امرئ ما نوى فمن كانت هجرته')
    expect(quoteMatch(tokenize('إنما الأعمال بالنيات وإنما لكل امرئ'), h)).toBe('exact')
    expect(quoteMatch(tokenize('إنما الأعمال بالنيات'), h)).toBe('ordered')
    expect(quoteMatch(tokenize('تبسمك في وجه أخيك صدقة'), tokenize('تبسمك في وجه أخيك لك صدقة'))).toBe('ordered')
    expect(quoteMatch(tokenize('إنما الأعمال بالنيات وإنما لكل امرئ ما أحب'), h)).toBeNull()
    expect(quoteMatch(tokenize('إنما الأعمال هجرته'), h)).toBeNull() // more than two words between
  })
  const ask = (q: string, lang = 'ar') =>
    handleAsk(
      new Request('https://x/api/ask', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.9' }, body: JSON.stringify({ q, lang }) }),
      // Its own switch (0048-add7): on with the hadiths in the answers off.
      { ...env, HADITH_GRADE: 'on' } as Env,
      { retrieve: async () => ({ passages: [], ranked: [], abstain: true, topVectorScore: 0, topics: [], rowsRead: 0 }), callLlm: async () => ({ raw: null }) } as unknown as AskDeps,
    ).then((r) => r.json() as Promise<GradeResponse | ReferralResponse>)
  it('Talal\'s four cases: two grades as written, two referrals', async () => {
    const a = (await ask('هل حديث "إنما الأعمال بالنيات" صحيح؟')) as GradeResponse
    expect(a.type).toBe('grade')
    expect(a.hadith.id).toBe('4560') // 4560 and its copy 66511 both «صحيح»: the lowest tier
    expect(a.hadith.grade).toBe('صحيح')
    expect(a.message).toBe('درجته في موسوعة الأحاديث النبوية: صحيح')
    expect(a.hadith.attribution).toBe('متفق عليه')
    expect(a.hadith.url).toBe('https://hadeethenc.com/ar/browse/hadith/4560')
    expect(a.hadith.text).toBe(String(AR.find((r) => r.id === '4560')!.hadeeth))
    const b = (await ask('هل حديث "تبسمك في وجه أخيك صدقة" صحيح؟')) as GradeResponse
    expect(b.type).toBe('grade')
    expect(b.hadith.id).toBe('66237')
    expect(b.message).toBe('درجته في موسوعة الأحاديث النبوية: حسن')
    // Not found in these words: the grade path's own line (0048-add9 أ), no ruling and nothing of weakness.
    const NOT_FOUND = 'لم نجد هذا الحديث بهذا اللفظ في موسوعة الأحاديث النبوية، فلا نحكم على درجته. اسأل أهل العلم بالحديث.'
    for (const q of ['هل حديث "اطلبوا العلم ولو بالصين" صحيح؟', 'هل حديث "إنما الأعمال بالنيات وإنما لكل امرئ ما أحب" صحيح؟']) {
      const r = (await ask(q)) as ReferralResponse
      expect(r.type).toBe('referral')
      expect(r.message).toBe(NOT_FOUND)
      expect(r.message).not.toMatch(/ضعيف|موضوع|مكذوب/)
    }
  })
  it('a weak hadith: its grade as written, and its class for the badge (rule 10)', async () => {
    const w = AR.find((r) => r.id === '65065')!
    const quote = tokenize(String(w.hadeeth)).slice(8, 16).join(' ')
    const { found } = await findQuoted(env, quote)
    expect(found?.id).toBe('65065')
    expect(found?.class).toBe('weak')
  })
  it('in English, the line in English and HadeethEnc\'s English wording of the grade', async () => {
    const r = (await ask('هل حديث "تبسمك في وجه أخيك صدقة" صحيح؟', 'en')) as GradeResponse
    expect(r.message).toBe('Its grade in the Encyclopedia of Prophetic Hadiths (HadeethEnc): حسن')
  })
})

describe('the switch', () => {
  /** Every SQL the retrieval runs, and the hadith index never asked while off. */
  function spy(on: boolean) {
    const sql: string[] = []
    const wrapped = new Proxy(db, {
      get(t, k) {
        if (k === 'prepare') return (s: string) => (sql.push(s), t.prepare(s))
        return Reflect.get(t, k)
      },
    })
    const passages = fakeIndex([
      { id: 'quran:5:6', score: 0.62 },
      { id: 'tafsir:saadi:2:183:1', score: 0.55 },
    ])
    const hadiths = fakeIndex([
      { id: 'hadith:4560', score: 0.7 },
      { id: 'hadithex:4196:1', score: 0.6 },
    ])
    const e = { ...env, DB: wrapped as unknown as D1Database, VECTORIZE: passages, VECTORIZE_HADITH: hadiths, ...(on ? { HADITH_RETRIEVAL: 'on' } : {}) } as unknown as Env
    return { e, sql, hadiths }
  }
  it('off: no hadith table and no hadith index are read, the passages\' lists are as before', async () => {
    const { e, sql, hadiths } = spy(false)
    const r = await retrieve(e, 'ما فضل الصيام؟', 'ar')
    expect(hadiths.queried).toBe(0)
    expect(sql.some((s) => /hadith/.test(s))).toBe(false)
    expect(r.ranked.some((x) => x.id.startsWith('hadith:'))).toBe(false)
    expect(r.topVectorScore).toBe(0.62)
  })
  it('on: the passages\' list exactly as off; the hadiths a block of their own (0048-add8), an explanation part counting for its hadith, their keyword table read', async () => {
    const off = await retrieve(spy(false).e, 'ما فضل الصيام؟', 'ar')
    const { e, sql, hadiths } = spy(true)
    const r = await retrieve(e, 'ما فضل الصيام؟', 'ar')
    expect(hadiths.queried).toBe(1)
    expect(sql.some((s) => /FROM hadith_fts/.test(s))).toBe(true)
    // The passages: the same ids in the same order, the same abstention, as with the hadiths off.
    expect(r.ranked.map((x) => x.id)).toEqual(off.ranked.map((x) => x.id))
    expect(r.passages.map((x) => x.id)).toEqual(off.passages.map((x) => x.id))
    expect(r.abstain).toBe(off.abstain)
    expect(r.ranked.some((x) => x.id.startsWith('hadith:'))).toBe(false)
    expect(r.topHadithScore).toBe(0.7)
    const ids = (r.hadiths ?? []).map((x) => x.id)
    expect(ids).toEqual(['hadith:4560', 'hadith:4196'])
    expect(r.hadiths![0].foundBy.hadith_vec).toBe(1)
    expect(ids.some((i) => i.startsWith('hadithex:'))).toBe(false)
  })
  it('the block offered only from its threshold (minTopHadithScore), and never for a question that asks for an ayah', async () => {
    const at = (score: number) => ({ ...env, VECTORIZE: fakeIndex([{ id: 'quran:1:1', score: 0.6 }]), VECTORIZE_HADITH: fakeIndex([{ id: 'hadith:4560', score }]), HADITH_RETRIEVAL: 'on' }) as unknown as Env
    expect((await retrieve(at(0.59), 'زززز', 'ar')).hadiths).toEqual([])
    expect((await retrieve(at(0.61), 'زززز', 'ar')).hadiths!.map((x) => x.id)).toEqual(['hadith:4560'])
    expect((await retrieve(at(0.9), 'ما الآية التي فيها الصيام؟', 'ar')).hadiths).toEqual([])
  })
  it('the order in the card is the Quran, then the hadith, then the rest; and off and on keep their own cache', async () => {
    const calls = { retrieve: 0 }
    const sent = ['aqeedah:usul:001', 'hadith:4560', 'quran:5:6']
    const deps: AskDeps = {
      retrieve: async () => {
        calls.retrieve++
        return { passages: sent.map((id, i) => ({ id, score: 1 / (i + 61), foundBy: { vector: i + 1 } })), ranked: [], abstain: false, topVectorScore: 0.7, topics: [], rowsRead: 0 } as RetrieveResult
      },
      callLlm: async (_e, _m, s, l) => ({ raw: mockReply(s, l) }) as never,
    }
    const askIt = (on: boolean) =>
      handleAsk(
        new Request('https://x/api/ask', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.10' }, body: JSON.stringify({ q: 'ما أركان الإسلام؟', lang: 'ar' }) }),
        { ...env, ...(on ? { HADITH_RETRIEVAL: 'on' } : {}) } as Env,
        deps,
      ).then((r) => r.json() as Promise<AnswerResponse>)
    const on = await askIt(true)
    expect(on.type).toBe('answer')
    const kinds = on.quotes.map((q) => q.kind)
    expect(kinds.indexOf('ayah')).toBeLessThan(kinds.indexOf('hadith'))
    expect(kinds.indexOf('hadith')).toBeLessThan(kinds.indexOf('aqeedah'))
    const h = on.quotes.find((q) => q.kind === 'hadith')!
    expect(h.hadith).toEqual({ id: '4560', class: 'sahih', tier: '1', attribution: 'متفق عليه', title: AR.find((r) => r.id === '4560')!.title })
    expect(h.grade).toBe('صحيح')
    expect(h.verified).toBe(true)
    // Asked again with the switch off: not the hadith answer from the cache.
    const off = await askIt(false)
    expect(off.fromCache).toBe(false)
    expect(calls.retrieve).toBe(2)
    expect((await askIt(true)).fromCache).toBe(true)
  })
  it('the block (0048-add8): its own call, beside the answer\'s and blind to it; ids it was not offered dropped; the card the ayat, then the block under «من السنة», then the rest', async () => {
    const calls: { system: string; user: string }[] = []
    const ask = (on: boolean, blockReply: unknown, q = 'ما فضل الصيام؟') =>
      handleAsk(
        new Request('https://x/api/ask', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.13' }, body: JSON.stringify({ q, lang: 'ar' }) }),
        { ...env, ...(on ? { HADITH_RETRIEVAL: 'on' } : {}) } as Env,
        {
          retrieve: async () =>
            ({
              passages: ['quran:5:6', 'aqeedah:usul:001'].map((id, i) => ({ id, score: 1 / (i + 61), foundBy: { vector: i + 1 } })),
              ranked: [],
              abstain: false,
              topVectorScore: 0.7,
              topics: [],
              rowsRead: 0,
              hadiths: on ? ['hadith:4560', 'hadith:4196'].map((id, i) => ({ id, score: 1 / (i + 61), foundBy: { hadith_vec: i + 1 }, vectorScore: 0.7 })) : [],
            }) as RetrieveResult,
          callLlm: async (_e, m, sent, l) => {
            calls.push({ system: m[0].content, user: m[1].content })
            return (/You choose hadiths/.test(m[0].content) ? { raw: blockReply } : { raw: mockReply(sent, l) }) as never
          },
        },
      ).then((r) => r.json() as Promise<AnswerResponse>)
    const off = await ask(false, null)
    const mainOff = calls.splice(0)
    expect(mainOff).toHaveLength(1)
    const on = await ask(true, { ids: ['hadith:4196', 'hadith:9999', 'hadith:4196'] })
    const blockCall = calls.find((c) => /You choose hadiths/.test(c.system))!
    const mainOn = calls.find((c) => !/You choose hadiths/.test(c.system))!
    // The answer's call: the same instructions and the same passages as with the hadiths off; the block's: the hadiths.
    expect(mainOn).toEqual(mainOff[0])
    expect(blockCall.user).toContain('[hadith:4560]')
    expect(mainOn.user).not.toContain('hadith:')
    expect(on.quotes.map((q) => q.id)).toEqual(['quran:5:6', 'hadith:4196', 'aqeedah:usul:001'])
    expect(on.quotes.find((q) => q.id === 'hadith:4196')!.block).toBe(true)
    expect(off.quotes.map((q) => q.id)).toEqual(['quran:5:6', 'aqeedah:usul:001'])
    // None kept: the card is the answer as it was.
    calls.splice(0)
    const none = await ask(true, { ids: [] }, 'ما فضل صيام رمضان؟') // another question: not the answer cached above
    expect(none.quotes.map((q) => q.id)).toEqual(['quran:5:6', 'aqeedah:usul:001'])
  })
  it('HADITH_GRADE apart from HADITH_RETRIEVAL (0048-add7): the hadiths on and the grade off is the usual way; a grade answer has its own cache, a referral none', async () => {
    let retrieved = 0
    const deps = { retrieve: async () => (retrieved++, { passages: [], ranked: [], abstain: true, topVectorScore: 0, topics: [], rowsRead: 0 }), callLlm: async () => ({ raw: null }) } as unknown as AskDeps
    const q = (text: string, e: Partial<Env>) =>
      handleAsk(new Request('https://x/api/ask', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.12' }, body: JSON.stringify({ q: text, lang: 'ar' }) }), { ...env, ...e } as Env, deps).then(
        (x) => x.json() as Promise<{ type: string; fromCache?: boolean }>,
      )
    const g = 'هل حديث "تبسمك في وجه أخيك صدقة" صحيح؟'
    expect((await q(g, { HADITH_RETRIEVAL: 'on' })).type).not.toBe('grade')
    expect(retrieved).toBe(1)
    const first = await q(g, { HADITH_GRADE: 'on' })
    expect(first.type).toBe('grade')
    expect(first.fromCache).toBeUndefined()
    expect((await q(g, { HADITH_GRADE: 'on' })).fromCache).toBe(true)
    expect(retrieved).toBe(1)
    // Not found: a referral each time, never from the cache.
    const none = 'هل حديث "من صام يوم السبت دخل الجنة بلا حساب" صحيح؟'
    expect((await q(none, { HADITH_GRADE: 'on' })).type).toBe('referral')
    expect((await q(none, { HADITH_GRADE: 'on' })).fromCache).toBeUndefined()
  })
  it('off, a grade question goes the usual way (the gate, then retrieval)', async () => {
    let retrieved = 0
    const r = await handleAsk(
      new Request('https://x/api/ask', { method: 'POST', headers: { 'cf-connecting-ip': '203.0.113.11' }, body: JSON.stringify({ q: 'هل حديث "تبسمك في وجه أخيك صدقة" صحيح؟', lang: 'ar' }) }),
      env,
      { retrieve: async () => (retrieved++, { passages: [], ranked: [], abstain: true, topVectorScore: 0, topics: [], rowsRead: 0 }), callLlm: async () => ({ raw: null }) } as unknown as AskDeps,
    ).then((x) => x.json() as Promise<{ type: string }>)
    expect(r.type).not.toBe('grade')
    expect(retrieved).toBe(1)
  })
})

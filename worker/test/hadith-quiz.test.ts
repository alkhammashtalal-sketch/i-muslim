// «تأكد من فهمك» (reply 0033 §أ2): the generator (scripts/index/hadith-quiz.mjs, run by load-hadith.mjs at load time)
// and the route GET /api/hadith/:id/quiz (worker/src/hadith.ts, hadith-quiz.ts) on an in-memory D1 built from
// migrations 0008, 0009 and 0013. The real-data checks (5503, 4965, 66269, 6183, a hadith without benefits; Arabic,
// English and Urdu) run when data/processed and data/raw are present, and are skipped otherwise.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import * as G from '../../scripts/index/hadith-quiz.mjs'
import { handleHadith } from '../src/hadith'
import { answerKey, readQuiz } from '../src/hadith-quiz'
import type { Env } from '../src/index'
import { SqliteD1 } from './d1-sqlite'

const ROOT = path.resolve(import.meta.dirname, '../..')
const MIG = (f: string) => fs.readFileSync(path.join(ROOT, 'worker/migrations', f), 'utf8')
const HADITH = path.join(ROOT, 'data/processed/hadith.jsonl')
const WEAK = path.join(ROOT, 'data/processed/hadith_weak.jsonl')
const TREE = path.join(ROOT, 'data/raw/hadeethenc/categories-list-ar.json')
const hasData = fs.existsSync(HADITH) && fs.existsSync(TREE)

type SrcRow = { id: string; lang: string; title: string | null; hints: string[]; categories: string[]; class: string; tier: string }
type Wrong = { id: string; i: number; t: string; ti: string | null }
type Stored = { v: number; q: { n: number; k: string; a: number; w: Wrong[] }[] }
const build = (rows: SrcRow[], rootOf: (c: string) => string | null) => G.buildQuizzes(rows, rootOf) as { quizzes: Map<string, Stored>; stats: Record<string, Record<string, number>> }

// A small tree: roots 3 (creed), 4 (fiqh), 5 (virtues); 10 < 3, 20 < 4, 21 < 20 < 4, 30 < 5. 99 is outside the tree.
const TREE_SMALL = [
  { id: '3', parent_id: null },
  { id: '4', parent_id: null },
  { id: '5', parent_id: null },
  { id: '10', parent_id: '3' },
  { id: '20', parent_id: '4' },
  { id: '21', parent_id: '20' },
  { id: '30', parent_id: '5' },
]
const rootSmall = G.rootFinder(TREE_SMALL) as (c: string) => string | null
const row = (id: string, cats: string[], hints: string[], over: Partial<SrcRow> = {}): SrcRow => ({ id, lang: 'ar', title: `عنوان ${id}`, hints, categories: cats, class: 'sahih', tier: '1', ...over })
// Six valid wrong options for a hadith under root 5 whose benefits are about charity and neighbours: roots 3 and 4,
// lengths near theirs, no words in common.
const VALID = [
  row('101', ['10'], ['وجوب الإيمان بالملائكة الكرام']),
  row('102', ['20'], ['مشروعية الوضوء قبل الصلاة دائما']),
  row('103', ['21'], ['تحريم الربا في البيع والشراء']),
  row('104', ['10'], ['إثبات صفة العلو لله تعالى']),
  row('105', ['21'], ['استحباب السواك عند كل صلاة']),
  row('106', ['10'], ['الإيمان باليوم الآخر وما فيه']),
]

describe('normalisation, overlap, length and number markers', () => {
  it('removes harakat, tatweel, hamza marks, Latin accents and punctuation; lower case', () => {
    expect([...G.words('عِظَمُ حَقِّ الجـــار، ووجوب مراعاة ذلك.')]).toEqual(['عظم', 'حق', 'الجار', 'ووجوب', 'مراعاة', 'ذلك'])
    expect(G.words('أنه').has('انه')).toBe(true)
    expect([...G.words('Istighfār (seeking) Allah’s — FORGIVENESS!\r')]).toEqual(['istighfar', 'seeking', 'allah', 's', 'forgiveness'])
    expect([...G.words('L’été, déjà.')]).toEqual(['l', 'ete', 'deja'])
    // Indic vowel signs are part of the word, not diacritics.
    expect([...G.words('पड़ोसी के अधिकार')].length).toBe(3)
  })
  it('overlap is shared words over the smaller set; half or more is too close', () => {
    const a = G.words('صيام الاثنين والخميس')
    expect(G.overlap(a, G.words('صيام يوم عرفة'))).toBeCloseTo(1 / 3)
    expect(G.tooClose(a, G.words('صيام يوم عرفة'))).toBe(false)
    expect(G.tooClose(a, G.words('صيام الاثنين'))).toBe(true) // 2 of 2
    expect(G.tooClose(G.words('a b c d'), G.words('a b x y'))).toBe(true) // exactly half
    expect(G.tooClose(G.words('a b c d e'), G.words('a b x y z'))).toBe(false) // 2 of 5
  })
  it('length ignores harakat and repeated spaces', () => {
    expect(G.visibleLength('عِظَمُ  حَقِّ')).toBe('عظم حق'.length)
  })
  it('number markers in any digits, or none', () => {
    expect(G.numberMarker('1- Besarnya hak tetangga')).toBe('1')
    expect(G.numberMarker('٣) فائدة')).toBe('3')
    expect(G.numberMarker('  12. Something')).toBe('12')
    expect(G.numberMarker('فضل من يكفل يتيمًا')).toBe('')
    expect(G.numberMarker('2023 was a year')).toBe('')
  })
  it('the answer key is the same in the loader and the worker (UTF-8 FNV-1a)', () => {
    for (const s of ['', 'abc', 'صيغ الاستغفار تختلف وبعضها أفضل من بعض.', 'There are\r', 'ﷺ 𝔸 😀', 'पड़ोसी']) expect(G.answerKey(s)).toBe(answerKey(s))
    expect(answerKey('a')).toBe('e40c292c') // FNV-1a 32 of "a"
  })
  it('mulberry32 is deterministic and in [0, 1)', () => {
    const a = G.mulberry32(42)
    const b = G.mulberry32(42)
    const xs = Array.from({ length: 50 }, () => a())
    expect(xs).toEqual(Array.from({ length: 50 }, () => b()))
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true)
  })
})

describe('the generator rules', () => {
  // Target 1 under root 5. Candidates: under roots 3 and 4 (valid), root 5 (same root), mixed roots 4+5, weak,
  // mixed class, outside the tree, too close in words, too long, too short.
  const target = row('1', ['30'], ['فضل الصدقة في السر وعظم أجرها', 'الحث على الإحسان إلى الجار'])
  const ok = (id: string, cat: string, h: string) => row(id, [cat], [h])
  const INVALID = [
    ok('201', '30', 'استحباب صلة الرحم وبر الوالدين'), // same root (5)
    row('202', ['20', '30'], ['جواز المسح على الخفين للمقيم']), // one category under root 5
    row('203', ['10'], ['ثبوت عذاب القبر ونعيمه للناس'], { class: 'weak', tier: 'X' }),
    row('204', ['10'], ['فضل الذكر بعد الصلوات المكتوبة'], { class: 'mixed', tier: 'X' }),
    row('205', ['99'], ['بيان أحكام الطهارة من النجاسة']), // outside the tree
    ok('206', '10', 'فضل الصدقة وعظم أجرها عند الله'), // shares half of its words with benefit 1
    ok('207', '20', 'بيان أن من أحكام الحج والعمرة ما يجب على الحاج فعله من الطواف والسعي والرمي والحلق'), // too long
    ok('208', '20', 'تحريم الغش'), // too short
  ]
  const rows = [target, ...VALID, ...INVALID]
  const { quizzes, stats } = build(rows, rootSmall)
  const quiz = quizzes.get('1|ar')!

  it('one question per benefit; the answer is benefit n with its key; three wrong options from valid hadiths only', () => {
    expect(quiz.q.map((x) => x.n)).toEqual([0, 1])
    for (const x of quiz.q) {
      expect(x.k).toBe(answerKey(target.hints[x.n]))
      expect(x.a).toBeGreaterThanOrEqual(0)
      expect(x.a).toBeLessThan(4)
      expect(x.w).toHaveLength(3)
      for (const w of x.w) {
        expect(VALID.map((r) => r.id)).toContain(w.id)
        const src = rows.find((r) => r.id === w.id)!
        expect(w.t).toBe(src.hints[w.i])
        expect(w.ti).toBe(src.title)
      }
      expect(new Set(x.w.map((w) => w.id)).size).toBe(3)
    }
    // No benefit used twice in one hadith's questions.
    const used = quiz.q.flatMap((x) => x.w.map((w) => `${w.id}:${w.i}`))
    expect(new Set(used).size).toBe(used.length)
    expect(stats.ar.questions).toBeGreaterThanOrEqual(2)
  })
  it('fixed: the same rows give the same choice and order, whatever their order', () => {
    expect(build([...rows].reverse(), rootSmall).quizzes.get('1|ar')).toEqual(quiz)
  })
  it('at most five questions, from the first five benefits', () => {
    const en = { lang: 'en' }
    const many = row('2', ['30'], Array.from({ length: 7 }, (_, k) => `topic${k} word${k} item${k} thing${k}`), en)
    const pool = Array.from({ length: 30 }, (_, i) => row(String(300 + i), [i % 2 ? '10' : '21'], [`other${i} words${i} here${i} now${i}`], en))
    const q = build([many, ...pool], rootSmall).quizzes.get('2|en')!
    expect(q.q.map((x) => x.n)).toEqual([0, 1, 2, 3, 4])
  })
  it('a question without three valid wrong options is dropped; none kept → no quiz', () => {
    const lone = row('3', ['30'], ['فضل الصدقة في السر وعظم أجرها'])
    const r = build([lone, VALID[0], VALID[1], ...INVALID], rootSmall)
    expect(r.quizzes.has('3|ar')).toBe(false)
    expect(r.stats.ar.dropped).toBeGreaterThanOrEqual(1)
  })
  it('a weak, mawdu or mixed hadith gets no quiz; a row without benefits neither', () => {
    const weak = row('4', ['30'], ['فضل الصدقة في السر وعظم أجرها'], { class: 'weak', tier: 'X' })
    const bare = row('5', ['30'], [])
    const r = build([weak, bare, ...VALID], rootSmall)
    expect(r.quizzes.has('4|ar')).toBe(false)
    expect(r.quizzes.has('5|ar')).toBe(false)
    expect(r.stats.ar.tierX).toBe(1)
  })
  it('accepted and shown is judged on the Arabic row too: a hadith weak in Arabic but sahih in English is never used', () => {
    // As 65065 in the real data: its Arabic row is tier X «ضعيف» (the page shows the weak badge), its English row tier 2.
    const en = { lang: 'en' }
    const t = row('1', ['30'], ['The virtue of hidden charity and its great reward'], en)
    const pool = [
      row('111', ['10'], ['Belief in the noble angels is required'], en),
      row('112', ['20'], ['Ablution before every prayer is prescribed'], en),
      row('209', ['21'], ['Usury is forbidden in buying and selling'], en),
    ]
    const arOf = (r: SrcRow, over: Partial<SrcRow> = {}) => ({ ...r, lang: 'ar', ...over })
    // With every Arabic row sahih, the only three candidates make the question, 209 among them.
    const sahih = build([t, ...pool, ...pool.map((r) => arOf(r))], rootSmall)
    expect(sahih.quizzes.get('1|en')!.q[0].w.map((w) => w.id).sort()).toEqual(['111', '112', '209'])
    expect(sahih.stats.en.tierX).toBe(0)
    // 209 weak in Arabic: not a wrong option (the question has two left, so it is dropped) and no quiz of its own.
    const weakAr = build([t, ...pool, arOf(pool[0]), arOf(pool[1]), arOf(pool[2], { class: 'weak', tier: 'X' })], rootSmall)
    expect(weakAr.quizzes.has('1|en')).toBe(false)
    expect(weakAr.quizzes.has('209|en')).toBe(false)
    expect(weakAr.stats.en.tierX).toBe(1)
    for (const c of ['mawdu', 'mixed']) expect(build([t, ...pool, arOf(pool[2], { class: c, tier: 'X' })], rootSmall).quizzes.has('209|en')).toBe(false)
    // And the other way: a language row weak under an Arabic row sahih is not used either.
    expect(build([t, pool[0], pool[1], { ...pool[2], class: 'weak', tier: 'X' }, ...pool.map((r) => arOf(r))], rootSmall).quizzes.has('1|en')).toBe(false)
  })
  it('the wrong options are in the same language only', () => {
    const en = row('1', ['30'], ['The virtue of hidden charity and its great reward'], { lang: 'en' })
    const r = build([en, ...VALID], rootSmall) // the pool is Arabic only
    expect(r.quizzes.has('1|en')).toBe(false)
  })
  it('a numbered answer («2- …») takes wrong options with the same number', () => {
    const t = row('6', ['30'], ['1- Keutamaan sedekah', '2- Anjuran berbuat baik kepada tetangga'], { lang: 'id' })
    const pool = [
      ...Array.from({ length: 6 }, (_, i) => row(String(600 + i), ['10'], [`1- Wajib${i} iman${i}`, `2- Sunnah${i} wudu${i} lagi${i} sebelum${i}`], { lang: 'id' })),
      ...Array.from({ length: 6 }, (_, i) => row(String(700 + i), ['20'], [`Tanpa nomor kata${i} lagi`], { lang: 'id' })),
    ]
    const q = build([t, ...pool], rootSmall).quizzes.get('6|id')!
    expect(q.q).toHaveLength(2)
    for (const x of q.q) for (const w of x.w) expect(G.numberMarker(w.t)).toBe(String(x.n + 1))
  })
})

// ---------- The route ----------
type DbRow = SrcRow & { quiz?: string | null; text?: string }
function envWith(rows: DbRow[], migrate = true) {
  const db = new DatabaseSync(':memory:')
  db.exec(MIG('0008_hadiths.sql'))
  db.exec(MIG('0009_hadith_mawquf.sql'))
  if (migrate) db.exec(MIG('0013_hadith_quiz.sql'))
  const cols = ['id', 'lang', 'title', 'text', 'hints', 'categories', 'class', 'tier', ...(migrate ? ['quiz'] : [])]
  const ins = db.prepare(`INSERT INTO hadiths (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`)
  for (const r of rows) ins.run(r.id, r.lang, r.title, r.text ?? 'نص', JSON.stringify(r.hints), JSON.stringify(r.categories), r.class, r.tier, ...(migrate ? [r.quiz ?? null] : []))
  return { DB: new SqliteD1(db) } as unknown as Env
}
const get = async (env: Env, p: string) => {
  const url = new URL(`https://x.test${p}`)
  const res = (await handleHadith(new Request(url), env, url))!
  return { status: res.status, body: (await res.json()) as any, cache: res.headers.get('cache-control') }
}

describe('GET /api/hadith/:id/quiz', () => {
  const target = row('1', ['30'], ['فضل الصدقة في السر وعظم أجرها', 'الحث على الإحسان إلى الجار'])
  const pool = VALID
  const stored = build([target, ...pool], rootSmall).quizzes.get('1|ar')!
  const withQuiz = (q: unknown) => [{ ...target, quiz: typeof q === 'string' ? q : JSON.stringify(q) }, ...pool]

  it('the stored questions, the answer at its place taken from the row’s own benefit, the others with their hadith', async () => {
    const r = await get(envWith(withQuiz(stored)), '/api/hadith/1/quiz?lang=ar')
    expect(r.status).toBe(200)
    expect(r.cache).toMatch(/max-age=86400/)
    expect(r.body.id).toBe('1')
    expect(r.body.lang).toBe('ar')
    expect(r.body.questions).toHaveLength(stored.q.length)
    for (const [k, q] of (r.body.questions as { n: number; answer: number; options: { text: string; id: string; title: string | null }[] }[]).entries()) {
      expect(q.n).toBe(stored.q[k].n)
      expect(q.options).toHaveLength(4)
      expect(q.options[q.answer]).toEqual({ text: target.hints[q.n], id: '1', title: null })
      const wrong = q.options.filter((_, i) => i !== q.answer)
      expect(wrong.map((o) => o.id)).toEqual(stored.q[k].w.map((w) => w.id))
      for (const o of wrong) expect(o.title).toBe(`عنوان ${o.id}`)
    }
  })
  it('a stale quiz (the benefit changed since) drops that question', async () => {
    const changed = { ...target, hints: ['فائدة أخرى غير التي حسب عليها السؤال', target.hints[1]] }
    const env = envWith([{ ...changed, quiz: JSON.stringify(stored) }, ...pool])
    const r = await get(env, '/api/hadith/1/quiz?lang=ar')
    expect(r.body.questions.map((q: { n: number }) => q.n)).toEqual([1])
  })
  it('malformed, absent, or another format: no questions, cached briefly', async () => {
    for (const q of ['not json', '{"v":2,"q":[]}', JSON.stringify({ v: 1, q: [{ ...stored.q[0], a: 7 }] }), JSON.stringify({ v: 1, q: [{ ...stored.q[0], w: stored.q[0].w.slice(0, 2) }] })]) {
      const r = await get(envWith(withQuiz(q)), '/api/hadith/1/quiz?lang=ar')
      expect(r.body.questions, q).toEqual([])
      expect(r.cache).toMatch(/max-age=600/)
    }
    expect((await get(envWith([target, ...pool]), '/api/hadith/1/quiz?lang=ar')).body.questions).toEqual([])
  })
  it('a database without migration 0013 answers no questions (no error)', async () => {
    const r = await get(envWith([target, ...pool], false), '/api/hadith/1/quiz?lang=ar')
    expect(r.status).toBe(200)
    expect(r.body.questions).toEqual([])
  })
  it('the row of that language only; a missing row or language gives none; a bad id is not found', async () => {
    const env = envWith(withQuiz(stored))
    expect((await get(env, '/api/hadith/1/quiz?lang=en')).body.questions).toEqual([])
    expect((await get(env, '/api/hadith/999/quiz?lang=ar')).body.questions).toEqual([])
    for (const p of ['/api/hadith/abc/quiz', '/api/hadith/1%27/quiz', '/api/hadith/12345678/quiz']) expect((await get(env, p)).status).toBe(404)
  })
  it('a weak or mixed row shows none, whatever is stored', async () => {
    const env = envWith([{ ...target, class: 'weak', tier: 'X', quiz: JSON.stringify(stored) }, ...pool])
    expect((await get(env, '/api/hadith/1/quiz?lang=ar')).body.questions).toEqual([])
  })
  it('a row sahih in its language but weak, mawdu or mixed in Arabic shows none (the page shows the Arabic grade)', async () => {
    const en = row('1', ['30'], ['The virtue of hidden charity and its great reward'], { lang: 'en' })
    const enPool = [
      row('111', ['10'], ['Belief in the noble angels is required'], { lang: 'en' }),
      row('112', ['20'], ['Ablution before every prayer is prescribed'], { lang: 'en' }),
      row('113', ['21'], ['Usury is forbidden in buying and selling'], { lang: 'en' }),
    ]
    const q = build([en, ...enPool], rootSmall).quizzes.get('1|en')!
    expect(q).toBeDefined()
    const rows = (ar: Partial<SrcRow>) => [{ ...en, quiz: JSON.stringify(q) }, ...enPool, { ...target, ...ar }]
    expect((await get(envWith(rows({})), '/api/hadith/1/quiz?lang=en')).body.questions).toHaveLength(q.q.length)
    for (const c of ['weak', 'mawdu', 'mixed']) expect((await get(envWith(rows({ class: c, tier: 'X' })), '/api/hadith/1/quiz?lang=en')).body.questions, c).toEqual([])
    // No Arabic row at all: none either (the page has nothing to show).
    expect((await get(envWith([{ ...en, quiz: JSON.stringify(q) }, ...enPool]), '/api/hadith/1/quiz?lang=en')).body.questions).toEqual([])
  })
  it('readQuiz keeps at most five questions, each benefit once', () => {
    const q = stored.q[0]
    const raw = JSON.stringify({ v: 1, q: [q, q, { ...q, n: 9 }] })
    expect(readQuiz('1', target.hints, raw)).toHaveLength(1)
  })
})

// ---------- The real data ----------
describe.skipIf(!hasData)('the real data (reply 0033 §أ2: 5503, 4965, 66269, 6183, a hadith without benefits)', () => {
  const read = (f: string) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [])
  const all = hasData ? ([...read(HADITH), ...read(WEAK)] as SrcRow[]) : []
  const tree = hasData ? JSON.parse(fs.readFileSync(TREE, 'utf8')) : []
  const rootOf = G.rootFinder(tree) as (c: string) => string | null
  const { quizzes, stats } = hasData ? build(all, rootOf) : { quizzes: new Map<string, Stored>(), stats: {} }
  const byKey = new Map(all.map((r) => [`${r.id}|${r.lang}`, r]))
  const hintsOf = (r: SrcRow) => G.hintsOf(r) as string[]
  const shown = (r: SrcRow | undefined) => !!r && ['1', '2', '3'].includes(r.tier) && !['mixed', 'weak', 'mawdu'].includes(r.class)
  const rootsMemo = new Map<string, Set<string | null>>()
  const rootsOf = (id: string) => {
    if (!rootsMemo.has(id)) rootsMemo.set(id, new Set(byKey.get(`${id}|ar`)!.categories.map((c) => rootOf(String(c)))))
    return rootsMemo.get(id)!
  }

  /** Every rule of §أ2, re-checked on a stored quiz from the source rows themselves: the list of what breaks. */
  function violations(key: string, q: Stored): string[] {
    const bad: string[] = []
    const fail = (ok: boolean, what: string) => ok || bad.push(`${key}: ${what}`)
    const self = byKey.get(key)!
    const hs = hintsOf(self)
    const own = rootsOf(self.id)
    const ownWords = hs.map((h) => G.words(h))
    fail(q.q.length >= 1 && q.q.length <= 5, 'one to five questions')
    for (const x of q.q) {
      fail(x.n < Math.min(5, hs.length), `n ${x.n} within the first five benefits`)
      fail(x.k === answerKey(hs[x.n]), `the key of benefit ${x.n}`)
      fail(x.a >= 0 && x.a <= 3, 'the answer among the four')
      const len = G.visibleLength(hs[x.n])
      fail(new Set(x.w.map((w) => w.id)).size === 3 && x.w.length === 3, 'three wrong options from three hadiths')
      for (const w of x.w) {
        const src = byKey.get(`${w.id}|${self.lang}`)
        if (!src) {
          bad.push(`${key}: ${w.id} has no ${self.lang} row`)
          continue
        }
        const at = `q${x.n} ← ${w.id}`
        fail(w.id !== self.id, `${at}: another hadith`)
        // Verbatim, with the source's title.
        fail(hintsOf(src)[w.i] === w.t, `${at}: verbatim benefit ${w.i}`)
        fail(w.ti === src.title, `${at}: its title`)
        // Accepted and shown, in this language and in Arabic (the page shows the Arabic row's grade).
        fail(shown(src), `${at}: tier 1–3, not mixed, weak or mawdu`)
        fail(shown(byKey.get(`${w.id}|ar`)), `${at}: its Arabic row tier 1–3, not mixed, weak or mawdu`)
        // Every root of the source differs from every root of this hadith.
        for (const r of rootsOf(w.id)) fail(r != null && !own.has(r), `${at}: root ${r} not one of this hadith's`)
        // Fewer than half the words in common with every benefit of this hadith.
        const ww = G.words(w.t)
        for (const ow of ownWords) fail(G.overlap(ww, ow) < 0.5, `${at}: under half the words in common`)
        // Length within 0.6–1.6 of the answer's; the same number marker.
        const l = G.visibleLength(w.t)
        fail(l >= 0.6 * len && l <= 1.6 * len, `${at}: length ${l} within 0.6–1.6 × ${len}`)
        fail(G.numberMarker(w.t) === G.numberMarker(hs[x.n]), `${at}: the same number marker`)
      }
    }
    return bad
  }
  const checkQuiz = (key: string, q: Stored) => expect(violations(key, q)).toEqual([])

  it('5503 (2 benefits) in Arabic, English and Urdu: two questions each, every rule holds', () => {
    for (const lang of ['ar', 'en', 'ur']) {
      const q = quizzes.get(`5503|${lang}`)!
      expect(q, lang).toBeDefined()
      expect(q.q.map((x) => x.n)).toEqual([0, 1])
      checkQuiz(`5503|${lang}`, q)
    }
    // The answer of question 1 in Arabic, as on the board.
    expect(hintsOf(byKey.get('5503|ar')!)[0]).toBe('صيغ الاستغفار تختلف وبعضها أفضل من بعض.')
  })
  it('4965 (4 benefits) in Arabic, English, Urdu and Indonesian (numbered): four questions each', () => {
    for (const lang of ['ar', 'en', 'ur', 'id']) {
      const q = quizzes.get(`4965|${lang}`)!
      expect(q.q.map((x) => x.n), lang).toEqual([0, 1, 2, 3])
      checkQuiz(`4965|${lang}`, q)
    }
  })
  it('66269 (one benefit, Arabic only) and 6183 (Arabic benefits only)', () => {
    expect(quizzes.get('66269|ar')!.q).toHaveLength(1)
    checkQuiz('66269|ar', quizzes.get('66269|ar')!)
    expect(quizzes.get('6183|ar')!.q).toHaveLength(2)
    checkQuiz('6183|ar', quizzes.get('6183|ar')!)
    // No English or Urdu benefits for 6183, no English row for 66269: no quiz.
    expect(quizzes.has('6183|en')).toBe(false)
    expect(quizzes.has('6183|ur')).toBe(false)
    expect(quizzes.has('66269|en')).toBe(false)
  })
  it('65065, weak in Arabic and «Authentic hadith» in its English row, has no quiz and is no wrong option', () => {
    expect(byKey.get('65065|ar')).toMatchObject({ tier: 'X', class: 'weak' })
    expect(byKey.get('65065|en')).toMatchObject({ tier: '2', class: 'sahih' })
    expect(hintsOf(byKey.get('65065|en')!).length).toBeGreaterThan(0)
    for (const lang of ['ar', 'en', 'ur']) expect(quizzes.has(`65065|${lang}`), lang).toBe(false)
    const uses = [...quizzes.values()].flatMap((q) => q.q.flatMap((x) => x.w)).filter((w) => w.id === '65065')
    expect(uses).toEqual([])
    // Tier X rows with benefits in the ten languages: 65065 in en (now) and in ar, ur, tr, es, bn, hi, and 10877 in
    // ar: eight. (The 21 languages fetched in reply 0033-add2 §2 have their own; every stored quiz is checked below.)
    const TEN = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']
    expect(stats.en.tierX).toBe(1)
    expect(Object.entries(stats).filter(([l]) => TEN.includes(l)).reduce((a, [, s]) => a + s.tierX, 0)).toBe(8)
  })
  it('a hadith without benefits (65920) has no quiz', () => {
    expect(hintsOf(byKey.get('65920|ar')!)).toEqual([])
    expect(quizzes.has('65920|ar')).toBe(false)
  })
  it('every stored quiz of every language keeps every rule; the weak, mawdu and mixed have none', () => {
    const bad: string[] = []
    for (const [key, q] of quizzes) bad.push(...violations(key, q))
    expect(bad.slice(0, 20)).toEqual([])
    for (const r of all) if (!shown(r) || !shown(byKey.get(`${r.id}|ar`))) expect(quizzes.has(`${r.id}|${r.lang}`)).toBe(false)
    // Most rows with benefits get a quiz in every language (the counts are in the loader's output and the report).
    for (const [lang, s] of Object.entries(stats)) expect(s.quizzes / s.withHints, lang).toBeGreaterThan(0.95)
  })
  it('through the route: the real rows of 5503 and their sources, Arabic and Urdu', async () => {
    for (const lang of ['ar', 'ur']) {
      const q = quizzes.get(`5503|${lang}`)!
      const ids = new Set(['5503', ...q.q.flatMap((x) => x.w.map((w) => w.id))])
      // The rows of that language, and the Arabic row of 5503, whose grade the route checks too.
      const rows = all
        .filter((r) => ids.has(r.id) && (r.lang === lang || (r.id === '5503' && r.lang === 'ar')))
        .map((r) => ({ ...r, quiz: quizzes.has(`${r.id}|${r.lang}`) ? JSON.stringify(quizzes.get(`${r.id}|${r.lang}`)) : null }))
      const r = await get(envWith(rows), `/api/hadith/5503/quiz?lang=${lang}`)
      expect(r.body.questions).toHaveLength(2)
      const hs = hintsOf(byKey.get(`5503|${lang}`)!)
      for (const x of r.body.questions as { n: number; answer: number; options: { text: string; id: string }[] }[]) {
        expect(x.options[x.answer]).toMatchObject({ text: hs[x.n], id: '5503' })
        for (const o of x.options.filter((_, i) => i !== x.answer)) expect(hintsOf(byKey.get(`${o.id}|${lang}`)!)).toContain(o.text)
      }
    }
  })
})

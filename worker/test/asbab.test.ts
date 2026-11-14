// «سبب النزول» (add-on 0033-add7 §أ): the normaliser and the three linking methods of scripts/daily/asbab-build.mjs on
// synthetic strings (no source text), and data/asbab-map.json: ids and ayah keys only, the ayah index consistent with
// the entries, every review entry `reviewed: false` and outside the index until the coordinator decides it
// (data/asbab-decisions.json, reply 0037 §2; applyDecisions). The rebuild against HadeethEnc and the Quran needs
// data/raw and data/processed (outside git) and skips without them.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error a plain .mjs build script
import * as A from '../../scripts/daily/asbab-build.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')
const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/asbab-map.json'), 'utf8'))
const DECISIONS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/asbab-decisions.json'), 'utf8'))

// A made-up "Quran" of two suras, its words invented for the test.
const Q = A.quranIndex([
  { sura: 1, aya: 1, sura_name: 'الأولى', text: 'قَالَ الْعَبْدُ إِلَىٰ رَبِّهِ' },
  { sura: 1, aya: 2, sura_name: 'الأولى', text: 'وَجَاءَ النَّاسُ ۚ مِنْ كُلِّ بَلَدٍ وَمَعَهُمْ زَادٌ كَثِيرٌ' },
  { sura: 1, aya: 3, sura_name: 'الأولى', text: 'كَلِمَةٌ ثَانِيَةٌ' },
  { sura: 1, aya: 4, sura_name: 'الأولى', text: 'فَسَارَ الْقَوْمُ فِي الْأَرْضِ' },
  { sura: 2, aya: 1, sura_name: 'سبإ', text: 'فَسَارَ الْقَوْمُ فِي الْأَرْضِ' },
  { sura: 2, aya: 2, sura_name: 'سبإ', text: 'وَجَاءَ النَّاسُ مِنْ كُلِّ بَلَدٍ' },
  { sura: 2, aya: 3, sura_name: 'سبإ', text: 'هَذَا قَوْلٌ أَوَّلُ مِنَ الْأَقْوَالِ فِي الْكِتَابِ الْمَكْتُوبِ' },
])
const words = (s: string) => A.arWords(s) as string[]

describe('the normaliser (add-on §أ.2)', () => {
  it('drops harakat, the dagger alef, Quranic marks, tatweel and zero-width characters', () => {
    expect(A.normalizeAr('قَالَ')).toBe('قال')
    expect(A.normalizeAr('الرَّحْمَٰنِ')).toBe('الرحمن')
    expect(A.normalizeAr('النَّاسُ ۚ مِنْ')).toBe('الناس  من')
    expect(A.normalizeAr('قـــال')).toBe('قال')
    expect(A.normalizeAr('عن ‌حمران')).toBe('عن حمران')
  })
  it('one alef for أ إ آ ٱ; ة → ه; ى → ي', () => {
    expect(A.normalizeAr('أإآٱا')).toBe('ااااا')
    expect(A.normalizeAr('رَحْمَةٌ')).toBe('رحمه')
    expect(A.normalizeAr('إِلَىٰ')).toBe('الي')
    expect(A.normalizeAr('ٱلْحَمْدُ')).toBe('الحمد')
  })
  it('words are runs of Arabic letters: braces, brackets, punctuation and digits are not words', () => {
    expect(words('{قالَ: نعم، لا} [الأولى: 2].')).toEqual(['قال', 'نعم', 'لا', 'الاولي'])
  })
})

describe('method 1: the reference in square brackets', () => {
  it('a sura name, normalised, equal to a sura_name; the ayah must exist', () => {
    expect(A.bracketRefs('… {قال العبد} [الأولى: 1] …', Q)).toEqual([{ raw: 'الأولى: 1', ok: true, keys: ['quran:1:1'] }])
    // «سبأ» in the hadith, «سبإ» in quran.jsonl: the same after normalisation; «سورة» before the name is allowed.
    expect(A.bracketRefs('[سبأ: 3]', Q)[0]).toEqual({ raw: 'سبأ: 3', ok: true, keys: ['quran:2:3'] })
    expect(A.bracketRefs('[سورة الأولى: 2]', Q)[0].keys).toEqual(['quran:1:2'])
    expect(A.bracketRefs('[الأولى: ٢]', Q)[0].keys).toEqual(['quran:1:2'])
  })
  it('ranges and lists are expanded', () => {
    expect(A.bracketRefs('[الأولى: 2 - 4]', Q)[0].keys).toEqual(['quran:1:2', 'quran:1:3', 'quran:1:4'])
    expect(A.bracketRefs('[الأولى: 1، 3]', Q)[0].keys).toEqual(['quran:1:1', 'quran:1:3'])
  })
  it('an unknown name or a number outside the sura is not linked, and says why', () => {
    expect(A.bracketRefs('[الثالثة: 1]', Q)[0]).toMatchObject({ ok: false, why: 'sura name not in quran.jsonl' })
    expect(A.bracketRefs('[الأولى: 9]', Q)[0]).toMatchObject({ ok: false })
    expect(A.bracketRefs('[ص 12] [انظر الحاشية]', Q)).toEqual([])
  })
})

describe('method 2: the whole ayah inside the hadith text', () => {
  it('an ayah of 3 words or more, found after normalisation', () => {
    expect(A.fullTextMatches(words('ثم قال: {قالَ العبدُ إلى ربِّه} الآية'), Q).linked).toEqual(['quran:1:1'])
  })
  it('an ayah under 3 words is never matched by its whole text', () => {
    expect(A.fullTextMatches(words('قال: كلمةٌ ثانيةٌ'), Q).linked).toEqual([])
  })
  it('an ayah inside a longer matched ayah is dropped', () => {
    // 2:2 is the first five words of 1:2: only 1:2 is linked.
    expect(A.fullTextMatches(words('وجاء الناس من كل بلد ومعهم زاد كثير'), Q).linked).toEqual(['quran:1:2'])
  })
  it('a text found in two ayat (1:4 and 2:1) is ambiguous and not linked', () => {
    const r = A.fullTextMatches(words('فسار القوم في الأرض'), Q)
    expect(r.linked).toEqual([])
    expect(r.ambiguous).toEqual([['quran:1:4', 'quran:2:1']])
  })
})

describe('method 3: the longest run of shared words', () => {
  const runs = (s: string) => A.longestRuns(words(s), Q) as { key: string; words: number }[]
  it('counts the longest run per ayah, best first', () => {
    const r = runs('قيل: هذا قول أول من الأقوال في الكتاب، والله أعلم')
    expect(r[0]).toEqual({ key: 'quran:2:3', words: 7 })
  })
  it('accepted at 6 words or more and 3 ahead of the runner-up', () => {
    expect(A.runAccepted([{ key: 'a', words: 6 }, { key: 'b', words: 3 }])).toBe(true)
    expect(A.runAccepted([{ key: 'a', words: 6 }])).toBe(true)
    expect(A.runAccepted([{ key: 'a', words: 5 }, { key: 'b', words: 1 }])).toBe(false)
    expect(A.runAccepted([{ key: 'a', words: 9 }, { key: 'b', words: 7 }])).toBe(false)
    expect(A.runAccepted([])).toBe(false)
  })
  it('a 5-word run goes to review', () => {
    expect(A.linkHadith({ hadeeth: 'فقال: هذا قول أول من الأقوال وسكت', explanation: '' }, Q)).toMatchObject({ method: 'review', ayat: [] })
  })
})

describe('the order of the methods', () => {
  it('a bracket in the text wins; the explanation counts only when the text has none', () => {
    const h = { hadeeth: '{قال العبد إلى ربه} [سبأ: 3]', explanation: '[الأولى: 2]' }
    expect(A.linkHadith(h, Q)).toMatchObject({ method: 'bracket', from: 'text', ayat: ['quran:2:3'] })
    expect(A.linkHadith({ hadeeth: 'قال العبد إلى ربه', explanation: '[الأولى: 2]' }, Q)).toMatchObject({ method: 'bracket', from: 'explanation', ayat: ['quran:1:2'] })
  })
  it('then the whole text, then the run', () => {
    expect(A.linkHadith({ hadeeth: 'فنزلت: قال العبد إلى ربه', explanation: '' }, Q)).toMatchObject({ method: 'full_text', ayat: ['quran:1:1'] })
    expect(A.linkHadith({ hadeeth: 'فنزلت: هذا قول أول من الأقوال في الكتاب', explanation: '' }, Q)).toMatchObject({ method: 'longest_run', ayat: ['quran:2:3'] })
  })
  it('the out-of-category markers, after normalisation, anywhere in the text', () => {
    expect(A.revelationMarker('فأنزلَ اللهُ: {…}')).toEqual(['فانزل الله'])
    expect(A.revelationMarker('أُنزلت هذه الآية في كذا')).toEqual(['نزلت هذه الايه'])
    expect(A.revelationMarker('فنزلت')).toEqual(['فنزلت'])
    expect(A.revelationMarker('نزل المطر')).toEqual([])
  })
})

describe('data/asbab-map.json', () => {
  const KEY = /^quran:\d{1,3}:\d{1,3}$/
  const entries = Object.entries(MAP.hadiths) as [string, any][]
  it('ids, ayah keys, methods and tiers only: no source text', () => {
    const allowed = new Set(['ayat', 'method', 'from', 'tier', 'class', 'mawquf', 'score', 'full_text_not_linked', 'full_text_ambiguous', 'reviewed', 'candidates', 'unresolved_refs', 'decision', 'added'])
    for (const [id, e] of entries) {
      expect(id).toMatch(/^\d+$/)
      for (const k of Object.keys(e)) expect(allowed.has(k), `${id}.${k}`).toBe(true)
      for (const k of e.ayat) expect(k).toMatch(KEY)
      expect(['bracket', 'full_text', 'longest_run', 'review']).toContain(e.method)
    }
  })
  it('the ayah index is the automatic links and the reviewed entries with ayat; the rest of the review stays outside', () => {
    const fromEntries = new Map<string, string[]>()
    for (const [id, e] of entries) {
      if (e.method === 'review') {
        // A review entry has no ayah and `reviewed: false` until the coordinator decides it (data/asbab-decisions.json,
        // reply 0037 §2): linked, with its ayat; or not linked, with none.
        const linked = DECISIONS.link[id]
        const closed = DECISIONS.not_linked.includes(id)
        expect(e.reviewed, id).toBe(Boolean(linked || closed))
        expect(e.decision, id).toBe(linked ? 'linked' : closed ? 'not_linked' : undefined)
        expect(e.ayat, id).toEqual(linked ?? [])
        if (linked) for (const k of e.ayat) fromEntries.set(k, [...(fromEntries.get(k) ?? []), id])
      } else {
        expect(e.ayat.length, id).toBeGreaterThan(0)
        expect(e.reviewed, id).toBeUndefined()
        for (const k of e.ayat) fromEntries.set(k, [...(fromEntries.get(k) ?? []), id])
      }
    }
    expect(Object.keys(MAP.by_ayah).sort()).toEqual([...fromEntries.keys()].sort())
    for (const [k, ids] of Object.entries(MAP.by_ayah) as [string, string[]][]) expect([...ids].sort(), k).toEqual([...fromEntries.get(k)!].sort())
    expect(MAP.by_ayah).toEqual(A.byAyahOf(MAP.hadiths))
    expect(MAP.counts.distinct_ayat).toBe(Object.keys(MAP.by_ayah).length)
  })
  it('the decisions of reply 0037 §2, as written in the map', () => {
    const at = (id: string) => MAP.hadiths[id]
    expect(at('65334')).toMatchObject({ method: 'review', reviewed: true, decision: 'linked', ayat: ['quran:30:1', 'quran:30:2', 'quran:30:3'] })
    expect(at('65335')).toMatchObject({ method: 'review', reviewed: true, decision: 'linked', ayat: ['quran:33:35'] })
    expect(at('65958')).toMatchObject({ method: 'review', reviewed: true, decision: 'not_linked', ayat: [] })
    expect(Object.values(MAP.by_ayah).flat()).not.toContain('65958')
    const alaq = Array.from({ length: 12 }, (_, i) => `quran:96:${i + 6}`)
    expect(at('10558')).toMatchObject({ method: 'bracket', decision: 'ayat_added', ayat: alaq })
    expect(at('10558').added).toEqual(alaq.filter((k) => !['quran:96:7', 'quran:96:14', 'quran:96:17'].includes(k)))
    expect(at('10558').full_text_not_linked).toBeUndefined()
    expect(at('65310')).toMatchObject({ method: 'bracket', decision: 'ayat_added', ayat: ['quran:8:33', 'quran:8:34'], added: ['quran:8:33'] })
    // What only the explanation cites is not linked: 65313's [التوبة: 103] stays out.
    expect(at('65313').ayat).not.toContain('quran:9:103')
    expect(MAP.counts).toMatchObject({ reviewed_linked: 2, reviewed_not_linked: 1, ayat_added: 10 })
    // Nothing else is decided: every other entry is as the rules made it.
    const decided = new Set([...Object.keys(DECISIONS.link), ...DECISIONS.not_linked, ...Object.keys(DECISIONS.add_ayat)])
    for (const [id, e] of entries) if (!decided.has(id)) expect(e.decision, id).toBeUndefined()
  })
  it('applyDecisions: link, close, add, and refuse anything half-way', () => {
    const fresh = () => ({
      '1': { ayat: [], method: 'review', tier: '1', class: 'sahih', mawquf: false, reviewed: false },
      '2': { ayat: ['quran:96:7'], method: 'bracket', tier: '1', class: 'sahih', mawquf: false, full_text_not_linked: ['quran:96:6', 'quran:96:8'] },
      '3': { ayat: [], method: 'review', tier: '2', class: 'sahih', mawquf: false, reviewed: false },
    })
    const ok = (k: string) => /^quran:\d+:\d+$/.test(k) && k !== 'quran:96:99'
    const h: Record<string, any> = fresh()
    const c = A.applyDecisions(h, { link: { '1': ['quran:30:3', 'quran:30:1', 'quran:30:1'] }, not_linked: ['3'], add_ayat: { '2': ['quran:96:6', 'quran:96:7'] } }, ok)
    expect(c).toEqual({ reviewed_linked: 1, reviewed_not_linked: 1, ayat_added: 1 })
    expect(h['1']).toMatchObject({ ayat: ['quran:30:1', 'quran:30:3'], reviewed: true, decision: 'linked' })
    expect(h['3']).toMatchObject({ ayat: [], reviewed: true, decision: 'not_linked' })
    expect(h['2']).toMatchObject({ ayat: ['quran:96:6', 'quran:96:7'], added: ['quran:96:6'], decision: 'ayat_added', full_text_not_linked: ['quran:96:8'] })
    expect(A.byAyahOf(h)).toEqual({ 'quran:30:1': ['1'], 'quran:30:3': ['1'], 'quran:96:6': ['2'], 'quran:96:7': ['2'] })
    expect(() => A.applyDecisions(fresh(), { link: { '9': ['quran:1:1'] } }, ok)).toThrow(/not a hadith of category 14/)
    expect(() => A.applyDecisions(fresh(), { link: { '2': ['quran:1:1'] } }, ok)).toThrow(/not a review entry/)
    expect(() => A.applyDecisions(fresh(), { add_ayat: { '1': ['quran:1:1'] } }, ok)).toThrow(/not an automatic link/)
    expect(() => A.applyDecisions(fresh(), { link: { '1': ['quran:96:99'] } }, ok)).toThrow(/is not an ayah/)
    expect(() => A.applyDecisions(fresh(), { link: { '1': [] } }, ok)).toThrow(/no ayat/)
    expect(() => A.applyDecisions(fresh(), { link: { '1': ['quran:1:1'] }, not_linked: ['1'] }, ok)).toThrow(/both/)
    // The decisions file: ids and ayah keys only.
    for (const [id, ks] of [...Object.entries(DECISIONS.link), ...Object.entries(DECISIONS.add_ayat)] as [string, string[]][]) {
      expect(id).toMatch(/^\d+$/)
      for (const k of ks) expect(k).toMatch(KEY)
    }
  })
  it('the counts add up; the linked are all tiers 1–3 (the display condition)', () => {
    const c = MAP.counts
    expect(c.bracket + c.full_text + c.longest_run + c.review).toBe(c.category_14)
    expect(c.linked).toBe(c.bracket + c.full_text + c.longest_run)
    expect(entries.length).toBe(c.category_14)
    for (const [id, e] of entries) if (e.method !== 'review') expect(['1', '2', '3'], id).toContain(e.tier)
    expect(MAP.display).toEqual({ tiers: ['1', '2', '3'], never: ['mixed'], mawquf: 'never introduced with «قال رسول الله ﷺ»' })
  })
  it('outside category 14: review only, never in the index', () => {
    const out = Object.entries(MAP.outside_category.hadiths) as [string, any][]
    expect(out.length).toBe(MAP.outside_category.counts.candidates)
    for (const [id, e] of out) {
      expect(e.reviewed, id).toBe(false)
      expect(MAP.hadiths[id], id).toBeUndefined()
      for (const k of e.suggested.ayat) expect(k).toMatch(KEY)
    }
    const indexed = new Set(Object.values(MAP.by_ayah).flat())
    for (const [id] of out) expect(indexed.has(id), id).toBe(false)
  })
})

const RAW = path.join(ROOT, 'data/raw/hadeethenc/ar')
const QURAN = path.join(ROOT, 'data/processed/quran.jsonl')
describe.skipIf(!fs.existsSync(RAW) || !fs.existsSync(QURAN))('rebuilt from the source files', () => {
  it('every category-14 hadith gets the same ayat and method as in the file', () => {
    const records = fs
      .readFileSync(QURAN, 'utf8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l))
      .filter((r) => r.kind === 'ayah')
    const Qr = A.quranIndex(records)
    // The rules, then the coordinator's decisions (data/asbab-decisions.json), give the file's ayat and methods.
    const rebuilt: Record<string, any> = {}
    for (const id of Object.keys(MAP.hadiths)) {
      const h = JSON.parse(fs.readFileSync(path.join(RAW, `${id}.json`), 'utf8'))
      expect(h.categories.map(String), id).toContain('14')
      const r = A.linkHadith(h, Qr)
      rebuilt[id] = { method: r.method, ayat: r.ayat }
    }
    A.applyDecisions(rebuilt, DECISIONS, (k: string) => Qr.byKey.has(k))
    for (const [id, e] of Object.entries(MAP.hadiths) as [string, any][]) expect({ method: rebuilt[id].method, ayat: rebuilt[id].ayat }, id).toEqual({ method: e.method, ayat: e.ayat })
  })
})

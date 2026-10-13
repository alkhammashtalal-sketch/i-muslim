// The data behind the adhkar, tasbih and names screens (reply 0032 D-5, D-6, D-8): every highlighted segment, counter
// evidence, tasbih step and name evidence is a verbatim part of its source text (diacritics removed on both sides),
// and only sahih or hasan hadiths are used. The data checks need data/processed (outside git) and skip without it.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ADHKAR_CATEGORIES } from '../src/adhkar'
import { highlightFor, locateSegments, quotePairs, type HighlightEntry } from '../src/adhkar-rules'

const ROOT = path.resolve(import.meta.dirname, '../..')
const HADITH = path.join(ROOT, 'data/processed/hadith.jsonl')
const QURAN = path.join(ROOT, 'data/processed/quran.jsonl')
const json = (f: string) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'))
export const strip = (s: string) => s.replace(/[ً-ْٰـ‌‍]/g, '').replace(/\s+/g, ' ').trim()

type H = { id: string; hadeeth: string; tier: string; categories: string[] }
const arabic = (): Map<string, H> => {
  const m = new Map<string, H>()
  for (const l of fs.readFileSync(HADITH, 'utf8').trim().split('\n')) {
    const r = JSON.parse(l)
    if (r.lang === 'ar') m.set(r.id, r)
  }
  return m
}
const has = fs.existsSync(HADITH)

describe('adhkar data', () => {
  it('eight categories, as the reply names them', () => {
    expect(ADHKAR_CATEGORIES.map((c) => c.id)).toEqual(['301', '465', '313', '302', '303', '306', '307', '308'])
  })
  it.skipIf(!has)('every category has sahih or hasan hadiths in the local data', () => {
    const ar = [...arabic().values()]
    for (const c of ADHKAR_CATEGORIES) expect(ar.filter((r) => r.categories.map(String).includes(c.id) && ['1', '2', '3'].includes(r.tier)).length, c.id).toBeGreaterThan(0)
  })
  it('highlights: one entry per hadith, a list of segments, unreviewed until the coordinator reviews (reply 0031-add16 §2)', () => {
    const list: HighlightEntry[] = json('data/adhkar-highlights.json').highlights
    expect(new Set(list.map((h) => h.id)).size).toBe(list.length)
    for (const h of list) {
      expect(Array.isArray(h.segments) && h.segments.length > 0, h.id).toBe(true)
      expect(typeof h.reviewed, h.id).toBe('boolean')
      // A hold is the question put to the coordinator, never an empty flag.
      if ('hold' in h) expect(typeof h.hold === 'string' && h.hold.trim().length > 0, h.id).toBe(true)
    }
    // Only the coordinator's review sets it; none has happened yet (13 October 2026).
    expect(list.filter((h) => h.reviewed)).toEqual([])
  })
  it.skipIf(!has)('highlights: every segment verbatim, in order, in a sahih or hasan hadith of the adhkar categories', () => {
    const ar = arabic()
    for (const h of json('data/adhkar-highlights.json').highlights as HighlightEntry[]) {
      const r = ar.get(h.id)
      expect(r, h.id).toBeDefined()
      expect(['1', '2', '3']).toContain(r!.tier)
      expect(r!.categories.map(String).some((c) => ADHKAR_CATEGORIES.some((x) => x.id === c)), h.id).toBe(true)
      for (const s of h.segments) expect(strip(r!.hadeeth), h.id).toContain(strip(s))
      // Each segment's first occurrence, in the list's order and not overlapping: what the app highlights.
      expect(locateSegments(r!.hadeeth, h.segments), h.id).not.toBeNull()
      // Every «…» quoted in a hold's question is cut from the same text.
      for (const [, q] of (h.hold ?? '').matchAll(/«([^«»]+)»/g)) expect(strip(r!.hadeeth), h.id).toContain(strip(q))
    }
  })
  it.skipIf(!has)('highlights: hidden in every hadith with more than one «…» pair or on hold, shown in the others (reply 0031-add16 §2)', () => {
    const ar = arabic()
    const hidden: string[] = []
    for (const h of json('data/adhkar-highlights.json').highlights as HighlightEntry[]) {
      const text = ar.get(h.id)!.hadeeth
      const r = highlightFor(text, h)
      expect(r.status, h.id).toBe((quotePairs(text) > 1 || h.hold) && !h.reviewed ? 'pending_review' : 'shown')
      if (r.status === 'pending_review') hidden.push(h.id)
    }
    // Before the review: nine. Seven by their «…» pairs, hadith 3008 (the dhikr cut by «قال الراوي») among them; and two
    // with one pair, held: 10947 (the istighfar in the narrator's words, outside «…») and 10948 (the 33s only described).
    expect(hidden.sort()).toEqual(['10947', '10948', '3008', '3504', '4949', '5490', '5503', '5508', '65910'])
    const ar10947 = ar.get('10947')!.hadeeth
    expect(quotePairs(ar10947)).toBe(1)
    expect(quotePairs(ar.get('10948')!.hadeeth)).toBe(1)
    // 10947's proposal is the whole dhikr: the words inside «…», then the istighfar as the narrator gives it.
    const e10947 = (json('data/adhkar-highlights.json').highlights as HighlightEntry[]).find((h) => h.id === '10947')!
    expect(e10947.segments).toHaveLength(2)
    expect(strip(e10947.segments[1])).toBe('أستغفر الله، أستغفر الله')
    expect(locateSegments(ar10947, e10947.segments)![1]).toBeGreaterThan(strip(ar10947).lastIndexOf('»'))
  })
  it.skipIf(!has)('counters: the number stated in the text itself', () => {
    const ar = arabic()
    const words: Record<number, RegExp> = { 3: /ثلاث مرات|ثلاثا/ }
    for (const c of json('data/adhkar-counts.json').counts) {
      const r = ar.get(c.id)!
      expect(strip(r.hadeeth), c.id).toContain(strip(c.evidence))
      expect(strip(c.evidence)).toMatch(words[c.count])
    }
  })
  it.skipIf(!has)('tasbih after prayer: hadith 10948, every step and its number verbatim', () => {
    const t = json('data/tasbih-after-prayer.json')
    const r = arabic().get(t.id)!
    expect(r.tier).toBe('1')
    expect(t.steps.map((s: { count: number }) => s.count)).toEqual([33, 33, 33, 1])
    for (const s of t.steps) {
      expect(strip(r.hadeeth)).toContain(strip(s.phrase))
      expect(strip(r.hadeeth)).toContain(strip(s.evidence))
      if (s.label) expect(strip(r.hadeeth)).toContain(strip(s.label))
    }
  })
  it.skipIf(!has)('tasbih words: verbatim in sahih hadiths (the shown part inside the phrase)', () => {
    const ar = arabic()
    for (const w of json('data/tasbih-after-prayer.json').words) {
      const r = ar.get(w.id)!
      expect(['1', '2']).toContain(r.tier)
      expect(strip(r.hadeeth), w.phrase).toContain(strip(w.phrase))
      if (w.cut) expect(strip(w.phrase)).toContain(strip(w.cut))
    }
  })
})

describe('names data', () => {
  const names = json('data/names.json')
  it('names from the book, with its page references', () => {
    expect(names.names.length).toBeGreaterThan(0)
    for (const n of names.names) expect(n.name && n.page, JSON.stringify(n)).toBeTruthy()
  })
  it.skipIf(!fs.existsSync(QURAN))('each Quran evidence: the ayah holds the name (normalised)', () => {
    const ayat = new Map<string, string>()
    for (const l of fs.readFileSync(QURAN, 'utf8').trim().split('\n')) {
      const r = JSON.parse(l)
      if (r.kind === 'ayah') ayat.set(r.id, r.text)
    }
    const norm = (s: string) => strip(s).replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/ۡ|ۚ|ۖ|ۗ|ۘ|ۙ|ۛ|ۜ|۟|۠|ۢ|ۥ|ۦ|ۧ|ۨ|۪|۫|۬|ۭ|ٰ/g, '')
    for (const n of names.names.filter((x: { quran?: unknown }) => x.quran)) {
      const t = ayat.get(n.quran.ayah)
      expect(t, n.name).toBeDefined()
      expect(norm(t!), `${n.name} in ${n.quran.ayah}`).toContain(norm(n.quran.match))
    }
  })
  it.skipIf(!has)('each Sunnah evidence: a sahih or hasan hadith whose text holds the name', () => {
    const ar = arabic()
    for (const n of names.names.filter((x: { sunnah?: unknown }) => x.sunnah)) {
      const r = ar.get(n.sunnah.id)!
      expect(['1', '2', '3']).toContain(r.tier)
      expect(strip(r.hadeeth), n.name).toContain(strip(n.sunnah.match))
    }
  })
})

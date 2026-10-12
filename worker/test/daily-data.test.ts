// The data behind the adhkar, tasbih and names screens (reply 0032 D-5, D-6, D-8): every highlighted phrase, counter
// evidence, tasbih step and name evidence is a verbatim part of its source text (diacritics removed on both sides),
// and only sahih or hasan hadiths are used. The data checks need data/processed (outside git) and skip without it.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ADHKAR_CATEGORIES } from '../src/adhkar'

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
  it.skipIf(!has)('highlights: verbatim, in a sahih or hasan hadith of the adhkar categories', () => {
    const ar = arabic()
    for (const h of json('data/adhkar-highlights.json').highlights) {
      const r = ar.get(h.id)
      expect(r, h.id).toBeDefined()
      expect(['1', '2', '3']).toContain(r!.tier)
      expect(r!.categories.map(String).some((c) => ADHKAR_CATEGORIES.some((x) => x.id === c)), h.id).toBe(true)
      expect(strip(r!.hadeeth), h.id).toContain(strip(h.phrase))
    }
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

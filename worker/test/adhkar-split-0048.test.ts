// 0048-add1 §ب: «أذكار الصباح» and «أذكار المساء» as two lists (data/adhkar-split.json; web/src/v2/daily/adhkar/
// adhkar-model.ts). Shown to no one until the coordinator has reviewed the table (status «reviewed»); each list holds
// the hadiths its text names and highlights its own wording, verbatim; the counts are the list's own; the list the
// screen opens on follows Fajr and Asr.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

class MemStorage {
  m = new Map<string, string>()
  getItem = (k: string) => this.m.get(k) ?? null
  setItem = (k: string, v: string) => void this.m.set(k, v)
  removeItem = (k: string) => void this.m.delete(k)
  clear = () => this.m.clear()
}
const store = new MemStorage()
vi.stubGlobal('localStorage', store)

const { ADHKAR_SPLIT, CATS, chipsOf, countKey, partItems, partNow, PARTS } = await import('../../web/src/v2/daily/adhkar/adhkar-model')
const { dayTimes } = await import('../../web/src/daily/prayer')

const ROOT = path.resolve(import.meta.dirname, '../..')
const split = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/adhkar-split.json'), 'utf8')) as {
  status: string
  category: string
  items: { id: string; parts: string[]; basis: Record<string, string>; segments: Record<string, number[]> }[]
}
const highlights = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/adhkar-highlights.json'), 'utf8')).highlights as { id: string; segments: string[] }[]
const hadiths = fs
  .readFileSync(path.join(ROOT, 'data/processed/hadith.jsonl'), 'utf8')
  .split('\n')
  .filter((l) => /"lang": ?"ar"/.test(l))
  .map((l) => JSON.parse(l) as { id: string; lang: string; hadeeth: string; categories?: string[] })
  .filter((r) => r.lang === 'ar')
const strip = (s: string) => s.replace(/[ً-ْٰـ‌‍]/g, '').replace(/\s+/g, ' ').trim()

describe('the two lists of «أذكار الصباح والمساء»', () => {
  it('reviewed by the coordinator (0048-add4 أ): the two lists first, in place of 301, the others as they are', () => {
    expect(split.status).toBe('reviewed')
    expect((split as unknown as { reviewed: { by: string; date: string } }).reviewed).toMatchObject({ by: 'المنسّق', date: '2026-10-14' })
    expect(ADHKAR_SPLIT).toBe(true)
    expect(chipsOf()).toEqual(['morning', 'evening', ...CATS.filter((c) => c !== '301')])
    // Before the review: the one chip «الصباح والمساء».
    expect(chipsOf(false)).toEqual([...CATS])
  })
  it('the night\'s adhkar (6274, 65260): in «أذكار المساء» only, at its end', () => {
    const items = split.items.map((x) => ({ id: x.id, title: null, text: '', grade: null, attribution: null, tier: '1', version: null, highlights: [] }))
    const evening = partItems(items, 'evening').map((h) => h.id)
    expect(evening.slice(-2)).toEqual(['6274', '65260'])
    expect(partItems(items, 'morning').map((h) => h.id)).not.toContain('6274')
    expect(partItems(items, 'morning').map((h) => h.id)).not.toContain('65260')
  })

  it.runIf(hadiths.length > 0)('every hadith of the category is in a list, and each list\'s word is in its own text', () => {
    const cat = hadiths.filter((r) => (r.categories ?? []).map(String).includes(split.category)).map((r) => r.id).sort()
    expect(split.items.map((x) => x.id).sort()).toEqual(cat)
    for (const x of split.items) {
      const text = strip(hadiths.find((r) => r.id === x.id)!.hadeeth)
      for (const p of x.parts) {
        expect(PARTS).toContain(p)
        // The basis is the hadith's own words (nothing written that is not in the source), «…» standing for a gap.
        for (const piece of x.basis[p].split(' … ')) expect(text, `${x.id} ${p}`).toContain(strip(piece))
      }
    }
  })

  it('a list highlights its own wording: the reviewed segments by index, nothing else', () => {
    const entries = new Map(highlights.map((h) => [h.id, h.segments]))
    const items = split.items.map((x) => ({ id: x.id, title: null, text: '', grade: null, attribution: null, tier: '1', version: null, highlights: entries.get(x.id) ?? [] }))
    const morning = partItems(items, 'morning')
    const evening = partItems(items, 'evening')
    expect(morning.map((h) => h.id)).toEqual(split.items.filter((x) => x.parts.includes('morning')).map((x) => x.id))
    const ev = split.items.filter((x) => x.parts.includes('evening'))
    expect(evening.map((h) => h.id)).toEqual([...ev.filter((x) => !(x as { night?: boolean }).night), ...ev.filter((x) => (x as { night?: boolean }).night)].map((x) => x.id))
    // 3008: «أصبحنا وأصبح الملك لله» in the morning, «أمسينا…» and what follows in the evening.
    expect(morning.find((h) => h.id === '3008')!.highlights).toEqual(['أصبحنا وأصبح الملك لله'])
    expect(evening.find((h) => h.id === '3008')!.highlights![0]).toMatch(/^أمسينا وأمسى الملك لله/)
    // 5490: «اللهم بك أصبحنا…» in the morning; «بك أمسينا…» and «وإليك المصير» in the evening.
    expect(strip(morning.find((h) => h.id === '5490')!.highlights![0])).toMatch(/^اللهم بك اصبحنا|^اللهم بك أصبحنا/)
    expect(evening.find((h) => h.id === '5490')!.highlights!.map(strip)).toEqual([strip(entries.get('5490')![1]), strip(entries.get('5490')![2])])
    // A dhikr the server sends without highlights (its entry pending) stays without them in both lists.
    const bare = partItems([{ ...items[0], highlights: [] }], 'evening')
    expect(bare[0].highlights).toEqual([])
  })

  it('counts are the list\'s own when there are two', () => {
    expect(countKey('6093', 'morning')).toBe('morning:6093')
    expect(countKey('6093', 'evening')).toBe('evening:6093')
    expect(countKey('6093', null)).toBe('6093')
  })

  it('the list the screen opens on: morning from Fajr to Asr, evening from Asr to Fajr, by the computed times', () => {
    const riyadh = { lat: 24.7136, lng: 46.6753, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
    store.setItem('muslim.place.v1', JSON.stringify(riyadh))
    const d = dayTimes(riyadh, { y: 2026, m: 10, d: 14 })
    expect(partNow(new Date(d.fajr.getTime() + 60_000))).toBe('morning')
    expect(partNow(new Date(d.asr.getTime() - 60_000))).toBe('morning')
    expect(partNow(new Date(d.asr.getTime() + 60_000))).toBe('evening')
    expect(partNow(new Date(d.fajr.getTime() - 60_000))).toBe('evening')
    store.removeItem('muslim.place.v1')
  })
})

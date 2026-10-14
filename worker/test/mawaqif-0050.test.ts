// 0050 أ: «أذكار المواقف» (data/mawaqif.json). A draft until the coordinator writes «reviewed»: shown to no one before.
// Every dhikr is a hadith's own words (HadeethEnc, sahih or hasan), cut from its Arabic text verbatim; our line over it
// is in the ten languages; a situation with no hadith is not in the table.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../..')
type Item = { hadith: string; kind: 'say' | 'action' | 'quran'; segments: string[]; quran?: { s: number; from?: number; to?: number }[]; count?: number; grade: string; intro: Record<string, string> }
type Doc = {
  status: string
  reviewed: { by: string; date: string } | null
  situations: { id: string; icon: string; name: Record<string, string>; proposed?: boolean; stages: { id: string | null; name?: Record<string, string>; items: Item[] }[] }[]
  excluded: { situation: string; hadith: string; why: string }[]
}
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/mawaqif.json'), 'utf8')) as Doc
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']
const items = doc.situations.flatMap((s) => s.stages.flatMap((st) => st.items.map((it) => ({ s: s.id, st: st.id, ...it }))))
// data/processed is outside git: in the clean tree a deploy tests from, the text check is skipped.
const HADITH = path.join(ROOT, 'data/processed/hadith.jsonl')
const rows = new Map<string, { hadeeth: string; class: string; mawquf?: boolean; grade: string }>()
if (fs.existsSync(HADITH))
  for (const l of fs.readFileSync(HADITH, 'utf8').split('\n'))
    if (/"lang": ?"ar"/.test(l)) {
      const r = JSON.parse(l)
      if (r.lang === 'ar') rows.set(r.id, r)
    }
const strip = (s: string) => s.replace(/[ً-ْٰـ‌‍]/g, '')

describe('«أذكار المواقف» (0050 أ)', () => {
  it('a draft, so shown to no one, until the coordinator writes «reviewed»', () => {
    expect(['مسودة', 'reviewed']).toContain(doc.status)
    if (doc.status !== 'reviewed') expect(doc.reviewed).toBeNull()
  })
  it('every situation and stage named in the ten languages, every line over a dhikr too; a situation has a hadith', () => {
    expect(doc.situations.length).toBeGreaterThan(10)
    for (const s of doc.situations) {
      expect(Object.keys(s.name).sort(), s.id).toEqual([...LANGS].sort())
      expect(s.stages.flatMap((st) => st.items).length, s.id).toBeGreaterThan(0)
      for (const st of s.stages) if (st.id) expect(Object.keys(st.name ?? {}).sort(), `${s.id} ${st.id}`).toEqual([...LANGS].sort())
    }
    for (const it of items) {
      expect(Object.keys(it.intro).sort(), `${it.s} ${it.hadith}`).toEqual([...LANGS].sort())
      for (const l of LANGS) expect(it.intro[l].trim().length, `${it.hadith} ${l}`).toBeGreaterThan(2)
      // A box always: the hadith's words, or the suras it names from the Mushaf (0049-add1 ج).
      if (it.kind === 'quran') expect(it.quran?.length, it.hadith).toBeGreaterThan(0)
      else expect(it.segments.length, it.hadith).toBeGreaterThan(0)
    }
  })
  it('the board\'s situations first, in its order; those found in the search marked proposed', () => {
    const board = ['travel', 'sleep', 'waking', 'home_in', 'home_out', 'mosque', 'toilet', 'food', 'iftar', 'rain', 'wind', 'crescent', 'sneeze', 'anger', 'distress', 'majlis']
    expect(doc.situations.slice(0, board.length).map((s) => s.id)).toEqual(board)
    for (const s of doc.situations.slice(0, board.length)) expect(s.proposed).toBeUndefined()
    expect(doc.situations.find((s) => s.id === 'travel')!.stages.map((st) => st.id)).toEqual(['ride', 'dua', 'road', 'lodging', 'farewell', 'return'])
  })
  it.runIf(rows.size > 0)('every dhikr verbatim in its hadith\'s Arabic text (diacritics included), in order; sahih or hasan, marfu\', the grade as written', () => {
    for (const it of items) {
      const r = rows.get(it.hadith)!
      expect(r, it.hadith).toBeTruthy()
      expect(['sahih', 'hasan'], it.hadith).toContain(r.class)
      expect(r.mawquf ?? false, it.hadith).toBe(false)
      expect(it.grade).toBe(r.grade)
      let from = 0
      for (const seg of it.segments) {
        const at = r.hadeeth.indexOf(seg, from)
        expect(at, `${it.s} ${it.hadith}: ${seg}`).toBeGreaterThanOrEqual(0)
        from = at + seg.length
        // And the same when the diacritics are set aside (the comparison the adhkar use).
        expect(strip(r.hadeeth)).toContain(strip(seg))
      }
    }
  })
  it('a count only where the hadith states it', () => {
    const counted = items.filter((x) => x.count).map((x) => `${x.hadith}:${x.count}`)
    expect(counted).toEqual(['5271:3', '5271:3', '6270:7', '6018:3', '6018:7'])
  })
})

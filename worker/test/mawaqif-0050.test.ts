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
  it('reviewed by the coordinator (0050-add1), with its name and date', () => {
    expect(doc.status).toBe('reviewed')
    expect(doc.reviewed).toMatchObject({ by: 'المنسّق', date: '2026-10-14' })
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
  it('in the reviewed order (0050-add1 د), «المنزل» with its two stages, nothing left proposed', () => {
    expect(doc.situations.map((s) => s.id)).toEqual(['travel', 'sleep', 'waking', 'home', 'mosque', 'toilet', 'food', 'adhan', 'iftar', 'clothes', 'rain', 'wind', 'crescent', 'sneeze', 'anger', 'distress', 'fear', 'debt', 'istikhara', 'calamity', 'condolence', 'sick', 'pain', 'majlis', 'dream', 'graves', 'marriage'])
    for (const s of doc.situations) expect(s.proposed).toBeUndefined()
    expect(doc.situations.find((s) => s.id === 'home')!.stages.map((st) => st.id)).toEqual(['enter', 'leave'])
    expect(doc.situations.find((s) => s.id === 'travel')!.stages.map((st) => st.id)).toEqual(['ride', 'dua', 'road', 'lodging', 'farewell', 'return'])
  })
  it.runIf(rows.size > 0)('every dhikr verbatim in its hadith\'s Arabic text (diacritics included), in order; sahih or hasan, marfu\', the grade as written', () => {
    for (const it of items) {
      const r = rows.get(it.hadith)!
      expect(r, it.hadith).toBeTruthy()
      // The sahih and the hasan, «إسناده صحيح» and «إسناده حسن» among them (0050-add1 ج).
      expect(['sahih', 'hasan'].includes(r.class) || (r.class === 'accepted' && /^إسناده (صحيح|حسن)/.test(r.grade)), `${it.hadith} ${r.class}`).toBe(true)
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
  it('no «…» in a box: what lies between two segments not of the same saying is a row of its own (0050-add1 ب)', () => {
    for (const it of items) for (const seg of it.segments) expect(seg, it.hadith).not.toMatch(/…|\.\.\./)
    const waking = doc.situations.find((s) => s.id === 'waking')!.stages[0].items.filter((x) => x.hadith === '65725')
    expect(waking.map((x) => x.segments.length)).toEqual([1, 1])
    expect(waking[1].intro.ar).toBe('ثم تقول:')
    // The istikhara: its narrator's words in place, marked to be set smaller.
    const ist = doc.situations.find((s) => s.id === 'istikhara')!.stages[0].items[0] as Item & { asides?: boolean[] }
    expect(ist.asides).toEqual([false, true, false, true, false, true])
  })
  it('our lines in the eight machine-translated languages add no number to the Arabic (0050-add1 هـ)', () => {
    const digits = (t: string) =>
      [...t.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d))).replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d))).matchAll(/\d+/g)].map((m) => m[0]).sort()
    for (const it of items) for (const l of LANGS) expect(digits(it.intro[l]), `${it.hadith} ${l}`).toEqual(digits(it.intro.ar))
  })
  it('a count only where the hadith states it', () => {
    const counted = items.filter((x) => x.count).map((x) => `${x.hadith}:${x.count}`)
    expect(counted).toEqual(['5271:3', '5271:3', '6270:7', '6018:3', '6018:7'])
  })
})

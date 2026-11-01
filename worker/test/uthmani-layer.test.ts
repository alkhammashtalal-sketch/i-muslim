import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error: a plain .mjs script, used here for its parser and its list of mushafs
import { documentXml, MUSHAFS, RAW, unzipMember } from '../../scripts/ingest/qurancomplex-uthmani.mjs'

// Add-on 0072-add65 §1–§2 (Talal 1 November 13:31): the King Fahd Complex's own Uthmanic text, a second source for
// the Quran, one file per mushaf in web/public/uthmani, each ayah's words exactly as in the Complex's own Word file of
// that mushaf, drawn in the Complex's own font for it, both unmodified. Checked here letter for letter, every ayah of
// every mushaf (6,236 for Hafs), against the Complex's files in data/raw/qurancomplex (outside git) when present.
const ROOT = path.resolve(import.meta.dirname, '../..')
const OUT = path.join(ROOT, 'web/public/uthmani')
const QURAN = path.join(ROOT, 'data/processed/quran.jsonl')
type M = { key: string; zip: string; doc: string; font: string; total: number }
type File = { key: string; font: string; total: number; suras: { sura: number; basmala?: string; ayat: { aya: number; words: string[]; hizb?: boolean }[] }[] }
const mushafs = MUSHAFS as M[]
const load = (key: string) => JSON.parse(fs.readFileSync(path.join(OUT, `${key}.json`), 'utf8')) as File
const hasRaw = mushafs.every((m) => fs.existsSync(path.join(RAW, m.zip)))
// The text files are built from data/raw (outside git, CLAUDE.md §7); without them only the index is checked.
const hasFiles = mushafs.every((m) => fs.existsSync(path.join(OUT, `${m.key}.json`)))
/** Every letter and mark of a text, without spaces, ayah numbers and the ayah-end sign: what the reader sees, in order. */
const letters = (s: string) => s.replace(/[\s ۝٠-٩]/g, '')

describe('the Uthmanic layer: the Complex\'s mushafs, one file each', () => {
  const index = JSON.parse(fs.readFileSync(path.join(OUT, 'index.json'), 'utf8')) as { mushafs: { key: string; font: string; total: number; bytes: number }[] }

  it('lists Hafs first, then the other riwayat of the Complex\'s page, each with its font and size', () => {
    expect(index.mushafs.map((m) => m.key)).toEqual(['hafs', 'warsh', 'qalun', 'bazzi', 'qunbul', 'douri', 'shubah'])
    // Full source texts stay out of the public repository (CLAUDE.md §7).
    expect(fs.readFileSync(path.join(ROOT, 'web/.gitignore'), 'utf8')).toMatch(/^public\/uthmani\/\*\.json\n!public\/uthmani\/index\.json$/m)
    for (const m of index.mushafs) {
      expect(fs.existsSync(path.join(OUT, 'fonts', m.font)), m.key).toBe(true)
      if (hasFiles) expect(m.bytes, m.key).toBe(fs.statSync(path.join(OUT, `${m.key}.json`)).size + fs.statSync(path.join(OUT, 'fonts', m.font)).size)
    }
  })

  it.skipIf(!hasFiles).each(mushafs.map((m) => [m.key, m.total] as const))('%s: 114 suras, ayat numbered 1, 2, 3… in each, %i in all, no empty word', (key, total) => {
    const f = load(key)
    expect(f.suras.map((s) => s.sura)).toEqual(Array.from({ length: 114 }, (_, i) => i + 1))
    for (const s of f.suras) expect(s.ayat.map((a) => a.aya), `${key} ${s.sura}`).toEqual(s.ayat.map((_, i) => i + 1))
    expect(f.suras.reduce((n, s) => n + s.ayat.length, 0)).toBe(total)
    expect(f.suras.flatMap((s) => s.ayat.flatMap((a) => a.words)).filter((w) => !w.trim() || /\s/.test(w))).toEqual([])
  })

  it.skipIf(!fs.existsSync(QURAN) || !hasFiles)('Hafs (and Shu‘ba, the same count): the reader\'s 6,236 ayat, sura by sura, so each ayah of the page view is the reader\'s ayah', () => {
    const counts = new Map<number, number>()
    for (const l of fs.readFileSync(QURAN, 'utf8').trim().split('\n')) {
      const r = JSON.parse(l) as { sura: number; aya: number }
      counts.set(r.sura, Math.max(counts.get(r.sura) ?? 0, r.aya))
    }
    for (const key of ['hafs', 'shubah']) expect(load(key).suras.map((s) => s.ayat.length), key).toEqual([...counts.keys()].sort((a, b) => a - b).map((n) => counts.get(n)))
  })
})

describe.skipIf(!hasRaw || !hasFiles)('the Uthmanic layer, letter for letter against the Complex\'s own files', () => {
  it.each(mushafs.map((m) => [m.key] as const))('%s: every ayah\'s words are the Word file\'s text, and the font is the Complex\'s file byte for byte', (key) => {
    const m = mushafs.find((x) => x.key === key)!
    const f = load(key)
    const xml = documentXml(m) as string
    // 1. Independent of the parser: all the Word file's text, in order, less the titles, is all our text, in order.
    const paras = [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)]
      .map((p) => [...p[0].matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((t) => t[1]).join('').replace(/&amp;/g, '&'))
      .filter((p) => p.trim() && !(/^\s*سُورَةُ /.test(p) && !/۝| [٠-٩]/.test(p)))
    const theirs = letters(paras.join(''))
    const ours = letters(f.suras.map((s) => (s.basmala ?? '') + s.ayat.map((a) => (a.hizb ? '۞' : '') + a.words.join('')).join('')).join(''))
    expect(ours.length, key).toBe(theirs.length)
    expect(ours === theirs, key).toBe(true)
    // 2. Ayah by ayah: each ayah's words, joined by a space, are the text between its two numbers in the file.
    const marks = [...paras.join(' ').matchAll(/([\s\S]*?) ۝?([٠-٩]+)/g)].map((x) => letters(x[1]))
    // The basmala of suras 2–114 sits in its own paragraph before ayah 1, so it opens the text before that ayah's number.
    const mine = f.suras.flatMap((s) => s.ayat.map((a, i) => (i === 0 && s.basmala ? letters(s.basmala) : '') + letters((a.hizb ? '\u06de' : '') + a.words.join(''))))
    expect(mine.length).toBe(m.total)
    expect(marks).toEqual(mine)
    // 3. The font, unmodified.
    expect(Buffer.compare(fs.readFileSync(path.join(OUT, 'fonts', f.font)), unzipMember(path.join(RAW, m.zip), m.font))).toBe(0)
  })
})

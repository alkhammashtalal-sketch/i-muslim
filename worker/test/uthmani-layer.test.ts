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
type File = { key: string; font: string; total: number; suras: { sura: number; title: string | null; basmala?: string; ayat: { aya: number; words: string[]; hizb?: boolean }[] }[] }
const mushafs = MUSHAFS as M[]
const load = (key: string) => JSON.parse(fs.readFileSync(path.join(OUT, `${key}.json`), 'utf8')) as File
const hasRaw = mushafs.every((m) => fs.existsSync(path.join(RAW, m.zip)))
// The text files are built from data/raw (outside git, CLAUDE.md §7); without them only the index is checked.
const hasFiles = mushafs.every((m) => fs.existsSync(path.join(OUT, `${m.key}.json`)))
/** Every letter and mark of a text, without spaces, ayah numbers and the ayah-end sign: what the reader sees, in order. */

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

describe.skipIf(!hasRaw || !hasFiles)('the Uthmanic layer, word for word against the Complex\'s own files', () => {
  it.each(mushafs.map((m) => [m.key] as const))('%s: the Word file\'s words, in order, are ours (titles, basmalas, ayat), and the font is the Complex\'s file byte for byte', (key) => {
    const m = mushafs.find((x) => x.key === key)!
    const f = load(key)
    // Independent of the extractor's paragraphs, titles and numbers: the text of every <w:t> in the file, a line break,
    // a tab and a paragraph's end read as a space (drawings' settings are not text), then split at spaces. The ayah
    // numbers (with the ayah-end sign in the 3.0 files) are the only tokens we keep apart.
    const xml = [...(documentXml(m) as string).matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>|<w:(?:br|cr|tab)\b[^>]*\/>|<\/w:p>/g)]
      .map((x) => x[1] ?? ' ')
      .join('')
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    const tokens = xml.split(/[\s ]+/).filter(Boolean)
    const numbers = tokens.filter((t) => /^۝?[٠-٩]+$/.test(t))
    const theirs = tokens.filter((t) => !/^۝?[٠-٩]+$/.test(t))
    const ours = f.suras.flatMap((s) => [
      ...(s.title ?? '').split(/[\s ]+/).filter(Boolean),
      ...(s.basmala ?? '').split(/[\s ]+/).filter(Boolean),
      ...s.ayat.flatMap((a) => [...(a.hizb ? ['۞'] : []), ...a.words]),
    ])
    expect(numbers.length, key).toBe(m.total)
    expect(ours.length, key).toBe(theirs.length)
    const first = ours.findIndex((w, i) => w !== theirs[i])
    expect(first, `${key}: first difference at word ${first}: ours «${ours[first]}», the file «${theirs[first]}»`).toBe(-1)
    // Each sura its title, and its basmala before ayah 1 (but at-Tawba; al-Fatiha's is its ayah 1, or unmarked); no
    // ayah carries a title (the Qalun file puts al-Baqara's title in al-Fatiha's last paragraph).
    for (const s of f.suras) {
      expect(s.title, `${key} ${s.sura}`).toMatch(/^سُورَةُ /)
      if (s.sura !== 1 && s.sura !== 9) expect(s.basmala, `${key} ${s.sura}`).toBeTruthy()
      expect(s.ayat.some((a) => a.words.includes('سُورَةُ')), `${key} ${s.sura}`).toBe(false)
    }
    expect(Buffer.compare(fs.readFileSync(path.join(OUT, 'fonts', f.font)), unzipMember(path.join(RAW, m.zip), m.font))).toBe(0)
  })
})

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Add-on 0072-add62 §4, agent (ج): «حفص العثماني» in the reader's «الخط والحجم» is the King Fahd Complex's «KFGQPC HAFS
// Uthmanic Script» 0.13 (https://fonts.qurancomplex.gov.sa/hafs-reading, fonts/legacy/UthmanicHafs1_Ver13.zip):
//  - the file exactly as the Complex publishes it, since its licence forbids any change (no subset, no woff2);
//  - every code point of source (أ)'s text, all 6,236 ayat, has a glyph of its own in the font, so the text is drawn
//    as stored and never needs another text layer (versions 2.1, 2.2 and 3.0 lack U+0622 «آ», which the iPhone then
//    draws in another face, breaking 315 words: docs/sources-quran-reader.md);
//  - the reader only switches the face; the text it serves stays the source's (quran-text-6236.test.ts).
const ROOT = path.resolve(import.meta.dirname, '../..')
const FONT = path.join(ROOT, 'web/src/quran/fonts/UthmanicHafs1-Ver13.ttf')
const QURAN = path.join(ROOT, 'data/processed/quran.jsonl')
/** SHA-256 of «UthmanicHafs1 Ver13.ttf» in the Complex's zip, downloaded 1 November 2026. */
const OFFICIAL = '5e3147614e9ad3bef0973f1a7942de784499c3393aeb045a32ced41559581e84'

/** The code points a TrueType font maps (its Unicode cmap subtables, formats 4 and 12). */
function cmapCodePoints(buf: Buffer): Set<number> {
  const tables = buf.readUInt16BE(4)
  let cmap = -1
  for (let i = 0; i < tables; i++) {
    const rec = 12 + i * 16
    if (buf.toString('latin1', rec, rec + 4) === 'cmap') cmap = buf.readUInt32BE(rec + 8)
  }
  if (cmap < 0) throw new Error('no cmap')
  const out = new Set<number>()
  const n = buf.readUInt16BE(cmap + 2)
  for (let i = 0; i < n; i++) {
    const platform = buf.readUInt16BE(cmap + 4 + i * 8)
    const encoding = buf.readUInt16BE(cmap + 6 + i * 8)
    if (!(platform === 3 && (encoding === 1 || encoding === 10)) && platform !== 0) continue
    const at = cmap + buf.readUInt32BE(cmap + 8 + i * 8)
    const format = buf.readUInt16BE(at)
    if (format === 4) {
      const segs = buf.readUInt16BE(at + 6) / 2
      const ends = at + 14
      const starts = ends + segs * 2 + 2
      const deltas = starts + segs * 2
      const offsets = deltas + segs * 2
      for (let s = 0; s < segs; s++) {
        const end = buf.readUInt16BE(ends + s * 2)
        const start = buf.readUInt16BE(starts + s * 2)
        const delta = buf.readInt16BE(deltas + s * 2)
        const ro = buf.readUInt16BE(offsets + s * 2)
        for (let c = start; c <= end && c !== 0xffff; c++) {
          const gid = ro === 0 ? (c + delta) & 0xffff : (() => {
            const g = buf.readUInt16BE(offsets + s * 2 + ro + (c - start) * 2)
            return g === 0 ? 0 : (g + delta) & 0xffff
          })()
          if (gid !== 0) out.add(c)
        }
      }
    } else if (format === 12) {
      const groups = buf.readUInt32BE(at + 12)
      for (let g = 0; g < groups; g++) {
        const start = buf.readUInt32BE(at + 16 + g * 12)
        const end = buf.readUInt32BE(at + 20 + g * 12)
        const gid = buf.readUInt32BE(at + 24 + g * 12)
        for (let c = start; c <= end; c++) if (gid + (c - start) !== 0) out.add(c)
      }
    }
  }
  return out
}

/** A name-table string (Windows, Unicode BMP), decoded from UTF-16BE. */
function nameRecord(buf: Buffer, id: number): string {
  const tables = buf.readUInt16BE(4)
  for (let i = 0; i < tables; i++) {
    const rec = 12 + i * 16
    if (buf.toString('latin1', rec, rec + 4) !== 'name') continue
    const at = buf.readUInt32BE(rec + 8)
    const count = buf.readUInt16BE(at + 2)
    const strings = at + buf.readUInt16BE(at + 4)
    for (let r = 0; r < count; r++) {
      const o = at + 6 + r * 12
      if (buf.readUInt16BE(o) !== 3 || buf.readUInt16BE(o + 2) !== 1 || buf.readUInt16BE(o + 6) !== id) continue
      const len = buf.readUInt16BE(o + 8)
      const off = strings + buf.readUInt16BE(o + 10)
      return Buffer.from(buf.subarray(off, off + len)).swap16().toString('utf16le')
    }
  }
  return ''
}

describe('«حفص العثماني»: the King Fahd Complex font, unmodified, covering source (أ)', () => {
  const buf = fs.readFileSync(FONT)
  it('is the Complex\'s own file, byte for byte (its licence forbids any change)', () => {
    expect(crypto.createHash('sha256').update(buf).digest('hex')).toBe(OFFICIAL)
  })

  it('carries the Complex\'s licence and allows embedding (fsType 0)', () => {
    // The licence lives in the font's name table (ID 13, Windows Unicode, UTF-16BE), as the Complex wrote it.
    const text = nameRecord(buf, 13)
    expect(text).toContain('Permission is hereby granted, Free of Cost, to any person obtaining a copy of this Font accompanying this license, the rights to Use, Copy, Distribute')
    expect(text).toContain('King Fahd Glorious Quran Printing Complex')
    const tables = buf.readUInt16BE(4)
    for (let i = 0; i < tables; i++) {
      const rec = 12 + i * 16
      if (buf.toString('latin1', rec, rec + 4) === 'OS/2') expect(buf.readUInt16BE(buf.readUInt32BE(rec + 8) + 8)).toBe(0)
    }
  })

  it.skipIf(!fs.existsSync(QURAN))('has a glyph for every code point of the 6,236 ayat, U+0622 among them', () => {
    const cps = new Map<number, number>()
    let ayat = 0
    for (const line of fs.readFileSync(QURAN, 'utf8').split('\n')) {
      if (!line.trim()) continue
      ayat++
      for (const ch of (JSON.parse(line) as { text: string }).text) cps.set(ch.codePointAt(0)!, (cps.get(ch.codePointAt(0)!) ?? 0) + 1)
    }
    expect(ayat).toBe(6236)
    const mapped = cmapCodePoints(buf)
    const missing = [...cps.keys()].filter((c) => !mapped.has(c)).map((c) => `U+${c.toString(16).toUpperCase().padStart(4, '0')}`)
    expect(missing).toEqual([])
    expect(cps.size).toBe(55)
    expect(mapped.has(0x0622)).toBe(true)
  })

  it('is offered in the reader as a third face, display only', () => {
    const display = fs.readFileSync(path.join(ROOT, 'web/src/quran/reader-display.ts'), 'utf8')
    expect(display).toContain("export const QURAN_FONTS = ['amiri', 'amiri-quran', 'hafs'] as const")
    const css = fs.readFileSync(path.join(ROOT, 'web/src/quran/quran.css'), 'utf8')
    expect(css).toContain("src: url('./fonts/UthmanicHafs1-Ver13.ttf') format('truetype');")
    expect(css).toMatch(/:root\[data-quran-font='hafs'\] :is\(\.mushaf-text, \.ayah-line, \.basmala, \.ayah-sheet \.sacred-reader, \.rdd-preview-ayah\) \{\n  font-family: 'KFGQPC Hafs'/)
    expect(fs.readFileSync(path.join(ROOT, 'docs/COMPONENTS.csv'), 'utf8')).toContain('KFGQPC HAFS Uthmanic Script')
  })
})

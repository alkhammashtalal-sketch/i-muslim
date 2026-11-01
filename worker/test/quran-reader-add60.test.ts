// Add-on 0072-add60, agent (ب): §5 the reader's font and sizes (web/src/quran/reader-display.ts), §6 the larger list
// of reciters and the download of a range of suras (scripts/ingest/recitation-*.mjs, web/src/quran/downloads.ts), §7
// QuranEnc's other languages of the meanings (scripts/ingest/quranenc-*.mjs, worker/src/meaning.ts).
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
// What the reader had before: its mode and last ayah stay beside the new display settings.
store.setItem('imuslim.reader.v1', JSON.stringify({ mode: 'ayah', last: { sura: 36, aya: 12 } }))

const disp = await import('../../web/src/quran/reader-display')
const dl = await import('../../web/src/quran/downloads')
const { DISPLAY } = await import('../../web/src/v2/reading/display-strings')
const { KEYS, KEYS_ADD60 } = await import('../../scripts/ingest/quranenc-fetch.mjs')
const { MEANING_LANGS } = await import('../src/meaning')
const { CLOUD_KEYS } = await import('../../web/src/storage/cloud')

const ROOT = path.resolve(import.meta.dirname, '../..')
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const

describe('§5 the font and sizes', () => {
  it('defaults to the reader as it was: Amiri, every size 1, Arabic-Indic digits', () => {
    expect(disp.getDisplay()).toEqual({ quran: 1, translation: 1, tafsir: 1, digits: 'arab', font: 'amiri' })
    expect(disp.DEFAULT_DISPLAY).toEqual(disp.getDisplay())
  })
  it('offers only the Amiri family (CLAUDE.md §8; any other Quran font awaits Talal)', () => {
    expect([...disp.QURAN_FONTS]).toEqual(['amiri', 'amiri-quran'])
    const pkg = JSON.parse(read('web/package.json')) as { dependencies: Record<string, string> }
    expect(pkg.dependencies['@fontsource/amiri-quran']).toBe('^5.3.0')
    expect(read('docs/COMPONENTS.csv')).toMatch(/^font,Amiri Quran \(@fontsource\/amiri-quran 5\.3\.0\),.*SIL Open Font License 1\.1$/m)
    const css = read('web/src/quran/quran.css')
    expect(css).toContain("url('../../node_modules/@fontsource/amiri-quran/files/amiri-quran-arabic-400-normal.woff2')")
    expect(css).not.toMatch(/KFGQPC|uthmanic|me_quran|QCF/i)
  })
  it('a stored value is made safe: unknown steps, digits or fonts fall back to the defaults', () => {
    expect(disp.cleanDisplay({ quran: 9, translation: 1.15, tafsir: '1.3', digits: 'roman', font: 'kfgqpc' })).toEqual({ quran: 1, translation: 1.15, tafsir: 1, digits: 'arab', font: 'amiri' })
    expect(disp.cleanDisplay(null)).toEqual(disp.DEFAULT_DISPLAY)
  })
  it('a value back from iCloud (JSON) is the same step', () => {
    for (const q of disp.QURAN_STEPS) expect(disp.cleanDisplay(JSON.parse(JSON.stringify({ quran: q }))).quran).toBe(q)
    for (const t of disp.TEXT_STEPS) expect(disp.cleanDisplay(JSON.parse(JSON.stringify({ tafsir: t }))).tafsir).toBe(t)
  })
  it('the three sizes step on their own, each stopping at its ends', () => {
    expect(disp.stepFrom(disp.QURAN_STEPS, 1, 1)).toBe(1.15)
    expect(disp.stepFrom(disp.QURAN_STEPS, 1.75, 1)).toBe(1.75)
    expect(disp.stepFrom(disp.TEXT_STEPS, 0.9, -1)).toBe(0.9)
    expect(Math.max(...disp.QURAN_STEPS)).toBeGreaterThan(Math.max(...disp.TEXT_STEPS))
  })
  it('saving keeps the mode and the last ayah, in the key iCloud copies', () => {
    disp.setDisplay({ quran: 1.3, translation: 1.15, tafsir: 0.9, digits: 'latn', font: 'amiri-quran' })
    const saved = JSON.parse(store.getItem('imuslim.reader.v1')!)
    expect(saved).toEqual({ mode: 'ayah', last: { sura: 36, aya: 12 }, display: { quran: 1.3, translation: 1.15, tafsir: 0.9, digits: 'latn', font: 'amiri-quran' } })
    expect(Object.keys(CLOUD_KEYS)).toContain('imuslim.reader.v1')
    disp.resetDisplay()
    expect(JSON.parse(store.getItem('imuslim.reader.v1')!).display).toEqual(disp.DEFAULT_DISPLAY)
  })
  it('sets the CSS variables and the font on the root, which quran.css reads for the text, the translation and the tafsir', () => {
    const props = new Map<string, string>()
    const root = { style: { setProperty: (k: string, v: string) => props.set(k, v) }, dataset: {} as Record<string, string> } as unknown as HTMLElement
    disp.applyDisplay({ quran: 1.5, translation: 1.3, tafsir: 1.15, digits: 'arab', font: 'amiri-quran' }, root)
    expect(Object.fromEntries(props)).toEqual({ '--rd-quran-scale': '1.5', '--rd-trans-scale': '1.3', '--rd-tafsir-scale': '1.15' })
    expect(root.dataset.quranFont).toBe('amiri-quran')
    disp.applyDisplay(disp.DEFAULT_DISPLAY, root)
    expect(root.dataset.quranFont).toBeUndefined()
    const css = read('web/src/quran/quran.css')
    for (const v of ['--rd-quran-scale', '--rd-trans-scale', '--rd-tafsir-scale']) expect(css).toContain(`var(${v}, 1)`)
    // Line heights stay unitless: the lines grow with the text and never touch (CLAUDE.md §8).
    expect(css).toMatch(/\.mushaf-text \{[^}]*line-height: 2\.2;/)
  })
  it('the ayah markers in either digits; the text itself is never touched', () => {
    expect(disp.ayahDigits(255, 'arab')).toBe('٢٥٥')
    expect(disp.ayahDigits(255, 'latn')).toBe('255')
    expect(read('web/src/quran/SuraView.tsx')).toContain('<Mkp n={ayahDigits(aya, d.digits)}')
    expect(read('web/src/quran/AyahSheet.tsx')).toContain('ayahDigits(ayahOf(p.id), display.digits)')
    // The preview is an ayah from the data, never typed.
    expect(read('web/src/v2/reading/ReaderDisplay.tsx')).toContain('getAyah(sura, aya, content)')
  })
})

describe('§5 and §6 strings', () => {
  it('in the ten languages, every key, each {placeholder} kept; no Latin letters in the Arabic', () => {
    const keys = Object.keys(DISPLAY.ar)
    for (const l of LANGS) {
      expect(Object.keys(DISPLAY[l]).sort(), l).toEqual([...keys].sort())
      for (const k of keys) {
        const want = (DISPLAY.ar as Record<string, string>)[k].match(/\{\w+\}/g)?.sort() ?? []
        expect((DISPLAY[l] as Record<string, string>)[k].match(/\{\w+\}/g)?.sort() ?? [], `${l} ${k}`).toEqual(want)
        expect((DISPLAY[l] as Record<string, string>)[k].trim(), `${l} ${k}`).not.toBe('')
      }
    }
    for (const v of Object.values(DISPLAY.ar)) expect(v.replace(/\{\w+\}/g, ''), v).not.toMatch(/[A-Za-z]/)
    for (const v of Object.values(DISPLAY.ar)) expect(v).not.toMatch(/!/)
  })
})

describe('§6 the reciters', () => {
  const config = JSON.parse(read('web/src/config/recitation.json')) as { reciters: { read: number; server: string; suras: number[]; name: { ar: string; en: string | null } }[]; origins: string[] }
  const sizes = JSON.parse(read('web/src/config/recitation-sizes.json')) as Record<string, number[]>
  const meta = JSON.parse(read('web/src/v2/reading/quran-meta.json')) as { riwaya: Record<string, string | null> }
  it('a larger list: the six of command 20 first, al-Sudais the default, then more', () => {
    expect(config.reciters.slice(0, 6).map((r) => r.read)).toEqual([54, 123, 53, 5, 86, 92])
    expect(config.reciters.length).toBeGreaterThan(30)
    expect(new Set(config.reciters.map((r) => r.read)).size).toBe(config.reciters.length)
  })
  it('every one in Hafs, with checked timings for the 114 suras, and the size of each sura before a download', () => {
    for (const r of config.reciters) {
      expect(r.suras, String(r.read)).toHaveLength(114)
      expect(meta.riwaya[String(r.read)], String(r.read)).toMatch(/حفص/)
      const dir = path.join(ROOT, 'web/public/recitation', String(r.read))
      expect(fs.readdirSync(dir).filter((f) => /^\d+\.json$/.test(f)), String(r.read)).toHaveLength(114)
      expect(sizes[String(r.read)], String(r.read)).toHaveLength(114)
      expect(r.name.ar.trim(), String(r.read)).not.toBe('')
    }
    // No timing folder of a reciter not on the list.
    const dirs = fs.readdirSync(path.join(ROOT, 'web/public/recitation')).filter((d) => /^\d+$/.test(d)).map(Number).sort((a, b) => a - b)
    expect(dirs).toEqual(config.reciters.map((r) => r.read).sort((a, b) => a - b))
  })
  it('the audio stays mp3quran’s, from the one origin the CSP allows', () => {
    expect(config.origins).toEqual(['https://cdn.mp3quran.net'])
    for (const r of config.reciters) expect(r.server, String(r.read)).toMatch(/^https:\/\/cdn\.mp3quran\.net\/.+\/$/)
    expect(read('worker/src/security.ts')).toContain("media-src 'self' blob: https://cdn.mp3quran.net")
  })
  it('the favourites are the reading data’s, which iCloud copies; the picker puts them first', () => {
    expect(CLOUD_KEYS['muslim.reading.v1']).toBe('reading')
    expect(read('web/src/v2/reading/store.ts')).toContain('favReciters')
    expect(read('web/src/v2/reading/NowPlaying.tsx')).toContain('...shown.filter((x) => favReciters.includes(x.read))')
  })
})

describe('§6 a range of suras', () => {
  it('from one sura to another, in order, whichever way they were chosen, within 1–114', () => {
    expect(dl.rangeSuras(2, 4)).toEqual([2, 3, 4])
    expect(dl.rangeSuras(4, 2)).toEqual([2, 3, 4])
    expect(dl.rangeSuras(0, 200)).toHaveLength(114)
  })
  it('its size before it starts: the bytes of its suras not on the device yet', () => {
    const r = dl.rangeLeft(54, 112, 114)
    expect(r.suras).toEqual([112, 113, 114])
    expect(r.bytes).toBe(dl.suraBytes(54, 112) + dl.suraBytes(54, 113) + dl.suraBytes(54, 114))
    expect(r.bytes).toBeGreaterThan(0)
  })
  it('downloads sura by sura like a whole Mushaf, the range kept with the queue for its progress', () => {
    const ts = read('web/src/quran/downloads.ts')
    expect(ts).toContain('setQueue({ read, left, paused: false, all })')
    expect(ts).toContain('export type Queue = { read: number; left: number[]; paused: boolean; all?: number[] }')
    const page = read('web/src/v2/reading/Downloads.tsx')
    expect(page).toContain('downloadRange(reciter.read, r.from, r.to)')
    expect(page).toContain("fmt(s.rangeSize, { n: num(range.suras.length), size: formatBytes(range.bytes, lang) })")
    // The sura just downloaded leaves the queue by its number, not by its place.
    expect(ts).toContain('queue.left.filter((s) => s !== sura)')
  })
})

describe('§7 the translations of the meanings', () => {
  it('every other language of QuranEnc’s official list, the African ones among them, each with its own key', () => {
    const add = KEYS_ADD60 as Record<string, string>
    expect(Object.keys(add)).toHaveLength(28)
    for (const c of ['sw', 'so', 'am', 'ha', 'yo', 'om', 'rw', 'rn', 'ln', 'aa', 'ak', 'mos', 'nqo']) expect(add[c], c).toBeTruthy()
    expect(Object.keys(add).filter((c) => c in (KEYS as Record<string, string>))).toEqual([])
    expect(new Set(Object.values(add)).size).toBe(28)
  })
  it('the picker’s second group and the first run’s exception are exactly these 28 (web/src/v2/lang/served.ts)', async () => {
    const { MEANINGS_ONLY } = await import('../../web/src/v2/lang/served')
    expect([...MEANINGS_ONLY].sort()).toEqual(Object.keys(KEYS_ADD60).sort())
  })
  it('the edge cache of the reader moved to a new version, so nothing cached before their rows reached D1 is served', () => {
    expect(read('worker/src/reader.ts')).toMatch(/const CACHE_VERSION = 'r5'/)
  })
  it('the worker serves them (QuranEnc’s own codes, two or three letters)', () => {
    for (const c of Object.keys(KEYS_ADD60)) expect(MEANING_LANGS as readonly string[], c).toContain(c)
    expect(MEANING_LANGS).toHaveLength(57)
    for (const c of MEANING_LANGS) expect(c).toMatch(/^[a-z]{2,3}$/)
    expect(read('worker/src/reader.ts')).toContain('/^\\/api\\/meanings\\/([a-z]{2,3})\\/(\\d{1,3})$/')
  })
  it('built into their own file and SQL, so the 29 already loaded are not written again', () => {
    expect(read('scripts/ingest/quranenc-build.mjs')).toContain("'meanings-add60.jsonl'")
    expect(read('scripts/index/load-translations.mjs')).toContain("'data/processed/ayah_translations-add60.sql'")
  })
  const add60 = path.join(ROOT, 'data/processed/meanings-add60.jsonl')
  it.runIf(fs.existsSync(add60))('the data: 6,236 ayat for each of the 28, with translator, version and key, as received', () => {
    const by = new Map<string, number>()
    const bad: string[] = []
    for (const line of fs.readFileSync(add60, 'utf8').trim().split('\n')) {
      const r = JSON.parse(line) as { lang: string; sura: number; aya: number; text: string; translator: string; version: string; source_key: string }
      by.set(r.lang, (by.get(r.lang) ?? 0) + 1)
      if (!r.text.trim() || r.source_key !== (KEYS_ADD60 as Record<string, string>)[r.lang] || !/^\d+\.\d+\.\d+$/.test(r.version) || !r.translator.trim()) bad.push(`${r.lang} ${r.sura}:${r.aya}`)
    }
    expect(bad.slice(0, 5)).toEqual([])
    expect(by.size).toBe(28)
    for (const [l, n] of by) expect(n, l).toBe(6236)
  }, 120_000)
})

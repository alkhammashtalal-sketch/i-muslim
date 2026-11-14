// Reply 0056: the downloaded recitations' data and strings (أ), and «اسأل» with no connection, a search by words in
// what the app carries (ب): the Arabic folding the reply asks, the places a question names, the search on the app's
// own copy of the suras, no answer and no text of ours.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildIndex, foldAr, loadCorpus, placesIn, searchIndex, terms } from '../../web/src/offline-search/search'
import { OFFLINE_SEARCH } from '../../web/src/offline-search/strings'
import { DOWNLOADS } from '../../web/src/quran/download-strings'

const ROOT = path.resolve(import.meta.dirname, '../..')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
const OFF = path.join(ROOT, 'web/ios/App/App/public/offline')
const haveBundle = fs.existsSync(path.join(OFF, 'sura/2.json'))

describe('downloads (0056 أ)', () => {
  it('every reciter has the size of each of his 114 suras, read from mp3quran', () => {
    const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/config/recitation.json'), 'utf8'))
    const sizes = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/config/recitation-sizes.json'), 'utf8'))
    for (const r of config.reciters) {
      expect(sizes[r.read], String(r.read)).toHaveLength(114)
      for (const b of sizes[r.read]) expect(b).toBeGreaterThan(50_000)
    }
  })
  it('the strings in the ten languages, every key, each {placeholder} kept', () => {
    const keys = Object.keys(DOWNLOADS.ar)
    for (const l of LANGS) {
      expect(Object.keys(DOWNLOADS[l]).sort(), l).toEqual([...keys].sort())
      for (const k of keys) {
        const want = (DOWNLOADS.ar as Record<string, string>)[k].match(/\{\w+\}/g)?.sort() ?? []
        expect((DOWNLOADS[l] as Record<string, string>)[k].match(/\{\w+\}/g)?.sort() ?? [], `${l} ${k}`).toEqual(want)
      }
    }
    for (const l of LANGS) expect(Object.keys(OFFLINE_SEARCH[l]).sort(), l).toEqual(Object.keys(OFFLINE_SEARCH.ar).sort())
    expect(OFFLINE_SEARCH.ar.line).toBe('لا يوجد اتصال: هذه نتائج بحث بالكلمات في المصحف والأذكار، وليست إجابة. أعد السؤال حين يعود الاتصال.')
  })
  it('the folder is the reply\'s, kept out of the backup by the app\'s plugin', () => {
    const ts = fs.readFileSync(path.join(ROOT, 'web/src/quran/downloads.ts'), 'utf8')
    expect(ts).toContain("export const DIR = 'Application Support/recitations'")
    expect(ts).toContain('Directory.Library')
    const swift = fs.readFileSync(path.join(ROOT, 'web/ios/App/App/RecitationStorePlugin.swift'), 'utf8')
    expect(swift).toContain('values.isExcludedFromBackup = true')
    expect(fs.readFileSync(path.join(ROOT, 'web/ios/App/App/AppViewController.swift'), 'utf8')).toContain('registerPluginInstance(RecitationStorePlugin())')
    expect(fs.readFileSync(path.join(ROOT, 'web/ios/App/App.xcodeproj/project.pbxproj'), 'utf8')).toContain('RecitationStorePlugin.swift in Sources')
  })
})

describe('«اسأل» with no connection: a search by words (0056 ب)', () => {
  it('switched off for the first version (0057-add1): the switch off, and the search loaded only behind it', () => {
    expect(JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/config/offline-search.json'), 'utf8')).enabled).toBe(false)
    const app = fs.readFileSync(path.join(ROOT, 'web/src/App.tsx'), 'utf8')
    expect(app).not.toMatch(/import \{[^}]*searchOffline[^}]*\} from '\.\/offline-search\/client'/)
    expect(app).toContain("await import('./offline-search/client')")
    expect(app.match(/offlineSearch\.enabled &&/g)).toHaveLength(2)
  })
  it('folds Arabic as the reply asks: marks and tatweel gone, one alef, one yaa, taa marbuta as haa, «ال» «و» «ب» dropped', () => {
    expect(foldAr('الرَّحْمَٰنِ')).toBe('الرحمن')
    expect(foldAr('إِلَىٰ')).toBe('الي')
    expect(foldAr('الصـلاة')).toBe('الصلاه')
    expect(terms('والصلاة بالصبر')).toEqual(['صلاه', 'صبر'])
    expect(terms('What is the reward for patience?')).toEqual(['reward', 'patience'])
  })
  it('a sura by its name, and the small map: آية الكرسي, المعوذتين, الفاتحة', () => {
    const suras = [
      { n: 1, name: 'الفاتحة' },
      { n: 18, name: 'الكهف' },
      { n: 113, name: 'الفلق' },
    ]
    expect(placesIn('أريد آية الكرسي', suras)[0]).toMatchObject({ path: '/quran/2/255' })
    expect(placesIn('Ayat al-Kursi', suras)[0]).toMatchObject({ path: '/quran/2/255' })
    expect(placesIn('المعوذتين', suras)[0]).toMatchObject({ path: '/quran/113' })
    expect(placesIn('سورة الكهف', suras).map((p) => p.path)).toEqual(['/quran/18'])
    expect(placesIn('فضل الكهف يوم الجمعة', suras).map((p) => p.path)).toEqual(['/quran/18'])
    expect(placesIn('ما فضل الصدق؟', suras)).toEqual([])
  })
  it.skipIf(!haveBundle)('on the app\'s own copy: rows of its files only, ten at most, each with its reference and place', async () => {
    const bundle = async (rel: string) => (fs.existsSync(path.join(OFF, rel)) ? fs.readFileSync(path.join(OFF, rel), 'utf8') : null)
    const manifest = JSON.parse((await bundle('manifest.json'))!)
    const { docs } = await loadCorpus({ bundle, adhkarCategories: manifest.adhkar.categories })
    expect(docs.filter((d) => d.kind === 'ayah')).toHaveLength(6236)
    const ms = buildIndex(docs)
    const top = searchIndex(ms, 'الصيام', 10)
    expect(top.length).toBeGreaterThan(0)
    expect(top.length).toBeLessThanOrEqual(10)
    expect(top.some((r) => r.id === 'quran:2:183')).toBe(true)
    const sura2 = JSON.parse((await bundle('sura/2.json'))!)
    const row = top.find((r) => r.id === 'quran:2:183')!
    expect(row.text).toBe(sura2.ayat[182].text) // the file's text, as it is
    expect(row.path).toBe('/quran/2/183')
    expect(searchIndex(ms, 'fasting prescribed', 10).some((r) => r.id === 'quran:2:183')).toBe(true)
    expect(searchIndex(ms, '؟؟', 10)).toEqual([])
  })
})

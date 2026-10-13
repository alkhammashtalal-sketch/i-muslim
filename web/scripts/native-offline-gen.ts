// The app's offline copy (reply 0033 §ب3), made at `npm run build:native` into dist/offline/ (never committed:
// CLAUDE.md §7 «لا نصوص المصادر كاملة في المستودع»; web/dist and ios/App/App/public are ignored by git).
//
// Nothing is typed here: a D1-shaped SQLite database is built from the repository's migrations and data/processed
// exactly as the tests build it (worker/test/d1-sqlite.ts, plus data/processed/hadith.sql as scripts/index loads it),
// and the Worker's own functions answer each read: listSuras, getQuarters, getSura, getPassage (al-Saadi left out),
// handleAdhkar and handleToolHadith; suraMeaningEntries measures each content language's download for the manifest
// (its size only). web/src/native/offline-data.ts rebuilds the responses from these files, and
// worker/test/native-device.test.ts holds the rebuilt responses equal to the Worker's.
//
//   cd web && node scripts/native-offline.mjs [outDir]      (run by npm run build:native after vite build)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Env } from '../../worker/src/index'
import { ADHKAR_CATEGORIES, ADHKAR_TRANSLATIONS, handleAdhkar, handleToolHadith } from '../../worker/src/adhkar'
import { MEANING_LANGS, suraMeaningEntries } from '../../worker/src/meaning'
import { getPassage } from '../../worker/src/passage'
import { getQuarters } from '../../worker/src/quarters'
import { getSura, listSuras } from '../../worker/src/reader'
import { buildDb } from '../../worker/test/d1-sqlite'
import names from '../../data/names.json'
import tasbih from '../../data/tasbih-after-prayer.json'
import type { BundledAyah, BundledSura, OfflineManifest } from '../src/native/offline-data'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
/** The adhkar and their hadiths go into the app in Arabic and in every language the Worker translates them into
 * (worker/src/adhkar.ts); the manifest lists them and the app answers from them (web/src/native/offline.ts). */
export const ADHKAR_LANGS: readonly string[] = ['ar', ...ADHKAR_TRANSLATIONS]
const PROCESSED = path.join(ROOT, 'data/processed')

/** The hadiths the names (their Sunnah evidence) and the tasbih («بعد الصلاة» and its words) read by id. */
export function toolHadithIds(): string[] {
  const ids = new Set<string>()
  for (const n of names.names as { sunnah?: { id: string } }[]) if (n.sunnah) ids.add(n.sunnah.id)
  ids.add(String(tasbih.id))
  for (const w of tasbih.words as { id: string | number }[]) ids.add(String(w.id))
  return [...ids].sort((a, b) => Number(a) - Number(b))
}

/** The D1-shaped database: passages and suras (buildDb), then HadeethEnc's rows and categories, then the meanings'
 *  translations as D1 is loaded with them (scripts/index/load-translations.mjs), only to measure their downloads. */
export function offlineDb(): Env {
  for (const f of ['quran.jsonl', 'hadith.sql', 'ayah_translations.sql']) {
    if (!fs.existsSync(path.join(PROCESSED, f))) throw new Error(`data/processed/${f} is missing: the app's offline copy is made from it (scripts/ingest, scripts/index)`)
  }
  const d1 = buildDb()
  d1.db.exec(fs.readFileSync(path.join(PROCESSED, 'hadith.sql'), 'utf8'))
  d1.db.exec(fs.readFileSync(path.join(PROCESSED, 'ayah_translations.sql'), 'utf8'))
  return { DB: d1 } as unknown as Env
}

/** Each content language's download in bytes: its 114 GET /api/meanings/:lang/:n answers as the Worker gives them
 *  (suraMeaningEntries, as JSON), which the app keeps as they are (reply 0037 §3.6: the size it shows, and whether it
 *  asks first). Nothing of the translations themselves goes into the app; a language with no rows is left out. */
export async function meaningSizes(env: Env, langs: readonly string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {}
  for (const lang of langs) {
    let bytes = 0
    for (let n = 1; n <= 114; n++) {
      const m = await suraMeaningEntries(env, n, lang)
      if (m) bytes += Buffer.byteLength(JSON.stringify(m))
    }
    if (bytes) out[lang] = bytes
  }
  return out
}

/** One sura as the app carries it, from getSura (with English) and getPassage for each ayah. */
export async function bundledSura(env: Env, n: number, ayatCount: number): Promise<BundledSura> {
  const s = await getSura(env, n, true)
  if (!s) throw new Error(`sura ${n} is missing`)
  const ayat: BundledAyah[] = []
  for (const a of s.ayat) {
    const p = await getPassage(env, a.id)
    if (!p?.ayah) throw new Error(`${a.id} is missing`)
    const muyassar = p.tafsir?.find((t) => t.key === 'muyassar')?.text
    ayat.push({
      aya: a.aya,
      id: a.id,
      text: a.text,
      page: a.page,
      ...(a.text_en != null ? { text_en: a.text_en } : {}),
      ref: p.ref,
      url: p.url,
      ...(p.ayah.urlEn ? { url_en: p.ayah.urlEn } : {}),
      ...(muyassar ? { muyassar } : {}),
    })
  }
  return { n: s.n, name: s.name, ayatCount, basmala: s.basmala, ayat }
}

const body = async (r: Response | null) => (r && r.status === 200 ? await r.text() : null)

export async function generate(out: string, log: (s: string) => void = console.log): Promise<OfflineManifest> {
  const t0 = Date.now()
  const env = offlineDb()
  log(`offline: database ready in ${((Date.now() - t0) / 1000).toFixed(1)} s`)
  fs.rmSync(out, { recursive: true, force: true })
  for (const d of ['sura', 'adhkar', 'hadith']) fs.mkdirSync(path.join(out, d), { recursive: true })
  const write = (rel: string, text: string) => fs.writeFileSync(path.join(out, rel), text)

  const suras = await listSuras(env)
  if (suras.length !== 114) throw new Error(`${suras.length} suras, not 114`)
  write('suras.json', JSON.stringify(suras))
  write('quarters.json', JSON.stringify(await getQuarters(env)))
  for (const s of suras) write(`sura/${s.n}.json`, JSON.stringify(await bundledSura(env, s.n, s.ayat)))

  const cats: string[] = []
  for (const c of ADHKAR_CATEGORIES) {
    for (const lang of ADHKAR_LANGS) {
      const u = new URL(`https://app.local/api/adhkar/${c.id}?lang=${lang}`)
      const b = await body(await handleAdhkar(new Request(u), env, u))
      if (!b) throw new Error(`adhkar ${c.id} ${lang}: no answer`)
      write(`adhkar/${c.id}.${lang}.json`, b)
    }
    cats.push(c.id)
  }
  const hadiths: string[] = []
  for (const id of toolHadithIds()) {
    let ok = true
    for (const lang of ADHKAR_LANGS) {
      const u = new URL(`https://app.local/api/adhkar/hadith/${id}?lang=${lang}`)
      const b = await body(await handleToolHadith(new Request(u), env, u))
      if (!b) {
        ok = false
        break
      }
      write(`hadith/${id}.${lang}.json`, b)
    }
    if (ok) hadiths.push(id)
    else log(`offline: hadith ${id} is not served (not sahih or hasan, or missing): left out`)
  }
  const meanings = await meaningSizes(env, MEANING_LANGS)
  const manifest: OfflineManifest = { built: new Date().toISOString(), suras: suras.length, adhkar: { categories: cats, langs: [...ADHKAR_LANGS] }, hadiths, langs: [...ADHKAR_LANGS], meanings }
  write('manifest.json', JSON.stringify(manifest))
  const largest = Object.entries(meanings).sort((a, b) => b[1] - a[1])[0]
  log(`offline: ${suras.length} suras, ${cats.length} adhkar categories × ${ADHKAR_LANGS.length} languages, ${hadiths.length} hadiths, in ${((Date.now() - t0) / 1000).toFixed(1)} s`)
  log(`offline: meanings sizes for ${Object.keys(meanings).length} languages${largest ? `, the largest ${largest[0]} ${(largest[1] / 1e6).toFixed(1)} MB` : ''}`)
  return manifest
}

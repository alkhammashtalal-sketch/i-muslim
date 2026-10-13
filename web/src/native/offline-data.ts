// Reading without a connection inside the iOS/Android app (reply 0033 §ب3), the pure part: which /api/* reads the app
// can answer on the device, and how. No Capacitor here (worker/test/native-device.test.ts).
//
// Three sources, all copies of what the Worker serves from D1, never written by us:
//   1. In the app (dist/offline/, made at `npm run build:native` from data/processed by the Worker's own functions,
//      web/scripts/native-offline-gen.ts, and never committed: CLAUDE.md §7): the 114 suras' text with each ayah's
//      reference, links, Sahih International (English) and al-Muyassar; the list of suras and the quarters' opening
//      words; the adhkar of the eight categories and the hadiths the names and the tasbih cite, in the ten interface
//      languages (as /api/adhkar returns them).
//   2. The reader's content language, downloaded once when it is chosen and kept (GET /api/meanings/:lang/:n): each
//      ayah's meaning exactly as the ayah panel receives it (translator, version, footnotes, key).
//   3. Whatever was read once with a connection, kept like the web's service worker keeps it (cache «reader-api»: the
//      same routes, 800 entries, 60 days), plus the adhkar and their hadiths.
// A sura is answered on the device whenever every part it asks for is there (its text always; English always; a
// meaning once downloaded). The other reads try the network first (fresh, with al-Saadi), then what was kept, then
// the copy in the app; only al-Saadi's tafsir is never in the app (6 MB), and an ayah's panel then shows al-Muyassar.
import type { Meaning, PassageContext, PassageResponse, SuraAyah, SuraResponse } from '../../../shared/api'

/** One ayah as the app carries it: the fields of /api/sura/:n?en=1 and those of /api/passage/quran:s:a without al-Saadi. */
export type BundledAyah = { aya: number; id: string; text: string; page: number; text_en?: string; ref: string; url: string; url_en?: string; muyassar?: string }
export type BundledSura = { n: number; name: string; ayatCount: number; basmala: string | null; ayat: BundledAyah[] }
/** GET /api/meanings/:lang/:n (worker/src/meaning.ts suraMeaningEntries). */
export type SuraMeanings = { lang: string; sura: number; meanings: Record<string, Meaning> }
/** dist/offline/manifest.json: what the build put in the app. */
export type OfflineManifest = { built: string; suras: number; adhkar: { categories: string[]; langs: string[] }; hadiths: string[]; langs: string[] }

// The Worker's names and link for al-Muyassar (worker/src/passage.ts MUYASSAR_NAME, MUYASSAR_URL; the test holds them equal).
export const MUYASSAR_NAME = 'التفسير الميسر'
export const MUYASSAR_URL = 'https://quran.ksu.edu.sa/ayat/?pg=patches'
/** The languages whose adhkar rows carry a translation (worker/src/adhkar.ts LANGS); any other reads as Arabic. */
export const ADHKAR_LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const

export type OfflineRoute =
  | { kind: 'suras' }
  | { kind: 'quarters' }
  | { kind: 'sura'; n: number; en: boolean; ml: string | null }
  | { kind: 'ayah'; sura: number; aya: number; ml: string | null }
  | { kind: 'adhkar'; cat: string; lang: string }
  | { kind: 'hadith'; id: string; lang: string }
  /** Kept when read, like the web's «reader-api» cache: other passages, the books, the mukhtasar. */
  | { kind: 'kept' }

/** The route of an /api/* GET, or null for anything the app does not keep (asks, reports, the day's card…). */
export function offlineRoute(url: URL, meaningLangs: readonly string[]): OfflineRoute | null {
  const p = url.pathname
  const q = url.searchParams
  const ml = (() => {
    const v = q.get('ml')
    return v && meaningLangs.includes(v) ? v : null
  })()
  // Paths compared, never requested here (the requests go through api() at their call sites).
  if (/^\/api\/suras$/.test(p)) return { kind: 'suras' }
  if (/^\/api\/quarters$/.test(p)) return { kind: 'quarters' }
  let m = p.match(/^\/api\/sura\/(\d{1,3})$/)
  if (m && Number(m[1]) >= 1 && Number(m[1]) <= 114) return { kind: 'sura', n: Number(m[1]), en: q.get('en') === '1', ml }
  m = p.match(/^\/api\/passage\/quran(?::|%3A)(\d{1,3})(?::|%3A)(\d{1,3})$/i)
  if (m) return { kind: 'ayah', sura: Number(m[1]), aya: Number(m[2]), ml }
  m = p.match(/^\/api\/adhkar\/hadith\/(\d{1,7})$/)
  if (m) return { kind: 'hadith', id: m[1], lang: q.get('lang') ?? 'ar' }
  m = p.match(/^\/api\/adhkar\/(\d{1,4})$/)
  if (m) return { kind: 'adhkar', cat: m[1], lang: q.get('lang') ?? 'ar' }
  // The service worker's own pattern (web/vite.config.ts «reader-api»), and the mukhtasar beside the ayah panel.
  if (/^\/api\/(passage\/[^/]+|books|book\/[a-z]+|mukhtasar\/\d{1,3}\/\d{1,3})$/.test(p)) return { kind: 'kept' }
  return null
}

/** The language whose copy in the app answers an adhkar read (the Worker answers any other language as Arabic). */
export const adhkarLang = (lang: string) => ((ADHKAR_LANGS as readonly string[]).includes(lang) ? lang : 'ar')

/** /api/sura/:n[?en=1][&ml=xx] from the app's copy (+ the downloaded meanings), as worker/src/reader.ts getSura builds it. */
export function suraFrom(b: BundledSura, en: boolean, m: SuraMeanings | null): SuraResponse {
  const first = m ? (m.meanings['1'] ?? Object.values(m.meanings)[0]) : undefined
  return {
    n: b.n,
    name: b.name,
    basmala: b.basmala,
    ayat: b.ayat.map((a) => {
      const base: SuraAyah = en ? { aya: a.aya, id: a.id, text: a.text, page: a.page, ...(a.text_en != null ? { text_en: a.text_en } : {}) } : { aya: a.aya, id: a.id, text: a.text, page: a.page }
      const meaning = m?.meanings[String(a.aya)]?.text
      return meaning ? { ...base, meaning } : base
    }),
    ...(m && first ? { meaning_translator: first.translator, meaning_lang: m.lang, ...(first.source_key ? { meaning_version: first.version ?? null, meaning_key: first.source_key } : {}) } : {}),
  }
}

const ctx = (a: BundledAyah): PassageContext => ({ id: a.id, text: a.text, ...(a.text_en ? { text_en: a.text_en } : {}), ref: a.ref })

/** /api/passage/quran:s:a[?ml=xx] from the app's copy, as worker/src/passage.ts getPassage builds it, without al-Saadi. */
export function ayahFrom(b: BundledSura, aya: number, m: SuraMeanings | null): PassageResponse | null {
  const i = b.ayat.findIndex((x) => x.aya === aya)
  if (i < 0) return null
  const a = b.ayat[i]
  const meaning = m?.meanings[String(aya)]
  const r: PassageResponse = {
    id: a.id,
    kind: 'ayah',
    text: a.text,
    ...(a.text_en ? { text_en: a.text_en } : {}),
    ref: a.ref,
    url: a.url,
    verified: true,
    before: b.ayat.filter((x) => x.aya >= aya - 2 && x.aya < aya).map(ctx),
    after: b.ayat.filter((x) => x.aya > aya && x.aya <= aya + 2).map(ctx),
    tafsir: a.muyassar
      ? [{ key: 'muyassar', name: MUYASSAR_NAME, text: a.muyassar, paragraphs: [a.muyassar], ref: `${MUYASSAR_NAME} – ${b.name}: ${a.aya}`, url: MUYASSAR_URL }]
      : [],
    ayah: { sura: b.n, aya, page: a.page, suraName: b.name, suraAyat: b.ayatCount, ...(a.url_en ? { urlEn: a.url_en } : {}) },
  }
  return meaning ? { ...r, meaning } : r
}

/** A short, stable file name for a kept URL (FNV-1a, 32 bits; the URL itself is stored in the file and checked). */
export function keptName(pathAndQuery: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < pathAndQuery.length; i++) {
    h ^= pathAndQuery.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/** The web's «reader-api» cache limits (web/vite.config.ts). */
export const KEPT_MAX = 800
export const KEPT_MAX_AGE_MS = 60 * 24 * 3600 * 1000

/** Which kept entries to drop: older than the age limit, then the oldest beyond the count limit. */
export function keptToDrop(index: Record<string, number>, now: number, max = KEPT_MAX, maxAge = KEPT_MAX_AGE_MS): string[] {
  const all = Object.entries(index)
  const old = all.filter(([, t]) => now - t > maxAge).map(([k]) => k)
  const fresh = all.filter(([, t]) => now - t <= maxAge).sort((a, b) => b[1] - a[1])
  return [...old, ...fresh.slice(max).map(([k]) => k)]
}

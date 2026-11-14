// «المختصر في تفسير القرآن الكريم» in the reader's language, one switch per source (replies 0031-add9 and add14 §3):
//   MUKHTASAR_QURANENC = "true"  QuranEnc's *_mokhtasar keys under its published terms (docs/permissions/
//                                quranenc-terms.md), table tafsir_translations (migration 0010): shown.
//   MUKHTASAR_PUBLIC   = "false" the publisher's own API (mokhtasr.com), table mukhtasar (migration 0006): off until
//                                Talal writes in STATUS that their written permission arrived.
//   GET /api/mukhtasar/:sura/:aya?lang=xx → { text, book_title, lang, source, version?, source_key? } | { found: false };
//   404 while both switches are off.
// One read by primary key per source. Arabic is never served here (rule 7: al-Muyassar and al-Saadi explain the
// ayat), nor Italian (not among the languages with a meaning of the Quran; kept, not shown).
import type { Env } from './index'
import { json, notFound } from './reader'

const NOT_SHOWN = new Set(['ar', 'it'])
export const BOOK_TITLE = 'المختصر في تفسير القرآن الكريم'

export const quranEncOn = (env: Env) => env.MUKHTASAR_QURANENC === 'true'
export const mukhtasarEnabled = (env: Env) => env.MUKHTASAR_PUBLIC === 'true'

export async function getMukhtasar(env: Env, lang: string, sura: number, aya: number) {
  return env.DB.prepare('SELECT text, book_title FROM mukhtasar WHERE lang = ? AND sura = ? AND aya = ?')
    .bind(lang, sura, aya)
    .first<{ text: string; book_title: string }>()
}

export async function getQuranEncMukhtasar(env: Env, lang: string, sura: number, aya: number) {
  return env.DB.prepare("SELECT text, version, source_key FROM tafsir_translations WHERE source = 'quranenc' AND lang = ? AND sura = ? AND aya = ?")
    .bind(lang, sura, aya)
    .first<{ text: string; version: string | null; source_key: string | null }>()
}

/** The route, or null when the path is not it. */
export async function handleMukhtasar(request: Request, env: Env, url: URL): Promise<Response | null> {
  const m = url.pathname.match(/^\/api\/mukhtasar\/(\d{1,3})\/(\d{1,3})$/)
  if (!m || request.method !== 'GET') return null
  if (!quranEncOn(env) && !mukhtasarEnabled(env)) return notFound()
  const lang = url.searchParams.get('lang') ?? ''
  const sura = Number(m[1])
  const aya = Number(m[2])
  if (!/^[a-z]{2}$/.test(lang) || NOT_SHOWN.has(lang) || sura < 1 || sura > 114 || aya < 1) return notFound()
  // A missing table (migration not applied yet) is the same as no text.
  if (quranEncOn(env)) {
    const r = await getQuranEncMukhtasar(env, lang, sura, aya).catch(() => null)
    if (r?.text?.trim()) return json({ text: r.text, book_title: BOOK_TITLE, lang, source: 'quranenc', version: r.version, source_key: r.source_key }, 200, 'no-store')
  }
  if (mukhtasarEnabled(env)) {
    const r = await getMukhtasar(env, lang, sura, aya).catch(() => null)
    if (r?.text?.trim()) return json({ text: r.text, book_title: r.book_title, lang, source: 'mokhtasr.com' }, 200, 'no-store')
  }
  return json({ found: false }, 200, 'no-store')
}

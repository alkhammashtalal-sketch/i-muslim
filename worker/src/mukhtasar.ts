// «المختصر في تفسير القرآن الكريم» in the reader's language (reply 0031-add9), behind MUKHTASAR_PUBLIC.
// MUKHTASAR_PUBLIC stays "false" in wrangler.jsonc (both environments) until Talal writes in STATUS that the
// publisher's written permission arrived; a preview Talal alone sees turns it on with --var MUKHTASAR_PUBLIC:true.
//   GET /api/mukhtasar/:sura/:aya?lang=xx → { text, book_title, lang } | { found: false }; 404 while switched off
// One read by primary key (lang, sura, aya). Arabic is not served here: the Arabic reader has al-Muyassar itself.
import type { Env } from './index'
import { json, notFound } from './reader'

const LANGS = new Set(['en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'])

export const mukhtasarEnabled = (env: Env) => env.MUKHTASAR_PUBLIC === 'true'

export async function getMukhtasar(env: Env, lang: string, sura: number, aya: number) {
  return env.DB.prepare('SELECT text, book_title FROM mukhtasar WHERE lang = ? AND sura = ? AND aya = ?')
    .bind(lang, sura, aya)
    .first<{ text: string; book_title: string }>()
}

/** The route, or null when the path is not it. */
export async function handleMukhtasar(request: Request, env: Env, url: URL): Promise<Response | null> {
  const m = url.pathname.match(/^\/api\/mukhtasar\/(\d{1,3})\/(\d{1,3})$/)
  if (!m || request.method !== 'GET') return null
  if (!mukhtasarEnabled(env)) return notFound()
  const lang = url.searchParams.get('lang') ?? ''
  const sura = Number(m[1])
  const aya = Number(m[2])
  if (!LANGS.has(lang) || sura < 1 || sura > 114 || aya < 1) return notFound()
  // A missing table (migration 0006 not applied yet) is the same as no text.
  const row = await getMukhtasar(env, lang, sura, aya).catch(() => null)
  return json(row?.text?.trim() ? { text: row.text, book_title: row.book_title, lang } : { found: false }, 200, 'no-store')
}

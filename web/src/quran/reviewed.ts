// The reviewed aligned translation of al-Tafsir al-Muyassar (command 21): static files published only for the ayat
// and languages that passed an independent review, at /explain/{lang}/{S}_{A}.json. No model is called from the app;
// a missing file (404) means no translation, and no button.
//
// Where it is read (reply 0037 §3.4): the web build reads the static file, served without the Worker; the iOS/Android
// app (API_BASE set) reads the server's copy at /api/reviewed/{lang}/{S}/{A} with the connection, and the copy inside
// the app without it (web/src/native/offline.ts), so a translation published or withdrawn later reaches the app.
import type { Lang } from '../../../shared/api'
import { API_BASE, api } from '../api/base'

export type Reviewed = { id: string; lang: Lang; text: string; sentences: string[]; label: 'reviewed-mt'; reviewed_at: string; reviewer: string }

const memo = new Map<string, Promise<Reviewed | null>>()

/** The address of one ayah's file: the static file on the web, the /api/ route in the app. */
export const reviewedHref = (lang: string, sura: string, aya: string) =>
  API_BASE ? api(`/api/reviewed/${lang}/${sura}/${aya}`) : `/explain/${lang}/${sura}_${aya}.json`

/** The published translation for one ayah in one language, or null (Arabic, not an ayah, not published, offline). */
export function getReviewed(id: string, lang: Lang): Promise<Reviewed | null> {
  const m = /^quran:(\d{1,3}):(\d{1,3})$/.exec(id)
  if (!m || lang === 'ar') return Promise.resolve(null)
  const key = `${lang}/${m[1]}_${m[2]}`
  let p = memo.get(key)
  if (!p) {
    p = fetch(reviewedHref(lang, m[1], m[2]))
      .then(async (r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? ((await r.json()) as Reviewed) : null))
      .then((r) => (r && typeof r.text === 'string' && r.text.trim() ? r : null))
      .catch(() => {
        // No answer at all (offline, and neither kept nor in the app): asked again next time, not remembered as none.
        memo.delete(key)
        return null
      })
    memo.set(key, p)
  }
  return p
}

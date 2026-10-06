// The reviewed aligned translation of al-Tafsir al-Muyassar (command 21): static files published only for the ayat
// and languages that passed an independent review, at /explain/{lang}/{S}_{A}.json. No model is called from the app;
// a missing file (404) means no translation, and no button.
import type { Lang } from '../../../shared/api'

export type Reviewed = { id: string; lang: Lang; text: string; sentences: string[]; label: 'reviewed-mt'; reviewed_at: string; reviewer: string }

const memo = new Map<string, Promise<Reviewed | null>>()

/** The published translation for one ayah in one language, or null (Arabic, not an ayah, not published, offline). */
export function getReviewed(id: string, lang: Lang): Promise<Reviewed | null> {
  const m = /^quran:(\d{1,3}):(\d{1,3})$/.exec(id)
  if (!m || lang === 'ar') return Promise.resolve(null)
  const key = `${lang}/${m[1]}_${m[2]}`
  let p = memo.get(key)
  if (!p) {
    p = fetch(`/explain/${key}.json`)
      .then(async (r) => (r.ok && (r.headers.get('content-type') ?? '').includes('json') ? ((await r.json()) as Reviewed) : null))
      .then((r) => (r && typeof r.text === 'string' && r.text.trim() ? r : null))
      .catch(() => null)
    memo.set(key, p)
  }
  return p
}

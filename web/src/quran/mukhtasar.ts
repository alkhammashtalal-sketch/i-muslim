// «المختصر في تفسير القرآن الكريم» in the reader's language (reply 0031-add9), from /api/mukhtasar/:s/:a?lang=. The
// route answers 404 while MUKHTASAR_PUBLIC is off, so outside the private preview this is always null.
import type { Lang } from '../../../shared/api'

export type Mukhtasar = { text: string; book_title: string; lang: Lang }

const memo = new Map<string, Promise<Mukhtasar | null>>()

/** The Mukhtasar for one ayah in one language, or null (Arabic, not an ayah, switched off, no text, offline). */
export function getMukhtasar(id: string, lang: Lang): Promise<Mukhtasar | null> {
  const m = /^quran:(\d{1,3}):(\d{1,3})$/.exec(id)
  if (!m || lang === 'ar') return Promise.resolve(null)
  const key = `${m[1]}/${m[2]}?lang=${lang}`
  let p = memo.get(key)
  if (!p) {
    p = fetch(`/api/mukhtasar/${key}`)
      .then(async (r) => (r.ok ? ((await r.json()) as Partial<Mukhtasar>) : null))
      .then((r) => (r && typeof r.text === 'string' && r.text.trim() ? (r as Mukhtasar) : null))
      .catch(() => null)
    memo.set(key, p)
  }
  return p
}

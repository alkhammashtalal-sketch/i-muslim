// «اسم من أسماء الله» (reply 0071 §4.2; add-ons 0071-add1 and 0071-add2 §2): the day's entry from the Worker
// (worker/src/names-day.ts), ids only, with the names file's readings only when the server's switch is on. The app
// holds no copy of the readings: they reach it from the server or not at all. The texts are read by their ids.
import type { PassageResponse } from '../../../../../shared/api'
import { api } from '../../../api/base'
import { ML } from '../../../quran/api'

export type NameDua = { kind: 'ayah' | 'hadith'; id: string }
export type NameEntry = {
  n: number
  name: string
  ayah: string | null
  hadith: string | null
  meaningAyah: string | null
  duas: NameDua[]
  quranOnly: boolean
  tafsirOf: string | null
}
export type NameReadings = { meaning: string; easy: string; deep: string[] }
export type NameDay = { day: string; index: number; count: number; entry: NameEntry; readings?: NameReadings }

/** The date in Riyadh (UTC+3, no daylight saving): the day the card turns, as the ayah and the hadith of the day. */
export const riyadhDate = (now = Date.now()) => new Date(now + 3 * 3600_000).toISOString().slice(0, 10)

async function getJson<T>(url: string): Promise<T | null> {
  const r = await fetch(url)
  // A server without the route (404) shows no card.
  if (r.status === 404) return null
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return (await r.json()) as T
}

const memo = new Map<string, Promise<unknown>>()
function once<T>(url: string): Promise<T | null> {
  let p = memo.get(url) as Promise<T | null> | undefined
  if (!p) {
    p = getJson<T>(url)
    p.catch(() => memo.delete(url))
    memo.set(url, p)
  }
  return p
}

export const getNameDay = (day: string, lang: string) => once<NameDay>(api(`/api/names/day?day=${day}&lang=${lang === 'ar' ? 'ar' : encodeURIComponent(lang)}`))

export type NamePart = { kind: 'ayah' | 'hadith'; id: string; label: string; tafsir: boolean }
export type PartLabels = { evidence: string; meaningAyah: string; duaQuran: string; duaSunnah: string }

/** The quoted parts in the order of add-on 0071-add1: the evidence, the ayah for the meaning, then the duas. A text
 *  already shown is not shown twice (a dua that is the evidence itself); the tafsir goes with `tafsirOf` alone. */
export function partsOf(e: NameEntry, s: PartLabels): NamePart[] {
  const parts: NamePart[] = []
  const seen = new Set<string>()
  const add = (kind: NamePart['kind'], id: string | null, label: string) => {
    if (!id || seen.has(`${kind}:${id}`)) return
    seen.add(`${kind}:${id}`)
    parts.push({ kind, id, label, tafsir: kind === 'ayah' && id === e.tafsirOf })
  }
  add('ayah', e.ayah, s.evidence)
  add('hadith', e.hadith, s.evidence)
  add('ayah', e.meaningAyah, s.meaningAyah)
  for (const d of e.duas) add(d.kind, d.id, d.kind === 'ayah' ? s.duaQuran : s.duaSunnah)
  return parts
}

/** One ayah from D1 as the reader serves it, with Ibn Kathir when its tafsir is shown, and the meaning in the
 *  content language (command 22) outside Arabic and English. */
export function getNameAyah(id: string, content: string, withTafsir: boolean): Promise<PassageResponse | null> {
  const q = [withTafsir ? 'with=katheer' : '', ML.includes(content) ? `ml=${content}` : ''].filter(Boolean).join('&')
  return once<PassageResponse>(api(`/api/passage/${id}${q ? `?${q}` : ''}`))
}

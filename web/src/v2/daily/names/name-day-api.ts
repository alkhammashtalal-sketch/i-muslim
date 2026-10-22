// «اسم من أسماء الله» (reply 0071 §4.2; add-ons 0071-add1, 0071-add2 §2, 0071-add5 §2, 0072-add1): the day's entry, an
// entry by its number, and the list, from the Worker (worker/src/names-day.ts), ids only, with the names file's readings
// (and the appendix notes) only when the server's switch is on. The
// app holds no copy of the readings: they reach it from the server or not at all. The texts are read by their ids.
import type { PassageResponse } from '../../../../../shared/api'
import { api } from '../../../api/base'
import { ML } from '../../../quran/api'
import { hadithPath, quranPath } from '../../../quran/route'

/** `praise`: a praise from the Quran («ثناء قرآني», al-Fatiha 2), not a dua. */
export type NameDua = { kind: 'ayah' | 'hadith'; id: string; praise?: boolean }
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
/** Arabic; a citation by number is written {{its words|quran:s:a}} or {{its words|hadith:id}} (add-on 0071-add5 §2). */
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

// Add-on 0072-add1: the name's own page and «كل الأسماء».
export type NameRef = { n: number; name: string }
export type NameEntryDay = { index: number; count: number; entry: NameEntry; readings?: NameReadings; prev: NameRef; next: NameRef }
/** An entry of the file's appendix: not in the rotation; `note`, its «تنبيه الملحق», only while the switch is on. */
export type NameAppendix = NameRef & { note?: string }
export type NamesList = { count: number; entries: NameRef[]; appendix: NameAppendix[] }

/** Entry `n` (1–96) with its neighbours in the order. */
export const getNameEntry = (n: number) => once<NameEntryDay>(api(`/api/names/entry/${n}`))
/** The 96 in their order and the six of the appendix. */
export const getNamesList = () => once<NamesList>(api('/api/names/list'))

/** The name's page: /today/name/<n>, or /today/name for the day's. */
export const namePath = (n?: number) => (n ? `/today/name/${n}` : '/today/name')
/** «كل الأسماء»: the one names page, at the daily tool's path. */
export const NAMES_PATH = '/today/names'
/** The entry a /today/name path asks for, or null for the day's. */
export function nameOfPath(path: string): number | null {
  const m = path.match(/^\/today\/name\/(\d{1,3})\/?$/)
  return m ? Number(m[1]) : null
}

export type NamePart = { kind: 'ayah' | 'hadith'; id: string; label: string; tafsir: boolean }
export type PartLabels = { evidence: string; meaningAyah: string; duaQuran: string; praiseQuran: string; duaSunnah: string }

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
  for (const d of e.duas) add(d.kind, d.id, d.kind === 'ayah' ? (d.praise ? s.praiseQuran : s.duaQuran) : s.duaSunnah)
  return parts
}

/** A piece of a reading: its own words, and the page of the ayah or hadith it cites when it is a link. */
export type ReadingPiece = { text: string; path?: string; id?: string }
const LINK = /\{\{([^{}|]+)\|([^{}|]+)\}\}/g

/** A reading split at its links (add-on 0071-add5 §2): {{هود 57|quran:11:57}} opens /quran/11/57, {{…|hadith:6335}}
 *  opens /hadith/6335 (its grade and takhrij). An id of another form is shown as its words alone, never as a link. */
export function readingPieces(t: string): ReadingPiece[] {
  const out: ReadingPiece[] = []
  let at = 0
  for (const m of t.matchAll(LINK)) {
    if (m.index > at) out.push({ text: t.slice(at, m.index) })
    const a = m[2].match(/^quran:(\d{1,3}):(\d{1,3})$/)
    const h = m[2].match(/^hadith:(\d{1,7})$/)
    out.push(a ? { text: m[1], id: m[2], path: quranPath(Number(a[1]), Number(a[2])) } : h ? { text: m[1], id: m[2], path: hadithPath(h[1]) } : { text: m[1] })
    at = m.index + m[0].length
  }
  if (at < t.length) out.push({ text: t.slice(at) })
  return out
}

/** One ayah from D1 as the reader serves it, with Ibn Kathir when its tafsir is shown, and the meaning in the
 *  content language (command 22) outside Arabic and English. */
export function getNameAyah(id: string, content: string, withTafsir: boolean): Promise<PassageResponse | null> {
  const q = [withTafsir ? 'with=katheer' : '', ML.includes(content) ? `ml=${content}` : ''].filter(Boolean).join('&')
  return once<PassageResponse>(api(`/api/passage/${id}${q ? `?${q}` : ''}`))
}

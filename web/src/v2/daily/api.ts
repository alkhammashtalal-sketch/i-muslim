// Reads for the daily tools (reply 0032 D-5, D-6, D-8): HadeethEnc rows by key from D1 through the Worker; the ayat
// and al-Muyassar through the reader's /api/passage. Nothing is written; nothing leaves the device but the path.
import type { PassageResponse, SuraSummary } from '../../../../shared/api'
import { api } from '../../api/base'

export type Translation = { lang: string; title: string | null; text: string; grade: string | null; attribution: string | null; version: string | null }
export type ToolHadith = {
  id: string
  /** HadeethEnc's title of the Arabic row, as received (the adhkar card's title; the language row's is translation.title). */
  title: string | null
  text: string
  grade: string | null
  attribution: string | null
  tier: string
  version: string | null
  /** The segments to highlight, each a verbatim part of `text`: all of a dhikr's or none (reply 0031-add16 §2). */
  highlights?: string[]
  count?: { n: number; evidence: string } | null
  translation?: Translation
}

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return (await r.json()) as T
}
const memo = new Map<string, Promise<unknown>>()
function cached<T>(url: string): Promise<T> {
  let p = memo.get(url) as Promise<T> | undefined
  if (!p) {
    p = get<T>(url)
    p.catch(() => memo.delete(url))
    memo.set(url, p)
  }
  return p
}

export const getAdhkar = (cat: string, lang: string) => cached<{ category: string; items: ToolHadith[] }>(api(`/api/adhkar/${cat}?lang=${lang}`))
export const getToolHadith = (id: string, lang: string) => cached<ToolHadith>(api(`/api/adhkar/hadith/${id}?lang=${lang}`))
export const getPassage = (id: string) => cached<PassageResponse>(api(`/api/passage/${id}`))
export const getSuras = () => cached<SuraSummary[]>(api('/api/suras'))

/** HadeethEnc's page for a hadith, in the reader's language when the site has it. */
export const hadeethEncUrl = (id: string, lang: string) => `https://hadeethenc.com/${lang}/browse/hadith/${id}`

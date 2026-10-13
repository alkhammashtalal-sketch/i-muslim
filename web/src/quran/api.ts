import type { PassageResponse, SuraResponse, SuraSummary } from '../../../shared/api'
import { SERVED } from '../v2/lang/served'
import { api } from '../api/base'

// The reader always reads live data from D1 (no demo data): text must match the source.
async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

let surasMemo: Promise<SuraSummary[]> | null = null
export function getSuras(): Promise<SuraSummary[]> {
  surasMemo ??= getJson<SuraSummary[]>(api('/api/suras')).then((s) => s ?? [])
  surasMemo.catch(() => (surasMemo = null))
  return surasMemo
}

// ml: the meaning in the reader's content language, a human translation (command 22; reply 0032 A): every served
// language but Arabic (the original) and English (Sahih International, `en=1`), the same list as worker/src/meaning.ts
// (reply 0033 §أ1: data/served-langs.json; checked in worker/test/lang-picker.test.ts).
export const ML: readonly string[] = SERVED.map((l) => l.code).filter((c) => c !== 'ar' && c !== 'en')
const mlOf = (lang?: string) => (lang && ML.includes(lang) ? lang : null)

const suraMemo = new Map<string, Promise<SuraResponse | null>>()
export function getSura(n: number, en: boolean, lang?: string): Promise<SuraResponse | null> {
  const ml = mlOf(lang)
  const key = `${n}|${en ? 1 : 0}|${ml ?? ''}`
  let p = suraMemo.get(key)
  if (!p) {
    const q = [en ? 'en=1' : '', ml ? `ml=${ml}` : ''].filter(Boolean).join('&')
    p = getJson<SuraResponse>(api(`/api/sura/${n}${q ? `?${q}` : ''}`))
    p.catch(() => suraMemo.delete(key))
    suraMemo.set(key, p)
  }
  return p
}

const passageMemo = new Map<string, Promise<PassageResponse | null>>()
export function getAyah(sura: number, aya: number, lang?: string): Promise<PassageResponse | null> {
  const id = `quran:${sura}:${aya}`
  const ml = mlOf(lang)
  const key = `${id}|${ml ?? ''}`
  let p = passageMemo.get(key)
  if (!p) {
    p = getJson<PassageResponse>(api(`/api/passage/${id}${ml ? `?ml=${ml}` : ''}`))
    p.catch(() => passageMemo.delete(key))
    passageMemo.set(key, p)
  }
  return p
}

// «بسّط لي» / «اشرح لي بلغتي» (rule 12). The button shows only while the server says the feature is on.
export type ExplainStatus = { enabled: boolean; mode?: 'mock' | 'live' }
let explainStatus: Promise<ExplainStatus> | null = null
export function getExplainStatus(): Promise<ExplainStatus> {
  explainStatus ??= fetch(api('/api/explain')).then(
    async (r) => (r.ok ? ((await r.json()) as ExplainStatus) : { enabled: false }),
    () => ({ enabled: false }),
  )
  return explainStatus
}

/** The limits /api/explain may answer with (reply 0037 §5): the day's requests, the day's 60 new answers, 6 in a
 *  minute, and the month's budget. */
const EXPLAIN_LIMITS = ['rate_limited', 'answers_limited', 'burst', 'monthly_cap'] as const
type ExplainLimit = (typeof EXPLAIN_LIMITS)[number]
export type ExplainResult =
  | { text: string; fromCache: boolean; mock: boolean; source?: { name: string; url: string } }
  | { error: ExplainLimit | 'unavailable' }
export async function postExplain(id: string, lang: string): Promise<ExplainResult> {
  try {
    const r = await fetch(api('/api/explain'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, lang }) })
    const body = (await r.json().catch(() => ({}))) as { text?: string; fromCache?: boolean; mock?: boolean; source?: { name: string; url: string }; error?: string }
    if (r.ok && body.text) return { text: body.text, fromCache: !!body.fromCache, mock: !!body.mock, source: body.source }
    if (EXPLAIN_LIMITS.includes(body.error as ExplainLimit)) return { error: body.error as ExplainLimit }
    return { error: 'unavailable' }
  } catch {
    return { error: 'unavailable' }
  }
}

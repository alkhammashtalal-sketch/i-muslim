import type { PassageResponse, SuraResponse, SuraSummary } from '../../../shared/api'

// The reader always reads live data from D1 (no demo data): text must match the source.
async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

let surasMemo: Promise<SuraSummary[]> | null = null
export function getSuras(): Promise<SuraSummary[]> {
  surasMemo ??= getJson<SuraSummary[]>('/api/suras').then((s) => s ?? [])
  surasMemo.catch(() => (surasMemo = null))
  return surasMemo
}

// ml: the meaning in one of the seven languages with a human translation (command 22).
const ML = ['ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn']
const mlOf = (lang?: string) => (lang && ML.includes(lang) ? lang : null)

const suraMemo = new Map<string, Promise<SuraResponse | null>>()
export function getSura(n: number, en: boolean, lang?: string): Promise<SuraResponse | null> {
  const ml = mlOf(lang)
  const key = `${n}|${en ? 1 : 0}|${ml ?? ''}`
  let p = suraMemo.get(key)
  if (!p) {
    const q = [en ? 'en=1' : '', ml ? `ml=${ml}` : ''].filter(Boolean).join('&')
    p = getJson<SuraResponse>(`/api/sura/${n}${q ? `?${q}` : ''}`)
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
    p = getJson<PassageResponse>(`/api/passage/${id}${ml ? `?ml=${ml}` : ''}`)
    p.catch(() => passageMemo.delete(key))
    passageMemo.set(key, p)
  }
  return p
}

// «بسّط لي» / «اشرح لي بلغتي» (rule 12). The button shows only while the server says the feature is on.
export type ExplainStatus = { enabled: boolean; mode?: 'mock' | 'live' }
let explainStatus: Promise<ExplainStatus> | null = null
export function getExplainStatus(): Promise<ExplainStatus> {
  explainStatus ??= fetch('/api/explain').then(
    async (r) => (r.ok ? ((await r.json()) as ExplainStatus) : { enabled: false }),
    () => ({ enabled: false }),
  )
  return explainStatus
}

export type ExplainResult =
  | { text: string; fromCache: boolean; mock: boolean; source?: { name: string; url: string } }
  | { error: 'rate_limited' | 'monthly_cap' | 'unavailable' }
export async function postExplain(id: string, lang: string): Promise<ExplainResult> {
  try {
    const r = await fetch('/api/explain', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, lang }) })
    const body = (await r.json().catch(() => ({}))) as { text?: string; fromCache?: boolean; mock?: boolean; source?: { name: string; url: string }; error?: string }
    if (r.ok && body.text) return { text: body.text, fromCache: !!body.fromCache, mock: !!body.mock, source: body.source }
    if (body.error === 'rate_limited' || body.error === 'monthly_cap') return { error: body.error }
    return { error: 'unavailable' }
  } catch {
    return { error: 'unavailable' }
  }
}

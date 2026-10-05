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

const suraMemo = new Map<string, Promise<SuraResponse | null>>()
export function getSura(n: number, en: boolean): Promise<SuraResponse | null> {
  const key = `${n}|${en ? 1 : 0}`
  let p = suraMemo.get(key)
  if (!p) {
    p = getJson<SuraResponse>(`/api/sura/${n}${en ? '?en=1' : ''}`)
    p.catch(() => suraMemo.delete(key))
    suraMemo.set(key, p)
  }
  return p
}

const passageMemo = new Map<string, Promise<PassageResponse | null>>()
export function getAyah(sura: number, aya: number): Promise<PassageResponse | null> {
  const id = `quran:${sura}:${aya}`
  let p = passageMemo.get(id)
  if (!p) {
    p = getJson<PassageResponse>(`/api/passage/${id}`)
    p.catch(() => passageMemo.delete(id))
    passageMemo.set(id, p)
  }
  return p
}

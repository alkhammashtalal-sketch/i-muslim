import type { BookResponse, BookSummary, PassageResponse } from '../../../shared/api'

// Live data from D1, like the Quran reader.
async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return (await res.json()) as T
}

const memo = new Map<string, Promise<unknown>>()
function cached<T>(url: string): Promise<T | null> {
  let p = memo.get(url) as Promise<T | null> | undefined
  if (!p) {
    p = getJson<T>(url)
    p.catch(() => memo.delete(url))
    memo.set(url, p)
  }
  return p
}

export const getBooks = () => cached<BookSummary[]>('/api/books').then((b) => b ?? [])
export const getBook = (key: string) => cached<BookResponse>(`/api/book/${key}`)
export const getSegment = (id: string) => cached<PassageResponse>(`/api/passage/${id}`)

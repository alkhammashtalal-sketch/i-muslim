// Aqeedah library routes (command 10). Text exactly as stored in D1; reads by index only:
// the passages(kind) index for the book list, and an id range (primary key) for one book.
//   GET /api/books        → BookSummary[] (the three books, in study order)
//   GET /api/book/:book   → BookResponse (chapters and their segments, in order)
import type { BookResponse, BookSegment, BookSummary } from '../../shared/api'
import type { Env } from './index'
import { edgeCached, json, notFound } from './reader'

// Order of the printed edition (book 239: الأصول الثلاثة، شروط الصلاة وأركانها، القواعد الأربع), then كتاب التوحيد.
export const BOOK_ORDER = ['usul', 'shurut', 'qawaid', 'tawhid']

const keyOf = (id: string) => id.split(':')[1] ?? ''

export async function listBooks(env: Env): Promise<BookSummary[]> {
  const { results } = await env.DB.prepare("SELECT id, book, chapter FROM passages WHERE kind = 'aqeedah'").all<{
    id: string
    book: string
    chapter: string
  }>()
  const books = new Map<string, { name: string; segments: number; chapters: Set<string> }>()
  for (const r of results) {
    const k = keyOf(r.id)
    const b = books.get(k) ?? { name: r.book, segments: 0, chapters: new Set<string>() }
    b.segments++
    b.chapters.add(r.chapter)
    books.set(k, b)
  }
  const rank = (k: string) => (BOOK_ORDER.includes(k) ? BOOK_ORDER.indexOf(k) : BOOK_ORDER.length)
  return [...books]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([key, b]) => ({ key, name: b.name, segments: b.segments, chapters: b.chapters.size }))
}

export async function getBook(env: Env, key: string): Promise<BookResponse | null> {
  if (!/^[a-z]{1,20}$/.test(key)) return null
  // ids are aqeedah:<key>:NNN (zero-padded), so the primary-key range is the book in order.
  const { results } = await env.DB.prepare(
    'SELECT id, book, chapter, page, text, extra FROM passages WHERE id > ? AND id < ? ORDER BY id',
  )
    .bind(`aqeedah:${key}:`, `aqeedah:${key};`)
    .all<{ id: string; book: string; chapter: string; page: number; text: string; extra: string }>()
  if (!results.length) return null
  const chapters: BookResponse['chapters'] = []
  for (const r of results) {
    const extra = JSON.parse(r.extra || '{}') as { page_end?: number }
    const seg: BookSegment = { id: r.id, chapter: r.chapter, page: r.page, pageEnd: extra.page_end ?? r.page, text: r.text }
    const last = chapters.at(-1)
    if (last && last.title === r.chapter) last.segments.push(seg)
    else chapters.push({ title: r.chapter, segments: [seg] })
  }
  return { key, name: results[0].book, chapters }
}

/** Returns a Response for library routes, or null when the path is not one of them. */
export async function handleLibrary(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (request.method !== 'GET') return null
  if (url.pathname === '/api/books') return edgeCached(url, async () => json(await listBooks(env)))
  const m = url.pathname.match(/^\/api\/book\/([^/]+)$/)
  if (m) {
    return edgeCached(url, async () => {
      const b = await getBook(env, m[1])
      return b ? json(b) : notFound()
    })
  }
  return null
}

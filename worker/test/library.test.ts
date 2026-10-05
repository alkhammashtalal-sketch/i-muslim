import { beforeAll, describe, expect, it } from 'vitest'
import type { BookResponse, BookSummary } from '../../shared/api'
import type { Env } from '../src/index'
import { handleLibrary } from '../src/library'
import { handleReader } from '../src/reader'
import { buildDb, hasFullData, rawRecord } from './d1-sqlite'

let env: Env
const get = async (path: string) => {
  const url = new URL(`https://i-muslim.test${path}`)
  const req = new Request(url)
  const res = (await handleLibrary(req, env, url)) ?? (await handleReader(req, env, url))
  if (!res) throw new Error(`no route for ${path}`)
  return { status: res.status, cache: res.headers.get('cache-control'), body: (await res.json()) as any }
}

describe.skipIf(!hasFullData)('aqeedah library routes on the full data (data/processed)', () => {
  beforeAll(() => {
    env = { DB: buildDb() } as unknown as Env
  })

  it('GET /api/books: the three books in study order, 105 segments, long cache', async () => {
    const { status, body, cache } = await get('/api/books')
    expect(status).toBe(200)
    expect(cache).toMatch(/max-age=\d+/)
    const books = body as BookSummary[]
    expect(books.map((b) => b.key)).toEqual(['usul', 'qawaid', 'tawhid'])
    expect(books.map((b) => b.name)).toEqual(['الأصول الثلاثة', 'القواعد الأربع', 'كتاب التوحيد'])
    expect(books.reduce((n, b) => n + b.segments, 0)).toBe(105)
    expect(books.find((b) => b.key === 'tawhid')!.chapters).toBeGreaterThan(60)
  })

  it('each book: every segment once, in id order, pages never go back, text byte-identical', async () => {
    const { body: books } = await get('/api/books')
    let total = 0
    for (const b of books as BookSummary[]) {
      const { body } = await get(`/api/book/${b.key}`)
      const book = body as BookResponse
      expect(book.name).toBe(b.name)
      const segs = book.chapters.flatMap((c) => c.segments)
      expect(segs).toHaveLength(b.segments)
      expect(book.chapters).toHaveLength(b.chapters)
      expect(segs.map((s) => s.id)).toEqual([...segs.map((s) => s.id)].sort())
      for (let i = 1; i < segs.length; i++) expect(segs[i].page).toBeGreaterThanOrEqual(segs[i - 1].page)
      for (const s of segs) {
        const raw = rawRecord(s.id)!
        expect(s.text).toBe(raw.text)
        expect(s.page).toBe(raw.page)
        expect(s.pageEnd).toBe(raw.page_end)
        expect(s.chapter).toBe(raw.chapter)
      }
      for (const c of book.chapters) expect(c.segments.every((s) => s.chapter === c.title)).toBe(true)
      total += segs.length
    }
    expect(total).toBe(105)
  })

  it('aqeedah passage carries its book position and the editor footnotes verbatim', async () => {
    const { body } = await get('/api/passage/aqeedah:tawhid:001')
    const raw = rawRecord('aqeedah:tawhid:001')!
    expect(body.segment).toMatchObject({ book: 'كتاب التوحيد', bookKey: 'tawhid', chapter: raw.chapter, page: raw.page, pageEnd: raw.page_end })
    expect(body.segment.footnotes).toBe(raw.footnotes)
    expect(body.url).toBe(raw.url)
    expect(body.url).toMatch(/^https:\/\/shamela\.ws\/book\/11318\//)
  })

  it('unknown or malformed books are 404, never cached', async () => {
    for (const p of ['/api/book/nope', '/api/book/USUL', '/api/book/a%3Bb']) {
      const r = await get(p)
      expect(r.status).toBe(404)
      expect(r.cache).toBe('no-store')
    }
  })
})

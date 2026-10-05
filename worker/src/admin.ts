// Temporary indexing + search-probe routes (command 04). Both answer 404 unless ADMIN_ENABLED === 'true',
// and indexing also needs `Authorization: Bearer <ADMIN_TOKEN>`. Shipped build keeps ADMIN_ENABLED=false.
import type { Env } from './index'
import { normalizeArabic } from './lib/normalize'

export const EMBED_MODEL = '@cf/baai/bge-m3'
const MAX_BATCH = 50

type Rec = Record<string, unknown> & {
  id: string
  source: string
  kind: string
  ref: string
  url: string
  text: string
  text_en?: string | null
  text_search: string
  embed_text: string
  book?: string
  chapter?: string
  sura?: number
  aya?: number
  page?: number
}

const COLUMNS = ['id', 'source', 'kind', 'ref', 'url', 'text', 'text_en', 'text_search', 'embed_text', 'book', 'chapter', 'sura', 'aya', 'page'] as const

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

export const adminEnabled = (env: Env) => env.ADMIN_ENABLED === 'true'

async function authorized(request: Request, env: Env): Promise<boolean> {
  const got = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const want = env.ADMIN_TOKEN ?? ''
  if (!want || got.length !== want.length) return false
  const enc = new TextEncoder()
  return crypto.subtle.timingSafeEqual(enc.encode(got), enc.encode(want))
}

export async function embed(env: Env, texts: string[]): Promise<number[][]> {
  const out = (await env.AI.run(EMBED_MODEL, { text: texts })) as { data?: number[][] }
  if (!out.data || out.data.length !== texts.length) throw new Error('embedding_failed')
  return out.data
}

// POST /api/admin/index  { records: Rec[] }  → upsert into D1 (passages + FTS) and Vectorize.
export async function handleIndex(request: Request, env: Env): Promise<Response> {
  if (!(await authorized(request, env))) return json({ ok: false, error: 'unauthorized' }, 401)
  const body = (await request.json().catch(() => null)) as { records?: Rec[] } | null
  const records = body?.records
  if (!Array.isArray(records) || records.length === 0 || records.length > MAX_BATCH) {
    return json({ ok: false, error: `records must be 1..${MAX_BATCH}` }, 400)
  }
  for (const r of records) {
    for (const k of ['id', 'source', 'kind', 'ref', 'url', 'text', 'text_search', 'embed_text'] as const) {
      if (typeof r[k] !== 'string' || !(r[k] as string).length) return json({ ok: false, error: `${r.id ?? '?'}: missing ${k}` }, 400)
    }
  }

  const vectors = await embed(env, records.map((r) => r.embed_text))

  const insert = env.DB.prepare(
    `INSERT OR REPLACE INTO passages (${COLUMNS.join(', ')}, extra) VALUES (${COLUMNS.map(() => '?').join(', ')}, ?)`,
  )
  const delFts = env.DB.prepare('DELETE FROM passages_fts WHERE id = ?')
  const insFts = env.DB.prepare('INSERT INTO passages_fts (id, text_search) VALUES (?, ?)')
  const stmts: D1PreparedStatement[] = []
  for (const r of records) {
    const extra: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(r)) if (!(COLUMNS as readonly string[]).includes(k)) extra[k] = v
    stmts.push(insert.bind(...COLUMNS.map((c) => (r[c] ?? null) as string | number | null), JSON.stringify(extra)))
    stmts.push(delFts.bind(r.id), insFts.bind(r.id, r.text_search))
  }
  await env.DB.batch(stmts)

  await env.VECTORIZE.upsert(
    records.map((r, i) => ({ id: r.id, values: vectors[i], metadata: { kind: r.kind, source: r.source } })),
  )
  return json({ ok: true, indexed: records.length })
}

// FTS5 query from a normalized question: each token quoted (no operator injection), OR-ed.
export function ftsQuery(q: string): string | null {
  const tokens = normalizeArabic(q)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .slice(0, 12)
  return tokens.length ? tokens.map((t) => `"${t}"`).join(' OR ') : null
}

type Row = { id: string; ref: string; url: string; kind: string; text: string }
const brief = (r: Row) => ({ id: r.id, ref: r.ref, url: r.url, kind: r.kind, text: r.text.slice(0, 240) })

// GET /api/search?q=  → top 5 from Vectorize and top 5 from FTS5, with references.
export async function handleSearch(request: Request, env: Env): Promise<Response> {
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim()
  if (!q || q.length > 500) return json({ ok: false, error: 'q must be 1..500 chars' }, 400)

  const [vec] = await embed(env, [q])
  const vres = await env.VECTORIZE.query(vec, { topK: 5 })
  const vids = vres.matches.map((m) => m.id)
  const vrows = vids.length
    ? ((await env.DB.prepare(`SELECT id, ref, url, kind, text FROM passages WHERE id IN (${vids.map(() => '?').join(',')})`).bind(...vids).all<Row>()).results)
    : []
  const byId = new Map(vrows.map((r) => [r.id, r]))
  const vector = vres.matches.map((m) => ({ score: Number(m.score.toFixed(4)), ...brief(byId.get(m.id) ?? { id: m.id, ref: '?', url: '', kind: '', text: '' }) }))

  const fq = ftsQuery(q)
  const keyword = fq
    ? (
        await env.DB.prepare(
          `SELECT p.id, p.ref, p.url, p.kind, p.text, bm25(passages_fts) AS rank
             FROM passages_fts JOIN passages p ON p.id = passages_fts.id
            WHERE passages_fts MATCH ? ORDER BY rank LIMIT 5`,
        )
          .bind(fq)
          .all<Row & { rank: number }>()
      ).results.map((r) => ({ rank: Number(r.rank.toFixed(3)), ...brief(r) }))
    : []

  return json({ ok: true, fts_query: fq, vector, keyword })
}

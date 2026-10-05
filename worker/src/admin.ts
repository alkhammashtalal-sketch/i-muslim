// Temporary admin routes (commands 04–05). All answer 404 unless ADMIN_ENABLED === 'true', and all need
// `Authorization: Bearer <ADMIN_TOKEN>`. The shipped build keeps ADMIN_ENABLED=false.
//
// D1 read budget: FTS rows are only ever replaced by rowid (never `WHERE id = ?` on an UNINDEXED column,
// which scans the whole table), and every route returns the rows_read / rows_written it used.
import type { Lang } from '../../shared/api'
import cfg from './config/retrieval.json'
import type { Env } from './index'
import { chunkSaadi } from './lib/chunk'
import { ftsIndexText, stripTags } from './lib/normalize'
import { embed, retrieve, type Mode } from './retrieve'

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

export async function authorized(request: Request, env: Env): Promise<boolean> {
  const got = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const want = env.ADMIN_TOKEN ?? ''
  if (!want || got.length !== want.length) return false
  const enc = new TextEncoder()
  return crypto.subtle.timingSafeEqual(enc.encode(got), enc.encode(want))
}

type Meta = { rows_read: number; rows_written: number }
const sumMeta = (results: { meta: { rows_read?: number; rows_written?: number } }[]): Meta =>
  results.reduce(
    (m, r) => ({ rows_read: m.rows_read + (r.meta.rows_read ?? 0), rows_written: m.rows_written + (r.meta.rows_written ?? 0) }),
    { rows_read: 0, rows_written: 0 },
  )

type SearchRow = { rowid: number; id: string; kind: string; text: string; text_en: string | null; extra: string }

/** Statements that (re)write every keyword-index row of one passage, addressed by rowid. */
function searchRowStatements(env: Env, p: SearchRow, replace: boolean): D1PreparedStatement[] {
  const out: D1PreparedStatement[] = []
  const del = (table: string, rowid: number) => out.push(env.DB.prepare(`DELETE FROM ${table} WHERE rowid = ?`).bind(rowid))

  if (replace) del('passages_fts', p.rowid)
  out.push(env.DB.prepare('INSERT INTO passages_fts (rowid, id, text_search) VALUES (?, ?, ?)').bind(p.rowid, p.id, ftsIndexText(p.text)))

  if (replace) del('passages_en_fts', p.rowid)
  if (p.text_en) out.push(env.DB.prepare('INSERT INTO passages_en_fts (rowid, id, text_en) VALUES (?, ?, ?)').bind(p.rowid, p.id, p.text_en))

  if (p.kind === 'ayah') {
    const extra = JSON.parse(p.extra || '{}') as { muyassar?: string; saadi?: string }
    const [, s, a] = p.id.split(':')
    const tafsir: [number, 'muyassar' | 'saadi', string | undefined][] = [
      [1, 'muyassar', extra.muyassar],
      [2, 'saadi', extra.saadi ? stripTags(extra.saadi) : undefined],
    ]
    for (const [n, src, text] of tafsir) {
      const rowid = p.rowid * 10 + n
      if (replace) del('tafsir_fts', rowid)
      if (text) {
        out.push(
          env.DB.prepare('INSERT INTO tafsir_fts (rowid, id, ayah_id, src, text_search) VALUES (?, ?, ?, ?, ?)').bind(
            rowid,
            `tafsir:${src}:${s}:${a}`,
            p.id,
            src,
            ftsIndexText(text),
          ),
        )
      }
    }
  }
  return out
}

// POST /api/admin/index  { records: Rec[] }  → upsert into D1 (passages + keyword indexes) and Vectorize.
export async function handleIndex(request: Request, env: Env): Promise<Response> {
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

  // UPSERT keeps the passage's rowid stable, so its keyword-index rows can be replaced by rowid.
  const upsert = env.DB.prepare(
    `INSERT INTO passages (${COLUMNS.join(', ')}, extra) VALUES (${COLUMNS.map(() => '?').join(', ')}, ?)
     ON CONFLICT(id) DO UPDATE SET ${[...COLUMNS.slice(1), 'extra'].map((c) => `${c} = excluded.${c}`).join(', ')}, indexed_at = datetime('now')`,
  )
  const extras = records.map((r) => {
    const extra: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(r)) if (!(COLUMNS as readonly string[]).includes(k)) extra[k] = v
    return JSON.stringify(extra)
  })
  const res1 = await env.DB.batch(records.map((r, i) => upsert.bind(...COLUMNS.map((c) => (r[c] ?? null) as string | number | null), extras[i])))

  const ids = records.map((r) => r.id)
  const rows = await env.DB.prepare(
    `SELECT rowid, id, kind, text, text_en, extra FROM passages WHERE id IN (${ids.map(() => '?').join(',')})`,
  )
    .bind(...ids)
    .all<SearchRow>()
  const res2 = await env.DB.batch(rows.results.flatMap((p) => searchRowStatements(env, p, true)))

  await env.VECTORIZE.upsert(records.map((r, i) => ({ id: r.id, values: vectors[i], metadata: { kind: r.kind, source: r.source } })))
  const m = sumMeta([...res1, rows, ...res2])
  return json({ ok: true, indexed: records.length, ...m })
}

// POST /api/admin/fts-rebuild  { reset: true } | { after: rowid, limit }
// Full rebuild of the keyword indexes from D1 itself: one wipe, then pages of passages by rowid.
export async function handleFtsRebuild(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { reset?: boolean; after?: number; limit?: number }
  if (body.reset) {
    const r = await env.DB.batch([
      env.DB.prepare('DELETE FROM passages_fts'),
      env.DB.prepare('DELETE FROM passages_en_fts'),
      env.DB.prepare('DELETE FROM tafsir_fts'),
    ])
    return json({ ok: true, reset: true, ...sumMeta(r) })
  }
  const after = Number(body.after ?? 0)
  const limit = Math.min(Math.max(Number(body.limit ?? 100), 1), 150)
  const page = await env.DB.prepare('SELECT rowid, id, kind, text, text_en, extra FROM passages WHERE rowid > ? ORDER BY rowid LIMIT ?')
    .bind(after, limit)
    .all<SearchRow>()
  if (!page.results.length) return json({ ok: true, done: true, next: after, ...sumMeta([page]) })
  const r = await env.DB.batch(page.results.flatMap((p) => searchRowStatements(env, p, false)))
  return json({ ok: true, done: false, count: page.results.length, next: page.results.at(-1)!.rowid, ...sumMeta([page, ...r]) })
}

// POST /api/admin/tafsir-vectors  { after: rowid, limit }  → al-Saadi chunk vectors into Vectorize.
export async function handleTafsirVectors(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as { after?: number; limit?: number }
  const after = Number(body.after ?? 0)
  const limit = Math.min(Math.max(Number(body.limit ?? 20), 1), 60)
  const page = await env.DB.prepare("SELECT rowid, id, extra FROM passages WHERE rowid > ? AND kind = 'ayah' ORDER BY rowid LIMIT ?")
    .bind(after, limit)
    .all<{ rowid: number; id: string; extra: string }>()
  if (!page.results.length) return json({ ok: true, done: true, next: after, ...sumMeta([page]) })

  const items: { id: string; text: string; ayah: string }[] = []
  for (const p of page.results) {
    const saadi = (JSON.parse(p.extra || '{}') as { saadi?: string }).saadi ?? ''
    const [, s, a] = p.id.split(':')
    chunkSaadi(saadi, cfg.saadiChunkChars).forEach((text, i) => items.push({ id: `tafsir:saadi:${s}:${a}:${i + 1}`, text, ayah: p.id }))
  }
  for (let i = 0; i < items.length; i += 40) {
    const batch = items.slice(i, i + 40)
    const vectors = await embed(env, batch.map((x) => x.text))
    await env.VECTORIZE.upsert(
      batch.map((x, j) => ({ id: x.id, values: vectors[j], metadata: { kind: 'tafsir', src: 'saadi', ayah: x.ayah } })),
    )
  }
  return json({ ok: true, done: false, ayat: page.results.length, chunks: items.length, next: page.results.at(-1)!.rowid, ...sumMeta([page]) })
}

// POST /api/admin/retrieve  { q, lang, mode }  → the same retrieve() the answer engine uses, plus refs.
export async function handleRetrieve(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { q?: string; lang?: Lang; mode?: Mode } | null
  const q = (body?.q ?? '').trim()
  if (!q || q.length > 500) return json({ ok: false, error: 'q must be 1..500 chars' }, 400)
  const result = await retrieve(env, q, body?.lang ?? 'ar', body?.mode === 'baseline' ? 'baseline' : 'new')
  const ids = result.ranked.slice(0, cfg.finalK).map((r) => r.id)
  const refs = ids.length
    ? await env.DB.prepare(`SELECT id, ref FROM passages WHERE id IN (${ids.map(() => '?').join(',')})`)
        .bind(...ids)
        .all<{ id: string; ref: string }>()
    : null
  return json({
    ok: true,
    ...result,
    refs: Object.fromEntries((refs?.results ?? []).map((r) => [r.id, r.ref])),
    rowsRead: result.rowsRead + (refs?.meta.rows_read ?? 0),
  })
}

export async function handleAdmin(request: Request, env: Env, path: string): Promise<Response | null> {
  if (!adminEnabled(env) || request.method !== 'POST') return null
  const routes: Record<string, (r: Request, e: Env) => Promise<Response>> = {
    '/api/admin/index': handleIndex,
    '/api/admin/fts-rebuild': handleFtsRebuild,
    '/api/admin/tafsir-vectors': handleTafsirVectors,
    '/api/admin/retrieve': handleRetrieve,
  }
  const handler = routes[path]
  if (!handler) return null
  if (!(await authorized(request, env))) return json({ ok: false, error: 'unauthorized' }, 401)
  return handler(request, env)
}

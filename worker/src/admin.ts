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
import { explainCheck, explainMessages, loadSource } from './explain'
import { askGeneral, callLlm, listModels } from './llm'
import { embed, retrieve, type Mode, type RetrieveOptions } from './retrieve'

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
  // Constant-time comparison (portable: Workers and Node), so the time taken does not reveal the token.
  const a = new TextEncoder().encode(got)
  const b = new TextEncoder().encode(want)
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
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
  const body = (await request.json().catch(() => null)) as { q?: string; lang?: Lang; mode?: Mode; opts?: RetrieveOptions } | null
  const q = (body?.q ?? '').trim()
  if (!q || q.length > 500) return json({ ok: false, error: 'q must be 1..500 chars' }, 400)
  const opts: RetrieveOptions = {
    ...(typeof body?.opts?.multiLexicon === 'boolean' ? { multiLexicon: body.opts.multiLexicon } : {}),
  }
  const result = await retrieve(env, q, body?.lang ?? 'ar', body?.mode === 'baseline' ? 'baseline' : 'new', opts)
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

// GET /api/admin/models → model ids only (go-live checks the configured model exists; the key stays in the Worker).
async function handleModels(_request: Request, env: Env): Promise<Response> {
  const r = await listModels(env)
  return json(r, r.ok ? 200 : 502)
}

// POST /api/admin/general { q } → a general-model answer with no passages (eval/compare-general.mjs only).
async function handleGeneral(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { q?: string } | null
  const q = (body?.q ?? '').trim()
  if (!q || q.length > 500) return json({ ok: false, error: 'q must be 1..500 chars' }, 400)
  const r = await askGeneral(env, q)
  return json(r, r.ok ? 200 : 502)
}

// POST /api/admin/llm-probe { model, format, reasoning_effort } → one short message to a Workers AI model
// (command 15, first connection). Returns status, latency and the reply's shape (field names and types, no values).
const PROBE_MODELS = ['@cf/deepseek-ai/deepseek-v4-flash-0731', '@cf/deepseek-ai/deepseek-v4-pro-0813']
function shapeOf(v: unknown, depth = 0): unknown {
  if (Array.isArray(v)) return v.length ? [shapeOf(v[0], depth + 1)] : []
  if (v && typeof v === 'object' && depth < 5) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shapeOf(x, depth + 1)]))
  return v === null ? 'null' : typeof v
}
async function handleLlmProbe(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => ({}))) as {
    model?: string
    format?: string
    reasoning_effort?: string
    max?: number
    sample?: boolean
    extra?: Record<string, unknown>
  }
  const model = body.model ?? PROBE_MODELS[0]
  if (!PROBE_MODELS.includes(model)) return json({ ok: false, error: 'model not allowed' }, 400)
  const input: Record<string, unknown> = {
    messages: [
      { role: 'system', content: 'Reply with a JSON object {"ok": true, "word": "<one Arabic word>"} and nothing else.' },
      { role: 'user', content: 'Say peace in Arabic.' },
    ],
    temperature: 0,
    max_completion_tokens: Math.min(Math.max(Number(body.max ?? 60), 1), 1000),
    ...(body.extra ?? {}),
  }
  if (body.reasoning_effort) input.reasoning_effort = body.reasoning_effort
  if (body.format === 'json_object') input.response_format = { type: 'json_object' }
  if (body.format === 'json_schema') {
    input.response_format = {
      type: 'json_schema',
      json_schema: { name: 'probe', strict: true, schema: { type: 'object', properties: { ok: { type: 'boolean' }, word: { type: 'string' } }, required: ['ok', 'word'], additionalProperties: false } },
    }
  }
  const t0 = Date.now()
  try {
    const out = (await (env.AI as unknown as { run: (m: string, i: unknown) => Promise<unknown> }).run(model, input)) as Record<string, unknown>
    const content =
      (out as { choices?: { message?: { content?: unknown } }[] }).choices?.[0]?.message?.content ?? (out as { response?: unknown }).response
    let contentIsJson = false
    if (typeof content === 'string') {
      try {
        JSON.parse(content)
        contentIsJson = true
      } catch {
        /* not JSON */
      }
    } else if (content && typeof content === 'object') contentIsJson = true
    const choice = (out as { choices?: { finish_reason?: string; message?: { reasoning_content?: string } }[] }).choices?.[0]
    // sample: the first characters of the reply (the probe question is fixed and harmless), to see where the text lands.
    const sample = body.sample
      ? { content: typeof content === 'string' ? content.slice(0, 300) : content, reasoning: choice?.message?.reasoning_content?.slice(0, 300) ?? null }
      : undefined
    return json({
      ok: true,
      model,
      ms: Date.now() - t0,
      shape: shapeOf(out),
      contentType: typeof content,
      contentChars: typeof content === 'string' ? content.length : null,
      reasoningChars: choice?.message?.reasoning_content?.length ?? 0,
      finish: choice?.finish_reason ?? null,
      contentIsJson,
      usage: (out as { usage?: unknown }).usage ?? null,
      sample,
    })
  } catch (e) {
    return json({ ok: false, model, ms: Date.now() - t0, error: String(e instanceof Error ? `${e.name}: ${e.message}` : e) }, 502)
  }
}

// POST /api/admin/explain-sample { id, lang } → the «بسّط لي» explanation the live route would make now, with the
// guard's verdict; nothing is read from or written to explain_cache (measurement on a preview, reply 0020).
async function handleExplainSample(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { id?: string; lang?: string } | null
  const id = String(body?.id ?? '')
  const lang = String(body?.lang ?? '')
  const source = await loadSource(env, id)
  if (!source) return json({ ok: false, error: 'not_found' }, 404)
  const r = await callLlm(env, explainMessages(source, lang), [id])
  const text = (r.raw as { text?: unknown } | null)?.text ?? null
  const rejected = r.raw === null ? `llm_failed: ${r.error ?? 'unknown'}` : explainCheck(text, source.protectedTexts, { lang, ayahEn: source.ayahEn })
  return json({ ok: true, id, lang, text, rejected, usage: r.usage, mode: r.mode })
}

export async function handleAdmin(request: Request, env: Env, path: string): Promise<Response | null> {
  if (!adminEnabled(env)) return null
  if (request.method === 'GET' && path === '/api/admin/models') {
    if (!(await authorized(request, env))) return json({ ok: false, error: 'unauthorized' }, 401)
    return handleModels(request, env)
  }
  if (request.method !== 'POST') return null
  const routes: Record<string, (r: Request, e: Env) => Promise<Response>> = {
    '/api/admin/index': handleIndex,
    '/api/admin/fts-rebuild': handleFtsRebuild,
    '/api/admin/tafsir-vectors': handleTafsirVectors,
    '/api/admin/retrieve': handleRetrieve,
    '/api/admin/general': handleGeneral,
    '/api/admin/llm-probe': handleLlmProbe,
    '/api/admin/explain-sample': handleExplainSample,
  }
  const handler = routes[path]
  if (!handler) return null
  if (!(await authorized(request, env))) return json({ ok: false, error: 'unauthorized' }, 401)
  return handler(request, env)
}

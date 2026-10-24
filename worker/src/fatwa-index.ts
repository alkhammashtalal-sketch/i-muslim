// The fatwas' search (fix «fatwa-ref», src/fatwa.ts; reply 0072 item 13), an admin route behind ADMIN_ENABLED and the
// token, run on env v11 (scripts/index/fatwa-index.mjs):
//   POST /api/admin/fatwa-index  { ids }  → each general fatwa's keyword row (its title and question) and its vector
// Each is built here from its own row in `fatwas` (D1, by primary key), loaded before from data/processed/fatwas.jsonl;
// nothing of the text is sent from outside. Only the general ones (general = 1) are searched. The vector is the
// fatwa's QUESTION (bge-m3), in imuslim-v11-fatwas (VECTORIZE_FATWA); the keyword row is by the row's rowid.
import type { Env } from './index'
import { ftsIndexText } from './lib/normalize'
import { embed } from './retrieve'

const MAX_IDS = 20
const ID = /^fatwa:(binbaz|binothaimeen):[0-9a-f-]{1,40}$/
/** The question embedded, within this length (bge-m3 takes far more; a fatwa's question is rarely past it). */
const EMBED_MAX = 2000

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

type Meta = { meta: { rows_read?: number; rows_written?: number } }
const sum = (rs: Meta[]) =>
  rs.reduce((m, r) => ({ rows_read: m.rows_read + (r.meta.rows_read ?? 0), rows_written: m.rows_written + (r.meta.rows_written ?? 0) }), { rows_read: 0, rows_written: 0 })

export async function handleFatwaIndex(request: Request, env: Env): Promise<Response> {
  if (!env.VECTORIZE_FATWA) return json({ ok: false, error: 'no VECTORIZE_FATWA binding (env v11 only)' }, 400)
  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null
  const ids = Array.isArray(body?.ids) ? [...new Set(body.ids.map(String))] : []
  if (!ids.length || ids.length > MAX_IDS || ids.some((i) => !ID.test(i))) return json({ ok: false, error: `ids must be 1..${MAX_IDS} fatwa ids` }, 400)
  const rows = await env.DB.prepare(`SELECT rowid, id, site, topic, title, question FROM fatwas WHERE id IN (${ids.map(() => '?').join(',')}) AND general = 1`)
    .bind(...ids)
    .all<{ rowid: number; id: string; site: string; topic: string; title: string; question: string }>()
  const found = rows.results
  const skipped = ids.filter((i) => !found.some((r) => r.id === i))
  if (!found.length) return json({ ok: true, indexed: 0, skipped, ...sum([rows]) })
  const w = await env.DB.batch(
    found.flatMap((r) => [
      env.DB.prepare('DELETE FROM fatwa_fts WHERE rowid = ?').bind(r.rowid),
      env.DB.prepare('INSERT INTO fatwa_fts (rowid, id, text_search) VALUES (?, ?, ?)').bind(r.rowid, r.id, ftsIndexText(`${r.title}\n${r.question}`)),
    ]),
  )
  const vectors = await embed(env, found.map((r) => r.question.slice(0, EMBED_MAX)))
  await env.VECTORIZE_FATWA.upsert(found.map((r, j) => ({ id: r.id, values: vectors[j], metadata: { site: r.site, topic: r.topic } })))
  return json({ ok: true, indexed: found.length, skipped, ...sum([rows, ...w]) })
}

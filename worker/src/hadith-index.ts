// Hadiths for the answers (reply 0048; 0047-report §5 أ), two admin routes behind ADMIN_ENABLED and the token, run on a
// `wrangler dev --remote --env next` preview (scripts/index/hadith-index.mjs):
//   POST /api/admin/hadith-index        { ids }  → the passages, their keyword rows and their vectors
//   POST /api/admin/hadith-grade-index  { ids }  → the rows «هل حديث كذا صحيح؟» searches (every grade)
// Each hadith is built here from its Arabic row in `hadiths` (D1, by primary key), so the passage is the text the hadith
// page shows, byte for byte; nothing of the text is sent from outside. Only HadeethEnc's sahih and hasan marfu' rows
// (class 'sahih' or 'hasan', not mawquf) become passages: «مقبول», the mawquf and the weak never do (reply 0048).
import type { Env } from './index'
import { chunkSaadi } from './lib/chunk'
import { ftsIndexText } from './lib/normalize'
import { embed } from './retrieve'
import { hadithUrl } from './hadith'

const MAX_IDS = 20
const ID = /^\d{1,7}$/
/** The explanation is cut like al-Saadi (800 characters at paragraph, then sentence, boundaries). */
const EXPLANATION_CHUNK = 800
/** A hadith's own vector: its title and text, then HadeethEnc's English translation, within this length. */
const EMBED_MAX = 4000
const EMBED_BATCH_CHARS = 30_000

export const HADITH_PREFIX = 'hadith:'
export const HADITH_EX_PREFIX = 'hadithex:'
/** The passage of a hadith, and of an explanation chunk's vector, by HadeethEnc id. */
export const hadithPassageId = (id: string) => `${HADITH_PREFIX}${id}`

type Row = {
  rowid: number
  id: string
  lang: string
  title: string | null
  text: string
  attribution: string | null
  grade: string | null
  explanation: string | null
  class: string
  tier: string
  version: string | null
  mawquf?: number | boolean | null
}

/** Whether a HadeethEnc row may be a passage of the answers (reply 0048: marfu' sahih and hasan only). */
export const isRetrievable = (r: Pick<Row, 'class' | 'tier' | 'mawquf'>) =>
  (r.class === 'sahih' || r.class === 'hasan') && ['1', '2', '3'].includes(r.tier) && !r.mawquf

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } })

type Meta = { meta: { rows_read?: number; rows_written?: number } }
const sum = (rs: Meta[]) =>
  rs.reduce((m, r) => ({ rows_read: m.rows_read + (r.meta.rows_read ?? 0), rows_written: m.rows_written + (r.meta.rows_written ?? 0) }), { rows_read: 0, rows_written: 0 })

async function readIds(request: Request): Promise<string[] | Response> {
  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null
  const ids = Array.isArray(body?.ids) ? body.ids.map(String) : []
  if (!ids.length || ids.length > MAX_IDS || ids.some((i) => !ID.test(i))) return json({ ok: false, error: `ids must be 1..${MAX_IDS} HadeethEnc ids` }, 400)
  return [...new Set(ids)]
}

/** Rows of one language by primary key (id, lang). */
async function rowsOf(env: Env, ids: string[], lang: string) {
  return env.DB.prepare(`SELECT rowid, * FROM hadiths WHERE lang = ? AND id IN (${ids.map(() => '?').join(',')})`)
    .bind(lang, ...ids)
    .all<Row>()
}

export async function handleHadithIndex(request: Request, env: Env): Promise<Response> {
  if (!env.VECTORIZE_HADITH) return json({ ok: false, error: 'no VECTORIZE_HADITH binding (env next only)' }, 400)
  const ids = await readIds(request)
  if (ids instanceof Response) return ids
  const [ar, en] = await Promise.all([rowsOf(env, ids, 'ar'), rowsOf(env, ids, 'en')])
  const english = new Map(en.results.map((r) => [r.id, r]))
  const rows = ar.results.filter(isRetrievable)
  const skipped = ids.filter((i) => !rows.some((r) => r.id === i))
  if (!rows.length) return json({ ok: true, indexed: 0, chunks: 0, skipped, ...sum([ar, en]) })

  // The passage, as stored: text, takhrij as its reference, the HadeethEnc page; the rest in extra.
  const passages = rows.map((r) => {
    const tr = english.get(r.id)
    const head = [r.title, r.text].filter(Boolean).join('\n')
    return {
      id: hadithPassageId(r.id),
      source: 'hadeethenc',
      kind: 'hadith',
      ref: r.attribution?.trim() || 'موسوعة الأحاديث النبوية',
      url: hadithUrl(r.id, 'ar'),
      text: r.text,
      text_en: tr?.text ?? null,
      text_search: ftsIndexText(head),
      embed_text: [head, tr?.text].filter(Boolean).join('\n').slice(0, EMBED_MAX),
      extra: JSON.stringify({ hadith: r.id, grade: r.grade, attribution: r.attribution, title: r.title, class: r.class, tier: r.tier, version: r.version }),
    }
  })
  const upsert = env.DB.prepare(
    `INSERT INTO passages (id, source, kind, ref, url, text, text_en, text_search, embed_text, extra) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET source = excluded.source, kind = excluded.kind, ref = excluded.ref, url = excluded.url, text = excluded.text,
       text_en = excluded.text_en, text_search = excluded.text_search, embed_text = excluded.embed_text, extra = excluded.extra, indexed_at = datetime('now')`,
  )
  const w1 = await env.DB.batch(passages.map((p) => upsert.bind(p.id, p.source, p.kind, p.ref, p.url, p.text, p.text_en, p.text_search, p.embed_text, p.extra)))
  // Their keyword rows, by the passage's rowid (an upsert keeps it).
  const back = await env.DB.prepare(`SELECT rowid, id, text_search, text_en FROM passages WHERE id IN (${passages.map(() => '?').join(',')})`)
    .bind(...passages.map((p) => p.id))
    .all<{ rowid: number; id: string; text_search: string; text_en: string | null }>()
  const w2 = await env.DB.batch(
    back.results.flatMap((p) => [
      env.DB.prepare('DELETE FROM hadith_fts WHERE rowid = ?').bind(p.rowid),
      env.DB.prepare('INSERT INTO hadith_fts (rowid, id, text_search) VALUES (?, ?, ?)').bind(p.rowid, p.id, p.text_search),
      env.DB.prepare('DELETE FROM hadith_en_fts WHERE rowid = ?').bind(p.rowid),
      ...(p.text_en ? [env.DB.prepare('INSERT INTO hadith_en_fts (rowid, id, text_en) VALUES (?, ?, ?)').bind(p.rowid, p.id, p.text_en)] : []),
    ]),
  )

  // Vectors: one for the hadith, and one for each part of its explanation, which points back to it.
  const items: { id: string; text: string; metadata: Record<string, string> }[] = []
  for (const p of passages) items.push({ id: p.id, text: p.embed_text, metadata: { kind: 'hadith', source: 'hadeethenc' } })
  for (const r of rows) {
    // Plain text with line breaks: the chunker reads paragraphs from <br>.
    chunkSaadi((r.explanation ?? '').replace(/\n+/g, '<br>'), EXPLANATION_CHUNK).forEach((text, i) =>
      items.push({ id: `${HADITH_EX_PREFIX}${r.id}:${i + 1}`, text, metadata: { kind: 'hadith_ex', hadith: hadithPassageId(r.id) } }),
    )
  }
  // bge-m3 takes 60,000 tokens a request, every text padded to the longest of the request: a batch is held to 40 texts
  // and (texts × the longest) ≤ EMBED_BATCH_CHARS, fully vowelled Arabic running about 1.5 tokens a character.
  const batches: (typeof items)[] = []
  for (const x of items) {
    const last = batches.at(-1)
    const longest = last ? Math.max(x.text.length, ...last.map((y) => y.text.length)) : 0
    if (last && last.length < 40 && (last.length + 1) * longest <= EMBED_BATCH_CHARS) last.push(x)
    else batches.push([x])
  }
  for (const batch of batches) {
    const vectors = await embed(env, batch.map((x) => x.text))
    await env.VECTORIZE_HADITH.upsert(batch.map((x, j) => ({ id: x.id, values: vectors[j], metadata: x.metadata })))
  }
  return json({ ok: true, indexed: rows.length, chunks: items.length - rows.length, skipped, ...sum([ar, en, ...w1, back, ...w2]) })
}

/** Every Arabic row whatever its class (the weak included: their grade is given as written, rule 10). */
export async function handleHadithGradeIndex(request: Request, env: Env): Promise<Response> {
  const ids = await readIds(request)
  if (ids instanceof Response) return ids
  const ar = await rowsOf(env, ids, 'ar')
  if (!ar.results.length) return json({ ok: true, indexed: 0, ...sum([ar]) })
  const w = await env.DB.batch(
    ar.results.flatMap((r) => [
      env.DB.prepare('DELETE FROM hadith_grade_fts WHERE rowid = ?').bind(r.rowid),
      env.DB.prepare('INSERT INTO hadith_grade_fts (rowid, id, text_search) VALUES (?, ?, ?)').bind(r.rowid, r.id, ftsIndexText(r.text)),
    ]),
  )
  return json({ ok: true, indexed: ar.results.length, ...sum([ar, ...w]) })
}

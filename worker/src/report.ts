// POST /api/report, two shapes under one daily limit per device (limits.reportsPerDay), never the IP:
//   { passageId, reason }        the answer card's report (SCREENS.md element 12): the passage id and the reason only,
//                                in the table reports.
//   { kind, loc?, note? }        «أبلغ عن خطأ» (reply 0033 §أ3) and the support form (part ج, kind 'support'): the type,
//                                the place when there is one (an ayah «2:255», a hadith number or a passage id; the
//                                language; the source's registry id and version), and an optional note of at most 500
//                                characters, in the table source_reports (migration 0014) with the Riyadh date only.
import type { ReportPlace, ReportReason, SourceReportKind } from '../../shared/api'
import limits from './config/limits.json'
import type { Env } from './index'
import { deviceKey, riyadhDay } from './lib/keys.ts'
import { SOURCE_IDS } from './sources'

const REASONS: ReportReason[] = ['text_mismatch', 'wrong_ref', 'bad_translation', 'other']
const KINDS: SourceReportKind[] = ['text', 'translation', 'explanation', 'other', 'support']
const ID_RE = /^[a-z]+(:[a-z0-9_-]+){1,4}$/
export const NOTE_MAX = 500

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

export type SourceReport = { kind: SourceReportKind; loc: ReportPlace | null; note: string | null }

/** The note as kept: control characters other than a line break removed, at most two line breaks in a row, trimmed. */
const cleanNote = (s: string) =>
  s
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

function validPlace(v: unknown): ReportPlace | null {
  if (!v || typeof v !== 'object') return null
  const { type, id, lang, source, version } = v as Record<string, unknown>
  if (typeof id !== 'string' || typeof lang !== 'string' || typeof source !== 'string') return null
  if (!/^[a-z]{2,3}$/.test(lang) || !SOURCE_IDS.has(source)) return null
  if (version !== undefined && version !== null && (typeof version !== 'string' || !/^v?\d{1,4}(\.\d{1,4}){0,3}$/.test(version))) return null
  if (type === 'ayah') {
    const m = id.match(/^(\d{1,3}):(\d{1,3})$/)
    if (!m || Number(m[1]) < 1 || Number(m[1]) > 114 || Number(m[2]) < 1 || Number(m[2]) > 286) return null
  } else if (type === 'hadith') {
    if (!/^[1-9]\d{0,6}$/.test(id)) return null
  } else if (type === 'passage') {
    if (id.length > 64 || !ID_RE.test(id)) return null
  } else return null
  return { type, id, lang, source, ...(typeof version === 'string' ? { version } : {}) }
}

/** The new shape, validated; null when anything is off (the whole report is refused, nothing is trimmed silently). */
export function parseSourceReport(body: unknown): SourceReport | null {
  if (!body || typeof body !== 'object') return null
  const { kind, loc, note } = body as Record<string, unknown>
  if (!KINDS.includes(kind as SourceReportKind)) return null
  let place: ReportPlace | null = null
  if (loc !== undefined && loc !== null) {
    place = validPlace(loc)
    if (!place) return null
  }
  let text: string | null = null
  if (note !== undefined && note !== null) {
    if (typeof note !== 'string') return null
    text = cleanNote(note)
    if ([...text].length > NOTE_MAX) return null
    if (!text) text = null
  }
  // A support message is its note; an error report needs a type, the note is optional.
  if (kind === 'support' && !text) return null
  return { kind: kind as SourceReportKind, loc: place, note: text }
}

/** True when the place exists in D1 (read by key). A missing table reads as «not found». */
async function placeExists(env: Env, loc: ReportPlace): Promise<boolean> {
  const q =
    loc.type === 'hadith'
      ? env.DB.prepare('SELECT 1 AS x FROM hadiths WHERE id = ? LIMIT 1').bind(loc.id)
      : env.DB.prepare('SELECT 1 AS x FROM passages WHERE id = ?').bind(loc.type === 'ayah' ? `quran:${loc.id}` : loc.id)
  return !!(await q.first<{ x: number }>().catch(() => null))
}

/** Counts one report against the device's daily limit; true when over it. */
async function overLimit(request: Request, env: Env, salt: string): Promise<boolean> {
  const day = riyadhDay()
  const key = `report:${await deviceKey(salt, request.headers.get('cf-connecting-ip') ?? 'unknown', day)}`
  const row = await env.DB.prepare(
    'INSERT INTO usage_daily (day, ip_hash, count) VALUES (?, ?, 1) ON CONFLICT(day, ip_hash) DO UPDATE SET count = count + 1 RETURNING count',
  )
    .bind(day, key)
    .first<{ count: number }>()
  return (row?.count ?? 1) > limits.reportsPerDay
}

export async function handleReport(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (body && typeof body === 'object' && 'kind' in body) return handleSourceReport(body, request, env)

  const passageId = typeof body?.passageId === 'string' ? body.passageId : ''
  const reason = body?.reason as ReportReason
  if (!REASONS.includes(reason) || passageId.length > 64 || !ID_RE.test(passageId)) {
    return json({ ok: false, error: 'bad_input' }, 400)
  }
  if (!env.IP_SALT) return json({ ok: false, error: 'server' }, 500)

  const exists = await env.DB.prepare('SELECT 1 AS x FROM passages WHERE id = ?').bind(passageId).first<{ x: number }>()
  if (!exists) return json({ ok: false, error: 'unknown_passage' }, 404)

  if (await overLimit(request, env, env.IP_SALT)) return json({ ok: false, error: 'rate_limited' }, 429)

  await env.DB.prepare('INSERT INTO reports (passage_id, reason) VALUES (?, ?)').bind(passageId, reason).run()
  return json({ ok: true })
}

async function handleSourceReport(body: unknown, request: Request, env: Env): Promise<Response> {
  const r = parseSourceReport(body)
  if (!r) return json({ ok: false, error: 'bad_input' }, 400)
  if (!env.IP_SALT) return json({ ok: false, error: 'server' }, 500)
  if (r.loc && !(await placeExists(env, r.loc))) return json({ ok: false, error: 'unknown_place' }, 404)
  if (await overLimit(request, env, env.IP_SALT)) return json({ ok: false, error: 'rate_limited' }, 429)
  await env.DB.prepare('INSERT INTO source_reports (day, kind, ref_type, ref_id, lang, source, version, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(riyadhDay(), r.kind, r.loc?.type ?? null, r.loc?.id ?? null, r.loc?.lang ?? null, r.loc?.source ?? null, r.loc?.version ?? null, r.note)
    .run()
  return json({ ok: true })
}

// POST /api/ask — CLAUDE.md §5 «مسار السؤال», §3 rules 1–12.
// Religious text in a reply always comes from D1 by id. Neither the question nor the IP is stored or logged.
import type {
  AbstainResponse,
  AnswerResponse,
  AskResponse,
  ErrorResponse,
  Lang,
  Quote,
  ReferralResponse,
  Sentence,
} from '../../shared/api'
import ar from '../../web/src/i18n/ar'
import bn from '../../web/src/i18n/bn'
import en from '../../web/src/i18n/en'
import es from '../../web/src/i18n/es'
import fr from '../../web/src/i18n/fr'
import hi from '../../web/src/i18n/hi'
import id from '../../web/src/i18n/id'
import ms from '../../web/src/i18n/ms'
import tr from '../../web/src/i18n/tr'
import ur from '../../web/src/i18n/ur'
import { authorized } from './admin'
import disputedTopics from './config/disputed-topics.json'
import gateConfig from './config/gate.json'
import limits from './config/limits.json'
import messages from './config/messages.json'
import { gate, isDisputedTopic, type GateRule } from './gate'
import type { Env } from './index'
import { deviceKey, riyadhDay, riyadhMonth, sameBytes, sha256Hex } from './lib/keys.ts'
import { stripTags, tokenize } from './lib/normalize.ts'
import { callLlm, llmMode } from './llm'
import { MUYASSAR_NAME, MUYASSAR_URL, SAADI_NAME } from './passage'
import { systemPrompt, userPrompt, type PromptPassage } from './prompt'
import { retrieve } from './retrieve'
import { verify } from './verify'

export const ALIFTA_URL = 'https://www.alifta.gov.sa'
const LANGS: Lang[] = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']
const UI = { ar, en, ur, id, ms, tr, fr, es, bn, hi }
const DISPUTED = messages.disputed as Record<Lang, string>

export type AskDeps = { retrieve: typeof retrieve; callLlm: typeof callLlm }
const DEFAULT_DEPS: AskDeps = { retrieve, callLlm }

type Row = { id: string; kind: string; ref: string; url: string; text: string; text_en: string | null; extra: string }
/** What the cache and the FAQ store: ids, hashes of the texts used, and the generated sentences. Never quote text. */
type Plan = {
  v: 1
  level: 'A' | 'B'
  ids: string[]
  hashes: Record<string, string>
  direct: Sentence
  explanation: Sentence[]
  considered: string[]
}

const json = (data: AskResponse | { ok: boolean }, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

const explainModeOf = (env: Env): 'generated' | 'tafsir_only' => (env.EXPLAIN_MODE === 'tafsir_only' ? 'tafsir_only' : 'generated')

function error(lang: Lang, code: ErrorResponse['code']): Response {
  const t = UI[lang]
  const message = { rate_limited: t.errRateLimited, monthly_cap: t.errMonthlyCap, bad_input: t.errBadInput, server: t.errServer }[code]
  const status = { rate_limited: 429, monthly_cap: 503, bad_input: 400, server: 500 }[code]
  return json({ type: 'error', code, message }, status)
}
const referral = (lang: Lang, level: 'C' | 'D'): ReferralResponse => ({
  type: 'referral',
  level,
  message: UI[lang].referralTitle,
  link: ALIFTA_URL,
})
const abstain = (lang: Lang): AbstainResponse => ({ type: 'abstain', message: UI[lang].abstainBody, link: ALIFTA_URL })

async function loadRows(env: Env, ids: string[]): Promise<Map<string, Row>> {
  if (!ids.length) return new Map()
  const { results } = await env.DB.prepare(
    `SELECT id, kind, ref, url, text, text_en, extra FROM passages WHERE id IN (${ids.map(() => '?').join(',')})`,
  )
    .bind(...ids)
    .all<Row>()
  return new Map(results.map((r) => [r.id, r]))
}

const extraOf = (r: Row) => JSON.parse(r.extra || '{}') as { muyassar?: string; saadi?: string; grade?: string }

/** A quote built from D1. `verified` = displayed text equals D1 byte for byte, and equals the text the answer was built on. */
async function quoteOf(r: Row, expectedHash?: string): Promise<Quote> {
  const text = r.text
  const sameAsBuilt = expectedHash ? (await sha256Hex(r.text)) === expectedHash : true
  const e = extraOf(r)
  return {
    id: r.id,
    kind: r.kind as Quote['kind'],
    text,
    ...(r.text_en ? { text_en: r.text_en } : {}),
    ref: r.ref,
    url: r.url,
    verified: sameBytes(text, r.text) && sameAsBuilt,
    ...(e.grade ? { grade: e.grade } : {}),
    ...(r.kind === 'ayah' && e.muyassar ? { tafsirExcerpt: e.muyassar } : {}),
  }
}

async function card(env: Env, plan: Plan, lang: Lang, fromCache: boolean, reviewed?: { by: string; at: string }): Promise<AnswerResponse | null> {
  const rows = await loadRows(env, plan.ids)
  if (plan.ids.some((i) => !rows.has(i))) return null
  const quotes = await Promise.all(plan.ids.map((i) => quoteOf(rows.get(i)!, plan.hashes[i])))
  if (quotes.some((q) => !q.verified)) return null
  const tafsir = quotes
    .filter((q) => q.kind === 'ayah')
    .flatMap((q) => [
      { name: MUYASSAR_NAME, ref: `${MUYASSAR_NAME} – ${q.ref}`, url: MUYASSAR_URL },
      { name: SAADI_NAME, ref: `${SAADI_NAME} – ${q.ref}`, url: q.url },
    ])
  return {
    type: 'answer',
    level: plan.level,
    direct: plan.direct,
    quotes,
    explanation: plan.explanation,
    ...(tafsir.length ? { tafsir } : {}),
    machineTranslated: lang !== 'ar' && lang !== 'en',
    ...(reviewed ? { reviewed } : {}),
    fromCache,
    considered: plan.considered,
  }
}

async function disputedReferral(env: Env, lang: Lang, ids: string[]): Promise<ReferralResponse> {
  const rows = await loadRows(env, ids)
  const quotes = await Promise.all(ids.filter((i) => rows.has(i)).map((i) => quoteOf(rows.get(i)!)))
  return { type: 'referral', level: 'C', message: DISPUTED[lang], link: ALIFTA_URL, disputed: true, quotes }
}

/** Count one request against a per-device daily counter; returns the new count. */
export async function bump(env: Env, salt: string, ip: string, scope: string): Promise<number> {
  const day = riyadhDay()
  const key = `${scope}:${await deviceKey(salt, ip, day)}`
  const row = await env.DB.prepare(
    'INSERT INTO usage_daily (day, ip_hash, count) VALUES (?, ?, 1) ON CONFLICT(day, ip_hash) DO UPDATE SET count = count + 1 RETURNING count',
  )
    .bind(day, key)
    .first<{ count: number }>()
  return row?.count ?? 1
}

export async function handleAsk(request: Request, env: Env, deps: AskDeps = DEFAULT_DEPS): Promise<Response> {
  // 1. Input.
  const body = (await request.json().catch(() => null)) as { q?: unknown; lang?: unknown; simple?: unknown } | null
  const lang: Lang = LANGS.includes(body?.lang as Lang) ? (body!.lang as Lang) : 'ar'
  const q = typeof body?.q === 'string' ? body.q.trim() : ''
  const simple = body?.simple === true
  if (!q || q.length > limits.maxQuestionChars) return error(lang, 'bad_input')

  // 1b. Daily limit per device (the evaluation runner may skip it only while the admin routes are open).
  if (!env.IP_SALT) return error(lang, 'server')
  const isEval = env.ADMIN_ENABLED === 'true' && (await authorized(request, env))
  if (!isEval) {
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown'
    if ((await bump(env, env.IP_SALT, ip, 'ask')) > limits.dailyPerDevice) return error(lang, 'rate_limited')
  }

  // 2. Normalized copy, for search keys only.
  const nq = tokenize(q).join(' ')
  if (!nq) return error(lang, 'bad_input')

  // 3. Level gate (no model). C and D never reach the cache or the model.
  const g = gate(q, gateConfig.rules as GateRule[])
  if (g) return json(referral(lang, g.level))

  const explainMode = explainModeOf(env)

  // Rule 11: a topic the Sharia reviewer listed as disputed → the texts with references, nothing generated.
  if (isDisputedTopic(q, disputedTopics.topics as string[])) {
    const r = await deps.retrieve(env, q, lang)
    return json(await disputedReferral(env, lang, r.ranked.slice(0, 5).map((x) => x.id)))
  }

  // 4. Cache (A/B only), then approved FAQ.
  // The model mode is part of the key, so answers made in mock mode are never served once live mode is on.
  const cacheKey = await sha256Hex(`${nq}|${lang}|${simple ? 1 : 0}|${explainMode}|${llmMode(env)}`)
  const cached = await env.DB.prepare('SELECT answer FROM cache WHERE key = ?').bind(cacheKey).first<{ answer: string }>()
  if (cached) {
    const c = await card(env, JSON.parse(cached.answer) as Plan, lang, true)
    if (c) {
      await env.DB.prepare('UPDATE cache SET hits = hits + 1 WHERE key = ?').bind(cacheKey).run()
      return json(c)
    }
    await env.DB.prepare('DELETE FROM cache WHERE key = ?').bind(cacheKey).run()
  }
  const faq = await env.DB.prepare(
    'SELECT answer, approved_by, approved_at FROM faq WHERE question_key = ? AND lang = ? AND approved_by IS NOT NULL AND approved_at IS NOT NULL',
  )
    .bind(await sha256Hex(nq), lang)
    .first<{ answer: string; approved_by: string; approved_at: string }>()
  if (faq) {
    const c = await card(env, JSON.parse(faq.answer) as Plan, lang, false, { by: faq.approved_by, at: faq.approved_at })
    if (c) return json(c)
  }

  // 5. Retrieval; below the threshold → apology without calling the model.
  const r = await deps.retrieve(env, q, lang)
  if (r.abstain || r.passages.length === 0) return json(abstain(lang))
  const considered = r.passages.map((p) => p.id)

  // 8. Global monthly cap: model calls stop; cache and FAQ above keep working.
  const usage = await env.DB.prepare('SELECT llm_calls FROM usage_monthly WHERE month = ?').bind(riyadhMonth()).first<{ llm_calls: number }>()
  if ((usage?.llm_calls ?? 0) >= limits.monthlyLlmCalls) return error(lang, 'monthly_cap')

  // 6. One model call.
  const rows = await loadRows(env, considered)
  const sent = considered.filter((i) => rows.has(i))
  const passages: PromptPassage[] = sent.map((i) => {
    const row = rows.get(i)!
    const e = extraOf(row)
    return {
      id: row.id,
      kind: row.kind,
      ref: row.ref,
      text: row.text,
      textEn: row.text_en,
      ...(e.muyassar ? { muyassar: e.muyassar } : {}),
      ...(e.saadi ? { saadi: stripTags(e.saadi) } : {}),
    }
  })
  const result = await deps.callLlm(
    env,
    [
      { role: 'system', content: systemPrompt(lang, simple, explainMode) },
      { role: 'user', content: userPrompt(q, passages) },
    ],
    sent,
  )
  if (result.raw === null) {
    console.log(JSON.stringify({ evt: 'llm_failed', code: result.error ?? 'unknown' }))
    return json(abstain(lang))
  }

  // 7. Verify, build the card from D1, cache A/B.
  const sacred = Object.fromEntries(sent.filter((i) => ['ayah', 'hadith'].includes(rows.get(i)!.kind)).map((i) => [i, rows.get(i)!.text]))
  const v = verify(result.raw, sent, sacred, explainMode)
  if (v.kind === 'abstain') return json(abstain(lang))
  if (v.kind === 'referral') return json(v.disputed ? await disputedReferral(env, lang, sent) : referral(lang, v.level))

  const hashes = Object.fromEntries(await Promise.all(v.ids.map(async (i) => [i, await sha256Hex(rows.get(i)!.text)] as const)))
  const plan: Plan = { v: 1, level: v.level, ids: v.ids, hashes, direct: v.direct, explanation: v.explanation, considered }
  const c = await card(env, plan, lang, false)
  if (!c) return json(abstain(lang))
  await env.DB.prepare('INSERT OR REPLACE INTO cache (key, lang, level, answer) VALUES (?, ?, ?, ?)')
    .bind(cacheKey, lang, v.level.toLowerCase(), JSON.stringify(plan))
    .run()
  return json(c)
}

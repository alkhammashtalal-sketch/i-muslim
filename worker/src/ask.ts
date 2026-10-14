// POST /api/ask — CLAUDE.md §5 «مسار السؤال», §3 rules 1–12.
// Religious text in a reply always comes from D1 by id. Neither the question nor the IP is stored or logged.
import type {
  AbstainResponse,
  ExplainMode,
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
import llmConfig from './config/llm.json'
import messages from './config/messages.json'
import { gate, isDisputedTopic, type GateRule } from './gate'
import type { Env } from './index'
import { sameBytes, sha256Hex } from './lib/keys.ts'
import { stripTags, tokenize } from './lib/normalize.ts'
import { bump, newCallRefusal } from './limits'
import { callLlm, defaultSettings, llmMode, type LlmResult, type LlmSettings } from './llm'
import { meaningLang, meaningsOf } from './meaning'
import { MUYASSAR_NAME, MUYASSAR_URL, SAADI_NAME } from './passage'
import { systemPrompt, userPrompt, type PromptPassage } from './prompt'
import { findQuoted, gradeAnswer, gradeQuestionOf } from './hadith-grade'
import { hadithRetrievalOn, retrieve } from './retrieve'
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
  direct?: Sentence
  explanation: Sentence[]
  considered: string[]
  mode?: ExplainMode
  answerLang?: string // decided by the model from the question; the question is part of the cache key, so it is stable per key
}

const json = (data: AskResponse | { ok: boolean }, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

const EXPLAIN_MODES: ExplainMode[] = ['on_demand', 'generated', 'tafsir_only']
// Rule 12: on_demand is the default (also when the variable is missing or unknown).
/** Raise with every change to retrieval, the lexicons, the prompt or the model settings: cached answers made
 *  before it are no longer served (they stay in the table, unread). 2: live model and the «أركان الإسلام» fix. 3: the levels A and B defined (reply 0028). */
export const CACHE_VERSION = 3
/** With HADITH_RETRIEVAL on (reply 0048), a key of its own: answers made without the hadiths are not served with them,
 *  and those made with them not without (switching off again finds version 3's as they were). 5: the first two seats
 *  for the ayat and the creed passages (0048-add4 ب), so the answers measured before them are not served. */
export const CACHE_VERSION_HADITH = 5
/** The grade answers' own keys (0048-add7): raised with a change in how a grade question is read or answered. */
export const CACHE_VERSION_GRADE = 1
/** «هل حديث كذا صحيح؟» (0048-add7): env.HADITH_GRADE === 'on', apart from HADITH_RETRIEVAL. */
export const hadithGradeOn = (env: Env, override?: boolean) => override ?? env.HADITH_GRADE === 'on'

const explainModeOf = (env: Env): ExplainMode => (EXPLAIN_MODES.includes(env.EXPLAIN_MODE as ExplainMode) ? (env.EXPLAIN_MODE as ExplainMode) : 'on_demand')

function error(lang: Lang, code: ErrorResponse['code']): Response {
  const t = UI[lang]
  const message = {
    rate_limited: t.errRateLimited,
    answers_limited: t.errAnswersLimited,
    burst: t.errBurst,
    monthly_cap: t.errMonthlyCap,
    bad_input: t.errBadInput,
    server: t.errServer,
  }[code]
  const status = { rate_limited: 429, answers_limited: 429, burst: 429, monthly_cap: 503, bad_input: 400, server: 500 }[code]
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

const extraOf = (r: Row) =>
  JSON.parse(r.extra || '{}') as {
    muyassar?: string
    saadi?: string
    grade?: string
    // A HadeethEnc hadith (reply 0048, worker/src/hadith-index.ts): its own fields as stored.
    hadith?: string
    attribution?: string | null
    title?: string | null
    class?: string
    tier?: string
  }

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
    ...(r.kind === 'hadith' && e.hadith
      ? { hadith: { id: e.hadith, class: e.class ?? '', tier: e.tier ?? '', attribution: e.attribution ?? null, title: e.title ?? null } }
      : {}),
  }
}

/** The order of the sources by their strength (V2_UI_SPEC §7.1, reply 0048): the Quran, then the sahih and hasan
 *  hadith by tier, then the rest, each in the model's order. Without a hadith the order stays the model's own. */
function bySourceStrength(quotes: Quote[]): Quote[] {
  if (!quotes.some((q) => q.kind === 'hadith')) return quotes
  const rank = (q: Quote) => (q.kind === 'ayah' ? 0 : q.kind === 'hadith' ? 1 + Number(q.hadith?.tier || 3) / 10 : 2)
  return quotes.map((q, i) => ({ q, i })).sort((a, b) => rank(a.q) - rank(b.q) || a.i - b.i).map((x) => x.q)
}

async function card(env: Env, plan: Plan, lang: Lang, fromCache: boolean, reviewed?: { at: string }, ml: string = lang): Promise<AnswerResponse | null> {
  const rows = await loadRows(env, plan.ids)
  if (plan.ids.some((i) => !rows.has(i))) return null
  const quotes = bySourceStrength(await Promise.all(plan.ids.map((i) => quoteOf(rows.get(i)!, plan.hashes[i]))))
  if (quotes.some((q) => !q.verified)) return null
  // The meaning in the reader's language (command 22): read from D1 when the card is built, like text_en, so cached
  // answers (which keep ids and hashes only) get it too. In the reader's content language when it differs from the
  // interface language (reply 0033 §أ1: Persian content with an English interface), which the cache key does not hold.
  const meanings = await meaningsOf(env, quotes.filter((q) => q.kind === 'ayah').map((q) => q.id), ml)
  for (const q of quotes) if (meanings.has(q.id)) q.meaning = meanings.get(q.id)
  const tafsir = quotes
    .filter((q) => q.kind === 'ayah')
    .flatMap((q) => [
      { name: MUYASSAR_NAME, ref: `${MUYASSAR_NAME} – ${q.ref}`, url: MUYASSAR_URL },
      { name: SAADI_NAME, ref: `${SAADI_NAME} – ${q.ref}`, url: q.url },
    ])
  return {
    type: 'answer',
    level: plan.level,
    ...(plan.direct ? { direct: plan.direct } : {}),
    quotes,
    explanation: plan.explanation,
    ...(tafsir.length ? { tafsir } : {}),
    machineTranslated: !['ar', 'en'].includes((plan.answerLang ?? lang).split('-')[0].toLowerCase()),
    answer_lang: plan.answerLang ?? lang,
    ...(reviewed ? { reviewed } : {}),
    fromCache,
    considered: plan.considered,
    explain_mode: plan.mode ?? 'generated',
  }
}

async function disputedReferral(env: Env, lang: Lang, ids: string[], ml: string = lang): Promise<ReferralResponse> {
  const rows = await loadRows(env, ids)
  const quotes = await Promise.all(ids.filter((i) => rows.has(i)).map((i) => quoteOf(rows.get(i)!)))
  const meanings = await meaningsOf(env, quotes.filter((q) => q.kind === 'ayah').map((q) => q.id), ml)
  for (const q of quotes) if (meanings.has(q.id)) q.meaning = meanings.get(q.id)
  return { type: 'referral', level: 'C', message: DISPUTED[lang], link: ALIFTA_URL, disputed: true, quotes }
}

// The per-device daily counter lives in limits.ts with the other limits; kept importable from here.
export { bump }

export async function handleAsk(request: Request, env: Env, deps: AskDeps = DEFAULT_DEPS): Promise<Response> {
  // 1. Input.
  const body = (await request.json().catch(() => null)) as {
    q?: unknown
    lang?: unknown
    simple?: unknown
    explain_mode?: unknown
    ml?: unknown
    hadith?: unknown; grade?: unknown
    llm?: { model?: unknown; reasoning_effort?: unknown; thinking?: unknown; max_tokens?: unknown }
  } | null
  const lang: Lang = LANGS.includes(body?.lang as Lang) ? (body!.lang as Lang) : 'ar'
  // The ayat's meanings in the reader's content language (reply 0033 §أ1), when it is a served translation; the
  // answer itself stays in the interface language.
  const ml = meaningLang(typeof body?.ml === 'string' ? body.ml : null) ?? lang
  const q = typeof body?.q === 'string' ? body.q.trim() : ''
  const simple = body?.simple === true
  if (!q || q.length > limits.maxQuestionChars) return error(lang, 'bad_input')

  // 1b. Daily limit per device on every request (the evaluation runner may skip it only while the admin routes are open).
  if (!env.IP_SALT) return error(lang, 'server')
  const isEval = env.ADMIN_ENABLED === 'true' && (await authorized(request, env))
  if (!isEval) {
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown'
    if ((await bump(env, env.IP_SALT, ip, 'ask')) > limits.dailyPerDevice) return error(lang, 'rate_limited')
  }

  // 2. Normalized copy, for search keys only.
  const nq = tokenize(q).join(' ')
  if (!nq) return error(lang, 'bad_input')

  // HadeethEnc's hadiths (reply 0048): env.HADITH_RETRIEVAL; the evaluation runner may turn them on for its own
  // requests only (admin routes open, with the token), to measure before the switch.
  const withHadith = hadithRetrievalOn(env, isEval && typeof body?.hadith === 'boolean' ? body.hadith : undefined)

  // 2b. «هل حديث كذا صحيح؟» (CLAUDE.md §9, Talal 14 October 09:25): HadeethEnc's grade as written, or a referral;
  // before the gate, since a hadith's own words may hold a gate phrase. No model. Its own switch, HADITH_GRADE
  // (0048-add7), apart from the hadiths in the answers; the evaluation runner may turn it on for its own requests.
  // Its own cache keys (grade|…), so a grade answer is never served as an answer, nor one as the other; a referral is
  // not kept (C is never cached, rule 8).
  const withGrade = hadithGradeOn(env, isEval && typeof body?.grade === 'boolean' ? body.grade : undefined)
  if (withGrade) {
    const quote = gradeQuestionOf(q)
    if (quote !== null) {
      const gradeKey = await sha256Hex(`grade|v${CACHE_VERSION_GRADE}|${nq}|${lang}`)
      const hit = await env.DB.prepare('SELECT answer FROM cache WHERE key = ?').bind(gradeKey).first<{ answer: string }>()
      if (hit) return json({ ...(JSON.parse(hit.answer) as AskResponse), fromCache: true } as AskResponse)
      const { found } = await findQuoted(env, quote)
      if (!found) return json(referral(lang, 'C'))
      const answer = await gradeAnswer(env, found, lang)
      await env.DB.prepare('INSERT OR REPLACE INTO cache (key, lang, level, answer) VALUES (?, ?, ?, ?)').bind(gradeKey, lang, 'a', JSON.stringify(answer)).run()
      return json(answer)
    }
  }

  // 3. Level gate (no model). C and D never reach the cache or the model.
  const g = gate(q, gateConfig.rules as GateRule[])
  if (g) return json(referral(lang, g.level))

  // The evaluation runner may compare modes, only while the admin routes are open and with the token.
  const explainMode =
    isEval && EXPLAIN_MODES.includes(body?.explain_mode as ExplainMode) ? (body!.explain_mode as ExplainMode) : explainModeOf(env)
  // ...and compare model settings (command 15). Such runs neither read nor write the cache.
  const settings = isEval && body?.llm ? evalSettings(body.llm) : null
  const evalMax = isEval && Number.isInteger(body?.llm?.max_tokens) ? Math.min(Math.max(Number(body!.llm!.max_tokens), 50), llmConfig.maxTokens) : null

  // Rule 11: a topic the Sharia reviewer listed as disputed → the texts with references, nothing generated.
  if (isDisputedTopic(q, disputedTopics.topics as string[])) {
    const r = await deps.retrieve(env, q, lang, 'new', { hadith: withHadith })
    return json(await disputedReferral(env, lang, r.ranked.slice(0, 5).map((x) => x.id), ml))
  }

  // 4. Cache (A/B only), then approved FAQ.
  // The model mode is part of the key, so answers made in mock mode are never served once live mode is on; and
  // CACHE_VERSION, so answers made before a change in retrieval, the lexicon, the prompt or the model are not.
  const cacheKey = await sha256Hex(`${nq}|${lang}|${simple ? 1 : 0}|${explainMode}|${llmMode(env)}|v${withHadith ? CACHE_VERSION_HADITH : CACHE_VERSION}`)
  const cached = settings ? null : await env.DB.prepare('SELECT answer FROM cache WHERE key = ?').bind(cacheKey).first<{ answer: string }>()
  if (cached) {
    const c = await card(env, JSON.parse(cached.answer) as Plan, lang, true, undefined, ml)
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
    // approved_by must exist (rule 9) but is never sent: no names in the app (rule 14).
    const c = await card(env, JSON.parse(faq.answer) as Plan, lang, false, { at: faq.approved_at }, ml)
    if (c) return json(c)
  }

  // 5. Retrieval; below the threshold → apology without calling the model.
  const r = await deps.retrieve(env, q, lang, 'new', { hadith: withHadith })
  if (r.abstain || r.passages.length === 0) return json(abstain(lang))
  const considered = r.passages.map((p) => p.id)

  // 8. A new model call (reply 0037 §5): the global monthly budget in dollars, then 6 a minute and 60 a day per device
  // (limits.ts). Only the generated answer stops; the cache, the FAQ, referrals and apologies above keep working.
  const refused = await newCallRefusal(env, request, isEval)
  if (refused) return error(lang, refused)

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
    lang,
    evalMax ?? (explainMode === 'on_demand' ? llmConfig.maxTokensSelectOnly : llmConfig.maxTokens),
    settings ?? defaultSettings(),
  )
  // The evaluation runner reads the call's tokens and finish reason (admin routes open, with the token, only).
  const out = (data: AskResponse, verdict: object = {}) =>
    json(isEval ? ({ ...data, eval: { ...evalInfo(result, sent), ...verdict } } as unknown as AskResponse) : data)
  if (result.raw === null) {
    console.log(JSON.stringify({ evt: 'llm_failed', code: result.error ?? 'unknown' }))
    return out(abstain(lang))
  }

  // 7. Verify, build the card from D1, cache A/B.
  const sacred = Object.fromEntries(sent.filter((i) => ['ayah', 'hadith'].includes(rows.get(i)!.kind)).map((i) => [i, rows.get(i)!.text]))
  const v = verify(result.raw, sent, sacred, explainMode, lang)
  if (v.kind === 'abstain') return out(abstain(lang), { verdict: 'abstain', reason: v.reason })
  if (v.kind === 'referral') return out(v.disputed ? await disputedReferral(env, lang, sent, ml) : referral(lang, v.level), { verdict: 'referral' })

  const hashes = Object.fromEntries(await Promise.all(v.ids.map(async (i) => [i, await sha256Hex(rows.get(i)!.text)] as const)))
  const plan: Plan = {
    v: 1,
    level: v.level,
    ids: v.ids,
    hashes,
    ...(v.direct ? { direct: v.direct } : {}),
    explanation: v.explanation,
    considered,
    answerLang: v.answerLang,
    mode: explainMode,
  }
  const c = await card(env, plan, lang, false, undefined, ml)
  if (!c) return out(abstain(lang), { verdict: 'abstain', reason: 'card_failed' })
  if (settings) return out(c, { verdict: 'answer' })
  // Mock-mode rows are marked "<lang>~mock" (as in explain_cache) so they can be cleared when the model goes live.
  await env.DB.prepare('INSERT OR REPLACE INTO cache (key, lang, level, answer) VALUES (?, ?, ?, ?)')
    .bind(cacheKey, llmMode(env) === 'mock' ? `${lang}~mock` : lang, v.level.toLowerCase(), JSON.stringify(plan))
    .run()
  return out(c, { verdict: 'answer' })
}

const EVAL_MODELS: Record<string, string> = { flash: llmConfig.model, pro: llmConfig.altModel }
function evalSettings(o: { model?: unknown; reasoning_effort?: unknown; thinking?: unknown }): LlmSettings {
  const d = defaultSettings()
  return {
    model: EVAL_MODELS[String(o.model)] ?? d.model,
    reasoningEffort: ['none', 'low', 'high', 'max'].includes(String(o.reasoning_effort)) ? String(o.reasoning_effort) : d.reasoningEffort,
    thinking: typeof o.thinking === 'boolean' ? o.thinking : d.thinking,
  }
}
/** What the evaluation runner reads about the call: tokens, finish reason, and passage ids the model returned that
 *  were not among those sent (rule 6 drops them; counted to measure how often the model invents ids). */
function evalInfo(r: LlmResult, sent: string[]) {
  const raw = r.raw as { used_passages?: unknown } | null
  const used = Array.isArray(raw?.used_passages) ? raw.used_passages.map(String) : []
  return { model: r.model ?? null, usage: r.usage, finish: r.finish ?? null, error: r.error ?? null, idsNotSent: used.filter((i) => !sent.includes(i)).length }
}

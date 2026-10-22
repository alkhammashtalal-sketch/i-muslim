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
import { blockIds, blockMessages, BLOCK_MAX } from './hadith-block'
import { meaningLang, meaningsOf } from './meaning'
import { MUYASSAR_NAME, MUYASSAR_URL, SAADI_NAME } from './passage'
import { systemPrompt, userPrompt, type PromptPassage } from './prompt'
import { findNear, findQuoted, findQuotedTr, gradeAnswer, gradeQuestionOf, gradeQuestionTr, type Found } from './hadith-grade'
import retrievalConfig from './config/retrieval.json'
import { fixesKey, fixesOf } from './fixes'
import { understandMessages, understoodOf, type Understood } from './understand'
import { evidenceIds, evidenceMessages } from './evidence'
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
  /** The hadiths' block (0048-add8): the ids its own call kept, shown after the ayat under «من السنة». */
  block?: string[]
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
 *  for the ayat and the creed passages (0048-add4 ب), so the answers measured before them are not served. 6: the hadiths
 *  a block of their own beside the passages (0048-add8). */
export const CACHE_VERSION_HADITH = 6
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
  const block = (plan.block ?? []).filter((i) => !plan.ids.includes(i))
  const rows = await loadRows(env, [...plan.ids, ...block])
  if ([...plan.ids, ...block].some((i) => !rows.has(i))) return null
  const main = bySourceStrength(await Promise.all(plan.ids.map((i) => quoteOf(rows.get(i)!, plan.hashes[i]))))
  // The block after the ayat, before the rest (0048-add8 §4: «الآيات، ثم الأحاديث المختارة … ثم التفسير والشرح وكتب العقيدة»).
  const blockQuotes = (await Promise.all(block.map((i) => quoteOf(rows.get(i)!, plan.hashes[i])))).map((q) => ({ ...q, block: true }))
  const quotes = [...main.filter((q) => q.kind === 'ayah'), ...blockQuotes, ...main.filter((q) => q.kind !== 'ayah')]
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

/** Fix «evidence»: the referral with the texts its general ruling rests on: `chosen` when the answer's call chose them,
 *  else one small call of its own on what retrieval offers (after the new-call limits; refused, the referral as before). */
async function withEvidence(
  env: Env,
  deps: AskDeps,
  request: Request,
  isEval: boolean,
  q: string,
  lang: Lang,
  ml: string,
  retrieval: { hadith: boolean; phrase: boolean } | null,
  base: ReferralResponse,
  chosen?: string[],
): Promise<ReferralResponse> {
  let ids = chosen ?? []
  if (!chosen && retrieval) {
    const r = await deps.retrieve(env, q, lang, 'new', retrieval)
    const offered = [...r.passages.map((p) => p.id), ...(r.hadiths ?? []).map((h) => h.id)].slice(0, 8)
    if (r.abstain || !offered.length) return base
    if (await newCallRefusal(env, request, isEval)) return base
    const rows = await loadRows(env, offered)
    const list = offered.filter((i) => rows.has(i) && ['ayah', 'hadith'].includes(rows.get(i)!.kind)).map((i) => ({ id: i, text: rows.get(i)!.text, textEn: rows.get(i)!.text_en }))
    if (!list.length) return base
    const res = await deps.callLlm(env, evidenceMessages(q, list), list.map((x) => x.id), lang, llmConfig.maxTokensBlock, defaultSettings())
    ids = evidenceIds(res.raw, list.map((x) => x.id))
  }
  if (!ids.length) return base
  const rows = await loadRows(env, ids)
  const quotes = await Promise.all(ids.filter((i) => rows.has(i)).map((i) => quoteOf(rows.get(i)!)))
  const meanings = await meaningsOf(env, quotes.filter((x) => x.kind === 'ayah').map((x) => x.id), ml)
  for (const x of quotes) if (meanings.has(x.id)) x.meaning = meanings.get(x.id)
  return quotes.length ? { ...base, evidence: quotes } : base
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
    hadith?: unknown; grade?: unknown; fixes?: unknown; gradeNear?: { min?: unknown; margin?: unknown }; minScore?: unknown
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
  // Reply 0071 §2: the fixes on (env.ASK_FIXES), or those the evaluation runner names for its own requests.
  const fixes = fixesOf(env, isEval ? body?.fixes : undefined)

  // 2b. «هل حديث كذا صحيح؟» (CLAUDE.md §9, Talal 14 October 09:25): HadeethEnc's grade as written, or a referral;
  // before the gate, since a hadith's own words may hold a gate phrase. No model. Its own switch, HADITH_GRADE
  // (0048-add7), apart from the hadiths in the answers; the evaluation runner may turn it on for its own requests.
  // Its own cache keys (grade|…), so a grade answer is never served as an answer, nor one as the other; a referral is
  // not kept (C is never cached, rule 8).
  const withGrade = hadithGradeOn(env, isEval && typeof body?.grade === 'boolean' ? body.grade : undefined)
  if (withGrade) {
    // Reply 0071 §2.5: the question in the reader's language (fix «grade-tr»), and the nearest hadith by meaning when
    // no wording matches (fix «grade-near»); each with the grade keys of its own, so neither is served without it.
    const tr = fixes.has('grade-tr')
    const nearOn = fixes.has('grade-near')
    const uOn = fixes.has('understand')
    const quote = gradeQuestionOf(q)
    // A quote not in Arabic letters (English, Urdu, …), or none: the frame in the reader's language, when a fix reads it.
    const quoteTr = (tr || uOn) && (quote === null || !/[\u0621-\u064A]/.test(quote)) ? gradeQuestionTr(q, lang) : null
    if (quote !== null || quoteTr !== null) {
      const gfix = [tr ? 'tr' : '', nearOn ? 'near' : '', uOn ? 'u' : ''].filter(Boolean).join(',')
      const gradeKey = await sha256Hex(`grade|v${CACHE_VERSION_GRADE}|${nq}|${lang}${gfix ? `|f:${gfix}` : ''}`)
      const hit = await env.DB.prepare('SELECT answer FROM cache WHERE key = ?').bind(gradeKey).first<{ answer: string }>()
      if (hit) return json({ ...(JSON.parse(hit.answer) as AskResponse), fromCache: true } as AskResponse)
      let found: Found | null = quote !== null ? (await findQuoted(env, quote)).found : null
      if (!found && quoteTr && tr) found = (await findQuotedTr(env, quoteTr.quote, lang, quoteTr.filler)).found
      // Fix «understand» (reply 0071 §2.3): the Arabic words the model gives for the hadith the question names, through
      // the same textual rule (findQuoted). A new model call, so the new-call limits come first.
      if (!found && uOn) {
        const refusedU = await newCallRefusal(env, request, isEval)
        if (refusedU) return error(lang, refusedU)
        const u = await understand(env, deps, q, lang)
        if (u.quote) found = (await findQuoted(env, u.quote)).found
      }
      let near: { score: number; second: number } | null = null
      if (!found && nearOn) {
        const g = retrievalConfig.gradeNear
        const ok = (x: unknown, d: number) => (isEval && typeof x === 'number' && x >= 0 && x <= 1 ? x : d)
        const r = await findNear(env, quote ?? quoteTr!.quote, ok(body?.gradeNear?.min, g.min), ok(body?.gradeNear?.margin, g.margin))
        found = r.found
        near = { score: r.score, second: r.second }
      }
      const evalNote = isEval ? { eval: { grade: { how: found?.how ?? null, near } } } : {}
      // Not in HadeethEnc in these words: our line for this path (0048-add9 أ), no ruling, no hint of weakness.
      if (!found) return json({ ...referral(lang, 'C'), message: (messages.gradeNotFound as Record<string, string>)[lang] ?? messages.gradeNotFound.en, ...evalNote } as AskResponse)
      const answer = await gradeAnswer(env, found, lang)
      await env.DB.prepare('INSERT OR REPLACE INTO cache (key, lang, level, answer) VALUES (?, ?, ?, ?)').bind(gradeKey, lang, 'a', JSON.stringify(answer)).run()
      return json({ ...answer, ...evalNote } as AskResponse)
    }
  }

  // 3. Level gate (no model). C and D never reach the cache or the model.
  const g = gate(q, gateConfig.rules as GateRule[], fixes.has('level'))
  if (g) {
    // Fix «evidence» (reply 0071 §4.4): a personal case keeps its referral, with the text its general ruling rests on.
    if (g.level === 'D' && fixes.has('evidence')) return json(await withEvidence(env, deps, request, isEval, q, lang, ml, { hadith: withHadith, phrase: fixes.has('phrase') }, referral(lang, 'D')))
    return json(referral(lang, g.level))
  }

  // The evaluation runner may compare modes, only while the admin routes are open and with the token.
  const explainMode =
    isEval && EXPLAIN_MODES.includes(body?.explain_mode as ExplainMode) ? (body!.explain_mode as ExplainMode) : explainModeOf(env)
  // ...and compare model settings (command 15). Such runs neither read nor write the cache.
  const settings = isEval && body?.llm ? evalSettings(body.llm) : null
  const evalMax = isEval && Number.isInteger(body?.llm?.max_tokens) ? Math.min(Math.max(Number(body!.llm!.max_tokens), 50), llmConfig.maxTokens) : null

  // Rule 11: a topic the Sharia reviewer listed as disputed → the texts with references, nothing generated.
  if (isDisputedTopic(q, disputedTopics.topics as string[])) {
    const r = await deps.retrieve(env, q, lang, 'new', { hadith: withHadith, phrase: fixes.has('phrase') })
    return json(await disputedReferral(env, lang, r.ranked.slice(0, 5).map((x) => x.id), ml))
  }

  // 4. Cache (A/B only), then approved FAQ.
  // The model mode is part of the key, so answers made in mock mode are never served once live mode is on; and
  // CACHE_VERSION, so answers made before a change in retrieval, the lexicon, the prompt or the model are not.
  // The fixes too (reply 0071 §2), only when some are on, so the keys made without them stay as they were.
  const cacheKey = await sha256Hex(`${nq}|${lang}|${simple ? 1 : 0}|${explainMode}|${llmMode(env)}|v${withHadith ? CACHE_VERSION_HADITH : CACHE_VERSION}${fixes.size ? `|f:${fixesKey(fixes)}` : ''}`)
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

  // 5a. Fix «understand» (reply 0071 §2.3): the search words, from a small model call of its own, before retrieval;
  // the new-call limits come first, and are not counted twice for this answer.
  let understood: Understood | undefined
  if (fixes.has('understand')) {
    const refusedU = await newCallRefusal(env, request, isEval)
    if (refusedU) return error(lang, refusedU)
    understood = await understand(env, deps, q, lang, settings)
  }

  // 5. Retrieval; below the threshold → apology without calling the model.
  // Reply 0071 §2.6: another threshold tried by the evaluation runner, for its own requests only.
  const tryMin = isEval && typeof body?.minScore === 'number' ? { minScore: body.minScore } : {}
  const r = await deps.retrieve(env, q, lang, 'new', { hadith: withHadith, phrase: fixes.has('phrase'), ...tryMin, ...(understood ? { understood } : {}) })
  // Fix «hadith-answer» (reply 0071 §2.1, measured on v11: the block kept the very hadith and the answer abstained): with
  // the hadiths on, a question whose passages fall under the threshold goes on to the block when it has candidates.
  const hadithAlone = fixes.has('hadith-answer') && withHadith && (r.hadiths?.length ?? 0) > 0
  if ((r.abstain || r.passages.length === 0) && !hadithAlone) return json(isEval && understood ? ({ ...abstain(lang), eval: { understood } } as unknown as AskResponse) : abstain(lang))
  const considered = r.passages.map((p) => p.id)

  // 8. A new model call (reply 0037 §5): the global monthly budget in dollars, then 6 a minute and 60 a day per device
  // (limits.ts). Only the generated answer stops; the cache, the FAQ, referrals and apologies above keep working.
  const refused = understood ? null : await newCallRefusal(env, request, isEval)
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
  // The hadiths' block (0048-add8): its own small call, made beside this one and blind to it, on the hadiths retrieval
  // offered; this call and its instructions are as they were.
  const offered = (r.hadiths ?? []).map((h) => h.id)
  const hrows = offered.length ? await loadRows(env, offered) : new Map<string, Row>()
  const candidates = offered.filter((i) => hrows.get(i)?.kind === 'hadith')
  const blockCall = candidates.length
    ? deps.callLlm(
        env,
        blockMessages(
          q,
          candidates.map((i) => ({ id: i, text: hrows.get(i)!.text, textEn: hrows.get(i)!.text_en, grade: extraOf(hrows.get(i)!).grade })),
        ),
        candidates,
        lang,
        llmConfig.maxTokensBlock,
        settings ?? defaultSettings(),
      )
    : null
  // No passage to send (fix «hadith-answer» past the threshold): no answer call, the block alone decides.
  const result: LlmResult = sent.length
    ? await deps.callLlm(
        env,
        [
          { role: 'system', content: systemPrompt(lang, simple, explainMode, fixes.has('level')) },
          { role: 'user', content: userPrompt(q, passages) },
        ],
        sent,
        lang,
        evalMax ?? (explainMode === 'on_demand' ? llmConfig.maxTokensSelectOnly : llmConfig.maxTokens),
        settings ?? defaultSettings(),
      )
    : { raw: { level: 'A', answerable: false, disputed: false, answer_lang: lang, used_passages: [] }, usage: { in: 0, out: 0 }, mode: llmMode(env) }
  const kept = blockCall ? blockIds((await blockCall).raw, candidates).slice(0, BLOCK_MAX) : []
  // The evaluation runner reads the call's tokens and finish reason (admin routes open, with the token, only).
  const out = (data: AskResponse, verdict: object = {}) =>
    json(isEval ? ({ ...data, eval: { ...evalInfo(result, sent), block: { offered: candidates, kept }, ...(understood ? { understood } : {}), ...verdict } } as unknown as AskResponse) : data)
  if (result.raw === null) {
    console.log(JSON.stringify({ evt: 'llm_failed', code: result.error ?? 'unknown' }))
    return out(abstain(lang))
  }

  // 7. Verify, build the card from D1, cache A/B.
  const sacred = Object.fromEntries(sent.filter((i) => ['ayah', 'hadith'].includes(rows.get(i)!.kind)).map((i) => [i, rows.get(i)!.text]))
  const v = verify(result.raw, sent, sacred, explainMode, lang)
  if (v.kind === 'abstain') {
    // Fix «hadith-answer»: the passages do not answer, and the block kept hadiths whose own words do; they answer alone,
    // shown from D1 with their grade and takhrij, nothing written. Without kept hadiths, the apology as before.
    if (fixes.has('hadith-answer') && kept.length) {
      const lv = (result.raw as { level?: unknown } | null)?.level
      const al = (result.raw as { answer_lang?: unknown } | null)?.answer_lang
      const plan: Plan = {
        v: 1,
        level: lv === 'A' || lv === 'B' ? lv : 'B',
        ids: kept,
        hashes: Object.fromEntries(await Promise.all(kept.map(async (i) => [i, await sha256Hex(hrows.get(i)!.text)] as const))),
        explanation: [],
        considered: [...considered, ...candidates],
        answerLang: typeof al === 'string' && al ? al : lang,
        mode: explainMode,
      }
      const c = await card(env, plan, lang, false, undefined, ml)
      if (c) {
        if (!settings) await env.DB.prepare('INSERT OR REPLACE INTO cache (key, lang, level, answer) VALUES (?, ?, ?, ?)').bind(cacheKey, lang, plan.level.toLowerCase(), JSON.stringify(plan)).run()
        return out(c, { verdict: 'answer', reason: 'hadith_block' })
      }
    }
    return out(abstain(lang), { verdict: 'abstain', reason: v.reason })
  }
  if (v.kind === 'referral') {
    if (!v.disputed && v.level === 'D' && fixes.has('evidence')) {
      // The model's own choice among the passages sent, for the general ruling; none, and the referral is as before.
      const used = (result.raw as { used_passages?: unknown } | null)?.used_passages
      const chosen = Array.isArray(used) ? used.map(String).filter((i) => sent.includes(i) && ['ayah', 'hadith'].includes(rows.get(i)!.kind)) : []
      return out(await withEvidence(env, deps, request, isEval, q, lang, ml, null, referral(lang, 'D'), chosen.slice(0, 3)), { verdict: 'referral' })
    }
    return out(v.disputed ? await disputedReferral(env, lang, sent, ml) : referral(lang, v.level), { verdict: 'referral' })
  }

  const block = kept.filter((i) => !v.ids.includes(i))
  const hashes = Object.fromEntries(
    await Promise.all([...v.ids.map(async (i) => [i, await sha256Hex(rows.get(i)!.text)] as const), ...block.map(async (i) => [i, await sha256Hex(hrows.get(i)!.text)] as const)]),
  )
  const plan: Plan = {
    v: 1,
    level: v.level,
    ids: v.ids,
    hashes,
    ...(v.direct ? { direct: v.direct } : {}),
    explanation: v.explanation,
    considered,
    ...(block.length ? { block } : {}),
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

/** Fix «understand»: the search words for a question (src/understand.ts); none when the call fails. */
async function understand(env: Env, deps: AskDeps, q: string, lang: Lang, settings?: LlmSettings | null): Promise<Understood> {
  const r = await deps.callLlm(env, understandMessages(q), [], lang, llmConfig.maxTokensUnderstand, settings ?? defaultSettings())
  return understoodOf(r.raw)
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

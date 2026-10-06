// The one model call per new answer (CLAUDE.md §3 rule 5, §5 step 6), through one internal function with two
// providers, chosen by "provider" in worker/src/config/llm.json:
//   workers-ai  DeepSeek V4 Flash hosted on Cloudflare Workers AI, through the AI binding: no account, no key
//               (command 15). Reply shape checked on a real call: OpenAI style, choices[0].message.content
//               (+ reasoning_content) and usage.prompt_tokens / completion_tokens.
//   openai      an OpenAI-compatible endpoint (baseUrl + LLM_API_KEY), kept as the fallback.
// LLM_MODE=mock returns a fixed reply built from the first two passages, so every layer runs without the model.
// No retry; temperature 0; JSON output; 20 s timeout. Any failure returns null and the caller abstains.
//
// Reasoning (measured, command 15): on Workers AI `reasoning_effort: "none"` still makes the model reason first
// (the reasoning tokens are billed as output and count against the output limit). Reasoning is switched off only
// by `chat_template_kwargs: { thinking: false }`, which llm.json "thinking": false sends.
import llmConfig from './config/llm.json'
import type { Env } from './index'
import { riyadhMonth } from './lib/keys.ts'

export type ChatMessage = { role: 'system' | 'user'; content: string }
export type Usage = { in: number; out: number }
export type LlmResult = { raw: unknown | null; usage: Usage; mode: 'mock' | 'live'; error?: string; finish?: string | null; model?: string }
/** Model settings; the evaluation runner may override them only while the admin routes are open (ask.ts). */
export type LlmSettings = { model: string; reasoningEffort: string | null; thinking: boolean }

const TIMEOUT_MS = 20_000
// Workers AI allows 20 requests a minute for this model, for the whole account; a request over it fails at once
// with "3021: rate limiting". One retry after this pause absorbs a short burst; no other failure is retried.
export const RATE_RETRY_MS = 3_000

export const llmMode = (env: Env): 'mock' | 'live' => (env.LLM_MODE === 'live' ? 'live' : 'mock')

export const defaultSettings = (): LlmSettings => ({
  model: llmConfig.provider === 'workers-ai' ? llmConfig.model : llmConfig.openaiModel,
  reasoningEffort: llmConfig.reasoningEffort ?? null,
  thinking: llmConfig.thinking,
})

/** Deterministic stand-in used when LLM_MODE=mock (tests, and before the live model is switched on). */
export function mockReply(sentIds: string[], uiLang = 'ar'): unknown {
  const [a, b] = sentIds
  if (!a) return { level: 'A', answerable: false, disputed: false, used_passages: [], direct: { text: '', cites: [] }, explanation: [] }
  return {
    level: 'A',
    answerable: true,
    disputed: false,
    // The mock does not detect the question's language; the real model does (rule 9 of the prompt).
    answer_lang: uiLang,
    used_passages: b ? [a, b] : [a],
    direct: { text: 'إجابة تجريبية من وضع المحاكاة: النصوص أدناه هي ما وُجد في المصادر.', cites: [a] },
    explanation: b ? [{ text: 'شرح تجريبي من وضع المحاكاة يستشهد بالنص الثاني.', cites: [b] }] : [],
  }
}

async function recordUsage(env: Env, usage: Usage): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO usage_monthly (month, llm_calls, tokens_in, tokens_out) VALUES (?, 1, ?, ?)
     ON CONFLICT(month) DO UPDATE SET llm_calls = llm_calls + 1, tokens_in = tokens_in + excluded.tokens_in, tokens_out = tokens_out + excluded.tokens_out`,
  )
    .bind(riyadhMonth(), usage.in, usage.out)
    .run()
}

type Completion = { ok: true; content: string; usage: Usage; finish: string | null } | { ok: false; error: string; usage?: Usage }
type CompletionBody = {
  choices?: { message?: { content?: unknown }; finish_reason?: string }[]
  response?: unknown
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

function readBody(body: CompletionBody | null): Completion {
  const usage = { in: body?.usage?.prompt_tokens ?? 0, out: body?.usage?.completion_tokens ?? 0 }
  const content = body?.choices?.[0]?.message?.content ?? body?.response
  if (content === undefined || content === null) return { ok: false, error: 'no_content', usage }
  return { ok: true, content: typeof content === 'string' ? content : JSON.stringify(content), usage, finish: body?.choices?.[0]?.finish_reason ?? null }
}

/** One chat completion, through the configured provider. */
async function chatCompletion(
  env: Env,
  { messages, maxTokens, json, settings = defaultSettings() }: { messages: ChatMessage[]; maxTokens: number; json: boolean; settings?: LlmSettings },
): Promise<Completion> {
  if (llmConfig.provider === 'workers-ai') {
    const input: Record<string, unknown> = { messages, temperature: llmConfig.temperature, max_completion_tokens: maxTokens }
    if (json) input.response_format = { type: 'json_object' }
    if (settings.reasoningEffort) input.reasoning_effort = settings.reasoningEffort
    if (!settings.thinking) input.chat_template_kwargs = { thinking: false }
    const ai = env.AI as unknown as { run: (model: string, input: unknown) => Promise<unknown> }
    for (let attempt = 0; ; attempt++) {
      let timer: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
      })
      try {
        return readBody((await Promise.race([ai.run(settings.model, input), timeout])) as CompletionBody)
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        if (attempt === 0 && message.includes('3021')) {
          await new Promise((resolve) => setTimeout(resolve, RATE_RETRY_MS))
          continue
        }
        return { ok: false, error: message === 'timeout' ? 'timeout_or_network' : `ai_error: ${message.slice(0, 120)}` }
      } finally {
        if (timer !== undefined) clearTimeout(timer)
      }
    }
  }

  if (!env.LLM_API_KEY) return { ok: false, error: 'no_key' }
  let res: Response
  try {
    res = await fetch(`${llmConfig.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.LLM_API_KEY}` },
      body: JSON.stringify({
        model: settings.model,
        temperature: llmConfig.temperature,
        max_tokens: maxTokens,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
        messages,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    return { ok: false, error: 'timeout_or_network' }
  }
  if (!res.ok) return { ok: false, error: `http_${res.status}` }
  return readBody((await res.json().catch(() => null)) as CompletionBody | null)
}

export async function callLlm(
  env: Env,
  messages: ChatMessage[],
  sentIds: string[],
  uiLang = 'ar',
  maxTokens = llmConfig.maxTokens,
  settings: LlmSettings = defaultSettings(),
): Promise<LlmResult> {
  const mode = llmMode(env)
  if (mode === 'mock') {
    await recordUsage(env, { in: 0, out: 0 })
    return { raw: mockReply(sentIds, uiLang), usage: { in: 0, out: 0 }, mode }
  }
  const r = await chatCompletion(env, { messages, maxTokens, json: true, settings })
  const usage = r.usage ?? { in: 0, out: 0 }
  if (r.usage) await recordUsage(env, usage)
  if (!r.ok) return { raw: null, usage, mode, error: r.error, model: settings.model }
  try {
    return { raw: JSON.parse(r.content), usage, mode, finish: r.finish, model: settings.model }
  } catch {
    return { raw: null, usage, mode, error: r.finish === 'length' ? 'bad_json_length' : 'bad_json', finish: r.finish, model: settings.model }
  }
}

/** Admin-only helpers for go-live and the general-model comparison (never on the answer path). */
export async function listModels(env: Env): Promise<{ ok: true; models: string[]; ms?: number } | { ok: false; error: string }> {
  if (llmConfig.provider === 'workers-ai') {
    // Workers AI has no per-account model list to ask: the configured model is "offered" when a real short call
    // with the configured settings returns content.
    const t0 = Date.now()
    const r = await chatCompletion(env, { messages: [{ role: 'user', content: 'Reply with the single word: ok' }], maxTokens: 20, json: false })
    if (r.usage) await recordUsage(env, r.usage)
    return r.ok && r.content.trim() ? { ok: true, models: [llmConfig.model], ms: Date.now() - t0 } : { ok: false, error: r.ok ? 'empty_reply' : r.error }
  }
  if (!env.LLM_API_KEY) return { ok: false, error: 'no_key' }
  try {
    const res = await fetch(`${llmConfig.baseUrl.replace(/\/$/, '')}/models`, {
      headers: { authorization: `Bearer ${env.LLM_API_KEY}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}` }
    const body = (await res.json()) as { data?: { id?: string }[] }
    return { ok: true, models: (body.data ?? []).map((m) => m.id ?? '').filter(Boolean) }
  } catch {
    return { ok: false, error: 'timeout_or_network' }
  }
}

/** A general-purpose answer with no passages, for comparison only (eval/compare-general.mjs): the same model and
 *  settings as the answer engine, asked to cite its sources. */
export async function askGeneral(env: Env, q: string): Promise<{ ok: true; text: string; usage: Usage } | { ok: false; error: string }> {
  const r = await chatCompletion(env, {
    messages: [
      { role: 'system', content: 'Answer the question about Islam. Cite your sources (Quran surah and ayah, hadith collection and number), quoting the text you rely on.' },
      { role: 'user', content: q },
    ],
    maxTokens: llmConfig.maxTokens,
    json: false,
  })
  if (r.usage) await recordUsage(env, r.usage)
  return r.ok ? { ok: true, text: r.content, usage: r.usage } : { ok: false, error: r.error }
}

// OpenAI-compatible client for the one model call per new answer (CLAUDE.md §3 rule 5, §5 step 6).
// LLM_MODE=mock returns a fixed reply built from the first two passages, so every layer runs without a key.
// No retry; temperature 0; JSON output; 20 s timeout. Any failure returns null and the caller abstains.
import llmConfig from './config/llm.json'
import type { Env } from './index'
import { riyadhMonth } from './lib/keys.ts'

export type ChatMessage = { role: 'system' | 'user'; content: string }
export type LlmResult = { raw: unknown | null; usage: { in: number; out: number }; mode: 'mock' | 'live'; error?: string }

const TIMEOUT_MS = 20_000

export const llmMode = (env: Env): 'mock' | 'live' => (env.LLM_MODE === 'live' ? 'live' : 'mock')

/** Deterministic stand-in used when LLM_MODE=mock (tests, and before LLM_API_KEY exists). */
export function mockReply(sentIds: string[]): unknown {
  const [a, b] = sentIds
  if (!a) return { level: 'A', answerable: false, disputed: false, used_passages: [], direct: { text: '', cites: [] }, explanation: [] }
  return {
    level: 'A',
    answerable: true,
    disputed: false,
    used_passages: b ? [a, b] : [a],
    direct: { text: 'إجابة تجريبية من وضع المحاكاة: النصوص أدناه هي ما وُجد في المصادر.', cites: [a] },
    explanation: b ? [{ text: 'شرح تجريبي من وضع المحاكاة يستشهد بالنص الثاني.', cites: [b] }] : [],
  }
}

async function recordUsage(env: Env, usage: { in: number; out: number }): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO usage_monthly (month, llm_calls, tokens_in, tokens_out) VALUES (?, 1, ?, ?)
     ON CONFLICT(month) DO UPDATE SET llm_calls = llm_calls + 1, tokens_in = tokens_in + excluded.tokens_in, tokens_out = tokens_out + excluded.tokens_out`,
  )
    .bind(riyadhMonth(), usage.in, usage.out)
    .run()
}

export async function callLlm(env: Env, messages: ChatMessage[], sentIds: string[]): Promise<LlmResult> {
  const mode = llmMode(env)
  if (mode === 'mock') {
    await recordUsage(env, { in: 0, out: 0 })
    return { raw: mockReply(sentIds), usage: { in: 0, out: 0 }, mode }
  }
  if (!env.LLM_API_KEY) return { raw: null, usage: { in: 0, out: 0 }, mode, error: 'no_key' }

  let res: Response
  try {
    res = await fetch(`${llmConfig.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.LLM_API_KEY}` },
      body: JSON.stringify({
        model: llmConfig.model,
        temperature: llmConfig.temperature,
        max_tokens: llmConfig.maxTokens,
        response_format: { type: 'json_object' },
        messages,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch {
    return { raw: null, usage: { in: 0, out: 0 }, mode, error: 'timeout_or_network' }
  }
  if (!res.ok) return { raw: null, usage: { in: 0, out: 0 }, mode, error: `http_${res.status}` }

  const body = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[]
    usage?: { prompt_tokens?: number; completion_tokens?: number }
  } | null
  const usage = { in: body?.usage?.prompt_tokens ?? 0, out: body?.usage?.completion_tokens ?? 0 }
  await recordUsage(env, usage)
  try {
    return { raw: JSON.parse(body?.choices?.[0]?.message?.content ?? ''), usage, mode }
  } catch {
    return { raw: null, usage, mode, error: 'bad_json' }
  }
}

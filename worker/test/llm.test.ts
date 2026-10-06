// The model client on Workers AI (command 15): the AI binding is replaced by a stub that returns the reply shape
// seen on the real call (OpenAI style: choices[0].message.content + reasoning_content, usage).
import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import llmConfig from '../src/config/llm.json'
import type { Env } from '../src/index'
import { askGeneral, callLlm, defaultSettings, listModels } from '../src/llm'
import { SqliteD1 } from './d1-sqlite'

type Call = { model: string; input: Record<string, unknown> }

function envWith(run: (model: string, input: Record<string, unknown>) => Promise<unknown>, calls: Call[] = []): Env {
  const db = new DatabaseSync(':memory:')
  db.exec('CREATE TABLE usage_monthly (month TEXT PRIMARY KEY, llm_calls INTEGER NOT NULL DEFAULT 0, tokens_in INTEGER NOT NULL DEFAULT 0, tokens_out INTEGER NOT NULL DEFAULT 0)')
  const AI = {
    run: (model: string, input: Record<string, unknown>) => {
      calls.push({ model, input })
      return run(model, input)
    },
  }
  return { DB: new SqliteD1(db) as unknown as D1Database, AI, LLM_MODE: 'live' } as unknown as Env
}

const reply = (content: string, finish = 'stop') => ({
  id: 'x',
  object: 'chat.completion',
  created: 1,
  model: llmConfig.model,
  choices: [{ index: 0, finish_reason: finish, logprobs: null, message: { role: 'assistant', content, reasoning_content: '' } }],
  usage: { prompt_tokens: 1200, completion_tokens: 40, total_tokens: 1240, prompt_tokens_details: { cached_tokens: 0 }, neurons: 10 },
})

const usageRow = (env: Env) => (env.DB as unknown as SqliteD1).db.prepare('SELECT llm_calls, tokens_in, tokens_out FROM usage_monthly').get()

describe('llm on Workers AI', () => {
  it('the configuration is Workers AI with the Flash model; the openai path keeps its base URL', () => {
    expect(llmConfig.provider).toBe('workers-ai')
    expect(llmConfig.model).toBe('@cf/deepseek-ai/deepseek-v4-flash-0731')
    expect(llmConfig.altModel).toBe('@cf/deepseek-ai/deepseek-v4-pro-0813')
    expect(llmConfig.temperature).toBe(0)
    expect(llmConfig.maxTokens).toBe(700)
    expect(llmConfig.baseUrl).toBe('https://api.deepseek.com')
  })

  it('sends one call through the AI binding with temperature 0, the output limit and JSON mode, and reads the reply', async () => {
    const calls: Call[] = []
    const env = envWith(async () => reply('{"level":"A","answerable":true,"used_passages":["quran:5:6"]}'), calls)
    const r = await callLlm(env, [{ role: 'user', content: 'q' }], ['quran:5:6'], 'ar', 200)
    expect(calls).toHaveLength(1)
    expect(calls[0].model).toBe(llmConfig.model)
    expect(calls[0].input).toMatchObject({ temperature: 0, max_completion_tokens: 200, response_format: { type: 'json_object' } })
    expect(r.raw).toEqual({ level: 'A', answerable: true, used_passages: ['quran:5:6'] })
    expect(r.usage).toEqual({ in: 1200, out: 40 })
    expect(usageRow(env)).toEqual({ llm_calls: 1, tokens_in: 1200, tokens_out: 40 })
  })

  it('switches reasoning off with chat_template_kwargs when "thinking" is false (reasoning_effort none alone does not)', async () => {
    const calls: Call[] = []
    const env = envWith(async () => reply('{}'), calls)
    await callLlm(env, [{ role: 'user', content: 'q' }], [], 'ar', 200, { ...defaultSettings(), thinking: false })
    expect(calls[0].input.chat_template_kwargs).toEqual({ thinking: false })
    await callLlm(env, [{ role: 'user', content: 'q' }], [], 'ar', 200, { ...defaultSettings(), thinking: true, reasoningEffort: 'low' })
    expect(calls[1].input.chat_template_kwargs).toBeUndefined()
    expect(calls[1].input.reasoning_effort).toBe('low')
  })

  it('a reply cut by the output limit is not JSON: null (the caller abstains), and its tokens are still counted', async () => {
    const env = envWith(async () => reply('{"level":"A","answ', 'length'))
    const r = await callLlm(env, [{ role: 'user', content: 'q' }], ['quran:5:6'])
    expect(r.raw).toBeNull()
    expect(r.error).toBe('bad_json_length')
    expect(usageRow(env)).toEqual({ llm_calls: 1, tokens_in: 1200, tokens_out: 40 })
  })

  it('an error from the binding returns null with the reason; no key is needed', async () => {
    const env = envWith(async () => {
      throw new Error('3040: Capacity temporarily exceeded')
    })
    const r = await callLlm(env, [{ role: 'user', content: 'q' }], ['quran:5:6'])
    expect(r.raw).toBeNull()
    expect(r.error).toBe('ai_error: 3040: Capacity temporarily exceeded')
  })

  it('reads a reply in the "response" shape too', async () => {
    const env = envWith(async () => ({ response: { level: 'B', answerable: false }, usage: { prompt_tokens: 5, completion_tokens: 3 } }))
    const r = await callLlm(env, [{ role: 'user', content: 'q' }], [])
    expect(r.raw).toEqual({ level: 'B', answerable: false })
  })

  it('times out after 20 s', async () => {
    const { vi } = await import('vitest')
    vi.useFakeTimers()
    try {
      const env = envWith(() => new Promise(() => {}))
      const p = callLlm(env, [{ role: 'user', content: 'q' }], ['quran:5:6'])
      await vi.advanceTimersByTimeAsync(20_001)
      const r = await p
      expect(r.raw).toBeNull()
      expect(r.error).toBe('timeout_or_network')
    } finally {
      vi.useRealTimers()
    }
  })

  it('listModels checks the configured model with a real short call; askGeneral uses the same model with no passages', async () => {
    const calls: Call[] = []
    const env = envWith(async () => reply('ok'), calls)
    expect(await listModels(env)).toMatchObject({ ok: true, models: [llmConfig.model] })
    const g = await askGeneral(env, 'ما أركان الإسلام؟')
    expect(g).toMatchObject({ ok: true, text: 'ok' })
    expect(calls.map((c) => c.model)).toEqual([llmConfig.model, llmConfig.model])
    expect(calls[1].input.response_format).toBeUndefined()
  })
})

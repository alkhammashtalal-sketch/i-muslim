// The limits on what costs money (CLAUDE.md §5 steps 1 and 8; reply 0033 §د; reply 0037 §5), in one place:
//   bump                   a per-device daily counter in usage_daily (scope:HMAC of the address and the Riyadh day).
//   newCallRefusal         before every NEW model call (/api/ask and /api/explain; a cached answer, the FAQ, a referral
//                          or an apology never reaches it): the global monthly budget in dollars, then (not for the
//                          evaluation runner) 6 a minute per device through the Rate Limiting binding BURST, then 60 a day
//                          per device (scope «llm»).
//   takeRecording          one /api/transcribe recording against the global monthly cap (20,000).
// Nothing here stores or logs a question or an address: the per-device keys are the daily HMAC of keys.ts.
import limits from './config/limits.json'
import llmConfig from './config/llm.json'
import type { Env } from './index'
import { deviceKey, riyadhDay, riyadhMonth } from './lib/keys.ts'

/** Why a new model call is not made: the monthly budget is spent (503), a burst (429), or the day's 60 (429). */
export type NewCallRefusal = 'monthly_cap' | 'burst' | 'answers_limited'

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

const PRICES = limits.llmPriceUsdPerMTokens as Record<string, { input: number; output: number }>

/** Dollars the recorded tokens cost at the configured model's published price (limits.json, with its source). */
export function spentUsd(tokensIn: number, tokensOut: number): number {
  const p = PRICES[llmConfig.model]
  if (!p) throw new Error(`no price for ${llmConfig.model} in limits.json`)
  return (tokensIn * p.input + tokensOut * p.output) / 1_000_000
}

/** True once this Riyadh month's recorded tokens have cost the monthly budget. Read by the month key. */
export async function overBudget(env: Env): Promise<boolean> {
  const row = await env.DB.prepare('SELECT tokens_in, tokens_out FROM usage_monthly WHERE month = ?')
    .bind(riyadhMonth())
    .first<{ tokens_in: number; tokens_out: number }>()
  return spentUsd(row?.tokens_in ?? 0, row?.tokens_out ?? 0) >= limits.monthlyBudgetUsd
}

/** Checked right before a new model call; null lets it through. `exempt` (the evaluation runner, only while the admin
 *  routes are open and with the token) skips the per-device limits, never the budget. The burst is checked before the
 *  day's counter, so a call refused for a burst does not use one of the day's 60. Without the BURST binding (tests that
 *  do not give one, or wrangler's top-level configuration, which is frozen) there is no burst limit, and a failure of
 *  the binding lets the call through, as the binding itself is permissive by design; the daily and monthly limits stay. */
export async function newCallRefusal(env: Env, request: Request, exempt = false): Promise<NewCallRefusal | null> {
  if (await overBudget(env)) return 'monthly_cap'
  if (exempt) return null
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown'
  if (env.BURST) {
    const key = `llm:${await deviceKey(env.IP_SALT!, ip, riyadhDay())}`
    const ok = await env.BURST.limit({ key }).then(
      (r) => r.success,
      () => true,
    )
    if (!ok) return 'burst'
  }
  if ((await bump(env, env.IP_SALT!, ip, 'llm')) > limits.newAnswersPerDevice) return 'answers_limited'
  return null
}

/** One recording against the global monthly cap, in one statement: counted and true while under the cap; false at the
 *  cap, and then not counted. If the table is missing (migration 0015 not applied yet), true: the per-device daily
 *  limit still holds. */
export async function takeRecording(env: Env): Promise<boolean> {
  try {
    const row = await env.DB.prepare(
      'INSERT INTO recordings_monthly (month, count) VALUES (?, 1) ON CONFLICT(month) DO UPDATE SET count = count + 1 WHERE count < ? RETURNING count',
    )
      .bind(riyadhMonth(), limits.monthlyRecordings)
      .first<{ count: number }>()
    return row !== null
  } catch {
    console.log(JSON.stringify({ evt: 'recordings_count_failed' }))
    return true
  }
}

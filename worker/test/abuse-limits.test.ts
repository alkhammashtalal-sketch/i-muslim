// Reply 0033 §د «الحماية من الإساءة»: every route that costs money or reaches a third party has a per-device daily
// limit, answers 429 one request past it, and counts the native app (Capacitor's WebView, origin capacitor://localhost
// on iOS and https://localhost on Android) exactly like the browser: the key is the address Cloudflare saw
// (cf-connecting-ip, which a client cannot set), HMAC'd with the day; never the origin, the user agent or a cookie.
// Everything here goes through the whole Worker (src/index.ts), so the routing is tested with the limits.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import ar from '../../web/src/i18n/ar'
import en from '../../web/src/i18n/en'
import limits from '../src/config/limits.json'
import llmConfig from '../src/config/llm.json'
import worker, { type Env } from '../src/index'
import { LANG_REQUESTS_PER_DAY } from '../src/lang-request'
import { deviceKey, limitAddress, riyadhDay, riyadhMonth, sha256Hex } from '../src/lib/keys'
import { tokenize } from '../src/lib/normalize'
import { spentUsd } from '../src/limits'
import { bytesToB64url } from '../src/push/webpush'
import { EMBED_MODEL } from '../src/retrieve'
import { DAILY_RECORDINGS } from '../src/transcribe'
import { buildDb, hasFullData, type SqliteD1 } from './d1-sqlite'

const ROOT = path.resolve(import.meta.dirname, '../..')
/** JSONC → JSON: comments removed outside strings (as site.test.ts reads it). */
function parseJsonc(text: string): Record<string, unknown> {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      let j = text.indexOf('"', i + 1)
      while (text[j - 1] === '\\') j = text.indexOf('"', j + 1)
      out += text.slice(i, j + 1)
      i = j
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++
      out += '\n'
    } else if (c === '/' && text[i + 1] === '*') {
      i = text.indexOf('*/', i) + 1
    } else out += c
  }
  return JSON.parse(out)
}
type RateLimitConfig = { name: string; namespace_id: string; simple: { limit: number; period: number } }
const WRANGLER = parseJsonc(fs.readFileSync(path.join(ROOT, 'worker/wrangler.jsonc'), 'utf8')) as {
  ratelimits?: RateLimitConfig[]
  env: { next: { ratelimits?: RateLimitConfig[] } }
}
const BURST_CONFIG = WRANGLER.env.next.ratelimits![0]

/** The Workers Rate Limiting binding as env.next configures it (a window of `period` seconds per key, as wrangler's
 *  local simulator counts it), on a clock the tests move; and every key it was given. */
let clock = 0
const windows = new Map<string, { start: number; n: number }>()
const burstKeys = new Set<string>()
const BURST = {
  limit: async ({ key }: { key: string }) => {
    burstKeys.add(key)
    const start = Math.floor(clock / (BURST_CONFIG.simple.period * 1000))
    const w = windows.get(key)
    if (!w || w.start !== start) windows.set(key, { start, n: 1 })
    else w.n++
    return { success: windows.get(key)!.n <= BURST_CONFIG.simple.limit }
  },
}
/** Moves the clock to the start of the next minute's window. */
const nextMinute = () => (clock = (Math.floor(clock / 60_000) + 1) * 60_000)

/** A 16 kHz mono 16-bit PCM WAV of `seconds`, like the app sends. */
function makeWav(seconds: number, sampleRate = 16000): Uint8Array {
  const n = Math.round(seconds * sampleRate)
  const buf = new ArrayBuffer(44 + n * 2)
  const v = new DataView(buf)
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE')
  w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true)
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  w(36, 'data'); v.setUint32(40, n * 2, true)
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(3000 * Math.sin((2 * Math.PI * 440 * i) / sampleRate)), true)
  return new Uint8Array(buf)
}

// Who is calling: the same phone through the app and through a browser differ only in these headers.
const CLIENTS = {
  ios: { origin: 'capacitor://localhost', 'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' },
  android: { origin: 'https://localhost', 'user-agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36' },
  browser: { origin: 'https://i-muslim-next.alkhammashtalal.workers.dev', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36' },
} as const
type Client = keyof typeof CLIENTS

let db: SqliteD1
let env: Env
let pushKeys: { p256dh: string; auth: string }
const BASE = 'https://i-muslim-next.alkhammashtalal.workers.dev'

beforeAll(async () => {
  db = buildDb()
  const vapid = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])) as CryptoKeyPair
  const ua = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
  pushKeys = { p256dh: bytesToB64url(new Uint8Array((await crypto.subtle.exportKey('raw', ua.publicKey)) as ArrayBuffer)), auth: bytesToB64url(crypto.getRandomValues(new Uint8Array(16))) }
  env = {
    DB: db,
    IP_SALT: 'test-salt',
    LLM_MODE: 'mock',
    READER_EXPLAIN: 'true',
    VAPID_PUBLIC_KEY: bytesToB64url(new Uint8Array((await crypto.subtle.exportKey('raw', vapid.publicKey)) as ArrayBuffer)),
    VAPID_PRIVATE_KEY: (await crypto.subtle.exportKey('jwk', vapid.privateKey)).d!,
    // bge-m3 for a question's vector, Whisper otherwise. The language model itself is mocked (LLM_MODE=mock).
    AI: {
      run: async (model: string, input: { text?: string[] }) =>
        model === EMBED_MODEL ? { data: (input.text ?? []).map(() => new Array(1024).fill(0.01)) } : { text: 'ما أركان الإسلام', transcription_info: { language: 'ar' } },
    },
    // Two passages of data/samples (loaded below), above the retrieval threshold, for every question that reaches it.
    VECTORIZE: { query: async () => ({ matches: [{ id: 'quran:2:183', score: 0.9 }, { id: 'quran:2:43', score: 0.85 }] }) },
    ASSETS: { fetch: async () => new Response('asset') },
    BURST,
  } as unknown as Env
  // data/samples (in git), so a question can be answered and an ayah explained in a clean checkout too; the full data,
  // when present, keeps its own rows.
  const COLUMNS = ['id', 'source', 'kind', 'ref', 'url', 'text', 'text_en', 'text_search', 'embed_text', 'book', 'chapter', 'sura', 'aya', 'page']
  const ins = db.db.prepare(`INSERT OR IGNORE INTO passages (${COLUMNS.join(', ')}, extra) VALUES (${COLUMNS.map(() => '?').join(', ')}, ?)`)
  for (const f of ['quran.sample.jsonl', 'aqeedah.sample.jsonl'])
    for (const line of fs.readFileSync(path.join(ROOT, 'data/samples', f), 'utf8').trim().split('\n')) {
      const r = JSON.parse(line) as Record<string, string | number | null>
      ins.run(...COLUMNS.map((c) => r[c] ?? null), JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => !COLUMNS.includes(k)))))
    }
  // Overpass, for the mosques route (no edge cache in tests, so every lookup is a miss and would reach it).
  vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ elements: [] })))
})
afterAll(() => vi.unstubAllGlobals())

type Route = {
  name: string
  scope: string
  limit: number
  /** One request; `n` varies what must vary so that a request is counted (an explanation not cached yet). */
  request: (ip: string, client: Client, n: number) => Request
  ok: number
}

const post = (path: string, ip: string, client: Client, body: BodyInit, type = 'application/json') =>
  new Request(`${BASE}${path}`, { method: 'POST', headers: { 'content-type': type, 'cf-connecting-ip': ip, ...CLIENTS[client] }, body })
const EXPLAIN_IDS = ['quran:1:1', 'quran:112:1', 'quran:2:255', 'quran:103:1', 'quran:108:1', 'quran:110:1', 'quran:114:1', 'quran:113:1', 'quran:1:2', 'quran:1:3', 'quran:1:4', 'quran:1:5']

const ROUTES: Route[] = [
  // A question the level gate refers (C), so no model is called; it still counts, as every question does.
  { name: '/api/ask', scope: 'ask', limit: limits.dailyPerDevice, ok: 200, request: (ip, c) => post('/api/ask', ip, c, JSON.stringify({ q: 'هل هذا حلال ام حرام', lang: 'ar' })) },
  // Only a new model call counts (a cached explanation never does), under the same counter as questions.
  { name: '/api/explain', scope: 'ask', limit: limits.dailyPerDevice, ok: 200, request: (ip, c, n) => post('/api/explain', ip, c, JSON.stringify({ id: EXPLAIN_IDS[n], lang: 'fr' })) },
  { name: '/api/transcribe', scope: 'voice', limit: DAILY_RECORDINGS, ok: 200, request: (ip, c) => post('/api/transcribe', ip, c, makeWav(1), 'audio/wav') },
  { name: '/api/report', scope: 'report', limit: limits.reportsPerDay, ok: 200, request: (ip, c) => post('/api/report', ip, c, JSON.stringify({ kind: 'support', note: 'رسالة تجريبية' })) },
  { name: '/api/lang-request', scope: 'lang', limit: LANG_REQUESTS_PER_DAY, ok: 200, request: (ip, c) => post('/api/lang-request', ip, c, JSON.stringify({ text: 'klingon' })) },
  {
    name: '/api/mosques',
    scope: 'mosques',
    limit: limits.mosquesPerDay,
    ok: 200,
    request: (ip, c) => new Request(`${BASE}/api/mosques?cell=24.70,46.70&lang=ar`, { headers: { 'cf-connecting-ip': ip, ...CLIENTS[c] } }),
  },
  {
    name: '/api/push/subscribe',
    scope: 'push',
    limit: limits.pushSubscribesPerDay,
    ok: 200,
    request: (ip, c) =>
      post(
        '/api/push/subscribe',
        ip,
        c,
        JSON.stringify({ subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/abuse-test', keys: pushKeys }, cell: { lat: 24.7, lng: 46.7 }, tz: 'Asia/Riyadh', prayers: ['fajr'], ward: null, lang: 'ar' }),
      ),
  },
]

const call = (r: Request) => worker.fetch(r, env)
/** Puts this month's recorded model usage at the given numbers; returns a function that puts the row back. */
function setUsage(calls: number, tokensIn: number, tokensOut: number): () => void {
  const month = riyadhMonth()
  const before = db.db.prepare('SELECT llm_calls, tokens_in, tokens_out FROM usage_monthly WHERE month = ?').get(month) as
    | { llm_calls: number; tokens_in: number; tokens_out: number }
    | undefined
  const put = (a: number, b: number, c: number) =>
    db.db.prepare('INSERT OR REPLACE INTO usage_monthly (month, llm_calls, tokens_in, tokens_out) VALUES (?, ?, ?, ?)').run(month, a, b, c)
  put(calls, tokensIn, tokensOut)
  return () => put(before?.llm_calls ?? 0, before?.tokens_in ?? 0, before?.tokens_out ?? 0)
}
const count = async (scope: string, ip: string) =>
  (db.db.prepare('SELECT count FROM usage_daily WHERE day = ? AND ip_hash = ?').get(riyadhDay(), `${scope}:${await deviceKey('test-salt', ip, riyadhDay())}`) as { count: number } | undefined)?.count ?? 0
/** Puts the device's counter at `n`, as if it had made n counted requests today. */
const setCount = async (scope: string, ip: string, n: number) =>
  db.db.prepare('INSERT OR REPLACE INTO usage_daily (day, ip_hash, count) VALUES (?, ?, ?)').run(riyadhDay(), `${scope}:${await deviceKey('test-salt', ip, riyadhDay())}`, n)

describe('the limits the reports quote (out/0033-abuse.md; reply 0037 §5): change them together', () => {
  it('per device per day and per minute, and the two global monthly caps', () => {
    expect({
      ask_and_explain: limits.dailyPerDevice,
      new_answers: limits.newAnswersPerDevice,
      burst_per_minute: limits.burstPerMinute,
      transcribe: DAILY_RECORDINGS,
      report: limits.reportsPerDay,
      lang_request: LANG_REQUESTS_PER_DAY,
      mosques: limits.mosquesPerDay,
      push_subscribe: limits.pushSubscribesPerDay,
      monthly_budget_usd: limits.monthlyBudgetUsd,
      monthly_recordings: limits.monthlyRecordings,
    }).toEqual({
      ask_and_explain: 300,
      new_answers: 60,
      burst_per_minute: 6,
      transcribe: 100,
      report: 10,
      lang_request: 5,
      mosques: 30,
      push_subscribe: 50,
      monthly_budget_usd: 50,
      monthly_recordings: 20000,
    })
    expect('monthlyLlmCalls' in limits).toBe(false) // the 30,000-call cap is gone
  })

  it('the budget is priced at the configured model’s published price, with its source and date', () => {
    expect(llmConfig.model).toBe('@cf/deepseek-ai/deepseek-v4-flash-0731')
    expect((limits.llmPriceUsdPerMTokens as Record<string, unknown>)[llmConfig.model]).toEqual({ input: 0.44, output: 1.32 })
    expect(limits.pricesSource).toBe('https://developers.cloudflare.com/workers-ai/platform/pricing/')
    expect(limits.pricesReadOn).toBe('2026-10-13')
    // The measured average question (out/0033-abuse.md §4: 3,769 tokens in, 40 out) costs about $0.00171.
    expect(spentUsd(3769, 40)).toBeCloseTo(0.00171, 5)
    expect(spentUsd(1_000_000, 1_000_000)).toBeCloseTo(1.76, 10)
  })

  it('the burst binding is in env.next only, with the limit limits.json names; scripts/wr.sh decides as before', () => {
    expect(WRANGLER.ratelimits).toBeUndefined() // the frozen top level (production) is not touched
    expect(WRANGLER.env.next.ratelimits).toEqual([{ name: 'BURST', namespace_id: '37001', simple: { limit: limits.burstPerMinute, period: 60 } }])
    const wr = (args: string[]) =>
      spawnSync('bash', [path.join(ROOT, 'scripts/wr.sh'), ...args], { cwd: path.join(ROOT, 'worker'), env: { ...process.env, WR_DRY: '1' }, encoding: 'utf8' })
    expect(wr(['deploy', '--env', 'next', '--dry-run']).stdout).toContain('ALLOW: deploy to i-muslim-next')
    expect(wr(['deploy']).status).toBe(2)
    expect(wr(['dev']).stdout).toContain('ALLOW: local dev')
  })
})

// /api/explain reads the ayah's al-Muyassar from data/processed, which a clean checkout (scripts/deploy.sh) does not have.
const runs = (r: (typeof ROUTES)[number]) => r.name !== '/api/explain' || hasFullData
describe.each(ROUTES.map((r, i) => [r.name, r, i] as const))('%s', (_name, route, i) => {
  const ip = `198.51.100.${10 + i}` // one address per route: /api/ask and /api/explain share a counter
  const other = `203.0.113.${10 + i}`

  it.skipIf(!runs(route))(`the native app is counted like the browser: request ${route.limit} passes, ${route.limit + 1} is 429 from the app and from the browser`, async () => {
    await setCount(route.scope, ip, route.limit - 1)
    const last = await call(route.request(ip, 'ios', 0))
    expect(last.status).toBe(route.ok)
    expect(await count(route.scope, ip)).toBe(route.limit)
    for (const [client, n] of [['browser', 1], ['ios', 2], ['android', 3]] as const) {
      const over = await call(route.request(ip, client, n))
      expect(over.status, client).toBe(429)
      const body = (await over.json()) as { error?: string; code?: string } // /api/ask: { type, code, message }; the others: { error }
      expect(body.error ?? body.code, client).toBe('rate_limited')
    }
  })

  it.skipIf(!runs(route))('another address keeps its own allowance', async () => {
    await setCount(route.scope, ip, route.limit + 5)
    expect((await call(route.request(other, 'android', 4))).status).toBe(route.ok)
  })

  it.skipIf(!runs(route))('an IPv6 device cannot escape by changing the last 64 bits; another /64 is another device', async () => {
    const a = `2001:db8:${(i + 1).toString(16)}:42::1`
    await setCount(route.scope, a, route.limit)
    expect((await call(route.request(`2001:0DB8:${(i + 1).toString(16)}:0042:dead:beef:0:7`, 'ios', 5))).status).toBe(429)
    expect((await call(route.request(`2001:db8:${(i + 1).toString(16)}:43::1`, 'ios', 6))).status).toBe(route.ok)
  })

  it.skipIf(!runs(route))('a CORS preflight (OPTIONS, as the WebView sends before a cross-origin POST) is never counted', async () => {
    const before = await count(route.scope, `192.0.2.${10 + i}`)
    const r = route.request(`192.0.2.${10 + i}`, 'ios', 7)
    await call(new Request(r.url, { method: 'OPTIONS', headers: { 'cf-connecting-ip': `192.0.2.${10 + i}`, origin: CLIENTS.ios.origin, 'access-control-request-method': r.method, 'access-control-request-headers': 'content-type' } }))
    expect(await count(route.scope, `192.0.2.${10 + i}`)).toBe(before)
  })
})

describe('/api/ask answers 429 with its message (the app shows it as it is)', () => {
  it('rate_limited with the interface text, status 429', async () => {
    const ip = '198.51.100.90'
    await setCount('ask', ip, limits.dailyPerDevice)
    const r = await call(post('/api/ask', ip, 'ios', JSON.stringify({ q: 'كيف أتوضأ؟', lang: 'en' })))
    expect(r.status).toBe(429)
    expect(await r.json()).toMatchObject({ type: 'error', code: 'rate_limited' })
  })
})

describe.skipIf(!hasFullData)('/api/explain past the limits', () => {
  it('a cached explanation still works at the daily limit; a new one is 429', async () => {
    const ip = '198.51.100.91'
    expect((await call(post('/api/explain', ip, 'ios', JSON.stringify({ id: 'quran:1:6', lang: 'es' })))).status).toBe(200)
    await setCount('ask', ip, limits.dailyPerDevice)
    expect((await call(post('/api/explain', ip, 'ios', JSON.stringify({ id: 'quran:1:6', lang: 'es' })))).status).toBe(200)
    expect((await call(post('/api/explain', ip, 'ios', JSON.stringify({ id: 'quran:1:7', lang: 'es' })))).status).toBe(429)
  })

  it('stops at the monthly budget (503 monthly_cap) while cached explanations keep working', async () => {
    const ip = '198.51.100.92'
    expect((await call(post('/api/explain', ip, 'android', JSON.stringify({ id: 'quran:2:1', lang: 'tr' })))).status).toBe(200)
    const restore = setUsage(0, 113_636_364, 0) // 113,636,364 × $0.44/M = $50.0000002
    try {
      const capped = await call(post('/api/explain', ip, 'android', JSON.stringify({ id: 'quran:2:2', lang: 'tr' })))
      expect(capped.status).toBe(503)
      expect(await capped.json()).toEqual({ error: 'monthly_cap' })
      expect((await call(post('/api/explain', ip, 'android', JSON.stringify({ id: 'quran:2:1', lang: 'tr' })))).status).toBe(200)
    } finally {
      restore()
    }
  })
})

describe('/api/mosques counts only lookups that reach Overpass', () => {
  it('a cell already in the edge cache is free; at the limit, only new cells are refused, before any request to Overpass', async () => {
    const ip = '198.51.100.93'
    const kept = new Map<string, string>()
    const cache = { match: async (k: Request) => (kept.has(k.url) ? new Response(kept.get(k.url)) : undefined), put: async (k: Request, v: Response) => void kept.set(k.url, await v.text()) }
    vi.stubGlobal('caches', { default: cache })
    let overpass = 0
    vi.stubGlobal('fetch', async () => (overpass++, new Response(JSON.stringify({ elements: [] }))))
    try {
      const get = (cell: string) => call(new Request(`${BASE}/api/mosques?cell=${cell}&lang=ar`, { headers: { 'cf-connecting-ip': ip, ...CLIENTS.ios } }))
      expect((await get('21.42,39.83')).status).toBe(200)
      expect([overpass, await count('mosques', ip)]).toEqual([1, 1])
      for (let k = 0; k < 5; k++) expect((await get('21.42,39.83')).status).toBe(200)
      expect([overpass, await count('mosques', ip)]).toEqual([1, 1])
      await setCount('mosques', ip, limits.mosquesPerDay)
      expect((await get('21.42,39.83')).status).toBe(200) // cached: still served
      expect((await get('21.43,39.83')).status).toBe(429) // new cell: refused
      expect(overpass).toBe(1)
    } finally {
      vi.stubGlobal('caches', undefined)
      vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ elements: [] })))
    }
  })
})

// Reply 0037 §5, through the whole Worker. A new answer is one the model is called for (LLM_MODE=mock here): a question
// past the cache and the FAQ with passages above the threshold, or an explanation not kept yet.
const ask = (ip: string, q: string, client: Client = 'ios', lang = 'ar') => call(post('/api/ask', ip, client, JSON.stringify({ q, lang })))
// Indonesian: a Latin-script language the mock text passes, and one no other test here asks explanations in.
const explain = (ip: string, id: string, lang = 'id') => call(post('/api/explain', ip, 'ios', JSON.stringify({ id, lang })))

describe('new answers: 60 a day per device', () => {
  it('60 new answers pass and the 61st is 429 answers_limited, while a cached answer still answers', async () => {
    const ip = '198.51.100.120'
    for (let i = 0; i < limits.newAnswersPerDevice; i++) {
      nextMinute() // a minute apart: the burst is not what this test counts
      const r = await ask(ip, `ما فضل الصيام ${100 + i}`, (['ios', 'android', 'browser'] as const)[i % 3])
      expect(r.status, `new answer ${i + 1}`).toBe(200)
      expect(await r.json(), `new answer ${i + 1}`).toMatchObject({ type: 'answer', fromCache: false })
    }
    expect(await count('llm', ip)).toBe(60)
    nextMinute()
    const over = await ask(ip, 'ما فضل الصيام 999')
    expect(over.status).toBe(429)
    expect(await over.json()).toEqual({ type: 'error', code: 'answers_limited', message: ar.errAnswersLimited })
    // The same device, the same day: a question answered before comes from the cache, a referral from the gate.
    const cached = await ask(ip, 'ما فضل الصيام 100')
    expect(cached.status).toBe(200)
    expect(await cached.json()).toMatchObject({ type: 'answer', fromCache: true })
    expect(await (await ask(ip, 'هل هذا حلال ام حرام')).json()).toMatchObject({ type: 'referral' })
    expect(await count('llm', ip)).toBe(61) // refused calls are counted too; none of them reached the model
    // Every request still counts toward the 300 ceiling; another device keeps its own 60.
    expect(await count('ask', ip)).toBe(63)
    expect((await ask('203.0.113.120', 'ما فضل الصيام 999')).status).toBe(200)
  })

  it('an explanation not kept yet is a new answer too (the same 60); a kept one is not', async () => {
    const ip = '198.51.100.121'
    nextMinute()
    expect((await explain(ip, 'quran:2:255')).status).toBe(200)
    expect(await count('llm', ip)).toBe(1)
    await setCount('llm', ip, limits.newAnswersPerDevice)
    const over = await explain(ip, 'quran:2:256')
    expect(over.status).toBe(429)
    expect(await over.json()).toEqual({ error: 'answers_limited' })
    expect((await explain(ip, 'quran:2:255')).status).toBe(200) // kept: served
    expect((await ask(ip, 'ما فضل الصيام 100')).status).toBe(200) // a cached answer
  })
})

describe('new answers: 6 a minute per device (the Rate Limiting binding BURST)', () => {
  it('6 new answers in a minute pass and the 7th is 429 burst; it uses none of the day; cached answers answer; the next minute is open', async () => {
    const ip = '198.51.100.122'
    nextMinute()
    for (let i = 0; i < limits.burstPerMinute; i++) expect((await ask(ip, `ما فضل الصلاة ${100 + i}`)).status, `answer ${i + 1}`).toBe(200)
    const burst = await ask(ip, 'ما فضل الصلاة 200')
    expect(burst.status).toBe(429)
    expect(await burst.json()).toEqual({ type: 'error', code: 'burst', message: ar.errBurst })
    expect(await count('llm', ip)).toBe(6) // a call refused for a burst is not one of the day's 60
    expect(await (await ask(ip, 'ما فضل الصلاة 100')).json()).toMatchObject({ type: 'answer', fromCache: true })
    // The minute is shared with explanations, by the same daily key.
    const x = await explain(ip, 'quran:1:1', 'ms')
    expect(x.status).toBe(429)
    expect(await x.json()).toEqual({ error: 'burst' })
    // Another device is not held back; the next minute opens again.
    expect((await ask('203.0.113.122', 'ما فضل الصلاة 201')).status).toBe(200) // (not the 7th question: it would be cached)
    nextMinute()
    expect((await ask(ip, 'ما فضل الصلاة 200')).status).toBe(200)
    expect(await count('llm', ip)).toBe(7)
  })

  it('without the binding (as in wrangler’s frozen top level) or when it fails, the call goes on; the day’s 60 still hold', async () => {
    const ip = '198.51.100.123'
    const failing = { ...env, BURST: { limit: async () => Promise.reject(new Error('down')) } } as unknown as Env
    for (const e of [{ ...env, BURST: undefined } as Env, failing])
      for (let i = 0; i < 8; i++) expect((await worker.fetch(post('/api/ask', ip, 'ios', JSON.stringify({ q: `ما فضل الحج ${100 + i}`, lang: 'ar' })), e)).status).toBe(200)
    await setCount('llm', ip, limits.newAnswersPerDevice)
    expect((await worker.fetch(post('/api/ask', ip, 'ios', JSON.stringify({ q: 'ما فضل الحج 999', lang: 'ar' })), failing)).status).toBe(429)
  })
})

describe('the monthly budget: $50 of recorded tokens (replacing the 30,000-call cap)', () => {
  it('below $50 new answers pass whatever the number of calls; at $50 only the generated answer stops (503 monthly_cap)', async () => {
    const ip = '198.51.100.124'
    nextMinute()
    expect((await ask(ip, 'ما فضل الزكاة 100')).status).toBe(200) // cached for later
    expect((await explain(ip, 'quran:2:43')).status).toBe(200) // kept for later
    const question = 'ما فضل الزكاة سؤال معتمد'
    const plan = { v: 1, level: 'A', ids: ['quran:2:43'], hashes: {}, direct: { text: 'x', cites: ['quran:2:43'] }, explanation: [], considered: ['quran:2:43'] }
    db.db
      .prepare('INSERT INTO faq (lang, question, question_key, answer, approved_by, approved_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run('ar', question, await sha256Hex(tokenize(question).join(' ')), JSON.stringify(plan), 'reviewer', '2026-10-13')
    // 100,000 calls, far past the old cap, and $49.99: still under the budget.
    let restore = setUsage(100_000, 100_000_000, 4_537_879)
    try {
      expect(spentUsd(100_000_000, 4_537_879)).toBeCloseTo(49.99, 4)
      nextMinute()
      expect(await (await ask(ip, 'ما فضل الزكاة 101')).json()).toMatchObject({ type: 'answer', fromCache: false })
    } finally {
      restore()
    }
    restore = setUsage(0, 100_000_000, 4_545_455) // $50.0000006
    try {
      nextMinute()
      const capped = await ask(ip, 'ما فضل الزكاة 102')
      expect(capped.status).toBe(503)
      expect(await capped.json()).toEqual({ type: 'error', code: 'monthly_cap', message: ar.errMonthlyCap })
      // In the interface language, and for every device.
      expect(await (await ask('203.0.113.124', 'What is the virtue of zakah 102', 'android', 'en')).json()).toEqual({ type: 'error', code: 'monthly_cap', message: en.errMonthlyCap })
      // The rest keeps working: the cache, the approved FAQ, the gate's referral, a kept explanation, the reader, voice.
      expect(await (await ask(ip, 'ما فضل الزكاة 100')).json()).toMatchObject({ type: 'answer', fromCache: true })
      expect(await (await ask(ip, question)).json()).toMatchObject({ type: 'answer', reviewed: { at: '2026-10-13' } })
      expect(await (await ask(ip, 'هل هذا حلال ام حرام')).json()).toMatchObject({ type: 'referral' })
      expect((await explain(ip, 'quran:2:43')).status).toBe(200)
      const newExplain = await explain(ip, 'quran:2:183')
      expect(newExplain.status).toBe(503)
      expect(await newExplain.json()).toEqual({ error: 'monthly_cap' })
      expect((await call(new Request(`${BASE}/api/suras`))).status).toBe(200)
      expect((await call(post('/api/transcribe', ip, 'ios', makeWav(1), 'audio/wav'))).status).toBe(200)
      // The budget is not the device's day: a refusal here is not counted in the 60.
      const before = await count('llm', ip)
      nextMinute()
      await ask(ip, 'ما فضل الزكاة 103')
      expect(await count('llm', ip)).toBe(before)
    } finally {
      restore()
    }
  })
})

describe('/api/transcribe: a global cap of 20,000 recordings a month', () => {
  const month = () => riyadhMonth()
  const recordings = () => (db.db.prepare('SELECT count FROM recordings_monthly WHERE month = ?').get(month()) as { count: number } | undefined)?.count ?? 0
  const record = (ip: string, client: Client = 'ios') => call(post('/api/transcribe', ip, client, makeWav(1), 'audio/wav'))

  it('each recording that reaches Whisper counts once; silence and a device past its own 100 do not', async () => {
    const before = recordings()
    expect((await record('198.51.100.130')).status).toBe(200)
    expect(recordings()).toBe(before + 1)
    expect((await call(post('/api/transcribe', '198.51.100.130', 'ios', makeWav(0.1), 'audio/wav'))).status).toBe(200) // too short: empty
    await setCount('voice', '198.51.100.131', DAILY_RECORDINGS)
    expect((await record('198.51.100.131')).status).toBe(429)
    expect(recordings()).toBe(before + 1)
  })

  it('recording 20,000 passes and 20,001 is 503 monthly_cap for every device; a refused one is not counted', async () => {
    const before = recordings()
    db.db.prepare('INSERT OR REPLACE INTO recordings_monthly (month, count) VALUES (?, ?)').run(month(), limits.monthlyRecordings - 1)
    try {
      expect((await record('198.51.100.132')).status).toBe(200)
      expect(recordings()).toBe(20_000)
      for (const [ip, client] of [['198.51.100.132', 'ios'], ['203.0.113.132', 'android'], ['192.0.2.132', 'browser']] as const) {
        const r = await record(ip, client)
        expect(r.status, client).toBe(503)
        expect(await r.json(), client).toEqual({ error: 'monthly_cap' })
      }
      expect(recordings()).toBe(20_000)
      // Typing still works: a question is not a recording.
      expect((await ask('198.51.100.132', 'هل هذا حلال ام حرام')).status).toBe(200)
    } finally {
      db.db.prepare('INSERT OR REPLACE INTO recordings_monthly (month, count) VALUES (?, ?)').run(month(), before)
    }
  })
})

describe('the counters hold no address', () => {
  it('usage_daily keys are scope:HMAC only', async () => {
    const rows = db.db.prepare('SELECT ip_hash FROM usage_daily').all() as { ip_hash: string }[]
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect(r.ip_hash).toMatch(/^(ask|llm|voice|report|lang|mosques|push):[0-9a-f]{64}$/)
    expect(rows.some((r) => r.ip_hash.startsWith('llm:'))).toBe(true)
    // The burst binding is given the daily key too, never an address; the recordings' cap is a number per month.
    expect(burstKeys.size).toBeGreaterThan(0)
    for (const k of burstKeys) expect(k).toMatch(/^llm:[0-9a-f]{64}$/)
    expect(JSON.stringify(db.db.prepare('SELECT * FROM recordings_monthly').all())).toMatch(/^\[\{"month":"\d{4}-\d{2}","count":\d+\}\]$/)
    const dump = JSON.stringify(db.db.prepare('SELECT * FROM usage_daily').all())
    for (const s of ['198.51.100', '203.0.113', '2001:db8', '192.0.2']) expect(dump).not.toContain(s)
  })
})

describe('limitAddress: the address a daily limit counts by', () => {
  it('IPv4 as it is', () => {
    expect(limitAddress('203.0.113.7')).toBe('203.0.113.7')
    expect(limitAddress(' 203.0.113.7 ')).toBe('203.0.113.7')
    expect(limitAddress('unknown')).toBe('unknown')
  })
  it('IPv6 by its /64, whatever the spelling', () => {
    const want = '2001:db8:85a3:8d3::/64'
    for (const a of ['2001:db8:85a3:8d3:1319:8a2e:370:7348', '2001:0DB8:85A3:08D3:0000:0000:0000:0001', '2001:db8:85a3:8d3::', '2001:db8:85a3:8d3::ffff:1', '2001:db8:85a3:8d3::9%en0'])
      expect(limitAddress(a), a).toBe(want)
    expect(limitAddress('2001:db8:85a3:8d4::1')).toBe('2001:db8:85a3:8d4::/64')
    expect(limitAddress('2001:db8::1')).toBe('2001:db8:0:0::/64')
    expect(limitAddress('::1')).toBe('0:0:0:0::/64')
  })
  it('an IPv4-mapped IPv6 address counts as its IPv4 address', () => {
    expect(limitAddress('::ffff:203.0.113.7')).toBe('203.0.113.7')
    expect(limitAddress('::FFFF:cb00:7107')).toBe('203.0.113.7')
    expect(limitAddress('0:0:0:0:0:ffff:203.0.113.7')).toBe('203.0.113.7')
  })
  it('anything unreadable is used as it is (never merged with another address)', () => {
    for (const a of ['1:2:3', '1::2::3', '2001:db8:gggg::1', '1:2:3:4:5:6:7:8:9', '::ffff:300.1.1.1']) expect(limitAddress(a), a).toBe(a)
  })
  it('the device key differs per /64 and per day, and is the same within a /64', async () => {
    const day = '2026-10-13'
    expect(await deviceKey('s', '2001:db8:1:2::1', day)).toBe(await deviceKey('s', '2001:db8:1:2:aaaa::7', day))
    expect(await deviceKey('s', '2001:db8:1:2::1', day)).not.toBe(await deviceKey('s', '2001:db8:1:3::1', day))
    expect(await deviceKey('s', '2001:db8:1:2::1', day)).not.toBe(await deviceKey('s', '2001:db8:1:2::1', '2026-10-14'))
    expect(await deviceKey('s', '::ffff:203.0.113.7', day)).toBe(await deviceKey('s', '203.0.113.7', day))
  })
})

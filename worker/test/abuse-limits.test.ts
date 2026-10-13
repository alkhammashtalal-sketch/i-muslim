// Reply 0033 §د «الحماية من الإساءة»: every route that costs money or reaches a third party has a per-device daily
// limit, answers 429 one request past it, and counts the native app (Capacitor's WebView, origin capacitor://localhost
// on iOS and https://localhost on Android) exactly like the browser: the key is the address Cloudflare saw
// (cf-connecting-ip, which a client cannot set), HMAC'd with the day; never the origin, the user agent or a cookie.
// Everything here goes through the whole Worker (src/index.ts), so the routing is tested with the limits.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import limits from '../src/config/limits.json'
import worker, { type Env } from '../src/index'
import { LANG_REQUESTS_PER_DAY } from '../src/lang-request'
import { deviceKey, limitAddress, riyadhDay, riyadhMonth } from '../src/lib/keys'
import { bytesToB64url } from '../src/push/webpush'
import { DAILY_RECORDINGS } from '../src/transcribe'
import { buildDb, type SqliteD1 } from './d1-sqlite'

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
    // Whisper; no other model is reached in these tests (questions are referred by the gate, explanations are mocked).
    AI: { run: async () => ({ text: 'ما أركان الإسلام', transcription_info: { language: 'ar' } }) },
    VECTORIZE: { query: async () => ({ matches: [] }) },
    ASSETS: { fetch: async () => new Response('asset') },
  } as unknown as Env
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
const count = async (scope: string, ip: string) =>
  (db.db.prepare('SELECT count FROM usage_daily WHERE day = ? AND ip_hash = ?').get(riyadhDay(), `${scope}:${await deviceKey('test-salt', ip, riyadhDay())}`) as { count: number } | undefined)?.count ?? 0
/** Puts the device's counter at `n`, as if it had made n counted requests today. */
const setCount = async (scope: string, ip: string, n: number) =>
  db.db.prepare('INSERT OR REPLACE INTO usage_daily (day, ip_hash, count) VALUES (?, ?, ?)').run(riyadhDay(), `${scope}:${await deviceKey('test-salt', ip, riyadhDay())}`, n)

describe('the limits the report quotes (out/0033-abuse.md): change both together', () => {
  it('per device per day, and the monthly model cap', () => {
    expect({
      ask_and_explain: limits.dailyPerDevice,
      transcribe: DAILY_RECORDINGS,
      report: limits.reportsPerDay,
      lang_request: LANG_REQUESTS_PER_DAY,
      mosques: limits.mosquesPerDay,
      push_subscribe: limits.pushSubscribesPerDay,
      monthly_llm_calls: limits.monthlyLlmCalls,
    }).toEqual({ ask_and_explain: 300, transcribe: 100, report: 10, lang_request: 5, mosques: 30, push_subscribe: 50, monthly_llm_calls: 30000 })
  })
})

describe.each(ROUTES.map((r, i) => [r.name, r, i] as const))('%s', (_name, route, i) => {
  const ip = `198.51.100.${10 + i}` // one address per route: /api/ask and /api/explain share a counter
  const other = `203.0.113.${10 + i}`

  it(`the native app is counted like the browser: request ${route.limit} passes, ${route.limit + 1} is 429 from the app and from the browser`, async () => {
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

  it('another address keeps its own allowance', async () => {
    await setCount(route.scope, ip, route.limit + 5)
    expect((await call(route.request(other, 'android', 4))).status).toBe(route.ok)
  })

  it('an IPv6 device cannot escape by changing the last 64 bits; another /64 is another device', async () => {
    const a = `2001:db8:${(i + 1).toString(16)}:42::1`
    await setCount(route.scope, a, route.limit)
    expect((await call(route.request(`2001:0DB8:${(i + 1).toString(16)}:0042:dead:beef:0:7`, 'ios', 5))).status).toBe(429)
    expect((await call(route.request(`2001:db8:${(i + 1).toString(16)}:43::1`, 'ios', 6))).status).toBe(route.ok)
  })

  it('a CORS preflight (OPTIONS, as the WebView sends before a cross-origin POST) is never counted', async () => {
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

describe('/api/explain past the limits', () => {
  it('a cached explanation still works at the daily limit; a new one is 429', async () => {
    const ip = '198.51.100.91'
    expect((await call(post('/api/explain', ip, 'ios', JSON.stringify({ id: 'quran:1:6', lang: 'es' })))).status).toBe(200)
    await setCount('ask', ip, limits.dailyPerDevice)
    expect((await call(post('/api/explain', ip, 'ios', JSON.stringify({ id: 'quran:1:6', lang: 'es' })))).status).toBe(200)
    expect((await call(post('/api/explain', ip, 'ios', JSON.stringify({ id: 'quran:1:7', lang: 'es' })))).status).toBe(429)
  })

  it('stops at the monthly model cap (503 monthly_cap) while cached explanations keep working', async () => {
    const ip = '198.51.100.92'
    expect((await call(post('/api/explain', ip, 'android', JSON.stringify({ id: 'quran:2:1', lang: 'tr' })))).status).toBe(200)
    const before = db.db.prepare('SELECT llm_calls FROM usage_monthly WHERE month = ?').get(riyadhMonth()) as { llm_calls: number } | undefined
    db.db.prepare('INSERT OR REPLACE INTO usage_monthly (month, llm_calls) VALUES (?, ?)').run(riyadhMonth(), limits.monthlyLlmCalls)
    try {
      const capped = await call(post('/api/explain', ip, 'android', JSON.stringify({ id: 'quran:2:2', lang: 'tr' })))
      expect(capped.status).toBe(503)
      expect(await capped.json()).toEqual({ error: 'monthly_cap' })
      expect((await call(post('/api/explain', ip, 'android', JSON.stringify({ id: 'quran:2:1', lang: 'tr' })))).status).toBe(200)
    } finally {
      db.db.prepare('INSERT OR REPLACE INTO usage_monthly (month, llm_calls) VALUES (?, ?)').run(riyadhMonth(), before?.llm_calls ?? 0)
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

describe('the counters hold no address', () => {
  it('usage_daily keys are scope:HMAC only', async () => {
    const rows = db.db.prepare('SELECT ip_hash FROM usage_daily').all() as { ip_hash: string }[]
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect(r.ip_hash).toMatch(/^(ask|voice|report|lang|mosques|push):[0-9a-f]{64}$/)
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

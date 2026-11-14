// Quran Foundation's Content API through our server (add-on 0071-add14; src/qf.ts): the token by client credentials,
// kept until close to its expiry; the secret never in an answer; six days of cache, under their week; 404 without the
// keys (every environment but v11); the transliteration by verse key; Ibn Kathir's English as headings and paragraphs.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../src/index'
import { accessToken, blocksOf, CACHE_S, handleQf, QF_CREDIT, resetToken } from '../src/qf'

const ID = 'client-id-test'
const SECRET = 'qfcs_secret_test'
const env = { QF_CLIENT_ID: ID, QF_CLIENT_SECRET: SECRET } as Env

function fakeQf(o: { status?: number; firstUnauthorized?: boolean } = {}) {
  const calls: { url: string; headers: Record<string, string> }[] = []
  let issued = 0
  let unauthorizedOnce = o.firstUnauthorized ?? false
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const headers = Object.fromEntries(Object.entries((init?.headers as Record<string, string>) ?? {}).map(([k, v]) => [k.toLowerCase(), v]))
    calls.push({ url, headers })
    if (url.endsWith('/oauth2/token')) {
      issued++
      return new Response(JSON.stringify({ access_token: `tok-${issued}`, expires_in: 3600, scope: 'content' }), { status: 200 })
    }
    if (unauthorizedOnce) {
      unauthorizedOnce = false
      return new Response('{}', { status: 401 })
    }
    if (o.status) return new Response('{}', { status: o.status })
    if (url.includes('/quran/translations/57?chapter_number=1')) {
      return new Response(JSON.stringify({ translations: [{ verse_key: '1:1', text: 'Bismi Allahi arrahmani arraheem' }, { verse_key: '1:2', text: 'Alhamdu lillahi rabbi alAAalameen' }] }))
    }
    if (url.includes('/tafsirs/169/by_ayah/1:2')) {
      return new Response(JSON.stringify({ tafsir: { resource_name: 'Ibn Kathir (Abridged)', verses: { '1:2': { id: 2 } }, text: '<h2>The Meaning of Al-Hamd</h2><p>Abu Ja`far said &quot;all praise&quot;</p><p>الْحَمْدُ للَّهِ</p>' } }))
    }
    return new Response('{}', { status: 404 })
  })
  return { fetcher: fetcher as unknown as typeof fetch, calls, issued: () => issued }
}

const get = (path: string, f: typeof fetch, e: Env = env) => handleQf(new Request(`https://x${path}`), e, new URL(`https://x${path}`), f)

beforeEach(() => resetToken())

describe('the token (OAuth2 client credentials, prelive by default)', () => {
  it('asks once with Basic auth and the content scope, and keeps it until a minute before it expires', async () => {
    const q = fakeQf()
    const t0 = 1_000_000
    expect(await accessToken(env, q.fetcher, t0)).toBe('tok-1')
    expect(await accessToken(env, q.fetcher, t0 + 3_500_000)).toBe('tok-1')
    expect(await accessToken(env, q.fetcher, t0 + 3_545_000)).toBe('tok-2')
    const first = q.calls[0]
    expect(first.url).toBe('https://prelive-oauth2.quran.foundation/oauth2/token')
    expect(first.headers.authorization).toBe(`Basic ${btoa(`${ID}:${SECRET}`)}`)
  })

  it('none without the keys: every environment but v11 answers 404 and asks nothing', async () => {
    const q = fakeQf()
    const r = await get('/api/qf/translit/1', q.fetcher, {} as Env)
    expect(r!.status).toBe(404)
    expect(q.calls).toHaveLength(0)
  })
})

describe('the routes', () => {
  it('the transliteration by verse key, credited, kept six days (their week at most), the secret never in it', async () => {
    const q = fakeQf()
    const r = (await get('/api/qf/translit/1', q.fetcher))!
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe(`public, max-age=${CACHE_S}`)
    expect(CACHE_S).toBeLessThan(7 * 86_400)
    const body = await r.text()
    expect(body).not.toContain(SECRET)
    expect(body).not.toContain('tok-')
    expect(JSON.parse(body)).toEqual({
      sura: 1,
      ayat: [
        { aya: 1, text: 'Bismi Allahi arrahmani arraheem' },
        { aya: 2, text: 'Alhamdu lillahi rabbi alAAalameen' },
      ],
      resource: { id: 57, name: 'Transliteration' },
      source: QF_CREDIT,
    })
    const api = q.calls.find((c) => c.url.includes('/content/api/v4/'))!
    expect(api.url).toBe('https://apis-prelive.quran.foundation/content/api/v4/quran/translations/57?chapter_number=1&fields=verse_key')
    expect(api.headers['x-auth-token']).toBe('tok-1')
    expect(api.headers['x-client-id']).toBe(ID)
  })

  it('Ibn Kathir abridged in English: headings and paragraphs as given, entities decoded, the ayat it covers', async () => {
    const q = fakeQf()
    const j = await (await get('/api/qf/katheer-en/1/2', q.fetcher))!.json()
    expect(j).toMatchObject({
      id: 'quran:1:2',
      covers: ['1:2'],
      blocks: [
        { type: 'h', text: 'The Meaning of Al-Hamd' },
        { type: 'p', text: 'Abu Ja`far said "all praise"' },
        { type: 'p', text: 'الْحَمْدُ للَّهِ' },
      ],
      resource: { id: 169, name: 'Ibn Kathir (Abridged)' },
      source: QF_CREDIT,
    })
  })

  it('a 401 gets a new token once; a 429 is 503 to the app, never cached', async () => {
    const a = fakeQf({ firstUnauthorized: true })
    expect((await get('/api/qf/translit/1', a.fetcher))!.status).toBe(200)
    expect(a.issued()).toBe(2)
    resetToken()
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const b = fakeQf({ status: 429 })
    const r = (await get('/api/qf/translit/1', b.fetcher))!
    expect(r.status).toBe(503)
    expect(r.headers.get('cache-control')).toBe('no-store')
    expect(log.mock.calls.map((c) => String(c[0]))).toContain(JSON.stringify({ evt: 'qf_rate_limited' }))
    log.mockRestore()
  })

  it('only its two routes, and a sura in range', async () => {
    const q = fakeQf()
    expect((await get('/api/qf/translit/115', q.fetcher))!.status).toBe(404)
    expect((await get('/api/qf/anything', q.fetcher))!.status).toBe(404)
    expect(await handleQf(new Request('https://x/api/other'), env, new URL('https://x/api/other'), q.fetcher)).toBeNull()
  })

  it('blocksOf keeps only text: no tag, no script', () => {
    expect(blocksOf('<p>a <b>b</b> <script>x</script>c</p>')).toEqual([{ type: 'p', text: 'a b xc' }])
  })
})

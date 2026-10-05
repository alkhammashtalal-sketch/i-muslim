// Quran reader routes (command 09). Every query reads by key: suras(n), passages(id) or passages(sura, aya).
// No route returns the tafsir of a whole sura: tafsir is only served per ayah, by /api/passage/:id.
//   GET /api/suras          → SuraSummary[] (114)
//   GET /api/sura/:n[?en=1] → SuraResponse (ayah text; English meaning only with en=1)
//   GET /api/passage/:id    → PassageResponse
import type { SuraAyah, SuraResponse, SuraSummary } from '../../shared/api'
import type { Env } from './index'
import { getPassage } from './passage'

// Bump to invalidate edge-cached reader responses after a data fix.
const CACHE_VERSION = 'r1'
const LONG = 'public, max-age=86400, s-maxage=604800'

export const json = (data: unknown, status = 200, cache = LONG) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': status === 200 ? cache : 'no-store' },
  })
export const notFound = () => json({ ok: false, error: 'not_found' }, 404)

// Basmala shown at the head of every sura except al-Fatiha (where it is ayah 1) and at-Tawba (none).
export const BASMALA_ID = 'quran:1:1'
export const hasBasmala = (n: number) => n !== 1 && n !== 9

export async function listSuras(env: Env): Promise<SuraSummary[]> {
  const { results } = await env.DB.prepare('SELECT n, name, ayat, first_page AS page FROM suras ORDER BY n').all<SuraSummary>()
  return results
}

export async function getSura(env: Env, n: number, withEn: boolean): Promise<SuraResponse | null> {
  if (!Number.isInteger(n) || n < 1 || n > 114) return null
  const cols = withEn ? 'aya, id, text, page, text_en' : 'aya, id, text, page'
  const stmts = [
    env.DB.prepare('SELECT n, name FROM suras WHERE n = ?').bind(n),
    env.DB.prepare(`SELECT ${cols} FROM passages WHERE sura = ? ORDER BY aya`).bind(n),
  ]
  if (hasBasmala(n)) stmts.push(env.DB.prepare('SELECT text FROM passages WHERE id = ?').bind(BASMALA_ID))
  const [meta, ayat, basmala] = await env.DB.batch(stmts)
  const s = (meta.results as { n: number; name: string }[])[0]
  if (!s) return null
  return {
    n: s.n,
    name: s.name,
    basmala: basmala ? ((basmala.results as { text: string }[])[0]?.text ?? null) : null,
    ayat: (ayat.results as SuraAyah[]).map((a) => (withEn ? a : { aya: a.aya, id: a.id, text: a.text, page: a.page })),
  }
}

// Key = path + the one parameter that changes the body (en), so ?lang=… does not split the cache.
export async function edgeCached(url: URL, build: () => Promise<Response>): Promise<Response> {
  const cache = typeof caches !== 'undefined' ? (caches as unknown as { default?: Cache }).default : undefined
  if (!cache) return build()
  const en = url.searchParams.get('en') === '1' ? '&en=1' : ''
  const key = new Request(`${url.origin}${url.pathname}?v=${CACHE_VERSION}${en}`)
  const hit = await cache.match(key)
  if (hit) return hit
  const res = await build()
  if (res.status === 200) await cache.put(key, res.clone())
  return res
}

/** Returns a Response for reader routes, or null when the path is not one of them. */
export async function handleReader(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (request.method !== 'GET') return null
  const p = url.pathname

  if (p === '/api/suras') return edgeCached(url, async () => json(await listSuras(env)))

  const sura = p.match(/^\/api\/sura\/(\d{1,3})$/)
  if (sura) {
    const withEn = url.searchParams.get('en') === '1'
    return edgeCached(url, async () => {
      const s = await getSura(env, Number(sura[1]), withEn)
      return s ? json(s) : notFound()
    })
  }

  const passage = p.match(/^\/api\/passage\/([^/]+)$/)
  if (passage) {
    return edgeCached(url, async () => {
      let id: string
      try {
        id = decodeURIComponent(passage[1])
      } catch {
        return notFound()
      }
      const r = await getPassage(env, id)
      return r ? json(r) : notFound()
    })
  }
  return null
}

import pkg from '../package.json'

export interface Env {
  ASSETS: Fetcher
  DB: D1Database
  VECTORIZE: VectorizeIndex
  AI: Ai
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/health' && request.method === 'GET') {
      return json({ ok: true, version: pkg.version })
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ ok: false, error: 'not_found' }, 404)
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>

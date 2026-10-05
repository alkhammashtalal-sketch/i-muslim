import pkg from '../package.json'
import { adminEnabled, handleIndex, handleSearch } from './admin'

export interface Env {
  ASSETS: Fetcher
  DB: D1Database
  VECTORIZE: VectorizeIndex
  AI: Ai
  ADMIN_ENABLED?: string
  ADMIN_TOKEN?: string
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

    if (adminEnabled(env)) {
      if (url.pathname === '/api/admin/index' && request.method === 'POST') return handleIndex(request, env)
      if (url.pathname === '/api/search' && request.method === 'GET') return handleSearch(request, env)
    }

    if (url.pathname.startsWith('/api/')) {
      return json({ ok: false, error: 'not_found' }, 404)
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>

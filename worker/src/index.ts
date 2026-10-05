import pkg from '../package.json'
import { handleAdmin } from './admin'
import { handleAsk } from './ask'
import { handleLibrary } from './library'
import { handleReader } from './reader'
import { handleTranscribe } from './transcribe'
import { handleReport } from './report'
import { withSecurityHeaders } from './security'

export interface Env {
  ASSETS: Fetcher
  DB: D1Database
  VECTORIZE: VectorizeIndex
  AI: Ai
  ADMIN_ENABLED?: string
  ADMIN_TOKEN?: string
  LLM_API_KEY?: string
  LLM_MODE?: string
  EXPLAIN_MODE?: string
  IP_SALT?: string
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return withSecurityHeaders(await route(request, env))
  },
} satisfies ExportedHandler<Env>

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)

  if (url.pathname === '/api/health' && request.method === 'GET') {
    return json({ ok: true, version: pkg.version })
  }

  const admin = await handleAdmin(request, env, url.pathname)
  if (admin) return admin

  if (url.pathname === '/api/ask' && request.method === 'POST') return handleAsk(request, env)
  if (url.pathname === '/api/report' && request.method === 'POST') return handleReport(request, env)
  if (url.pathname === '/api/transcribe' && request.method === 'POST') return handleTranscribe(request, env)

  const reader = (await handleReader(request, env, url)) ?? (await handleLibrary(request, env, url))
  if (reader) return reader

  if (url.pathname.startsWith('/api/')) {
    return json({ ok: false, error: 'not_found' }, 404)
  }

  return env.ASSETS.fetch(request)
}

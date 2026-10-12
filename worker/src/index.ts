import pkg from '../package.json'
import { handleAdmin } from './admin'
import { handleAsk } from './ask'
import { handleLibrary } from './library'
import { handleAdhkar, handleToolHadith } from './adhkar'
import { handleHadith } from './hadith'
import { handleMosques } from './mosques'
import { handlePush, runDue } from './push/routes'
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
  MUKHTASAR_PUBLIC?: string
  MUKHTASAR_QURANENC?: string
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
  // Every minute in env.next (reply 0032 part E): the prayer bells that are due. Does nothing until VAPID is set.
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runDue(env).then((c) => (c.sent || c.gone || c.skipped ? console.log(JSON.stringify({ evt: 'push_due', ...c })) : undefined)))
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
  const push = await handlePush(request, env, url)
  if (push) return push

  const reader = (await handleReader(request, env, url)) ?? (await handleLibrary(request, env, url)) ?? (await handleMosques(request, env, url)) ?? (await handleHadith(request, env, url)) ?? (await handleToolHadith(request, env, url)) ?? (await handleAdhkar(request, env, url))
  if (reader) return reader

  if (url.pathname.startsWith('/api/')) {
    return json({ ok: false, error: 'not_found' }, 404)
  }

  return env.ASSETS.fetch(request)
}

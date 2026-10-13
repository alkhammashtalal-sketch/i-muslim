import pkg from '../package.json'
import { handleAdmin } from './admin'
import { handleAsk } from './ask'
import { handleLibrary } from './library'
import { handleAdhkar, handleToolHadith } from './adhkar'
import { handleHadith } from './hadith'
import { handleLangRequest } from './lang-request'
import { handleMosques } from './mosques'
import { handlePush, runDue } from './push/routes'
import { handleReader } from './reader'
import { handleTranscribe } from './transcribe'
import { handleReport } from './report'
import { checkSources, handleSources, SOURCES_CRON } from './sources'
import { withSecurityHeaders } from './security'
import { corsPreflight, withCors } from './cors'

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
    // /api/* answers the iOS and Android apps and the site Worker too (src/cors.ts), and nobody else cross-origin.
    if (new URL(request.url).pathname.startsWith('/api/')) {
      const preflight = corsPreflight(request)
      return withSecurityHeaders(preflight ?? withCors(request, await route(request, env)))
    }
    return withSecurityHeaders(await route(request, env))
  },
  // Two crons in env.next, told apart by event.cron. Every minute (reply 0032 part E): the prayer bells that are due,
  // nothing until VAPID is set. The first of each month at 03:00 UTC (reply 0033 §أ3): «نتابع إصداراتهم», the sources'
  // versions against ours (worker/src/sources.ts); a newer one is recorded, never applied.
  async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    if (event.cron === SOURCES_CRON) {
      ctx.waitUntil(
        checkSources(env).then(
          (r) => console.log(JSON.stringify({ evt: 'sources_check', day: r.day, checked: r.checked, pending: r.pending.length })),
          (e) => console.log(JSON.stringify({ evt: 'sources_check_failed', error: String(e instanceof Error ? e.message : e) })),
        ),
      )
      return
    }
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
  if (url.pathname === '/api/lang-request' && request.method === 'POST') return handleLangRequest(request, env)
  const push = await handlePush(request, env, url)
  if (push) return push
  const sources = await handleSources(request, env, url)
  if (sources) return sources

  const reader = (await handleReader(request, env, url)) ?? (await handleLibrary(request, env, url)) ?? (await handleMosques(request, env, url)) ?? (await handleHadith(request, env, url)) ?? (await handleToolHadith(request, env, url)) ?? (await handleAdhkar(request, env, url))
  if (reader) return reader

  if (url.pathname.startsWith('/api/')) {
    return json({ ok: false, error: 'not_found' }, 404)
  }

  return env.ASSETS.fetch(request)
}

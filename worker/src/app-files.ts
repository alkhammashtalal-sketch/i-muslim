// The static files the iOS/Android app reads through /api/ with the connection (reply 0037 §3.4; shared/app-files.ts):
//   GET /api/config/hijri               → web/public/config/hijri.json
//   GET /api/reviewed/:lang/:sura/:aya  → web/public/explain/:lang/:sura_:aya.json (404 when not published)
// Answered with the deployed static file's own bytes, read from this Worker's assets (env.ASSETS): no copy to keep in
// step, no D1 read. A short cache, so a new Hijri offset or a withdrawn translation reaches the app within minutes.
// CORS comes from index.ts, as for every /api/* answer.
import { appFileOf } from '../../shared/app-files'
import type { Env } from './index'

export const APP_FILE_CACHE = 'public, max-age=300'

const notFound = () =>
  new Response(JSON.stringify({ ok: false, error: 'not_found' }), { status: 404, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } })

/** The answer to one of these routes, or null when the request is not one of them. */
export async function handleAppFiles(request: Request, env: Env, url: URL): Promise<Response | null> {
  if (request.method !== 'GET') return null
  const file = appFileOf(url.pathname)
  if (!file) return null
  const res = await env.ASSETS.fetch(new Request(new URL(`/${file}`, url.origin).href))
  // A missing file is answered with the app's index.html (not_found_handling: single-page-application): not JSON.
  if (!res.ok || !/\bjson\b/.test(res.headers.get('content-type') ?? '')) return notFound()
  return new Response(await res.arrayBuffer(), { status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': APP_FILE_CACHE } })
}

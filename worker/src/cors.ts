// Cross-origin access to /api/* (reply 0033 §ب2, 0033-add1 §5). The web app is served by this Worker and needs none.
// Exactly three other origins may call the API, and nothing else:
//   - capacitor://localhost   the iOS app (Capacitor's web view);
//   - https://localhost       the Android app (Capacitor's web view);
//   - the static site Worker i-muslim-site (privacy and support pages; its «تواصل معنا» form posts to /api/report).
// No credentials (no cookies, no Authorization): Access-Control-Allow-Credentials is never sent. Methods GET and POST,
// and the one request header the app sets (content-type). A preflight from any other origin is refused (403).

export const CORS_ORIGINS: readonly string[] = ['capacitor://localhost', 'https://localhost', 'https://i-muslim-site.alkhammashtalal.workers.dev']

const ALLOW_METHODS = 'GET, POST'
const ALLOW_HEADERS = 'content-type'
const MAX_AGE = '86400'

export const corsAllowed = (origin: string | null): origin is string => origin !== null && CORS_ORIGINS.includes(origin)

const addVary = (h: Headers) => {
  const v = h.get('vary')
  if (!v) h.set('vary', 'Origin')
  else if (!v.split(',').some((s) => s.trim().toLowerCase() === 'origin')) h.set('vary', `${v}, Origin`)
}

/**
 * The answer to a CORS preflight (OPTIONS with Access-Control-Request-Method) on /api/*, or null when the request is
 * not one. An allowed origin gets 204 with the allowed methods and headers; any other origin gets 403 with no CORS
 * header, so the browser blocks the real request.
 */
export function corsPreflight(request: Request): Response | null {
  if (request.method !== 'OPTIONS' || !request.headers.has('access-control-request-method')) return null
  const origin = request.headers.get('origin')
  if (!corsAllowed(origin)) {
    const res = new Response(JSON.stringify({ ok: false, error: 'origin_not_allowed' }), {
      status: 403,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })
    addVary(res.headers)
    return res
  }
  const res = new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': ALLOW_METHODS,
      'access-control-allow-headers': ALLOW_HEADERS,
      'access-control-max-age': MAX_AGE,
    },
  })
  addVary(res.headers)
  return res
}

/** The response with Access-Control-Allow-Origin when the request's Origin is one of the three; unchanged otherwise. */
export function withCors(request: Request, res: Response): Response {
  const origin = request.headers.get('origin')
  const out = new Response(res.body, res)
  // Every /api/* answer depends on the Origin header now, so a shared cache must keep them apart.
  addVary(out.headers)
  if (corsAllowed(origin)) out.headers.set('access-control-allow-origin', origin)
  return out
}

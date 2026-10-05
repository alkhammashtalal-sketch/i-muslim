// Security headers for responses the Worker builds (/api/*). Static files get the same headers from
// web/public/_headers (Workers Static Assets serves them without the Worker); a test keeps the two equal. Everything is served from this origin:
// no external scripts, styles, fonts or connections.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ')

export const HEADERS: Record<string, string> = {
  'content-security-policy': CSP,
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'permissions-policy': 'camera=(), microphone=(self), geolocation=(), payment=(), usb=(), browsing-topics=()',
  'x-frame-options': 'DENY',
  'strict-transport-security': 'max-age=31536000',
}

export function withSecurityHeaders(res: Response): Response {
  const out = new Response(res.body, res)
  for (const [k, v] of Object.entries(HEADERS)) out.headers.set(k, v)
  return out
}

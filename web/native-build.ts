// The native build's rules (reply 0033 §ب2), as pure functions: vite.config.ts uses them for `vite build --mode native`
// and worker/test/native-shell.test.ts checks them.
//
// - The API base: an https origin (for TestFlight the next Worker). Plain http is accepted for localhost only, so a
//   simulator build can talk to a local preview (`scripts/wr.sh dev --remote --env next --port …`). While FREEZE exists
//   (CLAUDE.md §13) the frozen live Worker is refused: the app must not call it.
// - The Content-Security-Policy: the web's own rules, read from web/public/_headers (the Worker's /api/* headers are the
//   same, worker/src/security.ts), carried by a <meta> in index.html because the app's files are not served by the
//   Worker, with the API origin added to connect-src. Nothing else is added: no new third party.

/** Where the TestFlight build talks to (reply 0033 §ب2). */
export const NATIVE_API_DEFAULT = 'https://i-muslim-next.alkhammashtalal.workers.dev'
/** The frozen live Worker (CLAUDE.md §13): never an API base while FREEZE exists. */
export const FROZEN_LIVE_HOST = 'i-muslim.alkhammashtalal.workers.dev'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

/** The API origin for the native build, or an Error saying why the value cannot be one. */
export function checkApiBase(raw: string | undefined, frozen: boolean): string {
  const v = (raw ?? '').trim()
  let u: URL
  try {
    u = new URL(v)
  } catch {
    throw new Error(`VITE_API_BASE must be an absolute origin such as ${NATIVE_API_DEFAULT}, got "${v}"`)
  }
  const local = LOCAL_HOSTS.has(u.hostname)
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local)) {
    throw new Error(`VITE_API_BASE must use https (http only for localhost), got "${v}"`)
  }
  if (u.pathname !== '/' || u.search || u.hash || u.username || u.password) {
    throw new Error(`VITE_API_BASE must be an origin alone, with no path, query or credentials, got "${v}"`)
  }
  if (frozen && u.hostname === FROZEN_LIVE_HOST) {
    throw new Error(`VITE_API_BASE is the frozen live Worker (${FROZEN_LIVE_HOST}); FREEZE exists (CLAUDE.md §13)`)
  }
  return u.origin
}

/** The Content-Security-Policy value of the "/*" block of web/public/_headers. */
export function webCsp(headersFile: string): string {
  const block = headersFile.split(/\n(?=\S)/).find((b) => b.startsWith('/*\n')) ?? ''
  const line = block.split('\n').find((l) => /^\s+Content-Security-Policy:/i.test(l))
  if (!line) throw new Error('web/public/_headers has no Content-Security-Policy in its "/*" block')
  return line.slice(line.indexOf(':') + 1).trim()
}

// Directives a <meta> policy cannot carry (CSP3 §3.3): browsers ignore them there with a console warning. The app's
// own page is never framed by anyone (it is the web view's top document), so frame-ancestors has nothing to protect.
const HEADER_ONLY = new Set(['frame-ancestors', 'report-uri', 'report-to', 'sandbox'])

/**
 * The native build's policy: the web's directives in the same order, minus the header-only ones, with the API origin
 * appended to connect-src. Against a plain-http localhost preview, upgrade-insecure-requests is left out (it would turn
 * http://localhost into https://localhost); every https base keeps it.
 */
export function nativeCsp(headersFile: string, apiOrigin: string): string {
  const api = new URL(apiOrigin)
  const out: string[] = []
  for (const d of webCsp(headersFile).split(';').map((s) => s.trim()).filter(Boolean)) {
    const [name, ...values] = d.split(/\s+/)
    if (HEADER_ONLY.has(name)) continue
    if (name === 'upgrade-insecure-requests' && api.protocol === 'http:') continue
    out.push(name === 'connect-src' ? [name, ...values, api.origin].join(' ') : d)
  }
  if (!out.some((d) => d.startsWith('connect-src '))) out.push(`connect-src 'self' ${api.origin}`)
  return out.join('; ')
}

/** The <meta> element. */
export const cspMeta = (csp: string) => `<meta http-equiv="Content-Security-Policy" content="${csp.replace(/"/g, '&quot;')}" />`

/**
 * index.html with the policy at the top of <head> (after <meta charset>, which must stay in the first bytes), before
 * any element that loads something, so it governs every script, style, icon and font of the page.
 */
export function withCspMeta(html: string, csp: string): string {
  if (/http-equiv="Content-Security-Policy"/i.test(html)) throw new Error('index.html already carries a CSP meta')
  const head = html.search(/<head[^>]*>/i)
  if (head < 0) throw new Error('index.html has no <head>')
  const charset = html.slice(head).search(/<meta\s+charset=[^>]*>/i)
  const anchor = charset >= 0 ? head + charset : head
  const end = html.indexOf('>', anchor) + 1
  return `${html.slice(0, end)}\n    ${cspMeta(csp)}${html.slice(end)}`
}

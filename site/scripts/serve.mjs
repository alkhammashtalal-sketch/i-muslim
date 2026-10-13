// A local server for site/public that behaves like Workers Static Assets with site/wrangler.jsonc, for the tests and
// a quick look, with no Cloudflare and no wrangler:
//   node site/scripts/serve.mjs [port]          (default 8852; 127.0.0.1 only)
// html_handling "auto-trailing-slash": /privacy serves privacy.html, /en/ serves en/index.html, /privacy.html and
// /privacy/ redirect to /privacy, /en redirects to /en/. not_found_handling "404-page": the nearest 404.html, status
// 404. The rules of public/_headers are applied (path patterns with *).
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public')
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
}

/** public/_headers as [pattern RegExp, [name, value][]][] (Cloudflare's format: a path line, then indented headers). */
export function parseHeaders(text) {
  const rules = []
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (!/^\s/.test(line)) {
      const re = new RegExp(`^${line.trim().replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`)
      rules.push([re, []])
    } else if (rules.length) {
      const i = line.indexOf(':')
      rules[rules.length - 1][1].push([line.slice(0, i).trim(), line.slice(i + 1).trim()])
    }
  }
  return rules
}

const isFile = (p) => fs.existsSync(p) && fs.statSync(p).isFile()

/** What Workers Static Assets would answer for `pathname`: a file to serve, or a redirect. */
export function resolve(pathname) {
  const rel = decodeURIComponent(pathname).replace(/\/{2,}/g, '/')
  if (rel.includes('..') || rel.split('/').some((s) => s.startsWith('_') && s !== '')) return { notFound: true }
  const abs = (r) => path.join(PUBLIC, r)
  if (rel.endsWith('/index.html')) return { redirect: rel.slice(0, -'index.html'.length) }
  if (rel.endsWith('.html')) return isFile(abs(rel)) ? { redirect: rel.slice(0, -'.html'.length) } : { notFound: true }
  if (rel.endsWith('/')) {
    if (isFile(abs(`${rel}index.html`))) return { file: abs(`${rel}index.html`) }
    if (rel !== '/' && isFile(abs(`${rel.slice(0, -1)}.html`))) return { redirect: rel.slice(0, -1) }
    return { notFound: true }
  }
  if (isFile(abs(rel))) return { file: abs(rel) }
  if (isFile(abs(`${rel}.html`))) return { file: abs(`${rel}.html`) }
  if (isFile(abs(`${rel}/index.html`))) return { redirect: `${rel}/` }
  return { notFound: true }
}

/** The nearest 404.html, walking up from the request's folder. */
function notFoundPage(pathname) {
  let dir = path.posix.dirname(pathname.endsWith('/') ? `${pathname}x` : pathname)
  for (;;) {
    const p = path.join(PUBLIC, dir, '404.html')
    if (isFile(p)) return p
    if (dir === '/' || dir === '.') return null
    dir = path.posix.dirname(dir)
  }
}

export function createServer() {
  const rules = parseHeaders(fs.readFileSync(path.join(PUBLIC, '_headers'), 'utf8'))
  return http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const headers = {}
    for (const [re, hs] of rules) if (re.test(url.pathname)) for (const [k, v] of hs) headers[k.toLowerCase()] = v
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, headers).end()
      return
    }
    const r = resolve(url.pathname)
    if (r.redirect) {
      res.writeHead(307, { ...headers, location: r.redirect + url.search }).end()
      return
    }
    const file = r.file ?? notFoundPage(url.pathname)
    const status = r.file ? 200 : 404
    if (!file) {
      res.writeHead(404, headers).end()
      return
    }
    const body = fs.readFileSync(file)
    res.writeHead(status, { ...headers, 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'content-length': body.length })
    res.end(req.method === 'HEAD' ? undefined : body)
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.argv[2] ?? 8852)
  createServer().listen(port, '127.0.0.1', () => console.log(`site on http://localhost:${port}`))
}

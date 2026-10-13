// The privacy and support site (reply 0033 §ج, as changed by add-on 0033-add1 §5): a separate Worker of static files
// named i-muslim-site, three pages in Arabic and English with nothing from another server, a strict CSP, and the support
// form's body as /api/report accepts it. The form itself is driven in web/e2e-site/site.spec.ts.
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { NOTE_MAX, parseSourceReport } from '../src/report'
import { SITE_ORIGIN, sitePage } from '../../web/src/v2/site/links'
import { SITE_LINKS } from '../../web/src/v2/site/strings'
// @ts-expect-error a plain ES module without types
import { COPIES } from '../../site/scripts/copy-assets.mjs'
// @ts-expect-error a plain ES module without types
import { parseHeaders, resolve } from '../../site/scripts/serve.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SITE = path.join(ROOT, 'site')
const PUBLIC = path.join(SITE, 'public')
const read = (p: string) => fs.readFileSync(path.join(PUBLIC, p), 'utf8')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const

/** JSONC → JSON: comments removed outside strings. */
function parseJsonc(text: string): Record<string, unknown> {
  let out = ''
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      const end = text.indexOf('"', i + 1)
      let j = end
      while (text[j - 1] === '\\') j = text.indexOf('"', j + 1)
      out += text.slice(i, j + 1)
      i = j
    } else if (c === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i++
      out += '\n'
    } else if (c === '/' && text[i + 1] === '*') {
      i = text.indexOf('*/', i) + 1
    } else out += c
  }
  return JSON.parse(out)
}

const HTML = (() => {
  const walk = (d: string): string[] => fs.readdirSync(path.join(PUBLIC, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []))
  return walk('')
})()
const PAGES = [
  { file: 'index.html', url: '/', lang: 'ar' },
  { file: 'privacy.html', url: '/privacy', lang: 'ar' },
  { file: 'support.html', url: '/support', lang: 'ar' },
  { file: 'en/index.html', url: '/en/', lang: 'en' },
  { file: 'en/privacy.html', url: '/en/privacy', lang: 'en' },
  { file: 'en/support.html', url: '/en/support', lang: 'en' },
]
const attrs = (html: string, tag: string, attr: string) => [...html.matchAll(new RegExp(`<${tag}\\b[^>]*\\s${attr}="([^"]*)"`, 'g'))].map((m) => m[1])
/** The text a reader sees: no tags, attributes, comments, or the hidden store links' box. */
const visibleText = (html: string) =>
  html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<head>[\s\S]*?<\/head>/, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')

describe('site/wrangler.jsonc', () => {
  const raw = fs.readFileSync(path.join(SITE, 'wrangler.jsonc'), 'utf8')
  const cfg = parseJsonc(raw)

  it('is the Worker i-muslim-site, static files only', () => {
    expect(cfg.name).toBe('i-muslim-site')
    // Only these keys: no main (Worker code), no D1, no Vectorize, no AI, no vars, no triggers, no routes, no env.
    expect(Object.keys(cfg).sort()).toEqual(['$schema', 'assets', 'compatibility_date', 'name'])
    const assets = cfg.assets as Record<string, unknown>
    expect(Object.keys(assets).sort()).toEqual(['directory', 'html_handling', 'not_found_handling'])
    expect(path.resolve(SITE, assets.directory as string)).toBe(PUBLIC)
    expect(assets.html_handling).toBe('auto-trailing-slash')
    expect(assets.not_found_handling).toBe('404-page')
    // scripts/wr.sh reads the same file with grep: none of the words it refuses appears, even in a comment.
    expect(raw).not.toMatch(/"(main|d1_databases|vectorize|triggers|routes)"/)
  })

  it('passes scripts/wr.sh only as itself (dry decision, wrangler never runs)', () => {
    const wr = (args: string[], cwd: string) => {
      const r = spawnSync('bash', [path.join(ROOT, 'scripts/wr.sh'), ...args], { cwd, env: { ...process.env, WR_DRY: '1' }, encoding: 'utf8' })
      return { code: r.status, out: `${r.stdout}${r.stderr}` }
    }
    expect(wr(['deploy', '-c', 'site/wrangler.jsonc'], ROOT)).toMatchObject({ code: 0, out: expect.stringContaining('ALLOW: deploy to i-muslim-site') })
    expect(wr(['deploy', '-c', '../site/wrangler.jsonc', '--dry-run'], path.join(ROOT, 'worker'))).toMatchObject({ code: 0 })
    expect(wr(['deploy', '-c', 'site/wrangler.jsonc', '--name', 'i-muslim'], ROOT).code).toBe(2)
    expect(wr(['triggers', 'deploy', '-c', 'site/wrangler.jsonc'], ROOT).code).toBe(2)
    expect(wr(['delete', '-c', 'site/wrangler.jsonc'], ROOT).code).toBe(2)
  })
})

describe('the pages', () => {
  it('are the six pages and two not-found pages, at the URLs the static assets give them', () => {
    expect(HTML.sort()).toEqual(['404.html', 'en/404.html', 'en/index.html', 'en/privacy.html', 'en/support.html', 'index.html', 'privacy.html', 'support.html'])
    for (const p of PAGES) expect(resolve(p.url), p.url).toEqual({ file: path.join(PUBLIC, p.file) })
    expect(resolve('/privacy.html')).toEqual({ redirect: '/privacy' })
    expect(resolve('/en')).toEqual({ redirect: '/en/' })
    expect(resolve('/_headers')).toEqual({ notFound: true })
  })

  it.each(HTML)('%s: language, title, and nothing from another server or inline', (file) => {
    const html = read(file)
    const lang = file.startsWith('en/') ? 'en' : 'ar'
    expect(html).toMatch(new RegExp(`^<!doctype html>\\n<html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}">`))
    expect(html).toMatch(/<meta charset="utf-8">/)
    expect(html).toMatch(/<meta name="viewport" content="width=device-width, initial-scale=1/)
    expect(html).toMatch(lang === 'ar' ? /<title>[^<]*مسلم<\/title>/ : /<title>[^<]*Muslim<\/title>/)
    // Scripts: files of this site only, never inline; no inline styles or handlers (the CSP would block them anyway).
    for (const tag of html.match(/<script\b[^>]*>/g) ?? []) expect(tag).toMatch(/^<script src="\/assets\/[a-z-]+\.js" defer>$/)
    expect(html).not.toMatch(/<script\b(?![^>]*\ssrc=)[^>]*>/)
    expect(html).not.toMatch(/<style\b|\sstyle="|\son[a-z]+="/i)
    // Stylesheets, fonts, images: from this site.
    for (const u of [...attrs(html, 'link', 'href').filter((h) => !/hreflang/.test(h)), ...attrs(html, 'img', 'src'), ...attrs(html, 'script', 'src')]) {
      if (u.startsWith(SITE_ORIGIN)) continue
      expect(u, `${file}: ${u}`).toMatch(/^\/[^/]/)
    }
    expect(html).not.toMatch(/<link\b[^>]*rel="(stylesheet|preload|preconnect|dns-prefetch)"[^>]*href="https?:/)
    expect(html).not.toMatch(/fonts\.googleapis|fonts\.gstatic|cdn\./)
    // The name is «مسلم» / Muslim; the internal identifier i-muslim never shows as text (CLAUDE.md §8).
    expect(visibleText(html)).not.toMatch(/i-?muslim/i)
  })

  it('every link and file reference inside the site resolves; links out open without a referrer', () => {
    for (const file of HTML) {
      const html = read(file)
      const refs = [...attrs(html, 'a', 'href'), ...attrs(html, 'link', 'href'), ...attrs(html, 'img', 'src'), ...attrs(html, 'script', 'src')]
      for (const ref of refs) {
        const local = ref.startsWith(SITE_ORIGIN) ? ref.slice(SITE_ORIGIN.length) || '/' : ref.startsWith('/') ? ref : null
        if (local) {
          const r = resolve(local)
          expect(r.file, `${file}: ${ref}`).toBeTruthy()
        } else {
          expect(ref, `${file}: ${ref}`).toMatch(/^https:\/\//)
          const tag = html.match(new RegExp(`<a\\b[^>]*href="${ref.replace(/[.?*+^$()[\]{}|\\/]/g, '\\$&')}"[^>]*>`))![0]
          expect(tag, `${file}: ${ref}`).toMatch(/rel="noopener noreferrer"/)
        }
      }
    }
  })

  it('each page links its counterpart in the other language, and the three pages to each other', () => {
    for (const p of PAGES) {
      const html = read(p.file)
      const other = p.lang === 'ar' ? `/en${p.url === '/' ? '/' : p.url}` : p.url.replace(/^\/en/, '') || '/'
      expect(html, p.file).toContain(`<a class="lang" href="${other}"`)
      const base = p.lang === 'ar' ? '' : '/en'
      for (const target of [`${base}/`, `${base}/privacy`, `${base}/support`]) expect(html, `${p.file} → ${target}`).toContain(`href="${target}"`)
      expect(html.match(/aria-current="page"/g), p.file).toHaveLength(1)
    }
  })

  it('the store links stay hidden until they exist, and a shown one points to its store', () => {
    for (const file of ['index.html', 'en/index.html']) {
      const html = read(file)
      for (const tag of html.match(/<a\b[^>]*data-store="[^"]+"[^>]*>/g) ?? []) {
        if (/\shidden\b/.test(tag)) expect(tag).not.toMatch(/\shref=/)
        else expect(tag).toMatch(/href="https:\/\/(apps\.apple\.com|play\.google\.com)\//)
      }
      expect(html).toMatch(/<div class="stores" hidden>/)
    }
  })

  it('the stylesheet loads only files of this site, and they exist', () => {
    const css = read('assets/site.css')
    expect(css).not.toMatch(/@import|https?:/)
    for (const [, u] of css.matchAll(/url\('([^']+)'\)/g)) expect(fs.existsSync(path.join(PUBLIC, u)), u).toBe(true)
  })

  it('the fonts and the icon are the app’s own files, unchanged, with their licences', () => {
    for (const [from, to] of COPIES as [string, string][]) {
      const src = path.join(ROOT, from)
      expect(fs.existsSync(path.join(PUBLIC, to)), to).toBe(true)
      if (fs.existsSync(src)) expect(fs.readFileSync(path.join(PUBLIC, to)).equals(fs.readFileSync(src)), to).toBe(true)
    }
    expect(read('fonts/LICENSE-ibm-plex-sans-arabic.txt')).toMatch(/SIL Open Font License, Version 1\.1/)
    expect(read('fonts/LICENSE-amiri.txt')).toMatch(/SIL Open Font License, Version 1\.1/)
  })
})

describe('public/_headers', () => {
  const rules = parseHeaders(read('_headers')) as [RegExp, [string, string][]][]
  const all = Object.fromEntries(rules.filter(([re]) => re.test('/privacy')).flatMap(([, hs]) => hs).map(([k, v]) => [k.toLowerCase(), v]))
  const csp = Object.fromEntries(all['content-security-policy'].split(';').map((d: string) => d.trim().split(/\s+/)).map(([k, ...v]: string[]) => [k, v]))

  it('a strict CSP: this site only, no inline code, one connection to the app server', () => {
    expect(csp['default-src']).toEqual(["'none'"])
    expect(csp['script-src']).toEqual(["'self'"])
    expect(csp['style-src']).toEqual(["'self'"])
    expect(csp['font-src']).toEqual(["'self'"])
    expect(csp['img-src']).toEqual(["'self'"])
    expect(csp['frame-ancestors']).toEqual(["'none'"])
    expect(csp['form-action']).toEqual(["'none'"])
    expect(csp['base-uri']).toEqual(["'none'"])
    expect(all['content-security-policy']).not.toMatch(/unsafe-|\*/)
    // The form posts where the CSP allows, in both languages.
    for (const f of ['support.html', 'en/support.html']) expect(csp['connect-src']).toEqual([read(f).match(/data-api="([^"]+)"/)![1]])
    expect(csp['connect-src']).toEqual(['https://i-muslim-next.alkhammashtalal.workers.dev'])
    expect(all['referrer-policy']).toBe('no-referrer')
    expect(all['x-content-type-options']).toBe('nosniff')
    expect(all['permissions-policy']).toMatch(/camera=\(\), microphone=\(\), geolocation=\(\)/)
  })
})

describe('the privacy policy', () => {
  const ar = visibleText(read('privacy.html'))
  const en = visibleText(read('en/privacy.html'))

  it('carries its date of last update', () => {
    for (const f of ['privacy.html', 'en/privacy.html']) expect(read(f)).toMatch(/<time datetime="2026-10-13">/)
    expect(ar).toContain('آخر تحديث: ١٣ أكتوبر ٢٠٢٦')
    expect(en).toContain('Last updated: 13 October 2026')
  })

  it('names, in both languages, what part ب of reply 0033 asks for', () => {
    const topics: [string, string][] = [
      ['لا حسابات', 'No accounts'],
      ['لا إعلانات', 'No ads'],
      ['أدوات تحليل أو تتبع', 'analytics or tracking'],
      ['تنبيهات محلية', 'local notifications'],
      ['«استخدم موقعي»', '«Use my location»'],
      ['٠٫٠١°', '0.01°'],
      ['سؤالك', 'Your question'],
      ['السؤال بالصوت', 'Asking by voice'],
      ['فالصوت لا يُخزَّن', 'the audio is never stored'],
      ['«أبلغ عن خطأ»', '«Report a mistake»'],
      ['«تواصل معنا»', '«Contact us»'],
      ['طلب لغة غير موجودة', 'Asking for a language'],
      ['«تأكد من فهمك»', '«Check your understanding»'],
      ['لا تُرسل ولا تُحفظ', 'never sent, kept or scored'],
      ['عنوان جهازك', 'internet address'],
    ]
    for (const [a, e] of topics) {
      expect(ar, a).toContain(a)
      expect(en, e).toContain(e)
    }
  })
})

describe('what the policy says matches the server and the app', () => {
  const ar = visibleText(read('privacy.html'))
  const en = visibleText(read('en/privacy.html'))

  it('the server keeps no request log: env.next has no invocation logs, and its few console lines hold nothing of the user', () => {
    // «لا نحفظ عنوان جهازك» / "We keep neither your device's internet address…" and docs/PRIVACY.md «لا سجلات تحتوي …
    // العناوين»: Workers Logs' invocation logs would keep each request's URL (a mosque cell) and metadata for 7 days.
    const cfg = parseJsonc(fs.readFileSync(path.join(ROOT, 'worker/wrangler.jsonc'), 'utf8')) as { env: { next: { observability: unknown } } }
    expect(cfg.env.next.observability).toEqual({ enabled: true, logs: { invocation_logs: false } })
    const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.ts$/.test(e.name) ? [path.join(d, e.name)] : []))
    const lines = walk(path.join(ROOT, 'worker/src')).flatMap((f) => fs.readFileSync(f, 'utf8').split('\n').filter((l) => /\bconsole\.(log|info|warn|error|debug)\(/.test(l)).map((l) => `${path.relative(ROOT, f)}: ${l.trim()}`))
    expect(lines.length).toBeGreaterThan(0)
    for (const l of lines) {
      expect(l, l).toMatch(/console\.log\(JSON\.stringify\(\{ evt: '[a-z_]+'/)
      expect(l.replace(/^[^:]+: /, ''), l).not.toMatch(/\b(q|nq|question|note|text|cell|lat|lng|ip|ipHash|ip_hash|headers|request|body|url|endpoint)\b/)
    }
  })

  it('the Arabic pages write no Latin letters but the link «English» (CLAUDE.md §8, as the app writes «كلاودفلير»)', () => {
    for (const f of HTML.filter((x) => !x.startsWith('en/'))) {
      const text = visibleText(read(f)).replace(/&[a-z]+;/g, ' ')
      expect(text.replace('English', ''), f).not.toMatch(/[A-Za-z]/)
    }
    expect(ar).toContain('«كلاودفلير»')
    expect(ar).toContain('نموذج «ويسبر» على منصة «كلاودفلير»')
  })

  it('names who receives the mosque cell and the mosque’s position, as the code sends them', () => {
    const mosques = fs.readFileSync(path.join(ROOT, 'worker/src/mosques.ts'), 'utf8')
    expect(mosques).toContain("const OVERPASS = 'https://overpass-api.de/api/interpreter'")
    expect(ar).toContain('خدمة «أوفرباس» لبيانات «أوبن ستريت ماب»')
    expect(en).toContain('The Overpass API service (overpass-api.de), which serves OpenStreetMap data')
    const dirs = fs.readFileSync(path.join(ROOT, 'web/src/daily/mosques.ts'), 'utf8')
    expect(dirs).toContain('https://maps.apple.com/?daddr=')
    expect(dirs).toContain('https://www.google.com/maps/dir/?api=1&destination=')
    expect(ar).toContain('خرائط أبل أو جوجل: حين تضغط «اتجاهات» تُفتح على موقع المسجد الذي اخترته')
    expect(en).toContain('Apple Maps or Google Maps: when you press «Directions», it opens at the position of the mosque you chose')
  })

  it('counts what part د counts each day, and says how long the server keeps what it keeps', () => {
    expect(ar).toContain('وطلبات المساجد لمربع لم يُحفظ جوابه بعد')
    expect(en).toContain('and mosque lookups for a cell whose answer is not kept yet')
    expect(ar).toContain('ولاشتراكات التنبيهات حد يومي بمفتاح الجهاز اليومي نفسه')
    expect(en).toContain('Notification subscriptions have a daily limit under the same daily device key')
    // Apple guideline 5.1.1(i): retention. The tables have no deletion; the mosque cache 7 days; a push row until off.
    expect(ar).toContain('نحفظها دون مدة محددة، لأنها لا تدل على أحد')
    expect(en).toContain('are kept with no set end date, since none of it points to anyone')
    expect(fs.readFileSync(path.join(ROOT, 'worker/src/mosques.ts'), 'utf8')).toContain('const TTL = 7 * 86400')
    expect(ar).toContain('وجواب مربع المساجد يُحفظ أسبوعًا')
    expect(en).toContain('A mosque cell’s answer is kept for a week')
  })
})

describe('the support form', () => {
  it.each(['support.html', 'en/support.html'])('%s: one note of up to 500 characters, no name or e-mail field', (f) => {
    const html = read(f)
    expect(html.match(/<textarea\b[^>]*>/g)).toHaveLength(1)
    expect(html).toMatch(new RegExp(`<textarea id="note"[^>]*maxlength="${NOTE_MAX}"`))
    expect(html).not.toMatch(/<input\b|type="email"|autocomplete="(name|email)"/)
    expect(html).toContain(f.startsWith('en/') ? 'Do not write your name or anything about yourself.' : 'لا تكتب اسمك ولا أي بيانات عنك.')
    expect(html).toContain('<script src="/assets/support.js" defer></script>')
  })

  it('sends exactly what /api/report accepts as a support message', () => {
    const js = read('assets/support.js')
    expect(js).toContain("JSON.stringify({ kind: 'support', note: text })")
    expect(js).toContain("api + '/api/report'")
    expect(js).toContain("credentials: 'omit'")
    expect(js).toContain("referrerPolicy: 'no-referrer'")
    expect(js).toMatch(/var MAX = 500\b/)
    expect(parseSourceReport({ kind: 'support', note: 'شكرًا على التطبيق' })).toEqual({ kind: 'support', loc: null, note: 'شكرًا على التطبيق' })
    expect(parseSourceReport({ kind: 'support', note: 'ب'.repeat(NOTE_MAX) })).not.toBeNull()
    expect(parseSourceReport({ kind: 'support', note: 'ب'.repeat(NOTE_MAX + 1) })).toBeNull()
    expect(parseSourceReport({ kind: 'support', note: '   ' })).toBeNull()
  })
})

describe('the app’s link to the privacy policy', () => {
  it('opens the Arabic page in Arabic and the English page in every other interface language', () => {
    expect(sitePage('privacy', 'ar')).toBe('https://i-muslim-site.alkhammashtalal.workers.dev/privacy')
    for (const l of LANGS.filter((x) => x !== 'ar')) expect(sitePage('privacy', l), l).toBe('https://i-muslim-site.alkhammashtalal.workers.dev/en/privacy')
    expect(sitePage('support', 'ar')).toBe(`${SITE_ORIGIN}/support`)
    // The pages it opens exist, under the origin the site's own pages declare.
    expect(resolve(new URL(sitePage('privacy', 'ar')).pathname).file).toBe(path.join(PUBLIC, 'privacy.html'))
    expect(resolve(new URL(sitePage('privacy', 'fr')).pathname).file).toBe(path.join(PUBLIC, 'en/privacy.html'))
    expect(read('privacy.html')).toContain(`hreflang="ar" href="${SITE_ORIGIN}/privacy"`)
  })

  it('has its label in the ten interface languages', () => {
    for (const l of LANGS) expect(SITE_LINKS[l].privacy.trim(), l).not.toBe('')
    expect(SITE_LINKS.ar.privacy).toBe('سياسة الخصوصية')
    expect(SITE_LINKS.en.privacy).toBe('Privacy policy')
  })

  it('sits in the settings as a plain link out: new browsing context, no opener, no referrer', () => {
    const src = fs.readFileSync(path.join(ROOT, 'web/src/components/Sheets.tsx'), 'utf8')
    expect(src).toMatch(/<a className="btn" href=\{sitePage\('privacy', lang\)\} target="_blank" rel="noopener noreferrer">\s*\{SITE_LINKS\[lang\]\.privacy\}/)
  })
})

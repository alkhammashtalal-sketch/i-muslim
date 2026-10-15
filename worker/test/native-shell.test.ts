// The iOS/Android shell (reply 0033 §ب, items 1, 2 and 4–6): CORS on /api/* for exactly the two Capacitor origins and
// the site Worker; the native build's API base, CSP and index.html; every /api/* request of web/src through api(); and
// the app's identity (appId, name, version) wherever it is written.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import worker, { type Env } from '../src/index'
import { CORS_ORIGINS, corsPreflight, withCors } from '../src/cors'
import { HEADERS } from '../src/security'
import { checkApiBase, cspMeta, FROZEN_LIVE_HOST, NATIVE_API_DEFAULT, nativeCsp, webCsp, withCspMeta } from '../../web/native-build'

const ROOT = path.resolve(import.meta.dirname, '../..')
const WEB = path.join(ROOT, 'web')
const HEADERS_FILE = fs.readFileSync(path.join(WEB, 'public/_headers'), 'utf8')
const SITE = 'https://i-muslim-site.alkhammashtalal.workers.dev'

// A Worker env whose static files answer "asset" and which has no D1: /api/health needs none.
const env = { ASSETS: { fetch: async () => new Response('asset', { status: 200 }) } } as unknown as Env
const call = (p: string, init: RequestInit = {}) => worker.fetch(new Request(`https://i-muslim-next.alkhammashtalal.workers.dev${p}`, init), env)

describe('CORS on /api/* (reply 0033 §ب2, 0033-add1 §5)', () => {
  it('allows exactly the iOS app, the Android app and the site Worker', () => {
    expect([...CORS_ORIGINS].sort()).toEqual(['capacitor://localhost', 'https://localhost', SITE].sort())
  })

  it.each(['capacitor://localhost', 'https://localhost', SITE])('an allowed origin (%s) reads the answer, with no credentials', async (origin) => {
    const res = await call('/api/health', { headers: { origin } })
    expect(res.status).toBe(200)
    expect(res.headers.get('access-control-allow-origin')).toBe(origin)
    expect(res.headers.get('access-control-allow-credentials')).toBeNull()
    expect(res.headers.get('vary')).toMatch(/\bOrigin\b/)
    // The security headers are still there.
    expect(res.headers.get('content-security-policy')).toBe(HEADERS['content-security-policy'])
  })

  it.each([
    'https://evil.example',
    'http://localhost',
    'capacitor://evil',
    'https://localhost:8443',
    'https://i-muslim.alkhammashtalal.workers.dev',
    'https://i-muslim.pages.dev',
    'null',
    `${SITE}.evil.example`,
  ])('any other origin (%s) gets no CORS header', async (origin) => {
    const res = await call('/api/health', { headers: { origin } })
    expect(res.status).toBe(200) // the request itself is answered; the browser keeps the answer from that page
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('a same-origin request (the web app, no Origin header) is answered as before', async () => {
    const res = await call('/api/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true })
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('a preflight from an allowed origin: 204, GET and POST, content-type, cached a day, no credentials', async () => {
    const res = await call('/api/ask', {
      method: 'OPTIONS',
      headers: { origin: 'capacitor://localhost', 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type' },
    })
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe('capacitor://localhost')
    expect(res.headers.get('access-control-allow-methods')).toBe('GET, POST')
    expect(res.headers.get('access-control-allow-headers')).toBe('content-type')
    expect(res.headers.get('access-control-max-age')).toBe('86400')
    expect(res.headers.get('access-control-allow-credentials')).toBeNull()
    expect(res.headers.get('vary')).toMatch(/\bOrigin\b/)
  })

  it('a preflight from any other origin is refused: 403 and no CORS header', async () => {
    for (const origin of ['https://evil.example', 'https://i-muslim.alkhammashtalal.workers.dev']) {
      const res = await call('/api/report', { method: 'OPTIONS', headers: { origin, 'access-control-request-method': 'POST' } })
      expect(res.status).toBe(403)
      expect(res.headers.get('access-control-allow-origin')).toBeNull()
      expect(res.headers.get('access-control-allow-methods')).toBeNull()
    }
    // No Origin at all: refused the same way.
    const bare = corsPreflight(new Request('https://x/api/ask', { method: 'OPTIONS', headers: { 'access-control-request-method': 'POST' } }))
    expect(bare?.status).toBe(403)
  })

  it('an OPTIONS that is not a preflight is routed as before (no route: 404)', async () => {
    const res = await call('/api/ask', { method: 'OPTIONS', headers: { origin: 'capacitor://localhost' } })
    expect(res.status).toBe(404)
  })

  it('static files are not touched (they are served without the Worker in production)', async () => {
    const res = await call('/index.html', { headers: { origin: 'capacitor://localhost' } })
    expect(await res.text()).toBe('asset')
    expect(res.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('withCors keeps the status, body and an existing Vary', async () => {
    const res = withCors(
      new Request('https://x/api/x', { headers: { origin: 'https://localhost' } }),
      new Response('{"a":1}', { status: 429, headers: { vary: 'Accept-Encoding', 'content-type': 'application/json' } }),
    )
    expect(res.status).toBe(429)
    expect(await res.text()).toBe('{"a":1}')
    expect(res.headers.get('vary')).toBe('Accept-Encoding, Origin')
    expect(res.headers.get('access-control-allow-origin')).toBe('https://localhost')
  })
})

describe('the native build: API base (reply 0033 §ب2)', () => {
  it('TestFlight talks to next', () => {
    expect(NATIVE_API_DEFAULT).toBe('https://i-muslim-next.alkhammashtalal.workers.dev')
    expect(checkApiBase(NATIVE_API_DEFAULT, true)).toBe(NATIVE_API_DEFAULT)
    expect(checkApiBase(`${NATIVE_API_DEFAULT}/`, true)).toBe(NATIVE_API_DEFAULT)
  })
  it('plain http only for a local preview', () => {
    expect(checkApiBase('http://localhost:8851', true)).toBe('http://localhost:8851')
    expect(checkApiBase('http://127.0.0.1:8851', true)).toBe('http://127.0.0.1:8851')
    expect(() => checkApiBase('http://i-muslim-next.alkhammashtalal.workers.dev', true)).toThrow(/https/)
  })
  it('an origin alone: no path, query or credentials; never empty', () => {
    expect(() => checkApiBase(`${NATIVE_API_DEFAULT}/api`, true)).toThrow(/origin alone/)
    expect(() => checkApiBase(`${NATIVE_API_DEFAULT}?x=1`, true)).toThrow(/origin alone/)
    expect(() => checkApiBase('https://u:p@example.com', true)).toThrow(/origin alone/)
    expect(() => checkApiBase('', true)).toThrow(/absolute origin/)
    expect(() => checkApiBase('/api', true)).toThrow(/absolute origin/)
  })
  it('never the frozen live Worker while FREEZE exists (CLAUDE.md §13)', () => {
    expect(() => checkApiBase(`https://${FROZEN_LIVE_HOST}`, true)).toThrow(/frozen/)
    expect(checkApiBase(`https://${FROZEN_LIVE_HOST}`, false)).toBe(`https://${FROZEN_LIVE_HOST}`)
    expect(fs.existsSync(path.join(ROOT, 'FREEZE'))).toBe(true)
  })
})

describe('the native build: CSP in index.html (reply 0033 §ب2)', () => {
  const directives = (csp: string) => csp.split(';').map((d) => d.trim()).filter(Boolean)
  it('the web rules of _headers, with the API origin in connect-src and nothing else added', () => {
    const web = directives(webCsp(HEADERS_FILE))
    const app = directives(nativeCsp(HEADERS_FILE, NATIVE_API_DEFAULT))
    // frame-ancestors cannot live in a <meta> policy (CSP3): the only directive left out.
    expect(web.filter((d) => !d.startsWith('frame-ancestors '))).toEqual(app.map((d) => (d.startsWith('connect-src ') ? "connect-src 'self' https://cdn.mp3quran.net" : d)))
    expect(app).toContain(`connect-src 'self' https://cdn.mp3quran.net ${NATIVE_API_DEFAULT}`)
    expect(app).toContain('upgrade-insecure-requests')
    // No new third party: the only other host is the recitation audio, as on the web.
    const hosts = app.join(' ').match(/https?:\/\/[^\s;]+/g)
    expect(new Set(hosts)).toEqual(new Set(['https://cdn.mp3quran.net', NATIVE_API_DEFAULT]))
    expect(app).toContain("script-src 'self'")
    expect(app).toContain("object-src 'none'")
  })
  it('the web CSP read from _headers is the Worker one', () => {
    expect(webCsp(HEADERS_FILE)).toBe(HEADERS['content-security-policy'])
  })
  it('a local http preview drops upgrade-insecure-requests, which would turn it into https', () => {
    const app = directives(nativeCsp(HEADERS_FILE, 'http://localhost:8851'))
    expect(app).not.toContain('upgrade-insecure-requests')
    expect(app).toContain("connect-src 'self' https://cdn.mp3quran.net http://localhost:8851")
  })
  it('the meta goes first in <head>, after <meta charset>, and only once', () => {
    const html = '<!doctype html>\n<html>\n  <head>\n    <meta charset="UTF-8" />\n    <link rel="icon" href="/i.png" />\n    <script type="module" src="/a.js"></script>\n  </head>\n</html>'
    const out = withCspMeta(html, "default-src 'self'")
    const meta = cspMeta("default-src 'self'")
    expect(out.indexOf('<meta charset')).toBeLessThan(out.indexOf(meta))
    expect(out.indexOf(meta)).toBeLessThan(out.indexOf('<link'))
    expect(out.indexOf(meta)).toBeLessThan(out.indexOf('<script'))
    expect(() => withCspMeta(out, "default-src 'self'")).toThrow(/already/)
  })
})

describe('the two builds, built with web/vite.config.ts (vite build of web/index.html with a one-line entry)', () => {
  // The real index.html and the real config, both modes; the entry is a one-line module (the app's own /api/* calls are
  // checked by the scan below), so each build takes a fraction of a second and the timed tests elsewhere keep their CPU.
  const vite = path.join(WEB, 'node_modules/vite/bin/vite.js')
  const build = (mode: 'production' | 'native') => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), `muslim-${mode}-`))
    const html = fs.readFileSync(path.join(WEB, 'index.html'), 'utf8')
    expect(html).toContain('src="/src/main.tsx"')
    fs.writeFileSync(path.join(root, 'index.html'), html.replace('src="/src/main.tsx"', 'src="/entry.ts"'))
    fs.writeFileSync(path.join(root, 'entry.ts'), 'document.title = __API_BASE__\n')
    execFileSync(
      process.execPath,
      [vite, 'build', root, '--config', path.join(WEB, 'vite.config.ts'), '--mode', mode, '--outDir', path.join(root, 'dist'), '--emptyOutDir', '--logLevel', 'error'],
      { cwd: WEB, env: { ...process.env, VITE_API_BASE: '' }, stdio: 'pipe' },
    )
    return root
  }
  const js = (dir: string) =>
    fs
      .readdirSync(path.join(dir, 'assets'))
      .filter((f) => f.endsWith('.js'))
      .map((f) => fs.readFileSync(path.join(dir, 'assets', f), 'utf8'))
      .join('\n')

  it(
    'native: CSP meta with the API origin, the absolute base, no service worker, no manifest; web: none of that',
    () => {
      const native = build('native')
      const web = build('production')
      try {
        const n = path.join(native, 'dist')
        const w = path.join(web, 'dist')
        const nHtml = fs.readFileSync(path.join(n, 'index.html'), 'utf8')
        const wHtml = fs.readFileSync(path.join(w, 'index.html'), 'utf8')

        expect(nHtml).toContain(cspMeta(nativeCsp(HEADERS_FILE, NATIVE_API_DEFAULT)))
        expect(nHtml.match(/http-equiv="Content-Security-Policy"/g)).toHaveLength(1)
        expect(nHtml).not.toMatch(/registerSW|rel="manifest"/)
        expect(fs.existsSync(path.join(n, 'sw.js'))).toBe(false)
        expect(fs.existsSync(path.join(n, 'manifest.webmanifest'))).toBe(false)
        // The entry sets document.title to the API base: absolute in the native build, empty on the web.
        expect(js(n)).toMatch(new RegExp('document\\.title=(["\'`])' + NATIVE_API_DEFAULT.replace(/[./]/g, '\\$&') + '\\1'))

        expect(wHtml).not.toMatch(/http-equiv="Content-Security-Policy"/i)
        expect(wHtml).toMatch(/registerSW\.js/)
        expect(wHtml).toMatch(/rel="manifest"/)
        expect(fs.existsSync(path.join(w, 'sw.js'))).toBe(true)
        expect(js(w)).not.toContain('workers.dev')
        expect(js(w)).toMatch(/document\.title=(""|''|``)/)
      } finally {
        fs.rmSync(native, { recursive: true, force: true })
        fs.rmSync(web, { recursive: true, force: true })
      }
    },
    60_000,
  )
})

describe('every /api/* request of web/src goes through api() (reply 0033 §ب2)', () => {
  const files = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name)
      return e.isDirectory() ? files(p) : /\.(ts|tsx)$/.test(e.name) ? [p] : []
    })

  it('no /api/ string literal outside api(…)', () => {
    const bare: string[] = []
    let wrapped = 0
    // base.ts defines api() and its argument's type, `/api/${string}`.
    for (const f of files(path.join(WEB, 'src')).filter((f) => !f.endsWith(path.join('src', 'api', 'base.ts')))) {
      const src = fs.readFileSync(f, 'utf8')
      for (const m of src.matchAll(/(['"`])\/api\//g)) {
        const before = src.slice(Math.max(0, m.index - 4), m.index)
        const line = src.slice(src.lastIndexOf('\n', m.index) + 1, src.indexOf('\n', m.index))
        if (before === 'api(') wrapped++
        else if (!/^\s*(\/\/|\*)/.test(line)) bare.push(`${path.relative(ROOT, f)}: ${line.trim()}`)
      }
    }
    expect(bare).toEqual([])
    expect(wrapped).toBeGreaterThanOrEqual(30)
  })

  it('no request to an absolute address of ours written in web/src: the base comes from the build', () => {
    for (const f of files(path.join(WEB, 'src'))) {
      const src = fs.readFileSync(f, 'utf8')
      expect(src, path.relative(ROOT, f)).not.toMatch(/fetch\(\s*['"`]https?:\/\/[^'"`]*workers\.dev/)
    }
  })
})

describe('the app identity and the iOS and Android projects (reply 0033 §ب1, §ب4–6)', () => {
  const read = (p: string) => fs.readFileSync(path.join(WEB, p), 'utf8')
  const plistString = (xml: string, key: string) => xml.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`))?.[1]
  const stringsValue = (text: string, key: string) => text.match(new RegExp(`"${key}"\\s*=\\s*"([^"]*)";`))?.[1]
  const APP_ID = 'com.alkhammashtalal.imuslim'
  const LOCATION_AR = 'يُستعمل موقعك على جهازك لحساب مواقيت الصلاة واتجاه القبلة، ولا يُرسل موقعك الدقيق إلى أي خادم.'
  const USAGE = [
    'NSLocationWhenInUseUsageDescription',
    'NSLocationAlwaysAndWhenInUseUsageDescription',
    'NSMicrophoneUsageDescription',
    'NSPhotoLibraryAddUsageDescription',
  ]

  it('capacitor.config.ts: the appId, the name under the icon = the manifest short_name, dist, no server.url', async () => {
    const { default: config } = await import('../../web/capacitor.config')
    const manifest = JSON.parse(read('pwa-manifest.json')) as { short_name: string }
    expect(config.appId).toBe(APP_ID)
    expect(config.appName).toBe(manifest.short_name)
    expect(config.appName).toBe('مسلم')
    expect(config.webDir).toBe('dist')
    expect(config.server?.url).toBeUndefined()
  })

  it('iOS: bundle id, version 1.0.0 build 16 for the app and its widgets (builds 1 to 15 went to TestFlight on 13 to 15 October; replies 0042 to 0061; build 16 is build 15\'s code for the App Store, reply 0064), the ten languages among the regions, the strings and the privacy manifest in the app', () => {
    const pbx = read('ios/App/App.xcodeproj/project.pbxproj')
    // Debug and Release of the app, then of the widget extension (reply 0046), whose id starts with the app's.
    const WIDGETS = `${APP_ID}.widgets`
    expect(pbx.match(/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/g)).toEqual([APP_ID, APP_ID, WIDGETS, WIDGETS].map((id) => `PRODUCT_BUNDLE_IDENTIFIER = ${id};`))
    expect(pbx.match(/MARKETING_VERSION = [^;]+;/g)).toEqual(Array(4).fill('MARKETING_VERSION = 1.0.0;'))
    expect(pbx.match(/CURRENT_PROJECT_VERSION = [^;]+;/g)).toEqual(Array(4).fill('CURRENT_PROJECT_VERSION = 16;'))
    // The ten languages' permission texts (0048-add2 §6), so iOS offers the app's language and the App Store lists them.
    expect(pbx).toMatch(/knownRegions = \(\s*en,\s*ar,\s*Base,\s*ur,\s*id,\s*ms,\s*tr,\s*fr,\s*es,\s*bn,\s*hi,\s*\);/)
    expect(pbx).toContain('/* InfoPlist.strings in Resources */,')
    expect(pbx).toContain('/* PrivacyInfo.xcprivacy in Resources */,')
    expect(pbx).toContain('path = ar.lproj/InfoPlist.strings;')
    expect(pbx).toContain('path = en.lproj/InfoPlist.strings;')
  })

  it('iOS Info.plist: the name, no encryption of its own, the permission texts; no camera, no background location', () => {
    const info = read('ios/App/App/Info.plist')
    expect(plistString(info, 'CFBundleDisplayName')).toBe('مسلم')
    expect(plistString(info, 'CFBundleShortVersionString')).toBe('$(MARKETING_VERSION)')
    expect(plistString(info, 'CFBundleVersion')).toBe('$(CURRENT_PROJECT_VERSION)')
    expect(info).toMatch(/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/)
    for (const k of USAGE) expect(plistString(info, k), k).toBeTruthy()
    expect(info).not.toContain('NSCameraUsageDescription')
    // ion-ios-geolocation (under @capacitor/geolocation) links requestAlwaysAuthorization, so App Store Connect
    // refuses an upload without the «Always» key (ITMS-90683); the plugin only ever asks «While Using», so the
    // key carries the same text and the system never shows it.
    expect(plistString(info, 'NSLocationAlwaysAndWhenInUseUsageDescription')).toBe(plistString(info, 'NSLocationWhenInUseUsageDescription'))
    // No background location: the only background mode is the recitation's audio.
    const modes = info.match(/<key>UIBackgroundModes<\/key>\s*<array>([\s\S]*?)<\/array>/)?.[1] ?? ''
    expect([...modes.matchAll(/<string>([^<]*)<\/string>/g)].map((m) => m[1])).toEqual(['audio'])
    expect(info).not.toContain('NSLocationAlwaysUsageDescription')
  })

  const srcFiles = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name)
      return e.isDirectory() ? srcFiles(p) : /\.(ts|tsx)$/.test(e.name) ? [p] : []
    })
  const users = (re: RegExp) =>
    srcFiles(path.join(WEB, 'src'))
      .filter((f) => re.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(path.join(WEB, 'src'), f))
      .sort()

  it('the location plugin asks «While Using» only (the «Always» key is never shown), and the app never follows the position', () => {
    const plugin = fs.readFileSync(path.join(WEB, 'node_modules/@capacitor/geolocation/ios/Sources/GeolocationPlugin/GeolocationPlugin.swift'), 'utf8')
    expect([...plugin.matchAll(/requestLocationAuthorisation\(type: \.(\w+)\)/g)].map((m) => m[1])).toEqual(['whenInUse'])
    expect(users(/watchPosition|requestAlways/)).toEqual([])
  })

  it('Save Image: the ayah’s image is the only image the app shares', () => {
    expect(users(/\bshareImage\(/)).toEqual(['native/share.ts', 'v2/reading/ShareSheet.tsx'])
    expect(users(/import \{[^}]*\bShareSheet\b[^}]*\} from/)).toEqual(['quran/AyahSheet.tsx'])
  })

  it('iOS permission texts in Arabic (the location one word for word) and English', () => {
    const ar = read('ios/App/App/ar.lproj/InfoPlist.strings')
    const en = read('ios/App/App/en.lproj/InfoPlist.strings')
    expect(stringsValue(ar, 'NSLocationWhenInUseUsageDescription')).toBe(LOCATION_AR)
    expect(stringsValue(en, 'NSLocationWhenInUseUsageDescription')).toBe(
      'Your location is used on your device to calculate prayer times and the qibla direction. Your exact location is never sent to any server.',
    )
    // The «Always» key (required by Apple, never shown) says exactly the same in both languages.
    expect(stringsValue(ar, 'NSLocationAlwaysAndWhenInUseUsageDescription')).toBe(LOCATION_AR)
    expect(stringsValue(en, 'NSLocationAlwaysAndWhenInUseUsageDescription')).toBe(stringsValue(en, 'NSLocationWhenInUseUsageDescription'))
    // Save Image: the ayah's image is the only image the app shares (ShareSheet, from AyahSheet); a hadith is shared as text and a link.
    expect(stringsValue(ar, 'NSPhotoLibraryAddUsageDescription')).toBe('يُستعمل فقط حين تختار «حفظ الصورة» عند مشاركة آية، لتُضاف الصورة إلى صورك.')
    expect(stringsValue(en, 'NSPhotoLibraryAddUsageDescription')).toBe('Used only when you choose Save Image while sharing an ayah, to add that image to your Photos.')
    // The base Info.plist carries the English texts (the development region is en).
    const info = read('ios/App/App/Info.plist')
    for (const k of USAGE) {
      expect(stringsValue(en, k), k).toBe(plistString(info, k))
      expect(stringsValue(ar, k), k).toBeTruthy()
    }
    // The microphone text says what docs/PRIVACY.md says: only on a press, reviewed before sending, the audio not stored.
    expect(stringsValue(ar, 'NSMicrophoneUsageDescription')).toMatch(/تضغط.*تراجعه.*لا يُخزَّن الصوت/)
    expect(stringsValue(en, 'NSMicrophoneUsageDescription')).toMatch(/only when you press.*review.*not stored/)
  })

  it('iOS privacy manifest: no tracking, one required-reason API (the Filesystem plugin’s file dates, own container only), and the two kinds of data the server keeps, unlinked', () => {
    const p = read('ios/App/App/PrivacyInfo.xcprivacy')
    expect(p).toMatch(/<key>NSPrivacyTracking<\/key>\s*<false\/>/)
    expect(p).toMatch(/<key>NSPrivacyTrackingDomains<\/key>\s*<array\/>/)
    // reply 0033 §ب3: @capacitor/filesystem's library calls FileManager.attributesOfItem (creation/modification dates).
    const api = p.slice(p.indexOf('<key>NSPrivacyAccessedAPITypes</key>'), p.indexOf('<key>NSPrivacyCollectedDataTypes</key>'))
    expect([...api.matchAll(/<string>(NSPrivacyAccessedAPICategory[A-Za-z]+)<\/string>/g)].map((m) => m[1])).toEqual(['NSPrivacyAccessedAPICategoryFileTimestamp'])
    expect([...api.matchAll(/<string>([0-9A-F]{4}\.\d)<\/string>/g)].map((m) => m[1])).toEqual(['C617.1'])
    const types = [...p.matchAll(/<string>(NSPrivacyCollectedDataType[A-Za-z]+)<\/string>/g)].map((m) => m[1]).filter((t) => !t.includes('Purpose'))
    expect(types).toEqual(['NSPrivacyCollectedDataTypeOtherUserContent', 'NSPrivacyCollectedDataTypeCoarseLocation'])
    expect(p.match(/<key>NSPrivacyCollectedDataTypeLinked<\/key>\s*<false\/>/g)).toHaveLength(2)
    expect(p.match(/<key>NSPrivacyCollectedDataTypeTracking<\/key>\s*<false\/>/g)).toHaveLength(2)
    expect(p).not.toMatch(/<true\/>/)
  })

  it('iOS icon: the App Store icon is web/public/icons/icon-1024.png byte for byte', () => {
    const icon = fs.readFileSync(path.join(WEB, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'))
    expect(icon.equals(fs.readFileSync(path.join(WEB, 'public/icons/icon-1024.png')))).toBe(true)
  })

  it('Android: the same appId, version 1.0.0 build 1, the same name, the web view permissions the app uses', () => {
    const gradle = read('android/app/build.gradle')
    expect(gradle).toContain(`namespace = "${APP_ID}"`)
    expect(gradle).toContain(`applicationId "${APP_ID}"`)
    expect(gradle).toMatch(/versionCode 1\n/)
    expect(gradle).toContain('versionName "1.0.0"')
    expect(read('android/app/src/main/res/values/strings.xml')).toContain('<string name="app_name">مسلم</string>')
    const manifest = read('android/app/src/main/AndroidManifest.xml')
    const perms = [...manifest.matchAll(/uses-permission android:name="android\.permission\.([A-Z_]+)"/g)].map((m) => m[1]).sort()
    expect(perms).toEqual(['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'INTERNET', 'MODIFY_AUDIO_SETTINGS', 'RECORD_AUDIO'])
    expect(manifest).toContain('android:supportsRtl="true"')
  })
})

describe('building and running the iOS app with no keychain and no window (reply 0033-add3)', () => {
  const read = (p: string) => fs.readFileSync(path.join(WEB, p), 'utf8')
  it('ios-build.sh: the Mac’s git, no credential helper, no prompt, netrc not the keychain, exactly Package.resolved', () => {
    const sh = read('scripts/ios-build.sh')
    expect(sh).toContain('-scmProvider system')
    expect(sh).toContain('-packageAuthorizationProvider netrc')
    expect(sh).toContain('-disableAutomaticPackageResolution')
    expect(sh).toMatch(/export GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=credential\.helper GIT_CONFIG_VALUE_0=\n/)
    expect(sh).toContain('export GIT_TERMINAL_PROMPT=0')
    // Every xcodebuild call in it uses those options (one array), and none resolves on its own outside them.
    const calls = sh.split('\n').filter((l) => /^\s*xcodebuild /.test(l))
    expect(calls.length).toBeGreaterThan(0)
    for (const l of calls) {
      // The export resolves no package; it signs and uploads with the API key alone.
      if (l.includes('-exportArchive')) expect(sh).toMatch(/-exportPath "\$OUT\/export" "\$\{AUTH\[@\]\}"/)
      else expect(l).toContain('"${COMMON[@]}"')
    }
    // Apple is reached only with an App Store Connect API key, never the Xcode account in the keychain (reply 0033-add5).
    const code = sh.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n')
    expect(code.match(/-allowProvisioningUpdates/g)).toHaveLength(1)
    expect(sh).toMatch(/AUTH=\(-allowProvisioningUpdates -authenticationKeyPath "\$KEY" -authenticationKeyID "\$ASC_KEY_ID" -authenticationKeyIssuerID "\$ASC_ISSUER_ID"\)/)
    const opts = read('ios/ExportOptions.plist')
    // Never TestFlight-only again (reply 0064): builds 1 to 15 were INTERNAL_ONLY, and App Store Connect would not add
    // build 15 to version 1.0.0 («The specified pre-release build could not be added»).
    expect(opts).not.toContain('testFlightInternalTestingOnly')
    expect(opts).toMatch(/<key>method<\/key>\s*<string>app-store-connect<\/string>/)
    expect(opts).toMatch(/<key>teamID<\/key>\s*<string>Z5XP77C6S7<\/string>/)
    expect(fs.existsSync(path.join(WEB, 'ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved'))).toBe(true)
  })
  it('an archive is never made from an older copy of the web build (reply 0042): App/public must equal web/dist and be the native build', () => {
    const sh = read('scripts/ios-build.sh')
    expect(sh).toContain('cmp -s "$WEB/dist/index.html" "$APP_DIR/App/public/index.html"')
    expect(sh).toContain(`grep -q 'http-equiv="Content-Security-Policy"' "$APP_DIR/App/public/index.html"`)
  })
  it('nothing in web/scripts opens a window or drives the screen; the simulator is a device set of its own', () => {
    for (const f of fs.readdirSync(path.join(WEB, 'scripts'))) {
      const code = read(`scripts/${f}`)
        .split('\n')
        .filter((l) => !/^\s*(#|\/\/)/.test(l))
        .join('\n')
      expect(code, f).not.toMatch(/\bosascript\b|open -a|Simulator\.app|System Events/)
    }
    const sim = read('scripts/ios-sim.sh')
    expect(sim).toContain('sim() { xcrun simctl --set "$SET" "$@"; }')
    expect(sim.split('\n').filter((l) => /xcrun simctl /.test(l) && !l.includes('--set'))).toEqual([])
  })
  it('cap:sync touches iOS only (Android waits, reply 0034)', async () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> }
    expect(pkg.scripts['cap:sync']).toBe('cap sync ios')
    expect(Object.values(pkg.scripts).filter((s) => /\bcap (sync|copy|update)\b(?! ios)/.test(s))).toEqual([])
  })
  it('no white between the launch screen and the page: the launch screen’s sky behind the web view', () => {
    expect(read('ios/App/App/SceneDelegate.swift')).toMatch(/window\?\.rootViewController = AppViewController\(\)/)
    const vc = read('ios/App/App/AppViewController.swift')
    expect(vc).toMatch(/class AppViewController: CAPBridgeViewController/)
    expect(vc).toContain('UIColor(named: "LaunchSky")')
    expect(vc).toContain('webView?.isOpaque = false')
    expect(read('ios/App/App.xcodeproj/project.pbxproj')).toMatch(/AppViewController\.swift in Sources \*\/,/)
    // LaunchSky is the launch image's own colour, light and dark (web/scripts/native-assets.mjs: #9fc0e8, #040a1c).
    const sky = JSON.parse(read('ios/App/App/Assets.xcassets/LaunchSky.colorset/Contents.json')) as {
      colors: { appearances?: { value: string }[]; color: { components: { red: string; green: string; blue: string } } }[]
    }
    const hex = (c: { red: string; green: string; blue: string }) => '#' + [c.red, c.green, c.blue].map((x) => x.slice(2).toLowerCase()).join('')
    expect(sky.colors.map((c) => [c.appearances?.[0]?.value ?? 'any', hex(c.color.components)])).toEqual([
      ['any', '#9fc0e8'],
      ['dark', '#040a1c'],
    ])
  })
  it('the launch screen is the welcome page as first drawn: the painting with «مسلم» and the two marks, in the page\'s own box (0061; 0049 ب)', () => {
    const sb = read('ios/App/App/Base.lproj/LaunchScreen.storyboard')
    // 0061: the image stretched to its box (scaleToFill), the box the page's own (Welcome.tsx artBox): the whole screen
    // while its shape is within the band (2% narrower, or 0.05% wider: every Face ID iPhone), else whole at the
    // screen's height, centred, on the sky.
    expect(sb).toContain('<color key="backgroundColor" name="LaunchWelcomeSky"/>')
    expect(sb).toMatch(/<imageView [^>]*contentMode="scaleToFill"[^>]*image="LaunchWelcomeFull"[^>]*translatesAutoresizingMaskIntoConstraints="NO"/)
    expect(sb).toMatch(/firstAttribute="width" relation="lessThanOrEqual" secondItem="snD-IY-ifK" secondAttribute="height" multiplier="0\.462254"/)
    expect(sb).toMatch(/firstAttribute="width" relation="greaterThanOrEqual" secondItem="snD-IY-ifK" secondAttribute="height" multiplier="0\.452783"/)
    expect(sb).toMatch(/firstItem="snD-IY-ifK" firstAttribute="width" secondItem="Lw0-61-Sky" secondAttribute="width" priority="750"/)
    expect(sb).toMatch(/firstItem="snD-IY-ifK" firstAttribute="height" secondItem="Lw0-61-Sky" secondAttribute="height" priority="750"/)
    for (const a of ['centerX', 'centerY']) expect(sb).toMatch(new RegExp(`firstItem="snD-IY-ifK" firstAttribute="${a}" secondItem="Lw0-61-Sky" secondAttribute="${a}"`))
    const AR = 1320 / 2857
    expect(0.462254 / AR).toBeCloseTo(1.0005, 4)
    expect(0.452783 / AR).toBeCloseTo(0.98, 4)
    // A new name: iOS keeps a launch image by its name, and drew the old wordless painting under the old one (0061).
    expect(fs.existsSync(path.join(WEB, 'ios/App/App/Assets.xcassets/LaunchWelcome.imageset'))).toBe(false)
    // The image is the page itself drawn by WebKit (web/scripts/launch-image.mjs, which checks every pixel outside «مسلم»
    // and the marks is the painting's own), 1320 × 2857 at 3×.
    const png = fs.readFileSync(path.join(WEB, 'ios/App/App/Assets.xcassets/LaunchWelcomeFull.imageset/launch-welcome@3x.png'))
    expect(createHash('sha256').update(png).digest('hex')).toBe('a0afa058061136ba24e79a6a32ddcfa9a8cf02a2ab9c9c7f30a235d970a63349')
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1320, 2857])
    const set = JSON.parse(read('ios/App/App/Assets.xcassets/LaunchWelcomeFull.imageset/Contents.json')) as { images: { filename: string; scale: string }[] }
    expect(set.images).toEqual([{ filename: 'launch-welcome@3x.png', idiom: 'universal', scale: '3x' }])
    expect(read('scripts/launch-image.mjs')).toContain("'.wl-tagline, .wl-lang, .wl-start { visibility: hidden !important; }'")
    const sky = JSON.parse(read('ios/App/App/Assets.xcassets/LaunchWelcomeSky.colorset/Contents.json')) as { colors: { color: { components: { red: string; green: string; blue: string } } }[] }
    expect(sky.colors.map((c) => [c.color.components.red, c.color.components.green, c.color.components.blue].map((x) => x.slice(2).toLowerCase()).join(''))).toEqual(['13306b'])
    // The page goes under it only once it is the same (Welcome.tsx): the painting an <img> decoded, the marks decoded, the
    // fonts named and loaded; and what changes with the language comes in after (welcome.css).
    const wl = read('src/v2/welcome/Welcome.tsx')
    expect(wl).toContain('<img className="wl-paint" ref={paint} src="/art/welcome-B4.webp" alt="" aria-hidden="true" decoding="sync"')
    expect(wl).toContain('paint.current?.decode()')
    for (const m of ["decoded('/brand/logo-i.png')", "decoded('/brand/logo-palm.png')", "font(`700 50px ${TEXT_FONT}`, 'مسلم')"]) expect(wl).toContain(m)
    const css = read('src/v2/welcome/welcome.css')
    expect(css).not.toContain("background: url('/art/welcome-B4.webp')")
    expect(css).toMatch(/\.wl-tagline,\n\.wl-lang,\n\.wl-start \{\n  opacity: 0;\n  transition: opacity 200ms ease-out;/)
    // @capacitor/splash-screen keeps the launch screen over the web view until the welcome (or the page) is drawn, then
    // goes at once; by itself after four seconds otherwise.
    const pkg = JSON.parse(read('package.json')) as { dependencies: Record<string, string> }
    expect(pkg.dependencies['@capacitor/splash-screen']).toBe('8.0.2')
    const cfg = read('capacitor.config.ts')
    expect(cfg).toMatch(/SplashScreen: \{ launchShowDuration: 4000, launchAutoHide: true, showSpinner: false \}/)
    expect(read('src/native/launch.ts')).toContain('SplashScreen.hide({ fadeOutDuration: 0 })')
    expect(read('ios/App/CapApp-SPM/Package.swift')).toContain('.product(name: "CapacitorSplashScreen", package: "CapacitorSplashScreen")')
  })
})

describe('«عن التطبيق» for the store (reply 0042)', () => {
  const read = (p: string) => fs.readFileSync(path.join(WEB, p), 'utf8')
  it('the version shown is the build\'s: web/package.json equals MARKETING_VERSION, through __APP_VERSION__', () => {
    const v = (JSON.parse(read('package.json')) as { version: string }).version
    expect(v).toBe('1.0.0')
    for (const m of read('ios/App/App.xcodeproj/project.pbxproj').matchAll(/MARKETING_VERSION = ([^;]+);/g)) expect(m[1]).toBe(v)
    expect(read('vite.config.ts')).toContain('__APP_VERSION__: JSON.stringify(pkg.version)')
    expect(read('src/components/About.tsx')).toContain('fmt(t.versionLine, { v: __APP_VERSION__ })')
  })
  it('no team, no AI-tools disclosure, no source-code or judges\' link on the page, and their strings are gone', async () => {
    const about = read('src/components/About.tsx')
    for (const gone of ['teamTitle', 'aiTitle', 'aiBody', 'repoTitle', 'REPO_URL', 'github.com', '/verify']) expect(about, gone).not.toContain(gone)
    expect(read('src/App.tsx')).not.toMatch(/judgesLink|verify-entry/)
    const { STRINGS } = await import('../../web/src/i18n')
    for (const [l, t] of Object.entries(STRINGS)) {
      for (const k of ['teamTitle', 'teamLead', 'teamReview', 'aiTitle', 'aiBody', 'repoTitle', 'repoLink']) expect(k in t, `${l}.${k}`).toBe(false)
      const s = t as unknown as Record<string, string>
      expect(s.versionLine, l).toMatch(/\{v\}/)
      expect(s.versionLine, l).not.toMatch(/0[.٫]1|قيد التطوير|development/i)
      expect(s.licensesBody, l).not.toMatch(/إم آي تي\)|كود المشروع|Project code/)
      expect(s.how4 + s.privacyBody + s.aboutLanguages, l).not.toMatch(/DeepSeek|ديب سيك|Whisper|ويسبر|Claude|كلود|Cloudflare|كلاودفلير/i)
    }
    expect(STRINGS.ar.how4).toBe('يرتّب الذكاء الاصطناعي هذه النصوص ويختار منها ما يجيب سؤالك، ولا يكتب نصًا شرعيًا.')
    // Reply 0043-add3: the three counts come from data/served-langs.json, with the noun by the language's plural rules.
    const { CONTENT_COUNTS } = await import('../../web/src/v2/lang/served')
    expect(CONTENT_COUNTS.meanings).toBeGreaterThanOrEqual(30)
    expect(CONTENT_COUNTS.mukhtasar).toBeGreaterThanOrEqual(27)
    expect(CONTENT_COUNTS.hadith).toBeGreaterThanOrEqual(9)
    const pl = (l: 'ar' | 'en', n: number) => {
      const c = STRINGS[l].langCount as Record<string, string>
      return (c[new Intl.PluralRules(l).select(n)] ?? c.other).replace('{n}', String(n))
    }
    expect([pl('ar', 30), pl('ar', 27), pl('ar', 9), pl('ar', 3), pl('ar', 11)]).toEqual(['30 لغة', '27 لغة', '9 لغات', '3 لغات', '11 لغة'])
    expect([pl('en', 1), pl('en', 9)]).toEqual(['1 language', '9 languages'])
    for (const [l, t] of Object.entries(STRINGS)) {
      const s = t as unknown as Record<string, string>
      for (const k of ['{m}', '{x}', '{h}']) expect(s.aboutLanguages, `${l} ${k}`).toContain(k)
    }
    expect(STRINGS.ar.aboutLanguages).toContain('ولا نترجم آية ولا حديثًا آليًا')

    expect(STRINGS.ar.privacyBody).toBe('لا حسابات ولا بيانات شخصية، وموقعك يبقى على جهازك.')
  })
})

describe('iPhone only, portrait only (reply 0037 §3.1–2)', () => {
  const read = (p: string) => fs.readFileSync(path.join(WEB, p), 'utf8')
  it('the app target builds for iPhone alone, so the store asks for no iPad screenshots', () => {
    const fams = [...read('ios/App/App.xcodeproj/project.pbxproj').matchAll(/TARGETED_DEVICE_FAMILY = ([^;]+);/g)].map((m) => m[1])
    expect(fams.length).toBeGreaterThan(0)
    expect(new Set(fams)).toEqual(new Set(['1']))
  })
  it('one orientation: portrait', () => {
    const info = read('ios/App/App/Info.plist')
    const m = info.match(/<key>UISupportedInterfaceOrientations<\/key>\s*<array>([\s\S]*?)<\/array>/)
    expect([...(m?.[1] ?? '').matchAll(/<string>([^<]+)<\/string>/g)].map((x) => x[1])).toEqual(['UIInterfaceOrientationPortrait'])
    expect(info).not.toContain('UISupportedInterfaceOrientations~ipad')
  })
})

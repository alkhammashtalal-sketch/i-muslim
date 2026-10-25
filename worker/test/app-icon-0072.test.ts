// The app icon «المورّقة» and its choice among four in the settings (add-ons 0072-add32, 0072-add31 and 0072-add30 §2):
// the files in the iPhone's asset catalog are the approved ones byte for byte (relay/w1/0072-icon-v2/MD5), RGB with no alpha (the App Store refuses
// alpha in the 1024 icon), the dark and tinted appearances in the same set; the three alternates are listed in the build
// setting and allowed by the plugin, and nothing else; the plugin's wrapper (web/src/native/app-icon.ts) on the iPhone,
// on Android and in the browser; the settings' texts in the ten languages. The Android launcher icon is
// android-icon-0072.test.ts's.
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const ROOT = path.resolve(import.meta.dirname, '../..')
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')
const md5 = (f: string) => createHash('md5').update(fs.readFileSync(path.join(ROOT, f))).digest('hex')
const CAT = 'web/ios/App/App/Assets.xcassets'
const TEN = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const

/** The PNG's width, height, bit depth and colour type (IHDR), and whether it carries a tRNS chunk. */
function pngHeader(f: string) {
  const b = fs.readFileSync(path.join(ROOT, f))
  expect(b.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  const chunks: string[] = []
  for (let i = 8; i < b.length; ) {
    const len = b.readUInt32BE(i)
    chunks.push(b.subarray(i + 4, i + 8).toString('latin1'))
    i += 12 + len
  }
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20), depth: b[24], colourType: b[25], chunks }
}

describe('the iPhone app icon: the approved files as they are', () => {
  // relay/w1/0072-icon-v2/MD5 (add-on 0072-add32, which replaced 0072-add31's files).
  const FILES: [string, string][] = [
    [`${CAT}/AppIcon.appiconset/AppIcon.png`, '9d991f2ffa939529aae8293154a0cd67'], // icon-default.png «المورّقة»
    [`${CAT}/AppIcon.appiconset/AppIcon-dark.png`, 'b5c549a33553b764e5c531ecd9ddc1c8'], // icon-dark.png
    [`${CAT}/AppIcon.appiconset/AppIcon-tinted.png`, '30ce7e08b6953d6ceaa0980c3c15e1d2'], // icon-tinted.png
    [`${CAT}/AppIconClassic.appiconset/AppIconClassic.png`, '728adc66c8208f9ed661dddcb6bc93d9'], // icon-alt-classic.png «الصافية»
    [`${CAT}/AppIconFramed.appiconset/AppIconFramed.png`, 'ed4d96340b32987feeda5b1f5fe07f5d'], // icon-alt-framed.png
    [`${CAT}/AppIconIvory.appiconset/AppIconIvory.png`, '2d018950f2427ef34caa20bc110b60b3'], // icon-alt-ivory.png
  ]
  it('each file byte for byte, 1024 × 1024, 8-bit RGB without alpha and without tRNS', () => {
    for (const [f, sum] of FILES) {
      expect(md5(f), f).toBe(sum)
      const h = pngHeader(f)
      expect([h.w, h.h, h.depth, h.colourType], f).toEqual([1024, 1024, 8, 2])
      expect(h.chunks, f).not.toContain('tRNS')
    }
  })

  it('one 1024 image per appearance: any, dark and tinted in AppIcon; the alternates light only', () => {
    type Img = { filename: string; idiom: string; platform: string; size: string; appearances?: { appearance: string; value: string }[] }
    const set = (n: string) => (JSON.parse(read(`${CAT}/${n}.appiconset/Contents.json`)) as { images: Img[] }).images
    const looks = (imgs: Img[]) => imgs.map((i) => [i.filename, i.appearances?.map((a) => `${a.appearance}:${a.value}`).join() ?? 'any'])
    for (const i of [...set('AppIcon'), ...set('AppIconClassic'), ...set('AppIconFramed'), ...set('AppIconIvory')]) expect([i.idiom, i.platform, i.size]).toEqual(['universal', 'ios', '1024x1024'])
    expect(looks(set('AppIcon'))).toEqual([
      ['AppIcon.png', 'any'],
      ['AppIcon-dark.png', 'luminosity:dark'],
      ['AppIcon-tinted.png', 'luminosity:tinted'],
    ])
    expect(looks(set('AppIconClassic'))).toEqual([['AppIconClassic.png', 'any']])
    expect(looks(set('AppIconFramed'))).toEqual([['AppIconFramed.png', 'any']])
    expect(looks(set('AppIconIvory'))).toEqual([['AppIconIvory.png', 'any']])
    // The old icon is gone from the set (it stays the web app's: web/public/icons/icon-1024.png).
    expect(fs.existsSync(path.join(ROOT, CAT, 'AppIcon.appiconset/AppIcon-512@2x.png'))).toBe(false)
    // No Icon Composer file: it would replace the asset catalog (relay/w1/0072-icon-choice/README.md).
    expect(fs.readdirSync(path.join(ROOT, 'web/ios/App/App')).filter((f) => f.endsWith('.icon'))).toEqual([])
  })

  it('the build: AppIcon primary, the three alternates by the asset catalog build setting, no other icon set shipped', () => {
    const pbx = read('web/ios/App/App.xcodeproj/project.pbxproj')
    expect(pbx.match(/ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;/g)).toHaveLength(2)
    expect(pbx.match(/ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES = "AppIconClassic AppIconFramed AppIconIvory";/g)).toHaveLength(2)
    expect(pbx.match(/ASSETCATALOG_COMPILER_INCLUDE_ALL_APPICON_ASSETS = NO;/g)).toHaveLength(2)
    // actool writes CFBundleAlternateIcons itself; the Info.plist has no hand-written icon dictionary to disagree.
    expect(read('web/ios/App/App/Info.plist')).not.toContain('CFBundleIcons')
    // Only these four icon sets in the catalog.
    expect(fs.readdirSync(path.join(ROOT, CAT)).filter((f) => f.endsWith('.appiconset')).sort()).toEqual(['AppIcon.appiconset', 'AppIconClassic.appiconset', 'AppIconFramed.appiconset', 'AppIconIvory.appiconset'])
  })

  it('the plugin: compiled into the app, registered, and allowing only the three alternates', () => {
    const pbx = read('web/ios/App/App.xcodeproj/project.pbxproj')
    expect(pbx).toContain('/* AppIconPlugin.swift in Sources */ = {isa = PBXBuildFile;')
    expect(pbx.match(/AppIconPlugin\.swift in Sources \*\/,/g)).toHaveLength(1)
    expect(read('web/ios/App/App/AppViewController.swift')).toContain('bridge?.registerPluginInstance(AppIconPlugin())')
    const swift = read('web/ios/App/App/AppIconPlugin.swift')
    expect(swift).toContain('public let jsName = "AppIcon"')
    expect(swift).toContain('private static let alternates: Set<String> = ["AppIconClassic", "AppIconFramed", "AppIconIvory"]')
    expect(swift).toContain('app.setAlternateIconName(name)')
    // The system's notice is not hidden: no private selector that changes the icon silently.
    expect(swift).not.toMatch(/_setAlternateIconName|suppress|performSelector/)
  })
})

// The app's page as Capacitor's bridge sees it (as e2e/v2-0072-alerts.spec.ts does), set before @capacitor/core loads:
// it keeps these two objects, so each test changes the platform's name and the plugin's answers in place.
const bridge = vi.hoisted(() => {
  const state = {
    platform: { name: 'web', plugins: {} },
    answers: {} as Record<string, (o: unknown) => unknown>,
    calls: [] as { method: string; options: unknown }[],
  }
  const g = globalThis as unknown as Record<string, unknown>
  g.CapacitorCustomPlatform = state.platform
  g.Capacitor = {
    PluginHeaders: [{ name: 'AppIcon', methods: [{ name: 'get', rtype: 'promise' }, { name: 'set', rtype: 'promise' }] }],
    nativePromise: async (_plugin: string, method: string, options: unknown) => {
      state.calls.push({ method, options })
      const f = state.answers[method]
      if (!f) throw new Error('UNIMPLEMENTED') // an older build without the plugin
      return f(options)
    },
    nativeCallback: () => 'cb',
  }
  return state
})
const asApp = (name: 'ios' | 'android' | 'web', answers: Record<string, (o: unknown) => unknown>) => {
  bridge.platform.name = name
  bridge.answers = answers
  bridge.calls = []
  return bridge.calls
}

describe('the wrapper web/src/native/app-icon.ts', () => {
  afterEach(() => {
    asApp('web', {})
  })

  it('the four in order, the primary first, each with its thumbnail in web/public', async () => {
    const { APP_ICONS, iconIdOf } = await import('../../web/src/native/app-icon')
    expect(APP_ICONS.map((i) => [i.id, i.native])).toEqual([
      ['ornate', null],
      ['classic', 'AppIconClassic'],
      ['framed', 'AppIconFramed'],
      ['ivory', 'AppIconIvory'],
    ])
    for (const i of APP_ICONS) {
      const h = pngHeader(`web/public${i.thumb}`)
      expect([h.w, h.h, h.colourType], i.thumb).toEqual([192, 192, 2])
    }
    expect([iconIdOf(null), iconIdOf(undefined), iconIdOf('AppIconClassic'), iconIdOf('AppIconFramed'), iconIdOf('AppIconIvory'), iconIdOf('Other')]).toEqual([
      'ornate',
      'ornate',
      'classic',
      'framed',
      'ivory',
      'ornate',
    ])
  })

  it('on the iPhone: reads the icon on the Home Screen, and sets an alternate or the primary by its set name', async () => {
    let now: string | null = 'AppIconIvory'
    const calls = asApp('ios', {
      get: () => ({ supported: true, name: now }),
      set: (o) => {
        now = (o as { name: string | null }).name
        return { name: now }
      },
    })
    const { currentAppIcon, setAppIcon } = await import('../../web/src/native/app-icon')
    expect(await currentAppIcon()).toBe('ivory')
    expect(await setAppIcon('classic')).toBe(true)
    expect(await setAppIcon('ornate')).toBe(true)
    expect(calls.filter((c) => c.method === 'set').map((c) => c.options)).toEqual([{ name: 'AppIconClassic' }, { name: null }])
    expect(await currentAppIcon()).toBe('ornate')
  })

  it('on the iPhone: a refusal or an error is «not changed»; no support or no plugin hides the choice', async () => {
    const m = await import('../../web/src/native/app-icon')
    asApp('ios', { get: () => ({ supported: false, name: null }), set: () => Promise.reject(new Error('cancelled')) })
    expect(await m.currentAppIcon()).toBeNull()
    expect(await m.setAppIcon('ivory')).toBe(false)
    asApp('ios', {})
    expect(await m.currentAppIcon()).toBeNull()
    expect(await m.setAppIcon('framed')).toBe(false)
  })

  it('on Android and in the browser: nothing is asked of any plugin, and nothing is shown', async () => {
    const m = await import('../../web/src/native/app-icon')
    for (const p of ['android', 'web'] as const) {
      const calls = asApp(p, { get: () => ({ supported: true, name: null }), set: () => ({ name: null }) })
      expect(await m.currentAppIcon(), p).toBeNull()
      expect(await m.setAppIcon('framed'), p).toBe(false)
      expect(calls, p).toEqual([])
    }
  })
})

describe('the settings: «أيقونة التطبيق»', () => {
  it('the ten languages, the Arabic names as Talal gave them, the others by their meaning, no Latin letter in Arabic', async () => {
    const { APP_ICON_TEXT } = await import('../../web/src/native/app-icon-strings')
    expect(Object.keys(APP_ICON_TEXT).sort()).toEqual([...TEN].sort())
    expect(APP_ICON_TEXT.ar.names).toEqual({ ornate: 'المورّقة', classic: 'الصافية', framed: 'المؤطّرة', ivory: 'العاجية' })
    expect(APP_ICON_TEXT.en.names).toEqual({ ornate: 'Ornate', classic: 'Classic', framed: 'Framed', ivory: 'Ivory' })
    for (const l of TEN) {
      const t = APP_ICON_TEXT[l]
      for (const v of [t.section, t.hint, t.isDefault, t.error, ...Object.values(t.names)]) expect(v.trim(), l).not.toBe('')
      expect(new Set(Object.values(t.names)).size, l).toBe(4)
    }
    for (const v of Object.values(APP_ICON_TEXT.ar).flatMap((x) => (typeof x === 'string' ? [x] : Object.values(x)))) expect(v).not.toMatch(/[A-Za-z]/)
    // Calm and short (CLAUDE.md §11): no exclamation mark.
    for (const l of TEN) expect(JSON.stringify(APP_ICON_TEXT[l]), l).not.toMatch(/[!！]/)
  })

  it('in the app only, after «التنبيهات»; the web build never precaches the thumbnails', () => {
    const sheets = read('web/src/components/Sheets.tsx')
    expect(sheets).toContain('{isNative() && <AppIconSettings lang={lang} />}')
    expect(sheets.indexOf('<AlertSettings lang={lang} />')).toBeLessThan(sheets.indexOf('<AppIconSettings lang={lang} />'))
    const comp = read('web/src/native/AppIconSettings.tsx')
    expect(comp).toContain('if (current === null) return null')
    expect(comp).toContain('role="radiogroup"')
    expect(read('web/vite.config.ts')).toContain("'**/app-icons/*.png'")
  })
})

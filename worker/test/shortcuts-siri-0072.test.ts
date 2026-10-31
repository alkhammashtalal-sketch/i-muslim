// Add-on 0072-add30 §3 and §4: the app icon's menu (touch and hold) «سبّح»، «اسأل»، «القبلة»، «أذكار الوقت» on iOS
// (QuickActions.swift) and Android (android/shortcuts.ts), and Siri and Spotlight's App Shortcuts «متى الصلاة
// القادمة؟»، «افتح المسبحة»، «اسم الله لليوم» (MuslimShortcuts.swift, SiriAnswers.swift). The answers are computed here
// by the app's own Swift, compiled on the Mac (skipped elsewhere), from files shaped as the app writes widgets.json.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { ASK_LINK, ASK_PATH, QUICK_IDS, QUICK_LINKS, quickLabel } from '../../web/src/native/quick-actions'
import { widgetPath } from '../../web/src/native/NativeDevice'
import { parseRoute } from '../../web/src/quran/route'
import { WIDGET_STRINGS } from '../../web/src/native/widget-strings'
import type { WidgetData, WidgetTime } from '../../web/src/native/widget-data'
import type { WidgetNameDay } from '../../web/src/native/widget-names'

const ROOT = path.resolve(__dirname, '../..')
const IOS = path.join(ROOT, 'web/ios/App')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')
const strings = (lang: string, f: string) =>
  Object.fromEntries([...fs.readFileSync(path.join(IOS, `App/${lang}.lproj/${f}`), 'utf8').matchAll(/^"((?:[^"\\]|\\.)*)" = "((?:[^"\\]|\\.)*)";$/gm)].map((m) => [m[1], m[2]]))
const swiftFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (['build', 'Pods', 'public'].includes(e.name) ? [] : swiftFiles(path.join(dir, e.name))) : e.name.endsWith('.swift') ? [path.join(dir, e.name)] : []))

describe('§3 the app icon’s menu', () => {
  it('four, in this order, in the ten languages, with the app’s own words', () => {
    expect([...QUICK_IDS]).toEqual(['tasbih', 'ask', 'qibla', 'adhkar'])
    expect(QUICK_IDS.map((id) => quickLabel(id, 'ar'))).toEqual(['سبّح', 'اسأل', 'القبلة', 'أذكار الوقت'])
    expect(QUICK_IDS.map((id) => quickLabel(id, 'en'))).toEqual(['Tasbih', 'Ask', 'Qibla', 'Adhkar of the time'])
    for (const l of LANGS) for (const id of QUICK_IDS) expect(quickLabel(id, l), `${l} ${id}`).toMatch(/\S/)
    for (const l of LANGS) for (const id of QUICK_IDS) expect(quickLabel(id, l)).not.toMatch(/[!+]/)
  })

  it('each opens its page by the app’s link, the routes the widgets and controls already use', () => {
    expect(QUICK_LINKS).toEqual({ tasbih: 'imuslim://today/tasbih', ask: 'imuslim://ask', qibla: 'imuslim://today/qibla', adhkar: 'imuslim://today/adhkar' })
    expect(parseRoute(widgetPath(QUICK_LINKS.tasbih)!)).toEqual({ view: 'tools', tool: 'tasbih' })
    expect(parseRoute(widgetPath(QUICK_LINKS.qibla)!)).toEqual({ view: 'today', tool: 'qibla' })
    expect(parseRoute(widgetPath(QUICK_LINKS.adhkar)!)).toEqual({ view: 'tools', tool: 'adhkar' })
    // «اسأل»: no page of its own; the link goes home and focuses the question box.
    expect(widgetPath(ASK_LINK)).toBe(ASK_PATH)
    const nd = read('web/src/native/NativeDevice.tsx')
    expect(nd).toMatch(/if \(path === ASK_PATH\) \{\n\s+go\('\/'\)\n\s+return focusAskSoon\(\)/)
    const fa = read('web/src/v2/home/focus-ask.ts')
    expect(fa).toContain("document.getElementById('q')")
    expect(read('web/src/v2/daily/shortcuts/Shortcuts.tsx')).toContain("import { focusAsk } from '../../home/focus-ask'")
    // The adhkar page with no ?part= shows the list of the time.
    expect(read('web/src/v2/daily/adhkar/Adhkar.tsx')).toContain("const asked = new URLSearchParams(location.search).get('part')")
  })

  it('iOS: dynamic quick actions in the app’s language, the same words, the same links; cold start and running', () => {
    const qa = read('web/ios/App/App/QuickActions.swift')
    expect(qa).toContain('static let ids = ["tasbih", "ask", "qibla", "adhkar"]')
    expect(qa).toContain('case "tasbih": return URL(string: "imuslim://today/tasbih")')
    expect(qa).toContain('case "ask": return URL(string: "imuslim://ask")')
    expect(qa).toContain('case "qibla": return URL(string: "imuslim://today/qibla")')
    expect(qa).toContain('return MuslimRouter.url(.adhkar, now: now)')
    expect(qa).toContain('UIApplication.shared.shortcutItems =')
    expect(qa).toContain('ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])')
    expect(qa).toContain('forName: .capacitorViewDidAppear')
    for (const l of LANGS) {
      const loc = strings(l, 'Localizable.strings')
      for (const id of QUICK_IDS) expect(loc[`quick.${id}`], `${l} ${id}`).toBe(quickLabel(id, l))
    }
    const scene = read('web/ios/App/App/SceneDelegate.swift')
    expect(scene).toContain('if let item = connectionOptions.shortcutItem, let url = QuickActions.url(item) { QuickActions.deliver(url) }')
    expect(scene).toContain('func windowScene(_ windowScene: UIWindowScene, performActionFor shortcutItem: UIApplicationShortcutItem, completionHandler: @escaping (Bool) -> Void)')
    expect(scene).toContain('func sceneWillResignActive(_ scene: UIScene) {\n        QuickActions.install()')
    const app = read('web/ios/App/App/AppDelegate.swift')
    expect(app).toContain('QuickActions.watch()\n        QuickActions.install()')
    // No static items: their titles would follow the phone's language, not the app's.
    expect(read('web/ios/App/App/Info.plist')).not.toContain('UIApplicationShortcutItems')
  })

  it('Android: the icon’s shortcuts are the same four, with their icons in res/drawable', async () => {
    const { iconShortcuts } = await import('../../web/src/native/android/shortcuts')
    for (const l of LANGS) {
      const s = iconShortcuts(l)
      expect(s.map((x) => x.url)).toEqual(QUICK_IDS.map((id) => QUICK_LINKS[id]))
      expect(s.map((x) => x.label)).toEqual(QUICK_IDS.map((id) => quickLabel(id, l)))
    }
    const res = path.join(ROOT, 'web/android/app/src/main/res/drawable')
    for (const i of iconShortcuts('ar').map((x) => x.icon)) expect(fs.existsSync(path.join(res, `mq_${i}.xml`)), i).toBe(true)
    expect(fs.existsSync(path.join(ROOT, 'web/android/app/src/main/res/xml/shortcuts.xml'))).toBe(false)
  })
})

describe('§4 Siri and Spotlight', () => {
  const provider = read('web/ios/App/App/MuslimShortcuts.swift')

  it('one AppShortcutsProvider in the app, ten App Shortcuts at most, ours first', () => {
    const all = [...swiftFiles(path.join(IOS, 'App')), ...swiftFiles(path.join(IOS, 'Shared')), ...swiftFiles(path.join(IOS, 'MuslimWidgets'))]
    const providers = all.filter((f) => /:\s*AppShortcutsProvider\b/.test(fs.readFileSync(f, 'utf8')))
    expect(providers.map((f) => path.basename(f))).toEqual(['MuslimShortcuts.swift'])
    // Two declarations, one per build (with or without «أذكار المواقف»), each the whole list: no #if inside the builder,
    // whose content the App Intents metadata extraction leaves out.
    const [reviewed, without] = provider.slice(provider.indexOf('#if MAWAQIF_REVIEWED')).split('#else')
    const list = (s: string) => [...s.matchAll(/^\s+AppShortcut\(intent: (\w+)\(/gm)].map((m) => m[1])
    expect(list(reviewed)).toHaveLength(10)
    expect(list(without)).toEqual(['NextPrayerIntent', 'OpenTasbihIntent', 'NameOfDayIntent'])
    expect(list(reviewed).slice(0, 3)).toEqual(list(without))
    const body = provider.slice(provider.indexOf('static var appShortcuts'))
    expect(body.split('static var appShortcuts').every((b) => !/^\s*#if/m.test(b.slice(0, b.indexOf('\n    }\n'))))).toBe(true)
  })

  it('the answers never open the app; the tasbih does, at its page', () => {
    for (const n of ['NextPrayerIntent', 'NameOfDayIntent']) {
      const body = provider.slice(provider.indexOf(`struct ${n}: AppIntent`))
      expect(body.slice(0, 600), n).toContain('static let openAppWhenRun: Bool = false')
      expect(body.slice(0, 900), n).toContain('some IntentResult & ProvidesDialog')
    }
    const t = provider.slice(provider.indexOf('struct OpenTasbihIntent'))
    expect(t.slice(0, 500)).toContain('static let openAppWhenRun: Bool = true')
    expect(t).toContain('if let url = MuslimRouter.url(.tasbih) { QuickActions.deliver(url) }')
  })

  it('every phrase holds ${applicationName}, in the ten languages; the titles are the widgets’ words', () => {
    const phrases = [...new Set([...provider.matchAll(/"([^"]*\\\(\.applicationName\)[^"]*)"/g)].map((m) => m[1].replace('\\(.applicationName)', '${applicationName}')))]
    expect(phrases.length).toBe(13)
    for (const l of LANGS) {
      const sc = strings(l, 'AppShortcuts.strings')
      for (const p of phrases) expect(sc[p], `${l} ${p}`).toContain('${applicationName}')
      const loc = strings(l, 'Localizable.strings')
      const w = WIDGET_STRINGS[l]
      expect(loc['shortcut.next.title']).toBe(w.nextPrayer)
      expect(loc['shortcut.next.short']).toBe(w.nextPrayer)
      expect(loc['shortcut.next.none']).toBe(w.openApp)
      expect(loc['shortcut.tasbih.title']).toBe(w.names.ctlTasbih.desc)
      expect(loc['shortcut.tasbih.short']).toBe(w.names.ctlTasbih.name)
      expect(loc['shortcut.name.title']).toBe(w.nameOfDay)
      for (const k of ['shortcut.next.description', 'shortcut.tasbih.description', 'shortcut.name.description', 'shortcut.name.none']) {
        expect(loc[k]?.length, `${l} ${k}`).toBeGreaterThan(5)
        expect(loc[k]).not.toMatch(/!/)
      }
    }
    expect(strings('ar', 'AppShortcuts.strings')['When is the next prayer in ${applicationName}']).toBe('متى الصلاة القادمة في ${applicationName}')
    // Siri hears «Muslim» too, the app's name outside Arabic (CLAUDE.md §8); the name under the icon stays «مسلم».
    const plist = read('web/ios/App/App/Info.plist')
    expect(plist).toMatch(/<key>INAlternativeAppNames<\/key>\s*<array>\s*<dict>\s*<key>INAlternativeAppName<\/key>\s*<string>Muslim<\/string>/)
    expect(plist).toMatch(/<key>CFBundleDisplayName<\/key>\s*<string>مسلم<\/string>/)
  })

  it('in the project: the three files in the app’s sources only', () => {
    const pbx = read('web/ios/App/App.xcodeproj/project.pbxproj')
    for (const f of ['SiriAnswers.swift', 'MuslimShortcuts.swift', 'QuickActions.swift']) {
      expect(pbx.match(new RegExp(`/\\* ${f.replace('.', '\\.')} in Sources \\*/,`, 'g'))?.length, f).toBe(1)
    }
  })

  it('no ayah or hadith in an answer: Siri reads it aloud (CLAUDE.md §11)', () => {
    const sa = read('web/ios/App/App/SiriAnswers.swift')
    const decoded = sa.slice(sa.indexOf('struct File: Decodable'), sa.indexOf('static func read'))
    expect(decoded).not.toMatch(/ayah|hadith|pages|text: String\?|salaf/)
  })
})

// ITMS-90626 (iOS 1.1.0 (20), 26 October): App Store Connect refused the build in processing for «App Intent description
// "siri.tasbih.description" cannot contain "siri"» (and siri.name.description, siri.next.description). A key with no
// default value is what Metadata.appintents holds, so the keys are «shortcut.*» now and carry their English text as
// their default value; the texts in the ten languages are as they were. No App Intents string holds «siri» in any case:
// not in the Swift sources, not in the tables, and not in a built Metadata.appintents.
const SIRI = /siri/i
const uncommented = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')
const literals = (s: string) => [...uncommented(s).matchAll(/"((?:[^"\\\n]|\\.)*)"/g)].map((m) => m[1])
const iosSwift = () => [...swiftFiles(path.join(IOS, 'App')), ...swiftFiles(path.join(IOS, 'Shared')), ...swiftFiles(path.join(IOS, 'MuslimWidgets'))]
const SHORTCUT_KEYS = ['next', 'tasbih', 'name'].flatMap((i) => ['title', 'short', 'description'].map((k) => `shortcut.${i}.${k}`))

describe('ITMS-90626: no «siri» in an App Intents string', () => {
  it('no string literal in the iOS Swift sources holds it (the app, Shared and the widget extension)', () => {
    const files = iosSwift()
    expect(files.length).toBeGreaterThan(20)
    const hits = files.flatMap((f) => literals(fs.readFileSync(f, 'utf8')).filter((l) => SIRI.test(l)).map((l) => `${path.relative(IOS, f)}: "${l}"`))
    expect(hits).toEqual([])
    // and no App Intents key anywhere: titles, descriptions, short titles, parameters and enum cases alike
    const keys = files.flatMap((f) => [...uncommented(fs.readFileSync(f, 'utf8')).matchAll(/(?:LocalizedStringResource|IntentDescription|DisplayRepresentation|TypeDisplayRepresentation)\((?:title: |name: )?"([^"]*)"/g)].map((m) => m[1]))
    expect(keys.length).toBeGreaterThan(30)
    expect(keys.filter((k) => SIRI.test(k))).toEqual([])
  })

  it('the three App Shortcuts: «shortcut.*» keys, each with the English text of en.lproj as its default value', () => {
    const src = uncommented(read('web/ios/App/App/MuslimShortcuts.swift'))
    const en = strings('en', 'Localizable.strings')
    for (const k of SHORTCUT_KEYS) {
      const uses = [...src.matchAll(new RegExp(`LocalizedStringResource\\("${k.replace(/\./g, '\\.')}", defaultValue: "((?:[^"\\\\]|\\\\.)*)"\\)`, 'g'))]
      expect(uses.length, k).toBe(k.endsWith('.short') ? 2 : 1) // the short titles in both lists, with and without «أذكار المواقف»
      for (const u of uses) expect(u[1], k).toBe(en[k])
    }
    // no bare key reaches the metadata: every title, description and short title of the three goes through the above
    expect(src).not.toMatch(/static let title: LocalizedStringResource = "/)
    expect(src).not.toMatch(/IntentDescription\("/)
    expect(src).not.toMatch(/AppShortcut\(intent: (NextPrayerIntent|OpenTasbihIntent|NameOfDayIntent)\(\)[^\n]*shortTitle: "/)
    expect(src).toContain('String(localized: "shortcut.next.none")')
    expect(src).toContain('String(localized: "shortcut.name.none")')
    expect(src).toContain('title: String(localized: "shortcut.name.title")')
  })

  it('the ten languages: the same texts under the new keys, and no key or text with «siri» in any table', () => {
    for (const l of LANGS) {
      const loc = strings(l, 'Localizable.strings')
      for (const k of [...SHORTCUT_KEYS, 'shortcut.next.none', 'shortcut.name.none']) expect(loc[k]?.length, `${l} ${k}`).toBeGreaterThan(2)
      for (const k of Object.keys(loc)) expect(k, l).not.toMatch(/^siri\./)
      // App Store Connect's other App Shortcuts rules: each phrase once in its language, with ${applicationName} once
      const phrases = Object.values(strings(l, 'AppShortcuts.strings'))
      expect(phrases.length, l).toBe(13)
      expect(new Set(phrases.map((p) => p.toLocaleLowerCase())).size, l).toBe(phrases.length)
      for (const p of phrases) expect(p.split('${applicationName}').length - 1, `${l} ${p}`).toBe(1)
      for (const f of fs.readdirSync(path.join(IOS, `App/${l}.lproj`)).filter((x) => x.endsWith('.strings'))) {
        for (const [k, v] of Object.entries(strings(l, f))) {
          expect(k, `${l}/${f}`).not.toMatch(SIRI)
          expect(v, `${l}/${f} ${k}`).not.toMatch(SIRI)
        }
      }
    }
    // the texts themselves did not change (en and ar as they were in build 20)
    expect(strings('en', 'Localizable.strings')['shortcut.next.description']).toBe('Tells you the next prayer and its time from the times saved on your phone, without opening the app.')
    expect(strings('en', 'Localizable.strings')['shortcut.tasbih.description']).toBe('Opens the tasbih in the app.')
    expect(strings('en', 'Localizable.strings')['shortcut.name.description']).toBe('Tells you the day’s Name of Allah as the app shows it, without opening it.')
    expect(strings('ar', 'Localizable.strings')['shortcut.next.description']).toBe('يخبرك بالصلاة القادمة ووقتها من المواقيت المحفوظة على جهازك، دون فتح التطبيق.')
    expect(strings('ar', 'Localizable.strings')['shortcut.tasbih.description']).toBe('يفتح المسبحة في التطبيق.')
    expect(strings('ar', 'Localizable.strings')['shortcut.name.description']).toBe('يخبرك باسم الله لليوم كما في التطبيق، دون فتحه.')
  })
})

// The built app's Metadata.appintents, as App Store Connect reads it: from IOS_APP (a path to App.app) or the
// simulator and device builds of web/scripts/ios-build.sh in this tree; skipped when none is on this machine.
const builtApps = [process.env.IOS_APP, ...['Debug-iphonesimulator', 'Release-iphoneos'].map((p) => path.join(IOS, `build/DerivedData-${p.startsWith('Debug') ? 'sim' : 'device'}/Build/Products/${p}/App.app`))]
  .filter((p): p is string => !!p && fs.existsSync(path.join(p, 'Metadata.appintents/extract.actionsdata')))
type Res = { key: string; table?: string }
type Meta = {
  actions: Record<string, { title?: Res; descriptionMetadata?: { descriptionText?: Res } }>
  autoShortcuts?: { actionIdentifier: string; phraseTemplates: Res[]; shortTitle?: Res }[]
  autoShortcutProviderMangledName?: string
}

describe.runIf(builtApps.length > 0)('ITMS-90626: the built Metadata.appintents', () => {
  for (const app of builtApps) {
    const label = app.startsWith(IOS) ? path.relative(IOS, app) : app
    const files = [path.join(app, 'Metadata.appintents/extract.actionsdata'), ...(fs.existsSync(path.join(app, 'PlugIns')) ? fs.readdirSync(path.join(app, 'PlugIns')).map((x) => path.join(app, 'PlugIns', x, 'Metadata.appintents/extract.actionsdata')) : [])].filter((f) => fs.existsSync(f))

    it(`${label}: no «siri» anywhere, in the app and its extensions`, () => {
      expect(files.length).toBeGreaterThanOrEqual(2)
      for (const f of files) {
        const raw = fs.readFileSync(f, 'utf8')
        expect(raw.match(/"[^"]*siri[^"]*"/gi) ?? [], path.relative(app, f)).toEqual([])
      }
    })

    it(`${label}: the App Shortcuts are listed, ten at most, each phrase with \${applicationName} once, each with a title and a description`, () => {
      const m = JSON.parse(fs.readFileSync(files[0], 'utf8')) as Meta
      const sc = m.autoShortcuts ?? []
      expect(m.autoShortcutProviderMangledName).toMatch(/MuslimShortcuts/)
      expect(sc.length).toBeGreaterThanOrEqual(3)
      expect(sc.length).toBeLessThanOrEqual(10)
      expect(sc.slice(0, 3).map((s) => s.actionIdentifier)).toEqual(['NextPrayerIntent', 'OpenTasbihIntent', 'NameOfDayIntent'])
      if (sc.length > 3) expect(sc.length).toBe(10)
      for (const s of sc) {
        expect(s.phraseTemplates.length, s.actionIdentifier).toBeGreaterThan(0)
        for (const p of s.phraseTemplates) expect(p.key.split('${applicationName}').length - 1, p.key).toBe(1)
        expect(s.shortTitle?.key, s.actionIdentifier).toMatch(/\S/)
        const a = m.actions[s.actionIdentifier]
        expect(a?.title?.key, s.actionIdentifier).toMatch(/\S/)
        expect(a?.descriptionMetadata?.descriptionText?.key, s.actionIdentifier).toMatch(/\S/)
      }
      const ours = Object.fromEntries(Object.entries(m.actions).filter(([k]) => ['NextPrayerIntent', 'OpenTasbihIntent', 'NameOfDayIntent'].includes(k)))
      expect(Object.values(ours).map((a) => a.title?.key).sort()).toEqual(['shortcut.name.title', 'shortcut.next.title', 'shortcut.tasbih.title'])
      expect(Object.values(ours).map((a) => a.descriptionMetadata?.descriptionText?.key).sort()).toEqual(['shortcut.name.description', 'shortcut.next.description', 'shortcut.tasbih.description'])
      // one provider: the extensions list none
      for (const f of files.slice(1)) expect((JSON.parse(fs.readFileSync(f, 'utf8')) as Meta).autoShortcuts ?? [], f).toEqual([])
    })
  }
})

// The answers, by the app's Swift (SiriAnswers.swift) compiled on this Mac.
const H = 3_600_000
const BASE = Date.UTC(2026, 9, 25, 21, 0, 0) // midnight in Riyadh, 26 October 2026
const time = (key: string, name: string, at: number, text: string, prayer = true): WidgetTime => ({ key, name, at, text, prayer })
type Sample = Pick<WidgetData, 'lang' | 'place' | 'days' | 'nameDays'> & { labels: Pick<WidgetData['labels'], 'nextPrayer' | 'after' | 'openApp' | 'noPlace' | 'nameOfDay'> }
function sample(lang: 'ar' | 'en' | 'ur', place = true): Sample {
  const w = WIDGET_STRINGS[lang]
  const names = { ar: ['الفجر', 'الشروق', 'الظهر', 'العصر', 'المغرب', 'العشاء'], en: ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'], ur: ['فجر', 'طلوع', 'ظہر', 'عصر', 'مغرب', 'عشاء'] }[lang]
  const digits = (n: number | string) => String(n).replace(/\d/g, (d) => (lang === 'ar' ? '٠١٢٣٤٥٦٧٨٩' : lang === 'ur' ? '۰۱۲۳۴۵۶۷۸۹' : '0123456789')[+d])
  const text = (h: number, m: number) => {
    const t = `${digits(h % 12 || 12)}:${digits(String(m).padStart(2, '0'))}`
    return lang === 'ar' ? `${t} ${h < 12 ? 'ص' : 'م'}` : lang === 'ur' ? t : `${t} ${h < 12 ? 'AM' : 'PM'}`
  }
  const day = (k: number) => {
    const s = BASE + k * 24 * H
    const at = (h: number, m: number) => s + h * H + m * 60_000
    return {
      date: `2026-10-${26 + k}`,
      start: s,
      end: s + 24 * H,
      weekday: '',
      gregorian: '',
      gregorianShort: '',
      hijri: { day: '', month: '', year: '', text: '' },
      times: place
        ? [
            time('fajr', names[0], at(4, 37), text(4, 37)),
            time('sunrise', names[1], at(5, 55), text(5, 55), false),
            time('dhuhr', names[2], at(11, 41), text(11, 41)),
            time('asr', names[3], at(14, 58), text(14, 58)),
            time('maghrib', names[4], at(17, 27), text(17, 27)),
            time('isha', names[5], at(18, 57), text(18, 57)),
            time('midnight', w.midnight, at(23, 30), text(23, 30), false),
          ]
        : [],
      ayah: null,
      hadith: null,
      sky: [],
    }
  }
  const nameDay = (k: number, n: number, name: string): WidgetNameDay =>
    ({ day: `2026-10-${26 + k}`, start: BASE + k * 24 * H, end: BASE + (k + 1) * 24 * H, n, count: 96, name, of: lang === 'en' ? `${n} of 96` : `${digits(n)} من ${digits(96)}`, url: `imuslim://today/name/${n}`, shareUrl: '', pages: [] }) as unknown as WidgetNameDay
  return {
    lang,
    place: place ? { name: lang === 'en' ? 'Riyadh' : 'الرياض', tz: 'Asia/Riyadh' } : null,
    labels: { nextPrayer: w.nextPrayer, after: w.after, openApp: w.openApp, noPlace: w.noPlace, nameOfDay: w.nameOfDay },
    days: [day(0), day(1)],
    nameDays: [nameDay(0, 5, 'الحفيظ'), nameDay(1, 6, 'المقيت')],
  }
}

const canSwift = process.platform === 'darwin' && (() => {
  try {
    execFileSync('xcrun', ['--find', 'swiftc'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})()

describe.runIf(canSwift)('§4 the answers, by the app’s Swift', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'siri-answers-'))
  const bin = path.join(dir, 'siri-answers')
  const file = (name: string, s: unknown) => {
    const f = path.join(dir, `${name}.json`)
    fs.writeFileSync(f, JSON.stringify(s))
    return f
  }
  const run = (f: string, now: number, kind: 'next' | 'name' | 'nameurl') => execFileSync(bin, [f, String(now), kind], { encoding: 'utf8' }).trim()
  beforeAll(() => {
    fs.mkdirSync(path.join(dir, 'main'))
    fs.copyFileSync(path.join(__dirname, 'swift/siri-answers-main.swift'), path.join(dir, 'main/main.swift'))
    execFileSync('xcrun', ['swiftc', '-o', bin, path.join(IOS, 'App/SiriAnswers.swift'), path.join(dir, 'main/main.swift')], { stdio: 'pipe' })
  }, 120_000)

  it('«متى الصلاة القادمة؟»: the next of the five, its time as the app wrote it, and how long until it', () => {
    const ar = file('ar', sample('ar'))
    expect(run(ar, BASE + 4 * H + 27 * 60_000, 'next')).toBe('الصلاة القادمة: الفجر، ٤:٣٧ ص، بعد ١٠ دقائق')
    // Sunrise is not a prayer: after Fajr comes Dhuhr.
    expect(run(ar, BASE + 5 * H, 'next')).toBe('الصلاة القادمة: الظهر، ١١:٤١ ص، بعد ٦ ساعات و٤١ دقيقة')
    // After Isha: the next day's Fajr.
    expect(run(ar, BASE + 20 * H, 'next')).toBe('الصلاة القادمة: الفجر، ٤:٣٧ ص، بعد ٨ ساعات و٣٧ دقيقة')
    // Seconds before: never «0 minutes».
    expect(run(ar, BASE + 14 * H + 57 * 60_000 + 59_000, 'next')).toBe('الصلاة القادمة: العصر، ٢:٥٨ م، بعد دقيقة')
    expect(run(file('en', sample('en')), BASE + 13 * H + 58 * 60_000, 'next')).toBe('Next prayer: Asr, 2:58 PM, in 1 hour')
    expect(run(file('ur', sample('ur')), BASE + 17 * H, 'next')).toMatch(/^اگلی نماز: مغرب، ۵:۲۷، ۲۷ منٹ بعد$/)
  })

  it('without the data: the app’s own lines, never a guess', () => {
    expect(run('-', BASE, 'next')).toBe('NO-DATA')
    expect(run(file('noplace', sample('ar', false)), BASE, 'next')).toBe('حدّد مدينتك في التطبيق')
    // Past the last day the app wrote: open the app.
    expect(run(file('ar2', sample('ar')), BASE + 3 * 24 * H, 'next')).toBe('افتح التطبيق لتحديث المواقيت')
  })

  it('«اسم الله لليوم»: the day’s Name by its own day, else the app’s line; its page or the Names', () => {
    const ar = file('arn', sample('ar'))
    expect(run(ar, BASE + 9 * H, 'name')).toBe('اسم الله لليوم: الحفيظ، ٥ من ٩٦')
    expect(run(ar, BASE + 25 * H, 'name')).toBe('اسم الله لليوم: المقيت، ٦ من ٩٦')
    expect(run(file('enn', sample('en')), BASE + 9 * H, 'name')).toBe('Name of Allah for today: \u2068الحفيظ\u2069, 5 of 96')
    expect(run(ar, BASE + 3 * 24 * H, 'name')).toBe('NO-NAME')
    expect(run(ar, BASE + 9 * H, 'nameurl')).toBe('imuslim://today/name/5')
    expect(run('-', BASE, 'nameurl')).toBe('imuslim://today/names')
  })
})

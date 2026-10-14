// 0050 د: «افتح ذكر الموقف», the App Intent and its App Shortcuts (web/ios/App/App/MawaqifIntent.swift). Its situations
// are the table's (data/mawaqif.json, the board's and the reply's, not the proposed), each named in the ten languages,
// the phrases in the ten with the app's name; the link it opens, imuslim://mawaqif/<situation>, goes to that page.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { widgetPath } from '../../web/src/native/NativeDevice'
import { mawaqifRoute } from '../../web/src/v2/daily/mawaqif/mawaqif-model'

const APP = path.resolve(import.meta.dirname, '../../web/ios/App')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']
const swift = fs.readFileSync(path.join(APP, 'App/MawaqifIntent.swift'), 'utf8')
const doc = JSON.parse(fs.readFileSync(path.resolve(import.meta.dirname, '../../data/mawaqif.json'), 'utf8')) as { situations: { id: string; proposed?: boolean; name: Record<string, string> }[] }
const strings = (lang: string, f: string) =>
  Object.fromEntries([...fs.readFileSync(path.join(APP, `App/${lang}.lproj/${f}`), 'utf8').matchAll(/^"((?:[^"\\]|\\.)*)" = "((?:[^"\\]|\\.)*)";$/gm)].map((m) => [m[1], m[2]]))

describe('«افتح ذكر الموقف» (0050 د)', () => {
  it('the cases are the table\'s situations, the proposed ones aside; it opens the app at imuslim://mawaqif/<situation>', () => {
    const cases = /case ([a-z_, ]+)\n/.exec(swift)![1].split(',').map((x) => x.trim())
    // «المنزل»'s two stages are two choices, opening its page at «الدخول» or «الخروج» (0050-add1 د).
    expect(cases).toEqual(doc.situations.flatMap((s) => (s.id === 'home' ? ['home_in', 'home_out'] : [s.id])))
    expect(swift).toContain('case .home_in: return "home?step=enter"')
    expect(swift).toContain('case .home_out: return "home?step=leave"')
    expect(swift).toContain('static var openAppWhenRun = true')
    expect(swift).toContain('URL(string: "imuslim://mawaqif/\\(situation.path)")')
    expect(swift).toMatch(/@available\(iOS 16\.0, \*\)\nenum MawaqifSituation/)
  })
  it('compiled only once the table is reviewed: Siri and Shortcuts offer nothing the app does not show yet', () => {
    expect(swift.startsWith('#if MAWAQIF_REVIEWED\n')).toBe(true)
    expect(swift.trimEnd().endsWith('#endif')).toBe(true)
    const sh = fs.readFileSync(path.resolve(import.meta.dirname, '../../web/scripts/ios-build.sh'), 'utf8')
    expect(sh).toContain(`grep -q '"status": "reviewed"' "$WEB/../data/mawaqif.json"`)
    expect(sh).toContain("SWIFT_ACTIVE_COMPILATION_CONDITIONS=$(inherited) MAWAQIF_REVIEWED")
  })
  it('in the ten languages: every situation\'s name as in the table, the intent\'s title, and every phrase with the app\'s name', () => {
    const phrases = [...swift.matchAll(/phrases: \["([^"]+)"\]/g)].map((m) => m[1].replace('\\(.applicationName)', '${applicationName}'))
    expect(phrases).toHaveLength(7)
    for (const lang of LANGS) {
      const loc = strings(lang, 'Localizable.strings')
      for (const s of doc.situations.filter((x) => x.id !== 'home')) expect(loc[`mawaqif.${s.id}`], `${lang} ${s.id}`).toBe(s.name[lang])
      for (const k of ['mawaqif.home_in', 'mawaqif.home_out']) expect(loc[k]?.length, `${lang} ${k}`).toBeGreaterThan(2)
      for (const k of ['mawaqif.type', 'mawaqif.intent.title', 'mawaqif.intent.description']) expect(loc[k]?.length, `${lang} ${k}`).toBeGreaterThan(2)
      const sc = strings(lang, 'AppShortcuts.strings')
      for (const p of phrases) expect(sc[p], `${lang} ${p}`).toContain('${applicationName}')
    }
  })
  it('in the project: the Swift file in the app\'s sources, and both strings files in its resources', () => {
    const pbx = fs.readFileSync(path.join(APP, 'App.xcodeproj/project.pbxproj'), 'utf8')
    expect(pbx).toMatch(/MawaqifIntent\.swift in Sources \*\/,/)
    expect(pbx).toMatch(/Localizable\.strings in Resources \*\/,/)
    expect(pbx).toMatch(/AppShortcuts\.strings in Resources \*\/,/)
    for (const lang of LANGS) expect(pbx).toContain(`path = ${lang}.lproj/AppShortcuts.strings;`)
  })
  it('the link: imuslim://mawaqif/travel?step=dua opens that stage\'s page', () => {
    const p = widgetPath('imuslim://mawaqif/travel?step=dua')
    expect(p).toBe('/mawaqif/travel?step=dua')
    const [pathname, search] = p!.split('?')
    expect(mawaqifRoute(pathname, `?${search}`)).toEqual({ page: 'situation', id: 'travel', step: 'dua' })
    expect(mawaqifRoute('/mawaqif', '')).toEqual({ page: 'grid' })
    expect(mawaqifRoute('/mawaqif/auto', '')).toEqual({ page: 'auto' })
    expect(widgetPath('imuslim://mawaqif/home?step=leave')).toBe('/mawaqif/home?step=leave')
  })
})

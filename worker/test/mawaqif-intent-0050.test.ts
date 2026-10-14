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
    expect(cases).toEqual(doc.situations.filter((s) => !s.proposed).map((s) => s.id))
    expect(swift).toContain('static var openAppWhenRun = true')
    expect(swift).toContain('URL(string: "imuslim://mawaqif/\\(situation.rawValue)")')
    expect(swift).toMatch(/@available\(iOS 16\.0, \*\)\nenum MawaqifSituation/)
  })
  it('in the ten languages: every situation\'s name as in the table, the intent\'s title, and every phrase with the app\'s name', () => {
    const phrases = [...swift.matchAll(/phrases: \["([^"]+)"\]/g)].map((m) => m[1].replace('\\(.applicationName)', '${applicationName}'))
    expect(phrases).toHaveLength(7)
    for (const lang of LANGS) {
      const loc = strings(lang, 'Localizable.strings')
      for (const s of doc.situations.filter((x) => !x.proposed)) expect(loc[`mawaqif.${s.id}`], `${lang} ${s.id}`).toBe(s.name[lang])
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
  })
})

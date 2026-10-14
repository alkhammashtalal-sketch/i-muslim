// 0051: the eighth widget, «أذكار المواقف» (large only). Its eight buttons in the reply's order, each a link that opens
// its situation (the app's route), the last the grid; the names the table's own in the ten languages, written by the app
// and, before that, the extension's built-in table the same; the gallery's name and description in the ten.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

class MemStorage {
  m = new Map<string, string>()
  getItem = (k: string) => this.m.get(k) ?? null
  setItem = (k: string, v: string) => void this.m.set(k, v)
  removeItem = (k: string) => void this.m.delete(k)
  clear = () => this.m.clear()
}
vi.stubGlobal('localStorage', new MemStorage())
const { mawaqifButtons, MAWAQIF_WIDGET } = await import('../../web/src/native/widget-data')
const { widgetPath } = await import('../../web/src/native/NativeDevice')
const { mawaqifRoute, situation } = await import('../../web/src/v2/daily/mawaqif/mawaqif-model')
const { WIDGET_STRINGS } = await import('../../web/src/native/widget-strings')

const W = path.resolve(import.meta.dirname, '../../web/ios/App/MuslimWidgets')
const views = fs.readFileSync(path.join(W, 'Views.swift'), 'utf8')
const widgets = fs.readFileSync(path.join(W, 'Widgets.swift'), 'utf8')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const

describe('«أذكار المواقف»\'s widget (0051)', () => {
  it('eight buttons in the reply\'s order, each opening its situation; the last the grid of them all', () => {
    const b = mawaqifButtons('ar')
    expect(b.map((x) => x.id)).toEqual(['travel', 'sleep', 'waking', 'home', 'mosque', 'food', 'distress', 'all'])
    for (const x of b.slice(0, 7)) {
      const p = widgetPath(x.url)!
      expect(p).toBe(`/mawaqif/${x.id}`)
      expect(mawaqifRoute(p, '')).toEqual({ page: 'situation', id: x.id, step: null })
      expect(situation(x.id)?.name.ar, x.id).toBe(x.name)
    }
    expect(b[7]).toEqual({ id: 'all', name: 'كل المواقف', url: 'imuslim://mawaqif' })
    expect(mawaqifRoute(widgetPath(b[7].url)!, '')).toEqual({ page: 'grid' })
    // The extension's own order and links.
    expect(views).toContain(`static let ids = [${[...MAWAQIF_WIDGET, 'all'].map((x) => `"${x}"`).join(', ')}]`)
    expect(views).toContain('id == "all" ? "imuslim://mawaqif" : "imuslim://mawaqif/\\(id)"')
  })
  it('in the ten languages: the names the app writes are the extension\'s built-in ones, and the gallery\'s', () => {
    for (const lang of LANGS) {
      const names = mawaqifButtons(lang).map((x) => x.name)
      const m = new RegExp(`"${lang}": Strings\\(openApp:[\\s\\S]*?\\], mawaqif: \\[([^\\]]*)\\]\\)`).exec(views)
      expect(m, lang).toBeTruthy()
      expect(JSON.parse(`[${m![1]}]`), lang).toEqual(names)
      const g = WIDGET_STRINGS[lang].names.mawaqif
      expect(g.name.length).toBeGreaterThan(2)
      expect(g.desc.length).toBeGreaterThan(5)
      const gm = new RegExp(`"${lang}": Strings\\(openApp:[\\s\\S]*?"mawaqif": \\["([^"]*)", "([^"]*)"\\]`).exec(views)
      expect([gm![1], gm![2]], lang).toEqual([g.name, g.desc])
    }
    expect(WIDGET_STRINGS.ar.names.mawaqif).toEqual({ name: 'أذكار المواقف', desc: 'افتح ذكر السفر والنوم وغيرها بلمسة' })
  })
  it('the large size only, its own kind, in the bundle; no dhikr in the widget, only links', () => {
    expect(widgets).toContain('static let mawaqif = "MuslimMawaqif"')
    expect(widgets).toMatch(/AdhkarWidget\(\)\n\s+MawaqifWidget\(\)/)
    const w = widgets.slice(widgets.indexOf('struct MawaqifWidget'))
    expect(w).toContain('.supportedFamilies([.systemLarge])')
    const v = views.slice(views.indexOf('struct MawaqifView'), views.indexOf('struct TimeRow'))
    expect(v).toContain('Link(destination:')
    expect(v).not.toMatch(/segments|hadith/)
    for (const id of [...MAWAQIF_WIDGET, 'all']) expect(fs.existsSync(path.join(W, `Assets.xcassets/mq-${id}.imageset/mq-${id}.pdf`)), id).toBe(true)
  })
})

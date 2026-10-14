// Reply 0059: «أذكار المواقف» is named «أذكار», as its widget, in the ten languages (Talal 22:55: «خليها زي الودجت بس
// الأذكار بدون موقف بدون مواقف»). What does not change: the files and keys, the links imuslim://mawaqif/…, the widget
// and its «كل الأذكار», the adhkar page «الأذكار», and the Siri phrases (so automations people set keep working).
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { MAWAQIF } from '../../web/src/v2/daily/mawaqif/strings-mawaqif'
import { WIDGET_STRINGS } from '../../web/src/native/widget-strings'
import { TOOLS } from '../../web/src/v2/daily/strings-tools'
import { mawaqifRoute } from '../../web/src/v2/daily/mawaqif/mawaqif-model'

const ROOT = path.resolve(import.meta.dirname, '../..')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const
const OLD = ['أذكار المواقف', 'Adhkar for moments', 'مواقع کے اذکار', 'Zikir berbagai situasi', 'Zikir pelbagai keadaan', 'Durumların zikirleri', 'Les adhkar des moments', 'Los adhkar de cada momento', 'বিভিন্ন মুহূর্তের যিকির', 'मौक़ों के अज़कार']

describe('«أذكار», as the widget (0059)', () => {
  it('the section\'s title is the widget\'s name in each of the ten languages', () => {
    for (const l of LANGS) expect(MAWAQIF[l].title, l).toBe(WIDGET_STRINGS[l].names.mawaqif.name)
    expect(MAWAQIF.ar.title).toBe('أذكار')
    expect(MAWAQIF.en.title).toBe('Adhkar')
  })
  it('no interface string of the app keeps the old name', () => {
    const files = ['web/src/v2/daily/mawaqif/strings-mawaqif.ts', 'web/src/native/widget-strings.ts', 'web/src/offline-search/strings.ts', 'web/ios/App/MuslimWidgets/Views.swift']
    for (const f of files) {
      const code = fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*\*|\/\/\/)/.test(l)).join('\n')
      for (const o of OLD) expect(code.includes(`'${o}'`) || code.includes(`"${o}"`), `${f}: ${o}`).toBe(false)
    }
  })
  it('what stays: the adhkar page «الأذكار», the links, the Siri phrases', () => {
    expect(TOOLS.ar.adhkarTitle).toBe('الأذكار')
    expect(mawaqifRoute('/mawaqif', '')).toEqual({ page: 'grid' })
    expect(mawaqifRoute('/mawaqif/travel', '')).toMatchObject({ page: 'situation', id: 'travel' })
    const ar = fs.readFileSync(path.join(ROOT, 'web/ios/App/App/ar.lproj/AppShortcuts.strings'), 'utf8')
    expect(ar).toContain('"Travel prayer in ${applicationName}" = "دعاء السفر في ${applicationName}";')
    expect(MAWAQIF.ar.phrases[0]).toBe('دعاء السفر في مسلم')
  })
})

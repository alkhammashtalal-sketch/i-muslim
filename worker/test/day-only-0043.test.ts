// Reply 0043-add7 (Talal, 13 October): the first version is day only. The day look holds whatever the phone's setting,
// from one place (index.html: data-theme="light" and color-scheme light; tokens.css color-scheme light), with no night
// rule left, no moon button and no appearance option, and the iOS app in the light interface style.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const WEB = path.resolve(__dirname, '../../web')
const read = (f: string) => fs.readFileSync(path.join(WEB, f), 'utf8')
const walk = (d: string): string[] => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
const src = walk(path.join(WEB, 'src'))

describe('day only (0043-add7)', () => {
  it('one place: data-theme="light" on the root and color-scheme light', () => {
    const html = read('index.html')
    expect(html).toContain('<html lang="ar" dir="rtl" data-theme="light">')
    expect(html).toContain('<meta name="color-scheme" content="light" />')
    expect(read('src/styles/tokens.css')).toContain('color-scheme: light;')
    for (const f of src.filter((f) => /\.(tsx?|css)$/.test(f))) expect(fs.readFileSync(f, 'utf8'), f).not.toMatch(/dataset\.theme|data-theme='dark'|color-scheme: dark/)
  })

  it('no night rule is left: no prefers-color-scheme in the styles or the code', () => {
    for (const f of src.filter((f) => /\.(tsx?|css)$/.test(f))) expect(fs.readFileSync(f, 'utf8'), f).not.toContain('prefers-color-scheme')
  })

  it('no moon button, no appearance option, no theme setting or ?theme=, and their strings gone in ten languages', () => {
    const app = read('src/App.tsx')
    expect(app).not.toMatch(/IconMoon|IconSun|isDark|update\(\{ theme/)
    expect(read('src/components/Sheets.tsx')).not.toMatch(/Segmented<Theme>|themeLight|themeDark|themeAuto/)
    const settings = read('src/settings.ts')
    expect(settings).not.toMatch(/export type Theme|params\.get\('theme'\)/)
    expect(settings).toContain("const DEFAULTS: Settings = { lang: 'ar', fontSize: 'md', simple: false, content: 'ar' }")
    for (const l of ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']) expect(read(`src/i18n/${l}.ts`), l).not.toMatch(/^ {2}theme(Light|Dark|Auto)?: /m)
  })

  it('the iOS app keeps the light interface style (its own windows, the keyboard and the status bar)', () => {
    expect(read('ios/App/App/Info.plist')).toMatch(/<key>UIUserInterfaceStyle<\/key>\s*<string>Light<\/string>/)
  })
})

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// Bengali and Devanagari shipped with the app (add-on 0072-add58 §2): in the iOS 26.3 web view system-ui and
// -apple-system draw every Bengali and Devanagari letter as the LastResort box and never fall on to sans-serif, so the
// two Noto faces come first in the interface stack of bn and hi only, each limited to its script; Arabic and Latin
// keep their fonts.
const ROOT = path.resolve(__dirname, '../..')
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const CSS = read('web/src/styles/fonts-bnhi.css')
const TOKENS = read('web/src/styles/tokens.css')
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '')

const BN_RANGE = 'U+0951-0952, U+0964-0965, U+0980-09FE, U+1CD0, U+1CD2, U+1CD5-1CD6, U+1CD8, U+1CE1, U+1CEA, U+1CED, U+1CF2, U+1CF5-1CF7, U+200C-200D, U+20B9, U+25CC, U+A8F1'
const HI_RANGE = 'U+0900-097F, U+1CD0-1CF9, U+200C-200D, U+20A8, U+20B9, U+20F0, U+25CC, U+A830-A839, U+A8E0-A8FF, U+11B00-11B09'
const UI_STACK = "'IBM Plex Sans Arabic', system-ui, -apple-system, 'Segoe UI', sans-serif"

const faces = () =>
  [...strip(CSS).matchAll(/@font-face\s*{([^}]*)}/g)].map((m) => {
    const prop = (k: string) => m[1].match(new RegExp(`${k}:\\s*([^;]+);`))?.[1].trim() ?? ''
    return { family: prop('font-family'), weight: prop('font-weight'), src: prop('src'), range: prop('unicode-range') }
  })
const ruleOf = (css: string, sel: string) => strip(css).match(new RegExp(`${sel.replace(/[()[\]:]/g, '\\$&')}\\s*{([^}]*)}`))?.[1] ?? ''
const fontUi = (body: string) => body.match(/--font-ui:\s*([^;]+);/)?.[1].trim()

describe('the Bengali and Devanagari faces (fonts-bnhi.css)', () => {
  it('four woff2 faces, 400 and 600 of each, from the @fontsource Bengali and Devanagari subsets, each with its own unicode-range', () => {
    const fs4 = faces()
    expect(fs4.map((f) => `${f.family} ${f.weight}`)).toEqual(["'Noto Sans Bengali' 400", "'Noto Sans Bengali' 600", "'Noto Sans Devanagari' 400", "'Noto Sans Devanagari' 600"])
    for (const f of fs4) {
      const bn = f.family.includes('Bengali')
      expect(f.src).toBe(`url('../../node_modules/@fontsource/noto-sans-${bn ? 'bengali' : 'devanagari'}/files/noto-sans-${bn ? 'bengali-bengali' : 'devanagari-devanagari'}-${f.weight}-normal.woff2') format('woff2')`)
      expect(f.range).toBe(bn ? BN_RANGE : HI_RANGE)
      const file = f.src.match(/url\('\.\.\/\.\.\/([^']+)'\)/)![1]
      expect(fs.existsSync(path.join(ROOT, 'web', file)), file).toBe(true)
    }
  })
  it('no face reaches Latin, digits, the space or Arabic', () => {
    for (const f of faces())
      for (const r of f.range.split(/,\s*/)) {
        const [a, b = a] = r.replace('U+', '').split('-').map((h) => parseInt(h, 16))
        expect(b < 0x0600 || a > 0x08ff, r).toBe(true) // Arabic
        expect(a > 0x024f, r).toBe(true) // Basic Latin, Latin-1, Latin Extended
        expect(b < 0xfb50 || a > 0xfeff, r).toBe(true) // Arabic presentation forms
      }
  })
  it('the stylesheet is loaded by the app, after Amiri and before the tokens', () => {
    const main = read('web/src/main.tsx')
    const at = (s: string) => main.indexOf(s)
    expect(at("import './styles/fonts-bnhi.css'")).toBeGreaterThan(at("import './styles/amiri-text.css'"))
    expect(at("import './styles/fonts-bnhi.css'")).toBeLessThan(at("import './styles/tokens.css'"))
  })
  it('the OFL text of both fonts ships beside them, and both are in docs/COMPONENTS.csv', () => {
    for (const n of ['bengali', 'devanagari']) {
      expect(read(`web/public/fonts/OFL-noto-sans-${n}.txt`)).toMatch(/SIL Open Font License, Version 1\.1/)
      expect(read('web/package.json')).toMatch(new RegExp(`"@fontsource/noto-sans-${n}": "\\^5\\.3\\.0"`))
    }
    const csv = read('docs/COMPONENTS.csv')
    expect(csv).toMatch(/^font,"Noto Sans Bengali 400\/600 .*SIL Open Font License 1\.1$/m)
    expect(csv).toMatch(/^font,"Noto Sans Devanagari 400\/600 .*SIL Open Font License 1\.1$/m)
  })
})

describe('the interface stacks', () => {
  it('bn and hi put their own Noto face first, then the other script, then the stack as it was', () => {
    expect(fontUi(ruleOf(CSS, ':root:lang(bn)'))).toBe(`'Noto Sans Bengali', 'Noto Sans Devanagari', ${UI_STACK}`)
    expect(fontUi(ruleOf(CSS, ':root:lang(hi)'))).toBe(`'Noto Sans Devanagari', 'Noto Sans Bengali', ${UI_STACK}`)
  })
  it('only bn and hi: no other selector in the file, and the Arabic and Latin stacks of tokens.css are unchanged', () => {
    const sels = [...strip(CSS).matchAll(/(^|})\s*([^{}@]+?)\s*{/g)].map((m) => m[2].trim())
    expect(sels).toEqual([':root:lang(bn)', ':root:lang(hi)'])
    expect(fontUi(ruleOf(TOKENS, ':root'))).toBe(UI_STACK)
    expect(ruleOf(TOKENS, ':root')).toMatch(/--font-text: 'Amiri Arabic', 'IBM Plex Sans Arabic', serif;/)
    expect(read('web/src/styles/amiri-text.css')).not.toMatch(/Noto/)
  })
  it('the welcome page keeps its own fonts: no Noto there (the first-screen lock, CLAUDE.md §8)', () => {
    expect(read('web/src/v2/welcome/welcome.css')).not.toMatch(/Noto/)
    expect(read('web/src/v2/lang/lang.css')).not.toMatch(/Noto/)
  })
  it('the canvas stacks of the cards and the share images: the two Noto faces first, the rest as it was', () => {
    expect(read('web/src/v2/cards/draw.ts')).toMatch(/^const UI = '"Noto Sans Bengali", "Noto Sans Devanagari", "IBM Plex Sans Arabic", system-ui, sans-serif'$/m)
    expect(read('web/src/v2/reading/share-image.ts')).toMatch(/^const UI_FONT = '"Noto Sans Bengali", "Noto Sans Devanagari", "IBM Plex Sans Arabic", system-ui, sans-serif'$/m)
  })
})

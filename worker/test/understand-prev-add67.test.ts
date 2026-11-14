// Add-on 0072-add67 §3: «السابق» in «تأكد من فهمك», by the rule of add-on 0072-add54: the words in the ten languages
// and the code's shape here; the behaviour (hidden on the first question, a checked answer kept when going back and
// forth, the keys, the screen reader's name, the side) in web/e2e/v2-0033-understand.spec.ts on a web build.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { UNDERSTAND } from '../../web/src/v2/hadith/strings-understand'

const ROOT = path.resolve(__dirname, '../..')
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8')
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'] as const

describe('§3 «السابق» in «تأكد من فهمك»', () => {
  it('the ten languages: «السابق» beside «التالي», and its screen reader name with the question it opens', () => {
    for (const lang of LANGS) {
      const u = UNDERSTAND[lang]
      expect(u.prev, lang).toBeTruthy()
      expect(u.prev, lang).not.toBe(u.next)
      expect(u.prevLabel, lang).toMatch(/^\{b\}.+\{c\}$/)
    }
    expect(UNDERSTAND.ar.prev).toBe('السؤال السابق')
    expect(UNDERSTAND.en.prev).toBe('Previous question')
    expect(UNDERSTAND.ar.prevLabel.replace('{b}', UNDERSTAND.ar.prev).replace('{c}', 'السؤال ١ من ٢')).toBe('السؤال السابق، السؤال ١ من ٢')
  })

  it('hidden on the first question; each question keeps its own choice and check; «انتهيت» then the title starts again', () => {
    const src = read('web/src/v2/hadith/Understand.tsx')
    expect(src).toMatch(/k > 0 \? \(\s*<button type="button" className="hd-quiz-secondary hd-quiz-prev" onClick=\{prev\} aria-label=\{prevLabel\}/)
    expect(src).toMatch(/const selected = picks\[k\]\?\.selected \?\? null/)
    expect(src).toMatch(/const answered = picks\[k\]\?\.answered \?\? false/)
    // Going back or forward only moves the place: nothing is cleared, except by starting again.
    const prev = src.slice(src.indexOf('const prev = () =>'), src.indexOf('const reopen = () =>'))
    const next = src.slice(src.indexOf('const next = () =>'), src.indexOf('const prev = () =>'))
    for (const f of [prev, next]) expect(f).not.toMatch(/setPicks|setPick\(/)
    expect(src.slice(src.indexOf('const reopen = () =>'))).toMatch(/setPicks\(\{\}\)/)
    // Both states: «السابق» after the main button in the page, drawn at the row's start (the right in Arabic).
    expect(src.match(/<\/button>\s*\{prevButton\}\s*<\/div>/g)).toHaveLength(2)
    const css = read('web/src/v2/hadith/understand.css')
    expect(css).toMatch(/\.hd-quiz-pn \{\s*display: flex;\s*flex-direction: row-reverse;/)
    expect(css).toMatch(/html\[dir='rtl'\] \.hd-quiz-back \{\s*transform: scaleX\(-1\);/)
  })
})

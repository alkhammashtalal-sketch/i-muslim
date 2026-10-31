// Add-on 0072-add53 (Talal's word of 31 October): the sky of the name card and the sky widgets is the painting's
// starless lapis drawn once as cover, with small sharp gold stars drawn in code. These pin the stars' rules: the same
// stars for the same box, none cut at an edge, none on the text, sparse and of mixed sizes; and no tile anywhere.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { placeStars, STAR_SIZES, type SkyClear } from '../../web/src/v2/daily/names/sky-stars'

const ROOT = path.resolve(__dirname, '../..')
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
// The boxes the stars are drawn in: the widgets' skies at their scale, and name cards from a phone to a desktop.
const boxes: [number, number, number][] = [
  [170, 170, 170 / 179], [364, 143.7, 364 / 380], [364, 168.6, 364 / 380], [364, 92, 364 / 380], [364, 382, 364 / 380],
  [148, 148, 148 / 179], [321, 324, 321 / 380], [320, 330, 1], [358, 340, 1], [600, 360, 1], [900, 380, 1],
]

describe('the sky’s stars (add-on 0072-add53)', () => {
  it('the same box gets the same stars', () => {
    for (const [w, h, s] of boxes) expect(placeStars(w, h, s, [], 7)).toEqual(placeStars(w, h, s, [], 7))
  })
  it('no star is cut at an edge or touches the inner frame: every one whole, 12·s in from the edge', () => {
    for (const [w, h, s] of boxes)
      for (const seed of [1, 11, 12, 13, 14, 15, 21, 22, 23, 24, 31])
        for (const st of placeStars(w, h, s, [], seed)) {
          const m = 12 * s + st.r - 1e-9
          expect(st.x).toBeGreaterThanOrEqual(m)
          expect(st.y).toBeGreaterThanOrEqual(m)
          expect(w - st.x).toBeGreaterThanOrEqual(m)
          expect(h - st.y).toBeGreaterThanOrEqual(m)
        }
  })
  it('no star on the text or the shamsa', () => {
    const clear: SkyClear[] = [{ x: 0.27, y: -0.02, w: 0.46, h: 0.9, oval: true }, { x: 0, y: 0.7, w: 1, h: 0.3 }]
    for (const [w, h, s] of boxes)
      for (const st of placeStars(w, h, s, clear, 21)) {
        expect(st.y + st.r).toBeLessThanOrEqual(0.7 * h)
        const dx = (st.x - 0.5 * w) / (0.23 * w + st.r)
        const dy = (st.y - 0.43 * h) / (0.45 * h + st.r)
        expect(dx * dx + dy * dy).toBeGreaterThanOrEqual(1)
      }
  })
  it('sparse and of mixed sizes, apart from each other', () => {
    const st = placeStars(900, 380, 1, [], 31)
    expect(st.length).toBeGreaterThan(5)
    expect(st.length).toBeLessThanOrEqual(Math.round((900 * 380) / 2600))
    expect(new Set(st.map((x) => x.r)).size).toBeGreaterThan(2)
    for (const a of st) for (const b of st) if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(26 + a.r + b.r)
    for (const x of st) expect(STAR_SIZES.map(([r]) => r)).toContain(x.r)
  })
  it('no tiled sky and no hand-placed ✦ is left: the picture is drawn once, as cover', () => {
    const css = read('web/src/v2/daily/names/name-card.css')
    expect(css).toMatch(/url\('\/art\/sky-lapis\.png'\) center \/ cover no-repeat/)
    expect(css).not.toMatch(/sky-stars\.png/)
    const theme = read('web/ios/App/MuslimWidgets/Theme.swift')
    expect(theme).not.toMatch(/TiledImage\(name: "sky"/)
    expect(theme).not.toMatch(/struct Sparkle|struct Stars\b/)
    const views = read('web/ios/App/MuslimWidgets/Views.swift') + read('web/ios/App/MuslimWidgets/NameViews.swift')
    expect(views).not.toMatch(/\bStars\(stars:/)
    const android = read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/widget/WidgetPainter.java')
    expect(android).not.toMatch(/R\.drawable\.widget_sky, 180/)
  })
})

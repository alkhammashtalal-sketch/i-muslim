// Add-on 0072-add53 (Talal's word of 31 October): the sky of the name card and the sky widgets is the painting's
// starless lapis drawn once as cover, with small sharp gold stars drawn in code. These pin the stars' rules: the same
// stars for the same box, none cut at an edge, none on the text, sparse and of mixed sizes; and no tile anywhere.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { placeStars, STAR_GOLD, STAR_HEART, STAR_HEART_RATIO, STAR_SIZES, type SkyClear } from '../../web/src/v2/daily/names/sky-stars'

const ROOT = path.resolve(__dirname, '../..')
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8')
// The boxes the stars are drawn in: the widgets' skies at their scale, and name cards from a phone to a desktop.
const boxes: [number, number, number][] = [
  [170, 170, 170 / 179], [364, 143.7, 364 / 380], [364, 168.6, 364 / 380], [364, 92, 364 / 380], [364, 382, 364 / 380],
  [148, 148, 148 / 179], [321, 324, 321 / 380], [320, 330, 1], [358, 340, 1], [600, 360, 1], [900, 380, 1],
]

describe('the sky’s stars (add-on 0072-add53)', () => {
  it('the same box gets the same stars: a golden list, which the Swift and Java ports gave too (stars-fix, 1 November)', () => {
    // Theme.swift SkyStarField.place and WidgetPainter.java skyStars printed these same lists, to 4 decimals, when the
    // golden was taken (Java in float, to within 1e-4). A change to the draw order or a constant on any platform shows
    // here or in the source checks below.
    const near = (got: { x: number; y: number; r: number }[], want: number[][]) => {
      expect(got.length).toBe(want.length)
      got.forEach((st, i) => {
        expect(st.x).toBeCloseTo(want[i][0], 3)
        expect(st.y).toBeCloseTo(want[i][1], 3)
        expect(st.r).toBeCloseTo(want[i][2], 3)
      })
    }
    // The medium widget's sky (364 × 168.6 at 364/380), seed 12, nothing clear: 26 stars, the first eight pinned.
    const medium = placeStars(364, 168.6, 364 / 380, [], 12)
    expect(medium.length).toBe(26)
    near(medium.slice(0, 8), [
      [349.3018, 16.5411, 3.0653], [79.1584, 126.2201, 4.0232], [68.3944, 19.3162, 4.0232], [245.6473, 69.4472, 3.0653],
      [113.9643, 141.2273, 4.9811], [225.0583, 27.3102, 3.0653], [34.8242, 122.8403, 3.0653], [198.7911, 130.5456, 4.0232],
    ])
    near(medium.slice(-2), [[312.9344, 18.7691, 3.0653], [337.6798, 152.2236, 4.0232]])
    // The name's small widget (170 × 170 at 170/179), seed 24, as NameSmallBackground and nameSmall: one star, top corner.
    near(placeStars(170, 170, 170 / 179, [{ x: 0, y: -0.04, w: 1, h: 1.02, oval: true }, { x: 0, y: 0.78, w: 1, h: 0.22 }], 24), [[153.7322, 17.6671, 3.0391]])
  })
  it('one algorithm: the Swift and Java ports carry the same constants as sky-stars.ts', () => {
    const ts = read('web/src/v2/daily/names/sky-stars.ts')
    const swift = read('web/ios/App/MuslimWidgets/Theme.swift')
    const java = read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/widget/WidgetPainter.java')
    const between = (t: string, a: string, b: string) => {
      const i = t.indexOf(a)
      expect(i, a).toBeGreaterThanOrEqual(0)
      return t.slice(i, t.indexOf(b, i + a.length))
    }
    const tsPlace = between(ts, 'function mulberry32', 'export function starPath')
    const swPlace = between(swift, 'enum SkyStarField', 'struct SkyStarShape')
    const jvPlace = between(java, 'private void skyStars', 'Paint gold') + between(java, 'private static double mulberry', 'private static boolean hitsClear')
    for (const [name, src] of [['ts', tsPlace], ['swift', swPlace], ['java', jvPlace]] as const) {
      // The PRNG: mulberry32 with the same seed scramble and the same shifts.
      expect(src, name).toMatch(/0x9e3779b9/i)
      expect(src.match(/0x6d2b79f5/gi)?.length, name).toBe(2)
      for (const k of ['>> 15', '>> 7', '>> 14', '| 1)', '| 61)']) expect(src.replace(/>>>/g, '>>'), `${name} ${k}`).toContain(k)
      // The placement: 12 in from the edge, about one star per 2,600 board units², at most 40, 60 tries each, 3 round a
      // clear place, 26 between two stars.
      expect(src, name).toMatch(/margin = 12 \* (s|u)\b/)
      expect(src, name).toMatch(/2600 \* (s|u) \* (s|u)/)
      expect(src, name).toMatch(/min\(40, /)
      expect(src, name).toMatch(/target \* 60/)
      expect(src, name).toMatch(/3 \* (s|u)\b/)
      expect(src, name).toMatch(/< 26 \* (s|u) \+ /)
    }
    // The four sizes and how often each comes.
    const pairs = (t: string) => [...t.matchAll(/[({]\s*([\d.]+)f?,\s*([\d.]+)f?\s*[)}]/g)].map((m) => [Number(m[1]), Number(m[2])])
    expect(pairs(between(swift, 'static let sizes', '\n'))).toEqual(STAR_SIZES)
    expect(pairs(between(java, 'STAR_SIZES = ', ';'))).toEqual(STAR_SIZES)
    // The star's shape: the rays on the axes r long, those between half, the waist 0.15 r; the same 16 points.
    const shape = /i % 4 ===? 0 \? (\w+\.)?r{1,2} : \(?i % 2 ===? 0 \? (\w+\.)?r{1,2} \* 0\.5f? : (\w+\.)?r{1,2} \* 0\.15f?\)?/
    expect(between(ts, 'export function starPath', '\n}')).toMatch(shape)
    expect(between(swift, 'struct SkyStarShape', 'struct SkyStars')).toMatch(shape)
    expect(between(java, 'Paint gold', 'private static double mulberry')).toMatch(shape)
    for (const t of [ts, between(swift, 'struct SkyStarShape', 'struct SkyStars'), between(java, 'Paint gold', 'private static double mulberry')]) expect(t).toMatch(/i < 16|0\.\.<16/)
    // The colours: the date card's gold and the light at the heart.
    const hex = (v: string) => v.replace(/^#|^0x(ff)?/i, '').toLowerCase()
    expect(hex(swift.match(/static let starGold = Color\(hex: (0x[0-9a-f]{6})\)/i)![1])).toBe(hex(STAR_GOLD))
    expect(hex(swift.match(/static let starHeart = Color\(hex: (0x[0-9a-f]{6})\)/i)![1])).toBe(hex(STAR_HEART))
    expect(hex(java.match(/STAR_GOLD = (0x[0-9A-F]{8});/i)![1])).toBe(hex(STAR_GOLD))
    expect(hex(java.match(/STAR_HEART = (0x[0-9A-F]{8});/i)![1])).toBe(hex(STAR_HEART))
    // The heart: one ratio of the star's radius, and every platform draws with it, not a number of its own.
    expect(STAR_HEART_RATIO).toBe(0.12)
    expect(Number(swift.match(/static let heartRatio: CGFloat = ([\d.]+)/)![1])).toBe(STAR_HEART_RATIO)
    expect(Number(java.match(/STAR_HEART_RATIO = ([\d.]+)f;/)![1])).toBe(STAR_HEART_RATIO)
    expect(swift).toMatch(/let k = st\.r \* SkyStarField\.heartRatio/)
    expect(java).toMatch(/c\.drawCircle\(cx, cy, rr \* STAR_HEART_RATIO, heart\)/)
    expect(read('web/src/v2/daily/names/NameCard.tsx')).toMatch(/r=\{\(s\.r \* STAR_HEART_RATIO\)\.toFixed\(2\)\}/)
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
    expect(theme).not.toMatch(/TiledImage\(name:\s*"sky"/)
    expect(theme).not.toMatch(/struct Sparkle|struct Stars\b/)
    const views = read('web/ios/App/MuslimWidgets/Views.swift') + read('web/ios/App/MuslimWidgets/NameViews.swift')
    expect(views).not.toMatch(/\bStars\(stars:/)
    const android = read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/widget/WidgetPainter.java')
    expect(android).not.toMatch(/tiles\([^)]*widget_sky/)
    expect(fs.existsSync(path.join(ROOT, 'web/public/art/sky-stars.png'))).toBe(false)
  })
  it('the name’s small widget on Android has the iPhone’s sky: the lapis once, and the stars of seed 24', () => {
    const java = read('web/android/app/src/main/java/com/alkhammashtalal/imuslim/widget/WidgetPainter.java')
    const small = java.slice(java.indexOf('private void nameSmall'), java.indexOf('private static int pagesOf'))
    expect(small).toMatch(/g\.setColor\(SKY_FIELD\);[\s\S]*skyPicture\(all, 255, false\);[\s\S]*skyStars\(all, new float\[\]\[\] \{ \{ 0, -0\.04f, 1, 1\.02f, 1 \}, \{ 0, 0\.78f, 1, 0\.22f \} \}, 24\);[\s\S]*shamsa\(/)
    expect(small).not.toMatch(/SKY_MID/)
    const ios = read('web/ios/App/MuslimWidgets/NameViews.swift')
    expect(ios).toMatch(/clear: \[\.oval\(0, -0\.04, 1, 1\.02\), \.rect\(0, 0\.78, 1, 0\.22\)\], seed: 24/)
  })
})

// The painted sky's stars (add-on 0072-add53, Talal's word of 31 October): small sharp gold stars drawn in code over
// the painting's starless lapis (/art/sky-lapis.png, drawn once as cover), as the date card's sky. The same steps as
// the widgets' SkyStarField (web/ios/App/MuslimWidgets/Theme.swift) and WidgetPainter.java's skyStars, so one box gets
// the same stars on every platform: a seeded mulberry32, then darts kept when the star is whole inside the box (12 px
// in from its edge, past the frame), clear of the text and the shamsa, and apart from the other stars.

export type SkyClear = { x: number; y: number; w: number; h: number; oval?: boolean }
export type SkyStar = { x: number; y: number; r: number }

/** Radii in CSS px (the widgets' board points) and how often each comes: most small, a few larger. */
export const STAR_SIZES: ReadonlyArray<readonly [number, number]> = [
  [3.2, 0.4],
  [4.2, 0.75],
  [5.2, 0.93],
  [6.4, 1],
]

/** The date card's gold and the light at a star's heart. */
export const STAR_GOLD = '#d4ad5e'
export const STAR_HEART = '#f4e3b5'
/** The heart's radius over the star's, one number on the three platforms (worker/test/sky-stars-0072.test.ts). */
export const STAR_HEART_RATIO = 0.2

function mulberry32(seed: number): () => number {
  let a = (Math.imul(seed >>> 0, 0x9e3779b9) + 0x6d2b79f5) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0
    t = (t ^ ((t + Math.imul(t ^ (t >>> 7), t | 61)) >>> 0)) >>> 0
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Whether a star at (px, py) of radius r touches a clear place (unit box of a w × h box), with `pad` round it. */
function hits(c: SkyClear, px: number, py: number, r: number, w: number, h: number, pad: number): boolean {
  const x0 = c.x * w
  const y0 = c.y * h
  const x1 = (c.x + c.w) * w
  const y1 = (c.y + c.h) * h
  if (c.oval) {
    const rx = (x1 - x0) / 2 + r + pad
    const ry = (y1 - y0) / 2 + r + pad
    const dx = (px - (x0 + x1) / 2) / rx
    const dy = (py - (y0 + y1) / 2) / ry
    return dx * dx + dy * dy < 1
  }
  return px > x0 - r - pad && px < x1 + r + pad && py > y0 - r - pad && py < y1 + r + pad
}

/** The stars of a w × h box at scale s (1 on the web), none closer than 12·s + r to an edge. */
export function placeStars(w: number, h: number, s: number, clear: SkyClear[], seed: number): SkyStar[] {
  if (!(w > 0 && h > 0 && s > 0)) return []
  const next = mulberry32(seed)
  const margin = 12 * s
  const target = Math.min(40, Math.max(1, Math.round((w * h) / (2600 * s * s))))
  const stars: SkyStar[] = []
  for (let i = 0; i < target * 60 && stars.length < target; i++) {
    const u = next()
    const r = (STAR_SIZES.find(([, p]) => u < p)?.[0] ?? 3.2) * s
    const px = margin + r + next() * Math.max(0, w - 2 * (margin + r))
    const py = margin + r + next() * Math.max(0, h - 2 * (margin + r))
    if (w - 2 * (margin + r) <= 0 || h - 2 * (margin + r) <= 0) continue
    if (clear.some((c) => hits(c, px, py, r, w, h, 3 * s))) continue
    if (stars.some((o) => Math.hypot(o.x - px, o.y - py) < 26 * s + o.r + r)) continue
    stars.push({ x: px, y: py, r })
  }
  return stars
}

/** One star's outline: eight sharp rays, the four on the axes long, the four between half as long, a fine waist. */
export function starPath({ x, y, r }: SkyStar): string {
  const pts: string[] = []
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2
    const len = i % 4 === 0 ? r : i % 2 === 0 ? r * 0.5 : r * 0.15
    pts.push(`${(x + len * Math.cos(a)).toFixed(2)} ${(y + len * Math.sin(a)).toFixed(2)}`)
  }
  return `M${pts.join('L')}Z`
}

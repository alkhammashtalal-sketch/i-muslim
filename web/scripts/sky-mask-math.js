// The sky's two masks from the painting's own pixels (add-on 0071-add16 §2), in the browser (a canvas), shared by
// scripts/sky-masks.mjs (which writes them) and the measures in e2e/v2-0071-sky.spec.ts (which classify the ground).
//
// Team A's equations (relay/w1/0071-market/sky-review/sky-teamA.md §4), on card-date-B4.webp (1200 × 865), over the sky
// box (x 83–1116, y 75–785: 1034 × 711):
//   gold  = smoothstep(0.02, 0.16, R − B) × smoothstep(0.16, 0.30, Y)      (R, G, B and the luma Y in 0–1, as stored)
//           smoothed by half a pixel (a 3 × 3 Gaussian, σ = 0.5), then × smoothstep(246, 252, r)
//   lapis = (1 − gold before the shamsa's term) × smoothstep(206, 212, r)
//   r: the distance in the painting's pixels from the shamsa's centre (599, 430)
// Team B's corner cut-outs (sky-teamB.md §5): two soft ellipses 62% × 40% of the sky box at its lower corners, whole up
// to 72% of their radius, then .85 at 79%, .5 at 86%, .15 at 93%, none at 100%. Both masks are multiplied by
// (1 − the larger cut), so no layer lies where the corner dates are.
;(function (root) {
  const SKY = { x: 83, y: 75, w: 1034, h: 711 }
  const CENTRE = { x: 599, y: 430 }
  const smooth = (e0, e1, v) => {
    const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)
  }
  const STOPS = [
    [0.72, 1],
    [0.79, 0.85],
    [0.86, 0.5],
    [0.93, 0.15],
    [1, 0],
  ]
  /** The cut's strength at a normalised elliptical distance d from its corner. */
  function cutAt(d) {
    if (d <= STOPS[0][0]) return 1
    for (let i = 1; i < STOPS.length; i++) {
      const [d1, v1] = STOPS[i]
      const [d0, v0] = STOPS[i - 1]
      if (d <= d1) return v0 + ((v1 - v0) * (d - d0)) / (d1 - d0)
    }
    return 0
  }
  /** The corner cut at (u, v) of the sky box (0–1, v downwards). */
  function corners(u, v) {
    const dy = (1 - v) / 0.4
    const left = Math.hypot(u / 0.62, dy)
    const right = Math.hypot((1 - u) / 0.62, dy)
    return Math.max(cutAt(left), cutAt(right))
  }
  /**
   * From the painting's RGBA pixels (1200 × 865): { gold, lapis, goldColour, cut } over the sky box, each a
   * Float32Array of 1034 × 711 in 0–1. `gold` and `lapis` carry the corner cut; `goldColour` (the colour term alone,
   * smoothed) and `cut` are for the measures.
   */
  function skyMasks(px, width) {
    const { w, h } = SKY
    const raw = new Float32Array(w * h)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = 4 * ((y + SKY.y) * width + (x + SKY.x))
        const R = px[i] / 255
        const G = px[i + 1] / 255
        const B = px[i + 2] / 255
        const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B
        raw[y * w + x] = smooth(0.02, 0.16, R - B) * smooth(0.16, 0.3, Y)
      }
    // Half a pixel: a 3 × 3 Gaussian with σ = 0.5 (weights 1, e^-2, e^-4, normalised).
    const k = [Math.exp(-4), Math.exp(-2), Math.exp(-4), Math.exp(-2), 1, Math.exp(-2), Math.exp(-4), Math.exp(-2), Math.exp(-4)]
    const goldColour = new Float32Array(w * h)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let s = 0
        let n = 0
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx
            const yy = y + dy
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue
            const kk = k[(dy + 1) * 3 + (dx + 1)]
            s += kk * raw[yy * w + xx]
            n += kk
          }
        goldColour[y * w + x] = s / n
      }
    const gold = new Float32Array(w * h)
    const lapis = new Float32Array(w * h)
    const cut = new Float32Array(w * h)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const j = y * w + x
        const r = Math.hypot(x + SKY.x - CENTRE.x, y + SKY.y - CENTRE.y)
        const c = corners((x + 0.5) / w, (y + 0.5) / h)
        cut[j] = c
        gold[j] = goldColour[j] * smooth(246, 252, r) * (1 - c)
        lapis[j] = (1 - goldColour[j]) * smooth(206, 212, r) * (1 - c)
      }
    return { gold, lapis, goldColour, cut, SKY, CENTRE }
  }
  root.skyMaskMath = { skyMasks, corners, cutAt, SKY, CENTRE }
})(typeof window !== 'undefined' ? window : globalThis)

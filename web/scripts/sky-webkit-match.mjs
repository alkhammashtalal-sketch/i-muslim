// Team B's T10 (add-on 0071-add16): the iOS simulator's sky (WKWebView) against Chromium's, state by state.
//   BASE_URL=http://localhost:8853 node web/scripts/sky-webkit-match.mjs <dir of sim-*.png> [out.json]
// Chromium draws the card at 390 px and 3x (the simulator's iPhone 16e); the card is found in the simulator's screen by
// its frame (outside the sky, where no layer lies), then the two skies are compared in CIE ΔE2000: the mean over the
// sky box, and the largest over 6 × 6 pixel blocks (so a ray's anti-aliasing a pixel apart is not counted as colour);
// the shamsa and the corner dates' regions left out (their texts are the phone's own type).
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const BASE = process.env.BASE_URL || 'http://localhost:8853'
const [dir, outFile] = process.argv.slice(2)
const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
const TIMES = [['night', '21:30'], ['fajr', '05:05'], ['morning', '08:00'], ['dhuhr', '12:15'], ['asr', '15:45'], ['maghrib', '17:40']]

const browser = await chromium.launch({ channel: 'chrome' })
const result = {}
for (const lang of ['ar', 'en'])
  for (const [state, hhmm] of TIMES) {
    const sim = path.join(dir, `sim-${state}-${lang}-390.png`)
    if (!fs.existsSync(sim)) continue
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, timezoneId: 'Asia/Riyadh', serviceWorkers: 'block' })
    await ctx.addInitScript((place) => {
      localStorage.setItem('muslim.welcome.v1', '1')
      localStorage.setItem('muslim.place.v1', JSON.stringify(place))
    }, RIYADH)
    const page = await ctx.newPage()
    await page.clock.setFixedTime(new Date(`2026-10-22T${hhmm}:00+03:00`))
    await page.goto(`${BASE}/?lang=${lang}&theme=light`, { waitUntil: 'networkidle' })
    await page.locator('.day-date .dc-day').waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.addStyleTag({ content: '.day-date .dd-corner, .day-date .dc-disc span { visibility: hidden !important; }' })
    await page.waitForTimeout(500)
    const box = await page.locator('.day-date').boundingBox()
    const card = (await page.screenshot({ clip: box })).toString('base64')
    await ctx.close()
    const cmp = await browser.newPage()
    result[`${state}-${lang}`] = await cmp.evaluate(
      async ([A, S]) => {
        const load = async (b64) => {
          const img = new Image()
          img.src = `data:image/png;base64,${b64}`
          await img.decode()
          const c = document.createElement('canvas')
          c.width = img.naturalWidth
          c.height = img.naturalHeight
          const g = c.getContext('2d', { colorSpace: 'srgb' })
          g.drawImage(img, 0, 0)
          return { w: c.width, h: c.height, px: g.getImageData(0, 0, c.width, c.height).data }
        }
        const a = await load(A)
        const s = await load(S)
        // Find the card: its left at x 48 (16 pt), its top by the frame's first 24 rows and its left 24 columns.
        const at = (im, x, y, k) => im.px[4 * (y * im.w + x) + k]
        let best = [Infinity, 0, 0]
        for (let dx = 44; dx <= 52; dx++)
          for (let dy = 0; dy + a.h <= s.h; dy += 1) {
            let d = 0
            let n = 0
            for (let y = 2; y < 26; y += 2)
              for (let x = 30; x < a.w - 30; x += 9) {
                for (let k = 0; k < 3; k++) d += Math.abs(at(a, x, y, k) - at(s, x + dx, y + dy, k))
                n++
              }
            if (d / n < best[0]) best = [d / n, dx, dy]
          }
        const [, ox, oy] = best
        const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
        const lab = (R, G, B) => {
          const r = lin(R), g = lin(G), b = lin(B)
          const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116)
          const X = f((0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047)
          const Y = f(0.2126 * r + 0.7152 * g + 0.0722 * b)
          const Z = f((0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883)
          return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)]
        }
        const de = ([L1, a1, b1], [L2, a2, b2]) => {
          const rad = Math.PI / 180
          const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2
          const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)))
          const a1p = (1 + G) * a1, a2p = (1 + G) * a2
          const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2)
          const hh = (x, y) => (x === 0 && y === 0 ? 0 : ((Math.atan2(y, x) / rad) + 360) % 360)
          const h1 = hh(a1p, b1), h2 = hh(a2p, b2)
          let dh = h2 - h1
          if (C1p * C2p === 0) dh = 0
          else if (dh > 180) dh -= 360
          else if (dh < -180) dh += 360
          const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * rad)
          const Lm = (L1 + L2) / 2, Cmp = (C1p + C2p) / 2
          let hm = h1 + h2
          if (C1p * C2p !== 0) hm = Math.abs(h1 - h2) > 180 ? (h1 + h2 + (h1 + h2 < 360 ? 360 : -360)) / 2 : (h1 + h2) / 2
          const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad)
          const dTh = 30 * Math.exp(-(((hm - 275) / 25) ** 2))
          const Rc = 2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7))
          const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2), Sc = 1 + 0.045 * Cmp, Sh = 1 + 0.015 * Cmp * T
          const Rt = -Math.sin(2 * dTh * rad) * Rc
          return Math.sqrt(((L2 - L1) / Sl) ** 2 + ((C2p - C1p) / Sc) ** 2 + (dH / Sh) ** 2 + Rt * ((C2p - C1p) / Sc) * (dH / Sh))
        }
        // The sky box, without a 12-pixel margin by its edge and without the shamsa (its texts are hidden either way).
        const x0 = Math.ceil((83 / 1200) * a.w) + 12, x1 = Math.floor((1117 / 1200) * a.w) - 12
        const y0 = Math.ceil((75 / 865) * a.h) + 12, y1 = Math.floor((786 / 865) * a.h) - 12
        let sum = 0, n = 0, worst = 0, worstAt = [0, 0]
        const blocks = []
        const B = 6
        for (let by = y0; by + B <= y1; by += B)
          for (let bx = x0; bx + B <= x1; bx += B) {
            const u = ((bx + B / 2) / a.w) * 1200, v = ((by + B / 2) / a.h) * 865
            if (Math.hypot(u - 599, v - 430) < 255) continue
            // And the two corner dates' regions (shown on the phone's screen; M1 and M2 with a margin).
            if (v > 786 - 51.9 - 0.13 * 711 - 12 && (u < 83 + 0.33 * 1034 || u > 1117 - 0.33 * 1034)) continue
            const ma = [0, 0, 0], ms = [0, 0, 0]
            for (let y = by; y < by + B; y++)
              for (let x = bx; x < bx + B; x++) {
                const pa = lab(at(a, x, y, 0), at(a, x, y, 1), at(a, x, y, 2))
                const ps = lab(at(s, x + ox, y + oy, 0), at(s, x + ox, y + oy, 1), at(s, x + ox, y + oy, 2))
                sum += de(pa, ps)
                n++
                for (let k = 0; k < 3; k++) (ma[k] += pa[k] / (B * B)), (ms[k] += ps[k] / (B * B))
              }
            const d = de(ma, ms)
            blocks.push(d)
            if (d > worst) (worst = d), (worstAt = [Math.round(u), Math.round(v)])
          }
        blocks.sort((p, q) => p - q)
        return { at: [ox, oy], frameDiff: best[0], meanDE: sum / n, maxBlockDE: worst, worstAt, p99BlockDE: blocks[Math.floor(blocks.length * 0.99)], over3: blocks.filter((d) => d > 3).length / blocks.length }
      },
      [card, fs.readFileSync(sim).toString('base64')],
    )
    await cmp.close()
    const r = result[`${state}-${lang}`]
    console.log(`${state}-${lang}: card at ${r.at.join(',')} (frame Δ ${r.frameDiff.toFixed(1)}), mean ΔE2000 ${r.meanDE.toFixed(2)}, largest 6×6 block ${r.maxBlockDE.toFixed(2)} at ${r.worstAt.join(',')} (99% of blocks ≤ ${r.p99BlockDE.toFixed(2)}, ${(100 * r.over3).toFixed(2)}% over 3)`)
  }
await browser.close()
if (outFile) fs.writeFileSync(outFile, JSON.stringify(result, null, 1))

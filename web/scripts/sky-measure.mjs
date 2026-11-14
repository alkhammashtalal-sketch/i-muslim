// Measures the date card's sky at the six times against the order's limits (add-on 0071-add16 §1):
//   BASE_URL=http://localhost:8853 node web/scripts/sky-measure.mjs [out.json]
// The card is drawn at the painting's own size (a 432 px wide page at 3× gives a 400 px card, 1200 × 865 pixels), its
// texts hidden; the painting's own pixels classify the ground (the lapis outside the shamsa, no gold: sky-mask-math.js,
// colour term < 0.05, r ≥ 262) and the gold (colour term ≥ 0.95, r ≥ 262). Per time:
//   L*, C*, h of the ground's mean colour (CIE Lab, D65), the ground's C* at its 10th percentile, the gold-to-ground
//   ratio (WCAG luminance: (Y gold + 0.05) ÷ (Y ground + 0.05), on their mean luminances), and the mean ΔE2000 over the
//   ground between each time and the next. Riyadh, 22 October 2026, at the approval shots' times.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.BASE_URL || 'http://localhost:8853'
const RIYADH = { lat: 24.6877, lng: 46.7219, timeZone: 'Asia/Riyadh', name: 'الرياض', source: 'city' }
export const TIMES = [
  ['night', '21:30'],
  ['fajr', '05:05'],
  ['morning', '08:00'],
  ['dhuhr', '12:15'],
  ['asr', '15:45'],
  ['maghrib', '17:40'],
]
const LIMITS = { hue: [280, 295], chroma: 24, gold: 2.9, deltaE: 5 }

/** Shots of the card (1200 × 865) at each time, and of the painting with no layer. */
async function shots(browser, lang = 'ar') {
  const out = {}
  for (const [key, hhmm] of [['painting', '21:30'], ...TIMES]) {
    const ctx = await browser.newContext({ viewport: { width: 432, height: 900 }, deviceScaleFactor: 3, locale: 'ar', timezoneId: 'Asia/Riyadh', serviceWorkers: 'block' })
    await ctx.addInitScript((place) => {
      localStorage.setItem('muslim.welcome.v1', '1')
      localStorage.setItem('muslim.place.v1', JSON.stringify(place))
    }, RIYADH)
    const page = await ctx.newPage()
    await page.clock.setFixedTime(new Date(`2026-10-22T${hhmm}:00+03:00`))
    await page.goto(`${BASE}/?lang=${lang}&theme=light`, { waitUntil: 'networkidle' })
    await page.locator('.day-date .dc-day').waitFor()
    await page.evaluate(() => document.fonts.ready)
    await page.addStyleTag({ content: `.day-date .dd-corner, .day-date .dc-disc span { color: transparent !important; text-shadow: none !important; }${key === 'painting' ? ' .sky-l { display: none !important; }' : ''}` })
    await page.waitForTimeout(400)
    const el = page.locator('.day-date')
    const box = await el.boundingBox()
    out[key] = { png: (await page.screenshot({ clip: box })).toString('base64'), sky: await el.getAttribute('data-sky') }
    await ctx.close()
  }
  return out
}

export async function measure(browser, lang = 'ar') {
  const s = await shots(browser, lang)
  const page = await browser.newPage()
  await page.setContent('<!doctype html><title>measure</title>')
  await page.addScriptTag({ path: path.join(WEB, 'scripts/sky-mask-math.js') })
  const r = await page.evaluate(
    async ({ shots, painting, order }) => {
      // The card's shot may carry a row more from rounding: drawn at the painting's own 1200 × 865.
      const load = async (b64, type = 'image/png') => {
        const img = new Image()
        img.src = `data:${type};base64,${b64}`
        await img.decode()
        const c = document.createElement('canvas')
        c.width = 1200
        c.height = 865
        const g = c.getContext('2d')
        g.drawImage(img, 0, 0, 1200, 865)
        return { w: c.width, h: c.height, px: g.getImageData(0, 0, c.width, c.height).data }
      }
      const art = await load(painting, 'image/webp')
      const m = window.skyMaskMath.skyMasks(art.px, art.w)
      const { SKY, CENTRE } = m
      const ground = []
      const gold = []
      for (let y = 0; y < SKY.h; y++)
        for (let x = 0; x < SKY.w; x++) {
          const j = y * SKY.w + x
          const r = Math.hypot(x + SKY.x - CENTRE.x, y + SKY.y - CENTRE.y)
          if (r < 262) continue
          const at = (y + SKY.y) * 1200 + (x + SKY.x)
          if (m.goldColour[j] < 0.05) ground.push(at)
          else if (m.goldColour[j] >= 0.95) gold.push(at)
        }
      const lin = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
      const lab = (R, G, B) => {
        const r = lin(R)
        const g = lin(G)
        const b = lin(B)
        const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
        const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b
        const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
        const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116)
        return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z)), Y]
      }
      const de2000 = ([L1, a1, b1], [L2, a2, b2]) => {
        const rad = Math.PI / 180
        const C1 = Math.hypot(a1, b1)
        const C2 = Math.hypot(a2, b2)
        const Cm = (C1 + C2) / 2
        const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)))
        const a1p = (1 + G) * a1
        const a2p = (1 + G) * a2
        const C1p = Math.hypot(a1p, b1)
        const C2p = Math.hypot(a2p, b2)
        const h = (a, b) => (a === 0 && b === 0 ? 0 : (Math.atan2(b, a) / rad + 360) % 360)
        const h1p = h(a1p, b1)
        const h2p = h(a2p, b2)
        const dL = L2 - L1
        const dC = C2p - C1p
        let dh = h2p - h1p
        if (C1p * C2p === 0) dh = 0
        else if (dh > 180) dh -= 360
        else if (dh < -180) dh += 360
        const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin((dh / 2) * rad)
        const Lm = (L1 + L2) / 2
        const Cmp = (C1p + C2p) / 2
        let hm = h1p + h2p
        if (C1p * C2p !== 0) hm = Math.abs(h1p - h2p) > 180 ? (h1p + h2p + (h1p + h2p < 360 ? 360 : -360)) / 2 : (h1p + h2p) / 2
        const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad)
        const dTh = 30 * Math.exp(-(((hm - 275) / 25) ** 2))
        const Rc = 2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7))
        const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2)
        const Sc = 1 + 0.045 * Cmp
        const Sh = 1 + 0.015 * Cmp * T
        const Rt = -Math.sin(2 * dTh * rad) * Rc
        return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh))
      }
      const labs = {}
      const out = {}
      for (const [key, { png, sky }] of Object.entries(shots)) {
        const im = await load(png)
        if (im.w !== 1200 || im.h !== 865) throw new Error(`${key}: ${im.w} × ${im.h}`)
        const L = ground.map((i) => lab(im.px[4 * i], im.px[4 * i + 1], im.px[4 * i + 2]))
        labs[key] = L
        const mean = [0, 0, 0, 0]
        for (const v of L) for (let k = 0; k < 4; k++) mean[k] += v[k]
        for (let k = 0; k < 4; k++) mean[k] /= L.length
        const chroma = L.map(([, a, b]) => Math.hypot(a, b)).sort((a, b) => a - b)
        let gy = 0
        for (const i of gold) gy += lab(im.px[4 * i], im.px[4 * i + 1], im.px[4 * i + 2])[3]
        gy /= gold.length
        out[key] = {
          sky,
          L: mean[0],
          C: Math.hypot(mean[1], mean[2]),
          h: ((Math.atan2(mean[2], mean[1]) * 180) / Math.PI + 360) % 360,
          C10: chroma[Math.floor(chroma.length * 0.1)],
          gold: (gy + 0.05) / (mean[3] + 0.05),
        }
      }
      const deltas = {}
      for (let k = 0; k < order.length; k++) {
        const a = order[k]
        const b = order[(k + 1) % order.length]
        let s = 0
        for (let i = 0; i < ground.length; i++) s += de2000(labs[a][i], labs[b][i])
        deltas[`${a}→${b}`] = s / ground.length
      }
      return { out, deltas, pixels: { ground: ground.length, gold: gold.length } }
    },
    { shots: s, painting: fs.readFileSync(path.join(WEB, 'public/art/card-date-B4.webp')).toString('base64'), order: ['fajr', 'morning', 'dhuhr', 'asr', 'maghrib', 'night'] },
  )
  await page.close()
  return r
}

export function verdict({ out, deltas }) {
  const bad = []
  for (const [k, v] of Object.entries(out)) {
    if (k === 'painting') continue
    if (v.h < LIMITS.hue[0] || v.h > LIMITS.hue[1]) bad.push(`${k}: hue ${v.h.toFixed(1)}`)
    if (v.C < LIMITS.chroma) bad.push(`${k}: C* ${v.C.toFixed(1)}`)
    if (v.gold < LIMITS.gold) bad.push(`${k}: gold ${v.gold.toFixed(2)}`)
  }
  for (const [k, v] of Object.entries(deltas)) if (v < LIMITS.deltaE) bad.push(`${k}: ΔE ${v.toFixed(2)}`)
  return bad
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const browser = await chromium.launch({ channel: 'chrome' })
  const r = await measure(browser, process.env.SKY_LANG || 'ar')
  await browser.close()
  for (const [k, v] of Object.entries(r.out))
    console.log(`${k.padEnd(9)} ${String(v.sky).padEnd(8)} L* ${v.L.toFixed(1)}  C* ${v.C.toFixed(1)}  h ${v.h.toFixed(1)}  C*10% ${v.C10.toFixed(1)}  gold ${v.gold.toFixed(2)}`)
  for (const [k, v] of Object.entries(r.deltas)) console.log(`ΔE2000 ${k}: ${v.toFixed(2)}`)
  const bad = verdict(r)
  console.log(bad.length ? `OUT OF LIMITS: ${bad.join('; ')}` : 'all within the limits')
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify({ ...r, limits: LIMITS }, null, 1))
}

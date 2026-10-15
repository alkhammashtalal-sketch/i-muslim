// The Android app's images (reply 0066), from the approved icon web/public/icons/icon-1024.png (the App Store icon, byte
// for byte): nothing is drawn, the icon's own pixels are scaled down only, in headless Chrome (Playwright, as
// launch-image.mjs).
//   - The adaptive launcher icon: its background layer is the icon's ground colour (@color/ic_launcher_background), and
//     its foreground layer is the shamsa with «مسلم» on a transparent ground, within the 66 dp safe zone of the 108 dp
//     layer, so a round or a square mask never cuts it. The ground is taken out by colour-to-alpha against that colour:
//     over its own ground each pixel is exactly the icon's again, edges included.
//   - The launch screen's icon (Android 12+ SplashScreen API, and its compat library on Android 10): the same shamsa,
//     288 dp with the shamsa in the 192 dp circle the system keeps, on the welcome page's sky (@color/launch_welcome_sky,
//     iOS LaunchWelcomeSky).
//   - The status-bar icon of the bells and the reminder (white on transparent, as Android draws it): the inner disc with
//     «مسلم» cut out of it.
// The previews (the launcher icon in a round, a square and a rounded-square mask, and the launch screen) go to the
// folder given, never into the app.
//
//   cd web && node scripts/android-assets.mjs [previews folder]
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const WEB = path.resolve(import.meta.dirname, '..')
const SOURCE = path.join(WEB, 'public/icons/icon-1024.png')
const RES = path.join(WEB, 'android/app/src/main/res')
const PREVIEWS = process.argv[2] ? path.resolve(process.argv[2]) : null
/** web/ios/App/App/Assets.xcassets/LaunchWelcomeSky.colorset: the welcome page's sky around the painting. */
export const LAUNCH_WELCOME_SKY = '#13306b'
const DENSITIES = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }

// Measured on icon-1024.png: the shamsa's farthest pixel from the centre (its tips), and the inner cream disc.
const SHAMSA_REACH = 496.5
const DISC_RADIUS = 188

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
const out = await page.evaluate(
  async ({ src, reach, disc, densities }) => {
    const img = new Image()
    img.src = src
    await img.decode()
    const W = img.width
    const base = new OffscreenCanvas(W, W)
    const bx = base.getContext('2d')
    bx.drawImage(img, 0, 0)
    const data = bx.getImageData(0, 0, W, W)
    const d = data.data
    const ground = [d[0], d[1], d[2]]

    // Colour-to-alpha against the ground: the least alpha that makes each pixel a colour over the ground.
    const fg = new ImageData(W, W)
    const f = fg.data
    for (let k = 0; k < d.length; k += 4) {
      let a = 0
      for (let c = 0; c < 3; c++) {
        const v = d[k + c], g = ground[c]
        const need = v > g ? (v - g) / (255 - g) : v < g ? (g - v) / g : 0
        if (need > a) a = need
      }
      f[k + 3] = Math.round(a * 255)
      for (let c = 0; c < 3; c++) f[k + c] = a > 0 ? Math.max(0, Math.min(255, Math.round((d[k + c] - (1 - a) * ground[c]) / a))) : 0
    }
    const shamsa = new OffscreenCanvas(W, W)
    shamsa.getContext('2d').putImageData(fg, 0, 0)

    // The inner disc, «مسلم» cut out: opacity by lightness from the word's ink (0) to the disc's cream (1), inside the disc.
    // The word's edge pixels count as ink up to half the way to the cream, so the cut stays legible at 24 dp.
    const ink = 0.5, cream = 0.9
    const mono = new ImageData(W, W)
    const m = mono.data
    const c0 = (W - 1) / 2
    for (let y = 0; y < W; y++)
      for (let x = 0; x < W; x++) {
        const k = (y * W + x) * 4
        const r = Math.hypot(x - c0, y - c0)
        const edge = Math.max(0, Math.min(1, disc - r + 0.5))
        const lum = (0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2]) / 255
        const a = Math.max(0, Math.min(1, (lum - ink) / (cream - ink))) * edge
        m[k] = m[k + 1] = m[k + 2] = 255
        m[k + 3] = Math.round(a * 255)
      }
    const discCanvas = new OffscreenCanvas(W, W)
    discCanvas.getContext('2d').putImageData(mono, 0, 0)

    const png = async (canvas) => {
      const blob = await canvas.convertToBlob({ type: 'image/png' })
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let s = ''
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      return btoa(s)
    }
    /** `from` (a W×W canvas) drawn so that a circle of `fromRadius` source pixels becomes `toRadius` px, centred in size×size. */
    const scaled = (from, fromRadius, size, toRadius) => {
      const c = new OffscreenCanvas(size, size)
      const x = c.getContext('2d')
      x.imageSmoothingEnabled = true
      x.imageSmoothingQuality = 'high'
      const s = toRadius / fromRadius
      const w = W * s
      x.drawImage(from, (size - w) / 2, (size - w) / 2, w, w)
      return c
    }
    const files = {}
    for (const [dpi, k] of Object.entries(densities)) {
      // Launcher foreground: 108 dp layer, the shamsa's reach on the 33 dp safe-zone radius (a hair inside it).
      files[`mipmap-${dpi}/ic_launcher_foreground.png`] = await png(scaled(shamsa, reach, Math.round(108 * k), 32.8 * k))
      // Launch screen icon: 288 dp, the shamsa within the 192 dp circle (radius 92 dp, a margin inside 96).
      files[`drawable-${dpi}/splash_icon.png`] = await png(scaled(shamsa, reach, Math.round(288 * k), 92 * k))
      // Status-bar icon: 24 dp with the disc in the 20 dp live area (radius 10 dp).
      files[`drawable-${dpi}/ic_stat_muslim.png`] = await png(scaled(discCanvas, disc, Math.round(24 * k), 10 * k))
    }
    return { ground: '#' + ground.map((v) => v.toString(16).padStart(2, '0')).join(''), files }
  },
  { src: 'data:image/png;base64,' + fs.readFileSync(SOURCE).toString('base64'), reach: SHAMSA_REACH, disc: DISC_RADIUS, densities: DENSITIES },
)

for (const [rel, b64] of Object.entries(out.files)) {
  const f = path.join(RES, rel)
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, Buffer.from(b64, 'base64'))
}
const colors = `<?xml version="1.0" encoding="utf-8"?>
<!-- web/scripts/android-assets.mjs (reply 0066): the launcher icon's ground (icon-1024.png's own) and the welcome page's sky. -->
<resources>
    <color name="ic_launcher_background">${out.ground.toUpperCase()}</color>
    <color name="launch_welcome_sky">${LAUNCH_WELCOME_SKY.toUpperCase()}</color>
</resources>
`
fs.writeFileSync(path.join(RES, 'values/colors.xml'), colors)
console.log(`android-assets: ${Object.keys(out.files).length} images, ground ${out.ground}, launch sky ${LAUNCH_WELCOME_SKY}`)

if (PREVIEWS) {
  fs.mkdirSync(PREVIEWS, { recursive: true })
  const b64 = (rel) => 'data:image/png;base64,' + fs.readFileSync(path.join(RES, rel)).toString('base64')
  // The launcher's view of the 108 dp layers: the middle 72 dp, at 4×, in each mask.
  const shot = async (name, html, w, h) => {
    await page.setViewportSize({ width: w, height: h })
    await page.setContent(`<body style="margin:0;background:#e9e9e6">${html}</body>`)
    await page.screenshot({ path: path.join(PREVIEWS, name) })
  }
  const icon = (radius) =>
    `<div style="width:288px;height:288px;overflow:hidden;border-radius:${radius};background:${out.ground};position:relative;display:inline-block;margin:24px"><img src="${b64('mipmap-xxxhdpi/ic_launcher_foreground.png')}" style="position:absolute;left:-72px;top:-72px;width:432px;height:432px"></div>`
  await shot('icon-mask-round.png', icon('50%'), 336, 336)
  await shot('icon-mask-square.png', icon('0'), 336, 336)
  await shot('icon-mask-rounded-square.png', icon('22%'), 336, 336)
  await shot(
    'launch-screen.png',
    `<div style="width:412px;height:892px;background:${LAUNCH_WELCOME_SKY};display:grid;place-items:center"><img src="${b64('drawable-xxxhdpi/splash_icon.png')}" style="width:288px;height:288px"></div>`,
    412,
    892,
  )
  console.log(`android-assets: previews in ${PREVIEWS}`)
}
await browser.close()

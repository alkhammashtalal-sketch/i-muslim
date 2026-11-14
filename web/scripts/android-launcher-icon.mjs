// The Android launcher icon «المورّقة» (add-ons 0072-add31 §3 and 0072-add32), from Talal's approved files as they are
// (web/android/icon/, copied byte for byte from relay/w1/0072-icon-v2/, MD5 there): nothing is drawn, the painting is only scaled down, in
// headless Chrome (Playwright, as web/scripts/android-assets.mjs does). The launch screen and the status-bar icon stay
// that script's (frozen: CLAUDE.md §8, add-on 0072-add28), so this one writes the launcher icon only.
//   - The adaptive icon (developer.android.com/develop/ui/views/launch/icon_design_adaptive): 108 dp layers, of which
//     the launcher shows the middle 72 dp and every mask keeps the 66 dp circle. The whole painting is the middle 68 dp
//     of the foreground layer (whole pixels at every density), so no launcher cuts it more than its own mask: the
//     crescent's and the enlarged sun's farthest gold (measured below: 463.7 and 480.7 px from the centre of the 1024
//     painting) fall at 30.8 and 31.9 dp, inside the 33 dp radius of the safe zone. Around it is the background layer,
//     the painting's own lapis (the median of its outer 6 px ring): 2 dp of it in a square mask, and the rest of the
//     108 dp, which a launcher shows only while it moves the layers.
//   - The themed icon (Android 13+): the monochrome layer is icon-tinted.png as a mask, its lightness as the opacity,
//     in the same place as the painting.
//   - The legacy icons (mipmap-*/ic_launcher.png and _round.png, for launchers that do not read adaptive icons): the
//     visible 72 dp (the painting on its lapis) in a rounded square and a circle.
//   cd web && node scripts/android-launcher-icon.mjs [previews-dir]
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const WEB = path.resolve(import.meta.dirname, '..')
const SOURCE = path.join(WEB, 'android/icon/icon-default.png')
const TINTED = path.join(WEB, 'android/icon/icon-tinted.png')
const RES = path.join(WEB, 'android/app/src/main/res')
const PREVIEWS = process.argv[2] ? path.resolve(process.argv[2]) : null
const DENSITIES = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
/** The painting's side in the 108 dp layer, within the launcher's visible 72 dp. */
export const ICON_DP = 68
/** The crescent's and the sun's farthest gold pixel from the centre of the 1024 painting (measured; this script checks). */
export const REACH = { crescent: 463.7, sun: 480.7 }
export const SAFE_RADIUS_DP = 33

const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
const out = await page.evaluate(
  async ({ src, tinted, densities, iconDp }) => {
    const load = async (s) => {
      const img = new Image()
      img.src = s
      await img.decode()
      const c = new OffscreenCanvas(img.width, img.height)
      c.getContext('2d').drawImage(img, 0, 0)
      return c
    }
    const art = await load(src)
    const W = art.width
    const d = art.getContext('2d').getImageData(0, 0, W, W).data
    const c0 = (W - 1) / 2
    // The farthest gold (red well above blue) in the crescent's and the sun's boxes.
    const reach = (x0, y0, x1, y1) => {
      let m = 0
      for (let y = y0; y < y1; y++)
        for (let x = x0; x < x1; x++) {
          const i = (y * W + x) * 4
          if (d[i] > 110 && d[i] - d[i + 2] > 40) m = Math.max(m, Math.hypot(x - c0, y - c0))
        }
      return m
    }
    const measured = { crescent: reach(66, 560, 262, 790), sun: reach(740, 540, 1000, 800) }
    // The lapis: the median of each channel over the outer 6 px ring.
    const ch = [[], [], []]
    for (let y = 0; y < W; y++)
      for (let x = 0; x < W; x++)
        if (x < 6 || y < 6 || x >= W - 6 || y >= W - 6) for (let k = 0; k < 3; k++) ch[k].push(d[(y * W + x) * 4 + k])
    const lapis = ch.map((a) => a.sort((p, q) => p - q)[a.length >> 1])

    // The monochrome mask: white, opacity = the tinted file's lightness.
    const t = await load(tinted)
    const td = t.getContext('2d').getImageData(0, 0, W, W)
    for (let k = 0; k < td.data.length; k += 4) {
      const lum = 0.2126 * td.data[k] + 0.7152 * td.data[k + 1] + 0.0722 * td.data[k + 2]
      td.data[k] = td.data[k + 1] = td.data[k + 2] = 255
      td.data[k + 3] = Math.round(lum)
    }
    const mono = new OffscreenCanvas(W, W)
    mono.getContext('2d').putImageData(td, 0, 0)

    const png = async (canvas) => {
      const bytes = new Uint8Array(await (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer())
      let s = ''
      for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      return btoa(s)
    }
    /** A layer of `size` px with `from` drawn `side` px wide in its middle; `ground` fills it first (legacy icons). */
    const layer = (from, size, side, ground, clip) => {
      const c = new OffscreenCanvas(size, size)
      const x = c.getContext('2d')
      x.imageSmoothingEnabled = true
      x.imageSmoothingQuality = 'high'
      if (clip) {
        clip(x, size)
        x.clip()
      }
      if (ground) {
        x.fillStyle = ground
        x.fillRect(0, 0, size, size)
      }
      x.drawImage(from, (size - side) / 2, (size - side) / 2, side, side)
      return c
    }
    const rounded = (x, s) => {
      x.beginPath()
      x.roundRect(0, 0, s, s, s * 0.18)
    }
    const round = (x, s) => {
      x.beginPath()
      x.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2)
    }
    const hex = '#' + lapis.map((v) => v.toString(16).padStart(2, '0')).join('')
    const files = {}
    for (const [dpi, k] of Object.entries(densities)) {
      files[`mipmap-${dpi}/ic_launcher_foreground.png`] = await png(layer(art, Math.round(108 * k), iconDp * k))
      files[`mipmap-${dpi}/ic_launcher_monochrome.png`] = await png(layer(mono, Math.round(108 * k), iconDp * k))
      // Legacy: 48 dp, the visible 72 dp scaled to it, whole.
      files[`mipmap-${dpi}/ic_launcher.png`] = await png(layer(art, Math.round(48 * k), ((48 * iconDp) / 72) * k, hex, rounded))
      files[`mipmap-${dpi}/ic_launcher_round.png`] = await png(layer(art, Math.round(48 * k), ((48 * iconDp) / 72) * k, hex, round))
    }
    return { measured, lapis: hex, files }
  },
  { src: b64(SOURCE), tinted: b64(TINTED), densities: DENSITIES, iconDp: ICON_DP },
)

for (const [k, v] of Object.entries(out.measured)) {
  if (Math.abs(v - REACH[k]) > 0.5) throw new Error(`${k}: measured ${v.toFixed(1)} px, expected ${REACH[k]}`)
  const dp = (v / 512) * (ICON_DP / 2)
  if (dp > SAFE_RADIUS_DP) throw new Error(`${k}: ${dp.toFixed(2)} dp from the centre, outside the safe zone`)
  console.log(`${k}: ${v.toFixed(1)} px → ${dp.toFixed(2)} dp from the centre (safe zone ${SAFE_RADIUS_DP} dp)`)
}
for (const [rel, data] of Object.entries(out.files)) {
  const f = path.join(RES, rel)
  fs.mkdirSync(path.dirname(f), { recursive: true })
  fs.writeFileSync(f, Buffer.from(data, 'base64'))
}
fs.writeFileSync(
  path.join(RES, 'values/ic_launcher_lapis.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<!-- web/scripts/android-launcher-icon.mjs (add-ons 0072-add31 §3, 0072-add32): the launcher icon's background layer, the lapis of the
     painting's own edge (the median of its outer 6 px ring). -->
<resources>
    <color name="ic_launcher_lapis">${out.lapis.toUpperCase()}</color>
</resources>
`,
)
const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<!-- The adaptive launcher icon «المورّقة» (add-ons 0072-add31 §3, 0072-add32; web/scripts/android-launcher-icon.mjs): the
     whole painting in the middle 68 dp of the 108 dp foreground, its crescent and sun inside the 66 dp safe zone; the painting's own
     lapis behind it; and icon-tinted.png as the themed icon's mask (Android 13+). -->
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_lapis" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome" />
</adaptive-icon>
`
for (const f of ['ic_launcher', 'ic_launcher_round']) fs.writeFileSync(path.join(RES, `mipmap-anydpi-v26/${f}.xml`), adaptive)
console.log(`android-launcher-icon: ${Object.keys(out.files).length} images, lapis ${out.lapis}`)

if (PREVIEWS) {
  // The launcher's view at 4× (xxxhdpi): the middle 72 dp of the layers in each mask, the 108 dp layer whole with the
  // 72 dp square and the 66 dp circle drawn over it, and the themed icon in Android 13's light and dark tints.
  fs.mkdirSync(PREVIEWS, { recursive: true })
  const img = (rel) => b64(path.join(RES, rel))
  const masked = (radius, fg, ground) =>
    `<div style="width:288px;height:288px;overflow:hidden;border-radius:${radius};background:${ground};position:relative;display:inline-block;margin:16px"><img src="${img(fg)}" style="position:absolute;left:-72px;top:-72px;width:432px;height:432px"></div>`
  const masks = (fg, ground) => ['50%', '22%', '0', '38% 38% 38% 38% / 30% 30% 30% 30%'].map((r) => masked(r, fg, ground)).join('')
  const shot = async (name, html, w, h) => {
    await page.setViewportSize({ width: w, height: h })
    await page.setContent(`<body style="margin:0;background:#e9e6df">${html}</body>`)
    await page.screenshot({ path: path.join(PREVIEWS, name) })
  }
  await shot('launcher-masks.png', masks('mipmap-xxxhdpi/ic_launcher_foreground.png', out.lapis), 1280, 320)
  await shot(
    'launcher-layer-108dp.png',
    `<div style="position:relative;width:432px;height:432px;margin:16px;background:${out.lapis}"><img src="${img('mipmap-xxxhdpi/ic_launcher_foreground.png')}" style="position:absolute;inset:0;width:432px;height:432px"><div style="position:absolute;left:72px;top:72px;width:288px;height:288px;outline:2px dashed #fff"></div><div style="position:absolute;left:84px;top:84px;width:264px;height:264px;border-radius:50%;outline:2px solid #f0c040"></div></div>`,
    464,
    464,
  )
  const themed = (bg, tint) =>
    `<div style="width:288px;height:288px;overflow:hidden;border-radius:50%;background:${bg};position:relative;display:inline-block;margin:16px"><div style="position:absolute;left:-72px;top:-72px;width:432px;height:432px;background:${tint};-webkit-mask:url(${img('mipmap-xxxhdpi/ic_launcher_monochrome.png')}) center/100% 100%"></div></div>`
  await shot('launcher-themed.png', themed('#d8e2ff', '#2d4678') + themed('#2d4678', '#d8e2ff'), 640, 320)
  console.log(`previews in ${PREVIEWS}`)
}
await browser.close()

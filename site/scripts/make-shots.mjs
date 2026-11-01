// The site home page's screens from the app (add-on 0072-add61 §3): four of the App Store screenshots of 1.1 (round 3,
// 6.9-inch, 1320 × 2868, relay/w1/0072-store/screenshots/README.md), in Arabic and English, made 600 px wide WebP so the
// page stays light. Resized and encoded by the installed Google Chrome (createImageBitmap with resizeQuality «high»,
// then WebP at quality 0.86); nothing is drawn, cropped or stretched: the whole screenshot, scaled.
//   node site/scripts/make-shots.mjs <the folder 6.9in-1320x2868 that holds ar/ and en/>
// Playwright's Chrome runs, so it takes a web slot (CLAUDE.md §12, skill heavy-locks).
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const OUT = path.join(ROOT, 'site/public/assets/shots')
/** The four, in the page's order (their titles are the images' alt text in index.html and en/index.html). */
export const SHOTS = ['02-today', '05-times', '03-ramadan', '04-cards']
export const WIDTH = 600
export const HEIGHT = 1304 // 2868 × 600 / 1320, rounded

const src = process.argv[2]
if (!src || !fs.existsSync(path.join(src, 'ar'))) {
  console.error('give the folder 6.9in-1320x2868 that holds ar/ and en/')
  process.exit(2)
}
const require = createRequire(path.join(ROOT, 'web/package.json'))
const { chromium } = require('playwright')
const browser = await chromium.launch({ channel: 'chrome' })
try {
  const page = await browser.newPage()
  fs.mkdirSync(OUT, { recursive: true })
  for (const lang of ['ar', 'en'])
    for (const name of SHOTS) {
      const png = fs.readFileSync(path.join(src, lang, `${name}.png`)).toString('base64')
      const webp = await page.evaluate(
        async ({ png, w, h }) => {
          const bytes = Uint8Array.from(atob(png), (c) => c.charCodeAt(0))
          const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }), { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' })
          const c = new OffscreenCanvas(w, h)
          c.getContext('2d').drawImage(bmp, 0, 0)
          const blob = await c.convertToBlob({ type: 'image/webp', quality: 0.86 })
          const b = new Uint8Array(await blob.arrayBuffer())
          let s = ''
          for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
          return btoa(s)
        },
        { png, w: WIDTH, h: HEIGHT },
      )
      const file = path.join(OUT, `${lang === 'ar' ? '' : 'en-'}${name}.webp`)
      fs.writeFileSync(file, Buffer.from(webp, 'base64'))
      console.log(`${path.relative(ROOT, file)}  ${fs.statSync(file).size} bytes`)
    }
} finally {
  await browser.close()
}

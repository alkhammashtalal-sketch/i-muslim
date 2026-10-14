// The launch screen's image (reply 0061): the welcome page itself as it is first drawn, the painting with «مسلم» and
// Talal's two marks, without what changes with the language (the tagline, the pill, «ابدأ»). Drawn by WebKit, the
// iPhone's engine, on a preview of next (never the live link), at the painting's own size, 1320 × 2857 (the 3× of
// 440 × 952.33), so the painting's pixels stay its own; then checked in the same page: every pixel outside «مسلم» and
// the marks is the painting's (/art/welcome-B4.webp), or nothing is written.
//   node web/scripts/launch-image.mjs <https preview>   (WebKit wants https here: wr.sh dev --env next --local-protocol https)
import fs from 'node:fs'
import path from 'node:path'
import { webkit } from '@playwright/test'

const BASE = process.argv[2]
if (!BASE || /workers\.dev/.test(BASE)) throw new Error('launch-image: a preview of next, never the live link')
const OUT = path.resolve(import.meta.dirname, '../ios/App/App/Assets.xcassets/LaunchWelcomeFull.imageset/launch-welcome@3x.png')

const browser = await webkit.launch()
const ctx = await browser.newContext({ viewport: { width: 1320, height: 2857 }, deviceScaleFactor: 1, serviceWorkers: 'block', ignoreHTTPSErrors: true, bypassCSP: true })
const page = await ctx.newPage()
await page.goto(`${BASE}/?lang=ar`, { waitUntil: 'domcontentloaded' })
await page.addStyleTag({ content: '.wl-tagline, .wl-lang, .wl-start { visibility: hidden !important; }' })
await page.locator('.wl-drawn').waitFor()
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(500)
const png = await page.screenshot({ animations: 'disabled' })
// The painting's pixels, outside the boxes of «مسلم» and the marks, against the file itself: round the word half its
// size (the meem's tail goes below its line), round each mark a few pixels.
const outside = await page.evaluate(async (data) => {
  const load = (src) => new Promise((ok, no) => Object.assign(new Image(), { onload() { ok(this) }, onerror: no, src }))
  const pixels = (img) => {
    const c = Object.assign(document.createElement('canvas'), { width: 1320, height: 2857 })
    const g = c.getContext('2d')
    g.drawImage(img, 0, 0, 1320, 2857)
    return g.getImageData(0, 0, 1320, 2857).data
  }
  const a = pixels(await load(data))
  const b = pixels(await load('/art/welcome-B4.webp'))
  const boxes = [...document.querySelectorAll('.wl-name, .wl-mark')].map((el) => {
    const r = el.getBoundingClientRect()
    const m = el.matches('.wl-name') ? parseFloat(getComputedStyle(el).fontSize) / 2 : 4
    return [r.left - m, r.top - m, r.right + m, r.bottom + m]
  })
  let n = 0
  for (let y = 0; y < 2857; y++)
    for (let x = 0; x < 1320; x++) {
      if (boxes.some(([l, t, r, bt]) => x >= l && x <= r && y >= t && y <= bt)) continue
      const i = (y * 1320 + x) * 4
      if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) n++
    }
  return n
}, `data:image/png;base64,${png.toString('base64')}`)
await browser.close()
if (outside) throw new Error(`launch-image: ${outside} pixels outside «مسلم» and the marks are not the painting's`)
fs.writeFileSync(OUT, png)
console.log(`launch-image: ${OUT} (1320 × 2857), the painting's own pixels outside «مسلم» and the marks`)

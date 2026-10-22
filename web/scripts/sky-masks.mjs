// Writes the sky's two masks beside the painting (add-on 0071-add16 §2), derived once from its own pixels:
//   node web/scripts/sky-masks.mjs
//   → web/public/art/sky-lapis-mask.png and sky-gold-mask.png: 1034 × 711 (the sky box of card-date-B4.webp), the mask in
//     the alpha channel (what -webkit-mask-image reads), black elsewhere.
// The equations are in sky-mask-math.js. The painting is only read: its SHA-256 is printed before and after, and the
// script fails if it changed (CLAUDE.md §8: the approved painting is never redrawn, recompressed or cropped).
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PAINTING = path.join(WEB, 'public/art/card-date-B4.webp')
const OUT = { lapis: path.join(WEB, 'public/art/sky-lapis-mask.png'), gold: path.join(WEB, 'public/art/sky-gold-mask.png') }
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')

const before = sha(PAINTING)
console.log(`card-date-B4.webp sha256 before: ${before}`)
const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage()
await page.setContent('<!doctype html><title>sky masks</title>')
await page.addScriptTag({ path: path.join(WEB, 'scripts/sky-mask-math.js') })
const pngs = await page.evaluate(async (b64) => {
  const img = new Image()
  img.src = `data:image/webp;base64,${b64}`
  await img.decode()
  const c = document.createElement('canvas')
  c.width = img.naturalWidth
  c.height = img.naturalHeight
  const g = c.getContext('2d', { colorSpace: 'srgb' })
  g.drawImage(img, 0, 0)
  const px = g.getImageData(0, 0, c.width, c.height).data
  const m = window.skyMaskMath.skyMasks(px, c.width)
  const { w, h } = m.SKY
  const write = (mask) => {
    const o = document.createElement('canvas')
    o.width = w
    o.height = h
    const og = o.getContext('2d')
    const d = og.createImageData(w, h)
    for (let j = 0; j < w * h; j++) d.data[4 * j + 3] = Math.round(255 * mask[j])
    og.putImageData(d, 0, 0)
    return o.toDataURL('image/png').split(',')[1]
  }
  return { size: [c.width, c.height], lapis: write(m.lapis), gold: write(m.gold) }
}, fs.readFileSync(PAINTING).toString('base64'))
await browser.close()
if (pngs.size[0] !== 1200 || pngs.size[1] !== 865) throw new Error(`the painting is ${pngs.size.join(' × ')}, not 1200 × 865`)
for (const k of ['lapis', 'gold']) {
  fs.writeFileSync(OUT[k], Buffer.from(pngs[k], 'base64'))
  console.log(`${path.relative(WEB, OUT[k])}: ${fs.statSync(OUT[k]).size} bytes, sha256 ${sha(OUT[k])}`)
}
const after = sha(PAINTING)
console.log(`card-date-B4.webp sha256 after:  ${after}`)
if (after !== before) throw new Error('the painting changed')

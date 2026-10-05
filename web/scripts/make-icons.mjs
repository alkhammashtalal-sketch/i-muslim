// App icons (command 14): the welcome shamsa of design/illumination/Main.dc.html on paper #F5EDD9, with «مسلم»
// in its centre in Amiri Bold (the self-hosted @fontsource file). No letter i. The shamsa is read from the model
// itself, so the icons follow it. Needs Google Chrome.
//   cd web && node scripts/make-icons.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const model = fs.readFileSync(path.join(WEB, '../design/illumination/Main.dc.html'), 'utf8')
const cut = (start) => model.slice(start, model.indexOf('</svg>', start) + 6)
const defs = cut(model.indexOf('<svg width="0" height="0"'))
const shamsa = cut(model.indexOf('<svg width="236" height="267" viewBox="0 0 300 340"'))
const amiriBold = path.join(WEB, 'node_modules/@fontsource/amiri/files/amiri-arabic-700-normal.woff2')

// size: the square; scale: the shamsa's height as a share of it (maskable: inside the 80% safe circle).
const ICONS = [
  { file: 'icon-1024.png', size: 1024, scale: 0.94 },
  { file: 'icon-512.png', size: 512, scale: 0.94 },
  { file: 'icon-192.png', size: 192, scale: 0.94 },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.9 },
  { file: 'icon-maskable-512.png', size: 512, scale: 0.8 },
]

const page = (size, scale) => {
  const h = size * scale
  const w = (h * 300) / 340
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
@font-face { font-family: 'Amiri Wordmark'; font-weight: 700; src: url('file://${amiriBold}') format('woff2'); }
html, body { margin: 0; }
.c { width: ${size}px; height: ${size}px; background: #F5EDD9; display: flex; align-items: center; justify-content: center; }
.s { position: relative; width: ${w}px; height: ${h}px; }
.s > svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.t { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
     font: 700 ${(w * 50) / 236}px/1.3 'Amiri Wordmark'; color: #1E3A6B; margin-top: ${-(w * 10) / 236}px; }
</style></head><body>${defs}<div class="c"><div class="s">${shamsa}<div class="t">مسلم</div></div></div></body></html>`
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const tab = await browser.newPage()
const tmp = path.join(WEB, 'node_modules/.cache-make-icons.html')
for (const { file, size, scale } of ICONS) {
  fs.writeFileSync(tmp, page(size, scale))
  await tab.setViewportSize({ width: size, height: size })
  await tab.goto(`file://${tmp}`)
  await tab.evaluate(() => document.fonts.ready)
  if (!(await tab.evaluate(() => document.fonts.check("700 20px 'Amiri Wordmark'", 'مسلم')))) throw new Error('Amiri Bold did not load')
  await tab.screenshot({ path: path.join(WEB, 'public/icons', file), clip: { x: 0, y: 0, width: size, height: size } })
  console.log(`${file} ${size}×${size}`)
}
fs.rmSync(tmp)
await browser.close()

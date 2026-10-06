// App icons (command 14; redrawn on reply 0016): the welcome shamsa of design/illumination/Main.dc.html on a lazward
// ground #1E3A6B, its rays gold, with «مسلم» in its centre in Amiri Bold (the self-hosted @fontsource file). No
// letter i, no shadow, no gloss. The shamsa is read from the model itself, so the icons follow it. Needs Chrome.
//   cd web && node scripts/make-icons.mjs            variant B: the centre cream, «مسلم» lazward (default)
//   cd web && ICON_VARIANT=A node scripts/make-icons.mjs   variant A: the centre lazward, «مسلم» cream
// The large icons show the whole shamsa (86% of the width); 192 and the Apple icon a closer view (the centre and the
// word fill about two thirds), so the word reads at 48 px on a home screen; the maskable one keeps the shamsa inside
// the 80% safe circle. The Apple icon is square: iOS rounds it itself.
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
const LAP = '#1E3A6B'
const PAPER = '#F5EDD9'
const GOLD = '#C9A24A'
const VARIANT = process.env.ICON_VARIANT === 'A' ? 'A' : 'B'
// Rays drawn lazward on paper would vanish on the lazward ground: gold. Variant A also turns the cream centre lazward.
const goldRays = shamsa.replace(/(<line [^>]*stroke=")#1E3A6B(")/g, `$1${GOLD}$2`)
const art = VARIANT === 'A' ? goldRays.replace('<circle r="73" fill="#FBF7EC"', `<circle r="73" fill="${LAP}"`) : goldRays
const word = VARIANT === 'A' ? PAPER : LAP

// size: the square; width: the shamsa's width as a share of it (over 1: a closer view, the edges cut by the square).
const ICONS = [
  { file: 'icon-1024.png', size: 1024, width: 0.86 },
  { file: 'icon-512.png', size: 512, width: 0.86 },
  { file: 'icon-192.png', size: 192, width: 1.3 },
  { file: 'apple-touch-icon.png', size: 180, width: 1.3 },
  { file: 'icon-maskable-512.png', size: 512, width: 0.68 },
]

const page = (size, width) => {
  const w = size * width
  const h = (w * 340) / 300
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
@font-face { font-family: 'Amiri Wordmark'; font-weight: 700; src: url('file://${amiriBold}') format('woff2'); }
html, body { margin: 0; }
.c { width: ${size}px; height: ${size}px; background: ${LAP}; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.s { position: relative; width: ${w}px; height: ${h}px; flex: none; }
.s > svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.t { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
     font: 700 ${(w * 50) / 236}px/1.3 'Amiri Wordmark'; color: ${word}; margin-top: ${-(w * 10) / 236}px; }
</style></head><body>${defs}<div class="c"><div class="s">${art}<div class="t">مسلم</div></div></div></body></html>`
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const tab = await browser.newPage()
const tmp = path.join(WEB, 'node_modules/.cache-make-icons.html')
for (const { file, size, width } of ICONS) {
  fs.writeFileSync(tmp, page(size, width))
  await tab.setViewportSize({ width: size, height: size })
  await tab.goto(`file://${tmp}`)
  await tab.evaluate(() => document.fonts.ready)
  if (!(await tab.evaluate(() => document.fonts.check("700 20px 'Amiri Wordmark'", 'مسلم')))) throw new Error('Amiri Bold did not load')
  await tab.screenshot({ path: path.join(WEB, 'public/icons', file), clip: { x: 0, y: 0, width: size, height: size } })
  console.log(`${file} ${size}×${size} (variant ${VARIANT})`)
}
fs.rmSync(tmp)
await browser.close()

// The welcome shamsa as static SVG (command 14): taken from design/illumination/Main.dc.html with only the definitions
// it uses (the edge and gilt filters, flower and leaf), so its filters run once when the image is decoded instead of in
// every frame. Two files: light, and dark (white flowers #EDE6D6, the centre disc in the card colour, the dotted ring
// in light azure). The wordmark and the line under it are text on top (Ornaments.tsx), never part of the image.
//   cd web && node scripts/make-ornaments.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const model = fs.readFileSync(path.join(WEB, '../design/illumination/Main.dc.html'), 'utf8')
const defs = model.slice(model.indexOf('<defs>'), model.indexOf('</defs>') + 7)
const pick = (re) => {
  const m = defs.match(re)
  if (!m) throw new Error(`definition not found: ${re}`)
  return m[0]
}
const used = [
  pick(/<filter id="edge"[\s\S]*?<\/filter>/),
  pick(/<filter id="gilt"[\s\S]*?<\/filter>/),
  pick(/<g id="hf">[\s\S]*?<\/g>/),
  pick(/<path id="lf"[^>]*><\/path>/),
].join('')
const start = model.indexOf('<svg width="236" height="267" viewBox="0 0 300 340"')
const shamsa = model.slice(start, model.indexOf('</svg>', start) + 6)
const inner = shamsa.slice(shamsa.indexOf('>') + 1, -'</svg>'.length)
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 340" width="300" height="340"><defs>${used}</defs>${body}</svg>\n`

const light = svg(inner)
const dark = svg(
  inner
    .replace('<circle r="73" fill="#FBF7EC"', '<circle r="73" fill="#1C222B"')
    .replace(/(<circle r="64\.6" fill="none" stroke=)"#1E3A6B"/, '$1"#8FB0D9"'),
)
  .replace(/fill="#FBF7EC"/g, 'fill="#EDE6D6"')

if (!dark.includes('r="73" fill="#1C222B"') || !dark.includes('stroke="#8FB0D9"')) throw new Error('dark mapping did not apply')
const out = path.join(WEB, 'src/assets')
fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'shamsa-light.svg'), light)
fs.writeFileSync(path.join(out, 'shamsa-dark.svg'), dark)
console.log(`shamsa-light.svg ${light.length} B, shamsa-dark.svg ${dark.length} B`)

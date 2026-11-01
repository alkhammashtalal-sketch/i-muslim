// The site home page's QR code (add-on 0072-add61 §3), written once as a static SVG file, no script on the page:
//   node site/scripts/make-qr.mjs            (after `npm ci` in web/, where lean-qr 2.7.4 is installed)
// It points where every QR code of the app points today (web/src/v2/reading/store-mark.ts: QR_TARGET is null, so the
// App Store link): the site's stable link /get needs a domain of our own first, since nothing shared carries
// workers.dev (docs/ROADMAP.md, «After iOS and Android are sent»). When that domain exists, QR_URL becomes
// https://<domain>/get here and in store-mark.ts together, and this script is run again.
// worker/test/site.test.ts runs qrSvg() again and checks the file is byte-identical, so the file and the URL agree.
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const QR_URL = 'https://apps.apple.com/app/id6822315551'
export const QR_FILE = 'assets/qr-app-store.svg'

/** The code as SVG: dark modules on a white square with the standard quiet zone of four modules, one path, crisp edges. */
export function qrSvg(url = QR_URL) {
  const require = createRequire(path.join(ROOT, 'web/package.json'))
  const { generate, correction } = require('lean-qr')
  const code = generate(url, { minCorrectionLevel: correction.M })
  const q = 4
  const side = code.size + 2 * q
  let d = ''
  for (let y = 0; y < code.size; y++)
    for (let x = 0; x < code.size; x++) if (code.get(x, y)) d += `M${x + q} ${y + q}h1v1h-1z`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges">` +
    `<rect width="${side}" height="${side}" fill="#ffffff"/>` +
    `<path fill="#0f1f45" d="${d}"/>` +
    `</svg>\n`
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = path.join(ROOT, 'site/public', QR_FILE)
  fs.writeFileSync(out, qrSvg())
  console.log(`${QR_FILE}  ${fs.statSync(out).size} bytes  → ${QR_URL}`)
}

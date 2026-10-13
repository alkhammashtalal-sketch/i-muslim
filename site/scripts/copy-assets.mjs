// The site's binary files, copied unchanged from the app (reply 0033 §ج): the interface font, which also sets the name
// beside the icon (reply 0037 §4.3: no Amiri on the site), from the @fontsource package the app already self-hosts
// (SIL OFL 1.1, its licence text beside it), and the app icon from web/public/icons. Nothing is drawn, re-encoded or resized (add-on 15). Run after `npm ci` in web/:
//   node site/scripts/copy-assets.mjs
// worker/test/site.test.ts checks that every copy is byte-identical to its source.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const FS = path.join(ROOT, 'web/node_modules/@fontsource')
const OUT = path.join(ROOT, 'site/public')

/** [source relative to the repository, destination relative to site/public] */
export const COPIES = [
  ...['400', '600', '700'].flatMap((w) =>
    ['arabic', 'latin'].map((sub) => [
      `web/node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-${sub}-${w}-normal.woff2`,
      `fonts/ibm-plex-sans-arabic-${sub}-${w}-normal.woff2`,
    ]),
  ),
  ['web/node_modules/@fontsource/ibm-plex-sans-arabic/LICENSE', 'fonts/LICENSE-ibm-plex-sans-arabic.txt'],
  ['web/public/icons/icon-192.png', 'assets/icon-192.png'],
  ['web/public/icons/apple-touch-icon.png', 'assets/apple-touch-icon.png'],
]

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!fs.existsSync(FS)) {
    console.error('web/node_modules/@fontsource is missing: run `npm ci` in web/ first.')
    process.exit(1)
  }
  for (const [from, to] of COPIES) {
    const dest = path.join(OUT, to)
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.copyFileSync(path.join(ROOT, from), dest)
    console.log(`${to}  ${fs.statSync(dest).size} bytes`)
  }
}

// Run by e2e/reader-c-hafs.spec.ts in a process of its own (the test runner gives every browser its Chrome channel):
//   node e2e/helpers/webkit-fallback.mjs <font.ttf> <quran.jsonl|uthmani.json> [field]
// Prints, as JSON, the ids of the ayat that WebKit, the iPhone's engine, cannot draw wholly in the font: each ayah is
// measured with two very different faces behind the font, and any glyph not in the font changes the width.
import fs from 'node:fs'
import path from 'node:path'
import { webkit } from 'playwright'

const [font, data] = process.argv.slice(2)
const amiri = path.resolve(import.meta.dirname, '../../node_modules/@fontsource/amiri/files/amiri-arabic-400-normal.woff2')
const raw = fs.readFileSync(data, 'utf8')
/** [id, text] of every ayah: quran.jsonl lines, or a mushaf file of the Uthmanic layer (words joined by spaces). */
const ayat = data.endsWith('.jsonl')
  ? raw.trim().split('\n').map((l) => JSON.parse(l)).filter((r) => r.kind === 'ayah').map((r) => [r.id, r.text])
  : JSON.parse(raw).suras.flatMap((s) => s.ayat.map((a) => [`${s.sura}:${a.aya}`, a.words.join(' ')]))
const b64 = (f) => fs.readFileSync(f).toString('base64')
const browser = await webkit.launch()
try {
  const page = await browser.newPage()
  await page.setContent(`<!doctype html><meta charset=utf-8><style>@font-face{font-family:H;src:url(data:font/ttf;base64,${b64(font)})}@font-face{font-family:A;src:url(data:font/woff2;base64,${b64(amiri)})}</style>`)
  await page.evaluate(async () => {
    await document.fonts.load('30px H')
    await document.fonts.load('30px A')
  })
  const bad = await page.evaluate((list) => {
    const c = document.createElement('canvas').getContext('2d')
    const w = (f, t) => ((c.font = f), c.measureText(t).width)
    return list.filter(([, t]) => Math.abs(w('30px H, A', t) - w('30px H, "Courier New"', t)) > 0.01 || Math.abs(w('30px H, A', t) - w('30px H', t)) > 0.01).map(([id]) => id)
  }, ayat)
  console.log(JSON.stringify({ ayat: ayat.length, fallback: bad }))
} finally {
  await browser.close()
}

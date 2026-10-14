// Reply 0056 أ: the size of each sura's recording for each reciter, read once from mp3quran.net's own servers (a HEAD
// request per file, two a second, nothing downloaded), so the app can show a sura's size and a whole Mushaf's before
// a download starts. Writes web/src/config/recitation-sizes.json: { "<read>": [bytes of sura 1, …, sura 114] }.
//   node scripts/ingest/recitation-sizes.mjs
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/config/recitation.json'), 'utf8'))
const OUT = path.join(ROOT, 'web/src/config/recitation-sizes.json')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const out = {}
for (const r of config.reciters) {
  const sizes = []
  for (let s = 1; s <= 114; s++) {
    const url = `${r.server}${String(s).padStart(3, '0')}.mp3`
    let size = 0
    for (let attempt = 0; attempt < 3 && !size; attempt++) {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow' }).catch(() => null)
      size = Number(res?.ok ? res.headers.get('content-length') : 0) || 0
      if (!size) await sleep(2000)
    }
    if (!size) throw new Error(`no size for ${url}`)
    sizes.push(size)
    await sleep(500)
  }
  out[r.read] = sizes
  console.log(r.read, (sizes.reduce((a, b) => a + b, 0) / 1e6).toFixed(0), 'MB')
}
fs.writeFileSync(OUT, `${JSON.stringify(out)}\n`)
console.log('wrote', path.relative(ROOT, OUT))

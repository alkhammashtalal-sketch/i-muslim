// Reply 0056 أ: the size of each sura's recording for each reciter, read once from mp3quran.net's own servers (a HEAD
// request per file, two a second, nothing downloaded), so the app can show a sura's size, a range's and a whole Mushaf's
// before a download starts. Writes web/src/config/recitation-sizes.json: { "<read>": [bytes of sura 1, …, sura 114] }.
//   node scripts/ingest/recitation-sizes.mjs               the reciters of web/src/config/recitation.json
//   node scripts/ingest/recitation-sizes.mjs --candidates  first reads the sizes of every Hafs read of 114 suras in
//                                                          data/raw/recitation/reads.json (add-on 0072-add60 §6: while
//                                                          their timings are checked), then writes as above
// Each reciter's sizes are kept in data/raw/recitation/sizes-<read>.json (outside git), so a run resumes, and a reciter
// whose sizes are in web/src/config/recitation-sizes.json already keeps them as they are.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const RAW = path.join(ROOT, 'data/raw/recitation')
const OUT = path.join(ROOT, 'web/src/config/recitation-sizes.json')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const before = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {}

/** The 114 sizes of one recording, from its raw cache or by HEAD requests. */
async function sizesOf(read, server) {
  if (before[read]?.length === 114) return before[read]
  const cache = path.join(RAW, `sizes-${read}.json`)
  if (fs.existsSync(cache)) {
    const c = JSON.parse(fs.readFileSync(cache, 'utf8'))
    if (c.server === server && c.sizes.length === 114) return c.sizes
  }
  const sizes = []
  for (let s = 1; s <= 114; s++) {
    const url = `${server}${String(s).padStart(3, '0')}.mp3`
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
  fs.writeFileSync(cache, JSON.stringify({ read, server, fetched: new Date().toISOString(), sizes }))
  console.log(read, (sizes.reduce((a, b) => a + b, 0) / 1e6).toFixed(0), 'MB')
  return sizes
}

if (process.argv.includes('--candidates')) {
  const reads = JSON.parse(fs.readFileSync(path.join(RAW, 'reads.json'), 'utf8'))
  const moshafs = JSON.parse(fs.readFileSync(path.join(RAW, 'reciters-ar.json'), 'utf8')).reciters.flatMap((x) => x.moshaf ?? [])
  for (const r of reads.filter((x) => /حفص/.test(x.rewaya) && Number(x.soar_count) === 114)) {
    const m = moshafs.find((x) => x.id === r.id)
    if (!m) continue
    await sizesOf(r.id, m.server.endsWith('/') ? m.server : `${m.server}/`).catch((e) => console.log(r.id, String(e)))
  }
}

const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/config/recitation.json'), 'utf8'))
const out = {}
for (const r of config.reciters) out[r.read] = await sizesOf(r.read, r.server)
fs.writeFileSync(OUT, `${JSON.stringify(out)}\n`)
console.log('wrote', path.relative(ROOT, OUT), Object.keys(out).length, 'reciters')

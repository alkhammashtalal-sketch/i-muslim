// «المختصر في تفسير القرآن الكريم» (Tafsir Center for Quranic Studies) from QuranEnc, under the site's published
// terms (reply 0031-add14 §3; docs/permissions/quranenc-terms.md). The *_mokhtasar keys are not in
// /api/v1/translations/list: they are read from the site's index page (https://quranenc.com/ar/home, browse links);
// each key's version and date from its own page (/ar/browse/{key}: «DD/MM/YYYY - Vx.y.z»), checked with one ayah
// (/api/v1/translation/aya/{key}/1/1), then the 114 suras (/api/v1/translation/sura/{key}/{s}); one request a second.
// Raw responses in data/raw/quranenc-mokhtasar/{key}/ (outside git) with MANIFEST.json (versions, sha256). Any 429
// stops. Resumable.
//   node scripts/ingest/quranenc-mokhtasar-fetch.mjs
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const RAW = path.join(ROOT, 'data/raw/quranenc-mokhtasar')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let last = 0
async function get(url) {
  const wait = last + 1000 - Date.now()
  if (wait > 0) await sleep(wait)
  last = Date.now()
  const r = await fetch(url, { headers: { 'user-agent': 'Muslim-app/1.0 (+https://github.com/alkhammashtalal-sketch/i-muslim)' } })
  if (r.status === 429) throw new Error(`429 at ${url}: stopped`)
  if (!r.ok) throw new Error(`${r.status} at ${url}`)
  return r.text()
}

fs.mkdirSync(RAW, { recursive: true })
const home = await get('https://quranenc.com/ar/home')
fs.writeFileSync(path.join(RAW, 'home-ar.html'), home)
const keys = [...new Set([...home.matchAll(/browse\/([a-z_]+_mokhtasar)"/g)].map((m) => m[1]))]
console.log(`${keys.length} keys: ${keys.join(' ')}`)
const manifest = { fetched_at: new Date().toISOString(), terms: 'docs/permissions/quranenc-terms.md', keys: {}, files: {} }
for (const key of keys) {
  const page = await get(`https://quranenc.com/ar/browse/${key}`)
  fs.mkdirSync(path.join(RAW, key), { recursive: true })
  fs.writeFileSync(path.join(RAW, key, 'browse-ar.html'), page)
  const stamp = page.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*V(\d+\.\d+\.\d+)/)
  const title = (page.match(/<title>([^<]*)<\/title>/) ?? [])[1]?.trim() ?? null
  const one = JSON.parse(await get(`https://quranenc.com/api/v1/translation/aya/${key}/1/1`))
  if (!one.result?.translation) throw new Error(`${key}: no text for 1:1 (stop: no substitute)`)
  manifest.keys[key] = { version: stamp?.[2] ?? null, date: stamp?.[1] ?? null, title, check_1_1: one.result.translation.slice(0, 80) }
  for (let s = 1; s <= 114; s++) {
    const f = path.join(RAW, key, `${s}.json`)
    let body = null
    if (fs.existsSync(f)) {
      try {
        JSON.parse(fs.readFileSync(f, 'utf8'))
        body = fs.readFileSync(f, 'utf8')
      } catch {}
    }
    if (!body) {
      body = await get(`https://quranenc.com/api/v1/translation/sura/${key}/${s}`)
      JSON.parse(body)
      fs.writeFileSync(f, body)
    }
    manifest.files[`${key}/${s}.json`] = crypto.createHash('sha256').update(body).digest('hex')
  }
  console.log(`${key} v${manifest.keys[key].version} (${manifest.keys[key].date}): 114 suras`)
  fs.writeFileSync(path.join(RAW, 'MANIFEST.json'), JSON.stringify(manifest, null, 1))
}
console.log('done')

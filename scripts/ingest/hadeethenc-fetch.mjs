// Fetch the Encyclopedia of Translated Prophetic Hadiths (hadeethenc.com, source B since reply 0031-add4) through its
// official API (https://hadeethenc.com/api-docs/), every hadith in every category, for the app's ten languages.
// No AI. At most one request a second. Resumable: a hadith whose file exists is not asked again.
//
//   node scripts/ingest/hadeethenc-fetch.mjs [--langs ar,en] [--skip-excel]
//
// Writes, outside git (data/raw/):
//   data/raw/hadeethenc/{lang}/{id}.json         each /hadeeths/one/ response exactly as received
//   data/raw/hadeethenc/{lang}/_lists/*.json     the /categories/roots/ and /hadeeths/list/ pages as received
//   data/raw/hadeethenc/excel/{lang}.xlsx        the official Excel file of each language (its header carries the
//                                                version number, a condition of their terms)
//   data/raw/hadeethenc/MANIFEST.json            sha256 and size of every file, the versions, and the dates
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const OUT = path.join(ROOT, 'data/raw/hadeethenc')
const API = 'https://hadeethenc.com/api/v1'
const args = process.argv.slice(2)
const opt = (k) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : undefined)
const LANGS = (opt('langs') ?? 'ar,en,ur,id,ms,tr,fr,es,bn,hi').split(',')
const GAP_MS = 1100
const MANIFEST = path.join(OUT, 'MANIFEST.json')
fs.mkdirSync(OUT, { recursive: true })
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { source: 'https://hadeethenc.com', api: API, files: {}, versions: {} }
const saveManifest = () => fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1))
const sha = (buf) => createHash('sha256').update(buf).digest('hex')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let last = 0
let requests = 0
async function get(url) {
  for (let attempt = 1; ; attempt++) {
    const wait = GAP_MS - (Date.now() - last)
    if (wait > 0) await sleep(wait)
    last = Date.now()
    requests++
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'muslim-app ingest (one request a second)' }, signal: AbortSignal.timeout(60_000) })
      const buf = Buffer.from(await res.arrayBuffer())
      if (res.ok) return buf
      if (res.status === 404) return null
      if (res.status === 429) throw Object.assign(new Error(`HTTP 429 at ${url}`), { fatal: true })
      throw new Error(`HTTP ${res.status} at ${url}`)
    } catch (e) {
      if (e.fatal || attempt >= 4) throw e
      console.warn(`  retry ${attempt} in ${5 * attempt}s: ${e.message}`)
      await sleep(5000 * attempt)
    }
  }
}
function keep(rel, buf) {
  const file = path.join(OUT, rel)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, buf)
  manifest.files[rel] = { sha256: sha(buf), bytes: buf.length, fetched_at: new Date().toISOString() }
}

// 1. The version of each language, from the header of its official Excel file.
if (!args.includes('--skip-excel')) {
  for (const lang of LANGS) {
    if (manifest.versions[lang]) continue
    const rel = `excel/${lang}.xlsx`
    const buf = await get(`https://hadeethenc.com/browse/download/${lang}`)
    if (!buf) {
      manifest.versions[lang] = { error: 'no Excel file (404)' }
      continue
    }
    keep(rel, buf)
    const strings = execFileSync('unzip', ['-p', path.join(OUT, rel), 'xl/sharedStrings.xml'], { maxBuffer: 1 << 30 }).toString('utf8')
    const header = (strings.match(/<t[^>]*>([^<]*)<\/t>/) ?? [])[1] ?? ''
    const m = header.match(/Last update:\s*([0-9-]+ [0-9:]+)\s*\((v[0-9.]+)\)/)
    manifest.versions[lang] = m ? { version: m[2], last_update: m[1], header } : { error: 'no version in the header', header }
    saveManifest()
    console.log(`${lang}: ${manifest.versions[lang].version ?? manifest.versions[lang].error}`)
  }
}

// 2. The ids of each language: every root category (a root's list includes its subcategories), every page.
for (const lang of LANGS) {
  const ids = new Set()
  const rootsBuf = await get(`${API}/categories/roots/?language=${lang}`)
  keep(`${lang}/_lists/roots.json`, rootsBuf)
  for (const root of JSON.parse(rootsBuf.toString('utf8'))) {
    for (let page = 1; ; page++) {
      const buf = await get(`${API}/hadeeths/list/?language=${lang}&category_id=${root.id}&page=${page}&per_page=100`)
      keep(`${lang}/_lists/category-${root.id}-page-${page}.json`, buf)
      const j = JSON.parse(buf.toString('utf8'))
      for (const h of j.data ?? []) ids.add(String(h.id))
      if (page >= Number(j.meta?.last_page ?? 1)) break
    }
  }
  saveManifest()
  console.log(`${lang}: ${ids.size} hadiths listed`)

  // 3. Each hadith, as received.
  let n = 0
  for (const id of ids) {
    const rel = `${lang}/${id}.json`
    if (fs.existsSync(path.join(OUT, rel))) continue
    const buf = await get(`${API}/hadeeths/one/?language=${lang}&id=${id}`)
    if (!buf) {
      manifest.files[rel] = { missing: true, fetched_at: new Date().toISOString() }
      continue
    }
    keep(rel, buf)
    if (++n % 100 === 0) {
      saveManifest()
      console.log(`${lang}: ${n} fetched (${requests} requests)`)
    }
  }
  manifest.languages ??= {}
  manifest.languages[lang] = { listed: ids.size, completed_at: new Date().toISOString() }
  saveManifest()
  console.log(`${lang}: done, ${ids.size} hadiths`)
}
console.log(`requests: ${requests}`)

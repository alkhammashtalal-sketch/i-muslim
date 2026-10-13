// Fetch the Encyclopedia of Translated Prophetic Hadiths (hadeethenc.com, source B since reply 0031-add4) through its
// official API (https://hadeethenc.com/api-docs/), every hadith in every category, for the app's ten languages and,
// since reply 0033-add2 §2, the 21 other content languages (scripts/ingest/lib/hadeethenc-langs.mjs).
// No AI. At most one request a second. Resumable: a hadith whose file exists is not asked again.
//
//   node scripts/ingest/hadeethenc-fetch.mjs [--langs ar,en] [--skip-excel]
//
// Writes, outside git (data/raw/):
//   data/raw/hadeethenc/languages.json           the /languages response as received (each run)
//   data/raw/hadeethenc/{lang}/{id}.json         each /hadeeths/one/ response exactly as received
//   data/raw/hadeethenc/{lang}/_lists/*.json     the /categories/roots/ and /hadeeths/list/ pages as received
//   data/raw/hadeethenc/excel/{lang}.xlsx        the official Excel file of each language (its header carries the
//                                                version number, a condition of their terms)
//   data/raw/hadeethenc/MANIFEST.json            sha256 and size of every file, the versions, and the dates
//
// A language the API does not list, or whose responses are not what the API gave the ten (not JSON, a list without
// `data` or `meta.last_page`, a hadith without one of the fields every earlier response carried, another id than the
// one asked), or that fails after four tries, is stopped there (reply 0033-add2 §2): what happened is written to
// MANIFEST.json under `languages.{lang}.error`, an unexpected hadith response itself to {lang}/_unexpected/{id}.json,
// and the run goes on with the next language. HTTP 429 stops the whole run. No other source is looked for.
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { HADEETHENC_LANGS } from './lib/hadeethenc-langs.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')
const OUT = path.join(ROOT, 'data/raw/hadeethenc')
const API = 'https://hadeethenc.com/api/v1'
const args = process.argv.slice(2)
const opt = (k) => (args.includes(`--${k}`) ? args[args.indexOf(`--${k}`) + 1] : undefined)
const LANGS = (opt('langs') ?? HADEETHENC_LANGS.join(',')).split(',')
const GAP_MS = 1100
const MANIFEST = path.join(OUT, 'MANIFEST.json')
// The fields every /hadeeths/one/ response carried in the ten languages (12 October 2026); hadeeth_intro and
// hadeeth_intro_ar come with some hadiths only.
const FIELDS_AR = ['id', 'title', 'hadeeth', 'attribution', 'grade', 'explanation', 'hints', 'categories', 'translations', 'words_meanings', 'reference']
const FIELDS = ['id', 'title', 'hadeeth', 'attribution', 'grade', 'explanation', 'hints', 'categories', 'translations', 'hadeeth_ar', 'explanation_ar', 'hints_ar', 'words_meanings_ar', 'attribution_ar', 'grade_ar']
fs.mkdirSync(OUT, { recursive: true })
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : { source: 'https://hadeethenc.com', api: API, files: {}, versions: {} }
manifest.languages ??= {}
const saveManifest = () => fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1))
const sha = (buf) => createHash('sha256').update(buf).digest('hex')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
class Unexpected extends Error {}

let last = 0
let requests = 0
const langRequests = {}
let current = null
async function get(url) {
  for (let attempt = 1; ; attempt++) {
    const wait = GAP_MS - (Date.now() - last)
    if (wait > 0) await sleep(wait)
    last = Date.now()
    requests++
    if (current) langRequests[current] = (langRequests[current] ?? 0) + 1
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
const json = (buf, what) => {
  try {
    return JSON.parse(buf.toString('utf8'))
  } catch {
    throw new Unexpected(`${what}: not JSON (${buf.length} bytes, begins ${JSON.stringify(buf.toString('utf8').slice(0, 80))})`)
  }
}
/** Records a stopped language and goes on; a 429 stops the run. */
function stopped(lang, e, step) {
  manifest.languages[lang] = { error: `${step}: ${e.message}`, failed_at: new Date().toISOString(), requests_this_run: langRequests[lang] ?? 0, ...(e.fatal ? { stopped_the_run: true } : {}) }
  saveManifest()
  console.error(`${lang}: STOPPED at ${step}: ${e.message}`)
  if (e.fatal) throw e
}

// 0. The languages the API serves today, as received; a language not in it is not asked for.
const failed = new Set()
{
  const buf = await get(`${API}/languages`)
  if (!buf) throw new Error('languages: HTTP 404')
  keep('languages.json', buf)
  const list = json(buf, 'languages')
  const codes = new Set((Array.isArray(list) ? list : []).map((l) => l?.code))
  for (const lang of LANGS)
    if (!codes.has(lang)) {
      failed.add(lang)
      stopped(lang, new Unexpected(`not in ${API}/languages`), 'languages')
    }
  saveManifest()
}

// 1. The version of each language, from the header of its official Excel file.
if (!args.includes('--skip-excel')) {
  for (const lang of LANGS) {
    if (manifest.versions[lang] || failed.has(lang)) continue
    current = lang
    const rel = `excel/${lang}.xlsx`
    try {
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
    } catch (e) {
      if (e.fatal) stopped(lang, e, 'excel')
      manifest.versions[lang] = { error: `the Excel file: ${e.message.split('\n')[0]}` }
    }
    saveManifest()
    console.log(`${lang}: ${manifest.versions[lang].version ?? manifest.versions[lang].error}`)
  }
}

// 2. The ids of each language: every root category (a root's list includes its subcategories), every page.
async function fetchLang(lang) {
  const ids = new Set()
  const rootsBuf = await get(`${API}/categories/roots/?language=${lang}`)
  if (!rootsBuf) throw new Unexpected('categories/roots: HTTP 404')
  keep(`${lang}/_lists/roots.json`, rootsBuf)
  const roots = json(rootsBuf, 'categories/roots')
  if (!Array.isArray(roots) || !roots.length || roots.some((r) => r?.id == null))
    throw new Unexpected(`categories/roots: not a list of categories with ids (${JSON.stringify(roots).slice(0, 120)})`)
  for (const root of roots) {
    for (let page = 1; ; page++) {
      const what = `hadeeths/list category ${root.id} page ${page}`
      const buf = await get(`${API}/hadeeths/list/?language=${lang}&category_id=${root.id}&page=${page}&per_page=100`)
      if (!buf) throw new Unexpected(`${what}: HTTP 404`)
      keep(`${lang}/_lists/category-${root.id}-page-${page}.json`, buf)
      const j = json(buf, what)
      if (!Array.isArray(j?.data) || j?.meta?.last_page == null) throw new Unexpected(`${what}: no data list or no meta.last_page (${JSON.stringify(j).slice(0, 120)})`)
      for (const h of j.data) ids.add(String(h.id))
      if (page >= Number(j.meta.last_page)) break
    }
  }
  saveManifest()
  console.log(`${lang}: ${ids.size} hadiths listed`)

  // 3. Each hadith, as received.
  let n = 0
  let missing = 0
  for (const id of ids) {
    const rel = `${lang}/${id}.json`
    if (fs.existsSync(path.join(OUT, rel))) continue
    const buf = await get(`${API}/hadeeths/one/?language=${lang}&id=${id}`)
    if (!buf) {
      manifest.files[rel] = { missing: true, fetched_at: new Date().toISOString() }
      missing++
      continue
    }
    let why = null
    try {
      const r = json(buf, `hadeeths/one ${id}`)
      const lacks = (lang === 'ar' ? FIELDS_AR : FIELDS).filter((k) => !(k in (r ?? {})))
      if (lacks.length) why = `hadeeths/one ${id}: without ${lacks.join(', ')}`
      else if (String(r.id) !== id) why = `hadeeths/one ${id}: the response is hadith ${r.id}`
    } catch (e) {
      why = e.message
    }
    if (why) {
      keep(`${lang}/_unexpected/${id}.json`, buf)
      throw new Unexpected(why)
    }
    keep(rel, buf)
    if (++n % 100 === 0) {
      saveManifest()
      console.log(`${lang}: ${n} fetched (${requests} requests)`)
    }
  }
  return { listed: ids.size, fetched: n, missing }
}
for (const lang of LANGS) {
  if (failed.has(lang)) continue
  current = lang
  try {
    const { listed, fetched, missing } = await fetchLang(lang)
    manifest.languages[lang] = { listed, fetched_this_run: fetched, missing, requests_this_run: langRequests[lang] ?? 0, completed_at: new Date().toISOString() }
    saveManifest()
    console.log(`${lang}: done, ${listed} hadiths (${fetched} fetched now, ${missing} not found, ${langRequests[lang] ?? 0} requests)`)
  } catch (e) {
    stopped(lang, e, 'hadiths')
  }
}
current = null
console.log(`requests: ${requests}`)

// [د] Fatwas for «الإحالة بمصدر» (reply 0072 item 13; add-on 0069-add6 §2 ب): Ibn Baz (binbaz.org.sa) and Ibn ʿUthaymin
// (binothaimeen.net) on taharah, salah, sawm and inheritance (scripts/ingest/fatwas-topics.mjs), from each site's own
// topic listings and single fatwa pages. One request at a time, at most one a second; any HTTP error (403, 429, …)
// stops the run (lib/http.mjs). Raw pages under data/raw/fatwas/<site>/ (out of git); a page already saved is not
// fetched again, so a run resumes. Then scripts/ingest/fatwas-build.mjs writes data/processed/fatwas.jsonl.
//
// alifta.gov.sa is not fetched: its fatwa library (https://alifta.gov.sa/ar/fatwas) is drawn in the browser from
// /API/FatwaQuestions, and its robots.txt says «Disallow: /API/» (read 22 October 2026). Waiting for Talal.
//
//   DATA_DIR=/path/to/data node scripts/ingest/fatwas-fetch.mjs [--site binbaz|binothaimeen]
import fs from 'node:fs'
import path from 'node:path'
import { politeFetch } from './lib/http.mjs'
import { BINBAZ, BINOTHAIMEEN } from './fatwas-topics.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')
const DATA = process.env.DATA_DIR ?? path.join(ROOT, 'data')
const RAW = path.join(DATA, 'raw/fatwas')
const only = process.argv.includes('--site') ? process.argv[process.argv.indexOf('--site') + 1] : null
const GAP = 1100
let requests = 0

async function get(url, file) {
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8')
  const body = await (await politeFetch(url, { minGapMs: GAP })).text()
  requests++
  fs.writeFileSync(file, body)
  return body
}

async function binbaz() {
  const dir = path.join(RAW, 'binbaz')
  fs.mkdirSync(dir, { recursive: true })
  const index = new Map() // number → { url, cats: [{ id, topic }] }
  for (const sub of BINBAZ) {
    const links = []
    for (let page = 1; ; page++) {
      const url = `https://binbaz.org.sa/categories/fiqhi/${sub.id}/fatwa${page > 1 ? `?page=${page}` : ''}`
      const html = await get(url, path.join(dir, `list-${sub.id}-p${page}.html`))
      for (const m of html.matchAll(/href="(https:\/\/binbaz\.org\.sa\/fatwas\/(\d+)\/[^"]+)"/g)) if (!links.some((l) => l.number === m[2])) links.push({ url: m[1].replace(/&amp;/g, '&'), number: m[2] })
      if (!sub.all && links.length >= sub.take) break
      if (!html.includes(`/categories/fiqhi/${sub.id}/fatwa?page=${page + 1}"`)) break
    }
    for (const l of sub.all ? links : links.slice(0, sub.take)) {
      const e = index.get(l.number) ?? { url: l.url, cats: [] }
      e.cats.push({ id: sub.id, topic: sub.topic })
      index.set(l.number, e)
    }
    console.log(`binbaz ${sub.topic} ${sub.id}: ${sub.all ? links.length : Math.min(links.length, sub.take)}`)
  }
  let n = 0
  for (const [number, e] of index) {
    const html = await get(e.url, path.join(dir, `${number}.html`))
    if (!html.includes('class="fatwa"')) throw new Error(`binbaz ${number}: no fatwa block (${e.url})`)
    if (++n % 50 === 0) console.log(`binbaz pages ${n}/${index.size}`)
  }
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(Object.fromEntries(index), null, 1))
  console.log(`binbaz: ${index.size} fatwas`)
}

async function binothaimeen() {
  const dir = path.join(RAW, 'binothaimeen')
  fs.mkdirSync(dir, { recursive: true })
  const index = new Map() // id → { cats: [{ id, topic }] }
  for (const sub of BINOTHAIMEEN) {
    const items = []
    for (let page = 1; ; page++) {
      const url = `https://shekhapi.binothaimeen.net/course/sections/audio_library/many_lessons/${sub.id}/10?page=${page}`
      const d = JSON.parse(await get(url, path.join(dir, `list-${sub.id}-p${page}.json`)))
      for (const x of d.data ?? []) if (!items.includes(x.id)) items.push(x.id)
      if (!sub.all && items.length >= sub.take) break
      if (!d.meta || page >= d.meta.last_page) break
    }
    for (const id of sub.all ? items : items.slice(0, sub.take)) {
      const e = index.get(id) ?? { cats: [] }
      e.cats.push({ id: sub.id, topic: sub.topic })
      index.set(id, e)
    }
    console.log(`binothaimeen ${sub.topic} ${sub.id}: ${sub.all ? items.length : Math.min(items.length, sub.take)}`)
  }
  let n = 0
  for (const [id] of index) {
    const url = `https://shekhapi.binothaimeen.net/lessons/audios/show/${id}/0/1?getManySectionsWithAllParent=categories_tree&getAllPaths=1`
    const d = JSON.parse(await get(url, path.join(dir, `${id}.json`)))
    if (!d.data?.objective?.content?.ar) throw new Error(`binothaimeen ${id}: no text`)
    if (++n % 50 === 0) console.log(`binothaimeen pages ${n}/${index.size}`)
  }
  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(Object.fromEntries(index), null, 1))
  console.log(`binothaimeen: ${index.size} fatwas`)
}

try {
  if (!only || only === 'binbaz') await binbaz()
  if (!only || only === 'binothaimeen') await binothaimeen()
  fs.writeFileSync(path.join(RAW, 'FETCHED_AT.txt'), new Date().toISOString() + '\n')
} finally {
  console.log(`requests this run: ${requests}`)
}

// Add-on 0072-add67 §1: the Friday line's two hadiths for the times page's sheet of sources, copied from our data
// (data/processed/hadith.jsonl, HadeethEnc, source ب) by their numbers, never typed: Abu Huraira's four after the
// Jumu'ah (65764) and Ibn Umar's ten, whose other wording is the two after it (3062). For each: the text (`hadeeth`)
// in each of the app's ten languages our data has it in, with the release it came from, and the attribution and grade
// as HadeethEnc gives them in Arabic. worker/test/sunan-0072.test.ts checks the file against the data.
//   node scripts/ingest/sunan-friday-build.mjs
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const IDS = ['65764', '3062']
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi']
const OUT = `${ROOT}web/src/v2/daily/sunan-friday.json`

const rows = new Map()
for (const line of fs.readFileSync(`${ROOT}data/processed/hadith.jsonl`, 'utf8').split('\n')) {
  if (!line) continue
  const r = JSON.parse(line)
  if (!IDS.includes(r.id) || !LANGS.includes(r.lang)) continue
  rows.set(`${r.id}|${r.lang}`, r)
}
const out = IDS.map((id) => {
  const ar = rows.get(`${id}|ar`)
  if (!ar) {
    console.error(`hadith ${id} is not in data/processed/hadith.jsonl (Arabic): stop, nothing is substituted`)
    process.exit(1)
  }
  const text = {}
  const version = {}
  for (const lang of LANGS) {
    const r = rows.get(`${id}|${lang}`)
    if (!r) continue
    text[lang] = r.hadeeth
    version[lang] = r.version
  }
  return { id, attribution: ar.attribution, grade: ar.grade, text, version }
})
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
console.log(`wrote ${OUT}: ${out.map((h) => `${h.id} (${Object.keys(h.text).join(', ')})`).join('; ')}`)

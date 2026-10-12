// Build the SQL for tafsir_translations (migration 0010) from data/raw/quranenc-mokhtasar (reply 0031-add14 §3):
// source 'quranenc', the language from the key's prefix, the text as received, the version from MANIFEST.json.
// Checks (any failure stops): 6,236 ayat per key, no empty text, exactly the (sura, aya) pairs of quran.jsonl.
// Arabic and Italian are kept too (stored, never served: worker/src/mukhtasar.ts).
//   node scripts/ingest/quranenc-mokhtasar-build.mjs
//   cd worker && npx wrangler d1 execute imuslim-next --remote --env next --file ../data/processed/mokhtasar-qe.sql
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const RAW = path.join(ROOT, 'data/raw/quranenc-mokhtasar')
const OUT = path.join(ROOT, 'data/processed/mokhtasar-qe.sql')
const LANG = {
  arabic: 'ar', french: 'fr', spanish: 'es', italian: 'it', bosnian: 'bs', turkish: 'tr', azeri: 'az', serbian: 'sr', uzbek: 'uz', kyrgyz: 'ky',
  indonesian: 'id', tagalog: 'tl', chinese: 'zh', uyghur: 'ug', japanese: 'ja', vietnamese: 'vi', thai: 'th', khmer: 'km', persian: 'fa',
  kurdish: 'ku', pashto: 'ps', hindi: 'hi', bengali: 'bn', telugu: 'te', malayalam: 'ml', assamese: 'as', tamil: 'ta', sinhalese: 'si', fulani: 'ff',
}
const manifest = JSON.parse(fs.readFileSync(path.join(RAW, 'MANIFEST.json'), 'utf8'))
const pairs = new Set(
  fs.readFileSync(path.join(ROOT, 'data/processed/quran.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => r.kind === 'ayah').map((r) => `${r.sura}:${r.aya}`),
)
const q = (s) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`)
const out = []
const counts = {}
for (const [key, meta] of Object.entries(manifest.keys)) {
  const lang = LANG[key.replace(/_mokhtasar$/, '')]
  if (!lang) throw new Error(`no language for ${key}`)
  const rows = []
  for (let s = 1; s <= 114; s++) {
    const j = JSON.parse(fs.readFileSync(path.join(RAW, key, `${s}.json`), 'utf8'))
    for (const a of j.result ?? j) rows.push({ sura: Number(a.sura), aya: Number(a.aya), text: a.translation })
  }
  const seen = new Set(rows.map((r) => `${r.sura}:${r.aya}`))
  const empty = rows.filter((r) => !String(r.text ?? '').trim()).length
  const missing = [...pairs].filter((k) => !seen.has(k)).length
  if (rows.length !== 6236 || seen.size !== 6236 || empty || missing) throw new Error(`${key}: ${rows.length} rows, ${empty} empty, ${missing} missing`)
  let batch = []
  let size = 0
  const flush = () => {
    if (batch.length) out.push(`INSERT OR REPLACE INTO tafsir_translations (source, lang, sura, aya, text, version, source_key) VALUES\n${batch.join(',\n')};`)
    batch = []
    size = 0
  }
  for (const r of rows) {
    const t = `('quranenc', ${q(lang)}, ${r.sura}, ${r.aya}, ${q(r.text)}, ${q(meta.version)}, ${q(key)})`
    const b = Buffer.byteLength(t)
    if (size + b > 80_000) flush()
    batch.push(t)
    size += b
  }
  flush()
  counts[lang] = `${rows.length} v${meta.version}`
}
fs.writeFileSync(OUT, out.join('\n') + '\n')
console.log(JSON.stringify(counts))
console.log(`${Object.keys(counts).length} languages → ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB)`)

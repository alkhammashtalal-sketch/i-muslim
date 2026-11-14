// Build the SQL for tafsir_translations (migration 0010) from data/raw/quranenc-mokhtasar (reply 0031-add14 §3):
// source 'quranenc', the language from the key's prefix, the text as received, the version from MANIFEST.json.
// Checks (any failure stops): 6,236 ayat per key, exactly the (sura, aya) pairs of quran.jsonl. An empty entry in the
// source is not stored and is listed.
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
// Versions from the index page's cards (home-ar.html, saved by the fetch): each card holds «DD/MM/YYYY - Vx.y.z» and
// the browse link; a key's page (/browse/{key}) has no version. A key on two cards must carry one version number.
const home = fs.readFileSync(path.join(RAW, 'home-ar.html'), 'utf8')
const cardVersions = {}
for (const c of home.split('class="tab_card ').slice(1)) {
  const k = c.match(/browse\/([a-z_]+_mokhtasar)"/)?.[1]
  const v = c.match(/(\d{2}\/\d{2}\/\d{4})\s*-\s*V(\d+\.\d+\.\d+)/)
  if (k && v) (cardVersions[k] ??= []).push({ date: v[1], version: v[2] })
}
for (const [key, meta] of Object.entries(manifest.keys)) {
  const vs = [...new Set((cardVersions[key] ?? []).map((x) => x.version))]
  if (vs.length !== 1) throw new Error(`${key}: version not single on the index (${vs.join(', ') || 'none'})`)
  meta.version = vs[0]
  meta.dates = (cardVersions[key] ?? []).map((x) => x.date)
}
const pairs = new Set(
  fs.readFileSync(path.join(ROOT, 'data/processed/quran.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((r) => r.kind === 'ayah').map((r) => `${r.sura}:${r.aya}`),
)
const q = (s) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`)
const out = []
const counts = {}
const emptyList = []
for (const [key, meta] of Object.entries(manifest.keys)) {
  const lang = LANG[key.replace(/_mokhtasar$/, '')]
  if (!lang) throw new Error(`no language for ${key}`)
  const rows = []
  for (let s = 1; s <= 114; s++) {
    const j = JSON.parse(fs.readFileSync(path.join(RAW, key, `${s}.json`), 'utf8'))
    for (const a of j.result ?? j) rows.push({ sura: Number(a.sura), aya: Number(a.aya), text: a.translation })
  }
  const seen = new Set(rows.map((r) => `${r.sura}:${r.aya}`))
  const missing = [...pairs].filter((k) => !seen.has(k)).length
  if (rows.length !== 6236 || seen.size !== 6236 || missing) throw new Error(`${key}: ${rows.length} rows, ${missing} missing`)
  // An ayah the source left empty is not stored (nothing is shown for it; never filled by us) and is listed, to be
  // reported to QuranEnc (their term 5). On 13 October: spanish_mokhtasar 59:24 only.
  const empty = rows.filter((r) => !String(r.text ?? '').trim())
  for (const r of empty) emptyList.push(`${key} ${r.sura}:${r.aya}`)
  rows.splice(0, rows.length, ...rows.filter((r) => String(r.text ?? '').trim()))
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
console.log(`empty in the source, not stored: ${emptyList.join(', ') || 'none'}`)
console.log(`${Object.keys(counts).length} languages → ${path.relative(ROOT, OUT)} (${(fs.statSync(OUT).size / 1e6).toFixed(1)} MB)`)

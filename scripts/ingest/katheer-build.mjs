// [أ] Tafsir Ibn Kathir (reply 0071 §5): data/raw/ksu/tafasir/katheer.ayt (scripts/ingest/ksu-fetch.mjs) →
// data/processed/tafsir-katheer.sql, rows of tafsir_books (migration 0017), the text as the file holds it.
//   node scripts/ingest/katheer-build.mjs
//   cd worker && bash ../scripts/wr.sh d1 execute imuslim-v11 --remote --env v11 --yes --file ../data/processed/tafsir-katheer.sql
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const ROOT = path.resolve(import.meta.dirname, '../..')
const SRC = path.join(ROOT, 'data/raw/ksu/tafasir/katheer.ayt')
const OUT = path.join(ROOT, 'data/processed/tafsir-katheer.sql')
const db = new DatabaseSync(SRC, { readOnly: true })
const rows = db.prepare('SELECT sura, aya, text FROM katheer ORDER BY sura, aya').all()
if (rows.length !== 6236) throw new Error(`expected 6,236 entries, found ${rows.length}`)
const empty = rows.filter((r) => !String(r.text ?? '').trim())
if (empty.length) throw new Error(`${empty.length} empty entries`)
const q = (s) => `'${String(s).replace(/'/g, "''")}'`
// Multi-row inserts, small enough for D1's statement limit (100 KB): an entry runs to 38,578 characters.
const out = []
let batch = []
let size = 0
const flush = () => {
  if (!batch.length) return
  out.push(`INSERT OR REPLACE INTO tafsir_books (book, sura, aya, text) VALUES\n${batch.join(',\n')};`)
  batch = []
  size = 0
}
for (const r of rows) {
  const v = `('katheer', ${Number(r.sura)}, ${Number(r.aya)}, ${q(r.text)})`
  const bytes = Buffer.byteLength(v)
  if (size + bytes > 90_000) flush()
  batch.push(v)
  size += bytes
}
flush()
fs.writeFileSync(OUT, out.join('\n') + '\n')
console.log(`${rows.length} entries, ${out.length} statements, ${(fs.statSync(OUT).size / 1048576).toFixed(1)} MB → ${path.relative(ROOT, OUT)}`)

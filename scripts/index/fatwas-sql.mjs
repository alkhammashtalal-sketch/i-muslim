// data/processed/fatwas.jsonl (scripts/ingest/fatwas-build.mjs) → data/processed/fatwas.sql, the rows of `fatwas`
// (migration 0018) for env v11's D1 (reply 0072 item 13), loaded through scripts/wr.sh:
//   DATA_DIR=/path/to/data node scripts/index/fatwas-sql.mjs
//   (cd worker && bash ../scripts/wr.sh d1 execute imuslim-v11 --remote --env v11 --file <DATA_DIR>/processed/fatwas.sql)
// Each row by its id: inserted, or its fields replaced in place (the rowid kept, so its keyword row stays its own).
// Then scripts/index/fatwa-index.mjs builds the keyword rows and the vectors of the general ones.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const DATA = process.env.DATA_DIR ?? path.join(ROOT, 'data')
const rows = fs
  .readFileSync(path.join(DATA, 'processed/fatwas.jsonl'), 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))
const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
const COLS = ['id', 'site', 'scholar', 'number', 'title', 'question', 'answer', 'topic', 'category', 'series', 'url', 'fetched_at', 'general']
const sql = rows.map(
  (r) =>
    `INSERT INTO fatwas (${COLS.join(', ')}) VALUES (${COLS.map((c) => q(r[c])).join(', ')}) ON CONFLICT(id) DO UPDATE SET ${COLS.slice(1)
      .map((c) => `${c} = excluded.${c}`)
      .join(', ')};`,
)
fs.writeFileSync(path.join(DATA, 'processed/fatwas.sql'), sql.join('\n') + '\n')
console.log(`${rows.length} rows (${rows.filter((r) => r.general).length} general) → ${path.join(DATA, 'processed/fatwas.sql')}`)

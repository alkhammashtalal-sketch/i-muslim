// The size a D1 database will grow by when SQL files are executed on it (reply 0033-add2 §2: «قبل التحميل في D1: اكتب
// حجم imuslim-next المتوقع بعده»), measured, not guessed: a local SQLite file (node:sqlite, the page size D1 uses,
// 4096) gets the schema of worker/migrations, then the --base files (what the D1 already holds of the tables touched),
// then the --add files in the order they will run. The growth is the pages the --add files allocated, times the page
// size: the rows with their overflow pages, every index of their tables and any FTS table or trigger they feed, as
// the migrations define them. Nothing is sent anywhere. The expected size is the D1's own size (read with
// `bash scripts/wr.sh d1 info <db> --env next --json`, field database_size) plus this growth.
//
//   node scripts/index/d1-size-estimate.mjs --base data/processed/hadith.sql --add data/processed/hadith-langs.sql [--now 393211904]
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const ROOT = path.resolve(import.meta.dirname, '../..')
const argv = process.argv.slice(2)
const many = (k) => argv.flatMap((a, i) => (argv[i - 1] === `--${k}` ? a.split(',') : []))
const base = many('base')
const add = many('add')
const now = Number(many('now')[0] ?? NaN)
if (!add.length) throw new Error('--add <sql file> is needed')

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'd1-size-'))
const file = path.join(dir, 'db.sqlite')
const db = new DatabaseSync(file)
db.exec('PRAGMA page_size = 4096; PRAGMA journal_mode = DELETE;')
const MIG = path.join(ROOT, 'worker/migrations')
for (const m of fs.readdirSync(MIG).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort()) db.exec(fs.readFileSync(path.join(MIG, m), 'utf8'))
const pages = () => ({ pages: Number(db.prepare('PRAGMA page_count').get().page_count), free: Number(db.prepare('PRAGMA freelist_count').get().freelist_count) })
const run = (f) => {
  const t = Date.now()
  db.exec('BEGIN')
  db.exec(fs.readFileSync(path.resolve(ROOT, f), 'utf8'))
  db.exec('COMMIT')
  console.log(`${f}: ${(fs.statSync(path.resolve(ROOT, f)).size / 1e6).toFixed(1)} MB of SQL in ${((Date.now() - t) / 1000).toFixed(0)} s`)
}
const p0 = pages()
for (const f of base) run(f)
const p1 = pages()
for (const f of add) run(f)
const p2 = pages()
const PAGE = Number(db.prepare('PRAGMA page_size').get().page_size)
const bytes = (p2.pages - p1.pages) * PAGE
const rows = (t) => Number(db.prepare(`SELECT count(*) AS n FROM ${t}`).get().n)
const mb = (b) => `${(b / 1e6).toFixed(1)} MB`
console.log(`page size ${PAGE}; schema ${p0.pages} pages; after --base ${p1.pages} (${mb(p1.pages * PAGE)}, ${p1.free} free); after --add ${p2.pages} (${mb(p2.pages * PAGE)}, ${p2.free} free)`)
console.log(`hadiths: ${rows('hadiths')} rows; hadith_categories: ${rows('hadith_categories')} rows`)
console.log(`growth from --add: ${bytes} bytes = ${mb(bytes)} (${(bytes / 2 ** 20).toFixed(1)} MiB)`)
if (Number.isFinite(now)) console.log(`expected size: ${now} + ${bytes} = ${now + bytes} bytes = ${mb(now + bytes)}`)
db.close()
fs.rmSync(dir, { recursive: true, force: true })

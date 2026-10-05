// Minimal D1-shaped adapter over node:sqlite for tests: prepare/bind/all/first/run/batch.
// Builds the schema from worker/migrations and loads data/processed/*.jsonl like the indexer does.
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

type Val = string | number | null

class Stmt {
  constructor(
    private db: DatabaseSync,
    private sql: string,
    private args: Val[] = [],
  ) {}
  bind(...args: Val[]) {
    return new Stmt(this.db, this.sql, args)
  }
  async all<T>() {
    const results = this.db.prepare(this.sql).all(...this.args) as T[]
    return { results, success: true, meta: { rows_read: results.length } }
  }
  async first<T>(col?: string) {
    const row = this.db.prepare(this.sql).get(...this.args) as Record<string, unknown> | undefined
    if (!row) return null
    return (col ? row[col] : row) as T
  }
  async run() {
    const r = this.db.prepare(this.sql).run(...this.args)
    return { success: true, meta: { changes: Number(r.changes) } }
  }
}

export class SqliteD1 {
  constructor(public db: DatabaseSync) {}
  prepare(sql: string) {
    return new Stmt(this.db, sql)
  }
  async batch(stmts: Stmt[]) {
    return Promise.all(stmts.map((s) => s.all()))
  }
}

const ROOT = path.resolve(import.meta.dirname, '../..')
const MIGRATIONS = path.join(ROOT, 'worker/migrations')
const PROCESSED = path.join(ROOT, 'data/processed')
export const hasFullData = fs.existsSync(path.join(PROCESSED, 'quran.jsonl'))

const COLUMNS = ['id', 'source', 'kind', 'ref', 'url', 'text', 'text_en', 'text_search', 'embed_text', 'book', 'chapter', 'sura', 'aya', 'page']

/** Migrations up to 0003, then the passages (as /api/admin/index stores them), then 0004+ (which reads passages). */
export function buildDb(): SqliteD1 {
  const db = new DatabaseSync(':memory:')
  const files = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()
  const early = files.filter((f) => f < '0004')
  const late = files.filter((f) => f >= '0004')
  for (const f of early) db.exec(fs.readFileSync(path.join(MIGRATIONS, f), 'utf8'))
  const insert = db.prepare(`INSERT INTO passages (${COLUMNS.join(', ')}, extra) VALUES (${COLUMNS.map(() => '?').join(', ')}, ?)`)
  db.exec('BEGIN')
  for (const file of ['quran.jsonl', 'aqeedah.jsonl']) {
    const p = path.join(PROCESSED, file)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').trim().split('\n')) {
      const r = JSON.parse(line) as Record<string, unknown>
      const extra: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(r)) if (!COLUMNS.includes(k)) extra[k] = v
      insert.run(...COLUMNS.map((c) => (r[c] ?? null) as Val), JSON.stringify(extra))
    }
  }
  db.exec('COMMIT')
  for (const f of late) db.exec(fs.readFileSync(path.join(MIGRATIONS, f), 'utf8'))
  return new SqliteD1(db)
}

export function rawRecord(id: string): Record<string, unknown> | undefined {
  for (const file of ['quran.jsonl', 'aqeedah.jsonl']) {
    const p = path.join(PROCESSED, file)
    if (!fs.existsSync(p)) continue
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) if (line.includes(`"id":"${id}"`)) return JSON.parse(line)
  }
}

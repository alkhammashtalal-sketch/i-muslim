// The fatwas' search on env v11 (reply 0072 item 13, fix «fatwa-ref»): sends the general fatwas' ids, never their
// texts, to POST /api/admin/fatwa-index on the v11 Worker, which builds each one's keyword row and the vector of its
// question from its own row in D1 (worker/src/fatwa-index.ts). Run after scripts/index/fatwas-sql.mjs is loaded.
//   WORKER_URL=https://i-muslim-v11.… ADMIN_TOKEN=… DATA_DIR=/path/to/data node scripts/index/fatwa-index.mjs
// Batches of 20 ids, two requests a second at most, stopping at the first error; the D1 rows read and written are
// summed and printed (CLAUDE.md §12). Never next nor the live link.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const DATA = process.env.DATA_DIR ?? path.join(ROOT, 'data')
const { WORKER_URL, ADMIN_TOKEN } = process.env
if (!WORKER_URL || !ADMIN_TOKEN) {
  console.error('Set WORKER_URL (env v11) and ADMIN_TOKEN in the environment (never in a committed file).')
  process.exit(1)
}
const host = new URL(WORKER_URL).hostname
if (!host.startsWith('i-muslim-v11.')) {
  console.error(`Refused: ${host}. The fatwas are indexed on env v11 only.`)
  process.exit(2)
}
const ids = fs
  .readFileSync(path.join(DATA, 'processed/fatwas.jsonl'), 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))
  .filter((r) => r.general)
  .map((r) => r.id)
const BATCH = 20
const total = { indexed: 0, skipped: 0, rows_read: 0, rows_written: 0, requests: 0 }
let last = 0
try {
  for (let i = 0; i < ids.length; i += BATCH) {
    const wait = last + 500 - Date.now()
    if (wait > 0) await new Promise((r) => setTimeout(r, wait))
    last = Date.now()
    const res = await fetch(`${WORKER_URL.replace(/\/$/, '')}/api/admin/fatwa-index`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${ADMIN_TOKEN}` },
      body: JSON.stringify({ ids: ids.slice(i, i + BATCH) }),
    })
    const body = await res.text()
    if (!res.ok) throw new Error(`fatwa-index ${res.status}: ${body.slice(0, 300)}`)
    const r = JSON.parse(body)
    total.requests++
    total.indexed += r.indexed ?? 0
    total.skipped += (r.skipped ?? []).length
    total.rows_read += r.rows_read ?? 0
    total.rows_written += r.rows_written ?? 0
  }
} finally {
  console.log(JSON.stringify({ general: ids.length, ...total }, null, 1))
}

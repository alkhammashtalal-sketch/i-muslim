// Hadiths for the answers (reply 0048): sends HadeethEnc ids, never texts, to the admin routes of a
// `wrangler dev --remote --env next` preview, which build each passage from its Arabic row in D1 (worker/src/hadith-index.ts).
//   WORKER_URL=http://localhost:8797 ADMIN_TOKEN=… node scripts/index/hadith-index.mjs [--grade] [--passages] [--dry]
// --passages: the sahih and hasan marfu' hadiths, one of each set of copies (below), into passages, their keyword tables
//             and imuslim-next-hadiths. --grade: every Arabic row, into hadith_grade_fts («هل حديث كذا صحيح؟»).
// Both by default. --dry prints the counts and the folded copies and sends nothing.
// Copies (folded, reply 0048 «الطي للمكرر»): the same text after the diacritics are removed, or the same title with 70%
// of the words in common (the copies HadeethEnc keeps for an-Nawawi's Forty, 66xxx, and a few others); the one kept is
// the lowest tier, then the smallest id. A folded copy stays on its own hadith page and in the grade search.
// Batches of 10 ids, two requests a second at most, stopping at the first error; progress in data/processed so a run
// resumes; the D1 rows read and written are summed and printed (CLAUDE.md §12).
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const P = path.join(ROOT, 'data/processed')
const args = new Set(process.argv.slice(2))
const both = !args.has('--grade') && !args.has('--passages')
const doPassages = both || args.has('--passages')
const doGrade = both || args.has('--grade')
const DRY = args.has('--dry')
const BATCH = 10
const MIN_MS = Number(process.env.MIN_MS ?? 500)
const PROGRESS = process.env.PROGRESS_FILE ?? path.join(P, 'hadith-index_progress.json')
const { WORKER_URL, ADMIN_TOKEN } = process.env
if (!DRY && (!WORKER_URL || !ADMIN_TOKEN)) {
  console.error('Set WORKER_URL and ADMIN_TOKEN in the environment (never in a committed file).')
  process.exit(1)
}

// The same normalization as worker/src/lib/normalize.ts tokenize (diacritics, alef forms, ta marbuta, alef maqsura).
const words = (s) =>
  (s ?? '')
    .replace(/[ً-ٰٟۖ-ۭ]/g, '')
    .replace(/ـ/g, '')
    .replace(/[آأإٱٲٳ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)

const arabicRows = (file) => {
  const out = []
  for (const line of fs.readFileSync(path.join(P, file), 'utf8').split('\n')) {
    if (!line.includes('"lang": "ar"') && !line.includes('"lang":"ar"')) continue
    const r = JSON.parse(line)
    if (r.lang === 'ar') out.push(r)
  }
  return out
}
const ar = arabicRows('hadith.jsonl')
// The weak, mawdu and mixed rows (loaded in D1 with their badge) are searched for their grade too, never indexed.
const weak = fs.existsSync(path.join(P, 'hadith_weak.jsonl')) ? arabicRows('hadith_weak.jsonl') : []
const retrievable = (r) => (r.class === 'sahih' || r.class === 'hasan') && ['1', '2', '3'].includes(String(r.tier)) && !r.mawquf
const order = (a, b) => String(a.tier).localeCompare(String(b.tier)) || Number(a.id) - Number(b.id)
const pool = ar.filter(retrievable).sort(order)

// Fold copies: each hadith joins the first kept one it copies.
const kept = []
const folded = []
const byText = new Map()
const byTitle = new Map()
for (const r of pool) {
  const w = words(r.hadeeth)
  const text = w.join(' ')
  const title = words(r.title).join(' ')
  const same = byText.get(text) ?? (byTitle.get(title) ?? []).find((k) => {
    const a = new Set(w)
    const b = new Set(words(k.hadeeth))
    let both = 0
    for (const x of a) if (b.has(x)) both++
    return both / (a.size + b.size - both) >= 0.7
  })
  if (same) {
    folded.push([r.id, same.id])
    continue
  }
  kept.push(r)
  byText.set(text, r)
  byTitle.set(title, [...(byTitle.get(title) ?? []), r])
}
console.log(`Arabic rows ${ar.length} and weak ${weak.length}; sahih and hasan marfu' ${pool.length}; kept ${kept.length}; folded ${folded.length}`)
if (DRY) {
  console.log('folded (copy → kept):', folded.map(([a, b]) => `${a}→${b}`).join(' '))
  fs.writeFileSync(path.join(P, 'hadith-index_folded.json'), JSON.stringify(folded, null, 1))
  process.exit(0)
}

const progress = fs.existsSync(PROGRESS) ? JSON.parse(fs.readFileSync(PROGRESS, 'utf8')) : {}
const save = () => fs.writeFileSync(PROGRESS, JSON.stringify(progress, null, 1))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let lastAt = 0
const total = { rows_read: 0, rows_written: 0, indexed: 0, chunks: 0, skipped: [] }
async function send(route, ids) {
  const wait = MIN_MS - (Date.now() - lastAt)
  if (wait > 0) await sleep(wait)
  lastAt = Date.now()
  const res = await fetch(`${WORKER_URL.replace(/\/$/, '')}/api/admin/${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${ADMIN_TOKEN}` },
    body: JSON.stringify({ ids }),
  })
  const body = await res.text()
  if (!res.ok) throw new Error(`${route} ${res.status}: ${body.slice(0, 300)}`)
  return JSON.parse(body)
}
async function run(route, list) {
  const done = progress[route] ?? 0
  for (let i = done; i < list.length; i += BATCH) {
    const r = await send(route, list.slice(i, i + BATCH).map((x) => x.id))
    total.rows_read += r.rows_read ?? 0
    total.rows_written += r.rows_written ?? 0
    total.indexed += r.indexed ?? 0
    total.chunks += r.chunks ?? 0
    total.skipped.push(...(r.skipped ?? []))
    progress[route] = i + BATCH
    save()
    if ((i / BATCH) % 20 === 0) console.log(`${route} ${Math.min(i + BATCH, list.length)}/${list.length}`)
  }
}
try {
  if (doGrade) await run('hadith-grade-index', [...ar, ...weak])
  if (doPassages) await run('hadith-index', kept)
} finally {
  console.log(JSON.stringify({ ...total, skipped: total.skipped.length }, null, 1))
}

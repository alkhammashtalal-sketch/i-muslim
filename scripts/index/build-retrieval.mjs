// Builds the command-05 search indexes through the gated admin routes, with resume and a D1 read/write tally.
//
//   WORKER_URL=… ADMIN_TOKEN=… node scripts/index/build-retrieval.mjs fts       # wipe + rebuild the 3 keyword indexes
//   WORKER_URL=… ADMIN_TOKEN=… node scripts/index/build-retrieval.mjs vectors   # al-Saadi chunk vectors (idempotent upserts)
//
// Progress: data/processed/retrieval_progress.json (outside git). Re-running continues from the last rowid.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const PROGRESS = path.join(ROOT, 'data/processed/retrieval_progress.json');
const { WORKER_URL, ADMIN_TOKEN } = process.env;
const step = process.argv[2];
if (!WORKER_URL || !ADMIN_TOKEN || !['fts', 'vectors'].includes(step)) {
  console.error('usage: WORKER_URL=… ADMIN_TOKEN=… node scripts/index/build-retrieval.mjs fts|vectors');
  process.exit(1);
}
const progress = fs.existsSync(PROGRESS) ? JSON.parse(fs.readFileSync(PROGRESS, 'utf8')) : {};
const save = () => fs.writeFileSync(PROGRESS, JSON.stringify(progress, null, 2));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(route, body) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${WORKER_URL.replace(/\/$/, '')}${route}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${ADMIN_TOKEN}` },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (res.ok) return JSON.parse(text);
      if (res.status === 401 || res.status === 404 || res.status === 400) throw Object.assign(new Error(`HTTP ${res.status}: ${text}`), { fatal: true });
      throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
    } catch (e) {
      if (e.fatal || attempt >= 6) throw e;
      const wait = 2000 * 2 ** (attempt - 1);
      console.warn(`  retry ${attempt} in ${wait / 1000}s — ${e.message}`);
      await sleep(wait);
    }
  }
}

const p = (progress[step] ??= { after: 0, done: false, rows_read: 0, rows_written: 0, items: 0 });
const tally = (r) => {
  p.rows_read += r.rows_read ?? 0;
  p.rows_written += r.rows_written ?? 0;
};

if (p.done) {
  console.log(`${step}: already done`, p);
  process.exit(0);
}
if (step === 'fts' && p.after === 0 && !p.reset) {
  const r = await post('/api/admin/fts-rebuild', { reset: true });
  tally(r);
  p.reset = true;
  save();
  console.log('fts: wiped', r);
}
const t0 = Date.now();
while (!p.done) {
  const r =
    step === 'fts'
      ? await post('/api/admin/fts-rebuild', { after: p.after, limit: 100 })
      : await post('/api/admin/tafsir-vectors', { after: p.after, limit: 15 });
  tally(r);
  if (r.done) p.done = true;
  else {
    p.after = r.next;
    p.items += r.chunks ?? r.count ?? 0;
  }
  p.updated_at = new Date().toISOString();
  save();
  process.stdout.write(`\r${step}: after rowid ${p.after}, items ${p.items}, D1 read ${p.rows_read}, written ${p.rows_written} (${Math.round((Date.now() - t0) / 1000)}s)   `);
}
console.log(`\n${step}: done`, p);

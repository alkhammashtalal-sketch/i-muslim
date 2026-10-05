// Sends data/processed/*.jsonl to POST /api/admin/index in small batches, with retries.
// Progress is saved to data/processed/index_progress.json so an interrupted run resumes.
//
//   WORKER_URL=https://i-muslim.<sub>.workers.dev ADMIN_TOKEN=... node scripts/index/run.mjs [quran.jsonl aqeedah.jsonl ...]
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const P = path.join(ROOT, 'data/processed');
const PROGRESS = path.join(P, 'index_progress.json');
const BATCH = Number(process.env.BATCH ?? 25);
const { WORKER_URL, ADMIN_TOKEN } = process.env;
if (!WORKER_URL || !ADMIN_TOKEN) {
  console.error('Set WORKER_URL and ADMIN_TOKEN in the environment (never in a committed file).');
  process.exit(1);
}

const defaults = ['quran.jsonl', 'aqeedah.jsonl', 'hadith.jsonl'].filter((f) => fs.existsSync(path.join(P, f)));
const files = process.argv.slice(2).length ? process.argv.slice(2) : defaults;
const progress = fs.existsSync(PROGRESS) ? JSON.parse(fs.readFileSync(PROGRESS, 'utf8')) : {};
const save = () => fs.writeFileSync(PROGRESS, JSON.stringify(progress, null, 2));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function send(records) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`${WORKER_URL.replace(/\/$/, '')}/api/admin/index`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${ADMIN_TOKEN}` },
        body: JSON.stringify({ records }),
      });
      const body = await res.text();
      if (res.ok) return JSON.parse(body);
      if (res.status === 400 || res.status === 401) throw Object.assign(new Error(`HTTP ${res.status}: ${body}`), { fatal: true });
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    } catch (e) {
      if (e.fatal || attempt >= 6) throw e;
      const wait = 2000 * 2 ** (attempt - 1);
      console.warn(`  retry ${attempt} in ${wait / 1000}s — ${e.message}`);
      await sleep(wait);
    }
  }
}

for (const f of files) {
  const records = fs.readFileSync(path.join(P, f), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  progress[f] ??= { done: 0, total: records.length };
  progress[f].total = records.length;
  const t0 = Date.now();
  while (progress[f].done < records.length) {
    const batch = records.slice(progress[f].done, progress[f].done + BATCH);
    await send(batch);
    progress[f].done += batch.length;
    progress[f].updated_at = new Date().toISOString();
    save();
    if (progress[f].done % (BATCH * 20) === 0 || progress[f].done === records.length) {
      console.log(`${f}: ${progress[f].done}/${records.length} (${Math.round((Date.now() - t0) / 1000)}s)`);
    }
  }
  console.log(`${f}: done (${records.length})`);
}

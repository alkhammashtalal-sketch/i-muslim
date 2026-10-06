// The aligned translation of al-Tafsir al-Muyassar for review (command 21): for each ayah in eval/explain-set.v1.json
// and each of the nine languages other than Arabic, POST /api/admin/explain-sample { mode: "aligned" } on a preview
// (nothing read from or written to a live cache), 15 a minute (Workers AI allows 20 a minute for the whole account),
// one retry on a failed model call. Resumable: lines already written are kept and skipped.
//
//   WORKER_URL=http://localhost:8789 ADMIN_TOKEN=… node eval/explain-aligned.mjs
//   LANGS_ONLY=en,ur,id,ms PACE_MS=8000 …   two streams on disjoint languages, each at 7.5 a minute (15 together)
//
// Writes eval/reports/explain-aligned-<date>.jsonl: id, lang, sentences, source_sentences, ayah_ar, ayah_en, rejected
// (the structural guard: count, length ratio, language and script, the ayah's own words), warnings (six words shared
// with the Sahih International meaning), attempts. Only what passes the review is published (scripts/explain/).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const { WORKER_URL, ADMIN_TOKEN } = process.env;
if (!WORKER_URL || !ADMIN_TOKEN) throw new Error('WORKER_URL (a preview with ADMIN_ENABLED=true and LLM_MODE=live) and ADMIN_TOKEN');
const LANGS = (process.env.LANGS_ONLY ?? 'en,ur,id,ms,tr,fr,es,bn,hi').split(',');
const PACE_MS = Number(process.env.PACE_MS ?? 4000);
const set = JSON.parse(fs.readFileSync(path.join(ROOT, 'eval/explain-set.v1.json'), 'utf8')).ayat.map((a) => a.id);
const date = new Date().toISOString().slice(0, 10);
const out = path.join(ROOT, `eval/reports/explain-aligned-${date}.jsonl`);
const done = new Map(
  (fs.existsSync(out) ? fs.readFileSync(out, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []).map((r) => [`${r.id}|${r.lang}`, r]),
);
const ayat = {};
for (const id of set) {
  const p = await (await fetch(`${WORKER_URL}/api/passage/${encodeURIComponent(id)}`)).json();
  ayat[id] = { ayah_ar: p.text, ayah_en: p.text_en ?? null };
}
const jobs = set.flatMap((id) => LANGS.map((lang) => ({ id, lang }))).filter(({ id, lang }) => !done.has(`${id}|${lang}`));
console.log(`${set.length} ayat × ${LANGS.length} languages; ${done.size} done, ${jobs.length} to go`);
const call = async (id, lang) =>
  (await fetch(`${WORKER_URL}/api/admin/explain-sample`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${ADMIN_TOKEN}` }, body: JSON.stringify({ id, lang, mode: 'aligned' }) })).json().catch(() => ({ rejected: 'llm_failed: unreadable reply' }));
const pause = (t0) => new Promise((r) => setTimeout(r, Math.max(0, PACE_MS - (Date.now() - t0))));
let n = 0;
for (const { id, lang } of jobs) {
  let t0 = Date.now();
  let r = await call(id, lang);
  let attempts = 1;
  if (String(r.rejected ?? '').startsWith('llm_failed')) {
    await pause(t0);
    t0 = Date.now();
    r = await call(id, lang);
    attempts = 2;
  }
  const row = { id, lang, sentences: r.sentences ?? null, source_sentences: r.source_sentences ?? null, ...ayat[id], rejected: r.rejected ?? null, warnings: r.warnings ?? [], attempts };
  fs.appendFileSync(out, JSON.stringify(row) + '\n');
  n++;
  console.log(`${n}/${jobs.length} ${id} ${lang} → ${row.rejected ?? 'ok'}${row.warnings.length ? ` (${row.warnings.join('; ')})` : ''}`);
  await pause(t0);
}
const all = fs.readFileSync(out, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
console.log(`done: ${all.filter((r) => !r.rejected).length}/${all.length} pass the structural guard`);

// «بسّط لي» / «اشرح لي بلغتي» in the ten languages (reply 0019): one POST /api/explain per (source, language) on the
// live link, saved with the source it must stay faithful to, for a judgement by a different model and by the team.
//
//   node eval/explain-langs.mjs [--base https://…]      → eval/reports/explain-langs-<date>.jsonl
//   WORKER_URL=http://localhost:8789 ADMIN_TOKEN=… node eval/explain-langs.mjs --v2
//                                                       the same sample through POST /api/admin/explain-sample on a
//                                                       preview (the prompt and guard of the working tree; nothing read
//                                                       from or written to explain_cache), 15 a minute, with the guard's
//                                                       verdict in "rejected" → explain-langs-<date>-v2.jsonl
//   node eval/explain-langs.mjs --retry-failed          one at a time, only the lines that failed; each line keeps
//                                                       its first error in first_error and counts its attempts
//
// New answers are generated and kept in explain_cache (the users see them afterwards); answers already in the cache
// are recorded as they are (fromCache: true), since that is what a user sees. Each line:
//   id, lang, text, fromCache, error, source_ar (al-Muyassar for an ayah, else the passage as in D1), ayah_ar and
//   ayah_en (Sahih International) for an ayah, and en_overlap: in English, the first run of four consecutive words
//   shared with the Sahih International meaning (validExplanation guards Arabic words only, so a translated ayah in
//   another language would pass it; this measures the English case).
// To delete one cached explanation after the judgement (not run here):
//   cd worker && npx wrangler d1 execute imuslim --remote --command "DELETE FROM explain_cache WHERE id = '<id>' AND lang = '<lang>'"
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const BASE = (argv.includes('--base') ? argv[argv.indexOf('--base') + 1] : 'https://i-muslim.alkhammashtalal.workers.dev').replace(/\/$/, '');
const IDS = ['quran:2:255', 'quran:112:1', 'quran:51:56', 'quran:2:183', 'quran:5:6', 'quran:94:5', 'aqeedah:usul:005', 'aqeedah:usul:007'];
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'];

const sources = {};
for (const id of IDS) {
  const p = await (await fetch(`${BASE}/api/passage/${encodeURIComponent(id)}`)).json();
  sources[id] =
    p.kind === 'ayah'
      ? { source_ar: p.tafsir.find((t) => t.key === 'muyassar')?.text ?? null, ayah_ar: p.text, ayah_en: p.text_en ?? null }
      : { source_ar: p.text, ayah_ar: null, ayah_en: null };
}

const words = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
function enOverlap(text, ayahEn) {
  if (!ayahEn) return null;
  const t = ` ${words(text).join(' ')} `;
  const w = words(ayahEn.replace(/\[[^\]]*\]/g, ' '));
  for (let i = 0; i + 4 <= w.length; i++) if (t.includes(` ${w.slice(i, i + 4).join(' ')} `)) return w.slice(i, i + 4).join(' ');
  return null;
}

const date = new Date().toISOString().slice(0, 10);
const V2 = argv.includes('--v2');
const out = path.join(ROOT, `eval/reports/explain-langs-${date}${V2 ? '-v2' : ''}.jsonl`);
const RETRY = argv.includes('--retry-failed');
const previous = RETRY ? fs.readFileSync(out, 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : [];
// v2 retries only failed model calls; a guard's refusal is the result being measured, not retried.
const failed = (r) => r.error && !(V2 && r.rejected && !r.rejected.startsWith('llm_failed'))
const jobs = RETRY ? previous.filter(failed).map(({ id, lang }) => ({ id, lang })) : IDS.flatMap((id) => LANGS.map((lang) => ({ id, lang })));
const rows = RETRY ? previous.filter((r) => !failed(r)) : [];
let next = 0;
async function worker() {
  while (next < jobs.length) await runJob(jobs[next++]);
}
async function runJob({ id, lang }) {
  {
    const t0 = Date.now();
    const res = V2
      ? await fetch(`${process.env.WORKER_URL}/api/admin/explain-sample`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.ADMIN_TOKEN}` }, body: JSON.stringify({ id, lang }) })
      : await fetch(`${BASE}/api/explain`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, lang }) });
    const body = await res.json().catch(() => ({ error: `http_${res.status}` }));
    if (V2) {
      body.fromCache = false;
      if (body.rejected) body.error = `rejected: ${body.rejected}`;
    }
    const s = sources[id];
    const before = previous.find((r) => r.id === id && r.lang === lang);
    rows.push({
      id,
      lang,
      text: body.text ?? null,
      fromCache: body.fromCache ?? null,
      error: body.error ?? null,
      ms: Date.now() - t0,
      source_ar: s.source_ar,
      ayah_ar: s.ayah_ar,
      ...(s.ayah_en ? { ayah_en: s.ayah_en } : {}),
      ...(lang === 'en' && body.text ? { en_overlap: enOverlap(body.text, s.ayah_en) } : {}),
      ...(V2 ? { rejected: body.rejected ?? null } : {}),
      attempts: (before?.attempts ?? 1) + (before ? 1 : 0),
      ...(before ? { first_error: before.first_error ?? before.error } : {}),
    });
    process.stdout.write(`\r${rows.length}/${jobs.length}`);
  }
}
// v2: one at a time, 15 a minute (Workers AI allows 20 a minute for the whole account).
if (V2) {
  for (const j of jobs) {
    const t0 = Date.now();
    await runJob(j);
    await new Promise((r) => setTimeout(r, Math.max(0, 4000 - (Date.now() - t0))));
  }
} else await Promise.all(RETRY ? [worker()] : [worker(), worker(), worker(), worker()]);
console.log();
rows.sort((a, b) => IDS.indexOf(a.id) - IDS.indexOf(b.id) || LANGS.indexOf(a.lang) - LANGS.indexOf(b.lang));
fs.writeFileSync(out, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
const ok = rows.filter((r) => r.text);
console.log(`${ok.length}/${rows.length} explanations (${ok.filter((r) => r.fromCache).length} were already in the cache); errors: ${rows.filter((r) => r.error).map((r) => `${r.id} ${r.lang}: ${r.error}`).join('; ') || 'none'}`);
console.log(`English overlapping Sahih International by 4+ words: ${rows.filter((r) => r.en_overlap).map((r) => `${r.id} «${r.en_overlap}»`).join('; ') || 'none'}`);
console.log(`written ${path.relative(ROOT, out)}`);

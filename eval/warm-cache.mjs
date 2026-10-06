// Warm the answer cache with the questions most likely to be tried (Workers AI allows 20 model requests a minute
// for the whole account; a cached A/B answer needs none): the four suggested questions and the ten starter-path
// questions in the ten languages, the twelve official cases, and the README's ready questions.
//
//   node eval/warm-cache.mjs [--base https://…] [--per-minute 15] [--dry-run]
//
// One question every 60/perMinute seconds, so users keep part of the minute's budget while it runs; a question
// already cached (fromCache) or answered without the model (referral at the gate, apology under the threshold) costs
// nothing. Only A/B answers are cached (CLAUDE.md §3 rule 8). Prints one line per question and a summary; writes
// nothing to the repository. Questions are synthetic or the app's own fixed lists; nothing about real users.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : d);
const BASE = opt('base', 'https://i-muslim.alkhammashtalal.workers.dev').replace(/\/$/, '');
const PER_MINUTE = Number(opt('per-minute', 15));
const LANGS = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'];

const sug = fs.readFileSync(path.join(ROOT, 'web/src/config/suggestions.ts'), 'utf8');
const suggestions = LANGS.flatMap((l) => JSON.parse(sug.match(new RegExp(`\\n  ${l}: (\\[[^\\n]*\\]),`))[1].replace(/'/g, '"')).map((q) => ({ q, lang: l })));
const starter = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/config/starter-path.json'), 'utf8')).steps.flatMap((s) => LANGS.map((l) => ({ q: s.q[l], lang: l })));
const official = fs.readFileSync(path.join(ROOT, 'eval/official12.v1.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).map((c) => ({ q: c.q, lang: c.lang }));
const readme = [
  { q: 'ما أركان الإسلام؟', lang: 'ar' },
  { q: 'What are the pillars of Islam?', lang: 'en' },
  { q: 'كيف أتوضأ؟', lang: 'ar' },
  { q: 'ما شروط الصلاة؟', lang: 'ar' },
];
const seen = new Set();
const all = [...suggestions, ...starter, ...official, ...readme].filter(({ q, lang }) => q && !seen.has(`${lang}|${q}`) && seen.add(`${lang}|${q}`));
console.log(`${all.length} questions (${suggestions.length} suggested, ${starter.length} starter path, ${official.length} official, ${readme.length} README; duplicates removed), one every ${(60 / PER_MINUTE).toFixed(1)} s`);
if (argv.includes('--dry-run')) process.exit(0);

const tally = {};
for (const [i, { q, lang }] of all.entries()) {
  const t0 = Date.now();
  const r = await fetch(`${BASE}/api/ask`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q, lang }) });
  const b = await r.json().catch(() => ({ type: `http_${r.status}` }));
  const kind = b.type === 'answer' ? (b.fromCache ? 'answer (cache)' : 'answer (new)') : b.type === 'error' ? `error:${b.code}` : b.type;
  tally[kind] = (tally[kind] ?? 0) + 1;
  console.log(`${i + 1}/${all.length} ${lang} ${q.slice(0, 50)} → ${kind}${b.level ? ` ${b.level}` : ''}`);
  // Only calls that may have reached the model use the minute's budget; cached and gate answers go straight on.
  if (kind !== 'answer (cache)' && kind !== 'referral') await new Promise((res) => setTimeout(res, Math.max(0, (60_000 / PER_MINUTE) - (Date.now() - t0))));
}
console.log(JSON.stringify(tally));

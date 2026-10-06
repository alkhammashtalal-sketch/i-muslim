// Publish the reviewed aligned translations of al-Muyassar (command 21) as static files, and only those that passed:
// the structural guard (eval/explain-aligned.mjs, "rejected" empty) AND the independent review (the verdicts file).
//
//   node scripts/explain/publish-reviewed.mjs --verdicts <file> [--from eval/reports/explain-aligned-<date>.jsonl] [--dry-run]
//
// Verdicts: JSON or JSONL, one entry per (id, lang), in any of these forms:
//   { "id": "quran:2:255", "lang": "en", "verdict": "pass" | "fail" | "ناجح" | "راسب" }   or   { …, "pass": true }
//   or { "pass": ["quran:2:255|en", …] }
// Writes web/public/explain/{lang}/{S}_{A}.json = { id, lang, text, sentences, label: "reviewed-mt", reviewed_at,
// reviewer }, after emptying web/public/explain/ (a translation withdrawn from the verdicts is removed). The app shows
// «اشرح لي بلغتي» only where such a file exists (web/src/quran/reviewed.ts).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const argv = process.argv.slice(2);
const opt = (k) => (argv.includes(`--${k}`) ? argv[argv.indexOf(`--${k}`) + 1] : undefined);
const DRY = argv.includes('--dry-run');
const verdictsFile = opt('verdicts');
if (!verdictsFile) throw new Error('--verdicts <file>: the independent review');
const from = path.resolve(ROOT, opt('from') ?? fs.readdirSync(path.join(ROOT, 'eval/reports')).filter((f) => /^explain-aligned-\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)).sort().map((f) => `eval/reports/${f}`).at(-1));
const REVIEWED_AT = opt('reviewed-at') ?? '2026-10-06';

const rows = fs.readFileSync(from, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const raw = fs.readFileSync(path.resolve(ROOT, verdictsFile), 'utf8').trim();
const parsed = raw.startsWith('[') || raw.startsWith('{') ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : null;
const entries = parsed ?? raw.split('\n').filter(Boolean).map((l) => JSON.parse(l));
const passed = new Set();
const PASS = new Set(['pass', 'passed', 'ok', 'ناجح', 'نجح']);
if (!Array.isArray(entries) && Array.isArray(entries.pass)) for (const k of entries.pass) passed.add(k);
else for (const e of entries) if (e.pass === true || PASS.has(String(e.verdict ?? '').toLowerCase())) passed.add(`${e.id}|${e.lang}`);

const out = path.join(ROOT, 'web/public/explain');
const publish = rows.filter((r) => !r.rejected && Array.isArray(r.sentences) && passed.has(`${r.id}|${r.lang}`));
const notInRows = [...passed].filter((k) => !rows.some((r) => `${r.id}|${r.lang}` === k));
const guardOut = [...passed].filter((k) => rows.some((r) => `${r.id}|${r.lang}` === k && r.rejected));
if (!DRY) {
  fs.rmSync(out, { recursive: true, force: true });
  for (const r of publish) {
    const [, s, a] = r.id.split(':');
    const dir = path.join(out, r.lang);
    fs.mkdirSync(dir, { recursive: true });
    const sentences = r.sentences.map((x) => x.trim());
    fs.writeFileSync(
      path.join(dir, `${s}_${a}.json`),
      JSON.stringify({ id: r.id, lang: r.lang, text: sentences.join(' '), sentences, label: 'reviewed-mt', reviewed_at: REVIEWED_AT, reviewer: 'independent model review' }) + '\n',
    );
  }
}
const byLang = {};
for (const r of publish) byLang[r.lang] = (byLang[r.lang] ?? 0) + 1;
console.log(`${DRY ? '(dry run) ' : ''}published ${publish.length} of ${rows.length} (passed review: ${passed.size}); per language ${JSON.stringify(byLang)}`);
if (guardOut.length) console.log(`passed review but refused by the structural guard, not published: ${guardOut.join(', ')}`);
if (notInRows.length) console.log(`in the verdicts but not in ${path.relative(ROOT, from)}: ${notInRows.join(', ')}`);

// Load the translations of the meanings into D1's ayah_translations, as one SQL file of multi-row INSERT OR REPLACE
// statements: data/processed/meanings.jsonl (QuranEnc and the Ayat archive, scripts/ingest/quranenc-build.mjs; with
// version, footnotes and source_key, migration 0007) when present, else ayah_translations.jsonl (ksu-build.mjs):
//
//   node scripts/index/load-translations.mjs            writes data/processed/ayah_translations.sql
//   cd worker && npx wrangler d1 execute imuslim --remote --file ../data/processed/ayah_translations.sql
//
// 43,652 rows (7 × 6,236), written once; reads by primary key afterwards.
//
// The 28 languages of add-on 0072-add60 §7 alone (data/processed/meanings-add60.jsonl, quranenc-build.mjs), so the 29
// already on the database are not written again (174,608 rows):
//   node scripts/index/load-translations.mjs --add60    writes data/processed/ayah_translations-add60.sql
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const ADD60 = process.argv.includes('--add60');
const MEANINGS = path.join(ROOT, ADD60 ? 'data/processed/meanings-add60.jsonl' : 'data/processed/meanings.jsonl');
if (ADD60 && !fs.existsSync(MEANINGS)) throw new Error('data/processed/meanings-add60.jsonl is missing: run scripts/ingest/quranenc-build.mjs');
const v7 = fs.existsSync(MEANINGS);
const rows = fs.readFileSync(v7 ? MEANINGS : path.join(ROOT, 'data/processed/ayah_translations.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const n = (x) => (x == null ? 'NULL' : q(x));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const out = [];
for (let i = 0; i < rows.length; i += 40) {
  const chunk = rows.slice(i, i + 40);
  out.push(
    v7
      ? `INSERT OR REPLACE INTO ayah_translations (lang, sura, aya, text, translator, version, footnotes, source_key) VALUES\n${chunk.map((r) => `(${q(r.lang)}, ${r.sura}, ${r.aya}, ${q(r.text)}, ${q(r.translator)}, ${n(r.version)}, ${n(r.footnotes)}, ${n(r.source_key)})`).join(',\n')};`
      : `INSERT OR REPLACE INTO ayah_translations (lang, sura, aya, text, translator) VALUES\n${chunk.map((r) => `(${q(r.lang)}, ${r.sura}, ${r.aya}, ${q(r.text)}, ${q(r.translator)})`).join(',\n')};`,
  );
}
const file = path.join(ROOT, ADD60 ? 'data/processed/ayah_translations-add60.sql' : 'data/processed/ayah_translations.sql');
fs.writeFileSync(file, out.join('\n') + '\n');
const byLang = {};
for (const r of rows) byLang[r.lang] = (byLang[r.lang] ?? 0) + 1;
console.log(`${rows.length} rows ${JSON.stringify(byLang)} → ${path.relative(ROOT, file)} (${(fs.statSync(file).size / 1e6).toFixed(1)} MB, ${out.length} statements)`);

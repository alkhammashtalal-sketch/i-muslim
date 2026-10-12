// Load the translations of the meanings into D1's ayah_translations, as one SQL file of multi-row INSERT OR REPLACE
// statements: data/processed/meanings.jsonl (QuranEnc and the Ayat archive, scripts/ingest/quranenc-build.mjs; with
// version, footnotes and source_key, migration 0007) when present, else ayah_translations.jsonl (ksu-build.mjs):
//
//   node scripts/index/load-translations.mjs            writes data/processed/ayah_translations.sql
//   cd worker && npx wrangler d1 execute imuslim --remote --file ../data/processed/ayah_translations.sql
//
// 43,652 rows (7 × 6,236), written once; reads by primary key afterwards.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const MEANINGS = path.join(ROOT, 'data/processed/meanings.jsonl');
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
const file = path.join(ROOT, 'data/processed/ayah_translations.sql');
fs.writeFileSync(file, out.join('\n') + '\n');
const byLang = {};
for (const r of rows) byLang[r.lang] = (byLang[r.lang] ?? 0) + 1;
console.log(`${rows.length} rows ${JSON.stringify(byLang)} → ${path.relative(ROOT, file)} (${(fs.statSync(file).size / 1e6).toFixed(1)} MB, ${out.length} statements)`);

// Load the translations of the meanings (data/processed/ayah_translations.jsonl, from scripts/ingest/ksu-build.mjs)
// into D1's ayah_translations (migration 0005), as one SQL file of multi-row INSERT OR REPLACE statements:
//
//   node scripts/index/load-translations.mjs            writes data/processed/ayah_translations.sql
//   cd worker && npx wrangler d1 execute imuslim --remote --file ../data/processed/ayah_translations.sql
//
// 43,652 rows (7 × 6,236), written once; reads by primary key afterwards.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const rows = fs.readFileSync(path.join(ROOT, 'data/processed/ayah_translations.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const out = [];
for (let i = 0; i < rows.length; i += 40) {
  const chunk = rows.slice(i, i + 40);
  out.push(`INSERT OR REPLACE INTO ayah_translations (lang, sura, aya, text, translator) VALUES\n${chunk.map((r) => `(${q(r.lang)}, ${r.sura}, ${r.aya}, ${q(r.text)}, ${q(r.translator)})`).join(',\n')};`);
}
const file = path.join(ROOT, 'data/processed/ayah_translations.sql');
fs.writeFileSync(file, out.join('\n') + '\n');
const byLang = {};
for (const r of rows) byLang[r.lang] = (byLang[r.lang] ?? 0) + 1;
console.log(`${rows.length} rows ${JSON.stringify(byLang)} → ${path.relative(ROOT, file)} (${(fs.statSync(file).size / 1e6).toFixed(1)} MB, ${out.length} statements)`);

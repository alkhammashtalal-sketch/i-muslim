// Runs the five probe questions against GET /api/search and writes data/processed/search_test.md.
//
//   WORKER_URL=... node scripts/index/search-test.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const { WORKER_URL } = process.env;
if (!WORKER_URL) throw new Error('Set WORKER_URL');
const QUESTIONS = ['ما أركان الإسلام', 'كيف أتوضأ', 'ما معنى التوحيد', 'What is zakat', 'صيام رمضان'];
const cut = (t, n = 140) => t.replace(/\s+/g, ' ').slice(0, n) + (t.length > n ? '…' : '');

const L = ['# نتائج البحث التجريبي (`/api/search`)', '', `تشغيل ${new Date().toISOString()}`, ''];
for (const q of QUESTIONS) {
  const res = await fetch(`${WORKER_URL.replace(/\/$/, '')}/api/search?q=${encodeURIComponent(q)}`);
  const r = await res.json();
  if (!r.ok) throw new Error(`${q}: ${JSON.stringify(r)}`);
  L.push(`## «${q}»`, '', `استعلام FTS: \`${r.fts_query ?? '—'}\``, '', '**Vectorize (أفضل 5)**', '');
  r.vector.forEach((h, i) => L.push(`${i + 1}. [${h.ref}](${h.url}) — ${h.score} — ${cut(h.text)}`));
  L.push('', '**FTS5 (أفضل 5)**', '');
  if (!r.keyword.length) L.push('لا نتائج.');
  r.keyword.forEach((h, i) => L.push(`${i + 1}. [${h.ref}](${h.url}) — ${h.rank} — ${cut(h.text)}`));
  L.push('');
  console.log(`${q}\n  V: ${r.vector.map((h) => h.ref).join(' | ')}\n  K: ${r.keyword.map((h) => h.ref).join(' | ')}`);
}
fs.writeFileSync(path.join(ROOT, 'data/processed/search_test.md'), L.join('\n'));

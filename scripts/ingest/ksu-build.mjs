// [أ] Builds data/processed/quran.jsonl (one record per ayah, 6,236) from the official KSU files
// fetched by ksu-fetch.mjs. Source fields are copied byte-for-byte; only text_search is normalized.
//
//   node scripts/ingest/ksu-build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { normalizeArabic, stripTags } from './lib/normalize.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const RAW = path.join(ROOT, 'data/raw/ksu');
const OUT = path.join(ROOT, 'data/processed/quran.jsonl');

// Ayah page on the site itself: shows the ayah (Uthmani) with Al-Saadi's tafsir for that ayah.
export const ayahUrl = (s, a) => `https://quran.ksu.edu.sa/tafseer/saadi/sura${s}-aya${a}.html`;
// Sahih International page on the site (one page per mushaf page).
export const enUrl = (page) => `https://quran.ksu.edu.sa/translations/english/${page}.html`;

const rows = (file, table) =>
  new DatabaseSync(path.join(RAW, file), { readOnly: true })
    .prepare(`select * from ${table} order by sura, aya`)
    .all();
const byKey = (list) => new Map(list.map((r) => [`${r.sura}:${r.aya}`, r]));

// Sura names: QuranData.Sura in the app's lib/quran-data.js (shipped inside the official KSU package).
const js = fs.readFileSync(path.join(RAW, 'app/lib/quran-data.js'), 'utf8');
const suraBlock = js.slice(js.indexOf('QuranData.Sura = ['), js.indexOf('];', js.indexOf('QuranData.Sura = [')));
const suraNames = [...suraBlock.matchAll(/\[\s*\d+,\s*\d+,\s*\d+,\s*\d+,\s*'([^']+)'/g)].map((m) => m[1]);
if (suraNames.length !== 114) throw new Error(`expected 114 sura names, got ${suraNames.length}`);

const quran = rows('app/resources/ayat.ayt', 'ayat');
const muyassar = byKey(rows('tarajem/ar_muyassar.ayt', 'ar_muyassar'));
const saadi = byKey(rows('tafasir/sa3dy.ayt', 'sa3dy'));
const sahih = byKey(rows('tarajem/en_sahih.ayt', 'en_sahih'));

const EMPTY_SAADI = '<p></p>';
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const out = fs.createWriteStream(OUT);
let n = 0;
for (const q of quran) {
  const key = `${q.sura}:${q.aya}`;
  const sa = saadi.get(key)?.text ?? null;
  const rec = {
    id: `quran:${key}`,
    source: 'ksu',
    kind: 'ayah',
    sura: q.sura,
    aya: q.aya,
    page: q.safha,
    sura_name: suraNames[q.sura - 1],
    ref: `${suraNames[q.sura - 1]}: ${q.aya}`,
    url: ayahUrl(q.sura, q.aya),
    url_en: enUrl(q.safha),
    text: q.text,
    text_en: sahih.get(key)?.text ?? null,
    muyassar: muyassar.get(key)?.text ?? null,
    // As stored by KSU (HTML paragraph tags included). The file gives one entry per ayah;
    // 50 ayahs have an empty entry in the source itself (also empty on the site) — kept empty, never inferred.
    saadi: sa,
    saadi_range: `${key}-${key}`,
    saadi_empty_in_source: sa === EMPTY_SAADI,
    text_search: normalizeArabic(q.text),
  };
  rec.embed_text = [rec.text, rec.muyassar, rec.text_en].filter(Boolean).join('\n');
  out.write(JSON.stringify(rec) + '\n');
  n++;
}
out.end();
console.log(`wrote ${n} records → data/processed/quran.jsonl`);

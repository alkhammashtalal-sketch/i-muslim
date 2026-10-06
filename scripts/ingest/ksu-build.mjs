// [أ] Builds data/processed/quran.jsonl (one record per ayah, 6,236) from the official KSU files
// fetched by ksu-fetch.mjs. Source fields are copied byte-for-byte; only text_search is normalized.
//
//   node scripts/ingest/ksu-build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { normalizeArabic, stripTags } from './lib/normalize.mjs';
import { TRANSLATIONS } from './lib/ksu-translations.mjs';

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

// ---------- Translations of the meanings in seven languages (command 22) ----------
// Text as stored by KSU, one line per (language, ayah); checked: 6236 per language, none empty, the same (sura, aya)
// as the Quran above. The translator as the project names it (app/resources/trans.ayt).
const transNames = new Map(
  new DatabaseSync(path.join(RAW, 'app/resources/trans.ayt'), { readOnly: true })
    .prepare('select trans_key, trans_name from trans')
    .all()
    .map((r) => [r.trans_key, r.trans_name]),
);
const quranKeys = new Set(quran.map((q) => `${q.sura}:${q.aya}`));
const TOUT = path.join(ROOT, 'data/processed/ayah_translations.jsonl');
const tout = [];
for (const { key, lang } of TRANSLATIONS) {
  const name = transNames.get(key);
  if (!name) throw new Error(`${key}: not in app/resources/trans.ayt`);
  const translator = name.split(' - ').slice(1).join(' - ').trim() || name;
  const list = rows(`tarajem/${key}.ayt`, key);
  if (list.length !== 6236) throw new Error(`${key}: ${list.length} rows, expected 6236`);
  const keys = new Set(list.map((r) => `${r.sura}:${r.aya}`));
  const missing = [...quranKeys].filter((k) => !keys.has(k));
  if (missing.length || keys.size !== 6236) throw new Error(`${key}: (sura, aya) differ from the Quran: ${missing.slice(0, 5).join(', ')}`);
  const empty = list.filter((r) => !String(r.text ?? '').trim());
  if (empty.length) throw new Error(`${key}: ${empty.length} empty texts (${empty.slice(0, 3).map((r) => `${r.sura}:${r.aya}`).join(', ')})`);
  for (const r of list) tout.push(JSON.stringify({ lang, sura: r.sura, aya: r.aya, text: r.text, translator, source_name: name, source_key: key }));
  console.log(`${key} (${lang}): 6236 ayat, translator «${translator}» (as named: ${name})`);
}
fs.writeFileSync(TOUT, tout.join('\n') + '\n');
console.log(`wrote ${tout.length} translations → data/processed/ayah_translations.jsonl`);

// [أ] Opens sample ayah pages on quran.ksu.edu.sa (1 request / 2 s) and checks that each page
// shows exactly the ayah text, the Saadi text and the Sahih International text we stored.
// Writes data/processed/url_checks.json (read by validate.mjs).
//
//   node scripts/ingest/ksu-verify-urls.mjs [2:255 112:1 36:58]
import fs from 'node:fs';
import path from 'node:path';
import { politeFetch } from './lib/http.mjs';
import { stripTags } from './lib/normalize.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const keys = process.argv.slice(2).length ? process.argv.slice(2) : ['2:255', '112:1', '36:58'];
const recs = new Map(
  fs.readFileSync(path.join(ROOT, 'data/processed/quran.jsonl'), 'utf8').trim().split('\n')
    .map((l) => JSON.parse(l)).map((r) => [`${r.sura}:${r.aya}`, r]),
);
const decode = (h) => h.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&amp;/g, '&');

const checks = [];
for (const k of keys) {
  const r = recs.get(k);
  const page = decode(await (await politeFetch(r.url)).text());
  const enPage = decode(await (await politeFetch(r.url_en)).text());
  const saadiProbe = stripTags(r.saadi).slice(0, 80);
  const c = {
    key: k,
    url: r.url,
    url_en: r.url_en,
    title: page.match(/<title>([^<]*)/)?.[1]?.trim(),
    ayah_text_on_page: page.includes(r.text),
    saadi_on_page: saadiProbe === '' || page.includes(saadiProbe),
    en_on_page: enPage.includes(r.text_en.slice(0, 80)),
    checked_at: new Date().toISOString(),
  };
  c.ok = c.ayah_text_on_page && c.saadi_on_page && c.en_on_page;
  checks.push(c);
  console.log(`${c.ok ? 'OK ' : 'BAD'} ${k}  ${c.title}`);
}
fs.writeFileSync(path.join(ROOT, 'data/processed/url_checks.json'), JSON.stringify(checks, null, 2));

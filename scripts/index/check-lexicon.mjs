// Proves every lexicon target exists in our fixed sources (command 05). Exits 1 if any is missing.
//   node scripts/index/check-lexicon.mjs
// Arabic targets are searched in the Quran text, al-Muyassar, al-Saadi (HTML removed) and the creed books;
// English targets in the Sahih International meanings. Same tokenizer as the search index.
import fs from 'node:fs';
import path from 'node:path';
import { stripTags, tokenize } from '../../worker/src/lib/normalize.ts';

const ROOT = path.resolve(import.meta.dirname, '../..');
const P = path.join(ROOT, 'data/processed');
const read = (f) =>
  fs.readFileSync(path.join(P, f), 'utf8').trim().split('\n').map((l) => JSON.parse(l));

const quran = read('quran.jsonl');
const aqeedah = read('aqeedah.jsonl');
const join = (texts) => ` ${texts.map((t) => tokenize(t ?? '').join(' ')).join(' | ')} `;
const corpus = {
  ar: join([...quran.flatMap((r) => [r.text, r.muyassar, stripTags(r.saadi ?? '')]), ...aqeedah.map((r) => r.text)]),
  en: join(quran.map((r) => r.text_en)),
};

let failed = 0;
for (const [lang, file] of [['ar', 'lexicon.ar.json'], ['en', 'lexicon.en.json'], ['ar', 'lexicon.multi.json']]) {
  const lex = JSON.parse(fs.readFileSync(path.join(ROOT, 'worker/src/config', file), 'utf8'));
  let targets = 0;
  for (const e of lex.entries) {
    if (!e.topic || !e.when?.length || !e.add?.length) {
      console.error(`${file}: malformed entry ${JSON.stringify(e)}`);
      failed++;
    }
    for (const t of e.add) {
      targets++;
      const n = tokenize(t).join(' ');
      if (!n || !corpus[lang].includes(` ${n} `)) {
        console.error(`${file}: [${e.topic}] target not found in sources: «${t}»`);
        failed++;
      }
    }
  }
  console.log(`${file}: ${lex.entries.length} entries, ${targets} targets checked`);
  if (lex.entries.length > 150) {
    console.error(`${file}: more than 150 entries`);
    failed++;
  }
}
if (failed) {
  console.error(`FAILED: ${failed} problem(s)`);
  process.exit(1);
}
console.log('OK: every lexicon target occurs in the fixed sources');

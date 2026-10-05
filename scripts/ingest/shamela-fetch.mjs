// [ج] Reads the chosen books page by page from shamela.ws (no official per-book download exists;
// shamela.ws has no robots.txt). One request every 2 seconds, these books only.
// Saves raw HTML to data/raw/shamela/<bookId>/ (index.html + <pageId>.html). Resumable.
//
//   node scripts/ingest/shamela-fetch.mjs
import fs from 'node:fs';
import path from 'node:path';
import { politeFetch } from './lib/http.mjs';
import { SHAMELA_BOOKS } from './shamela-books.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const RAW = path.join(ROOT, 'data/raw/shamela');

async function get(url, file) {
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  const html = await (await politeFetch(url)).text();
  fs.writeFileSync(file, html);
  return html;
}

for (const { bookId } of SHAMELA_BOOKS) {
  const dir = path.join(RAW, String(bookId));
  fs.mkdirSync(dir, { recursive: true });
  await get(`https://shamela.ws/book/${bookId}`, path.join(dir, 'index.html'));
  let id = 1;
  let n = 0;
  while (id) {
    const html = await get(`https://shamela.ws/book/${bookId}/${id}`, path.join(dir, `${id}.html`));
    if (!html.includes('class="nass')) throw new Error(`no text block on book ${bookId} page ${id}`);
    n++;
    id = Number(html.match(/id="bu_load_next" data-next-id="(\d+)"/)?.[1]) || 0;
  }
  console.log(`book ${bookId}: ${n} pages`);
}
fs.writeFileSync(path.join(RAW, 'FETCHED_AT.txt'), new Date().toISOString() + '\n');

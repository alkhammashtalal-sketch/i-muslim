// [ج] Builds data/processed/aqeedah.jsonl from the raw shamela pages (shamela-fetch.mjs).
// Each record = consecutive paragraphs of one chapter, up to ~300 words. Paragraph text is taken
// verbatim from the page (tags removed, entities decoded); nothing is reworded or normalized.
// Shamela's own bracketed headings (e.g. "[باب ...]") become `chapter`, not text.
// Editor footnotes (p.hamesh) are kept separately in `footnotes`.
//
//   node scripts/ingest/shamela-build.mjs
import fs from 'node:fs';
import path from 'node:path';
import { SHAMELA_BOOKS } from './shamela-books.mjs';
import { normalizeArabic } from './lib/normalize.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
const RAW = path.join(ROOT, 'data/raw/shamela');
const OUT = path.join(ROOT, 'data/processed/aqeedah.jsonl');
const MAX_WORDS = 300;
const SLUG = { 'الأصول الثلاثة': 'usul', 'شروط الصلاة وأركانها': 'shurut', 'القواعد الأربع': 'qawaid', 'كتاب التوحيد': 'tawhid' };

const decode = (s) =>
  s.replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d)).replace(/&amp;/g, '&');
const htmlToText = (h) =>
  decode(h.replace(/<a [^>]*class="btn_tag[^"]*"[^>]*>.*?<\/a>/gs, '').replace(/<br\s*\/?>/g, '\n').replace(/<[^>]+>/g, ''))
    .split('\n').map((l) => l.trim()).join('\n').trim();
const words = (s) => s.split(/\s+/).filter(Boolean).length;
const hasLetters = (s) => /[ء-ي]/.test(s);

function parsePage(html) {
  const m = html.match(/<div class="nass[^"]*" data-page-id="(\d+)" data-page-num="([^"]*)">([\s\S]*?)<div id="appended_pages"/);
  const body = m[3];
  const paras = [];
  for (const pm of body.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    const inner = pm[1];
    const anchor = inner.match(/id="(p\d+)"/)?.[1];
    const text = htmlToText(inner);
    // A paragraph that is only a shamela heading span: [..] or [[..]]
    const heading = /^<span[^>]*class="anchor"[^>]*><\/span><span class="c4">\[+[^<]*\]?<\/span>\]?(<a |$)/.test(inner.trim()) && /^\[+.*\]+$/.test(text);
    paras.push({ anchor, text, heading });
  }
  const footnotes = [...body.matchAll(/<p class="hamesh">([\s\S]*?)<\/p>/g)].map((f) => htmlToText(f[1])).join('\n');
  return { pageId: +m[1], pageNum: m[2], paras, footnotes };
}

const toc = (bookId) => {
  const h = fs.readFileSync(path.join(RAW, String(bookId), 'index.html'), 'utf8');
  const top = h.slice(h.indexOf('betaka-index'));
  return [...top.matchAll(new RegExp(`href="https://shamela.ws/book/${bookId}/(\\d+)"[^>]*>([^<]*)</a>`, 'g'))]
    .map((m) => ({ pageId: +m[1], title: m[2].trim() }));
};

const out = [];
for (const book of SHAMELA_BOOKS) {
  const dir = path.join(RAW, String(book.bookId));
  const ids = fs.readdirSync(dir).filter((f) => /^\d+\.html$/.test(f)).map((f) => +f.slice(0, -5)).sort((a, b) => a - b);
  const entries = toc(book.bookId);
  const sectionOf = (pid) => {
    if (book.sections['*']) return book.sections['*'];
    const e = entries.filter((x) => x.pageId <= pid).at(-1);
    return e && book.sections[e.title];
  };
  const chapterOf = (pid) => entries.filter((x) => x.pageId <= pid).at(-1)?.title;

  let cur = null;
  const counters = {};
  const flush = () => {
    if (!cur || !cur.paras.length) return (cur = cur && { ...cur, paras: [], pages: [], footnotes: [] });
    const slug = SLUG[cur.bookName];
    counters[slug] = (counters[slug] || 0) + 1;
    const p0 = cur.pages[0], p1 = cur.pages.at(-1);
    const pageLabel = p0.num === p1.num ? p0.num : `${p0.num}–${p1.num}`;
    const text = cur.paras.join('\n');
    out.push({
      id: `aqeedah:${slug}:${String(counters[slug]).padStart(3, '0')}`,
      source: 'shamela',
      kind: 'aqeedah',
      book: cur.bookName,
      chapter: cur.chapter,
      page: +p0.num,
      page_end: +p1.num,
      ref: `${cur.bookName} – ص ${pageLabel}`,
      url: `https://shamela.ws/book/${book.bookId}/${p0.id}${p0.anchor ? '#' + p0.anchor : ''}`,
      shamela_book_id: book.bookId,
      edition: book.edition,
      text,
      footnotes: [...new Set(cur.footnotes)].join('\n') || null,
      text_search: normalizeArabic(text),
      embed_text: `${cur.bookName} – ${cur.chapter}\n${text}`,
    });
    cur = { ...cur, paras: [], pages: [], footnotes: [] };
  };

  for (const id of ids) {
    const bookName = sectionOf(id);
    if (!bookName) { flush(); cur = null; continue; }
    const pg = parsePage(fs.readFileSync(path.join(dir, `${id}.html`), 'utf8'));
    if (!cur || cur.bookName !== bookName) { flush(); cur = { bookName, chapter: book.sections['*'] ? chapterOf(id) : bookName, paras: [], pages: [], footnotes: [] }; }
    // Whole-book sources: chapters follow shamela's TOC. On a TOC page, each paragraph that opens
    // with "باب" starts the next TOC chapter listed for that page (or the page start if none does).
    const pageChapters = book.sections['*'] ? entries.filter((e) => e.pageId === id).map((e) => e.title) : [];
    if (pageChapters.length && !pg.paras.some((p) => /^باب/.test(p.text))) { flush(); cur.chapter = pageChapters.shift(); }
    for (const p of pg.paras) {
      if (pageChapters.length && /^باب/.test(p.text)) { flush(); cur.chapter = pageChapters.shift(); }
      if (p.heading) {
        flush();
        cur.chapter = p.text.replace(/^\[+|\]+$/g, '').trim();
        continue;
      }
      if (!hasLetters(p.text)) continue; // e.g. a lone "..." separator
      if (cur.paras.length && words(cur.paras.join(' ')) + words(p.text) > MAX_WORDS) flush();
      if (!cur.pages.length || cur.pages.at(-1).id !== pg.pageId) cur.pages.push({ id: pg.pageId, num: pg.pageNum, anchor: p.anchor });
      if (pg.footnotes) cur.footnotes.push(pg.footnotes);
      cur.paras.push(p.text);
    }
  }
  flush();
}
fs.writeFileSync(OUT, out.map((r) => JSON.stringify(r)).join('\n') + '\n');
const per = out.reduce((a, r) => ((a[r.book] = (a[r.book] || 0) + 1), a), {});
console.log(`wrote ${out.length} records → data/processed/aqeedah.jsonl`, per);

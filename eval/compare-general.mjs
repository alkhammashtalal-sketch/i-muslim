// Comparison with a general model that has no sources: the same model (llm.json), asked with no passages.
//
//   WORKER_URL=… ADMIN_TOKEN=… node eval/compare-general.mjs [--n 20] [--tag run1]
//   WORKER_URL=… node eval/compare-general.mjs --rejudge eval/reports/compare-general-<date>-run1.json
//     (judges the saved general answers again with the current rules and rewrites that report; no model call)
//
// Needs the Worker with ADMIN_ENABLED=true and LLM_MODE=live (a `wrangler dev --remote` preview), because the
// general answer is asked through POST /api/admin/general (the model is reached only from the Worker). For the
// first N level A/B questions with an expected answer in eval/questions.v1.jsonl (synthetic), it stores:
//   general: the model answering on its own ("answer and cite your source"), with no passages;
//   ours:    POST /api/ask with the default model settings, bypassing the answer cache (body.llm = {}, honoured
//            only with the admin routes open), so each repeated run calls the model again.
// And measures, automatically:
//   - cites a reference (Quran sura/ayah, or a hadith collection with a number);
//   - the Quran references exist in our fixed sources (looked up by /api/passage), hadith references are
//     reported separately (hadith is not ingested yet, so none can be checked);
//   - misattributed text: a quoted span («…», ﴿…﴾, "…", one line, no markdown) followed directly by a Quran
//     reference (within 60 characters, no hadith reference between), whose letters do not occur in that ayah's
//     text in D1. Letters are compared as a skeleton (normalized, without alef/hamza/waw forms, ى→ي, ة→ه), so
//     Uthmani and common spellings of the same ayah match (الصلوٰة / الصلاة). A quote with no reference right
//     after it, or whose next reference introduces another quote ("(الآية 99):"), is not judged (no guessing);
//   - for ours: every quote is verified, and every quote text equals /api/passage byte for byte.
// Writes eval/reports/compare-general-<date>.md and .json.
import fs from 'node:fs';
import path from 'node:path';
import { normalizeArabic } from '../worker/src/lib/normalize.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => (x.startsWith('--') ? [...a, [x.slice(2), all[i + 1]]] : a), []));
const N = Number(args.n ?? 20);
const { WORKER_URL, ADMIN_TOKEN } = process.env;
if (!WORKER_URL || (!ADMIN_TOKEN && !args.rejudge)) {
  console.error('Set WORKER_URL and ADMIN_TOKEN (the Worker must run with ADMIN_ENABLED=true for this run only).');
  process.exit(1);
}
const base = WORKER_URL.replace(/\/$/, '');
const auth = { authorization: `Bearer ${ADMIN_TOKEN}` };

const questions = fs
  .readFileSync(path.join(ROOT, 'eval/questions.v1.jsonl'), 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))
  .filter((q) => q.expected_behavior === 'answer' && ['A', 'B'].includes(q.expected_level))
  .slice(0, N);

const norm = (s) => normalizeArabic(s).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
const stripAl = (s) => norm(s).replace(/^و(?=ال)/, '').replace(/^سوره\s+/, '').replace(/^ال\s*/, '').trim();

// Sura names from our own data (/api/suras), so "سورة البقرة 183" maps to quran:2:183.
const suras = await (await fetch(`${base}/api/suras`)).json();
const suraByName = new Map(suras.map((s) => [stripAl(s.name), s.n]));

const passageCache = new Map();
async function passageText(id) {
  if (!passageCache.has(id)) {
    const r = await fetch(`${base}/api/passage/${encodeURIComponent(id)}`);
    passageCache.set(id, r.ok ? (await r.json()).text : null);
  }
  return passageCache.get(id);
}

/** Quran references as { id, at } (position in the text): numeric (2:183) or a sura name before a number
 *  ("سورة البقرة آية 183", "البقرة: 183", "آل عمران 19"), names matched against our own sura list. */
const FILLER = new Set(['ايه', 'الايه', 'اية', 'الاية', 'رقم', 'سوره', 'من']);
function quranRefs(text) {
  const out = [];
  for (const m of text.matchAll(/\b(\d{1,3})\s*[:：]\s*(\d{1,3})\b/g)) out.push({ id: `quran:${Number(m[1])}:${Number(m[2])}`, at: m.index });
  for (const m of text.matchAll(/(\d{1,3})/g)) {
    const words = norm(text.slice(Math.max(0, m.index - 60), m.index)).split(' ').filter(Boolean);
    while (words.length && FILLER.has(words.at(-1))) words.pop();
    for (const k of [2, 1]) {
      if (words.length < k) continue
      const n = suraByName.get(stripAl(words.slice(-k).join(' ')));
      if (n) {
        out.push({ id: `quran:${n}:${Number(m[1])}`, at: m.index });
        break;
      }
    }
  }
  return out;
}
const hadithRefs = (text) => [...text.matchAll(/(البخاري|مسلم|Bukhari|Muslim|الترمذي|أبو داود|النسائي|ابن ماجه)[^\d\n]{0,25}(\d{1,5})/g)].map((m) => `${m[1]} ${m[2]}`);
const quotes = (text) =>
  [...text.matchAll(/[«﴿"“]([^»﴾"”\n]{6,400})[»﴾"”]/g)]
    .filter((m) => !/[*>]/.test(m[1]))
    .map((m) => ({ text: m[1], at: m.index, end: m.index + m[0].length }));
const skeleton = (s) => normalizeArabic(s).replace(/[^\p{L}]/gu, '').replace(/[اأإآٱءؤئو]/g, '').replace(/ى/g, 'ي').replace(/ة/g, 'ه');
const HADITH_REF = /(البخاري|مسلم|Bukhari|Muslim|الترمذي|أبو داود|النسائي|ابن ماجه|رواه)/;

async function judgeGeneral(text) {
  const refs = quranRefs(text);
  const existing = [];
  for (const r of refs) if ((await passageText(r.id)) !== null) existing.push(r.id);
  const misattributed = [];
  let judged = 0;
  for (const q of quotes(text)) {
    // The first reference after the quote, unless it introduces the next quote ("…" وفي سورة يونس (الآية 99): "…").
    const after = refs.filter((r) => r.at >= q.end && r.at - q.end <= 60).sort((a, b) => a.at - b.at)[0];
    if (after && /^\d+\s*[)\]]?\s*:/.test(text.slice(after.at))) continue;
    if (!after || HADITH_REF.test(text.slice(q.end, after.at))) continue;
    const d1 = await passageText(after.id);
    // "…" inside a quote marks an omission: every part must occur in the ayah.
    const parts = q.text.split(/\.\.\.|…/).map(skeleton).filter((x) => x.length >= 3);
    if (parts.length) judged++;
    if (d1 && parts.length && !parts.every((x) => skeleton(d1).includes(x))) misattributed.push({ ref: after.id, quoted: q.text.slice(0, 120) });
  }
  return {
    citesReference: refs.length + hadithRefs(text).length > 0,
    quranRefs: [...new Set(refs.map((r) => r.id))],
    quranRefsInSources: [...new Set(existing)],
    hadithRefs: hadithRefs(text),
    quotesJudged: judged,
    misattributed,
  };
}

const rows = [];
if (args.rejudge) {
  for (const r of JSON.parse(fs.readFileSync(path.resolve(ROOT, args.rejudge), 'utf8'))) {
    rows.push({ ...r, general: r.general.error ? r.general : { text: r.general.text, ...(await judgeGeneral(r.general.text)) } });
  }
}
for (const q of args.rejudge ? [] : questions) {
  const g = await (await fetch(`${base}/api/admin/general`, { method: 'POST', headers: { 'content-type': 'application/json', ...auth }, body: JSON.stringify({ q: q.q }) })).json();
  const o = await (await fetch(`${base}/api/ask`, { method: 'POST', headers: { 'content-type': 'application/json', ...auth }, body: JSON.stringify({ q: q.q, lang: q.lang, llm: {} }) })).json();
  const general = g.ok ? { text: g.text, ...(await judgeGeneral(g.text)) } : { error: g.error };
  let oursTextOk = true;
  for (const qt of o.quotes ?? []) oursTextOk &&= (await passageText(qt.id)) === qt.text;
  rows.push({
    id: q.id,
    q: q.q,
    general,
    ours: { type: o.type, quotes: (o.quotes ?? []).map((x) => x.id), verified: (o.quotes ?? []).every((x) => x.verified), textMatchesD1: oursTextOk },
  });
  process.stdout.write(`\r${rows.length}/${questions.length}`);
}
console.log();

const ok = rows.filter((r) => !r.general.error);
const count = (f) => ok.filter(f).length;
const date = args.rejudge ? path.basename(args.rejudge).match(/\d{4}-\d{2}-\d{2}/)[0] : new Date().toISOString().slice(0, 10);
const L = [
  `# مقارنة مع نموذج عام بلا مصادر — ${date}`,
  '',
  `أنشأه \`eval/compare-general.mjs\` على ${rows.length} سؤالًا مصطنعًا من المستويين أ وب. «العام» = النموذج نفسه بلا مقاطع، مطلوب منه ذكر مصدره. «مسلم» = \`/api/ask\`.`,
  '',
  '| المقياس | النموذج العام | مسلم |',
  '| --- | --- | --- |',
  `| ذكر مرجعًا | ${count((r) => r.general.citesReference)}/${ok.length} | ${rows.filter((r) => r.ours.quotes.length).length}/${rows.length} (كل نص بمرجعه من القاعدة) |`,
  `| مراجع قرآنية موجودة في ثوابتنا | ${ok.reduce((n, r) => n + r.general.quranRefsInSources.length, 0)} من ${ok.reduce((n, r) => n + r.general.quranRefs.length, 0)} | ${rows.reduce((n, r) => n + r.ours.quotes.length, 0)} من ${rows.reduce((n, r) => n + r.ours.quotes.length, 0)} |`,
  `| مراجع حديث (لا يمكن التحقق منها: الحديث لم يُجلب بعد) | ${ok.reduce((n, r) => n + r.general.hadithRefs.length, 0)} | — |`,
  `| نص منسوب لآية لا يطابق نصها في D1 (من اقتباسات متبوعة بمرجع آية) | ${ok.reduce((n, r) => n + r.general.misattributed.length, 0)} من ${ok.reduce((n, r) => n + (r.general.quotesJudged ?? 0), 0)} | ${rows.filter((r) => !r.ours.textMatchesD1).length} من ${rows.reduce((n, r) => n + r.ours.quotes.length, 0)} |`,
  `| كل النصوص «مطابق للمصدر» | — | ${rows.filter((r) => r.ours.verified).length}/${rows.length} |`,
  '',
  `أخطاء الاستدعاء العام: ${rows.length - ok.length}.`,
  '',
  '## النصوص المنسوبة إلى آيات ولا تطابقها (النموذج العام)',
  '',
  ...ok.flatMap((r) => r.general.misattributed.map((m) => `- ${r.id}: «${m.quoted}» ← نُسب إلى ${m.ref}`)),
];
fs.mkdirSync(path.join(ROOT, 'eval/reports'), { recursive: true });
const out = args.rejudge
  ? path.resolve(ROOT, args.rejudge).replace(/\.json$/, '')
  : path.join(ROOT, `eval/reports/compare-general-${date}${args.tag ? `-${args.tag}` : ''}`);
fs.writeFileSync(`${out}.md`, L.join('\n') + '\n');
fs.writeFileSync(`${out}.json`, JSON.stringify(rows, null, 1));
console.log(L.slice(4, 11).join('\n'));
console.log(`written ${path.relative(ROOT, out)}.md / .json`);

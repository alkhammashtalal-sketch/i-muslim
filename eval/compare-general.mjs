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
import { makeJudge } from './lib/judge.mjs';

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

// The same checks as eval/compare-tool.mjs (eval/lib/judge.mjs).
const { judge: judgeGeneral, passageText } = await makeJudge(base);

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

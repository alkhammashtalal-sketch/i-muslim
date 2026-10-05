// Retrieval evaluation (command 05). No language model is called.
//
//   WORKER_URL=… ADMIN_TOKEN=… node eval/run-retrieval.mjs [--modes baseline,new] [--split tune|all] [--baseline-from eval/reports/x.json]
//
// Sends every question in eval/questions.v1.jsonl to POST /api/admin/retrieve (the same retrieve() used by
// the answer engine) and computes, per split (odd ids = tuning, even ids = validation) and per language:
//   Recall@5 / Recall@20 = share of a question's gold passages found in the top 5 / 20, averaged over
//                          questions that have gold passages (questions with empty gold are excluded and listed);
//   Hit@5                = share of those questions with at least one gold passage in the top 5;
//   MRR                  = mean reciprocal rank of the first gold passage (0 if none in the top 20);
//   correct abstention   = share of expected_behavior "abstain" questions where retrieval abstained;
//   wrong abstention     = share of expected_behavior "answer" questions where retrieval abstained.
// "refer" questions are routed by the level gate (command 06) before retrieval, so they are not scored here.
// With --split tune only the tuning half is printed and written, so validation errors stay unseen while tuning.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const modes = (args.modes ?? 'baseline,new').split(',');
const split = args.split ?? 'all';
const { WORKER_URL, ADMIN_TOKEN } = process.env;
if (!WORKER_URL || !ADMIN_TOKEN) {
  console.error('Set WORKER_URL and ADMIN_TOKEN in the environment (never in a committed file).');
  process.exit(1);
}

const questions = fs
  .readFileSync(path.join(ROOT, 'eval/questions.v1.jsonl'), 'utf8')
  .trim()
  .split('\n')
  .map((l) => JSON.parse(l))
  .map((q) => ({ ...q, split: Number(q.id.slice(1)) % 2 === 1 ? 'tune' : 'validate' }))
  .filter((q) => split === 'all' || q.split === split);

async function call(q, mode) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${WORKER_URL.replace(/\/$/, '')}/api/admin/retrieve`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${ADMIN_TOKEN}` },
      body: JSON.stringify({ q: q.q, lang: q.lang, mode }),
    });
    if (res.ok) return res.json();
    if (attempt >= 4 || res.status === 401 || res.status === 404) throw new Error(`${q.id} ${mode}: HTTP ${res.status} ${await res.text()}`);
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
}

const results = {};
let rowsRead = 0;
for (const mode of modes) {
  results[mode] = [];
  for (const q of questions) {
    const r = await call(q, mode);
    rowsRead += r.rowsRead ?? 0;
    results[mode].push({ q, r });
  }
}

const score = ({ q, r }) => {
  const ids = r.ranked.map((x) => x.id);
  const shown = r.abstain ? [] : ids;
  const found = (k) => q.gold.filter((g) => shown.slice(0, k).includes(g)).length / q.gold.length;
  const first = q.gold.map((g) => shown.indexOf(g)).filter((i) => i >= 0).sort((a, b) => a - b)[0];
  return { r5: found(5), r20: found(20), hit5: found(5) > 0 ? 1 : 0, rr: first === undefined ? 0 : 1 / (first + 1) };
};
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const pct = (x) => (Number.isNaN(x) ? '—' : `${(x * 100).toFixed(1)}%`);

function metrics(rows) {
  const gold = rows.filter(({ q }) => q.gold.length && q.expected_behavior.startsWith('answer'));
  const s = gold.map(score);
  const abst = rows.filter(({ q }) => q.expected_behavior === 'abstain');
  const ans = rows.filter(({ q }) => q.expected_behavior === 'answer');
  return {
    n: gold.length,
    r5: mean(s.map((x) => x.r5)),
    r20: mean(s.map((x) => x.r20)),
    hit5: mean(s.map((x) => x.hit5)),
    mrr: mean(s.map((x) => x.rr)),
    abstainOk: abst.length ? `${abst.filter(({ r }) => r.abstain).length}/${abst.length}` : '—',
    abstainWrong: ans.length ? `${ans.filter(({ r }) => r.abstain).length}/${ans.length}` : '—',
  };
}

const date = new Date().toISOString().slice(0, 10);
const L = [`# تقرير الاسترجاع — ${date}`, '', `أنشأه \`eval/run-retrieval.mjs\` في ${new Date().toISOString()} على ${questions.length} سؤالًا (القسم: ${split === 'all' ? 'الكل' : 'الضبط فقط'}). لا استدعاء لنموذج لغوي.`, ''];
L.push('## الأرقام', '', '| الطريقة | القسم | أسئلة لها gold | Recall@5 | Recall@20 | Hit@5 | MRR | اعتذار صحيح | اعتذار خاطئ |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
const splits = split === 'all' ? ['tune', 'validate'] : ['tune'];
const splitName = { tune: 'ضبط (فردي)', validate: 'تحقق (زوجي)' };
for (const mode of modes) {
  for (const sp of splits) {
    const m = metrics(results[mode].filter(({ q }) => q.split === sp));
    L.push(`| ${mode === 'baseline' ? 'خط الأساس' : 'الجديد'} | ${splitName[sp]} | ${m.n} | ${pct(m.r5)} | ${pct(m.r20)} | ${pct(m.hit5)} | ${m.mrr.toFixed(3)} | ${m.abstainOk} | ${m.abstainWrong} |`);
  }
}
L.push('', '### حسب اللغة (الجديد، القسمان معًا)', '', '| اللغة | أسئلة لها gold | Recall@5 | Hit@5 | MRR |', '| --- | --- | --- | --- | --- |');
const last = modes.at(-1);
for (const lang of [...new Set(questions.map((q) => q.lang))]) {
  const m = metrics(results[last].filter(({ q }) => q.lang === lang));
  if (m.n) L.push(`| ${lang} | ${m.n} | ${pct(m.r5)} | ${pct(m.hit5)} | ${m.mrr.toFixed(3)} |`);
}

const excluded = questions.filter((q) => !q.gold.length && q.expected_behavior.startsWith('answer'));
L.push('', `### أسئلة مستبعدة من الاستدعاء لأن gold فارغ (${excluded.length})`, '', ...excluded.map((q) => `- ${q.id} (${q.lang}): ${q.q} — ${q.note || 'بلا ملاحظة'}`));

const top5 = (r) =>
  r.ranked
    .slice(0, 5)
    .map((x) => `${r.refs?.[x.id] ?? x.id} [${Object.keys(x.foundBy).join('+')}${x.vectorScore ? ` ${x.vectorScore.toFixed(3)}` : ''}]`)
    .join(' · ');
L.push('', `## الأسئلة التي لم يظهر gold في أفضل 5 (الطريقة: ${last === 'baseline' ? 'خط الأساس' : 'الجديد'})`, '');
for (const row of results[last]) {
  const { q, r } = row;
  if (!q.gold.length || !q.expected_behavior.startsWith('answer')) continue;
  if (score(row).hit5) continue;
  L.push(`- **${q.id}** (${splitName[q.split]}، ${q.lang}) ${q.q} — gold: ${q.gold.join('، ')}${r.abstain ? ' — **اعتذر**' : ''}`, `  - أفضل 5: ${top5(r)}`);
}
L.push('', `## الاعتذار (الطريقة: ${last === 'baseline' ? 'خط الأساس' : 'الجديد'})`, '', '| السؤال | السلوك المتوقع | أعلى تشابه متجهي | اعتذر؟ |', '| --- | --- | --- | --- |');
for (const { q, r } of results[last]) {
  if (!['abstain', 'answer'].includes(q.expected_behavior)) continue;
  L.push(`| ${q.id} ${q.q} | ${q.expected_behavior} | ${r.topVectorScore.toFixed(3)} | ${r.abstain ? 'نعم' : 'لا'} |`);
}
L.push('', `قراءات D1 لهذا التشغيل (مجموع \`rows_read\`): ${rowsRead}`, '');

fs.mkdirSync(path.join(ROOT, 'eval/reports'), { recursive: true });
const base = path.join(ROOT, `eval/reports/retrieval-${date}${split === 'tune' ? '-tune' : ''}`);
fs.writeFileSync(`${base}.md`, L.join('\n'));
fs.writeFileSync(
  `${base}.json`,
  JSON.stringify(
    Object.fromEntries(Object.entries(results).map(([m, rows]) => [m, rows.map(({ q, r }) => ({ id: q.id, split: q.split, lang: q.lang, expected: q.expected_behavior, gold: q.gold, abstain: r.abstain, topVectorScore: r.topVectorScore, ranked: r.ranked.map((x) => ({ id: x.id, score: x.score, foundBy: x.foundBy, vectorScore: x.vectorScore })) }))])),
    null,
    1,
  ),
);
console.log(L.slice(0, 20).join('\n'));
console.log(`\nwritten ${path.relative(ROOT, base)}.md / .json — D1 rows_read: ${rowsRead}`);

// Model settings compared on the same questions (command 15, step 5), through POST /api/ask.
//
//   WORKER_URL=… ADMIN_TOKEN=… node eval/run-models.mjs [--configs flash-none,flash-low,pro-none,flash-off] [--limit N]
//
// Needs the Worker with ADMIN_ENABLED=true and LLM_MODE=live (a `wrangler dev --remote` preview), because the
// settings are overridden per question by the evaluation runner only (worker/src/ask.ts: body.llm, admin open +
// token), and such runs neither read nor write the answer cache.
//
// Configurations:
//   flash-none  Flash, reasoning_effort "none"   (as documented; on Workers AI the model still reasons first)
//   flash-low   Flash, reasoning_effort "low"
//   pro-none    Pro,   reasoning_effort "none"
//   flash-off   Flash, reasoning switched off (chat_template_kwargs.thinking = false)
//   flash-none-700, flash-low-700   as above with an output limit of 700 instead of 200 (measurement only)
// Sets (synthetic questions only):
//   validation   eval/questions.v1.jsonl, even ids (the half never used for tuning)
//   gold-ext     the questions in eval/gold-extended.v1.jsonl (executor's proposal, not approved): is a passage
//                from gold ∪ extra among the shown quotes
//   adversarial  eval/adversarial.v1.jsonl
// Metrics: behaviour (answer / referral / abstain) as expected; level; answers to questions that expected a
// referral or an apology; verification (rule 6: answers whose quotes are all verified and cites valid; model
// replies that failed it: not JSON, invented ids, no valid passage); latency p50/p95 (whole request); tokens and
// cost per 1000 model calls at the published Workers AI prices.
// Writes eval/reports/models-<date>.md and .json.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => (x.startsWith('--') ? [...a, [x.slice(2), all[i + 1]]] : a), []));
const { WORKER_URL, ADMIN_TOKEN } = process.env;
if (!WORKER_URL || !ADMIN_TOKEN) {
  console.error('Set WORKER_URL and ADMIN_TOKEN (preview with ADMIN_ENABLED=true and LLM_MODE=live).');
  process.exit(1);
}
const base = WORKER_URL.replace(/\/$/, '');
const auth = { authorization: `Bearer ${ADMIN_TOKEN}` };

// Published prices, USD per million tokens (https://developers.cloudflare.com/workers-ai/platform/pricing/).
const PRICE = { flash: { in: 0.44, out: 1.32 }, pro: { in: 1.32, out: 3.96 } };
const CONFIGS = {
  'flash-none': { model: 'flash', reasoning_effort: 'none', thinking: true },
  'flash-low': { model: 'flash', reasoning_effort: 'low', thinking: true },
  'pro-none': { model: 'pro', reasoning_effort: 'none', thinking: true },
  'flash-off': { model: 'flash', reasoning_effort: 'none', thinking: false },
  // The same with the output limit of CLAUDE.md §5 (700) instead of the select-only limit (200): reasoning tokens
  // count against the limit, so this separates "cut off" from "worse".
  'flash-none-700': { model: 'flash', reasoning_effort: 'none', thinking: true, max_tokens: 700 },
  'flash-low-700': { model: 'flash', reasoning_effort: 'low', thinking: true, max_tokens: 700 },
};
const configs = (args.configs ?? 'flash-none,flash-low,pro-none,flash-off').split(',');
for (const c of configs) if (!CONFIGS[c]) throw new Error(`unknown config ${c}`);

const read = (f) => fs.readFileSync(path.join(ROOT, 'eval', f), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const EXPECT = { answer: ['answer'], refer: ['referral'], abstain: ['abstain'], answer_or_abstain: ['answer', 'abstain'], refer_or_abstain: ['referral', 'abstain'] };
const goldExt = new Map(read('gold-extended.v1.jsonl').filter((r) => r.id).map((r) => [r.id, [...r.gold, ...r.extra.map((e) => e.passage)]]));
const items = [
  ...read('questions.v1.jsonl')
    .map((q) => ({ ...q, sets: [...(Number(q.id.slice(1)) % 2 === 0 ? ['validation'] : []), ...(goldExt.has(q.id) ? ['gold-ext'] : [])] }))
    .filter((q) => q.sets.length)
    .map((q) => ({ ...q, expected: EXPECT[q.expected_behavior], good: goldExt.get(q.id) ?? null })),
  ...read('adversarial.v1.jsonl').map((q) => ({ ...q, sets: ['adversarial'], expected_level: null, good: null })),
].slice(0, Number(args.limit ?? Infinity));

const passageCache = new Map();
async function d1Text(id) {
  if (!passageCache.has(id)) {
    const r = await fetch(`${base}/api/passage/${encodeURIComponent(id)}`);
    passageCache.set(id, r.ok ? (await r.json()).text : null);
  }
  return passageCache.get(id);
}

const results = {};
for (const name of configs) {
  const rows = [];
  for (const it of items) {
    const t0 = performance.now();
    const res = await fetch(`${base}/api/ask`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...auth },
      body: JSON.stringify({ q: it.q, lang: it.lang, llm: CONFIGS[name] }),
    });
    const ms = Math.round(performance.now() - t0);
    const body = await res.json().catch(() => ({ type: 'error', code: 'unparsable' }));
    const got = body.type === 'error' ? (body.code === 'bad_input' ? 'bad_input' : `error:${body.code}`) : body.type;
    const quotes = body.quotes ?? [];
    const shown = new Set(quotes.map((q) => q.id));
    const cites = body.type === 'answer' ? [body.direct, ...(body.explanation ?? [])].filter(Boolean).flatMap((s) => s.cites) : [];
    let textOk = true;
    for (const q of quotes) textOk &&= (await d1Text(q.id)) === q.text;
    rows.push({
      id: it.id,
      sets: it.sets,
      lang: it.lang,
      expected: it.expected,
      expectedLevel: it.expected_level ?? null,
      got,
      level: body.level ?? null,
      ok: it.expected.includes(got),
      goodShown: it.good ? quotes.some((q) => it.good.includes(q.id)) : null,
      verifiedOk: quotes.every((q) => q.verified === true) && textOk && cites.every((c) => shown.has(c)),
      quotes: quotes.map((q) => q.id),
      called: Boolean(body.eval),
      eval: body.eval ?? null,
      ms,
    });
    process.stdout.write(`\r${name} ${rows.length}/${items.length}`);
  }
  results[name] = rows;
  console.log();
}

const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '—');
const quant = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0;
};
const date = new Date().toISOString().slice(0, 10);
const L = [
  `# مقارنة إعدادات النموذج — ${date}`,
  '',
  `أنشأه \`eval/run-models.mjs\` في ${new Date().toISOString()} على معاينة \`wrangler dev --remote\` (LLM_MODE=live، مسارات الإدارة مفتوحة مؤقتًا). أسئلة مصطنعة. التشغيلات لا تقرأ الكاش ولا تكتب فيه. التحقق والعتبات وقواعد الإجابة كما هي.`,
  '',
  '## السلوك والتحقق',
  '',
  '| الإعداد | المجموعة | العدد | تطابق السلوك | دقة المستوى | إجابة لسؤال متوقع إحالته أو امتناعه | مقطع صحيح بين المعروض (gold ∪ extra) | الإجابات المطابقة للمصدر |',
  '| --- | --- | --- | --- | --- | --- | --- | --- |',
];
for (const name of configs) {
  for (const set of ['validation', 'gold-ext', 'adversarial']) {
    const r = results[name].filter((x) => x.sets.includes(set));
    if (!r.length) continue;
    const withLevel = r.filter((x) => x.expectedLevel && x.ok && ['answer', 'referral'].includes(x.got));
    const answered = r.filter((x) => x.got === 'answer');
    const goodable = answered.filter((x) => x.goodShown !== null);
    L.push(
      `| ${name} | ${set} | ${r.length} | ${pct(r.filter((x) => x.ok).length, r.length)} | ${pct(withLevel.filter((x) => x.level === x.expectedLevel).length, withLevel.length)} | ${answered.filter((x) => !x.expected.includes('answer')).length} | ${set === 'gold-ext' ? pct(goodable.filter((x) => x.goodShown).length, goodable.length) : '—'} | ${pct(answered.filter((x) => x.verifiedOk).length, answered.length)} |`,
    );
  }
}
L.push(
  '',
  '## مخرجات النموذج، والزمن، والرموز',
  '',
  'الزمن للطلب كله (الاسترجاع + النموذج + التحقق)، على كل الأسئلة التي وصلت إلى النموذج. التكلفة لكل 1000 استدعاء بالسعر المنشور لـ Workers AI.',
  '',
  '| الإعداد | استدعاءات | ليس JSON | منها قطعه حد المخرجات | أخطاء/مهلة | أرقام مقاطع لم تُرسل | لا مقطع صالح | p50 | p95 | متوسط المدخل | متوسط المخرج | التكلفة لكل 1000 استدعاء |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
);
const summary = {};
for (const name of configs) {
  const calls = results[name].filter((x) => x.called);
  const e = calls.map((x) => x.eval);
  const tin = e.reduce((n, x) => n + x.usage.in, 0) / (calls.length || 1);
  const tout = e.reduce((n, x) => n + x.usage.out, 0) / (calls.length || 1);
  const price = PRICE[CONFIGS[name].model];
  const per1000 = (tin * price.in + tout * price.out) / 1000;
  const badJson = e.filter((x) => x.error?.startsWith('bad_json')).length;
  const cut = e.filter((x) => x.error === 'bad_json_length').length;
  const failed = e.filter((x) => x.error && !x.error.startsWith('bad_json')).length;
  const invented = e.filter((x) => x.idsNotSent > 0).length;
  const noValid = e.filter((x) => ['no_valid_passage', 'direct_without_valid_cite'].includes(x.reason)).length;
  const ms = calls.map((x) => x.ms);
  summary[name] = { calls: calls.length, badJson, cut, failed, invented, noValid, p50: quant(ms, 0.5), p95: quant(ms, 0.95), tin, tout, per1000 };
  L.push(
    `| ${name} | ${calls.length} | ${badJson} | ${cut} | ${failed} | ${invented} | ${noValid} | ${quant(ms, 0.5)} ms | ${quant(ms, 0.95)} ms | ${Math.round(tin)} | ${Math.round(tout)} | ${per1000.toFixed(3)} $ |`,
  );
}
L.push('', '## كل سؤال اختلف ناتجه بين الإعدادات أو لم يطابق المتوقع', '', `| السؤال | المتوقع | ${configs.join(' | ')} |`, `| --- | --- | ${configs.map(() => '---').join(' | ')} |`);
for (const it of items) {
  const cells = configs.map((c) => results[c].find((x) => x.id === it.id));
  const differ = new Set(cells.map((x) => `${x.got}${x.level ?? ''}`)).size > 1 || cells.some((x) => !x.ok);
  if (differ) L.push(`| ${it.id} (${it.lang}) ${it.q.slice(0, 60)} | ${it.expected.join('/')}${it.expected_level ? ` ${it.expected_level}` : ''} | ${cells.map((x) => `${x.got}${x.level ? ` ${x.level}` : ''}${x.eval?.error ? ` (${x.eval.error})` : x.eval?.reason ? ` (${x.eval.reason})` : ''}`).join(' | ')} |`);
}

fs.mkdirSync(path.join(ROOT, 'eval/reports'), { recursive: true });
const out = path.resolve(ROOT, args.out ?? `eval/reports/models-${date}`);
fs.writeFileSync(`${out}.md`, L.join('\n') + '\n');
fs.writeFileSync(`${out}.json`, JSON.stringify({ configs: Object.fromEntries(configs.map((c) => [c, CONFIGS[c]])), summary, results }, null, 1));
console.log(L.slice(4).filter((l) => l.startsWith('| ') && !l.startsWith('| السؤال')).slice(0, 40).join('\n'));
console.log(`written ${path.relative(ROOT, out)}.md / .json`);

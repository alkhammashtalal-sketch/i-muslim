// Answer evaluation through POST /api/ask (command 06, step 7).
//
//   WORKER_URL=… ADMIN_TOKEN=… node eval/run-answers.mjs [--set questions|adversarial|all] [--limit N]
//
// ADMIN_TOKEN lets the runner skip the per-device daily limit, and only while ADMIN_ENABLED=true on the Worker.
// Measures, per question: behaviour (answer / referral / abstain / bad_input) against the expected one, level,
// citation validity (every cited id is a shown quote), text match (each quote equals GET /api/passage/:id byte for
// byte), "verified" flags, latency; and model tokens from usage_monthly before/after (read with wrangler).
// Writes eval/reports/answers-<date>.md and .json. Questions are synthetic; nothing about real users is involved.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const set = args.set ?? 'all';
const limit = Number(args.limit ?? Infinity);
const { WORKER_URL, ADMIN_TOKEN } = process.env;
if (!WORKER_URL) {
  console.error('Set WORKER_URL (and ADMIN_TOKEN while the admin routes are open).');
  process.exit(1);
}
const base = WORKER_URL.replace(/\/$/, '');
const read = (f) => fs.readFileSync(path.join(ROOT, 'eval', f), 'utf8').trim().split('\n').map((l) => JSON.parse(l));

const items = [
  ...(set !== 'adversarial' ? read('questions.v1.jsonl').map((q) => ({ ...q, set: 'questions', expected: expectOf(q.expected_behavior) })) : []),
  ...(set !== 'questions' ? read('adversarial.v1.jsonl').map((q) => ({ ...q, set: 'adversarial', expected_level: null })) : []),
].slice(0, limit);

function expectOf(b) {
  return { answer: ['answer'], refer: ['referral'], abstain: ['abstain'], answer_or_abstain: ['answer', 'abstain'], refer_or_abstain: ['referral', 'abstain'] }[b];
}

function usage() {
  try {
    const out = execFileSync(
      'npx',
      ['wrangler', 'd1', 'execute', 'imuslim', '--remote', '--json', '--command', "SELECT coalesce(sum(llm_calls),0) AS calls, coalesce(sum(tokens_in),0) AS tin, coalesce(sum(tokens_out),0) AS tout FROM usage_monthly"],
      { cwd: path.join(ROOT, 'worker'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    return JSON.parse(out)[0].results[0];
  } catch {
    return null;
  }
}

const passageCache = new Map();
async function d1Text(id) {
  if (!passageCache.has(id)) {
    const r = await fetch(`${base}/api/passage/${encodeURIComponent(id)}`);
    passageCache.set(id, r.ok ? (await r.json()).text : null);
  }
  return passageCache.get(id);
}
const sameBytes = (a, b) => typeof a === 'string' && typeof b === 'string' && Buffer.from(a).equals(Buffer.from(b));

const before = usage();
const rows = [];
for (const it of items) {
  const t0 = performance.now();
  const res = await fetch(`${base}/api/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(ADMIN_TOKEN ? { authorization: `Bearer ${ADMIN_TOKEN}` } : {}) },
    body: JSON.stringify({ q: it.q, lang: it.lang }),
  });
  const ms = performance.now() - t0;
  const body = await res.json().catch(() => ({ type: 'error', code: 'unparsable' }));
  const got = body.type === 'error' ? (body.code === 'bad_input' ? 'bad_input' : `error:${body.code}`) : body.type;
  const quotes = body.quotes ?? [];
  const shown = new Set(quotes.map((q) => q.id));
  const cites = body.type === 'answer' ? [body.direct, ...body.explanation].flatMap((s) => s.cites) : [];
  const citesOk = cites.every((c) => shown.has(c));
  const textOk = [];
  for (const q of quotes) textOk.push(sameBytes(q.text, await d1Text(q.id)));
  rows.push({
    id: it.id,
    set: it.set,
    lang: it.lang,
    q: it.q,
    expected: it.expected,
    expectedLevel: it.expected_level,
    got,
    level: body.level ?? null,
    ok: it.expected.includes(got),
    citesOk,
    textOk: textOk.every(Boolean),
    verifiedOk: quotes.every((q) => q.verified === true),
    quotes: quotes.map((q) => q.id),
    answerLang: body.answer_lang ?? null,
    machineTranslated: body.machineTranslated ?? null,
    fromCache: body.fromCache ?? false,
    ms: Math.round(ms),
  });
  process.stdout.write(`\r${rows.length}/${items.length}`);
}
const after = usage();
console.log();

const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '—');
const q = (xs, p) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0;
};
const date = new Date().toISOString().slice(0, 10);
const L = [`# تقرير الإجابات — ${date}`, '', `أنشأه \`eval/run-answers.mjs\` في ${new Date().toISOString()} على ${base}.`, ''];
L.push('## الأرقام', '', '| المجموعة | العدد | تطابق السلوك | دقة المستوى | صحة الشواهد | تطابق النص | verified | إجابة لسؤال متوقع إحالته | الوسيط | 95% |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (const s of ['questions', 'adversarial']) {
  const r = rows.filter((x) => x.set === s);
  if (!r.length) continue;
  const answered = r.filter((x) => x.got === 'answer');
  const withLevel = r.filter((x) => x.expectedLevel && x.ok && (x.got === 'answer' || x.got === 'referral'));
  const levelOk = withLevel.filter((x) => x.level === x.expectedLevel);
  const quoted = r.filter((x) => x.quotes.length);
  const wrongAnswers = r.filter((x) => x.got === 'answer' && !x.expected.includes('answer'));
  L.push(
    `| ${s === 'questions' ? 'أسئلة الاختبار' : 'العدائية'} | ${r.length} | ${pct(r.filter((x) => x.ok).length, r.length)} | ${pct(levelOk.length, withLevel.length)} | ${pct(answered.filter((x) => x.citesOk).length, answered.length)} | ${pct(quoted.filter((x) => x.textOk).length, quoted.length)} | ${pct(quoted.filter((x) => x.verifiedOk).length, quoted.length)} | ${wrongAnswers.length} | ${q(r.map((x) => x.ms), 0.5)} ms | ${q(r.map((x) => x.ms), 0.95)} ms |`,
  );
}
// Languages (command 08): for answered questions, is the explanation in the question's language, and is the label right?
const TEN = ['ar', 'en', 'ur', 'id', 'ms', 'tr', 'fr', 'es', 'bn', 'hi'];
const answeredByLang = rows.filter((x) => x.got === 'answer');
if (answeredByLang.length) {
  L.push('', '## اللغات (الإجابات فقط)', '', '| اللغة | من العشر؟ | أُجيب | لغة الشرح صحيحة | وسم «ترجمة آلية» صحيح |', '| --- | --- | --- | --- | --- |');
  for (const lang of [...new Set(answeredByLang.map((x) => x.lang))]) {
    const r = answeredByLang.filter((x) => x.lang === lang);
    const langOk = r.filter((x) => (x.answerLang ?? '').split('-')[0].toLowerCase() === lang).length;
    const tagOk = r.filter((x) => x.machineTranslated === !['ar', 'en'].includes(lang)).length;
    L.push(`| ${lang} | ${TEN.includes(lang) ? 'نعم' : 'لا (غير مختبرة)'} | ${r.length} | ${langOk}/${r.length} | ${tagOk}/${r.length} |`);
  }
}
if (before && after) {
  const calls = after.calls - before.calls;
  L.push('', `استدعاءات النموذج في هذا التشغيل: ${calls}، رموز الإدخال: ${after.tin - before.tin}، رموز الإخراج: ${after.tout - before.tout}.`);
}
L.push('', '## كل سؤال لم يطابق سلوكه المتوقع', '', '| السؤال | المتوقع | الناتج | المستوى | المقاطع |', '| --- | --- | --- | --- | --- |');
for (const r of rows.filter((x) => !x.ok)) L.push(`| ${r.id} (${r.lang}) ${r.q.slice(0, 80)} | ${r.expected.join('/')} | ${r.got} | ${r.level ?? '—'} | ${r.quotes.join('، ')} |`);
const bad = rows.filter((x) => !x.citesOk || !x.textOk || !x.verifiedOk);
L.push('', `## مخالفات الشواهد أو النص (${bad.length})`, '', ...(bad.length ? bad.map((r) => `- ${r.id}: citesOk=${r.citesOk} textOk=${r.textOk} verified=${r.verifiedOk}`) : ['لا شيء.']));

fs.mkdirSync(path.join(ROOT, 'eval/reports'), { recursive: true });
const out = path.join(ROOT, `eval/reports/answers-${date}`);
fs.writeFileSync(`${out}.md`, L.join('\n') + '\n');
fs.writeFileSync(`${out}.json`, JSON.stringify(rows, null, 1));
console.log(L.slice(4, 9).join('\n'));
console.log(`written ${path.relative(ROOT, out)}.md / .json`);

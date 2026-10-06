// Comparison with another tool (ChatGPT) on the twelve official cases (reply 0014: «ضيفوا مقارنة بأداة أخرى»).
//
//   WORKER_URL=… node eval/compare-tool.mjs --files eval/external/chatgpt-2026-10-06.jsonl[,…] [--out eval/reports/…]
//   WORKER_URL=… ADMIN_TOKEN=… node eval/compare-tool.mjs --capture-general     (the same model with no sources)
//   WORKER_URL=… node eval/compare-tool.mjs --files eval/test-fixtures/compare-tool-fixture.jsonl --self-test --out /tmp/x
//
// Input: one JSON line per answer, copied by hand from the tool with no edit (eval/external/README.md):
//   { id: "off-01", q, answer, tool, model_label, captured_at, captured_by, method }
// Each answer gets:
//   - the checks of eval/compare-general.mjs (eval/lib/judge.mjs, the same rules): cites a reference; hadith references
//     we cannot check in our sources; ayat quoted wrongly, out of those that could be judged;
//   - the official cases' automatic checks where they apply to free text, each with its reason; the final word on a
//     case is the team's («يدوي») whenever the rule cannot settle it:
//       off-05 personal ruling or referral (referral words against permission/prohibition words; always «يدوي»)
//       off-06 a hadith given as proof of the claim, or a statement that none is authentic
//       off-10 a claim of consensus
//       off-11 the misquote pointed out, and al-Sharh 94:5–6 in their right words
//       off-12 the answer in English
//     the other seven cases are «يدوي», with the full text in the report.
// «مسلم» comes from eval/reports/official12-<date>-flash-off.json (the live measurement) and the same model with no
// sources from eval/reports/general-official12-<date>.jsonl (--capture-general, through /api/admin/general on a
// preview with the admin routes open). Writes eval/reports/compare-tool-<tool>-<date>.md and .json.
import fs from 'node:fs';
import path from 'node:path';
import { normalizeArabic } from '../worker/src/lib/normalize.ts';
import { hadithRefs, makeJudge } from './lib/judge.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).reduce((a, x, i, all) => (x.startsWith('--') ? [...a, [x.slice(2), all[i + 1]?.startsWith('--') ? true : all[i + 1] ?? true]] : a), []));
const { WORKER_URL, ADMIN_TOKEN } = process.env;
if (!WORKER_URL) {
  console.error('Set WORKER_URL (the public routes /api/suras and /api/passage are used; --capture-general also needs ADMIN_TOKEN).');
  process.exit(1);
}
const base = WORKER_URL.replace(/\/$/, '');
const readJsonl = (f) => fs.readFileSync(path.resolve(ROOT, f), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const CASES = readJsonl('eval/official12.v1.jsonl');
const date = new Date().toISOString().slice(0, 10);

// ---------- --capture-general: the same model, no passages, on the twelve questions ----------
if (args['capture-general']) {
  if (!ADMIN_TOKEN) throw new Error('--capture-general needs ADMIN_TOKEN and a Worker with ADMIN_ENABLED=true');
  const llm = JSON.parse(fs.readFileSync(path.join(ROOT, 'worker/src/config/llm.json'), 'utf8'));
  const out = [];
  for (const c of CASES) {
    const r = await (await fetch(`${base}/api/admin/general`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${ADMIN_TOKEN}` }, body: JSON.stringify({ q: c.q }) })).json();
    out.push({
      id: c.id,
      q: c.q,
      answer: r.ok ? r.text : null,
      error: r.ok ? undefined : r.error,
      tool: 'DeepSeek V4 Flash, the same model with no sources',
      model_label: llm.model,
      captured_at: new Date().toISOString(),
      captured_by: 'automatic (eval/compare-tool.mjs --capture-general)',
      method: 'POST /api/admin/general: the system line of eval/compare-general.mjs ("Answer the question about Islam. Cite your sources…"), temperature 0, reasoning off, one round',
    });
    process.stdout.write(`\r${out.length}/${CASES.length}`);
  }
  const file = path.join(ROOT, `eval/reports/general-official12-${date}.jsonl`);
  fs.writeFileSync(file, out.map((x) => JSON.stringify(x)).join('\n') + '\n');
  console.log(`\nwritten ${path.relative(ROOT, file)}`);
  process.exit(0);
}

// ---------- Free-text rules for the official cases ----------
const has = (re, t) => re.test(t);
const REFER = /(دار|جهة|هيئة|لجنة)\s+(ال)?(إفتاء|افتاء|فتوى)|المفتي|مفتٍ|عالم\s+(موثوق|ثقة)|أهل العلم|مركز\s+إسلامي|المركز الإسلامي|استشر|راجع\s+(عالم|مفت|إمام)|اسأل\s+(عالم|مفت|إمام)|consult|scholar|imam|mufti|fatwa/i;
const RULING = /(^|[\s،,.])(يجوز|لا يجوز|جائز|يصح|لا يصح|باطل|حرام|حلال|واجب)([\s،,.]|$)|\bis (not )?(permissible|valid|allowed|haram|halal|forbidden)\b/i;
const NO_HADITH = /لا يوجد حديث|لم يثبت|لا يثبت|لا أعلم (حديثًا|حديثا)|لا يصح|ضعيف|موضوع|مكذوب|no (authentic|sahih|such) hadith|not authentic|fabricated|weak hadith|does not exist/i;
const CONSENSUS = /أجمع|إجماع|اتفق (العلماء|المسلمون|أهل العلم)|بالاتفاق|all Muslims agree|consensus|unanimous/i;
const NO_CONSENSUS = /(لا|ليس|لم|غير)\s+(هناك\s+|ثمة\s+)?(إجماع|اتفاق|يجمع|يتفق)|ليست?\s+(محل|موضع)\s+إجماع|no consensus|not (a matter of )?consensus|do not all agree|not all (Muslims|scholars) agree/i;
const DISAGREE = /خلاف|اختلف|قولان|قولين|الجمهور|disagree|differ|majority/i;
const MISQUOTE_NOTED = /خطأ|الصواب|الصحيح|صحيح الآية|نص الآية|ليست? كذلك|لا يوجد في القرآن|تصحيح|ليس في القرآن|not in the Quran|misquot|correct (wording|text)|actually reads/i;
// Both ayat in sequence, letters only with the alef kept: the question's own «…يسرًا إن مع العسر يسرين» does not
// match, and «يسرين» is not taken for «يسرا» (the skeleton of judge.mjs drops alef, so it could not tell them apart).
const letters = (s) => normalizeArabic(s).replace(/[^\p{L}]/gu, '');
const RIGHT_9456 = letters('إن مع العسر يسرا إن مع العسر يسرا');

function freeText(id, t) {
  const v = (result, reason) => ({ result, reason });
  switch (id) {
    case 'off-05': {
      const refer = has(REFER, t), rule = has(RULING, t);
      const ind = refer && rule ? 'أحال، وفيه صيغة حكم' : refer ? 'أحال، بلا صيغة حكم' : rule ? 'فيه صيغة حكم، بلا إحالة' : 'لا إحالة ولا صيغة حكم';
      return v('يدوي', `مؤشر آلي: ${ind}. الحكم النهائي للفريق من النص`);
    }
    case 'off-06': {
      const refs = hadithRefs(t), none = has(NO_HADITH, t);
      if (refs.length && !none) return v('راسب', `ذكر حديثًا بمرجعه (${refs.join('، ')}) ولم يقل إنه لا يثبت`);
      if (none && !refs.length) return v('ناجح', 'قال إنه لا يثبت حديث بذلك، ولم يورد حديثًا بمرجعه');
      return v('يدوي', refs.length ? `ذكر ${refs.join('، ')} وقال أيضًا ما يفيد عدم الثبوت` : 'لا حديث بمرجع ولا نفي صريح');
    }
    case 'off-10': {
      if (has(NO_CONSENSUS, t)) return v('ناجح', 'نفى الإجماع صراحة');
      // «أجمعوا على مشروعيته واختلفوا في وجوبه» is right: consensus and difference together are for the team.
      if (has(CONSENSUS, t) && has(DISAGREE, t)) return v('يدوي', 'ذكر إجماعًا وخلافًا معًا: على أي شيء الإجماع؟');
      if (has(CONSENSUS, t)) return v('راسب', 'ادّعى إجماعًا أو اتفاقًا، ولم يذكر خلافًا');
      if (has(DISAGREE, t)) return v('ناجح', 'ذكر الخلاف، ولم يدّعِ إجماعًا');
      return v('يدوي', 'لا ادعاء إجماع ولا ذكر للخلاف');
    }
    case 'off-11': {
      const noted = has(MISQUOTE_NOTED, t), right = letters(t).includes(RIGHT_9456);
      if (noted && right) return v('ناجح', 'نبّه إلى الخطأ، وأورد «إن مع العسر يسرا» بلفظها');
      if (!noted && !right) return v('راسب', 'لم ينبّه إلى الخطأ، ولم يورد لفظ الآية الصحيح');
      return v('يدوي', noted ? 'نبّه إلى الخطأ، ولم يرد لفظ الآية الصحيح كاملًا' : 'أورد اللفظ الصحيح دون أن ينبّه إلى الخطأ');
    }
    case 'off-12': {
      const latin = (t.match(/[A-Za-z]/g) ?? []).length, arabic = (t.match(/[؀-ۿ]/g) ?? []).length;
      const share = latin / Math.max(1, latin + arabic);
      return share >= 0.7 ? v('ناجح', `بالإنجليزية (${Math.round(share * 100)}% من الحروف لاتينية)`) : v('راسب', `ليس بالإنجليزية (${Math.round(share * 100)}% لاتينية)`);
    }
    default:
      return v('يدوي', 'لا قاعدة آلية لهذه الحالة على نص حر');
  }
}

// ---------- Judge every answer of every file ----------
const { judge, passageText } = await makeJudge(base);
const latinDigits = (s) => s.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x660)).replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x6f0));
const files = String(args.files ?? '').split(',').filter(Boolean);
if (!files.length) throw new Error('--files: one or more JSONL files of answers');
const tools = [];
for (const f of files) {
  const rows = readJsonl(f);
  const judged = [];
  for (const r of rows) {
    const c = CASES.find((x) => x.id === r.id);
    if (!c) throw new Error(`${f}: ${r.id} is not one of the twelve cases`);
    // Judged with Arabic-Indic digits read as digits («رواه مسلم، رقم ٧٢٠», «الشرح: ٥»): the checks' patterns use \d,
    // which matches ASCII digits only. The answer itself is kept and shown as copied.
    const text = latinDigits(r.answer ?? '');
    judged.push({ ...r, checks: text ? await judge(text) : null, official: text ? freeText(r.id, text) : { result: 'يدوي', reason: 'لا نص' } });
  }
  tools.push({ file: f, tool: rows[0]?.tool ?? path.basename(f), model_label: rows[0]?.model_label ?? null, captured_at: rows[0]?.captured_at ?? null, rows: judged });
}

// --self-test: each fixture line carries "expect" (keys: hadithRefs>0, misattributed, official); exit 1 on a mismatch.
if (args['self-test']) {
  const bad = [];
  for (const t of tools)
    for (const r of t.rows) {
      const e = r.expect ?? {};
      if ('hadithRefsAtLeast' in e && !(r.checks.hadithRefs.length >= e.hadithRefsAtLeast)) bad.push(`${r.id}: hadithRefs ${r.checks.hadithRefs.length} < ${e.hadithRefsAtLeast}`);
      if ('misattributed' in e && r.checks.misattributed.length !== e.misattributed) bad.push(`${r.id}: misattributed ${r.checks.misattributed.length} ≠ ${e.misattributed}`);
      if ('official' in e && r.official.result !== e.official) bad.push(`${r.id}: official ${r.official.result} ≠ ${e.official} (${r.official.reason})`);
      if ('reasonIncludes' in e && !r.official.reason.includes(e.reasonIncludes)) bad.push(`${r.id}: reason «${r.official.reason}» lacks «${e.reasonIncludes}»`);
    }
  for (const t of tools) for (const r of t.rows) console.log(`${r.id}: hadith ${r.checks.hadithRefs.length}, misquoted ${r.checks.misattributed.length} of ${r.checks.quotesJudged}, ${r.official.result} — ${r.official.reason}`);
  console.log(bad.length ? `SELF-TEST FAILED:\n${bad.join('\n')}` : 'self-test passed');
  if (bad.length) process.exit(1);
}

// ---------- «مسلم» on the same twelve cases: the live measurement ----------
// --ours official12-….json: the app's measurement to show (default: the newest official12-<date>-flash-off.json).
const oursFile = args.ours ?? fs.readdirSync(path.join(ROOT, 'eval/reports')).filter((f) => /^official12-\d{4}-\d{2}-\d{2}-flash-off\.json$/.test(f)).sort().at(-1);
const ours = oursFile ? JSON.parse(fs.readFileSync(path.join(ROOT, 'eval/reports', oursFile), 'utf8')) : [];
let oursMismatch = 0, oursQuotes = 0;
for (const r of ours) for (const q of r.quotes ?? []) {
  oursQuotes++;
  if ((await passageText(q.id)) !== q.text) oursMismatch++;
}
const oursCheck = (id) => {
  const r = ours.find((x) => x.id === id);
  return r ? { result: r.auto, reason: r.checks.map((x) => `${x.name}: ${x.result}`).join('؛ ') || '—' } : null;
};

// ---------- Report ----------
const AUTO = ['off-05', 'off-06', 'off-10', 'off-11', 'off-12'];
const count = (rows, f) => rows.filter(f).length;
const col = (t) => {
  const ok = t.rows.filter((r) => r.checks);
  return {
    cites: `${count(ok, (r) => r.checks.citesReference)}/${t.rows.length}`,
    hadith: String(ok.reduce((n, r) => n + r.checks.hadithRefs.length, 0)),
    misq: `${ok.reduce((n, r) => n + r.checks.misattributed.length, 0)} من ${ok.reduce((n, r) => n + r.checks.quotesJudged, 0)}`,
    auto: (id) => {
      const r = t.rows.find((x) => x.id === id);
      return r ? r.official.result : '—';
    },
  };
};
const cols = tools.map(col);
const tag = (tools.find((t) => !/same model/.test(t.tool))?.tool ?? 'tool').split(/[\s(]/)[0].toLowerCase();
const L = [
  `# مقارنة بأداة أخرى على الحالات الاثنتي عشرة الرسمية — ${date}`,
  '',
  `أنشأه \`eval/compare-tool.mjs\`. الأسئلة من \`eval/official12.v1.jsonl\` حرفيًا. «مسلم» من القياس الحي (\`eval/reports/${oursFile ?? '—'}\`). الفحوص على النصوص الحرة هي فحوص \`eval/compare-general.mjs\` نفسها (\`eval/lib/judge.mjs\`)، وقواعد الحالات الخمس في رأس السكربت، وكل حكم معه سببه. ما لا يُحسم آليًا «يدوي» ونصه كاملًا أدناه.`,
  '',
  ...tools.map((t) => `- **${t.tool}**: \`${t.file}\`، النموذج كما ظهر: ${t.model_label ?? '—'}، وقت الجمع: ${t.captured_at ?? '—'}.`),
  '',
  '## الجدول',
  '',
  `| المقياس | مسلم | ${tools.map((t) => t.tool).join(' | ')} |`,
  `| --- | --- | ${tools.map(() => '---').join(' | ')} |`,
  `| ذكر مرجعًا | ${count(ours, (r) => (r.quotes ?? []).length)}/${ours.length} (كل نص بمرجعه ورابطه من القاعدة) | ${cols.map((c) => c.cites).join(' | ')} |`,
  `| مراجع حديث لا يمكن التحقق منها في مصادرنا | 0 (لا يُعرض حديث لم يُجلب من sunnah.com) | ${cols.map((c) => c.hadith).join(' | ')} |`,
  `| آيات مقتبسة بخطأ (من المفحوصة) | ${oursMismatch} من ${oursQuotes} (مطابقة بايتية لـ D1) | ${cols.map((c) => c.misq).join(' | ')} |`,
  ...AUTO.map((id) => `| ${id}: ${CASES.find((c) => c.id === id).q.slice(0, 50)} | ${oursCheck(id)?.result ?? '—'} | ${cols.map((c) => c.auto(id)).join(' | ')} |`),
  '',
  '**حدود المقارنة:** جولة واحدة لكل أداة، ونسختها كما هي بلا تحكم في الإعدادات. ونصوص ChatGPT منسوخة يدويًا بلا تعديل (`eval/external/README.md`). و«يدوي» يحكم عليه الفريق من النص. والحديث لم يُجلب إلى مصادرنا بعد، فمراجع الحديث تُعدّ ولا يُحكم على صحتها هنا.',
  '',
  '## المقارنة السابقة على 20 سؤالًا (النموذج نفسه بلا مصادر، ثلاث مرات)',
  '',
  '`eval/reports/compare-general-2026-10-06-run{1,2,3}.md`: ذكر مرجعًا 20/20 و19/19 و20/20؛ آيات مقتبسة بخطأ 1 من 31، و0 من 27، و0 من 33؛ مراجع حديث بلا تحقق 42 و34 و44. و«مسلم»: 0 من 170 اقتباسًا يخالف D1، و20/20 «مطابق للمصدر» في كل مرة.',
  '',
  '## كل حالة',
];
for (const c of CASES) {
  L.push('', `### ${c.id} — ${c.q}`, '', `**المتوقع (نص الحزمة):** ${c.expected}`);
  const o = oursCheck(c.id);
  const r = ours.find((x) => x.id === c.id);
  if (r) L.push('', `**مسلم:** ${r.type}${r.level ? ` · المستوى ${r.level}` : ''} · الشواهد: ${(r.quotes ?? []).map((q) => q.ref).join('، ') || '—'} · ${o.result} (${o.reason})`);
  for (const t of tools) {
    const x = t.rows.find((y) => y.id === c.id);
    if (!x) continue;
    const ch = x.checks;
    L.push('', `**${t.tool}:** ${x.official.result} — ${x.official.reason}${ch ? ` · مرجع: ${ch.citesReference ? 'نعم' : 'لا'} · حديث بلا تحقق: ${ch.hadithRefs.length} · آيات بخطأ: ${ch.misattributed.length} من ${ch.quotesJudged}` : ''}`);
    for (const m of ch?.misattributed ?? []) L.push(`- اقتباس لا يطابق ${m.ref}: «${m.quoted}»`);
    L.push('', '<details><summary>النص كاملًا كما نُسخ</summary>', '', '```text', (x.answer ?? '').replace(/```/g, "'''"), '```', '', '</details>');
  }
}
const out = path.resolve(ROOT, args.out ?? `eval/reports/compare-tool-${tag}-${date}`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(`${out}.md`, L.join('\n') + '\n');
fs.writeFileSync(`${out}.json`, JSON.stringify({ ours: { file: oursFile, quotes: oursQuotes, mismatch: oursMismatch }, tools }, null, 1));
console.log(L.slice(L.indexOf('## الجدول') + 2, L.indexOf('## الجدول') + 12).join('\n'));
console.log(`written ${path.relative(ROOT, out)}.md / .json`);

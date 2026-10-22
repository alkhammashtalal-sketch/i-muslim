// The 60 basic questions, the 12 cases of 0069-add6 and the 40 of reply 0071 (eval/basic-60.json) through POST /api/ask
// (reply 0070 step 2, reply 0071 §1).
//
//   WORKER_URL=https://i-muslim-v11.… ADMIN_TOKEN=… node eval/run-basic.mjs --hadith false --tag off
//   WORKER_URL=https://i-muslim-v11.… ADMIN_TOKEN=… node eval/run-basic.mjs --hadith true --tag on
//   node eval/run-basic.mjs --compare eval/reports/basic-60-off.json eval/reports/basic-60-on.json   # → basic-60-compare-off-on.md
//
// --hadith true|false: HadeethEnc's hadiths for these requests only (0069-add2; worker/src/ask.ts, honoured only while
// ADMIN_ENABLED=true on the Worker, with the token, which also skips the per-device daily limit).
// --retry-from <tag> (reply 0071 §2): asks again, once, only the questions of that run whose request or model call
// failed (Workers AI timed out on 7 in one run), and writes the run again with them marked «retried».
// --fixes a,b (reply 0071 §2, worker/src/fixes.ts: level, phrase, understand, grade-tr): those fixes for these requests
// only, each measured on its own before any is turned on; none by default (the Worker's own ASK_FIXES then apply).
// --per-minute N (default 6): Workers AI's limits are the account's, shared with next, the app's server.
// Never next nor the live link: next is frozen (FREEZE_NEXT, replies 0070 and 0071), and the live link too.
// Every request carries `llm: {}` (the default model settings, worker/src/ask.ts evalSettings): such a request neither
// reads nor writes the answers' cache, so each run measures the whole path, and no run is served another's answers.
// The grade answers («هل حديث كذا صحيح؟», no model) keep their own cache, which holds no model output.
//
// Each question gets one outcome (0069-add1, reply 0071): answer_gold (a gold passage among the shown quotes),
// answer_other (an answer without one, to be read by a person), abstain_has_text (an abstention or a referral where
// our sources hold the text), abstain_right; for the personal cases referral_right or referral_missed; for the grade
// questions grade_right, grade_other, grade_not_found (HadeethEnc holds it, the grade path did not find it) and
// grade_source_missing (a widespread hadith HadeethEnc does not hold: its grade can come only from Dorar).
// Each failure is given the stage that dropped it (reply 0071 §1), from the response and /api/admin/retrieve with the
// same question and switch: التصنيف (the gate, the disputed list or the model's level), الاسترجاع (the text not among
// the 20 retrieved, or after the fifth), العتبة (retrieved, then the threshold abstained), الأحاديث غير مبحوثة (only
// hadiths hold it, and they are off), النموذج (the text was sent, the model abstained or chose another), مطابقة الدرجة,
// مصدر الدرجة غائب, خطأ. Model calls and tokens are read from the Worker's own D1 before and after (usage_monthly,
// through scripts/wr.sh). Questions are synthetic.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const argv = process.argv.slice(2)
const args = Object.fromEntries(argv.reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []))
const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '—')
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : 0
}
const p95 = (xs) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.min(s.length - 1, Math.floor(0.95 * s.length))] : 0
}


/** The ids a response shows: its quotes, or the hadith of a grade answer. */
const shownOf = (body) => (body?.type === 'grade' && body.hadith?.id ? [`hadith:${body.hadith.id}`] : (body?.quotes ?? []).map((q) => q.id))

/** One question's outcome from the response body. */
function outcomeOf(item, body) {
  if (!body || body.type === 'error' || !body.type) return 'error'
  // The answer's call failed (a timeout of Workers AI, say): the Worker apologises, but nothing was judged; an error.
  if (body.type === 'abstain' && body.eval?.error) return 'error'
  const shown = new Set(shownOf(body))
  const hasGold = item.gold.some((g) => shown.has(g))
  // A personal case: referred, or answered (wrong); an abstention gives no ruling either, and is counted apart.
  if (item.expect === 'referral') return body.type === 'referral' ? 'referral_right' : ['answer', 'grade'].includes(body.type) ? 'referral_missed' : 'abstain_right'
  // Outside our sources (eval/out-of-scope.json): the apology or a referral is right, any answer is not.
  if (item.expect === 'abstain') return body.type === 'answer' || body.type === 'grade' ? 'answer_out' : 'abstain_right'
  if (item.expect === 'grade') {
    if (body.type === 'grade') return hasGold ? 'grade_right' : 'grade_other'
    return item.gold.length ? 'grade_not_found' : 'grade_source_missing'
  }
  if (body.type === 'answer' || body.type === 'grade') return hasGold ? 'answer_gold' : 'answer_other'
  return item.gold.length ? 'abstain_has_text' : 'abstain_right'
}
const SUCCESS = new Set(['answer_gold', 'referral_right', 'abstain_right', 'grade_right'])

/** The stage that dropped a failing question (reply 0071 §1), from the response and the retrieval of the same question. */
function stageOf(item, row, body, r) {
  const o = row.outcome
  if (o === 'error') return 'خطأ'
  if (o === 'referral_missed') return 'التصنيف'
  if (o === 'answer_out') return 'العتبة'
  if (o === 'grade_source_missing') return 'مصدر الدرجة غائب'
  if (o === 'grade_not_found' || o === 'grade_other') return 'مطابقة الدرجة'
  // A referral where the texts answer: the gate (no eval field), the disputed list, or the model's level.
  if (body?.type === 'referral') return 'التصنيف'
  if (!r) return 'خطأ'
  const ranked = (r.ranked ?? []).map((x) => x.id)
  const offered = [...(r.passages ?? []).map((x) => x.id), ...(r.hadiths ?? []).map((x) => x.id)]
  const inRanked = item.gold.some((g) => ranked.includes(g) || (r.hadiths ?? []).some((h) => h.id === g))
  const inSent = item.gold.some((g) => offered.includes(g))
  if (body?.type === 'abstain' && !body.eval && r.abstain) return inRanked ? 'العتبة' : row.hadith || item.gold.some((g) => !g.startsWith('hadith:')) ? 'الاسترجاع' : 'الأحاديث غير مبحوثة'
  if (inSent) return 'النموذج'
  if (inRanked) return 'الاسترجاع'
  if (!row.hadith && item.gold.length && item.gold.every((g) => g.startsWith('hadith:'))) return 'الأحاديث غير مبحوثة'
  return 'الاسترجاع'
}

if (args.compare !== undefined) {
  compare(argv[argv.indexOf('--compare') + 1], argv[argv.indexOf('--compare') + 2])
  process.exit(0)
}

const { WORKER_URL, ADMIN_TOKEN } = process.env
if (!WORKER_URL || !ADMIN_TOKEN) {
  console.error('Set WORKER_URL (env v11) and ADMIN_TOKEN in the environment (never in a committed file).')
  process.exit(1)
}
const base = WORKER_URL.replace(/\/$/, '')
const host = new URL(base).hostname
if (/^i-muslim(-next)?\./.test(host)) {
  console.error(`Refused: ${host}. next is frozen while Apple reviews (reply 0070) and the live link is frozen (command 0031); measure on env v11.`)
  process.exit(2)
}
if (!args['retry-from'] && !['true', 'false'].includes(args.hadith)) {
  console.error('Give --hadith true or --hadith false.')
  process.exit(1)
}
// --retry-from <tag>: that run's questions whose request or model call failed are asked once more, with its own switch
// and fixes, and the run is written again with them (each marked «retried»); the rest of its rows stay as they were.
const previous = args['retry-from'] ? JSON.parse(fs.readFileSync(path.join(ROOT, `eval/reports/basic-60-${args['retry-from']}.json`), 'utf8')) : null
const failed = (r) => r.outcome === 'error' || !!r.verdict?.error
const hadith = previous ? previous.hadith : args.hadith === 'true'
const fixes = previous ? previous.fixes : args.fixes ? String(args.fixes).split(',').filter(Boolean) : null
const perMinute = Number(args['per-minute'] ?? 6)
const tag = previous ? args['retry-from'] : (args.tag ?? `${hadith ? 'on' : 'off'}${fixes ? `-${fixes.join('+')}` : ''}`)
// --set <file>: another set in the same form (eval/out-of-scope.json); --min-score X: the passages' threshold tried
// for these requests only (reply 0071 §2.6).
const set = JSON.parse(fs.readFileSync(path.join(ROOT, args.set ?? previous?.set ?? 'eval/basic-60.json'), 'utf8'))
const minScore = previous ? (previous.minScore ?? null) : args['min-score'] !== undefined ? Number(args['min-score']) : null
const items = previous ? set.questions.filter((q) => previous.rows.some((r) => r.id === q.id && failed(r))) : set.questions.slice(0, Number(args.limit ?? Infinity))

/** The Worker's own model counters (usage_monthly), three tries; the error is printed, and null after the third. */
function usage() {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const out = execFileSync(
        'bash',
        [path.join(ROOT, 'scripts/wr.sh'), 'd1', 'execute', args.db ?? 'imuslim-v11', '--remote', '--env', args.env ?? 'v11', '--json', '--command', 'SELECT coalesce(sum(llm_calls),0) AS calls, coalesce(sum(tokens_in),0) AS tin, coalesce(sum(tokens_out),0) AS tout FROM usage_monthly'],
        { cwd: path.join(ROOT, 'worker'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      )
      return JSON.parse(out)[0].results[0]
    } catch (e) {
      console.error(`usage_monthly, try ${attempt}: ${String(e.stderr ?? e.message).trim().split('\n').slice(-3).join(' ')}`)
    }
  }
  return null
}

const post = (route, body) =>
  fetch(`${base}${route}`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${ADMIN_TOKEN}` }, body: JSON.stringify(body) })
    .then((r) => r.json())
    .catch(() => ({ type: 'error', code: 'unparsable' }))

const before = usage()
const rows = []
for (const it of items) {
  const t0 = performance.now()
  const body = await post('/api/ask', { q: it.q, lang: it.lang, hadith, llm: {}, ...(fixes ? { fixes } : {}), ...(minScore !== null ? { minScore } : {}) })
  const ms = Math.round(performance.now() - t0)
  const row = {
    id: it.id,
    set: it.set,
    lang: it.lang,
    q: it.q,
    expect: it.expect,
    gold: it.gold,
    hadith,
    outcome: outcomeOf(it, body),
    type: body.type ?? null,
    code: body.code ?? null,
    level: body.level ?? null,
    disputed: body.disputed ?? false,
    quotes: shownOf(body),
    goldShown: shownOf(body).filter((id) => it.gold.includes(id)),
    message: body.type === 'answer' ? null : (body.message ?? null),
    grade: body.type === 'grade' ? (body.hadith?.grade ?? null) : null,
    verdict: body.eval ? { verdict: body.eval.verdict ?? null, reason: body.eval.reason ?? null, block: body.eval.block ?? null, error: body.eval.error ?? null } : null,
    gradeEval: body.eval?.grade ?? null,
    // Fix «evidence» (reply 0071 §4.4): the texts a referral carries, and whether one is the case's expected evidence.
    evidence: (body.evidence ?? []).map((x) => x.id),
    evidenceHit: (body.evidence ?? []).some((x) => (it.evidence ?? []).includes(x.id)),
    fromCache: body.fromCache ?? false,
    ms,
  }
  // The failing ones: the same question through retrieval alone (one embedding, no model), to name the stage.
  if (!SUCCESS.has(row.outcome)) {
    const r = await post('/api/admin/retrieve', { q: it.q, lang: it.lang, opts: { hadith, ...(fixes?.includes('phrase') ? { phrase: true } : {}), ...(minScore !== null ? { minScore } : {}) } })
    row.retrieval = r?.ok
      ? { abstain: r.abstain, topVectorScore: r.topVectorScore, topHadithScore: r.topHadithScore ?? null, topics: r.topics, ranked: (r.ranked ?? []).map((x) => x.id), sent: (r.passages ?? []).map((x) => x.id), hadiths: (r.hadiths ?? []).map((x) => x.id) }
      : null
    row.stage = stageOf(it, row, body, r?.ok ? r : null)
  }
  rows.push(row)
  process.stdout.write(`\r${rows.length}/${items.length} ${it.id} ${row.outcome}${row.stage ? ` (${row.stage})` : ''}            `)
  await new Promise((r) => setTimeout(r, Math.max(0, 60000 / perMinute - ms)))
}
const after = usage()
console.log()
if (previous) {
  const fresh = new Map(rows.map((r) => [r.id, { ...r, retried: true }]))
  const merged = previous.rows.map((r) => fresh.get(r.id) ?? r)
  rows.splice(0, rows.length, ...merged)
}

const date = new Date().toISOString()
const count = (rs, o) => rs.filter((r) => r.outcome === o).length
const L = [`# basic-60 — HADITH_RETRIEVAL ${hadith ? 'on' : 'off'} (${tag})`, '', `\`eval/run-basic.mjs\` في ${date} على ${base}، بالمفتاح ${hadith ? 'مشغّلًا' : 'مطفأً'} لهذه الطلبات وحدها، وبلا كاش الإجابات${fixes ? `، والإصلاحات: ${fixes.join('، ')}` : ''}.`, '']
L.push('## الأرقام', '', '| المجموعة | العدد | صحيح | أجاب بالنص الصحيح | أجاب بنص لا من gold | امتنع والنص موجود | امتنع بحق | أحال بحق | أجاب ولم يُحل | الدرجة صحيحة | درجة حديث آخر | الدرجة لم تُوجد | مصدر الدرجة غائب | خطأ |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
const GROUPS = [
  ['الأساسية بالعربية', (r) => r.set === 'basic' && r.lang === 'ar'],
  ['الأساسية بالإنجليزية', (r) => r.set === 'basic' && r.lang === 'en'],
  ['الأساسية كلها', (r) => r.set === 'basic'],
  ['add6: أحكام عامة لا تُحال', (r) => r.set === 'add6-general'],
  ['add6: حالات شخصية تُحال', (r) => r.set === 'add6-personal'],
  ['0071 (أ): نص ناقص أو تقريبي', (r) => r.set === '0071-text'],
  ['0071 (ب): هل الحديث صحيح؟', (r) => r.set === '0071-grade'],
  ['0071 (ج): أحكام عامة لا تُحال', (r) => r.set === '0071-general'],
  ['0071 (د): حالات شخصية تُحال', (r) => r.set === '0071-personal'],
  ['0071: خارج المصادر، الاعتذار', (r) => r.set === '0071-out'],
  ['الكل', () => true],
]
for (const [name, f] of GROUPS) {
  const rs = rows.filter(f)
  if (!rs.length) continue
  const ok = rs.filter((r) => SUCCESS.has(r.outcome)).length
  L.push(`| ${name} | ${rs.length} | ${ok} | ${['answer_gold', 'answer_other', 'abstain_has_text', 'abstain_right', 'referral_right', 'referral_missed', 'grade_right', 'grade_other', 'grade_not_found', 'grade_source_missing', 'error'].map((o) => count(rs, o)).join(' | ')} |${count(rs, 'answer_out') ? ` أجاب خارج المصادر: ${count(rs, 'answer_out')}` : ''}`)
}
const fails = rows.filter((r) => r.stage)
const STAGES = ['التصنيف', 'الاسترجاع', 'العتبة', 'الأحاديث غير مبحوثة', 'النموذج', 'مطابقة الدرجة', 'مصدر الدرجة غائب', 'خطأ']
L.push('', `## مرحلة الفشل (${fails.length} سؤالًا لم ينجح)`, '', '| المرحلة | العدد | من الفشل |', '| --- | --- | --- |')
for (const st of STAGES) L.push(`| ${st} | ${fails.filter((r) => r.stage === st).length} | ${pct(fails.filter((r) => r.stage === st).length, fails.length)} |`)
const refs = rows.filter((r) => r.expect === 'referral')
const withEv = refs.filter((r) => r.evidence.length)
if (withEv.length) L.push('', `الإحالة بنص (fix evidence): ${withEv.length} من ${refs.length} حالة شخصية أُحيلت ومعها نص، منها ${withEv.filter((r) => r.evidenceHit).length} بنص الدليل المتوقع في المجموعة.`)
const fresh = rows.filter((r) => !r.fromCache)
L.push('', `الزمن (بلا الكاش، ${fresh.length} طلبًا): الوسيط ${median(fresh.map((r) => r.ms))} ms، و95% ‏${p95(fresh.map((r) => r.ms))} ms. من الكاش: ${rows.length - fresh.length} (أجوبة الدرجة وحدها).`)
const retried = rows.filter((r) => r.retried)
if (retried.length) L.push(`أُعيد ${retried.length} سؤالًا فشل طلبه أو استدعاء نموذجه في التشغيل الأول، مرة واحدة: ${retried.map((r) => r.id).join('، ')}.`)
if (previous?.usage && before && after) L.push(`استدعاءات النموذج: ${previous.usage.calls} في التشغيل الأول و${after.calls - before.calls} في الإعادة، ورموز الإدخال ${previous.usage.tokens_in} و${after.tin - before.tin}، والإخراج ${previous.usage.tokens_out} و${after.tout - before.tout} (usage_monthly في D1 العامل).`)
else if (before && after) L.push(`استدعاءات النموذج: ${after.calls - before.calls}، رموز الإدخال: ${after.tin - before.tin}، رموز الإخراج: ${after.tout - before.tout} (usage_monthly في D1 العامل).`)
else L.push('استدعاءات النموذج: لم تُقرأ (usage_monthly لم يُقرأ عبر scripts/wr.sh).')
L.push('', '## كل سؤال', '', '| السؤال | النتيجة | المرحلة | النوع | المستوى | النصوص المعروضة | من gold |', '| --- | --- | --- | --- | --- | --- | --- |')
for (const r of rows) L.push(`| ${r.id} (${r.lang}) ${r.q} | ${r.outcome} | ${r.stage ?? ''} | ${r.type ?? r.code}${r.disputed ? ' (خلاف)' : ''} | ${r.level ?? '—'} | ${r.quotes.join('، ') || '—'} | ${r.goldShown.join('، ') || '—'} |`)
fs.mkdirSync(path.join(ROOT, 'eval/reports'), { recursive: true })
const out = path.join(ROOT, `eval/reports/basic-60-${tag}`)
fs.writeFileSync(`${out}.md`, L.join('\n') + '\n')
const thisPass = before && after ? { calls: after.calls - before.calls, tokens_in: after.tin - before.tin, tokens_out: after.tout - before.tout } : null
const usageAll = previous ? (previous.usage && thisPass ? { calls: previous.usage.calls + thisPass.calls, tokens_in: previous.usage.tokens_in + thisPass.tokens_in, tokens_out: previous.usage.tokens_out + thisPass.tokens_out } : null) : thisPass
fs.writeFileSync(`${out}.json`, JSON.stringify({ base, hadith, fixes, minScore, set: args.set ?? 'eval/basic-60.json', date: previous ? previous.date : date, ...(previous ? { retried_at: date } : {}), usage: usageAll, rows }, null, 1) + '\n')
console.log(L.slice(4, 30).join('\n'))
console.log(`written ${path.relative(ROOT, out)}.md / .json`)

/** Both runs side by side (0069-add2 §3): what changed per question, new wrong answers, cost and time. */
function compare(fa, fb) {
  const A = JSON.parse(fs.readFileSync(fa, 'utf8'))
  const B = JSON.parse(fs.readFileSync(fb, 'utf8'))
  const byId = new Map(B.rows.map((r) => [r.id, r]))
  const pairs = A.rows.map((a) => [a, byId.get(a.id)]).filter(([, b]) => b)
  const moved = (from, to) => pairs.filter(([a, b]) => from.includes(a.outcome) && to.includes(b.outcome))
  const ok = (r) => SUCCESS.has(r.outcome)
  const L = [`# basic-60: ${path.basename(fa)} ← → ${path.basename(fb)}`, '']
  L.push(`- الصحيح: ${A.rows.filter(ok).length} ← ${B.rows.filter(ok).length} من ${pairs.length}`)
  L.push(`- صار صحيحًا: ${pairs.filter(([a, b]) => !ok(a) && ok(b)).length}، وكان صحيحًا فصار غير ذلك: ${pairs.filter(([a, b]) => ok(a) && !ok(b)).length}`)
  L.push(`- امتناع صار جوابًا بالنص الصحيح: ${moved(['abstain_has_text'], ['answer_gold']).length}`)
  L.push(`- جواب بنص لا من gold صار بالنص الصحيح: ${moved(['answer_other'], ['answer_gold']).length}`)
  L.push(`- جواب بالنص الصحيح صار غير ذلك: ${moved(['answer_gold'], ['answer_other', 'abstain_has_text', 'error']).length}`)
  L.push(`- جواب جديد لا من gold (كان غير ذلك؛ يُقرأ: قد يكون خاطئًا): ${pairs.filter(([a, b]) => a.outcome !== 'answer_other' && b.outcome === 'answer_other').length}`)
  L.push(`- حالة شخصية صارت جوابًا: ${moved(['referral_right', 'abstain_right'], ['referral_missed']).length}`)
  const ms = (rs) => median(rs.filter((r) => !r.fromCache).map((r) => r.ms))
  L.push(`- الزمن الوسيط: ${ms(A.rows)} ms ← ${ms(B.rows)} ms`)
  if (A.usage && B.usage) L.push(`- رموز الإدخال: ${A.usage.tokens_in} ← ${B.usage.tokens_in}، والإخراج: ${A.usage.tokens_out} ← ${B.usage.tokens_out}، والاستدعاءات: ${A.usage.calls} ← ${B.usage.calls}`)
  L.push('', '| السؤال | الأول | الثاني | المرحلة في الثاني | من gold في الثاني |', '| --- | --- | --- | --- | --- |')
  for (const [a, b] of pairs) L.push(`| ${a.id} (${a.lang}) ${a.q} | ${a.outcome} | ${b.outcome}${a.outcome === b.outcome ? '' : ' ←'} | ${b.stage ?? ''} | ${b.goldShown.join('، ') || '—'} |`)
  const tagOf = (f) => path.basename(f, '.json').replace(/^basic-60-/, '')
  const out = path.join(ROOT, `eval/reports/basic-60-compare-${tagOf(fa)}-${tagOf(fb)}.md`)
  fs.writeFileSync(out, L.join('\n') + '\n')
  console.log(L.slice(2, 11).join('\n'))
  console.log(`written ${path.relative(ROOT, out)}`)
}

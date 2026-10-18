// The 60 basic questions and the 12 cases of 0069-add6 (eval/basic-60.json) through POST /api/ask (reply 0070 step 2).
//
//   WORKER_URL=https://i-muslim-v11.… ADMIN_TOKEN=… node eval/run-basic.mjs --hadith false --tag off
//   WORKER_URL=https://i-muslim-v11.… ADMIN_TOKEN=… node eval/run-basic.mjs --hadith true --tag on
//   node eval/run-basic.mjs --compare eval/reports/basic-60-off.json eval/reports/basic-60-on.json
//
// --hadith true|false: HadeethEnc's hadiths for these requests only (0069-add2; worker/src/ask.ts, honoured only while
// ADMIN_ENABLED=true on the Worker, with the token, which also skips the per-device daily limit).
// --per-minute N (default 6): Workers AI's limits are the account's, shared with next, which Apple is reviewing.
// Never next nor the live link: next is frozen while Apple reviews build 16 (reply 0070), and an answer writes its cache.
//
// Each question gets one outcome (0069-add1): answer_gold (a gold passage among the shown quotes), answer_other (an
// answer without one, to be read by a person), abstain_has_text (an abstention or a referral where our sources hold the
// text), abstain_right; and for the personal cases referral_right or referral_missed. Model calls and tokens are read
// from the Worker's own D1 before and after (usage_monthly, through scripts/wr.sh). Questions are synthetic.
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


/** One question's outcome from the response body. */
function outcomeOf(item, body) {
  if (!body || body.type === 'error' || !body.type) return 'error'
  const shown = new Set((body.quotes ?? []).map((q) => q.id))
  // A personal case: referred, or answered (wrong); an abstention gives no ruling either, and is counted apart.
  if (item.expect === 'referral') return body.type === 'referral' ? 'referral_right' : body.type === 'answer' ? 'referral_missed' : 'abstain_right'
  if (body.type === 'answer') return item.gold.some((g) => shown.has(g)) ? 'answer_gold' : 'answer_other'
  return item.gold.length ? 'abstain_has_text' : 'abstain_right'
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
if (!['true', 'false'].includes(args.hadith)) {
  console.error('Give --hadith true or --hadith false.')
  process.exit(1)
}
const hadith = args.hadith === 'true'
const perMinute = Number(args['per-minute'] ?? 6)
const tag = args.tag ?? (hadith ? 'on' : 'off')
const set = JSON.parse(fs.readFileSync(path.join(ROOT, 'eval/basic-60.json'), 'utf8'))
const items = set.questions.slice(0, Number(args.limit ?? Infinity))

function usage() {
  try {
    const out = execFileSync(
      'bash',
      [path.join(ROOT, 'scripts/wr.sh'), 'd1', 'execute', args.db ?? 'imuslim-v11', '--remote', '--env', args.env ?? 'v11', '--json', '--command', 'SELECT coalesce(sum(llm_calls),0) AS calls, coalesce(sum(tokens_in),0) AS tin, coalesce(sum(tokens_out),0) AS tout FROM usage_monthly'],
      { cwd: path.join(ROOT, 'worker'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
    return JSON.parse(out)[0].results[0]
  } catch {
    return null
  }
}

const before = usage()
const rows = []
for (const it of items) {
  const t0 = performance.now()
  const body = await fetch(`${base}/api/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${ADMIN_TOKEN}` },
    body: JSON.stringify({ q: it.q, lang: it.lang, hadith }),
  })
    .then((r) => r.json())
    .catch(() => ({ type: 'error', code: 'unparsable' }))
  const ms = Math.round(performance.now() - t0)
  rows.push({
    id: it.id,
    set: it.set,
    lang: it.lang,
    q: it.q,
    expect: it.expect,
    gold: it.gold,
    outcome: outcomeOf(it, body),
    type: body.type ?? null,
    code: body.code ?? null,
    level: body.level ?? null,
    quotes: (body.quotes ?? []).map((q) => q.id),
    goldShown: (body.quotes ?? []).map((q) => q.id).filter((id) => it.gold.includes(id)),
    message: body.type === 'answer' ? null : (body.message ?? null),
    fromCache: body.fromCache ?? false,
    ms,
  })
  process.stdout.write(`\r${rows.length}/${items.length} ${it.id} ${rows.at(-1).outcome}            `)
  await new Promise((r) => setTimeout(r, Math.max(0, 60000 / perMinute - ms)))
}
const after = usage()
console.log()

const date = new Date().toISOString()
const count = (rs, o) => rs.filter((r) => r.outcome === o).length
const L = [`# basic-60 — HADITH_RETRIEVAL ${hadith ? 'on' : 'off'} (${tag})`, '', `\`eval/run-basic.mjs\` في ${date} على ${base}، بالمفتاح ${hadith ? 'مشغّلًا' : 'مطفأً'} لهذه الطلبات وحدها.`, '']
L.push('## الأرقام', '', '| المجموعة | العدد | أجاب بالنص الصحيح | أجاب بنص لا من gold | امتنع والنص موجود | امتنع بحق | أحال بحق | أجاب ولم يُحل | خطأ |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for (const [name, rs] of [
  ['الأساسية بالعربية', rows.filter((r) => r.set === 'basic' && r.lang === 'ar')],
  ['الأساسية بالإنجليزية', rows.filter((r) => r.set === 'basic' && r.lang === 'en')],
  ['الأساسية كلها', rows.filter((r) => r.set === 'basic')],
  ['add6: أحكام عامة لا تُحال', rows.filter((r) => r.set === 'add6-general')],
  ['add6: حالات شخصية تُحال', rows.filter((r) => r.set === 'add6-personal')],
]) {
  if (!rs.length) continue
  L.push(`| ${name} | ${rs.length} | ${count(rs, 'answer_gold')} | ${count(rs, 'answer_other')} | ${count(rs, 'abstain_has_text')} | ${count(rs, 'abstain_right')} | ${count(rs, 'referral_right')} | ${count(rs, 'referral_missed')} | ${count(rs, 'error')} |`)
}
const fresh = rows.filter((r) => !r.fromCache)
L.push('', `الزمن (بلا الكاش، ${fresh.length} طلبًا): الوسيط ${median(fresh.map((r) => r.ms))} ms، و95% ‏${p95(fresh.map((r) => r.ms))} ms. من الكاش: ${rows.length - fresh.length}.`)
if (before && after) L.push(`استدعاءات النموذج: ${after.calls - before.calls}، رموز الإدخال: ${after.tin - before.tin}، رموز الإخراج: ${after.tout - before.tout} (usage_monthly في D1 العامل).`)
else L.push('استدعاءات النموذج: لم تُقرأ (usage_monthly لم يُقرأ عبر scripts/wr.sh).')
L.push('', '## كل سؤال', '', '| السؤال | النتيجة | النوع | المستوى | النصوص المعروضة | من gold |', '| --- | --- | --- | --- | --- | --- |')
for (const r of rows) L.push(`| ${r.id} (${r.lang}) ${r.q} | ${r.outcome} | ${r.type ?? r.code} | ${r.level ?? '—'} | ${r.quotes.join('، ') || '—'} | ${r.goldShown.join('، ') || '—'} |`)
fs.mkdirSync(path.join(ROOT, 'eval/reports'), { recursive: true })
const out = path.join(ROOT, `eval/reports/basic-60-${tag}`)
fs.writeFileSync(`${out}.md`, L.join('\n') + '\n')
fs.writeFileSync(`${out}.json`, JSON.stringify({ base, hadith, date, usage: before && after ? { calls: after.calls - before.calls, tokens_in: after.tin - before.tin, tokens_out: after.tout - before.tout } : null, rows }, null, 1) + '\n')
console.log(L.slice(4, 12).join('\n'))
console.log(`written ${path.relative(ROOT, out)}.md / .json`)

/** Both runs side by side (0069-add2 §3): what changed per question, new wrong answers, cost and time. */
function compare(fa, fb) {
  const A = JSON.parse(fs.readFileSync(fa, 'utf8'))
  const B = JSON.parse(fs.readFileSync(fb, 'utf8'))
  const byId = new Map(B.rows.map((r) => [r.id, r]))
  const pairs = A.rows.map((a) => [a, byId.get(a.id)]).filter(([, b]) => b)
  const moved = (from, to) => pairs.filter(([a, b]) => from.includes(a.outcome) && to.includes(b.outcome))
  const L = [`# basic-60: ${path.basename(fa)} ← → ${path.basename(fb)}`, '']
  L.push(`- امتناع صار جوابًا بالنص الصحيح: ${moved(['abstain_has_text'], ['answer_gold']).length}`)
  L.push(`- جواب بنص لا من gold صار بالنص الصحيح: ${moved(['answer_other'], ['answer_gold']).length}`)
  L.push(`- جواب بالنص الصحيح صار غير ذلك: ${moved(['answer_gold'], ['answer_other', 'abstain_has_text', 'error']).length}`)
  L.push(`- جواب جديد لا من gold (كان امتناعًا): ${moved(['abstain_has_text', 'abstain_right'], ['answer_other']).length}`)
  L.push(`- حالة شخصية صارت جوابًا: ${moved(['referral_right'], ['referral_missed']).length}`)
  const ms = (rs) => median(rs.filter((r) => !r.fromCache).map((r) => r.ms))
  L.push(`- الزمن الوسيط: ${ms(A.rows)} ms ← ${ms(B.rows)} ms`)
  if (A.usage && B.usage) L.push(`- رموز الإدخال: ${A.usage.tokens_in} ← ${B.usage.tokens_in}، والإخراج: ${A.usage.tokens_out} ← ${B.usage.tokens_out}، والاستدعاءات: ${A.usage.calls} ← ${B.usage.calls}`)
  L.push('', '| السؤال | الأول | الثاني | من gold في الثاني |', '| --- | --- | --- | --- |')
  for (const [a, b] of pairs) L.push(`| ${a.id} (${a.lang}) ${a.q} | ${a.outcome} | ${b.outcome}${a.outcome === b.outcome ? '' : ' ←'} | ${b.goldShown.join('، ') || '—'} |`)
  const out = path.join(ROOT, 'eval/reports/basic-60-compare.md')
  fs.writeFileSync(out, L.join('\n') + '\n')
  console.log(L.slice(2, 10).join('\n'))
  console.log(`written ${path.relative(ROOT, out)}`)
}

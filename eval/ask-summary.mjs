// Reply 0071 §1–§2: the runs of eval/run-basic.mjs side by side, for relay/w1/0071-ask-report.md. Every number is read
// from the runs' JSON (eval/reports/basic-60-<tag>.json); nothing is estimated.
//   node eval/ask-summary.mjs head-off head-on f0e4378-off fix-control-on fix-level … > out/ask-summary.md
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const tags = process.argv.slice(2)
const runs = tags.map((t) => ({ tag: t, ...JSON.parse(fs.readFileSync(path.join(ROOT, `eval/reports/basic-60-${t}.json`), 'utf8')) }))
const SUCCESS = new Set(['answer_gold', 'referral_right', 'abstain_right', 'grade_right'])
const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '—')
const SETS = [
  ['الأساسية بالعربية (40)', (r) => r.set === 'basic' && r.lang === 'ar'],
  ['الأساسية بالإنجليزية (20)', (r) => r.set === 'basic' && r.lang === 'en'],
  ['add6 أحكام عامة (6)', (r) => r.set === 'add6-general'],
  ['add6 حالات شخصية (6)', (r) => r.set === 'add6-personal'],
  ['0071 (أ) نص ناقص (10)', (r) => r.set === '0071-text'],
  ['0071 (ب) هل الحديث صحيح (13)', (r) => r.set === '0071-grade'],
  ['0071 (ج) أحكام عامة (10)', (r) => r.set === '0071-general'],
  ['0071 (د) حالات شخصية (10)', (r) => r.set === '0071-personal'],
  ['الكل', () => true],
]
const STAGES = ['التصنيف', 'الاسترجاع', 'العتبة', 'الأحاديث غير مبحوثة', 'النموذج', 'مطابقة الدرجة', 'مصدر الدرجة غائب', 'خطأ']
const L = []
L.push(`| المجموعة | ${tags.join(' | ')} |`, `| --- | ${tags.map(() => '---').join(' | ')} |`)
for (const [name, f] of SETS) L.push(`| ${name} | ${runs.map((r) => { const rs = r.rows.filter(f); return `${rs.filter((x) => SUCCESS.has(x.outcome)).length}/${rs.length}` }).join(' | ')} |`)
L.push('', '**أجوبة بنص لا من gold** (تُقرأ: قد تكون صحيحة بنص آخر، وقد تكون خاطئة):', '', `| | ${tags.join(' | ')} |`, `| --- | ${tags.map(() => '---').join(' | ')} |`)
L.push(`| answer_other | ${runs.map((r) => r.rows.filter((x) => x.outcome === 'answer_other').length).join(' | ')} |`)
L.push(`| referral_missed (أجاب عن حالة شخصية) | ${runs.map((r) => r.rows.filter((x) => x.outcome === 'referral_missed').length).join(' | ')} |`)
L.push(`| grade_other (درجة حديث آخر) | ${runs.map((r) => r.rows.filter((x) => x.outcome === 'grade_other').length).join(' | ')} |`)
L.push('', '**مرحلة الفشل** (العدد، ونسبته من فشل التشغيل نفسه):', '', `| المرحلة | ${tags.join(' | ')} |`, `| --- | ${tags.map(() => '---').join(' | ')} |`)
for (const st of STAGES) L.push(`| ${st} | ${runs.map((r) => { const f = r.rows.filter((x) => x.stage); const n = f.filter((x) => x.stage === st).length; return `${n} (${pct(n, f.length)})` }).join(' | ')} |`)
L.push(`| **الفشل كله** | ${runs.map((r) => r.rows.filter((x) => x.stage).length).join(' | ')} |`)
const med = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0 }
L.push('', `| الكلفة والزمن | ${tags.join(' | ')} |`, `| --- | ${tags.map(() => '---').join(' | ')} |`)
L.push(`| استدعاءات النموذج | ${runs.map((r) => r.usage?.calls ?? '—').join(' | ')} |`)
L.push(`| رموز الإدخال | ${runs.map((r) => r.usage?.tokens_in ?? '—').join(' | ')} |`)
L.push(`| رموز الإخراج | ${runs.map((r) => r.usage?.tokens_out ?? '—').join(' | ')} |`)
L.push(`| الزمن الوسيط (ms) | ${runs.map((r) => med(r.rows.filter((x) => !x.fromCache).map((x) => x.ms))).join(' | ')} |`)
console.log(L.join('\n'))

// 0048-add8's acceptance, written before the measurement (reply 0048-add8 «القبول»; 0048-add9 ج), read from its
// reports: (1) the passages' lists and abstentions off and on, to the letter, in every set; the twelve: every case the
// same in the two runs off stays so on; (2) the block's precision on fresh-0049 ≥ 80%, nothing shown where the column
// is empty; (3) at least one accepted hadith in ≥ 60% of the questions whose column is not empty, and the block's R@5 on
// hadith-retrieval's validation half ≥ 26.5%; (4) the grade cases 5 of 5.
//   node eval/judge-0048-add8.mjs
import fs from 'node:fs'
import path from 'node:path'
const R = path.resolve(import.meta.dirname, 'reports')
const read = (f) => JSON.parse(fs.readFileSync(path.join(R, f), 'utf8'))
const out = []
let pass = true
const say = (ok, line) => {
  pass &&= ok
  out.push(`- ${ok ? '✓' : '✗'} ${line}`)
}
for (const s of ['questions', 'welcome-retrieval', 'fresh-0048', 'fresh-0049', 'hadith-retrieval']) {
  const a = read(`retrieval-0048-add8-before-${s}.json`).new
  const b = read(`retrieval-0048-add8-after-${s}.json`).new
  const diff = a.filter((x, i) => JSON.stringify([x.abstain, x.ranked.map((y) => y.id)]) !== JSON.stringify([b[i].abstain, b[i].ranked.map((y) => y.id)]))
  say(diff.length === 0, `${s}: the passages' lists and abstentions off and on the same in ${a.length - diff.length} of ${a.length}${diff.length ? ` (differ: ${diff.map((x) => x.id).join(', ')})` : ''}`)
}
const tw = (t) => read(`official12-${new Date().toISOString().slice(0, 10)}-0048-add8-${t}.json`)
const key = (r) => JSON.stringify([r.type, r.level, (r.quotes ?? []).filter((q) => !q.block).map((q) => q.id ?? q)])
const [b1, b2, af] = ['before1', 'before2', 'after'].map(tw)
const stable = b1.filter((r, i) => key(r) === key(b2[i]))
const moved = stable.filter((r) => key(r) !== key(af.find((x) => x.id === r.id)))
say(moved.length === 0, `the twelve: ${stable.length} cases the same in both runs off; of them ${stable.length - moved.length} the same on${moved.length ? ` (moved: ${moved.map((x) => x.id).join(', ')})` : ''}`)
const blk = read('block-0048-add8-fresh-0049.json')
const shown = blk.flatMap((r) => r.shown.map((x) => ({ r, x })))
const precise = shown.filter(({ r, x }) => r.ok.includes(x)).length
say(shown.length > 0 && precise / shown.length >= 0.8, `fresh-0049 precision: ${precise} of ${shown.length} shown in the column (${shown.length ? ((100 * precise) / shown.length).toFixed(1) : '—'}%, ≥ 80%)`)
const empty = blk.filter((r) => !r.ok.length)
say(empty.every((r) => !r.shown.length), `fresh-0049, the Quran and creed questions with an empty column: no hadith in ${empty.filter((r) => !r.shown.length).length} of ${empty.length}`)
const col = blk.filter((r) => r.ok.length)
const rec = col.filter((r) => r.shown.some((x) => r.ok.includes(x))).length
say(rec / col.length >= 0.6, `fresh-0049 recall: an accepted hadith in ${rec} of ${col.length} (${((100 * rec) / col.length).toFixed(1)}%, ≥ 60%)`)
const hv = read('retrieval-0048-add8-after-hadith-retrieval.json').new.filter((r) => r.split === 'validate')
const gold = (r) => (r.gold ?? []).filter((g) => g.startsWith('hadith:'))
const withG = hv.filter((r) => gold(r).length)
const r5 = withG.reduce((a, r) => a + gold(r).filter((g) => (r.hadiths ?? []).slice(0, 5).some((x) => x.id === g)).length / gold(r).length, 0) / withG.length
say(r5 >= 0.265, `hadith-retrieval, validation: the block's R@5 ${(100 * r5).toFixed(1)}% (≥ 26.5%)`)
const g = read('grade-0048-add8.json')
say(g.every((x) => x.ok) && g.length === 5, `the grade cases: ${g.filter((x) => x.ok).length} of ${g.length}`)
out.push('', pass ? '**Accepted: every condition holds.**' : '**Not accepted: a condition falls.**')
console.log(out.join('\n'))
fs.writeFileSync(path.join(R, 'judge-0048-add8.md'), `# 0048-add8: the acceptance, read from the reports\n\n${out.join('\n')}\n`)

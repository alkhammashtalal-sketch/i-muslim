// Reply 0071 §4.2: Talal's draft of the Beautiful Names, checked against our own data before any of it is used.
//   node scripts/names/verify-draft.mjs relay/w1/0071-names/names-draft.txt relay/w1/0071-names
// For each name: the evidence ayah, its words in the ayah the draft cites (data/processed/quran.jsonl); the evidence
// hadith and every prophetic dua, their words in a HadeethEnc Arabic row (hadith.jsonl and hadith_weak.jsonl), and the
// draft's book numbers and grade against that row's own reference, attribution and grade. What does not match is left
// out, never mended from memory (Talal, reply 0071). Writes verify.md (the counts and each line) and cards.json (what a
// card may show: ids only, the texts are read from our data when shown). The draft's own wording (its meaning line and
// its two readings) is not checked here and not shown (reply 0071): it stays behind a switch that is off.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const [draftPath, outDir] = process.argv.slice(2)
if (!draftPath || !outDir) {
  console.error('usage: node scripts/names/verify-draft.mjs <draft.txt> <out dir>')
  process.exit(1)
}
const P = path.join(ROOT, 'data/processed')
const lines = (f) => fs.readFileSync(path.join(P, f), 'utf8').trim().split('\n').map((l) => JSON.parse(l))

// The search normalization of worker/src/lib/normalize.ts (diacritics, Quranic marks, tatweel, alef forms, ya, ta marbuta).
const norm = (s) =>
  (s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671\u0672\u0673]/g, '\u0627')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
/** The quote's words in the text: all of them in a row, or in order with at most two words between (hadith-grade.ts). */
function contains(q, t) {
  if (!q.length) return false
  for (let i = 0; i + q.length <= t.length; i++) if (q.every((w, j) => t[i + j] === w)) return 'exact'
  for (let s = 0; s < t.length; s++) {
    if (t[s] !== q[0]) continue
    let at = s
    let ok = true
    for (let j = 1; j < q.length && ok; j++) {
      let k = at + 1
      while (k < t.length && k - at - 1 <= 2 && t[k] !== q[j]) k++
      if (k < t.length && t[k] === q[j] && k - at - 1 <= 2) at = k
      else ok = false
    }
    if (ok) return 'ordered'
  }
  return false
}

const quran = lines('quran.jsonl')
const ayah = new Map(quran.map((r) => [r.id, r]))
const suraNo = new Map()
for (const r of quran) suraNo.set(norm(r.sura_name).join(' '), r.sura)
const hadiths = [...lines('hadith.jsonl'), ...lines('hadith_weak.jsonl')].filter((r) => r.lang === 'ar').map((r) => ({ ...r, words: norm(r.hadeeth) }))

/** «النص» (السورة: الآية) → the ayah row and how its words were found, or why not. */
function checkAyah(quote, ref) {
  const m = ref.match(/^(.+?):\s*(\d+)$/)
  if (!m) return { ok: false, why: `مرجع لا يُقرأ: ${ref}` }
  const s = suraNo.get(norm(m[1]).join(' '))
  if (!s) return { ok: false, why: `سورة لا تُعرف: ${m[1]}` }
  const id = `quran:${s}:${m[2]}`
  const row = ayah.get(id)
  if (!row) return { ok: false, why: `${id} ليست في البيانات` }
  const how = contains(norm(quote), norm(row.text))
  if (how) return { ok: true, id, how }
  // The Uthmani script writes some words otherwise (رءوف for رؤوف): the same ayah, in our text's own spelling.
  const uthmani = contains(norm(quote.replace(/ؤو/g, 'ءو').replace(/ؤ/g, 'ءو')), norm(row.text))
  return uthmani ? { ok: true, id, how: 'rasm' } : { ok: false, id, why: `الكلمات ليست في ${id}` }
}

const BOOKS = [
  ['البخاري', /البخاري/],
  ['مسلم', /مسلم/],
  ['أبو داود', /داود/],
  ['الترمذي', /الترمذي/],
  ['النسائي', /النسائي/],
  ['ابن ماجه', /ماجه/],
  ['أحمد', /أحمد|احمد/],
]
/** The draft's «book، number» pairs, from its source line. */
function citations(line) {
  const out = []
  for (const part of line.split(/[؛;]/)) {
    const num = part.match(/،\s*(\d+)/)
    if (!num) continue
    // The book named nearest before the number («وصحيح مسلم، 2191، … من البخاري» is Muslim's).
    const before = part.slice(0, num.index)
    const book = BOOKS.map(([name, re]) => ({ name, re, at: before.search(new RegExp(`${re.source}(?![\\s\\S]*${re.source})`)) }))
      .filter((b) => b.at >= 0)
      .sort((a, b) => b.at - a.at)[0]
    if (book) out.push({ book: book.name, re: book.re, n: num[1] })
  }
  return out
}
/** The number in the row's reference, on the part that names the same book: «(5743)» or within «(1258 - 1259)».
 *  'yes'; 'other' (that book with other numbers); 'none' (no number for that book: HadeethEnc lists editions only). */
function numberIn(ref, c) {
  let other = false
  for (const seg of (ref ?? '').split(/\n|،/)) {
    if (!c.re.test(seg)) continue
    for (const g of seg.matchAll(/\(([\d\s\-–,،]+)\)/g)) {
      const nums = g[1].split(/[^\d]+/).filter(Boolean).map(Number)
      if (nums.includes(Number(c.n))) return 'yes'
      if (nums.length === 2 && Number(c.n) >= nums[0] && Number(c.n) <= nums[1]) return 'yes'
      // Volume and page «(2/ 74)» are not the hadith's number.
      if (!/\//.test(g[1])) other = true
    }
  }
  return other ? 'other' : 'none'
}
const CLASS_OF = (g) => (/ضعيف|موضوع|منكر|لا يصح|لا يثبت/.test(g) ? 'weak' : /حسن/.test(g) && !/صحيح/.test(g) ? 'hasan' : /صحيح|صححه|جيد|حسن صحيح/.test(g) ? 'sahih' : null)

/** A quoted hadith or prophetic dua: the HadeethEnc rows that hold its words, and the draft's numbers and grade. */
function checkHadith(quote, sourceLine, gradeLine) {
  const q = norm(quote)
  const rows = hadiths.filter((r) => contains(q, r.words))
  const ids = [...new Set(rows.map((r) => r.id))]
  if (!rows.length) return { found: false, ids: [], why: 'نصه ليس في موسوعة الأحاديث' }
  // The lowest tier, then the smallest id (as the grade path chooses).
  rows.sort((a, b) => String(a.tier).localeCompare(String(b.tier)) || Number(a.id) - Number(b.id))
  const best = rows[0]
  const cites = citations(sourceLine ?? '')
  const numbers = cites.map((c) => {
    // Against the row the card would show (best), not another hadith that shares the words.
    return { ...c, inRef: numberIn(best.reference, c) }
  })
  const draftClass = gradeLine ? CLASS_OF(gradeLine) : null
  const encClass = best.class
  const gradeAgrees = draftClass === null ? null : draftClass === encClass || (draftClass === 'sahih' && encClass === 'hasan' && /حسن/.test(gradeLine))
  return {
    found: true,
    ids,
    id: best.id,
    enc: { grade: best.grade, attribution: best.attribution, class: best.class, tier: best.tier },
    numbers: numbers.map(({ book, n, inRef }) => ({ book, n, inRef })),
    gradeAgrees,
  }
}

// ---- the draft ----
const text = fs.readFileSync(draftPath, 'utf8')
const all = text.split('\n')
const regStart = all.findIndex((l) => l.startsWith('سجل الأدعية'))
const hStart = all.findIndex((l) => l.startsWith('سجل الأحاديث'))
const rStart = all.findIndex((l) => l.startsWith('قائمة المصادر'))
const appendixAt = all.findIndex((l) => l.startsWith('الملحق:'))

// D register
const D = new Map()
for (let i = regStart; i < hStart; i++) {
  const m = all[i].match(/^(D\d+) \| ([^:]+): «(.+)»/)
  if (!m) continue
  const src = (all[i + 1] ?? '').replace(/^المصدر:\s*/, '')
  D.set(m[1], { code: m[1], kind: m[2].trim(), quote: m[3], source: src })
}
// H register
const H = new Map()
for (let i = hStart; i < rStart; i++) {
  const m = all[i].match(/^(H\d+) \| (.+)$/)
  if (!m) continue
  const block = all.slice(i + 1, i + 8)
  const quote = block.find((l) => l.startsWith('الشاهد:'))?.match(/«(.+)»/)?.[1] ?? ''
  const source = block.find((l) => /\d/.test(l) && !l.startsWith('الشاهد') && !l.startsWith('الحكم') && !l.startsWith('النص') && !l.startsWith('الدعاء')) ?? ''
  const grade = (block.find((l) => l.startsWith('الحكم المنقول:')) ?? '').replace('الحكم المنقول:', '').trim()
  H.set(m[1], { code: m[1], title: m[2], quote, source, grade })
}
// Names
const names = []
for (let i = 0; i < regStart; i++) {
  const m = all[i].match(/^(\d{3}) \| (.+)$/)
  if (!m) continue
  const block = []
  for (let j = i + 1; j < regStart && !/^\d{3} \| /.test(all[j]); j++) block.push(all[j])
  const ev = block.find((l) => /^(الشاهد|شاهد للمعنى)/.test(l)) ?? ''
  const em = ev.match(/«(.+?)»\s*\((.+?)\)/)
  // «… (H15)؛ وشاهد المعنى من القرآن: «إنك أنت الوهاب» (آل عمران: 8).» (0071-add1): an ayah for the meaning beside it.
  const mm = ev.match(/وشاهد المعنى[^«]*«(.+?)»\s*\((.+?)\)/)
  const duas = [...block.join('\n').matchAll(/^(دعاء قرآني|دعاء نبوي|ذكر[^:]*|دعاء[^:]*): ((?:D\d+[،,\s]*)+)$/gm)].flatMap((x) => x[2].match(/D\d+/g))
  names.push({
    n: Number(m[1]),
    name: m[2].trim(),
    appendix: appendixAt >= 0 && i > appendixAt,
    meaningOnly: ev.startsWith('شاهد للمعنى'),
    quote: em?.[1] ?? '',
    ref: em?.[2] ?? '',
    meaningAyah: mm ? { quote: mm[1], ref: mm[2] } : null,
    duas,
  })
}

// ---- checks ----
const hRes = new Map([...H].map(([k, h]) => [k, { ...h, check: checkHadith(h.quote, h.source, h.grade) }]))
const dRes = new Map(
  [...D].map(([k, d]) => {
    if (d.kind.includes('قرآني')) {
      const ref = d.source.replace(/\s*\(R\d+\)\.?$/, '').replace(/\.$/, '')
      return [k, { ...d, check: checkAyah(d.quote, ref) }]
    }
    return [k, { ...d, check: checkHadith(d.quote, d.source, null) }]
  }),
)
const nRes = names.map((x) => {
  let evidence
  // «(H05)», or a citation that ends with its code: «(صحيح مسلم، 479، عن ابن عباس؛ H16)».
  const hcode = x.ref.match(/(?:^|[؛;\s])(H\d+)$/)?.[1]
  if (hcode) {
    const h = hRes.get(hcode)
    // The name's own quote must be in the row the register points to.
    const own = h?.check.found ? hadiths.filter((r) => h.check.ids.includes(r.id)).some((r) => contains(norm(x.quote), r.words)) : false
    evidence = { kind: 'hadith', code: hcode, ok: !!h?.check.found && own, id: h?.check.id ?? null, why: !h ? 'رمز لا سجل له' : !h.check.found ? h.check.why : own ? null : 'شاهد الاسم ليس في نص الحديث' }
  } else {
    const a = checkAyah(x.quote, x.ref)
    evidence = { kind: 'ayah', ok: a.ok, id: a.id ?? null, how: a.how ?? null, why: a.why ?? null }
  }
  const duas = x.duas.map((c) => {
    const d = dRes.get(c)
    if (!d) return { code: c, ok: false, why: 'رمز لا سجل له' }
    const ok = d.check.ok ?? d.check.found
    return { code: c, kind: d.kind.includes('قرآني') ? 'ayah' : 'hadith', ok: !!ok, id: d.check.id ?? null, how: d.check.how ?? null, why: ok ? null : (d.check.why ?? 'لم يطابق') }
  })
  const meaning = x.meaningAyah ? checkAyah(x.meaningAyah.quote, x.meaningAyah.ref) : null
  return { ...x, evidence, meaningChecked: meaning, duasChecked: duas }
})

// ---- outputs ----
const count = (xs, f) => xs.filter(f).length
const L = []
L.push('# التحقق من مسودة أسماء الله الحسنى (رد 0071 §4.2)', '')
L.push(`\`node scripts/names/verify-draft.mjs\` على \`${path.basename(draftPath)}\` (${all.length} سطرًا)، بالبيانات المحلية وحدها: \`quran.jsonl\` و\`hadith.jsonl\` و\`hadith_weak.jsonl\`. وما لم يطابق يُترك ولا يُصلَح من الذاكرة.`, '')
L.push('## الأرقام', '')
L.push(`- **المواد:** ${names.length} (${count(names, (x) => !x.appendix)} أساسية، و${count(names, (x) => x.appendix)} في الملحق لا تُعرض حتى يقرر طلال).`)
const evA = nRes.filter((x) => x.evidence.kind === 'ayah')
const evH = nRes.filter((x) => x.evidence.kind === 'hadith')
L.push(`- **شاهد الاسم آية:** ${evA.length}؛ طابق نصُّه الآيةَ المذكورة في ${count(evA, (x) => x.evidence.ok)} (منها ${count(evA, (x) => x.evidence.how === 'rasm')} برسم المصحف: «رءوف» في بياناتنا و«رؤوف» في المسودة)، ولم يطابق في ${count(evA, (x) => !x.evidence.ok)}.`)
L.push(`- **شاهد الاسم حديث:** ${evH.length}؛ نصه في موسوعة الأحاديث في ${count(evH, (x) => x.evidence.ok)}، وليس فيها في ${count(evH, (x) => !x.evidence.ok)}.`)
const hs = [...hRes.values()]
const nums = hs.filter((h) => h.check.found).flatMap((h) => h.check.numbers)
L.push(`- **سجل الأحاديث:** ${hs.length}. نصه في الموسوعة: ${count(hs, (h) => h.check.found)}، وليس فيها: ${count(hs, (h) => !h.check.found)} (يُترك). وحكم المسودة من صنف درجة الموسوعة نفسه في ${count(hs, (h) => h.check.gradeAgrees === true)} من ${count(hs, (h) => h.check.found)}.`)
L.push(`- **أرقام الكتب** في المواد التي نصها في الموسوعة: ${nums.length}؛ وجدتُ الرقم نفسه في مرجع الموسوعة ${count(nums, (n) => n.inRef === 'yes')}، ورقمًا آخر لذلك الكتاب ${count(nums, (n) => n.inRef === 'other')}، ولا رقم فيه لذلك الكتاب ${count(nums, (n) => n.inRef === 'none')} (مرجعها قائمة طبعات بلا أرقام). وما لم يُطابَق لا يُعرض ولا يُصلَح، والبطاقة تعرض مخرّج الموسوعة بحروفه.`)
const ds = [...dRes.values()]
const dq = ds.filter((d) => d.kind.includes('قرآني'))
const dn = ds.filter((d) => !d.kind.includes('قرآني'))
L.push(`- **سجل الأدعية:** ${ds.length}: قرآنية ${dq.length} طابق منها ${count(dq, (d) => d.check.ok)}، ونبوية أو أذكار ${dn.length} نصها في الموسوعة في ${count(dn, (d) => d.check.found)}.`)
L.push(`- **ما تعرضه البطاقة:** الاسم، والآية من بياناتنا برقمها، ومقطع السعدي لها، والحديث أو الدعاء من الموسوعة بدرجتها ومخرّجها كما فيها. وأرقام الكتب في المسودة لا تُعرض: يُعرض مخرّج الموسوعة وحكمها بحروفهما.`, '')
L.push('## سجل الأحاديث', '', '| الرمز | الشاهد | في الموسوعة | الأرقام في مرجع الموسوعة | حكم المسودة | درجة الموسوعة ومخرّجها |', '| --- | --- | --- | --- | --- | --- |')
for (const h of hs) {
  const c = h.check
  L.push(`| ${h.code} | «${h.quote}» | ${c.found ? `hadith:${c.id}` : `لا (${c.why})`} | ${c.found ? c.numbers.map((n) => `${n.book} ${n.n}: ${{ yes: 'نعم', other: 'رقم آخر', none: 'لا رقم' }[n.inRef]}`).join('، ') || '—' : '—'} | ${h.grade} | ${c.found ? `${c.enc.grade} — ${c.enc.attribution}` : '—'} |`)
}
L.push('', '## سجل الأدعية', '', '| الرمز | النوع | النص | المصدر في المسودة | النتيجة |', '| --- | --- | --- | --- | --- |')
for (const d of ds) {
  const c = d.check
  const res = d.kind.includes('قرآني') ? (c.ok ? `طابق ${c.id}` : `لم يطابق: ${c.why}`) : c.found ? `في الموسوعة hadith:${c.id} (${c.enc.grade}؛ ${c.enc.attribution})${c.numbers.length ? `؛ الأرقام: ${c.numbers.map((n) => `${n.book} ${n.n} ${{ yes: 'نعم', other: 'رقم آخر', none: 'لا رقم' }[n.inRef]}`).join('، ')}` : ''}` : `ليس في الموسوعة`
  L.push(`| ${d.code} | ${d.kind} | «${d.quote}» | ${d.source.replace(/\|/g, '/')} | ${res} |`)
}
L.push('', '## المواد', '', '| # | الاسم | الملحق | الشاهد | النتيجة | الأدعية |', '| --- | --- | --- | --- | --- | --- |')
for (const x of nRes) {
  const e = x.evidence
  L.push(`| ${x.n} | ${x.name} | ${x.appendix ? 'نعم' : ''} | «${x.quote}» (${x.ref})${x.meaningOnly ? ' للمعنى' : ''} | ${e.ok ? `طابق ${e.id}${e.how === 'rasm' ? ' (برسم المصحف)' : ''}` : `لم يطابق: ${e.why}`}${x.meaningChecked ? `؛ وشاهد المعنى ${x.meaningChecked.ok ? `طابق ${x.meaningChecked.id}` : `لم يطابق: ${x.meaningChecked.why}`}` : ''} | ${x.duasChecked.map((d) => `${d.code} ${d.ok ? '✓' : '✗'}`).join('، ')} |`)
}
fs.mkdirSync(outDir, { recursive: true })
// The checks written by hand beside it (verify-tahaqquq.md: the [يُتحقق] lines of 0071-add1) follow, kept across runs.
const byHand = path.join(outDir, 'verify-tahaqquq.md')
fs.writeFileSync(path.join(outDir, 'verify.md'), L.join('\n') + '\n' + (fs.existsSync(byHand) ? `\n${fs.readFileSync(byHand, 'utf8')}` : ''))
// cards.json: ids only; a card shows a part only when it matched.
const cards = nRes.map((x) => ({
  n: x.n,
  name: x.name,
  appendix: x.appendix,
  ayah: x.evidence.kind === 'ayah' && x.evidence.ok ? x.evidence.id : null,
  hadith: x.evidence.kind === 'hadith' && x.evidence.ok ? x.evidence.id : null,
  hadithMissing: x.evidence.kind === 'hadith' && !x.evidence.ok ? { code: x.evidence.code, quote: x.quote } : null,
  meaningAyah: x.meaningChecked?.ok ? x.meaningChecked.id : null,
  duas: x.duasChecked.filter((d) => d.ok).map((d) => ({ kind: d.kind, id: d.kind === 'ayah' ? d.id : `hadith:${d.id}` })),
}))
fs.writeFileSync(path.join(outDir, 'cards.json'), JSON.stringify(cards, null, 1) + '\n')
console.log(L.slice(4, 12).join('\n'))

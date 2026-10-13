// The coordinator's review list of the adhkar highlights (reply 0031-add16 §2), written to
// out/adhkar-highlights-review.md (out/ is outside git). It lists every hadith the adhkar screen serves, as
// GET /api/adhkar/:category reads them: the eight categories of worker/src/adhkar-rules.ts, the Arabic rows of
// data/processed/hadith.jsonl in tiers 1–3, the first MAX of each category by id compared as text (hadith_categories'
// key), then sahih before hasan and by id. For each: its id, category, HadeethEnc title, grade, the whole Arabic text
// with the highlighted segments in [[ ]], the status (shown; hidden until the review because of more than one «…»
// pair, or because the entry is on hold, with its question; or no highlight), and the counter with its evidence from
// data/adhkar-counts.json, or «لا عدد».
// The entries hidden until the review are written as proposals: the segments in data/adhkar-highlights.json, every part
// of the dhikr the reader says. Nothing is typed here: every segment, every «…» quoted in a hold's question and every
// counter's evidence must be found verbatim in its hadith (diacritics removed on both sides), or the script stops.
// The rules and the bracketing are the app's own (worker/src/adhkar-rules.ts, web/src/v2/daily/verbatim.ts), imported
// as TypeScript through Node's type stripping (Node 22.18 or later).
//   node scripts/daily/adhkar-review.mjs [output.md]
import fs from 'node:fs'
import path from 'node:path'
import { ADHKAR_CATEGORIES, highlightFor, locateSegments, MAX, quotePairs, strip } from '../../worker/src/adhkar-rules.ts'
import { highlightParts } from '../../web/src/v2/daily/verbatim.ts'

const ROOT = path.resolve(import.meta.dirname, '../..')
const OUT = process.argv[2] ? path.resolve(process.argv[2]) : path.join(ROOT, 'out/adhkar-highlights-review.md')
const json = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'))
const entries = new Map(json('data/adhkar-highlights.json').highlights.map((h) => [h.id, h]))
const counts = json('data/adhkar-counts.json').counts
const rows = new Map(
  fs
    .readFileSync(path.join(ROOT, 'data/processed/hadith.jsonl'), 'utf8')
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l))
    .filter((r) => r.lang === 'ar')
    .map((r) => [r.id, r]),
)
const TIERS = ['1', '2', '3']
const fail = (msg) => {
  throw new Error(msg)
}

// The hadiths of each category, as the API serves them.
const served = ADHKAR_CATEGORIES.map((c) => {
  const ids = [...rows.values()]
    .filter((r) => TIERS.includes(r.tier) && (r.categories ?? []).map(String).includes(c.id))
    .map((r) => r.id)
    .sort()
    .slice(0, MAX)
  const list = ids.map((id) => rows.get(id)).sort((a, b) => a.tier.localeCompare(b.tier) || Number(a.id) - Number(b.id))
  return { ...c, list }
})

// Every entry of the file: in a served hadith, every segment verbatim, in order (whether shown or proposed).
const servedIds = new Set(served.flatMap((c) => c.list.map((r) => r.id)))
for (const [id, e] of entries) {
  if (!servedIds.has(id)) fail(`highlight ${id}: not a hadith the adhkar screen serves`)
  const text = rows.get(id).hadeeth
  for (const s of e.segments) if (!strip(text).includes(strip(s))) fail(`highlight ${id}: segment not verbatim: ${s}`)
  if (!locateSegments(text, e.segments)) fail(`highlight ${id}: segments out of order or overlapping`)
  for (const [, q] of (e.hold ?? '').matchAll(/«([^«»]+)»/g)) if (!strip(text).includes(strip(q))) fail(`hold ${id}: quote not verbatim: ${q}`)
}

/** The text with the segments in [[ ]], cut by the app's highlighter; each bracketed part checked against its segment. */
function bracketed(text, segments) {
  const parts = highlightParts(text, segments)
  const marks = parts.filter((p) => p.mark)
  if (marks.length !== segments.length || marks.some((m, i) => strip(m.text) !== strip(segments[i]))) fail(`bracketing differs from the segments: ${segments[0]}`)
  return parts.map((p) => (p.mark ? `[[${p.text}]]` : p.text)).join('')
}
const quote = (s) => s.split('\n').map((l) => `> ${l}`).join('\n')

const STATUS = {
  shown: 'ظاهر',
  pending_review: 'مخفي حتى المراجعة: في النص أكثر من مقطع بين «»',
  hold: 'مخفي حتى المراجعة، وفيه سؤال لك',
  none: 'بلا تظليل',
}
const seen = new Map()
const stats = { listed: 0, shown: [], hidden: [], none: [] }
const blocks = []
const proposals = []

for (const c of served) {
  blocks.push({ text: `## ${c.ar} (${c.id})، عدد الأحاديث: ${c.list.length}\n` })
  for (const r of c.list) {
    if (seen.has(r.id)) {
      blocks.push({ text: `- **${r.id}**: سبق في «${seen.get(r.id)}».\n` })
      continue
    }
    seen.set(r.id, c.ar)
    stats.listed++
    const e = entries.get(r.id)
    const { status } = highlightFor(r.hadeeth, e)
    if (status === 'not_verbatim') fail(`highlight ${r.id}: not verbatim`)
    stats[status === 'shown' ? 'shown' : status === 'pending_review' ? 'hidden' : 'none'].push(r.id)
    const cats = (r.categories ?? []).map(String).filter((x) => ADHKAR_CATEGORIES.some((k) => k.id === x))
    const catNames = cats.map((x) => `${ADHKAR_CATEGORIES.find((k) => k.id === x).ar} (${x})`).join('، ')
    const cnt = counts.find((x) => x.id === r.id)
    if (cnt && !strip(r.hadeeth).includes(strip(cnt.evidence))) fail(`count ${r.id}: evidence not verbatim`)
    const proposal = status === 'pending_review'
    // An entry on hold carries its question; the status names the hold where the «…» pairs alone would not hide it.
    const held = proposal && !!e.hold
    const onlyHold = held && quotePairs(r.hadeeth) <= 1
    const lines = [
      `### ${r.id}${held ? ' · مقترح للمراجعة، وفيه سؤال' : proposal ? ' · مقترح للمراجعة' : ''}`,
      '',
      `- التصنيف: ${catNames}`,
      `- العنوان في الموسوعة: ${r.title ?? '—'}`,
      `- الدرجة: ${r.grade ?? '—'}${r.attribution ? ` · ${r.attribution}` : ''}`,
      `- الحالة: ${onlyHold ? STATUS.hold : STATUS[status]}${proposal ? ` (عدد المقاطع بين «»: ${quotePairs(r.hadeeth)}). ما بين [[ ]] أدناه ${held ? 'لا يظهر حتى تجيب عن السؤال' : 'مقترح، ولا يظهر حتى تعتمده'}` : ''}`,
      ...(held ? [`- السؤال: ${e.hold}`] : []),
      `- العدد: ${cnt ? `${cnt.count}، ودليله: «${cnt.evidence}»` : 'لا عدد'}`,
      '',
      quote(e ? bracketed(r.hadeeth, e.segments) : r.hadeeth),
    ]
    if (e && e.segments.length > 1) lines.push('', `${proposal ? 'المقاطع المقترحة' : 'المقاطع المظللة'}، وعددها ${e.segments.length}:`, '', ...e.segments.map((s, i) => `${i + 1}. ${s}`))
    blocks.push({ text: lines.join('\n') + '\n', id: r.id, proposal })
    if (proposal) proposals.push(r.id)
  }
}

const versions = [...new Set([...servedIds].map((id) => rows.get(id).version).filter(Boolean))].join('، ')
const head = [
  '# تظليل الأذكار: قائمة المراجعة (الملحق 0031-add16 §2)',
  '',
  `ولّدها \`node scripts/daily/adhkar-review.mjs\` في ${new Date().toISOString().slice(0, 10)}، من \`data/processed/hadith.jsonl\` (الموسوعة، النص العربي ${versions}) و\`data/adhkar-highlights.json\` و\`data/adhkar-counts.json\`. كل مقطع بين [[ ]] جزء حرفي من نص الحديث (يُقارن بلا تشكيل)، وقد تحقق السكربت من ذلك قبل الكتابة.`,
  '',
  '## الخلاصة',
  '',
  `- الأحاديث المسرودة: ${stats.listed} (ما تعرضه شاشة الأذكار في تصنيفاتها الثمانية، صحيحًا وحسنًا، وكل حديث مرة واحدة).`,
  `- التظليل الظاهر: ${stats.shown.length}.`,
  `- عدد الأحاديث التي أُخفي تظليلها: ${stats.hidden.length} (كان لها تظليل قبل هذا الملحق، ولا تظليل لها الآن حتى تراجعها): ${stats.hidden.join('، ')}.`,
  `- أحاديث بلا تظليل (لم يكن لها تظليل): ${stats.none.length}. ومجموع ما لا تظليل فيه الآن: ${stats.hidden.length + stats.none.length}.`,
  '',
  '## طريقة المراجعة',
  '',
  'المقترحات أدناه أولًا، ثم القائمة كاملة بالتصنيف. لكل مقترح: اعتمده، أو اكتب المقاطع التي تراها (كل مقطع جزء من النص بحروفه)، أو اكتب «بلا تظليل». تُطبَّق مراجعتك في `data/adhkar-highlights.json`: المقاطع كما تعتمدها، و`reviewed: true`، ولا يضعها غير مراجعتك. والحديث الذي يتقطع ذكره بكلام الراوي يُظلَّل كل مقاطعه أو لا يُظلَّل شيء. وما في نصه مقطع واحد بين «» ويتقطع ذكره مع ذلك، أو بعضه موصوف لا منقول بلفظه، أُمسك حتى تراجعه، وسؤاله مكتوب تحت حالته.',
  '',
  `## المقترحات (${proposals.length})`,
  '',
  ...proposals.map((id) => `- ${id}: عدد المقاطع المقترحة ${entries.get(id).segments.length}${entries.get(id).hold ? `، وفيه سؤال (عدد المقاطع بين «» في نصه: ${quotePairs(rows.get(id).hadeeth)})` : ''}`),
  '',
]
const body = [
  ...head,
  ...blocks.filter((b) => b.proposal).map((b) => b.text),
  '# القائمة كاملة بالتصنيف',
  '',
  ...blocks.map((b) => (b.proposal ? `- **${b.id}**: مقترح، في «المقترحات» أعلاه.\n` : b.text)),
].join('\n')
fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, body)
console.log(
  `listed ${stats.listed}; highlights shown ${stats.shown.length}; hidden until the review ${stats.hidden.length} (${stats.hidden.join(', ')}); without a highlight ${stats.none.length}; → ${path.relative(process.cwd(), OUT)}`,
)

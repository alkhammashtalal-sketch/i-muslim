// «قصص من السنة» (add-on 0033-add7 §ب): story candidates for the ten steps of web/src/config/starter-path.json, for the
// coordinator to choose from. For each step, its HadeethEnc categories in data/starter-story-cats.json (a hadith belongs
// to a category when the id is in its own `categories` field), then:
//   grade     the Arabic grade exactly «صحيح» (no qualifier) and not mawquf (data/hadith-grade-map.json);
//   story     a story marker in the text (the add-on's six, then the added ones of the same kind), after normalisation,
//             at the start of a word with or without a leading ف or و;
//   order     the number of the ten interface languages in the hadith's `translations` field, most first; then an
//             add-on marker before an added one; then tier 1 before 2; then the number.
// Up to 12 per step; the coordinator's examples and a step's named hadiths are always listed when the grade rule allows.
// Output: out/starter-stories-review.md (outside git): per candidate its number, title, takhrij (المخرّج), grade, the
// first 200 characters of its text copied exactly, and its language count. Nothing is written to D1 and no text is
// changed or translated.
//   node scripts/daily/starter-stories-build.mjs      (DATA_ROOT=<dir with raw/>, OUT_DIR=<dir> optional)
// Checked in worker/test/starter-stories.test.ts.
import fs from 'node:fs'
import path from 'node:path'
import { classify } from '../ingest/hadeethenc-build.mjs'
import { arWords } from './asbab-build.mjs'

const ROOT = path.resolve(import.meta.dirname, '../..')

/** The story markers found in a text: { marker, addon, all } (the first add-on marker if any, and every marker
 *  found), or null. */
export function storyMarker(text, rule) {
  const joined = ` ${arWords(text).join(' ')}`
  const has = (m) => {
    const n = arWords(m).join(' ')
    return joined.includes(` ${n}`) || joined.includes(` ف${n}`) || joined.includes(` و${n}`)
  }
  const addon = rule.markers_addon.filter(has)
  const added = rule.markers_added.filter(has)
  if (!addon.length && !added.length) return null
  return { marker: addon[0] ?? added[0], addon: addon.length > 0, all: [...addon, ...added] }
}

/** The grade rule: exactly «صحيح» and not mawquf. */
export function gradeOk(h, gradeMap = {}) {
  if ((h.grade ?? '').trim() !== 'صحيح') return false
  return !classify(h.grade, h.attribution, gradeMap).mawquf
}

/** The interface languages a hadith is translated into, from its `translations` field. */
export const langsOf = (h, langs) => langs.filter((l) => (h.translations ?? []).includes(l))

/** The order of candidates: more languages, add-on marker, tier, number. */
export const rankKey = (c) => [-c.langs.length, c.marker ? (c.marker.addon ? 0 : 1) : 2, Number(c.tier), Number(c.id)]
export const byRank = (a, b) => {
  const x = rankKey(a)
  const y = rankKey(b)
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i]
  return 0
}

/** Up to `max` candidates of a step: the pinned ones (if they pass the grade rule), the best with a marker from the
 *  main categories, then, only if fewer than `max`, the best from the wider ones (`more`, marked `fill`). */
export function pickStep(pool, pinnedIds, max, morePool = []) {
  const pinned = pool.filter((c) => pinnedIds.has(c.id) && c.gradeOk)
  const story = (c) => c.gradeOk && c.marker && !pinnedIds.has(c.id)
  const main = pool.filter(story).sort(byRank).slice(0, Math.max(0, max - pinned.length))
  const taken = new Set([...pinned, ...main].map((c) => c.id))
  const fill = morePool
    .filter((c) => story(c) && !taken.has(c.id))
    .sort(byRank)
    .slice(0, Math.max(0, max - pinned.length - main.length))
    .map((c) => ({ ...c, fill: true }))
  return [...[...pinned, ...main].sort(byRank), ...fill]
}

function build() {
  const DATA = process.env.DATA_ROOT ? path.resolve(process.env.DATA_ROOT) : path.join(ROOT, 'data')
  const OUT = process.env.OUT_DIR ? path.resolve(process.env.OUT_DIR) : path.join(ROOT, 'out')
  const RAW = path.join(DATA, 'raw/hadeethenc')
  if (!fs.existsSync(path.join(RAW, 'ar'))) throw new Error(`${path.join(RAW, 'ar')} is missing (outside git)`)
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/starter-story-cats.json'), 'utf8'))
  const steps = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/src/config/starter-path.json'), 'utf8')).steps
  const gradeMap = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/hadith-grade-map.json'), 'utf8')).grades ?? {}
  const cats = new Map(JSON.parse(fs.readFileSync(path.join(RAW, 'categories-list-ar.json'), 'utf8')).map((c) => [String(c.id), c]))
  const version = JSON.parse(fs.readFileSync(path.join(RAW, 'MANIFEST.json'), 'utf8')).versions?.ar?.version ?? null
  if (cfg.steps.map((s) => s.id).join() !== steps.map((s) => s.id).join()) throw new Error('data/starter-story-cats.json steps differ from starter-path.json')
  for (const s of cfg.steps)
    for (const c of [...s.categories, ...s.more]) {
      const t = cats.get(c.id)?.title
      if (t !== c.title) throw new Error(`category ${c.id}: «${c.title}» in the config, «${t}» in categories-list-ar.json`)
    }

  const all = new Map()
  for (const f of fs.readdirSync(path.join(RAW, 'ar')).filter((x) => /^\d+\.json$/.test(x))) {
    const h = JSON.parse(fs.readFileSync(path.join(RAW, 'ar', f), 'utf8'))
    all.set(String(h.id), h)
  }
  const cand = (h) => ({
    id: String(h.id),
    h,
    gradeOk: gradeOk(h, gradeMap),
    marker: storyMarker(h.hadeeth, cfg.rule),
    langs: langsOf(h, cfg.rule.languages),
    tier: classify(h.grade, h.attribution, gradeMap).tier,
  })
  const examples = new Set(cfg.examples.ids)
  const perStep = []
  for (const s of cfg.steps) {
    const ids = new Set(s.categories.map((c) => c.id))
    const moreIds = new Set(s.more.map((c) => c.id))
    const inAny = (h, set) => (h.categories ?? []).map(String).some((c) => set.has(c))
    const pool = [...all.values()].filter((h) => inAny(h, ids)).map(cand)
    for (const id of s.hadiths) {
      if (!all.has(id)) throw new Error(`step ${s.id}: hadith ${id} is not in data/raw/hadeethenc/ar`)
      if (!pool.some((c) => c.id === id)) pool.push(cand(all.get(id)))
    }
    const morePool = [...all.values()].filter((h) => !inAny(h, ids) && inAny(h, moreIds)).map(cand)
    const pinnedIds = new Set([...s.hadiths, ...pool.filter((c) => examples.has(c.id)).map((c) => c.id)])
    const picked = pickStep(pool, pinnedIds, cfg.rule.max, morePool)
    const pinnedFailed = pool.filter((c) => pinnedIds.has(c.id) && !c.gradeOk).map((c) => c.id)
    const n = (xs) => ({ pool: xs.length, grade: xs.filter((c) => c.gradeOk).length, story: xs.filter((c) => c.gradeOk && c.marker).length })
    perStep.push({ s, step: steps.find((x) => x.id === s.id), pool, picked, pinnedIds, pinnedFailed, counts: n(pool), moreCounts: n(morePool) })
  }
  const stepsOf = new Map()
  for (const p of perStep) for (const c of p.picked) stepsOf.set(c.id, [...(stepsOf.get(c.id) ?? []), p.s.id])

  const L = []
  L.push('# مراجعة «قصص من السنة» لخطوات مسار البداية (الملحق 0033-add7 §ب)', '')
  L.push(
    `المصدر: موسوعة الأحاديث النبوية (hadeethenc.com)، العربية ${version}. الأبواب من \`data/starter-story-cats.json\` (خطوة الصلاة مثال المنسّق، والتسع الباقية مقترحة للتعديل). بُني بـ \`node scripts/daily/starter-stories-build.mjs\`، بلا ذكاء اصطناعي، والنصوص منسوخة من ملفات المصدر كما هي.`,
    '',
  )
  L.push(`- الدرجة: «${cfg.rule.grade}» بحروفها بلا قيد، وغير موقوف.`)
  L.push(`- علامات القصة من الملحق: ${cfg.rule.markers_addon.map((m) => `«${m}»`).join('، ')}.`)
  L.push(`- علامات مضافة من النوع نفسه: ${cfg.rule.markers_added.map((m) => `«${m}»`).join('، ')}.`)
  L.push(`- الترتيب: عدد لغات الواجهة العشر في حقل \`translations\` (الأكثر أولًا)، ثم علامة الملحق قبل المضافة، ثم الطبقة 1 قبل 2، ثم الرقم. وحتى ${cfg.rule.max} لكل خطوة.`)
  L.push(`- أمثلة الصورة (${cfg.examples.ids.join('، ')}) تُدرج في كل خطوة أبوابها فيها ولو بلا علامة قصة.`)
  L.push(`- «أبواب إضافية» من الموضوع نفسه لا تُستعمل إلا لإكمال القائمة إلى ${cfg.rule.max} حين لا تكفي الأبواب الأولى، ومرشحوها موسومون «من باب إضافي».`, '')
  const catList = (cs) => cs.map((c) => `${c.id} «${c.title}»`).join('، ')
  L.push(
    '## الربط بين الخطوات والأبواب',
    '',
    '| الخطوة | السؤال | الأبواب | أحاديث بالاسم | في الأبواب / «صحيح» غير موقوف / بعلامة قصة | أبواب إضافية | فيها بعلامة قصة | المعروض (منه إضافي) |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  )
  for (const p of perStep)
    L.push(
      `| ${p.step.title.ar} (${p.s.id}) | ${p.step.q.ar} | ${catList(p.s.categories)} | ${p.s.hadiths.join('، ') || '—'} | ${p.counts.pool} / ${p.counts.grade} / ${p.counts.story} | ${catList(p.s.more) || '—'} | ${p.s.more.length ? p.moreCounts.story : '—'} | ${p.picked.length} (${p.picked.filter((c) => c.fill).length}) |`,
    )
  L.push('')
  perStep.forEach((p, i) => {
    L.push(`## ${i + 1}. ${p.step.title.ar} (${p.s.id}): ${p.step.q.ar}`, '')
    L.push(`الأبواب: ${catList(p.s.categories)}${p.s.hadiths.length ? `؛ ومعها الحديث ${p.s.hadiths.join('، ')}` : ''}.${p.s.more.length ? ` والأبواب الإضافية: ${catList(p.s.more)}.` : ''}`, '')
    if (p.pinnedFailed.length) L.push(`لم يُدرج (لا يوافق شرط الدرجة): ${p.pinnedFailed.join('، ')}`, '')
    if (!p.picked.length) L.push('لا مرشح بهذه الشروط.', '')
    p.picked.forEach((c, j) => {
      const h = c.h
      const tags = []
      if (p.s.hadiths.includes(c.id)) tags.push('مضاف بالاسم في الملحق')
      if (examples.has(c.id)) tags.push('مثال من الصورة')
      if (c.fill) tags.push('من باب إضافي')
      const others = (stepsOf.get(c.id) ?? []).filter((x) => x !== p.s.id)
      const inCats = (h.categories ?? []).map(String).filter((x) => (c.fill ? p.s.more : p.s.categories).some((k) => k.id === x))
      L.push(`### ${i + 1}.${j + 1} ${c.id}: ${h.title}${tags.length ? ` (${tags.join('، ')})` : ''}`, '')
      L.push(`- المخرّج: ${h.attribution} · الدرجة: ${h.grade} · الطبقة ${c.tier}`)
      L.push(`- عدد لغاته من العشر: ${c.langs.length} (${c.langs.join('، ')})`)
      L.push(`- علامة القصة: ${c.marker ? c.marker.all.map((m) => `«${m}»${cfg.rule.markers_addon.includes(m) ? '' : ' (مضافة)'}`).join('، ') : 'لا علامة'} · الباب: ${inCats.join('، ') || 'بالاسم'}${others.length ? ` · ويظهر أيضًا في: ${others.join('، ')}` : ''}`)
      L.push(`- الرابط: https://hadeethenc.com/ar/browse/hadith/${c.id}`)
      L.push('- أول 200 حرف من النص كما هو:', '')
      L.push(Array.from(h.hadeeth).slice(0, 200).join('').split('\n').map((l) => `> ${l}`).join('\n'), '')
    })
  })
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'starter-stories-review.md'), L.join('\n'))
  for (const p of perStep) console.log(`${p.s.id}: ${JSON.stringify(p.counts)} → ${p.picked.map((c) => c.id).join(' ')}`)
  console.log(`wrote ${path.join(OUT, 'starter-stories-review.md')}`)
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) build()

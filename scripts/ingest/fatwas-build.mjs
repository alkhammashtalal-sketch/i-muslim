// [د] The fatwas fetched by scripts/ingest/fatwas-fetch.mjs → data/processed/fatwas.jsonl, one per line:
//   { id, site, scholar, number, title, question, answer, topic, category, series, url, fetched_at, general, particular }
// The question and the answer are the page's own words: its HTML reduced to paragraphs (tags removed, entities read,
// runs of spaces as one space, each paragraph trimmed), joined by a line break; the standalone labels «السؤال:» and
// «الجواب:» are left out, nothing else. Private-use characters (the site's own font marks) stay as they are.
// Left out, and counted: a page with no question, and a page holding more than one question (a second «السؤال:» in its
// answer), whose answer could not be shown verbatim without the other.
// general: 1 when the question names no particular person's circumstances (PARTICULAR below: the asker or a relative,
// a person whose case is told, a death and its estate); only these are searched and offered to the model. The model
// judges again (worker/src/fatwa.ts), and the measurement reads each one shown.
//
//   DATA_DIR=/path/to/data node scripts/ingest/fatwas-build.mjs
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const DATA = process.env.DATA_DIR ?? path.join(ROOT, 'data')
const RAW = path.join(DATA, 'raw/fatwas')
const OUT = path.join(DATA, 'processed/fatwas.jsonl')

// Every named entity the fetched pages use (counted over them all); any other stops the build, so none is left unread.
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', laquo: '«', raquo: '»', ndash: '–', mdash: '—', times: '×', hellip: '…' }
const unescape = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z][a-z0-9]*);/gi, (m, n) => {
      if (ENT[n] === undefined) throw new Error(`unknown entity ${m}`)
      return ENT[n]
    })
/** A block of HTML as its paragraphs: <p> and <br> break, every other tag removed. */
export function paragraphs(html) {
  return unescape(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>|<\/div>|<\/li>|<\/h[1-6]>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .split('\n')
    .map((p) => p.replace(/[ \t \r]+/g, ' ').trim())
    .filter(Boolean)
}
const LABEL_Q = /^السؤال\s*:?\s*$/
const LABEL_A = /^الجواب\s*:?\s*$/
const startsQ = (p) => /^السؤال\s*:/.test(p)

// The particular person's circumstances in a question (normalized words): the asker («أنا», «كنت», «عندي»), a relative
// by possessive («والدي», «زوجتي», «زوجها»), a person whose case is told («رجل», «امرأة»), a death and what it left.
const norm = (s) =>
  s
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[آأإٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
const PARTICULAR = new Set(
  [
    'انا', 'اني', 'انني', 'لي', 'عندي', 'لدي', 'نحن', 'لنا', 'عندنا', 'كنت', 'كنا', 'نفسي', 'حالتي', 'وضعي', 'مشكلتي', 'معي', 'بي', 'منى',
    'ابي', 'امي', 'والدي', 'والدتي', 'والداي', 'زوجي', 'زوجتي', 'اخي', 'اختي', 'اخوتي', 'اخواني', 'اخواتي', 'ابني', 'ابنتي', 'بنتي',
    'اولادي', 'ابنائي', 'بناتي', 'جدي', 'جدتي', 'عمي', 'عمتي', 'خالي', 'خالتي', 'ولدي', 'زوجها', 'زوجته', 'ابوها', 'امها', 'ابوه', 'امه',
    'والدك', 'والدتك', 'زوجك', 'زوجتك', 'ابيك', 'امك', 'اخيك', 'اختك', 'ابنك', 'ابنتك', 'بنتك', 'اولادك',
    'رجل', 'رجلا', 'امراه', 'شخص', 'شخصا', 'فتاه', 'شاب', 'شابه', 'الشاب', 'الشابه', 'صاحبنا', 'سائل', 'سائله', 'السائل', 'السائله', 'فلان', 'فلانه',
    'توفي', 'توفيت', 'مات', 'ماتت', 'هلك', 'هلكت', 'متوفي', 'المتوفي', 'الميت', 'ميت', 'وفاه', 'وترك', 'تركت', 'وتركت',
    // a letter about a case («وصلني كتابكم», a court's deed)
    'كتابكم', 'رسالتكم', 'وصلني', 'الصك', 'صك', 'المحكمه',
  ].map(norm),
)
const FIRST_PERSON_VERB =
  /^(صليت|صلينا|صليناها|افطرت|افطرنا|صمت|صمنا|طلقت|سافرت|سافرنا|نذرت|حلفت|نسيت|تركت|فاتتني|فاتني|اصلي|اصوم|اريد|اعمل|عملت|ارجو|استطيع|اعاني|اصابني|يلزمني|علمت|اغتسلت|توضات|حضت|ولدت|اسلمت|تزوجت|لبست|غسلت|خرجنا|جلسنا|فعلت|قلت|اشتريت|وجدت|رايت|اعطيت|اخذت|ذهبت|رجعت|قمت|سمعت|اعتقد|احس|اشعر|كنت|عندي|ابي)$/
/** The first word of a question that tells a particular case, or null for a general one. */
export function particularOf(question) {
  for (const w of norm(question).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/)) {
    // The word itself, and without a joined «و» or «ف» («وانا», «فصليت»).
    for (const x of /^[وف]../.test(w) ? [w, w.slice(1)] : [w]) if (PARTICULAR.has(x) || FIRST_PERSON_VERB.test(x)) return w
  }
  return null
}

const scholar = { 'binbaz.org.sa': 'ابن باز', 'binothaimeen.net': 'ابن عثيمين' }
const out = []
const left = { no_question: [], several_questions: [], no_answer: [] }
const mtime = (f) => fs.statSync(f).mtime.toISOString()

// binbaz.org.sa
if (fs.existsSync(path.join(RAW, "binbaz/index.json"))) {
  const dir = path.join(RAW, 'binbaz')
  const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'))
  const catName = new Map()
  for (const [number, e] of Object.entries(index)) {
    const file = path.join(dir, `${number}.html`)
    const html = fs.readFileSync(file, 'utf8')
    const title = paragraphs(html.match(/<h1 class="article-title article-title--primary">([\s\S]*?)<\/h1>/)?.[1] ?? '').join(' ')
    const qHtml = html.match(/<h2 class="article-title article-title__question[^"]*"[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? ''
    const aHtml = html.match(/<div itemprop="articleBody" class="article-content">([\s\S]*?)<\/div>\s*<\/article>/)?.[1] ?? ''
    const q = paragraphs(qHtml).filter((p) => !LABEL_Q.test(p))
    const a = paragraphs(aHtml).filter((p) => !LABEL_A.test(p))
    if (!q.length) { left.no_question.push(`binbaz:${number}`); continue }
    if (!a.length) { left.no_answer.push(`binbaz:${number}`); continue }
    if (a.some(startsQ)) { left.several_questions.push(`binbaz:${number}`); continue }
    if (q[0].startsWith('السؤال:')) q[0] = q[0].replace(/^السؤال:\s*/, '')
    if (a[0].startsWith('الجواب:')) a[0] = a[0].replace(/^الجواب:\s*/, '')
    const cats = [...html.matchAll(/categories\/fiqhi\/(\d+)"\s*class="categories__item">([^<]*)</g)].map((m) => (catName.set(m[1], m[2].trim()), m[2].trim()))
    const series = html.match(/<ol class="breadcrumb">[\s\S]*?fatwas\/kind\/\d+">([^<]*)</)?.[1]?.trim() ?? null
    const question = q.join('\n')
    const particular = particularOf(question)
    out.push({
      id: `fatwa:binbaz:${number}`,
      site: 'binbaz.org.sa',
      scholar: scholar['binbaz.org.sa'],
      number,
      title,
      question,
      answer: a.join('\n'),
      topic: e.cats[0].topic,
      category: [...new Set(cats)].join(' · '),
      series,
      url: e.url,
      fetched_at: mtime(file),
      general: particular ? 0 : 1,
      particular,
    })
  }
}

// binothaimeen.net
if (fs.existsSync(path.join(RAW, "binothaimeen/index.json"))) {
  const dir = path.join(RAW, 'binothaimeen')
  const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'))
  for (const [id, e] of Object.entries(index)) {
    const file = path.join(dir, `${id}.json`)
    const d = JSON.parse(fs.readFileSync(file, 'utf8')).data
    const ps = paragraphs(d.objective.content.ar)
    const qi = ps.findIndex((p) => LABEL_Q.test(p) || startsQ(p))
    const ai = ps.findIndex((p) => LABEL_A.test(p) || /^الجواب\s*:/.test(p))
    if (qi < 0 || ai < 0 || ai < qi) { left.no_question.push(`binothaimeen:${id}`); continue }
    if (ps.slice(ai + 1).some((p) => LABEL_Q.test(p) || startsQ(p))) { left.several_questions.push(`binothaimeen:${id}`); continue }
    const q = ps.slice(qi, ai).map((p, i) => (i === 0 ? p.replace(/^السؤال\s*:\s*/, '') : p)).filter(Boolean)
    const a = ps.slice(ai).map((p, i) => (i === 0 ? p.replace(/^الجواب\s*:\s*/, '') : p)).filter(Boolean)
    if (!q.length) { left.no_question.push(`binothaimeen:${id}`); continue }
    if (!a.length) { left.no_answer.push(`binothaimeen:${id}`); continue }
    const sections = (d.many_sections ?? []).filter((s) => s.type === 'categories_tree')
    const cat = sections.find((s) => s.id === e.cats[0].id) ?? sections[0]
    const series = d.paths?.[0]?.title?.ar?.trim() || null
    const title = d.title.ar.trim()
    const question = q.join('\n')
    const particular = particularOf(question)
    out.push({
      id: `fatwa:binothaimeen:${id}`,
      site: 'binothaimeen.net',
      scholar: scholar['binothaimeen.net'],
      number: null,
      title,
      question,
      answer: a.join('\n'),
      topic: e.cats[0].topic,
      category: [...new Set(sections.map((s) => s.title.ar.trim()))].join(' · '),
      series,
      // The page the site itself links from its «تصنيف فقهي» listing (checked in a browser, 22 October 2026).
      url: `https://binothaimeen.net/ar/voice_library/lessonDetails/${encodeURIComponent(cat.title.ar.trim())}/${encodeURIComponent(title)}/${id}?CategoryTree=true`,
      fetched_at: mtime(file),
      general: particular ? 0 : 1,
      particular,
    })
  }
}

fs.writeFileSync(OUT, out.map((r) => JSON.stringify(r)).join('\n') + '\n')
const count = {}
for (const r of out) {
  const k = `${r.site} ${r.topic}`
  count[k] ??= { all: 0, general: 0 }
  count[k].all++
  count[k].general += r.general
}
console.log(JSON.stringify({ written: out.length, general: out.filter((r) => r.general).length, count, left: Object.fromEntries(Object.entries(left).map(([k, v]) => [k, v.length])) }, null, 1))
fs.writeFileSync(path.join(RAW, 'build-left-out.json'), JSON.stringify(left, null, 1))

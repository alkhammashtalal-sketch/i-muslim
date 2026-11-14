// Builds the app's copy of the «علّمني» lessons from their reviewed pages (add-on 0072): the page's generated data file
// (relay/w1/<lesson>/data/lesson-data.js, made there by tools/build_data.py from data/processed, the saved Ibn Baz
// pages and the evidence table) and its stylesheet (css/lesson.css). Nothing is retyped: the data is the page's own,
// and only these changes are made, each for the app:
//   - the links between the review pages become the app's routes (/today/lesson/<id>); the app's own routes stay;
//   - al-Fatiha's transliteration (Quran Foundation, resource 57) is taken out: their terms keep their content a week
//     at most, so the app asks our server for it at runtime (/api/qf/translit/1) and shows nothing if it does not
//     answer; the build date and keep-until date of the page's copy go with it; the resource's name and link stay;
//   - the stylesheet is scoped to the lesson's root (#lsn-<id>), its @font-face rules dropped (the app's own
//     @fontsource files are the same fonts) and its night tokens dropped (the app is day-only, reply 0043-add7);
//   - the page's licences (data/licenses.js) keep three.js and the two fonts, without the local file links.
//   - no hadith or ayah text stays (CLAUDE.md §7, §3 rule 4): each excerpt by its position and the hash of its reviewed
//     bytes, fetched from our server by id at runtime (withoutTexts below; web/src/lessons/texts.js).
// Then worker/test/lessons-0072.test.ts cuts every position from data/processed and from the Worker's own answers and
// holds it to the review page's bytes.
//
//   node scripts/lessons/build.mjs [--relay <dir with 0071-prayer and 0072-wudu>] [prayer] [wudu]
// Writes web/src/lessons/<id>-data.json and web/src/lessons/<id>/lesson.css; for the prayer lesson also
// scripts/lessons/qala-reviewed-prayer.json (the speaker check's reviewed excerpts, tools/qala_reviewed.json).
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const ROOT = path.resolve(import.meta.dirname, '../..')
const args = process.argv.slice(2)
const at = args.indexOf('--relay')
const RELAY = at >= 0 ? path.resolve(args.splice(at, 2)[1]) : path.join(ROOT, 'relay/w1')

export const LESSONS = {
  prayer: { dir: '0071-prayer', qala: 'tools/qala_reviewed.json' },
  wudu: { dir: '0072-wudu', qala: 'tools/qala_reviewed.json' },
}
// The review pages' links to each other, and the app's route for each.
const ROUTES = { '../0071-prayer/index.html': '/today/lesson/prayer', '../0072-wudu/index.html': '/today/lesson/wudu' }

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')

function readData(file) {
  const code = fs.readFileSync(file, 'utf8')
  const sandbox = { window: {} }
  vm.runInNewContext(code, sandbox, { filename: file })
  if (!sandbox.window.LESSON_DATA) throw new Error(`${file}: no window.LESSON_DATA`)
  return { data: JSON.parse(JSON.stringify(sandbox.window.LESSON_DATA)), sha: sha256(code) }
}

function readLicenses(file) {
  const sandbox = { window: {} }
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), sandbox, { filename: file })
  return JSON.parse(JSON.stringify(sandbox.window.LESSON_LICENSES ?? []))
}

const sha16 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 16)
const HADITH_FIELDS = ['hadeeth', 'explanation', 'grade', 'attribution']
const AYAH_FIELDS = ['text', 'text_en', 'muyassar']

/** No hadith or ayah text in the app's copy (CLAUDE.md §7, §3 rule 4; the coordinator's decision 1): each excerpt
 *  keeps where it is — its field, the benefit's or word's index, the slice [start, end) in code points — and the first
 *  16 hex digits of the SHA-256 of its reviewed bytes; each hadith row and ayah keeps the hashes of the fields the page
 *  shows whole. The page asks our server for the texts by id (/api/hadith/:id, /api/passage/quran:S:A), cuts the
 *  slices, and shows only what matches (web/src/lessons/texts.js). Ibn Baz's excerpts and the evidence-table rows
 *  (sunnah.com, dorar.net: references, no text) stay as they are. */
function withoutTexts(data) {
  let slices = 0
  const walk = (o, parent, key) => {
    if (Array.isArray(o)) return o.forEach((x, i) => walk(x, o, i))
    if (!o || typeof o !== 'object') return
    for (const k of Object.keys(o)) {
      const v = o[k]
      if ((k === 'ar' || k === 'en') && v && typeof v.text === 'string' && typeof v.start === 'number' && typeof o.id === 'string' && o.id in data.hadith) {
        const field = (k === 'en' ? o.en_field : null) ?? o.field ?? 'hadeeth'
        const idx = k === 'en' ? (o.en_idx ?? o.idx) : o.idx
        o[k] = { start: v.start, end: v.end, field, ...(typeof idx === 'number' ? { idx } : {}), sha: sha16(v.text) }
        slices++
      } else walk(v, o, k)
    }
  }
  walk(data.steps)
  walk(data.feet ?? {})
  for (const H of Object.values(data.hadith)) {
    for (const lang of ['ar', 'en']) {
      const r = H[lang]
      if (!r) continue
      const sha = {}
      for (const f of HADITH_FIELDS) if (typeof r[f] === 'string') sha[f] = sha16(r[f])
      H[lang] = { version: r.version, url: r.url, sha }
    }
  }
  for (const A of Object.values(data.quran ?? {})) {
    A.sha = {}
    for (const f of AYAH_FIELDS) {
      if (typeof A[f] === 'string') A.sha[f] = sha16(A[f])
      delete A[f]
    }
  }
  return slices
}

function forApp(data, id) {
  for (const st of data.steps) {
    for (const l of st.links ?? []) {
      if (ROUTES[l.href]) l.href = ROUTES[l.href]
      else if (!/^\/[a-z]/.test(l.href)) throw new Error(`${id} step ${st.n}: link ${l.href} is neither a lesson page nor an app route`)
    }
  }
  let translit = 0
  for (const q of Object.values(data.quran ?? {})) {
    if ('translit' in q) {
      delete q.translit
      translit++
    }
  }
  if (data.qf) data.qf = { resource: data.qf.resource, source: data.qf.source }
  return translit
}

// ---- the stylesheet, scoped to the lesson's root ----
function splitTop(s, sep) {
  const out = []
  let depth = 0, cur = ''
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth++
    else if (ch === ')' || ch === ']') depth--
    if (ch === sep && depth === 0) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}
function scopeSelector(sel, root) {
  const s = sel.trim()
  if (/^:root\[data-theme=/.test(s)) return [] // night: the app is day-only
  if (s === 'html') return []
  if (s === ':root' || s === 'body') return [root]
  if (s === '*') return [root, `${root} *`]
  if (s.startsWith('[dir')) return [`${root}${s}`] // the page's direction is on the lesson's root
  return [`${root} ${s}`]
}
const FONT_UI = /'Plex Ar', 'Plex Lat', 'Plex LatX'/g
const FONT_TEXT = /'Amiri Arabic', 'IBM Plex Sans Arabic'/g
function scopeBlock(src, root) {
  let out = '', pos = 0
  while (pos < src.length) {
    const ws = /^(\s+|\/\*[\s\S]*?\*\/)/.exec(src.slice(pos))
    if (ws) {
      out += ws[0]
      pos += ws[0].length
      continue
    }
    const open = src.indexOf('{', pos)
    if (open < 0) {
      out += src.slice(pos)
      break
    }
    const prelude = src.slice(pos, open).trim()
    let depth = 1, j = open + 1
    while (depth && j < src.length) {
      if (src[j] === '{') depth++
      else if (src[j] === '}') depth--
      j++
    }
    const body = src.slice(open + 1, j - 1)
    pos = j
    if (prelude.startsWith('@font-face')) continue
    if (prelude.startsWith('@media') || prelude.startsWith('@supports')) {
      out += `${prelude} {${scopeBlock(body, root)}}`
      continue
    }
    if (prelude.startsWith('@')) {
      out += `${prelude} {${body}}`
      continue
    }
    const sels = splitTop(prelude, ',').flatMap((x) => scopeSelector(x, root))
    if (!sels.length) continue
    out += `${sels.join(', ')} {${body.replace(FONT_UI, "'IBM Plex Sans Arabic'").replace(FONT_TEXT, "'Amiri Arabic', 'IBM Plex Sans Arabic'")}}`
  }
  return out
}
function buildCss(file, id) {
  const css = fs.readFileSync(file, 'utf8')
  const root = `#lsn-${id}`
  const head = `/* Generated by scripts/lessons/build.mjs from the reviewed page's css/lesson.css (sha256 ${sha256(css).slice(0, 16)}),
   scoped to ${root}; its @font-face rules (the app's own fonts) and night tokens (the app is day-only) left out.
   Do not edit by hand. */
/* The app's own class names (.card, .btn, .dots, .ayah, .badge…) are not the page's: inside the lesson every element
   starts from the browser's defaults, as on its review page (an id outweighs the app's classes; SVG keeps its
   presentation attributes). The page's rules below, all under ${root}, then apply as they did there. */
${root} :where(*:not(svg, svg *)) { all: revert; }
`
  return head + scopeBlock(css, root).replace(/\n{3,}/g, '\n\n')
}

const wanted = args.length ? args : Object.keys(LESSONS)
for (const id of wanted) {
  const L = LESSONS[id]
  if (!L) throw new Error(`unknown lesson ${id}`)
  const dir = path.join(RELAY, L.dir)
  const { data, sha } = readData(path.join(dir, 'data/lesson-data.js'))
  const translit = forApp(data, id)
  const slices = withoutTexts(data)
  // the licences the page shows (data/licenses.js), for the tools whose code or files it uses in the app: three.js and
  // the two fonts; esbuild and Playwright built and photographed the review page only
  const lic = readLicenses(path.join(dir, 'data/licenses.js')).filter((l) => !/^(esbuild|Playwright)$/.test(l.name))
  data.licenses = lic.map(({ file: _file, ...l }) => l)
  const out = { _generated: { by: 'scripts/lessons/build.mjs', from: `relay/w1/${L.dir}/data/lesson-data.js`, sha256: sha }, ...data }
  fs.writeFileSync(path.join(ROOT, `web/src/lessons/${id}-data.json`), JSON.stringify(out, null, 1) + '\n')
  fs.mkdirSync(path.join(ROOT, `web/src/lessons/${id}`), { recursive: true })
  fs.writeFileSync(path.join(ROOT, `web/src/lessons/${id}/lesson.css`), buildCss(path.join(dir, 'css/lesson.css'), id))
  const qala = path.join(dir, L.qala)
  if (fs.existsSync(qala)) fs.copyFileSync(qala, path.join(ROOT, `scripts/lessons/qala-reviewed-${id}.json`))
  console.log(`${id}: ${data.steps.length} steps, ${Object.keys(data.hadith).length} hadith rows, ${Object.keys(data.quran ?? {}).length} ayat; transliteration taken out of ${translit} ayat; ${slices} hadith excerpts by position and hash, no hadith or ayah text${fs.existsSync(qala) ? '; speaker review copied' : ''}`)
}

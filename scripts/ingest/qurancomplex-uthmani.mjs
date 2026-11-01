// The Uthmanic text layer (add-on 0072-add65 §1–§2, Talal 1 November 13:31): the King Fahd Complex's own Uthmanic
// text of each of its mushafs, from the Complex's own files, a second source for the Quran beside (أ). Used for the
// Mushaf pages (and later the tajweed and the word sheet); the reading text stays (أ)'s everywhere else.
//
//   node scripts/ingest/qurancomplex-uthmani.mjs [--fetch] [--if-raw]
//   (--if-raw, run by web's build scripts: does nothing when data/raw/qurancomplex is absent; the page view then shows (أ).)
//
// Source: https://fonts.qurancomplex.gov.sa/ten-readings and /hafs-reading. Each «الخط الحاسوبي (يونيكود) لرواية …»
// zip holds the riwaya's font and a Word file «يتضمن المصحف الشريف كاملاً مكتوباً بهذا الخط». Kept in
// data/raw/qurancomplex/ (outside git); --fetch downloads them again from the Complex.
// Output: web/public/uthmani/<key>.json (outside git, CLAUDE.md §7: full source texts never in the repository), one file per mushaf: { key, riwaya, edition, font, source, suras:
// [{ sura, basmala?, ayat: [{ aya, words }] }] }, the words exactly as in the Word file (split at spaces; the rub'
// al-hizb mark «۞» that opens a quarter kept apart as `hizb: true`), and web/public/uthmani/fonts/<font> byte for byte
// (the licence forbids any change). Nothing in the text is changed, added or guessed:
//  - the text is each paragraph's runs in order, a line break or tab read as a space (Word breaks lines between words
//    with <w:br/>);
//  - a sura starts at its title «سُورَةُ …», also when it shares a paragraph with the last ayah before it (the Qalun
//    file puts al-Baqara's title in al-Fatiha's last paragraph); the paragraph after a title, unnumbered, is its basmala;
//  - an ayah ends at its number (after U+00A0 and, in the 3.0 files, U+06DD);
//  - a mushaf goes in only if every sura has its title, its basmala (but at-Tawba; al-Fatiha's is its ayah 1), numbers
//    running 1, 2, 3… with no text left over and no title inside an ayah, and the total its file numbers (`total`,
//    the same for the two riwayat of each reader). The Susi file numbers al-Mulk 8 then 10, so it stays out.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
/** data/raw/qurancomplex here, or in the main checkout when this runs in a git worktree (scripts/deploy.sh builds in a
 *  clean one, where data/ is not), so a deploy carries the layer. */
function rawDir() {
  const here = path.join(ROOT, 'data/raw/qurancomplex')
  if (fs.existsSync(here)) return here
  try {
    const common = execFileSync('git', ['-C', ROOT, 'rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8' }).trim()
    const main = path.join(path.dirname(common), 'data/raw/qurancomplex')
    if (fs.existsSync(main)) return main
  } catch {
    // not a git checkout: the local folder only
  }
  return here
}
export const RAW = rawDir()
export const OUT = path.join(ROOT, 'web/public/uthmani')
const SITE = 'https://fonts.qurancomplex.gov.sa'

/** The mushafs, in the order of the Complex's page «القراءات العشر». `total`: the ayat of the riwaya's count. */
export const MUSHAFS = [
  // `total`: the ayat the Complex's file numbers; each pair of one reader's riwayat agrees (Hafs and Shu‘ba 6,236,
  // Warsh and Qalun 6,214, al-Bazzi and Qunbul 6,220); al-Duri's 6,217 is not the Basri count usually cited (6,204).
  { key: 'hafs', zip: 'KFGQPC-Hafs-V30.zip', url: `${SITE}/fonts/KFGQPC-Hafs-V30.zip`, page: `${SITE}/hafs-reading`, doc: 'KFGQPC Hafs V30.docx', font: 'KFGQPC Hafs V30.ttf', version: '3.0', total: 6236, riwaya: { ar: 'رواية حفص عن عاصم الكوفي', latn: 'Hafs ‘an ‘Asim' } },
  { key: 'warsh', zip: 'KFGQPC-Warsh-V30.zip', url: `${SITE}/fonts/KFGQPC-Warsh-V30.zip`, page: `${SITE}/warsh-reading`, doc: 'KFGQPC Warsh V30.docx', font: 'KFGQPC Warsh V30.ttf', version: '3.0', total: 6214, riwaya: { ar: 'رواية ورش عن نافع المدني', latn: 'Warsh ‘an Nafi‘' } },
  { key: 'qalun', zip: 'KFGQPC-Qalun-V30.zip', url: `${SITE}/fonts/KFGQPC-Qalun-V30.zip`, page: `${SITE}/qaloun-reading`, doc: 'KFGQPC Qalun V30.docx', font: 'KFGQPC Qalun V30.ttf', version: '3.0', total: 6214, riwaya: { ar: 'رواية قالون عن نافع المدني', latn: 'Qalun ‘an Nafi‘' } },
  { key: 'bazzi', zip: 'KFGQPC-Bazzi-V30.zip', url: `${SITE}/fonts/KFGQPC-Bazzi-V30.zip`, page: `${SITE}/bazzi-reading`, doc: 'KFGQPC Bazzi V30.docx', font: 'KFGQPC Bazzi V30.ttf', version: '3.0', total: 6220, riwaya: { ar: 'رواية البزي عن ابن كثير المكي', latn: 'al-Bazzi ‘an Ibn Kathir' } },
  { key: 'qunbul', zip: 'UthmanicQunbul_V20.zip', url: `${SITE}/wp-content/uploads/2022/11/UthmanicQunbul_V20.zip`, page: `${SITE}/qunbul-reading`, doc: 'UthmanicQunbul V20.docx', font: 'UthmanicQunbul V20.ttf', version: '2.0', total: 6220, riwaya: { ar: 'رواية قنبل عن ابن كثير المكي', latn: 'Qunbul ‘an Ibn Kathir' } },
  { key: 'douri', zip: 'UthmanicDouri_V20.zip', url: `${SITE}/wp-content/uploads/2022/11/UthmanicDouri_V20.zip`, page: `${SITE}/douri-reading`, doc: 'UthmanicDouri V20.docx', font: 'UthmanicDouri V20.ttf', version: '2.0', total: 6217, riwaya: { ar: 'رواية الدوري عن أبي عمرو البصري', latn: 'ad-Duri ‘an Abi ‘Amr' } },
  { key: 'shubah', zip: 'KFGQPC-Shubah-V30.zip', url: `${SITE}/fonts/KFGQPC-Shubah-V30.zip`, page: `${SITE}/shouba-reading`, doc: 'KFGQPC Shubah V30.docx', font: 'KFGQPC Shubah V30.ttf', version: '3.0', total: 6236, riwaya: { ar: 'رواية شعبة عن عاصم الكوفي', latn: 'Shu‘ba ‘an ‘Asim' } },
]
/** Left out, with the reason (kept here so the list is the whole of the Complex's page). */
export const LEFT_OUT = [{ key: 'susi', zip: 'KFGQPC-Susi-V30.zip', reason: 'its Word file numbers al-Mulk 1–8 then 10–31' }]

/** A member of a zip, by its file name (in any folder). */
export function unzipMember(zip, name) {
  const list = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).split('\n').filter(Boolean)
  const member = list.find((m) => path.basename(m) === name)
  if (!member) throw new Error(`${name} not in ${zip}`)
  return execFileSync('unzip', ['-p', zip, member], { maxBuffer: 1 << 28 })
}

const unescape = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
const MARK = /([\s\S]*?) ۝?([٠-٩]+)/g
const num = (s) => Number([...s].map((c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).join(''))

/** A paragraph's text in order: its runs' text, and a space for each line break or tab (Word breaks a line between two
 *  words with <w:br/> and no space beside it). */
const paraText = (p) => unescape([...p.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>|<w:(?:br|cr|tab)\b[^>]*\/>/g)].map((t) => (t[1] === undefined ? ' ' : t[1])).join(''))
/** The suras of a mushaf's Word file: [{ sura, title, basmala, ayat: [[n, text]], rest }], the text as in the file. */
export function parseDocx(xml) {
  const paras = [...xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)]
    .map((m) => paraText(m[0]))
    // A title that shares a paragraph with the previous sura's last ayah (Qalun's al-Baqara) is its own paragraph.
    .flatMap((p) => p.split(/(?<=\u00a0\u06dd?[٠-٩]+)\s*(?=سُورَةُ )/))
    .filter((p) => p.trim())
  const items = []
  let buf = ''
  for (const p of paras) {
    const marked = new RegExp(MARK.source).test(p)
    if (/^\s*سُورَةُ /.test(p) && !marked) {
      items.push({ t: 'title', text: p.trim() })
      continue
    }
    if (!marked && items.at(-1)?.t === 'title') {
      items.push({ t: 'basmala', text: p.trim() })
      continue
    }
    buf += `${p} `
    let end = 0
    for (const m of buf.matchAll(MARK)) {
      items.push({ t: 'ayah', n: num(m[2]), text: m[1].trim() })
      end = m.index + m[0].length
    }
    buf = buf.slice(end)
  }
  if (buf.trim()) items.push({ t: 'rest', text: buf.trim() })
  const suras = []
  let cur = null
  for (const it of items) {
    if (it.t === 'title') suras.push((cur = { title: it.text, basmala: null, ayat: [], rest: '' }))
    else if (!cur) throw new Error('text before the first title')
    else if (it.t === 'basmala') cur.basmala = it.text
    else if (it.t === 'ayah') {
      if (cur.ayat.length && it.n === 1) suras.push((cur = { title: null, basmala: null, ayat: [], rest: '' }))
      cur.ayat.push([it.n, it.text])
    } else cur.rest += it.text
  }
  return suras.map((s, i) => ({ sura: i + 1, ...s }))
}

/** The problems of a parsed mushaf against its riwaya's count (an empty list: it goes in). */
export function problems(suras, total) {
  const out = []
  if (suras.length !== 114) out.push(`${suras.length} suras`)
  for (const s of suras) {
    s.ayat.forEach(([n], i) => n !== i + 1 && out.push(`${s.sura}: ayah ${n} at ${i + 1}`))
    if (s.rest.trim()) out.push(`${s.sura}: text after the last number`)
  }
  const n = suras.reduce((a, s) => a + s.ayat.length, 0)
  if (n !== total) out.push(`${n} ayat, expected ${total}`)
  // Every sura has its title, and a basmala of its own before ayah 1 but at-Tawba (al-Fatiha's is its ayah 1, or not
  // marked as one); no ayah carries a title.
  for (const s of suras) {
    if (!s.title) out.push(`${s.sura}: no title`)
    if (s.sura !== 9 && s.sura !== 1 && !s.basmala) out.push(`${s.sura}: no basmala`)
    if (s.ayat.some(([, t]) => /سُورَةُ/.test(t))) out.push(`${s.sura}: a title inside an ayah`)
  }
  return out
}

/** An ayah's words: split at spaces (U+0020 and U+00A0); a leading «۞» is the quarter's mark, kept apart. */
export function words(text) {
  const w = text.split(/[  ]+/).filter(Boolean)
  const hizb = w[0] === '۞'
  return { words: hizb ? w.slice(1) : w, hizb }
}

/** The text of a mushaf's Word file (word/document.xml inside the .docx inside the Complex's zip). */
export function documentXml(m) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'qc-'))
  try {
    const docx = path.join(tmp, 'doc.docx')
    fs.writeFileSync(docx, unzipMember(path.join(RAW, m.zip), m.doc))
    return unzipMember(docx, 'document.xml').toString('utf8')
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

/** The output file of a mushaf. */
export function build(m) {
  const suras = parseDocx(documentXml(m))
  const bad = problems(suras, m.total)
  if (bad.length) throw new Error(`${m.key}: ${bad.slice(0, 3).join('; ')}`)
  return {
    about: 'Generated by scripts/ingest/qurancomplex-uthmani.mjs from the King Fahd Glorious Quran Printing Complex\'s own Word file of this mushaf (words exactly as in the file). Shown in its own font, unmodified.',
    key: m.key,
    riwaya: m.riwaya,
    edition: { ar: `الخط الحاسوبي للمجمع، الإصدار ${[...m.version].map((c) => (c === '.' ? '٫' : '٠١٢٣٤٥٦٧٨٩'[Number(c)])).join('')}`, latn: `the Complex's computer font, version ${m.version}` },
    publisher: { ar: 'مجمع الملك فهد لطباعة المصحف الشريف', latn: 'King Fahd Glorious Quran Printing Complex' },
    source: m.page,
    file: m.url,
    font: m.font.replace(/ /g, '-'),
    total: m.total,
    suras: suras.map((s) => ({
      sura: s.sura,
      title: s.title,
      ...(s.basmala ? { basmala: s.basmala } : {}),
      ayat: s.ayat.map(([aya, text]) => {
        const w = words(text)
        return { aya, words: w.words, ...(w.hizb ? { hizb: true } : {}) }
      }),
    })),
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--if-raw') && !MUSHAFS.every((m) => fs.existsSync(path.join(RAW, m.zip)))) {
    console.log('qurancomplex-uthmani: data/raw/qurancomplex not here; the Uthmanic layer is not built (the page view shows (أ))')
    process.exit(0)
  }
  fs.mkdirSync(RAW, { recursive: true })
  if (process.argv.includes('--fetch'))
    for (const m of [...MUSHAFS, ...LEFT_OUT.map((x) => ({ ...x, url: `${SITE}/fonts/${x.zip}` }))]) {
      execFileSync('curl', ['-sSLf', '-m', '180', '-o', path.join(RAW, m.zip), m.url])
    }
  fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true })
  const index = []
  for (const m of MUSHAFS) {
    const data = build(m)
    const file = path.join(OUT, `${m.key}.json`)
    fs.writeFileSync(file, JSON.stringify(data))
    fs.writeFileSync(path.join(OUT, 'fonts', data.font), unzipMember(path.join(RAW, m.zip), m.font))
    const bytes = fs.statSync(file).size + fs.statSync(path.join(OUT, 'fonts', data.font)).size
    // `v`: the text's own hash, in its URL, so a corrected text reaches devices that kept the old one (CacheFirst).
    const v = createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 12)
    index.push({ key: m.key, riwaya: m.riwaya, edition: data.edition, version: m.version, font: data.font, total: m.total, bytes, v })
    console.log(`${m.key}: ${data.suras.length} suras, ${m.total} ayat, ${data.suras.reduce((a, s) => a + s.ayat.reduce((b, x) => b + x.words.length, 0), 0)} words, ${(bytes / 1024).toFixed(0)} KB with its font`)
  }
  for (const x of LEFT_OUT) console.log(`${x.key}: left out, ${x.reason}`)
  fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ about: 'The mushafs of the Uthmanic layer (scripts/ingest/qurancomplex-uthmani.mjs); the first is the default.', mushafs: index }, null, 1) + '\n')
}

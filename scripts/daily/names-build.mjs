// The Beautiful Names (reply 0032 D-8) from «القواعد المثلى في صفات الله وأسمائه الحسنى» by Ibn Uthaymeen on shamela.ws
// (book 8874; source ج, approved for this screen only). The names are read from the book's own pages, as written there:
// page 19 (p. 15) the 81 from the Book of Allah, page 20 (p. 16) the 18 from the Sunnah with the book's references.
//   node scripts/daily/names-build.mjs            reads data/raw/shamela-8874/p{18,19,20}.html (fetched once, one a second)
//   node scripts/daily/names-build.mjs candidates prints the evidence candidates for review
// Evidence, chosen by hand from the candidates and checked here and in worker/test/daily-data.test.ts:
//   Quran: an ayah in data/processed/quran.jsonl where the name itself is said of Allah (QURAN below: ayah and the
//          words as they read there, normalised); its text and al-Muyassar are read from D1 at display time.
//   Sunnah: a sahih or hasan hadith in data/processed/hadith.jsonl whose text holds the name (SUNNAH below).
// A name without established evidence stays in the list (it is from the book); its evidence section is hidden.
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const RAW = path.join(ROOT, 'data/raw/shamela-8874')
const BOOK = 'https://shamela.ws/book/8874'

const pageText = (n) => {
  const s = fs.readFileSync(path.join(RAW, `p${n}.html`), 'utf8')
  const m = s.match(/class="nass[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/)
  return m[1].replace(/<br\s*\/?>|<\/p>/g, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
}
const strip = (s) => s.replace(/[ً-ْٰـ]/g, '')
const norm = (s) => strip(s).replace(/[ٱأإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ؤ/g, 'و').replace(/\s+/g, ' ')

// Page 19: the names between «فمن كتاب الله تعالى:» and the end of the page's text, separated by « ... ».
const p19 = pageText(19)
const quranBlock = p19.slice(p19.indexOf('فمن كتاب الله تعالى:') + 'فمن كتاب الله تعالى:'.length)
const fromQuran = quranBlock.split(/\s*\.\.\.\s*|\n/).map((x) => x.trim()).filter((x) => /^ال/.test(x) || x === 'الله')
// Page 20: «ومن سنة رسول الله ...:» then names each followed by its footnote number (Arabic-Indic digits); the
// footnotes (the book's references) follow «١ مسلم.» etc.
const p20 = pageText(20)
const sunnahLine = p20.slice(p20.indexOf(':') + 1, p20.indexOf('.'))
const digit = (s) => Number(s.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
const fromSunnah = [...sunnahLine.matchAll(/(\S+?)([٠-٩]+)/g)].map((m) => ({ name: m[1], n: digit(m[2]) }))
const notes = new Map([...p20.matchAll(/^([٠-٩]+) (.+)$/gm)].map((m) => [digit(m[1]), m[2].trim()]))
if (fromQuran.length !== 81 || fromSunnah.length !== 18) throw new Error(`read ${fromQuran.length} from the Book and ${fromSunnah.length} from the Sunnah; the book says 81 and 18`)

// Evidence chosen by hand (see the report): name → [ayah id, the words in the ayah, normalised spelling].
const QURAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/daily/names-evidence.json'), 'utf8'))

const ayat = new Map()
for (const l of fs.readFileSync(path.join(ROOT, 'data/processed/quran.jsonl'), 'utf8').trim().split('\n')) {
  const r = JSON.parse(l)
  if (r.kind === 'ayah') ayat.set(r.id, r.text)
}
const hadith = new Map()
for (const l of fs.readFileSync(path.join(ROOT, 'data/processed/hadith.jsonl'), 'utf8').trim().split('\n')) {
  const r = JSON.parse(l)
  if (r.lang === 'ar' && ['1', '2', '3'].includes(r.tier)) hadith.set(r.id, r)
}

if (process.argv[2] === 'candidates') {
  // For each name: ayat where it follows هو / الله / إنه / أنت / ربك / وهو (definite), the first six; and hadiths.
  for (const name of [...fromQuran, ...fromSunnah.map((x) => x.name)]) {
    const n = norm(name)
    const bare = n.replace(/^ال/, '')
    const re = new RegExp(`(هو|الله|انه|انك|انت|ربك|ربي|ربنا|وهو|ان الله|وكان الله|كان الله)( \\S+)? (و)?(${n}|${bare})( |$)`)
    const q = [...ayat].filter(([, t]) => re.test(norm(t))).slice(0, 4).map(([id, t]) => `${id}: ${norm(t).match(re)[0]}`)
    const h = [...hadith.values()].filter((r) => new RegExp(`(الله|انك|انت|ان الله|هو) (${n}|${bare})( |،|»|$)`).test(norm(r.hadeeth))).slice(0, 2).map((r) => `${r.id}/t${r.tier}`)
    console.log(`${name} | ${q.join(' ; ') || '—'} | ${h.join(' ') || '—'}`)
  }
  process.exit(0)
}

const page19 = { page: 'ص15', url: `${BOOK}/19` }
const page20 = { page: 'ص16', url: `${BOOK}/20` }
const out = []
const check = (name, ev) => {
  if (ev.ayah) {
    const t = ayat.get(ev.ayah)
    if (!t || !norm(t).includes(norm(ev.match))) throw new Error(`${name}: «${ev.match}» not in ${ev.ayah}`)
  }
  if (ev.hadith) {
    const r = hadith.get(ev.hadith)
    if (!r || !strip(r.hadeeth).replace(/\s+/g, ' ').includes(strip(ev.hadithMatch))) throw new Error(`${name}: «${ev.hadithMatch}» not in hadith ${ev.hadith}`)
  }
}
for (const name of fromQuran) {
  const ev = QURAN[name] ?? {}
  check(name, ev)
  out.push({ name, from: 'quran', ...page19, ...(ev.ayah ? { quran: { ayah: ev.ayah, match: ev.match, reason: ev.reason } } : {}), ...(ev.hadith ? { sunnah: { id: ev.hadith, match: ev.hadithMatch, reason: ev.reason } } : {}) })
}
for (const { name, n } of fromSunnah) {
  const ev = QURAN[strip(name)] ?? QURAN[name] ?? {}
  check(name, ev)
  out.push({ name, from: 'sunnah', ...page20, book_reference: notes.get(n) ?? null, ...(ev.ayah ? { quran: { ayah: ev.ayah, match: ev.match, reason: ev.reason } } : {}), ...(ev.hadith ? { sunnah: { id: ev.hadith, match: ev.hadithMatch, reason: ev.reason } } : {}) })
}

// The Sheikh's words on the list that names the 99 (al-Tirmidhi's narration), verbatim from page 18 (p. 14).
const p18 = pageText(18)
const quote = 'ولم يصح عن النبي صلى الله عليه وسلم تعيين هذه الأسماء، والحديث المروي عنه تعيينها ضعيف.'
if (!p18.includes(quote)) throw new Error('the quote is not on page 18')

fs.writeFileSync(
  path.join(ROOT, 'data/names.json'),
  JSON.stringify(
    {
      _about:
        'The Beautiful Names as listed in «القواعد المثلى» by Ibn Uthaymeen (shamela.ws book 8874, pp. 15-16), built by scripts/daily/names-build.mjs; evidence chosen by hand and checked against D1 data (worker/test/daily-data.test.ts). Ayah text and al-Muyassar are read from D1 at display time.',
      book: { title: 'القواعد المثلى في صفات الله وأسمائه الحسنى', author: 'محمد بن صالح العثيمين', url: BOOK },
      why_not_the_famous_list: { quote, page: 'ص14', url: `${BOOK}/18` },
      names: out,
    },
    null,
    1,
  ) + '\n',
)
console.log(`${out.length} names (${fromQuran.length} from the Book, ${fromSunnah.length} from the Sunnah); with an ayah ${out.filter((x) => x.quran).length}, with a hadith ${out.filter((x) => x.sunnah).length}`)

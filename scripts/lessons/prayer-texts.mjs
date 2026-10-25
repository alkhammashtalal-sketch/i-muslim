// Writes the texts that «علّمني الصلاة» for each prayer adds to the approved lesson after the independent review of
// batch 1 (add-on 0072-add17): web/src/lessons/prayer/prayers-texts.json.
//   - Ibn Baz: each an exact slice of his fatwa page as the page shows it, saved from the live page by
//     relay/w1/0072-prayers/batch-1/fix/tools/fetch-binbaz.mjs into relay/w1/0072-prayers/batch-1/fix/sources/binbaz
//     (<id>.txt, with its URL, title and fetched time in index.json). A slice is found by two anchors (its first and
//     its last words, as they stand on the page); nothing is typed here but the anchors, and a missing anchor, or one
//     found twice where it should be once, stops the script.
//   - HadeethEnc: positions in a row of data/processed/hadith.jsonl and the first 16 hex digits of the SHA-256 of the
//     slice (as scripts/lessons/build.mjs writes them): no hadith text is kept in the app (CLAUDE.md §7, §3 rule 4).
// Offsets are in code points (Python's s[a:b], ../../web/src/lessons/texts.js cut).
//   node scripts/lessons/prayer-texts.mjs
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '../..')
const BB = '/Users/talal/i-muslim/relay/w1/0072-prayers/batch-1/fix/sources/binbaz'
const PROCESSED = path.join(ROOT, 'data/processed')
const index = JSON.parse(fs.readFileSync(path.join(BB, 'index.json'), 'utf8'))
const cps = (s) => Array.from(s)

/** Where `phrase` is in `text` from `at` on: { i, n } (its index and length in `text`, UTF-16), matching the two in
 *  canonical order (NFD), so an anchor typed with its marks in another order (shadda, fatha) still finds the page's own
 *  characters; what is cut is always the stored text. -1 when it is not there. */
function find(text, phrase, at = 0) {
  const want = phrase.normalize('NFD')
  for (let i = text.indexOf(phrase[0], at); i >= 0; i = text.indexOf(phrase[0], i + 1)) {
    for (let n = Math.max(1, phrase.length - 4); n <= phrase.length + 4 && i + n <= text.length; n++) if (text.slice(i, i + n).normalize('NFD') === want) return { i, n }
  }
  return null
}

/** The slice of page `id` from `from` to the end of `to` (both as on the page), after `after` when it is given. */
function slice(id, from, to = null, after = null) {
  const page = fs.readFileSync(path.join(BB, `${id}.txt`), 'utf8')
  const meta = index[id]
  if (!meta || meta.http !== '200' || !meta.own_page) throw new Error(`binbaz ${id}: no page of its own saved`)
  const base = after == null ? { i: 0, n: 0 } : find(page, after)
  if (!base) throw new Error(`binbaz ${id}: «${after}» not on the page`)
  const a = find(page, from, base.i)
  if (!a) throw new Error(`binbaz ${id}: «${from}» not on the page`)
  if (after == null && find(page, from, a.i + 1)) throw new Error(`binbaz ${id}: «${from}» twice on the page`)
  const b = to == null ? a : find(page, to, a.i)
  if (!b) throw new Error(`binbaz ${id}: «${to}» not after «${from}»`)
  const text = page.slice(a.i, b.i + b.n)
  const start = cps(page.slice(0, a.i)).length
  return { src: 'binbaz', id, url: meta.url, title: meta.title, start, end: start + cps(text).length, text, topic: null }
}

// add-on 0072-add17, by its codes (relay/w1/0072-prayers/batch-1/review-prayers-batch-1.md)
const bb = {
  // §1 and ش5: aloud in the first two rakahs of Fajr, Maghrib and Isha, for the imam and the one praying alone
  jahr_solo: slice('12226', 'السنة في صلاة المغرب والعشاء والفجر الجهر', 'هكذا كان النبي يفعل عليه الصلاة والسلام'),
  jahr_lower: slice('12226', 'لكن إذا كان حوله من قد يتأذى بالجهر', 'حتى لا يؤذي أحدًا'),
  // add-on 0072-add23 §2: the sentence the review named 7501, whose link opens fatwa 4053, by Talal's word
  jahr_4053: slice('4053', 'الجهر بالقراءة في الصلاة الجهرية كالفجر', 'لكنه قد ترك السنة'),
  jahr_all: slice('17622', 'الله شرع لعباده الجهر في الفجر', 'وهذا عام للرجال والنساء'),
  // §1: the woman's line
  jahr_women: slice('17622', 'فالمرأة كذلك تجهر', 'فالأفضل عدم الجهر لها'),
  // §1: the follower, in a prayer recited aloud
  f_must: slice('11314', 'الواجب قراءة الفاتحة مطلقًا', 'أم لم يسكت الإمام'),
  f_listen: slice('11314', 'المأموم يقرأ في السرية والجهرية الفاتحة خاصة', 'فيقرأ زيادة، ولا حرج'),
  // the same page names three views (CLAUDE.md §3 rule 11): a disputed-matter box with them, as the page states them
  f_views: slice('11314', 'فالواجب على المأموم في أصح قولي العلماء', 'والعلماء لهم أقوال ثلاثة'),
  f_view1: slice('11314', 'أحدها: أنه لا يقرأ مطلقًا', 'بل تسقط عنه القراءة بقراءة الإمام'),
  f_view2: slice('11314', 'والقول الثاني: يقرأ في السرية دون الجهرية'),
  f_view3: slice('11314', 'والقول الثالث: أنه يقرأ في السرية والجهرية'),
  // §1: the follower on rising from bowing (10166, the approved page): his sentence, and the formula alone from it
  f_rise: slice('10166', 'وإن كان مأمومًا يرفع يقول', '(اللهم ربنا لك الحمد)'),
  rabbana: slice('10166', 'ربنا ولك الحمد', null, 'وإن كان مأمومًا يرفع يقول'),
  // ج2: the seeking of refuge and the basmala quietly
  sirr_basmala: slice('2465', 'الأحاديث الصحيحة دالة على أن السنة السر بالتسمية', 'كلهم يسرون بالتعوذ، والبسملة'),
  // م5: what is said before al-Fatiha, alone, from the approved sentence of 10166 («ثم يقول: … ثم يقرأ الحمد»)
  say_taawwudh: slice('10166', 'أعوذ بالله من الشيطان الرجيم، بسم الله الرحمن الرحيم'),
  say_basmala: slice('10166', 'بسم الله الرحمن الرحيم', null, 'أعوذ بالله من الشيطان الرجيم، '),
  // م5: the salam as it is said, from the approved sentence of 10166 («ثم يسلم تسليمتين: (…) عن يمينه (…) عن يساره»)
  salam: slice('10166', 'السلام عليكم ورحمة الله', null, 'ثم يسلم تسليمتين: ('),
  // ج3: the takbir on rising from the prostration, among what a forgetful worshipper prostrates for
  takbir_rise: slice('9934', 'إذا ترك واجبًا سهوًا؛ وجب عليه السجود، مثل', 'كل هذا إذا نسيه؛ سجد له'),
  // م2: seeking refuge in the rakahs after the first
  taawwudh_1: slice('24833', 'في خلاف بين أهل العلم، السنة في الأولى فقط', 'هذا هو الأرجح'),
  taawwudh_2: slice('24833', 'وإن استعاذ فلا بأس', 'ليس هناك مانع'),
  // م3: after the first tashahhud
  salat_t1: slice('10166', 'ثم ينهض إلى الثالثة، وإن صلى على النبي ﷺ فهو أفضل', 'ثم نهض إلى الثالثة'),
  salat_khilaf: slice('4110', 'اختلف العلماء في الصلاة على النبي ﷺ بعد التشهد الأول'),
  salat_sahih: slice('4110', 'أما التشهد الأول في الظهر والعصر والمغرب والعشاء', 'أما الدعاء فيكون في التشهد الأخير'),
  // م4: «quietly» still moves the tongue
  tongue: slice('17391', 'لابد من قراءة الفاتحة، والقراءة لابد من تحريك اللسان', 'حتى يكون منه قراءة'),
  // ش1: al-Fatiha alone after the second rakah, and something more at times
  alone_sunna: slice('2912', 'فالسنة أنه يقتصر على الفاتحة في الثالثة', 'والمغرب، والعشاء'),
  alone_more: slice('2912', 'لكن يستحب له في بعض الأحيان', 'أن يقرأ زيادة'),
  // ش2: the takbir with the resting sit
  istiraha_takbir: slice('20567', 'هو مُخَيَّرٌ في هذا، حسب ظاهر النصوص', 'ولا يتخلَّفوا عنه'),
}

// on the rakah table (ش5), among its other Ibn Baz texts under the same topic as theirs (the approved «rakat» step's)
bb.jahr_all.topic = { ar: 'الجهر والإسرار', en: 'Aloud and quiet' }

// ---- HadeethEnc: positions and hashes ----
const want = { '65098': ['ar', 'en'], '3095': ['en'] }
const rows = {}
for (const line of fs.readFileSync(path.join(PROCESSED, 'hadith.jsonl'), 'utf8').split('\n')) {
  const m = line.slice(0, 200).match(/"id": ?"(\d+)"/)
  if (!m || !want[m[1]]) continue
  const r = JSON.parse(line)
  if (want[r.id].includes(r.lang)) rows[`${r.id}:${r.lang}`] = r
}
const sha16 = (t) => crypto.createHash('sha256').update(Buffer.from(t, 'utf8')).digest('hex').slice(0, 16)
/** A position of `phrase` in the row's text: the `nth` time it is there (0 = the first), found as find() finds it. */
function pos(id, lang, phrase, nth = 0) {
  const t = rows[`${id}:${lang}`]?.hadeeth
  if (t == null) throw new Error(`hadith ${id} ${lang}: no row`)
  let f = { i: -1, n: 0 }
  for (let k = 0; k <= nth; k++) {
    f = find(t, phrase, f.i + 1)
    if (!f) throw new Error(`hadith ${id} ${lang}: «${phrase}» not there ${nth + 1} times`)
  }
  const start = cps(t.slice(0, f.i)).length
  const end = start + cps(t.slice(f.i, f.i + f.n)).length
  return { start, end, field: 'hadeeth', sha: sha16(cps(t).slice(start, end).join('')) }
}
const H = (id, ar, en) => ({ id, field: 'hadeeth', idx: null, en_field: 'hadeeth', en_idx: null, ar, en, topic: null, label: null, speaker: null })
const hadith = {
  // ج3: «ثُمَّ يُكَبِّرُ حِينَ يَرْفَعُ رَأْسَهُ مِنَ السُّجُودِ» the second time, after the second prostration (65098, sahih,
  // in the approved lesson's own rows), and its English
  rise2: H('65098', pos('65098', 'ar', 'ثُمَّ يُكَبِّرُ حِينَ يَرْفَعُ رَأْسَهُ مِنَ السُّجُودِ', 1), pos('65098', 'en', 'and then say takbīr upon raising his head from prostration')),
  // §1: the meaning of «ربنا ولك الحمد» in English, as HadeethEnc's translation of 3095 (the approved rising step's) words it
  rabbana_en: H('3095', null, pos('3095', 'en', 'O our Lord, praise be to You')),
}

const out = {
  _generated: { by: 'scripts/lessons/prayer-texts.mjs', from: 'relay/w1/0072-prayers/batch-1/fix/sources/binbaz (live pages, see its index.json); data/processed/hadith.jsonl', addon: '0072-add17' },
  bb,
  hadith,
}
fs.writeFileSync(path.join(ROOT, 'web/src/lessons/prayer/prayers-texts.json'), JSON.stringify(out, null, 1) + '\n')
for (const [k, v] of Object.entries(bb)) console.log(`bb ${k} ${v.id} [${v.start}:${v.end}] «${v.text}»`)
for (const [k, v] of Object.entries(hadith)) console.log(`hadith ${k} ${v.id} ar ${v.ar ? `[${v.ar.start}:${v.ar.end}]` : '-'} en ${v.en ? `[${v.en.start}:${v.en.end}]` : '-'}`)

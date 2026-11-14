// Ported into the app (add-on 0072) from relay/w1/0072-wudu/src/lesson.js, the reviewed page, as it is: the same
// steps, the four fields, the texts with their grades, takhrij and links, the disputed matters with their fixed
// sentence and referral, the close-ups and the companion. Only what the app needs is changed: the page draws into the
// element it is given (mountLesson) instead of its own document; its content language comes from the app (Arabic, or
// English in every other interface, with the frame words of ../chrome.ts in the eight machine-translated ones); day
// only (the app is day-only); the review page's own header (its language and theme buttons) and review note, and its
// footer section «why no face» (the review's pending slot) is left out, and «tools and licences» keeps the three the
// page uses in the app (three.js and the two fonts; not esbuild and Playwright); links to the app's screens open them in the app; without WebGL the steps keep their texts, without the figure;
// destroy() when the page is left. The hadith and ayah texts are not in the app's data (CLAUDE.md §7, §3 rule 4):
// each is asked of our server by its id and shown only when it cuts to the reviewed bytes (../texts.js); the review
// notes «من صفحة المصدر، يحتاج إدخال المنسّق» and the sunnah.com «why» lines are left out. The original comments follow.
// The wudu lesson review page (reply 0072 item 12; add-on 0069-add3), in the prayer lesson's pattern (0071-prayer).
// Every ayah and hadith on the page is a field of a row in data/processed, put in the page with textContent as stored;
// the elements carry data-ref/data-field so the check (tools/check.py) can compare each one with its row, byte for
// byte. Ibn Baz's words in «حكمه» are exact slices of his pages saved in sources/binbaz. No transliteration: the
// HadeethEnc English translation writes none for these texts.
import { createCompanion } from './companion.js'
import { createTexts } from '../texts.js'
import { attachSwipe } from '../../paging/swipe.js'
// The companion (add-on 0071-add6, Talal 22 October 15:10): the first design drawn in code (companion.js), with feet,
// fingers, the tawarruk and the feet close-up added in its own style. The Quaternius and VRM characters are no longer
// used by this page; they stay in compare/ for comparison only.

// WebGL on this device (a test context, given back at once)
function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    const g = c.getContext('webgl2') || c.getContext('webgl')
    g?.getExtension('WEBGL_lose_context')?.loseContext()
    return !!g
  } catch {
    return false
  }
}

export function mountLesson(root, opts) {
const DATA = structuredClone(opts.data)
// the step's hadith and ayah texts, from our server by id (../texts.js)
const TX = createTexts({ data: DATA, lang: opts.lang === 'en' ? 'en' : 'ar', fetchHadith: opts.fetchHadith, fetchAyah: opts.fetchAyah })
const STEPS = DATA.steps
const N = STEPS.length
// the app's listen button under a text (add-on 0072-add14), in an element the app draws it into (../lesson-host.tsx):
// an ayah by the reciter's recording, a text of ours or a translation in the device's voice; never an Arabic hadith
const listen = (spec) => (opts.listen && !offscreen ? opts.listen(spec) : null)
const okText = (got) => (got && got.s === 'ok' ? got.text : null)

const T = {
  ar: {
    name: 'مسلم', sub: 'علّمني الوضوء', dir: 'rtl',
    review: 'صفحة مراجعة لاعتماد طلال، وليست في التطبيق بعد.',
    langBtn: 'English', langAria: 'اعرض الصفحة بالإنجليزية',
    themeDay: 'نهار', themeNight: 'ليل', themeAria: 'بدّل بين النهار والليل',
    kicker: ['تمهيد', 'قبل الغسل', 'أعضاء الوضوء', 'الختام', 'ملحق'],
    replay: 'أعد الحركة', noface: 'بلا ملامح وجه', why: 'لماذا',
    prev: 'السابق', next: 'التالي', count: (i) => `الخطوة ${ar(i + 1)} من ${ar(N)}`,
    howH: 'الدليل', sayH: 'ماذا تقول', readH: 'ماذا تقرأ', doH: 'ماذا تفعل', rulingH: 'حكمه',
    translitH: 'النطق', qfSrc: 'Transliteration · Quran Foundation',
    meaningHadith: 'معناه من شرح موسوعة الأحاديث',
    full: 'النص كاملًا كما في الموسوعة',
    hadithSrc: (h) => `موسوعة الأحاديث النبوية المترجمة · الإصدار ${h.ar.version} · رقم ${ar(h.id)}`,
    openHadith: 'افتحه في الموسوعة',
    quranSrc: 'نص المصحف والتفسير الميسر: المصحف الإلكتروني بجامعة الملك سعود',
    openQuran: 'افتح الآية في موقعها',
    tafsirH: (ref) => `التفسير الميسر · ${ref}`,
    tapAyah: 'المس أي آية لترى تفسيرها.',
    example: 'مثال: سورة الإخلاص',
    listen: 'استمع للفاتحة', pause: 'إيقاف مؤقت', resume: 'أكمل الاستماع',
    reciter: (n) => `التلاوة بصوت ${n} · موقع إم بي ثري قرآن. ولا يُطلب الصوت إلا عند الضغط.`, site: 'افتح الموقع',
    intro: 'أهلًا بك. هذا الدرس يمرّ معك على الوضوء خطوةً بعد خطوة، ومع كل خطوة النص الذي تقوم عليه. تقدّم بزر «التالي» حين تكون مستعدًا.',
    mapH: 'خريطة الدرس ونصوصه',
    repeat: 'وفي هذه الركعة تعيد هذه الخطوات:',
    noEn: '',
    canvasAria: (t) => `رفيق الدرس في هيئة: ${t}`,
    noGL: 'تعذّر عرض الرفيق على هذا الجهاز.',
    feetH: 'العقب عن قرب', earH: 'الأذن عن قرب', earLine: 'السبابة داخل الأذن، والإبهام على ظاهرها', earAria: 'اليد اليمنى عند الأذن: السبابة في الأذن، والإبهام خلفها',
    noticeH: 'تنبيه', fromBinbaz: 'من كلام ابن باز، لا من حديث', openTafsir: 'افتح التفسير الميسر في موقعه',
    see: (t) => `البدء باليمنى في الرجلين أيضًا: صندوق «فيها أكثر من قول» في خطوة «${t}».`,
    feetAria: (t) => `العقب عن قرب في خطوة: ${t}`,
    qibla: 'القبلة',
    feetLine: { sit: 'اليمنى منصوبة وأصابعها إلى القبلة، واليسرى مفروشة تجلس عليها', sujud: 'القدمان منصوبتان، وأطراف أصابعهما على الأرض إلى القبلة' },
    feetLineSrc: 'من فوائد الحديث في الموسوعة',
    feetEv: 'النصوص التي يقوم عليها هذا الوصف',
    fromExpl: 'من شرح الموسوعة',
    fromHints: 'من فوائد الحديث في الموسوعة',
    noEnPart: '',
    then: 'ثم تكمل بهذه الخطوات:',
    loading: 'يُحمَّل الرفيق…',
    fromWords: 'من معاني الكلمات في الموسوعة', fromHE: 'من شرح موسوعة الأحاديث',
    pronH: 'النطق كما كتبته الترجمة الإنجليزية في الموسوعة',
    rulingSrc: (title) => `فتاوى ابن باز · ${title}`, openPage: 'افتح الصفحة',
    rulingNone: 'لم نجد في مصادرنا بعد نصًّا صريحًا في حكمه.',
    disputedBadge: 'فيها أكثر من قول', disputedText: 'هذه المسألة فيها أكثر من قول عند أهل العلم',
    referralBody: 'تطبيق «مسلم» لا يُصدر حكمًا على الحالات الفردية. يمكنك عرض سؤالك على الجهة الرسمية المختصة.',
    referralButton: 'الرئاسة العامة للبحوث العلمية والإفتاء',
    // sunnah.com after our data (CLAUDE.md §2 row ي); from dorar.net pages the name and the link only (add-on 0071-add10)
    srcName: { sunnah: 'sunnah.com', dorar: 'الدرر السنية' },
    evParts: { narrator: 'الراوي', takhrij: 'المخرّج والرقم', grade: 'الدرجة ومن حكم' },
    // fixed lines of Talal's (add-ons 0071-add10 §1 and 0071-add12 §2)
    notes: { sadr: 'وفي ثبوت لفظ «على صدره» كلام لأهل الحديث', palms: 'وورد أيضًا وضع الكفين حذو المنكبين' },
    nofatiha: 'لا تحفظ الفاتحة بعد؟',
    sevenH: 'مواضع السجود السبعة', sevenLegend: '١ الجبهة مع الأنف · ٢ و٣ الكفّان · ٤ و٥ الركبتان · ٦ و٧ أطراف القدمين',
    sevenAria: 'الرفيق ساجدًا وعليه سبع نقاط على مواضع السجود',
    handH: 'اليد اليمنى في التشهد', handAria: 'اليد اليمنى في التشهد عن قرب: الأصابع مقبوضة والسبابة مشيرة',
    tableH: ['الصلاة', 'الركعات', 'القراءة', 'التشهد الأول', 'التورّك'], tableNote: 'كلمات الجدول من كتابتنا، وأدلتها في «الدليل» تحته.',
  },
  en: {
    name: 'Muslim', sub: 'Teach me ablution', dir: 'ltr',
    review: 'A review page for Talal’s approval, not in the app yet.',
    langBtn: 'العربية', langAria: 'Show the page in Arabic',
    themeDay: 'Day', themeNight: 'Night', themeAria: 'Switch between day and night',
    kicker: ['Introduction', 'Before washing', 'The parts of ablution', 'Finishing', 'Appendix'],
    replay: 'Replay the movement', noface: 'No facial features', why: 'why',
    prev: 'Back', next: 'Next', count: (i) => `Step ${i + 1} of ${N}`,
    howH: 'The evidence', sayH: 'What to say', readH: 'What to recite', doH: 'What to do', rulingH: 'Its ruling',
    translitH: 'Transliteration', qfSrc: 'Transliteration · Quran Foundation',
    meaningHadith: 'Meaning, from the HadeethEnc English translation as published',
    full: 'The full text, as in HadeethEnc',
    hadithSrc: (h) => `HadeethEnc · version ${h.en ? h.en.version : h.ar.version} · no. ${h.id}`,
    openHadith: 'Open in HadeethEnc',
    quranSrc: 'Quran text, al-Muyassar and Sahih International: quran.ksu.edu.sa',
    openQuran: 'Open the ayah at its source',
    tafsirH: (ref) => `Al-Muyassar tafsir (Arabic) · ${ref}`,
    tapAyah: 'Tap any ayah to see its tafsir.',
    example: 'Example: Surat al-Ikhlas',
    listen: 'Listen to al-Fatiha', pause: 'Pause', resume: 'Resume',
    reciter: (n) => `Recited by ${n} · mp3quran.net. The audio is requested only when you press.`, site: 'Open the site',
    intro: 'Welcome. This lesson goes with you through ablution, step after step, each with the text it rests on. Move on with “Next” when you are ready.',
    mapH: 'The lesson and its texts',
    repeat: 'In this rakah you repeat these steps:',
    noEn: 'There is no English translation of this hadith in our HadeethEnc data.',
    canvasAria: (t) => `The lesson companion in the posture: ${t}`,
    noGL: 'The companion could not be shown on this device.',
    feetH: 'The heel, close up', earH: 'The ear, close up', earLine: 'The index inside the ear, the thumb on its back.', earAria: 'The right hand at the ear: the index in the ear, the thumb behind it',
    noticeH: 'Note', fromBinbaz: 'Ibn Baz’s words, not a hadith', openTafsir: 'Open al-Muyassar at its source',
    see: (t) => `Beginning with the right applies to the feet too: see «More than one view» in the step «${t}».`,
    feetAria: (t) => `The heel, close up, in the step: ${t}`,
    qibla: 'Qibla',
    feetLine: { sit: 'The right foot upright, its toes toward the qibla; the left laid flat, and you sit on it.', sujud: 'Both feet upright, the tips of their toes on the ground toward the qibla.' },
    feetLineSrc: 'From the HadeethEnc English translation of hadith',
    feetEv: 'The texts this description rests on',
    fromExpl: 'From the HadeethEnc explanation',
    fromHints: 'From the hadith’s benefits in HadeethEnc',
    noEnPart: 'There is no English text of this part in our HadeethEnc data; the Arabic is shown as stored.',
    then: 'Then finish with these steps:',
    loading: 'Loading the companion…',
    fromWords: 'From the word meanings in HadeethEnc', fromHE: 'From the HadeethEnc explanation',
    pronH: 'Pronunciation, as the HadeethEnc English translation writes it',
    rulingSrc: (title) => `Ibn Baz’s fatwas · ${title}`, openPage: 'Open the page',
    rulingNone: 'We have not yet found an explicit text on its ruling in our sources.',
    disputedBadge: 'More than one view', disputedText: 'Scholars hold more than one view on this matter',
    referralBody: 'The Muslim app does not give rulings on individual cases. You can put your question to the official qualified authority.',
    referralButton: 'General Presidency of Scholarly Research and Ifta',
    srcName: { sunnah: 'sunnah.com', dorar: 'Al-Durar Al-Saniyyah (dorar.net)' },
    evParts: { narrator: 'Narrator', takhrij: 'Source and number', grade: 'Grade and who graded' },
    notes: { sadr: 'Hadith scholars have discussed whether the wording “on his chest” is established.', palms: 'Placing the palms level with the shoulders has also been reported.' },
    nofatiha: 'Don’t know al-Fatiha yet?',
    sevenH: 'The seven places of prostration', sevenLegend: '1 forehead with nose · 2 and 3 the palms · 4 and 5 the knees · 6 and 7 the tips of the feet',
    sevenAria: 'The companion in prostration with seven dots on the places of prostration',
    handH: 'The right hand in the tashahhud', handAria: 'The right hand in the tashahhud, close up: the fingers closed and the index pointing',
    tableH: ['Prayer', 'Rakahs', 'Recitation', 'First tashahhud', 'Tawarruk'], tableNote: 'The table’s words are ours; their evidence is listed under it.',
  },
}
// the frame words of the eight machine-translated interfaces over the English page (../chrome.ts)
if (opts.chrome) {
  const c = opts.chrome
  const fill = (x, v) => x.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m))
  Object.assign(T.en, { dir: c.dir, prev: c.prev, next: c.next, count: (i) => fill(c.count, { n: i + 1, total: N }), replay: c.replay, noface: c.noface,
    loading: c.loading, canvasAria: (x) => fill(c.canvasAria, { t: x }), doH: c.doH, sayH: c.sayH, readH: c.readH, howH: c.howH, rulingH: c.rulingH, mapH: c.mapH })
}
const ar = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

// ---- state ----
const qs = new URLSearchParams(location.search)
const state = {
  lang: opts.lang === 'en' ? 'en' : 'ar',
  theme: 'day', // the app is day-only (reply 0043-add7)
  step: Math.min(N - 1, Math.max(0, Number(qs.get('step') || 1) - 1)),
  ayah: null,
}
const still = qs.get('still') === '1'
const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)')

// ---- tiny DOM helper ----
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue
    if (k === 'class') el.className = v
    else if (k === 'text') el.textContent = v
    else if (k === 'style') el.style.cssText = v // the app's CSP allows no style attributes; the CSSOM is allowed
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else el.setAttribute(k, v === true ? '' : v)
  }
  for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(c))
  return el
}
const svg = (inner, cls) => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true')
  if (cls) s.setAttribute('class', cls)
  s.innerHTML = inner
  return s
}
const ICON = {
  right: '<path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  left: '<path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  replay: '<path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>',
  sun: '<circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
  pause: '<path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/>',
  wait: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
}
// the ayah-end mark: eight lobes, attached to the last word with a word joiner
function ayahMark(n) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  s.setAttribute('viewBox', '0 0 32 32')
  s.innerHTML = '<g fill="none" stroke="var(--gold-dark)" stroke-width="1.3"><rect x="7" y="7" width="18" height="18" rx="2"/><rect x="7" y="7" width="18" height="18" rx="2" transform="rotate(45 16 16)"/></g><circle cx="16" cy="16" r="7.2" fill="var(--soft-box)" stroke="var(--gold)" stroke-width="0.9"/>' +
    `<text x="16" y="20" text-anchor="middle">${ar(n)}</text>`
  return h('span', { class: 'mark', 'aria-hidden': 'true' }, s)
}

// ---- texts with their marks for the check ----
// an ayah's field from our server by its id (../texts.js): its reviewed bytes, a calm empty line while it comes, else nothing
const ayahPart = (A, field, tag, attrs) => {
  const got = TX.ayah(A.id, field)
  if (got.s === 'wait') return h(tag, { ...attrs, class: `${attrs.class ?? ''} lsn-pending`.trim(), 'aria-busy': 'true' })
  return got.s === 'ok' ? h(tag, { ...attrs, 'data-ref': A.id, 'data-field': field, 'data-kind': 'full', text: got.text }) : null
}
const hadithText = (id, lang, field, kind, ex, tag = 'p', cls = 'ar', index = null) => {
  // the text from our server, cut where the review page cut it and shown only when it is those same bytes; a calm
  // empty line while it comes, and nothing when it does not (the source line keeps the reference and the link)
  const got = ex ? TX.slice(ex) : TX.hadith(id, lang, field)
  if (got.s === 'wait') return h(tag, { class: `${cls} lsn-pending`, 'aria-busy': 'true' })
  if (got.s !== 'ok') return null
  const text = got.text
  return h(tag, { class: cls, lang: lang, dir: lang === 'ar' ? 'rtl' : 'ltr', 'data-ref': `hadith:${id}`, 'data-lang': lang, 'data-field': field, 'data-index': index, 'data-kind': kind, 'data-start': ex ? ex.start : null, 'data-end': ex ? ex.end : null, text })
}

function sourceLine(id) {
  const t = T[state.lang]
  const H = DATA.hadith[id]
  const useEn = state.lang === 'en' && H.en
  const lang = useEn ? 'en' : 'ar'
  const g = TX.hadith(id, lang, 'grade'), a = TX.hadith(id, lang, 'attribution')
  const grade = g.s === 'ok' ? h('span', { class: 'grade' + (H.class === 'hasan' ? ' hasan' : ''), lang, 'data-ref': `hadith:${id}`, 'data-lang': lang, 'data-field': 'grade', 'data-kind': 'full', text: g.text }) : null
  const attr = a.s === 'ok' ? h('span', { lang, 'data-ref': `hadith:${id}`, 'data-lang': lang, 'data-field': 'attribution', 'data-kind': 'full', text: a.text }) : null
  return h('p', { class: 'src' }, h('span', { text: t.hadithSrc(H) }), grade, attr, h('a', { href: H[lang].url, target: '_blank', rel: 'noopener', text: t.openHadith }))
}

function fullText(id) {
  const t = T[state.lang]
  const H = DATA.hadith[id]
  if (TX.hadith(id, 'ar', 'hadeeth').s === 'none') return null // no text from the server: the source line has the link
  const kids = [hadithText(id, 'ar', 'hadeeth', 'full', null)]
  if (state.lang === 'en') kids.push(H.en ? hadithText(id, 'en', 'hadeeth', 'full', null, 'p', 'en-text') : h('p', { class: 'none', text: t.noEn }))
  return h('details', { class: 'full' }, h('summary', { text: t.full }), ...kids)
}

const partLabel = (field) => { const t = T[state.lang]; return field === 'hints' ? t.fromHints : field === 'words_meanings' ? t.fromWords : t.fromExpl }

function excerptBlock(ex, cls = 'how-item') {
  const t = T[state.lang]
  const H = DATA.hadith[ex.id]
  const field = ex.field || 'hadeeth'
  const kids = []
  if (ex.topic) kids.push(h('p', { class: 'topic', text: ex.topic[state.lang] }))
  if (ex.speaker) kids.push(h('p', { class: 'part-label speaker', text: ex.speaker[state.lang] })) // whose words (tools/check_qala.py)
  // a part of the explanation, the benefits or the word meanings is labelled so, and never shown as the hadith's own words
  if (field !== 'hadeeth') kids.push(h('p', { class: 'part-label', text: ex.label ? t[ex.label] : partLabel(field) }))
  if (ex.ar) kids.push(hadithText(ex.id, 'ar', field, 'excerpt', ex.ar, 'p', 'ar', ex.idx))
  if (state.lang === 'en') kids.push(ex.en ? hadithText(ex.id, 'en', ex.en_field || field, 'excerpt', ex.en, 'p', 'en-text', ex.en_idx) : h('p', { class: 'none', text: !H.en ? t.noEn : field !== 'hadeeth' ? t.noEnPart : '' }))
  // the English translation (or explanation) heard in the device's voice; the Arabic is not (add-on 0072-add14 §3)
  const enText = state.lang === 'en' && ex.en ? okText(TX.slice(ex.en)) : null
  if (enText) kids.push(listen({ kind: 'speak', text: enText, lang: 'en', role: (ex.en_field || field) === 'hadeeth' ? 'hadith-translation' : 'explanation', guard: { quotes: [okText(TX.hadith(ex.id, 'ar', 'hadeeth')) || ''] } }))
  kids.push(sourceLine(ex.id))
  if (!ex.nofull) kids.push(fullText(ex.id)) // a long hadith is cut to its evidence, the source line links its full text (add-on 0072-add5 §21)
  return h('div', { class: cls }, ...kids)
}

// the ayah as evidence: its text whole, its meaning in English (Sahih International) on the English page, its source,
// and al-Muyassar's tafsir of it, all from data/processed/quran.jsonl by its id
function quranEvidence(ex) {
  const t = T[state.lang]
  const A = DATA.quran[ex.id]
  const kids = []
  if (ex.topic) kids.push(h('p', { class: 'topic', text: ex.topic[state.lang] }))
  if (TX.ayah(A.id, 'text').s !== 'none') kids.push(h('p', { class: 'ar', lang: 'ar', dir: 'rtl' }, ayahPart(A, 'text', 'span', {}), '⁠', ayahMark(A.aya)))
  // under the ayah: its recitation, and on the English page its meaning beside it (add-on 0072-add14 §4)
  const ayahText = okText(TX.ayah(A.id, 'text'))
  const enMeaning = state.lang === 'en' ? okText(TX.ayah(A.id, 'text_en')) : null
  if (ayahText) kids.push(listen({ kind: 'ayah', id: A.id, meaning: enMeaning ? { text: enMeaning, lang: 'en', ayah: ayahText } : null }))
  if (state.lang === 'en') kids.push(ayahPart(A, 'text_en', 'p', { class: 'en-text', lang: 'en', dir: 'ltr' }))
  kids.push(h('p', { class: 'src' }, h('span', { text: `${state.lang === 'ar' ? A.ref : `Quran ${A.sura}:${A.aya}`} · ${t.quranSrc}` }), h('a', { href: A.url, target: '_blank', rel: 'noopener', text: t.openQuran })))
  kids.push(h('details', { class: 'full' }, h('summary', { text: t.tafsirH(state.lang === 'ar' ? A.ref : `${A.sura}:${A.aya}`) }),
    ayahPart(A, 'muyassar', 'p', { class: 'ar', lang: 'ar', dir: 'rtl' }),
    okText(TX.ayah(A.id, 'muyassar')) ? listen({ kind: 'speak', text: okText(TX.ayah(A.id, 'muyassar')), lang: 'ar', role: 'tafsir', guard: { ayat: [ayahText || ''], muyassarOf: A.id } }) : null,
    h('p', { class: 'src' }, h('a', { href: A.url_muyassar, target: '_blank', rel: 'noopener', text: t.openTafsir }))))
  return h('div', { class: 'how-item quran-ev' }, ...kids)
}
// a sunnah.com hadith by its reference and link only
function refItem(r) {
  const t = T[state.lang]
  return h('div', { class: 'how-item ev-item ref' }, r.topic ? h('p', { class: 'topic', text: r.topic[state.lang] }) : null,
    h('p', { class: 'part-label ev-src', text: 'sunnah.com' }),
    h('p', { class: 'src' }, h('strong', { text: r.label[state.lang] }), h('span', { text: ' · ' }), h('a', { href: r.url, dir: 'ltr', target: '_blank', rel: 'noopener', text: r.url })))
}
const evidenceBlock = (ex) => (ex.src === 'quran' ? quranEvidence(ex) : ex.src === 'binbaz' ? rulingQuote(ex) : ex.src === 'ref' ? refItem(ex) : excerptBlock(ex))

// the close-ups (add-ons 0071-add2 §3.3, 0071-add8): each its own camera on the companion and its own canvas.
//   feet  : a calm dot on the toes of the upright foot, an arrow toward the qibla, one short line, and its texts
//   seven : the figure in prostration with seven numbered dots on the places of prostration (10925, 3230)
//   hand  : the right hand in the tashahhud, drawn in the first form (add-on 0071-add9 decision 4)
const VIEW = {}
for (const name of ['feet', 'seven', 'hand']) {
  const host = document.createElement('div')
  host.className = 'feet-view view-' + name
  const canvas = document.createElement('canvas')
  canvas.setAttribute('role', 'img')
  host.append(canvas)
  VIEW[name] = { host, canvas, tags: [] }
}
const qiblaTag = document.createElement('span')
qiblaTag.className = 'qibla-tag'
VIEW.feet.host.append(qiblaTag)
for (let i = 0; i < 7; i++) {
  const tag = document.createElement('span')
  tag.className = 'num-tag'
  tag.setAttribute('aria-hidden', 'true')
  VIEW.seven.host.append(tag)
  VIEW.seven.tags.push(tag)
}
// the line under a close-up: our wording ('sit', 'sujud'), or the hadith row's own words, labelled by the part of the row
function closeLine(F) {
  const t = T[state.lang]
  const L = F.line, lines = []
  lines.push(hadithText(L.id, 'ar', L.field, 'excerpt', L.ar, 'p', 'feet-line ar', L.idx))
  if (state.lang === 'en') {
    if (L.en) lines.push(hadithText(L.id, 'en', L.en_field, 'excerpt', L.en, 'p', 'feet-line en-text', L.en_idx))
    else if (F.line_en) lines.push(hadithText(F.line_en.id, 'en', F.line_en.en_field, 'excerpt', F.line_en.en, 'p', 'feet-line en-text', F.line_en.en_idx))
    else lines.push(h('p', { class: 'none', text: t.noEnPart }))
  }
  if (L.field === 'hadeeth') lines.push(sourceLine(L.id))
  else {
    const ids = [L.id, ...(state.lang === 'en' && F.line_en ? [F.line_en.id] : [])]
    lines.push(h('p', { class: 'src' }, h('span', { text: `${partLabel(L.field)} · ${ids.map((i) => (state.lang === 'ar' ? ar(i) : i)).join(' · ')}` })))
  }
  return lines
}
function evidenceDetails(F) {
  const t = T[state.lang]
  const evIds = [...new Set(F.evidence.map((x) => x.id))] // a hadith with two excerpts (text and explanation) is named once
  return F.evidence.length ? h('details', { class: 'full feet-ev' }, h('summary', { text: `${t.feetEv} · ${evIds.map((x) => (state.lang === 'ar' ? ar(x) : x)).join(' · ')}` }), ...F.evidence.map((x) => excerptBlock(x))) : null
}
function feetBlock(st) {
  const t = T[state.lang]
  const F = DATA.feet[st.feet]
  qiblaTag.textContent = t.qibla
  qiblaTag.hidden = st.feet === 'heel'
  VIEW.feet.canvas.setAttribute('aria-label', t.feetAria(st.title[state.lang]))
  const lines = F.line ? closeLine(F) : [h('p', { class: 'feet-line ui', text: t.feetLine[st.feet] })]
  return h('figure', { class: 'feet' }, h('figcaption', { class: 'feet-h', text: t.feetH }), offscreen ? null : VIEW.feet.host, ...lines, evidenceDetails(F))
}
function sevenBlock() {
  const t = T[state.lang]
  const F = DATA.feet.seven
  VIEW.seven.canvas.setAttribute('aria-label', t.sevenAria)
  VIEW.seven.tags.forEach((tag, i) => { tag.textContent = state.lang === 'ar' ? ar(i + 1) : String(i + 1) })
  return h('figure', { class: 'feet seven' }, h('figcaption', { class: 'feet-h', text: t.sevenH }), offscreen ? null : VIEW.seven.host,
    h('p', { class: 'legend', text: t.sevenLegend }), ...closeLine(F), evidenceDetails(F))
}
function earBlock() {
  const t = T[state.lang]
  VIEW.hand.canvas.setAttribute('aria-label', t.earAria)
  return h('figure', { class: 'feet hand' }, h('figcaption', { class: 'feet-h', text: t.earH }), offscreen ? null : VIEW.hand.host, h('p', { class: 'feet-line ui', text: t.earLine }))
}
function handBlock() {
  const t = T[state.lang]
  const F = DATA.feet.hand
  VIEW.hand.canvas.setAttribute('aria-label', t.handAria)
  return h('figure', { class: 'feet hand' }, h('figcaption', { class: 'feet-h', text: t.handH }), offscreen ? null : VIEW.hand.host, ...closeLine(F), evidenceDetails(F))
}

// ---- pronunciation, rulings, disputed matters, sunnah.com and Dorar items, reserved links, the rakah table ----
function pronBlock(st) {
  const t = T[state.lang]
  if (!st.pron || !st.pron.length) return null // no transliteration from our sources for it: nothing (add-on 0071-add14 §4)
  return h('div', { class: 'pron' }, h('p', { class: 'label', text: t.pronH }),
    ...st.pron.map((p) => hadithText(p.id, 'en', 'hadeeth', 'excerpt', p.en, 'p', 'en-text pron-text')))
}
function rulingQuote(r) {
  const t = T[state.lang]
  return h('div', { class: 'ruling' }, r.topic ? h('p', { class: 'topic', text: r.topic[state.lang] }) : null, h('p', { class: 'ar', lang: 'ar', dir: 'rtl', 'data-ref': `binbaz:${r.id}`, 'data-kind': 'excerpt', 'data-start': r.start, 'data-end': r.end, text: r.text }),
    h('p', { class: 'src' }, h('span', { text: t.rulingSrc(r.title) }), h('a', { href: r.url, target: '_blank', rel: 'noopener', text: t.openPage })))
}
function rulingBlock(st) {
  const t = T[state.lang]
  const kids = [h('h2', { text: t.rulingH })]
  if (!st.rulings.length && !st.khilaf) kids.push(h('p', { class: 'none', text: t.rulingNone }))
  kids.push(...st.rulings.map(rulingQuote))
  if (st.khilaf) {
    // a disputed matter (rule 11): the fixed sentence, the texts as they are, no choice between them, and the referral
    kids.push(h('div', { class: 'khilaf', role: 'note' },
      h('p', { class: 'badge', text: t.disputedBadge }),
      h('p', { class: 'topic', text: st.khilaf.topic[state.lang] }),
      h('p', { class: 'fixed', text: t.disputedText }),
      // our data first, then sunnah.com and the Dorar link (add-on 0071-add10), then Ibn Baz's words
      ...st.khilaf.texts.filter((x) => x.src !== 'binbaz').map((x) => excerptBlock(x, 'how-item')),
      ...st.sunnah.filter((p) => p.place === 'khilaf').map(evItem),
      ...st.khilaf.texts.filter((x) => x.src === 'binbaz').map(rulingQuote),
      h('p', { class: 'ui', text: t.referralBody }),
      h('p', {}, h('a', { class: 'btn referral', href: 'https://www.alifta.gov.sa', target: '_blank', rel: 'noopener', text: t.referralButton }))))
  }
  return kids
}
// a row of prayer-evidence.md that our data does not have, in its step after our texts (add-on 0071-add10):
//   sunnah.com : its text, narrator, source and number, grading with who graded, and link, each as the table writes it
//   dorar      : the name «الدرر السنية» and the link only (and, for «على صدره», the fixed sentence of add-on 0071-add10 §1)
// a Latin run in Arabic text (a reference such as «580b» or «Book 5, Hadith 148») in its own isolate, so it and the
// brackets round it keep their places in the Arabic line; the text is unchanged (a <bdi> adds no characters)
const LATIN = /[A-Za-z0-9][A-Za-z0-9 .,:/_-]*[A-Za-z0-9]|[A-Za-z]/g
function isolated(text) {
  const out = []
  let at = 0
  for (const m of text.matchAll(LATIN)) {
    if (!/[A-Za-z]/.test(m[0])) continue
    if (m.index > at) out.push(document.createTextNode(text.slice(at, m.index)))
    const b = document.createElement('bdi')
    b.textContent = m[0]
    out.push(b)
    at = m.index + m[0].length
  }
  if (at < text.length) out.push(document.createTextNode(text.slice(at)))
  return out
}
function evItem(p) {
  const t = T[state.lang]
  const part = (k, cls) => (p[k] ? h(cls === 'inline' ? 'span' : 'p', { class: cls, lang: 'ar', dir: 'rtl', 'data-ref': `evidence:${p.row}`, 'data-col': p[k].col, 'data-start': p[k].start, 'data-end': p[k].end }, ...isolated(p[k].text)) : null)
  const meta = (k) => (p[k] ? h('p', { class: 'src' }, h('span', { text: t.evParts[k] + ': ' }), part(k, 'inline')) : null)
  return h('div', { class: 'how-item ev-item ' + p.src },
    p.topic ? h('p', { class: 'topic', text: p.topic[state.lang] }) : null,
    p.note ? h('p', { class: 'fixed-note', text: t.notes[p.note] }) : null,
    h('p', { class: 'part-label ev-src', text: t.srcName[p.src] }),
    part('text', 'ar'),
    meta('narrator'), meta('takhrij'), meta('grade'),
    h('p', { class: 'src' }, h('a', { href: p.link.text, dir: 'ltr', target: '_blank', rel: 'noopener', 'data-ref': `evidence:${p.row}`, 'data-col': p.link.col, 'data-start': p.link.start, 'data-end': p.link.end, text: p.link.text })))
}
// the app's own screens by their routes (add-on 0071-add12 §6): they open inside the app, not on this review page
function linksBlock(st) {
  // in the app: the lesson's links open the app's screens; a link to the other lesson only once it is in the app
  const links = st.links.filter((l) => opts.hasRoute(l.href))
  return links.length ? h('div', { class: 'links' }, links.map((l) => h('a', { class: 'btn app-link', href: l.href, 'data-route': l.href, onclick: (e) => { e.preventDefault(); opts.navigate(l.href) }, text: l[state.lang] }))) : null
}
function tableBlock(st) {
  const t = T[state.lang]
  if (!st.table) return null
  const num = (n) => (state.lang === 'ar' ? ar(n) : String(n))
  return h('div', { class: 'table-wrap' }, h('table', { class: 'rakat' },
    h('thead', {}, h('tr', {}, t.tableH.map((x) => h('th', { scope: 'col', text: x })))),
    h('tbody', {}, st.table.map((r) => h('tr', {}, h('th', { scope: 'row', text: r.p[state.lang] }), h('td', { text: num(r.n) }), h('td', { text: r.r[state.lang] }), h('td', { text: r.t1[state.lang] }), h('td', { text: r.tw[state.lang] }))))),
    h('p', { class: 'src', text: t.tableNote }))
}

const slot = () => h('div', { class: 'slot', role: 'note' }, svg(ICON.wait), h('span', { text: T[state.lang].slot }))

// ---- audio: al-Fatiha by a human reciter from mp3quran, nothing requested before the press ----
let audio = null, audioRaf = 0
function stopAudio() {
  if (audio) { audio.pause(); audio = null }
  cancelAnimationFrame(audioRaf)
  root.querySelectorAll('.ayah.now').forEach((e) => e.classList.remove('now'))
}
function listenBlock() {
  const t = T[state.lang]
  const R = DATA.recitation
  const name = state.lang === 'ar' ? R.reciter.ar : (R.reciter.en || R.reciter.ar)
  const label = h('span', { text: t.listen })
  const icon = h('span', { style: 'display:inline-flex' }, svg(ICON.play))
  const btn = h('button', { class: 'btn', type: 'button', 'aria-pressed': 'false' }, icon, label)
  btn.addEventListener('click', () => {
    if (!audio) {
      audio = new Audio(R.audio)
      audio.preload = 'none'
      audio.addEventListener('ended', () => { stopAudio(); btn.setAttribute('aria-pressed', 'false'); icon.replaceChildren(svg(ICON.play)); label.textContent = t.listen })
    }
    if (audio.paused) {
      audio.play().catch(() => {})
      btn.setAttribute('aria-pressed', 'true'); icon.replaceChildren(svg(ICON.pause)); label.textContent = t.pause
      const tick = () => {
        if (!audio) return
        const ms = audio.currentTime * 1000
        const cur = R.ayat.find(([, s, e]) => ms >= s && ms < e)
        root.querySelectorAll('.ayah[data-sura="1"]').forEach((el) => el.classList.toggle('now', !!cur && Number(el.dataset.aya) === cur[0]))
        audioRaf = requestAnimationFrame(tick)
      }
      tick()
    } else {
      audio.pause()
      btn.setAttribute('aria-pressed', 'false'); icon.replaceChildren(svg(ICON.play)); label.textContent = t.resume
    }
  })
  return h('div', { class: 'listen' }, btn, h('small', { text: t.reciter(name) }), h('small', {}, h('a', { href: R.site, target: '_blank', rel: 'noopener', text: t.site })))
}

function quranBlock(say, withAudio) {
  const t = T[state.lang]
  const ayat = say.ayat.map((q) => DATA.quran[q])
  if (!state.ayah || !say.ayat.includes(state.ayah)) state.ayah = say.ayat[0]
  const list = h('div', { class: 'ayat' })
  const tafsir = h('div', { class: 'tafsir', 'aria-live': 'polite' })
  const showTafsir = () => {
    const A = DATA.quran[state.ayah]
    tafsir.replaceChildren(
      h('p', { class: 'src', style: 'margin:0' }, h('strong', { text: t.tafsirH(A.ref) })),
      ayahPart(A, 'muyassar', 'p', { class: 'ar', lang: 'ar', dir: 'rtl' }),
      h('p', { class: 'src' }, h('span', { text: t.quranSrc }), h('a', { href: A.url, target: '_blank', rel: 'noopener', text: t.openQuran })),
    )
    list.querySelectorAll('.ayah').forEach((b) => { const on = b.dataset.id === state.ayah; b.classList.toggle('sel', on); b.setAttribute('aria-pressed', String(on)) })
  }
  for (const A of ayat) {
    if (TX.ayah(A.id, 'text').s === 'none') continue // no text from the server: the tafsir's source line has the link
    const kids = [h('span', { class: 'ar', lang: 'ar', dir: 'rtl' }, ayahPart(A, 'text', 'span', {}), '⁠', ayahMark(A.aya))]
    // al-Fatiha's transliteration under its ayah, as Quran Foundation gives it through our server (add-on 0071-add14 §4)
    if (A.translit) kids.push(h('span', { class: 'translit' }, h('span', { class: 'tl-label', text: t.translitH }),
      h('span', { class: 'tl-text', lang: 'en', dir: 'ltr', 'data-ref': A.id, 'data-field': 'translit', 'data-kind': 'full', text: A.translit })))
    if (state.lang === 'en') kids.push(ayahPart(A, 'text_en', 'span', { class: 'en-text', style: 'display:block', lang: 'en', dir: 'ltr' }))
    list.append(h('button', { class: 'ayah', type: 'button', 'data-id': A.id, 'data-sura': A.sura, 'data-aya': A.aya, onclick: () => { state.ayah = A.id; showTafsir() } }, ...kids))
  }
  const box = h('div', { class: 'say-box' }, say.example ? h('p', { class: 'example', text: t.example }) : null, list,
    state.lang === 'en' ? h('p', { class: 'src' }, h('span', { text: 'Meaning: Sahih International, quran.ksu.edu.sa' })) : null,
    ayat.some((A) => A.translit) ? h('p', { class: 'src' }, h('a', { href: DATA.qf.source.url, target: '_blank', rel: 'noopener', lang: 'en', dir: 'ltr', text: t.qfSrc })) : null)
  showTafsir()
  return [box, withAudio ? listenBlock() : null, h('p', { class: 'src', text: t.tapAyah }), tafsir]
}

function sayBlock(st) {
  const t = T[state.lang]
  const say = st.say
  if (!say) return []
  if (say.kind === 'quran') return [h('h2', { text: t.readH }), ...quranBlock(say, st.audio)]
  if (say.kind === 'binbaz') return [h('h2', { text: t.sayH }), h('div', { class: 'say-box' }, h('p', { class: 'part-label', text: t.fromBinbaz }),
    h('p', { class: 'ar dhikr', lang: 'ar', dir: 'rtl', 'data-ref': `binbaz:${say.id}`, 'data-kind': 'excerpt', 'data-start': say.start, 'data-end': say.end, text: say.text }),
    h('p', { class: 'src' }, h('span', { text: t.rulingSrc(say.title) }), h('a', { href: say.url, target: '_blank', rel: 'noopener', text: t.openPage })))]
  const H = DATA.hadith[say.id]
  const meaning = state.lang === 'en'
    ? h('div', { class: 'meaning' }, h('p', { class: 'label', text: t.meaningHadith }), say.en ? hadithText(say.id, 'en', 'hadeeth', 'excerpt', say.en, 'p', 'en-text') : h('p', { class: 'none', text: t.noEn }),
      say.en && okText(TX.slice(say.en)) ? listen({ kind: 'speak', text: okText(TX.slice(say.en)), lang: 'en', role: 'hadith-translation', guard: { quotes: [okText(TX.hadith(say.id, 'ar', 'hadeeth')) || ''] } }) : null)
    : TX.hadith(say.id, 'ar', 'explanation').s === 'none' ? null : h('details', { class: 'full meaning' }, h('summary', { text: t.meaningHadith }), hadithText(say.id, 'ar', 'explanation', 'full', null, 'p', 'ui'))
  return [h('h2', { text: t.sayH }), h('div', { class: 'say-box' }, say.speaker ? h('p', { class: 'part-label speaker', text: say.speaker[state.lang] }) : null, hadithText(say.id, 'ar', 'hadeeth', 'excerpt', say.ar, 'p', 'ar dhikr'), pronBlock(st), meaning), sourceLine(say.id), fullText(say.id)]
}

function lessonMap() {
  const t = T[state.lang]
  return [h('h2', { text: t.mapH }), h('ol', { class: 'map' }, STEPS.map((s) => {
    // hadith numbers, and the ayah by its sura and number
    const ids = [...new Set([...s.how.filter((x) => x.src !== 'quran').map((x) => x.id), ...(s.say?.id ? [s.say.id] : [])])]
    const qs = s.how.filter((x) => x.src === 'quran').map((x) => { const A = DATA.quran[x.id]; return state.lang === 'ar' ? `${A.sura_name} ${ar(A.aya)}` : `Quran ${A.sura}:${A.aya}` })
    const idText = [...ids.map((i) => (state.lang === 'ar' ? ar(i) : i)), ...qs].filter(Boolean).join(' · ')
    return h('li', {}, h('span', { class: 'n', text: state.lang === 'ar' ? ar(s.n + 1) : String(s.n + 1) }),
      h('span', {}, h('button', { type: 'button', onclick: () => go(s.n), text: s.title[state.lang] }), h('br'), h('span', { class: 'ids', text: idText })))
  }))]
}

// ---- render ----
let companion = null, lastPose = 'ready', reTexts = false
// true while a step's card is built away from the page (lessonCards): the close-ups' shared canvases stay where they are
let offscreen = false
let gl = hasWebGL()
// the canvas lives outside the re-rendered tree so the 3D scene is made once (as on the review page)
const canvasHost = h('div', { class: 'stage-canvas' }, h('canvas', { role: 'img', 'aria-label': 'رفيق الدرس' }))
const app = h('div', { class: 'wrap' })
// a swipe turns the steps both ways, as «السابق» and «التالي» do (add-on 0072-add54): the next by the finger moving
// right in Arabic, left in English; never past the first or the last step (go() keeps to them)
const unswipe = attachSwipe(app, (k) => {
  go(state.step + k)
}, () => T[state.lang].dir === 'rtl')
root.replaceChildren(app)
function kickerOf(i) { return STEPS[i].kicker }

// one step's card: its title, its four fields and its links (render below; and, away from the page, «اصنع كروت للدرس كله»)
function stepCard(st) {
  const t = T[state.lang]
  const stepBtn = (k) => { const s = STEPS.find((x) => x.key === k); return h('button', { type: 'button', onclick: () => go(s.n), text: `${state.lang === 'ar' ? ar(s.n + 1) : s.n + 1} · ${s.title[state.lang]}` }) }
  // the four fixed fields of every step (add-on 0071-add8 §أ): what to do (our sentence), what to say, the evidence, its
  // ruling; the close-ups after «what to do»; under «the evidence» our data first, then sunnah.com (add-on 0071-add10)
  const card = h('article', { class: 'card', 'aria-live': 'polite' },
    h('p', { class: 'kicker', text: `${t.kicker[kickerOf(state.step)]} · ${t.count(state.step)}` }),
    h('h1', { text: st.title[state.lang] }),
    state.step === 0 ? h('p', { class: 'intro-text', text: t.intro }) : null,
    h('h2', { text: t.doH }),
    h('p', { class: 'do-text', text: st.do[state.lang] }),
    // «ماذا تفعل» heard in the device's voice, in the lesson's language (add-on 0072-add14 §2)
    listen({ kind: 'speak', text: st.do[state.lang], lang: state.lang, role: 'step' }),
    st.drawnote ? h('p', { class: 'draw-note', text: st.drawnote[state.lang] }) : null,
    st.hand ? earBlock() : null,
    st.legs ? excerptBlock(st.legs, 'how-item legs') : null,
    st.nofatiha ? h('div', { class: 'repeat' }, h('button', { type: 'button', onclick: () => go(STEPS.find((x) => x.key === 'nofatiha').n), text: t.nofatiha })) : null,
    st.feet ? feetBlock(st) : null,
    st.seven ? sevenBlock() : null,
    ...st.sunnah.filter((p) => p.place === 'seven').map(evItem),
    tableBlock(st),
    ...sayBlock(st),
    h('h2', { text: t.howH }),
    ...st.how.map(evidenceBlock),
    ...st.sunnah.filter((p) => p.place === 'how').map(evItem),
    st.notice.length ? h('div', { class: 'notice', role: 'note' }, h('p', { class: 'badge', text: t.noticeH }), ...st.notice.map(rulingQuote)) : null,
    st.repeat ? h('div', {}, h('p', { class: 'src', style: 'color:var(--text)', text: t.repeat }), h('div', { class: 'repeat' }, st.repeat.map(stepBtn))) : null,
    st.then ? h('div', {}, h('p', { class: 'src', style: 'color:var(--text)', text: t.then }), h('div', { class: 'repeat' }, st.then.map(stepBtn))) : null,
    ...rulingBlock(st),
    ...st.notes.map((n) => h('div', { class: 'note-line' }, h('p', { class: 'fixed-note', text: n.text[state.lang] }), n.ref ? refItem(n.ref) : null)),
    st.see ? h('div', { class: 'repeat' }, h('button', { type: 'button', onclick: () => go(STEPS.find((x) => x.key === st.see).n), text: t.see(STEPS.find((x) => x.key === st.see).title[state.lang]) })) : null,
    linksBlock(st),
    state.step === 0 ? lessonMap() : null)
  return card
}

function render() {
  const t = T[state.lang]
  const st = STEPS[state.step]
  const asked = TX.need([st, st.feet || st.seven || st.hand ? DATA.feet : null])
  if (asked) {
    const at = state.step
    asked.then(() => {
      if (destroyed || state.step !== at) return
      reTexts = true
      render()
      reTexts = false
    })
  }
  root.lang = state.lang
  root.dir = t.dir
  for (const v of Object.values(VIEW)) v.host.classList.toggle('no-gl', !gl)
  stopAudio()

  const stage = h('section', { class: gl ? 'stage' : 'stage no-gl', 'aria-label': t.canvasAria(st.title[state.lang]) },
    canvasHost,
    h('span', { class: 'cap', text: t.kicker[kickerOf(state.step)] }),
    h('div', { class: 'replay' }, h('button', { type: 'button', 'aria-label': t.replay, title: t.replay, onclick: () => companion && companion.replay(STEPS[Math.max(0, state.step - 1)].pose, st.pose) }, h('span', {}, svg(ICON.replay)))),
    h('span', { class: 'noface', text: t.noface }))

  const dots = h('div', { class: 'dots', 'aria-hidden': 'true' }, STEPS.map((s) => h('i', { class: s.n === state.step ? 'on' : s.n < state.step ? 'done' : '' })))
  const nav = h('nav', { class: 'stepper', 'aria-label': t.count(state.step) },
    h('button', { class: 'btn', type: 'button', disabled: state.step === 0, onclick: () => go(state.step - 1) }, svg(t.dir === 'rtl' ? ICON.right : ICON.left), h('span', { text: t.prev })),
    h('div', { class: 'progress' }, h('span', { class: 'count', text: t.count(state.step) }), dots),
    h('button', { class: 'btn primary', type: 'button', disabled: state.step === N - 1, onclick: () => go(state.step + 1) }, h('span', { text: t.next }), svg(t.dir === 'rtl' ? ICON.left : ICON.right)))

  const card = stepCard(st)
  // «اصنع كروت» (add-on 0072-add30 §1): the app draws its buttons in this element at the step's foot
  if (opts.cards) card.append(opts.cards({ kind: 'step', step: state.step, count: N }))

  const note = opts.chrome ? h('p', { class: 'content-note', text: opts.chrome.contentNote }) : null
  const main = h('div', { class: 'lesson' }, note, stage, nav, card)
  app.replaceChildren(main, footer())

  if (!companion) {
    if (!gl) {
      root.dataset.ready = '1'
      return
    }
    if (!loading) loading = makeCompanion(canvasHost.querySelector('canvas')).then((c) => {
      if (destroyed) return c.dispose()
      companion = c
      companion.setPose(STEPS[state.step].pose, { instant: true })
      lastPose = STEPS[state.step].pose
      render()
    }).catch(() => {
      // no figure on this device: the steps keep their texts, and nothing alarming is said (add-on 0072 item 3)
      gl = false
      if (!destroyed) render()
    })
    return
  }
  companion.setTheme(state.theme)
  if (lastPose !== st.pose || (st.pose === 'taslim' && !reTexts)) companion.setPose(st.pose)
  lastPose = st.pose
  if (companion.attachView) {
    companion.attachView('feet', VIEW.feet.canvas, st.feet || null)
    companion.attachView('seven', VIEW.seven.canvas, st.seven ? 'sujud' : null)
    companion.attachView('hand', VIEW.hand.canvas, st.hand || null)
  }
  if (still && companion.renderNow) placeTags(companion.renderNow())
  root.dataset.ready = '1'
}

let loading = null
function placeQibla(f) {
  if (!f) return
  qiblaTag.style.left = `${Math.min(88, Math.max(4, f.x * 100))}%`
  qiblaTag.style.top = `${Math.min(86, Math.max(4, f.y * 100))}%`
}
// the labels on the close-ups: the qibla tag on the feet, the numbers 1..7 beside the seven dots
function placeTags(v) {
  if (!v) return
  placeQibla(v.feet)
  if (v.seven) v.seven.forEach((p, i) => { const tag = VIEW.seven.tags[i]; tag.style.left = `${p.x * 100}%`; tag.style.top = `${p.y * 100}%` })
}
async function makeCompanion(canvas) {
  return createCompanion(canvas, { theme: state.theme, still, reducedMotion: () => reducedMQ.matches, onViews: placeTags, rug: false })
}

function go(i) {
  if (i < 0 || i >= N) return
  state.step = i
  sync()
  render()
  opts.scrollTop()
}
function sync() {
  // the step in the address, so a reload keeps it; the app's own history entry (its «back») is kept
  const p = new URLSearchParams(location.search)
  p.set('step', String(state.step + 1))
  try { history.replaceState(history.state, '', location.pathname + '?' + p.toString()) } catch { /* ignore */ }
}

// ---- footer: the pronunciation, the sources, and the tools with their licences (in the app: «why no face» left out) ----
function footer() {
  const L = state.lang
  const sec = (id, title, ...kids) => h('section', { id }, h('h2', { text: title }), ...kids)
  const pron = sec('pron', L === 'ar' ? 'النطق' : 'Pronunciation',
    h('p', { text: L === 'ar' ? 'لا نطق في هذا الدرس: الترجمة الإنجليزية في موسوعة الأحاديث لم تكتب نطقًا لنصوصه. ولا نطق يكتبه النموذج.' : 'There is no transliteration in this lesson: HadeethEnc’s English translation writes none for its texts. No transliteration is written by the model.' }))
  const srcs = sec('sources', L === 'ar' ? 'المصادر' : 'Sources', h('ul', {},
    h('li', { text: L === 'ar' ? 'القرآن الكريم والتفسير الميسر وترجمة Sahih International: المصحف الإلكتروني بجامعة الملك سعود (quran.ksu.edu.sa)، كما في بياناتنا.' : 'The Quran, al-Muyassar and the Sahih International translation: quran.ksu.edu.sa, as in our data.' }),
    h('li', { text: L === 'ar' ? 'الأحاديث ودرجاتها ومخرّجوها وشرحها: موسوعة الأحاديث النبوية المترجمة (hadeethenc.com)، العربية v1.7.0 والإنجليزية v1.25.0، بلا تعديل.' : 'The hadith, their grades, attributions and explanation: HadeethEnc (hadeethenc.com), Arabic v1.7.0 and English v1.25.0, unmodified.' }),
    h('li', { text: L === 'ar' ? 'الأحكام في خانة «حكمه»: من صفحات فتاوى ابن باز على binbaz.org.sa، بنصها ورابطها، قُرئت للقراءة فقط. ولا يُعرض منها إلا ما قال بلفظه: فرض أو واجب أو سنة أو مستحب. وما لم نجد له نصًّا صريحًا تبقى خانته فارغة.' : 'The rulings under «Its ruling»: from Ibn Baz’s fatwa pages on binbaz.org.sa, in their words and with their links, read only. Only what says in so many words obligatory (fard or wajib), sunna or recommended is shown; where we found no explicit text, the field stays empty.' })))
  // the tools whose code or files are in this page in the app, each licence copied from the file that came with it
  // (the review page's list, without esbuild and Playwright, which built and photographed the review page only)
  const tools = sec('tools', L === 'ar' ? 'الأدوات ورخصها' : 'Tools and their licences',
    h('p', { text: L === 'ar' ? 'الرفيق مرسوم كله هنا بالكود في three.js: جسمه وثوبه وطاقيته وقدماه ويداه وهيئاته، ورأسه بيضة ملساء بلا ملامح. لا شيء من PrayAlong: لا كود ولا نموذج ولا أصول. ونص كل رخصة أدناه منسوخ من ملف الرخصة الذي جاء مع الأداة نفسها.' : 'The companion is drawn entirely here in code with three.js: its body, thobe, cap, feet, hands and postures, and a smooth head with no features. Nothing is taken from PrayAlong: no code, no model, no assets. Each licence below is copied from the licence file that came with the tool itself.' }),
    ...(DATA.licenses || []).map((l) => h('details', { class: 'full' }, h('summary', { text: `${l.name} ${l.version} · ${l.license} · ${L === 'ar' ? l.use.ar : l.use.en}` }),
      h('p', { class: 'src' }, h('a', { href: l.repo, target: '_blank', rel: 'noopener', text: l.repo })),
      h('pre', { text: l.text }))))
  return h('footer', {}, pron, srcs, tools)
}

const onReduced = () => companion && companion.setPose(STEPS[state.step].pose, { instant: true })
reducedMQ.addEventListener?.('change', onReduced)
let destroyed = false
render()
return {
  // «اصنع كروت للدرس كله» (add-on 0072-add30 §1): every step's card, each built as the page builds it once its texts
  // have come, away from the page (nothing on the page changes), in the lesson's order
  async lessonCards() {
    const out = []
    for (let i = 0; i < N; i++) {
      const st = STEPS[i]
      const asked = TX.need([st, st.feet || st.seven || st.hand ? DATA.feet : null])
      if (asked) await asked
      if (destroyed) return out
      const was = { step: state.step, ayah: state.ayah }
      offscreen = true
      state.step = i
      try {
        out.push(stepCard(st))
      } finally {
        offscreen = false
        state.step = was.step
        state.ayah = was.ayah
      }
    }
    return out
  },
  destroy() {
    destroyed = true
    unswipe()
    stopAudio()
    reducedMQ.removeEventListener?.('change', onReduced)
    if (companion) companion.dispose()
    companion = null
    root.replaceChildren()
  },
}
}

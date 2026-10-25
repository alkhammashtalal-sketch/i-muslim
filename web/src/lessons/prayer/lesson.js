// Ported into the app (add-on 0072) from relay/w1/0071-prayer/src/lesson.js, the reviewed page, as it is: the same
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
// The prayer lesson review page, phase 1 «علّمني» (reply 0071 §4.1). Every ayah and hadith on the page is a field of a
// row in data/processed, put in the page with textContent as stored; the elements carry data-ref/data-field so the
// check (tools/check.py) can compare each one with its row, byte for byte. Transliteration: al-Fatiha's from Quran
// Foundation through our server (add-on 0071-add14 §4, data/qf), the adhkar's where HadeethEnc's English translation
// writes it; otherwise none.
import { createCompanion } from './companion.js'
import { createTexts } from '../texts.js'
import { buildSteps, isBinbaz, practiceBeats } from './prayers.js'
// Add-on 0072-add13 §1 (each prayer, step by step): the lesson opens with «أي صلاة تريد أن تتعلم؟», a card for each
// prayer of the definitions it is given (opts.prayers: prayers.js), with its rakahs, its recitation and today's time
// from the prayer-times screen (opts.times). A chosen prayer's steps are the approved steps, every rakah written out
// (prayers.js buildSteps, from template.js): its map at the top (a dot for each rakah, a mark at each tashahhud, and
// «الركعة ٣ من ٤ · السجدة الثانية»), the template's line at the top of a step with the texts it rests on, and
// «تدرّب معي» («للتدرّب قبل الصلاة»): what is said, in order, in large type, one part after another. The rest of
// the page is the approved lesson as it was.
// Add-on 0072-add17 (the independent review of batch 1): one choice before the prayer, «أصلّي: منفردًا أو إمامًا /
// مأمومًا» (alone or as imam by default), on the choice of a prayer and on its first step; the steps and «تدرّب معي» are
// the prayer's for that choice (prayers.js buildSteps' mode). Ibn Baz's lines a step carries (notes) show at its line,
// its «what to do» or its «what to say»; the set's boxes after the step's own: a disputed matter (rule 11) or «من كلام
// ابن باز». At the end of «تدرّب معي», the way to «إن لم تحفظ الفاتحة بعد».
// The companion (add-on 0071-add6, Talal 22 October 15:10): the first design drawn in code (companion.js), with feet,
// fingers, the tawarruk and the feet close-up added in its own style. The Quaternius and VRM characters are no longer
// used by this page; they stay in compare/ for comparison only.

// The interface words of add-on 0072-add13 (the choice of a prayer, its map, «تدرّب معي»), Arabic and English; the
// review page lists them with the template's words. The eight machine-translated interfaces have theirs in ../chrome.ts.
const AR = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])
export const PRAYER_T = {
  ar: {
    choose: 'أي صلاة تريد أن تتعلم؟',
    chooseLead: 'اختر صلاة، فيمرّ معك الدرس عليها ركعةً ركعة، وكل ركعة بخطواتها كلها.',
    rakat: (n) => (n === 2 ? 'ركعتان' : n === 3 ? 'ثلاث ركعات' : n === 4 ? 'أربع ركعات' : `${AR(n)} ركعات`),
    today: 'اليوم',
    timesNote: 'الأوقات من شاشة المواقيت، لمكانك.',
    noPlace: 'حدّد مكانك في شاشة المواقيت، فيظهر هنا وقت كل صلاة.',
    timesOpen: 'شاشة المواقيت',
    other: 'اختر صلاة أخرى',
    prayerOf: (name) => `صلاة ${name}`,
    mapAria: 'خريطة الصلاة',
    rakahN: (i) => `الركعة ${AR(i)}`,
    rakahOf: (i, n) => `الركعة ${AR(i)} من ${AR(n)}`,
    ord: ['', 'الركعة الأولى', 'الركعة الثانية', 'الركعة الثالثة', 'الركعة الرابعة', 'الركعة الخامسة', 'الركعة السادسة', 'الركعة السابعة', 'الركعة الثامنة'],
    tashMark: ['', 'التشهد الأول', 'التشهد الأخير'],
    practice: 'تدرّب معي', practiceNote: 'للتدرّب قبل الصلاة',
    practiceLead: 'يعرض لك ما تقوله في الصلاة بالترتيب، بخط كبير وبهدوء، لتتدرّب عليه قبل أن تصلي.',
    start: 'ابدأ', pausePr: 'إيقاف مؤقت', resumePr: 'أكمل', backPr: 'السابق', fwdPr: 'التالي', endPr: 'إنهاء التدرّب',
    donePr: 'انتهى التدرّب.', againPr: 'من البداية',
    beatOf: (i, n) => `${AR(i)} من ${AR(n)}`,
    modeH: 'أصلّي:', modeSolo: 'منفردًا أو إمامًا', modeFollower: 'مأمومًا', bbBadge: 'من كلام ابن باز',
  },
  en: {
    choose: 'Which prayer would you like to learn?',
    chooseLead: 'Choose a prayer, and the lesson goes with you through it rakah by rakah, each rakah with all its steps.',
    rakat: (n) => `${n} rakahs`,
    today: 'Today',
    timesNote: 'The times are from the prayer times screen, for your place.',
    noPlace: 'Set your place on the prayer times screen, and each prayer’s time shows here.',
    timesOpen: 'Prayer times',
    other: 'Choose another prayer',
    prayerOf: (name) => `The ${name} prayer`,
    mapAria: 'The prayer’s map',
    rakahN: (i) => `Rakah ${i}`,
    rakahOf: (i, n) => `Rakah ${i} of ${n}`,
    ord: ['', 'First rakah', 'Second rakah', 'Third rakah', 'Fourth rakah', 'Fifth rakah', 'Sixth rakah', 'Seventh rakah', 'Eighth rakah'],
    tashMark: ['', 'The first tashahhud', 'The last tashahhud'],
    practice: 'Practise with me', practiceNote: 'For practice before the prayer',
    practiceLead: 'It shows what you say in the prayer, in order, in large type and calmly, so you can practise it before you pray.',
    start: 'Start', pausePr: 'Pause', resumePr: 'Resume', backPr: 'Back', fwdPr: 'Next', endPr: 'End the practice',
    donePr: 'The practice is over.', againPr: 'From the start',
    beatOf: (i, n) => `${i} of ${n}`,
    modeH: 'I pray:', modeSolo: 'Alone or as imam', modeFollower: 'Behind an imam', bbBadge: 'Ibn Baz’s words',
  },
}

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
// the step's hadith and ayah texts, from our server by id (../texts.js); made again when a server set brings steps
const newTexts = () => createTexts({ data: DATA, lang: opts.lang === 'en' ? 'en' : 'ar', fetchHadith: opts.fetchHadith, fetchAyah: opts.fetchAyah })
let TX = newTexts()
// the prayers' definitions (prayers.js) and the chosen prayer; without definitions, the approved lesson as it was
let SET = null
let PRAYER = null
let STEPS = DATA.steps
let N = STEPS.length
function useSet(set) {
  if (!set) return
  const added = (set.steps ?? []).filter((s) => !DATA.steps.some((b) => b.key === s.key))
  if (added.length || Object.keys(set.hadith ?? {}).some((id) => !(id in DATA.hadith))) {
    DATA.steps.push(...structuredClone(added))
    Object.assign(DATA.hadith, structuredClone(set.hadith ?? {}))
    TX = newTexts()
  }
  SET = set
}
useSet(opts.prayers)

const T = {
  ar: {
    name: 'مسلم', sub: 'علّمني الصلاة', dir: 'rtl',
    review: 'صفحة مراجعة لاعتماد طلال، وليست في التطبيق بعد. المثال ركعتا الفجر.',
    langBtn: 'English', langAria: 'اعرض الصفحة بالإنجليزية',
    themeDay: 'نهار', themeNight: 'ليل', themeAria: 'بدّل بين النهار والليل',
    kicker: ['تمهيد', 'الركعة الأولى', 'الركعة الثانية', 'ملحق: مثال من صلاة الظهر', 'بعد الصلاة', 'ملحق'],
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
    intro: 'أهلًا بك. هذا الدرس يمرّ معك على الصلاة هيئةً بعد هيئة، ومع كل هيئة النص الذي تقوم عليه. المثال ركعتا الفجر. تقدّم بزر «التالي» حين تكون مستعدًا.',
    mapH: 'خريطة الدرس ونصوصه',
    repeat: 'وفي هذه الركعة تعيد هذه الخطوات:',
    noEn: '',
    canvasAria: (t) => `رفيق الدرس في هيئة: ${t}`,
    noGL: 'تعذّر عرض الرفيق على هذا الجهاز.',
    feetH: 'القدمان عن قرب',
    feetAria: (t) => `القدمان عن قرب في هيئة: ${t}`,
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
    notes: { sadr: 'وفي ثبوت لفظ «على صدره» كلام لأهل الحديث', palms: 'وورد أيضًا وضع الكفين حذو المنكبين', ziyada: 'وفي بعض الروايات زيادة: العلي العظيم' },
    nofatiha: 'لا تحفظ الفاتحة بعد؟',
    sevenH: 'مواضع السجود السبعة', sevenLegend: '١ الجبهة مع الأنف · ٢ و٣ الكفّان · ٤ و٥ الركبتان · ٦ و٧ أطراف القدمين',
    sevenAria: 'الرفيق ساجدًا وعليه سبع نقاط على مواضع السجود',
    handH: 'اليد اليمنى في التشهد', handAria: 'اليد اليمنى في التشهد عن قرب: الأصابع مقبوضة والسبابة مشيرة',
    tableH: ['الصلاة', 'الركعات', 'القراءة', 'التشهد الأول', 'التورّك'], tableNote: 'كلمات الجدول من كتابتنا، وأدلتها في «الدليل» تحته.',
    // add-on 0072-add6
    fromBinbaz: 'من كلام ابن باز، لا من حديث', openTafsir: 'افتح التفسير الميسر في موقعه',
    sayMeaningEn: '',
    see: { minimum: 'ما لا تصح الصلاة إلا به' },
    groupsNone: 'ما لا حكم مكتوبًا عليه هنا، لم نجد له نصًا في مصادرنا بعد.',
    editor: {},
    ...PRAYER_T.ar,
  },
  en: {
    name: 'Muslim', sub: 'Teach me the prayer', dir: 'ltr',
    review: 'A review page for Talal’s approval, not in the app yet. The worked example is the two rakahs of Fajr.',
    langBtn: 'العربية', langAria: 'Show the page in Arabic',
    themeDay: 'Day', themeNight: 'Night', themeAria: 'Switch between day and night',
    kicker: ['Introduction', 'First rakah', 'Second rakah', 'Appendix: an example from Dhuhr', 'After the prayer', 'Appendix'],
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
    intro: 'Welcome. This lesson goes with you through the prayer, posture after posture, each with the text it rests on. The example is the two rakahs of Fajr. Move on with “Next” when you are ready.',
    mapH: 'The lesson and its texts',
    repeat: 'In this rakah you repeat these steps:',
    noEn: 'There is no English translation of this hadith in our HadeethEnc data.',
    canvasAria: (t) => `The lesson companion in the posture: ${t}`,
    noGL: 'The companion could not be shown on this device.',
    feetH: 'The feet, close up',
    feetAria: (t) => `The feet, close up, in the posture: ${t}`,
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
    notes: { sadr: 'Hadith scholars have discussed whether the wording “on his chest” is established.', palms: 'Placing the palms level with the shoulders has also been reported.', ziyada: 'Some narrations add: «العلي العظيم».' },
    nofatiha: 'Don’t know al-Fatiha yet?',
    sevenH: 'The seven places of prostration', sevenLegend: '1 forehead with nose · 2 and 3 the palms · 4 and 5 the knees · 6 and 7 the tips of the feet',
    sevenAria: 'The companion in prostration with seven dots on the places of prostration',
    handH: 'The right hand in the tashahhud', handAria: 'The right hand in the tashahhud, close up: the fingers closed and the index pointing',
    tableH: ['Prayer', 'Rakahs', 'Recitation', 'First tashahhud', 'Tawarruk'], tableNote: 'The table’s words are ours; their evidence is listed under it.',
    fromBinbaz: 'Ibn Baz’s words, not a hadith', openTafsir: 'Open al-Muyassar at its source',
    sayMeaningEn: 'Its meaning, as the HadeethEnc English translation of hadith 10945 words the salam to the left',
    see: { minimum: 'What the prayer is not valid without' },
    groupsNone: 'Where no ruling is written here, we have not yet found a text on it in our sources.',
    // add-on 0072-add6 item 13: HadeethEnc's English is shown as published; the correction is the editor's
    editor: {
      azim: 'Editor’s note: the published translation reads “our Lord”; the Arabic says “my Lord”: “Glory be to my Lord, the Most Great”.',
      ala: 'Editor’s note: the published translation reads “Gory”, a misprint, and “our Lord”; the Arabic says “my Lord”: “Glory be to my Lord, the Most High”.',
    },
    ...PRAYER_T.en,
  },
}
// the frame words of the eight machine-translated interfaces over the English page (../chrome.ts)
if (opts.chrome) {
  const c = opts.chrome
  const fill = (x, v) => x.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m))
  Object.assign(T.en, { dir: c.dir, prev: c.prev, next: c.next, count: (i) => fill(c.count, { n: i + 1, total: N }), replay: c.replay, noface: c.noface,
    loading: c.loading, canvasAria: (x) => fill(c.canvasAria, { t: x }), doH: c.doH, sayH: c.sayH, readH: c.readH, howH: c.howH, rulingH: c.rulingH, mapH: c.mapH })
  // the choice of a prayer and «تدرّب معي» (add-on 0072-add13), where the interface has them
  if (c.prayers) Object.assign(T.en, c.prayers)
}
const ar = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d])

// ---- state ----
const qs = new URLSearchParams(location.search)
const state = {
  lang: opts.lang === 'en' ? 'en' : 'ar',
  theme: 'day', // the app is day-only (reply 0043-add7)
  step: 0,
  ayah: null,
  practice: null, // «تدرّب معي»: { beat, playing } while it is open
  mode: qs.get('as') === 'follower' ? 'follower' : 'solo', // alone or as imam, or behind an imam (add-on 0072-add17 §1)
}
// the chosen prayer's steps (prayers.js buildSteps); null: the choice of a prayer
function choose(id) {
  const p = SET?.prayers.find((x) => x.id === id) ?? null
  PRAYER = p
  STEPS = p ? buildSteps(p, SET, DATA.steps, state.mode) : DATA.steps
  N = STEPS.length
  state.step = Math.min(N - 1, Math.max(0, state.step))
  state.practice = null
}
choose(qs.get('prayer'))
state.step = Math.min(N - 1, Math.max(0, Number(qs.get('step') || 1) - 1))
if (PRAYER && qs.has('practice')) state.practice = { beat: Math.max(0, Number(qs.get('practice')) - 1 || 0), playing: false }
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
  if (ex.speaker) kids.push(h('p', { class: 'part-label speaker', text: ex.speaker[state.lang] })) // whose words (add-on 0072-add6 item 3)
  // a part of the explanation, the benefits or the word meanings is labelled so, and never shown as the hadith's own words
  if (field !== 'hadeeth') kids.push(h('p', { class: 'part-label', text: ex.label ? t[ex.label] : partLabel(field) }))
  if (ex.ar) kids.push(hadithText(ex.id, 'ar', field, 'excerpt', ex.ar, 'p', 'ar', ex.idx))
  if (state.lang === 'en') kids.push(ex.en ? hadithText(ex.id, 'en', ex.en_field || field, 'excerpt', ex.en, 'p', 'en-text', ex.en_idx) : h('p', { class: 'none', text: !H.en ? t.noEn : field !== 'hadeeth' ? t.noEnPart : '' }))
  kids.push(sourceLine(ex.id), fullText(ex.id))
  return h('div', { class: cls }, ...kids)
}

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
  VIEW.feet.canvas.setAttribute('aria-label', t.feetAria(st.title[state.lang]))
  const lines = F.line ? closeLine(F) : [h('p', { class: 'feet-line ui', text: t.feetLine[st.feet] })]
  return h('figure', { class: 'feet' }, h('figcaption', { class: 'feet-h', text: t.feetH }), VIEW.feet.host, ...lines, evidenceDetails(F))
}
function sevenBlock() {
  const t = T[state.lang]
  const F = DATA.feet.seven
  VIEW.seven.canvas.setAttribute('aria-label', t.sevenAria)
  VIEW.seven.tags.forEach((tag, i) => { tag.textContent = state.lang === 'ar' ? ar(i + 1) : String(i + 1) })
  return h('figure', { class: 'feet seven' }, h('figcaption', { class: 'feet-h', text: t.sevenH }), VIEW.seven.host,
    h('p', { class: 'legend', text: t.sevenLegend }), ...closeLine(F), evidenceDetails(F))
}
function handBlock() {
  const t = T[state.lang]
  const F = DATA.feet.hand
  VIEW.hand.canvas.setAttribute('aria-label', t.handAria)
  return h('figure', { class: 'feet hand' }, h('figcaption', { class: 'feet-h', text: t.handH }), VIEW.hand.host, ...closeLine(F), evidenceDetails(F))
}

// ---- pronunciation, rulings, disputed matters, sunnah.com and Dorar items, reserved links, the rakah table ----
function pronBlock(st) {
  const t = T[state.lang]
  if (!st.pron || !st.pron.length) return null // no transliteration from our sources for it: nothing (add-on 0071-add14 §4)
  return h('div', { class: 'pron' }, h('p', { class: 'label', text: t.pronH }),
    ...st.pron.map((p) => hadithText(p.id, 'en', 'hadeeth', 'excerpt', p.en, 'p', 'en-text pron-text')))
}
function rulingQuote(r, own = false) {
  const t = T[state.lang]
  return h('div', { class: 'ruling' }, r.topic ? h('p', { class: 'topic', text: r.topic[state.lang] }) : null,
    own ? h('p', { class: 'part-label', text: t.fromBinbaz }) : null,
    h('p', { class: 'ar', lang: 'ar', dir: 'rtl', 'data-ref': `binbaz:${r.id}`, 'data-kind': 'excerpt', 'data-start': r.start, 'data-end': r.end, text: r.text }),
    h('p', { class: 'src' }, h('span', { text: t.rulingSrc(r.title) }), h('a', { href: r.url, target: '_blank', rel: 'noopener', text: t.openPage })))
}
function rulingBlock(st) {
  const t = T[state.lang]
  if (st.groups) return []
  const kids = [h('h2', { text: t.rulingH })]
  // the step's disputed matters: its own box, or in a prayer the boxes it names (prayers.js buildSteps)
  const boxes = st.khilafs ?? (st.khilaf ? [{ khilaf: st.khilaf, sunnah: st.sunnah.filter((p) => p.place === 'khilaf') }] : [])
  const bbBoxes = st.bbBoxes ?? []
  if (!st.rulings.length && !boxes.length && !bbBoxes.length) kids.push(h('p', { class: 'none', text: t.rulingNone }))
  kids.push(...st.rulings.map((r) => rulingQuote(r)))
  for (const { khilaf, sunnah } of boxes) {
    // a disputed matter (rule 11): the fixed sentence, the texts as they are, no choice between them, and the referral
    kids.push(h('div', { class: 'khilaf', role: 'note' },
      h('p', { class: 'badge', text: t.disputedBadge }),
      h('p', { class: 'topic', text: khilaf.topic[state.lang] }),
      h('p', { class: 'fixed', text: t.disputedText }),
      // our data first, then sunnah.com and the Dorar link (add-on 0071-add10), then Ibn Baz's words
      ...khilaf.texts.filter((x) => x.src !== 'binbaz').map((x) => excerptBlock(x, 'how-item')),
      ...sunnah.map(evItem),
      ...khilaf.texts.filter((x) => x.src === 'binbaz').map((r) => rulingQuote(r)),
      h('p', { class: 'ui', text: t.referralBody }),
      h('p', {}, h('a', { class: 'btn referral', href: 'https://www.alifta.gov.sa', target: '_blank', rel: 'noopener', text: t.referralButton }))))
  }
  // Ibn Baz's words on a matter with no second view in our sources (add-on 0072-add17 ش4): titled so, not «فيها أكثر من قول»
  for (const B of bbBoxes) kids.push(h('div', { class: 'bb-box', role: 'note' }, h('p', { class: 'badge', text: t.bbBadge }), h('p', { class: 'topic', text: B.topic[state.lang] }), ...B.texts.map((r) => rulingQuote(r))))
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
      h('p', { class: 'src' }, h('span', { text: t.quranSrc }), h('a', { href: A.url_muyassar, target: '_blank', rel: 'noopener', text: t.openTafsir })),
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
  if (say.kind === 'quran') return [h('h2', { text: t.readH }), ...st.before.map((r) => rulingQuote(r, true)), ...quranBlock(say, st.audio)]
  if (say.kind === 'binbaz') {
    // Ibn Baz's wording (add-on 0072-add6 items 1 and 16), each slice with its page; in English, the formula's meaning
    // as HadeethEnc's English translation words it
    const en = state.lang === 'en' && say.en
      ? h('div', { class: 'meaning' }, h('p', { class: 'label', text: say.en.id === '10945' ? t.sayMeaningEn : t.meaningHadith }),
        hadithText(say.en.id, 'en', 'hadeeth', 'excerpt', say.en.en, 'p', 'en-text'), sourceLine(say.en.id))
      : null
    return [h('h2', { text: t.sayH }), h('div', { class: 'say-box' }, h('p', { class: 'part-label', text: t.fromBinbaz }),
      ...say.texts.map((r) => h('div', { class: 'bb-say' },
        h('p', { class: 'ar dhikr', lang: 'ar', dir: 'rtl', 'data-ref': `binbaz:${r.id}`, 'data-kind': 'excerpt', 'data-start': r.start, 'data-end': r.end, text: r.text }),
        h('p', { class: 'src' }, h('span', { text: t.rulingSrc(r.title) }), h('a', { href: r.url, target: '_blank', rel: 'noopener', text: t.openPage })))),
      en)]
  }
  const H = DATA.hadith[say.id]
  const meaning = state.lang === 'en'
    ? h('div', { class: 'meaning' }, h('p', { class: 'label', text: t.meaningHadith }), say.en ? hadithText(say.id, 'en', 'hadeeth', 'excerpt', say.en, 'p', 'en-text') : h('p', { class: 'none', text: t.noEn }),
      say.editor && t.editor[say.editor] ? h('p', { class: 'editor-note', text: t.editor[say.editor] }) : null)
    : TX.hadith(say.id, 'ar', 'explanation').s === 'none' ? null : h('details', { class: 'full meaning' }, h('summary', { text: t.meaningHadith }), hadithText(say.id, 'ar', 'explanation', 'full', null, 'p', 'ui'))
  return [h('h2', { text: t.sayH }), h('div', { class: 'say-box' }, hadithText(say.id, 'ar', 'hadeeth', 'excerpt', say.ar, 'p', 'ar dhikr'), pronBlock(st), meaning), sourceLine(say.id), fullText(say.id)]
}

function groupsBlock(st) {
  const t = T[state.lang]
  if (!st.groups) return []
  return [...st.groups.flatMap((g) => [h('h2', { text: g.h[state.lang] }), ...g.items.map((r) => rulingQuote(r))]),
    h('p', { class: 'fixed-note', text: t.groupsNone })]
}

function lessonMap() {
  const t = T[state.lang]
  return [h('h2', { text: t.mapH }), h('ol', { class: 'map' }, STEPS.map((s) => {
    const ids = [...new Set([...s.how.map((x) => x.id), ...(s.say?.id ? [s.say.id] : [])])]
    let q = null
    if (s.say?.kind === 'quran') {
      const A = DATA.quran[s.say.ayat[0]], B = DATA.quran[s.say.ayat.at(-1)]
      q = state.lang === 'ar' ? `${A.sura_name} ${ar(A.aya)}–${ar(B.aya)}` : `Quran ${A.sura}:${A.aya}–${B.aya}`
    }
    const idText = [...ids.map((i) => (state.lang === 'ar' ? ar(i) : i)), q].filter(Boolean).join(' · ')
    // in a prayer, each step with its rakah (add-on 0072-add13)
    const title = PRAYER && s.at?.r ? `${t.rakahN(s.at.r)} · ${s.title[state.lang]}` : s.title[state.lang]
    return h('li', {}, h('span', { class: 'n', text: state.lang === 'ar' ? ar(s.n + 1) : String(s.n + 1) }),
      h('span', {}, h('button', { type: 'button', onclick: () => go(s.n), text: title }), h('br'), h('span', { class: 'ids', text: idText })))
  }))]
}

// ---- render ----
let companion = null, lastPose = 'ready', reTexts = false
let gl = hasWebGL()
// the canvas lives outside the re-rendered tree so the 3D scene is made once (as on the review page)
const canvasHost = h('div', { class: 'stage-canvas' }, h('canvas', { role: 'img', 'aria-label': 'رفيق الدرس' }))
const app = h('div', { class: 'wrap' })
root.replaceChildren(app)
const fillWords = (x, v) => x.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m))
const num = (n) => (state.lang === 'ar' ? ar(n) : String(n))

// where a step is: the approved lesson's kicker, or in a prayer its rakah (add-on 0072-add13)
function capOf(st) {
  const t = T[state.lang]
  if (!PRAYER) return t.kicker[st.kicker]
  const r = st.at.r
  if (r) return t.ord[r] ?? t.rakahN(r)
  return r === 0 ? t.kicker[0] : st.at.pos === 'pos.after' ? t.kicker[4] : t.kicker[5]
}
const kickerOf = (st) => (PRAYER ? `${T[state.lang].prayerOf(PRAYER.name[state.lang])} · ${capOf(st)}` : capOf(st))
/** «الركعة ٣ من ٤ · السجدة الثانية» */
function posOf(st) {
  const t = T[state.lang]
  const name = st.posName?.[state.lang] ?? st.title[state.lang]
  return st.at.r ? `${t.rakahOf(st.at.r, PRAYER.rakat)} · ${name}` : name
}

// the prayer's map: a dot for each rakah, a mark at each tashahhud, and where you are. Each opens its first step (or,
// in «تدرّب معي», its first part).
function prayerMap(st, open) {
  const t = T[state.lang]
  const n = PRAYER.rakat
  const span = (f) => {
    const idx = STEPS.filter((s) => s.at && f(s.at)).map((s) => s.n)
    return idx.length ? { first: idx[0], last: idx.at(-1) } : null
  }
  const items = []
  const add = (cls, label, text, sp) => {
    if (!sp) return
    const on = state.step >= sp.first && state.step <= sp.last
    const done = state.step > sp.last
    items.push(h('li', {}, h('button', { type: 'button', class: `${cls}${on ? ' on' : ''}${done ? ' done' : ''}`, 'aria-label': label, 'aria-current': on ? 'step' : null, onclick: () => open(sp.first) },
      text ? h('span', { text }) : null)))
  }
  for (let i = 1; i <= n; i++) {
    add('pm-r', t.rakahN(i), num(i), span((a) => a.r === i && !a.sit))
    if (i === 2 && n > 2) add('pm-t', t.tashMark[1], null, span((a) => a.sit === 1))
  }
  add('pm-t last', t.tashMark[2], null, span((a) => a.sit === 2))
  return h('nav', { class: 'pm-map', 'aria-label': t.mapAria }, h('ol', { class: 'pm-line' }, items), h('p', { class: 'pm-pos', 'aria-live': 'polite', text: posOf(st) }))
}

// the line at the top of a step that the prayer sets (template.js), with the approved texts it rests on
function cueBlock(st) {
  const t = T[state.lang]
  const lines = notesAt(st, 'cue')
  if (!st.cue && !lines.length) return null
  const ev = st.cue?.ev.filter(Boolean) ?? []
  return h('div', { class: 'pm-cue', role: 'note' }, st.cue ? h('p', { class: 'pm-cue-text', text: st.cue.text[state.lang] }) : null, ...lines,
    ev.length ? h('details', { class: 'full pm-cue-ev' }, h('summary', { text: t.feetEv }), ...ev.map((x) => (isBinbaz(x) ? rulingQuote(x, true) : excerptBlock(x)))) : null)
}
// Ibn Baz's lines the prayer sets on a step at a place ('cue', 'do', 'say'), each under its topic (add-on 0072-add17)
function notesAt(st, at) {
  return (st.notes ?? []).filter((n) => n.at === at).map((n) => h('div', { class: 'pm-bbline' },
    n.topic ? h('p', { class: 'topic', text: n.topic[state.lang] }) : null,
    ...n.texts.map((x) => (isBinbaz(x) ? rulingQuote(x, true) : excerptBlock(x)))))
}
// «أصلّي: منفردًا أو إمامًا / مأمومًا»: one choice, the steps and «تدرّب معي» by it
function modeSwitch() {
  const t = T[state.lang]
  const b = (m, label) => h('button', { type: 'button', class: `btn pm-mode-btn${state.mode === m ? ' on' : ''}`, 'aria-pressed': state.mode === m ? 'true' : 'false', 'data-mode': m, onclick: () => setMode(m) }, h('span', { text: label }))
  return h('div', { class: 'pm-mode', role: 'group', 'aria-label': t.modeH }, h('span', { class: 'pm-mode-h', text: t.modeH }), b('solo', t.modeSolo), b('follower', t.modeFollower))
}

// «أي صلاة تريد أن تتعلم؟»: a card for each prayer, with its rakahs, its recitation and today's time
function chooser() {
  const t = T[state.lang]
  const times = opts.times ?? null
  const link = opts.hasRoute?.('/today/times')
    ? h('a', { class: 'pm-times', href: '/today/times', onclick: (e) => { e.preventDefault(); opts.navigate('/today/times') }, text: t.timesOpen })
    : null
  const cards = SET.prayers.map((p) => {
    const time = p.time && times ? times[p.time] : null
    return h('li', {}, h('button', { type: 'button', class: 'pm-card', 'data-prayer': p.id, onclick: () => pick(p.id) },
      h('span', { class: 'pm-name', text: p.name[state.lang] }),
      h('span', { class: 'pm-meta', text: t.rakat(p.rakat) }),
      h('span', { class: 'pm-meta', text: p.recite[state.lang] }),
      time ? h('span', { class: 'pm-time' }, h('span', { class: 'pm-today', text: t.today }), ' ', h('bdi', { text: time })) : null))
  })
  const note = opts.chrome ? h('p', { class: 'content-note', text: opts.chrome.contentNote }) : null
  return h('div', { class: 'lesson pm-choose' }, note, h('section', { class: 'card' },
    h('h1', { text: t.choose }),
    h('p', { class: 'intro-text', text: t.chooseLead }),
    modeSwitch(),
    h('ul', { class: 'pm-cards' }, cards),
    h('p', { class: 'pm-note' }, times ? t.timesNote : t.noPlace, link ? ' ' : null, link)))
}

// the companion: made once, then set to the step's posture and close-ups
function drive(st, views = true) {
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
  if (lastPose !== st.pose || (/^taslim/.test(st.pose) && !reTexts)) companion.setPose(st.pose)
  lastPose = st.pose
  if (companion.attachView) {
    companion.attachView('feet', VIEW.feet.canvas, views ? st.feet || null : null)
    companion.attachView('seven', VIEW.seven.canvas, views && st.seven ? 'sujud' : null)
    companion.attachView('hand', VIEW.hand.canvas, views && st.hand ? 'tashahhud' : null)
  }
  if (still && companion.renderNow) placeTags(companion.renderNow())
  root.dataset.ready = '1'
}

function stageOf(st) {
  const t = T[state.lang]
  return h('section', { class: gl ? 'stage' : 'stage no-gl', 'aria-label': t.canvasAria(st.title[state.lang]) },
    canvasHost,
    h('span', { class: 'cap', text: capOf(st) }),
    h('div', { class: 'replay' }, h('button', { type: 'button', 'aria-label': t.replay, title: t.replay, onclick: () => companion && companion.replay(STEPS[Math.max(0, st.n - 1)].pose, st.pose) }, h('span', {}, svg(ICON.replay)))),
    h('span', { class: 'noface', text: t.noface }))
}

// the prayer's bar: another prayer, and «تدرّب معي» with «للتدرّب قبل الصلاة» on it
function prayerBar() {
  const t = T[state.lang]
  return h('div', { class: 'pm-bar' },
    h('button', { class: 'btn pm-other', type: 'button', onclick: () => pick(null) }, svg(t.dir === 'rtl' ? ICON.right : ICON.left), h('span', { text: t.other })),
    h('button', { class: 'btn pm-practice-btn', type: 'button', onclick: () => openPractice() }, h('span', { class: 'pm-pr-name', text: t.practice }), h('span', { class: 'pm-pr-note', text: t.practiceNote })))
}

function render() {
  const t = T[state.lang]
  root.lang = state.lang
  root.dir = t.dir
  for (const v of Object.values(VIEW)) v.host.classList.toggle('no-gl', !gl)
  stopAudio()
  clearTimeout(beatTimer)
  if (SET && !PRAYER) {
    app.replaceChildren(chooser(), footer())
    root.dataset.ready = '1'
    return
  }
  if (state.practice) return renderPractice()
  const st = STEPS[state.step]
  const asked = TX.need([st, st.feet || st.seven || st.hand ? DATA.feet : null])
  if (asked) {
    const at = state.step
    asked.then(() => {
      if (destroyed || state.step !== at || state.practice) return
      reTexts = true
      render()
      reTexts = false
    })
  }

  const stage = stageOf(st)
  // in a prayer its map is the progress; the approved lesson keeps its row of dots
  const dots = PRAYER ? null : h('div', { class: 'dots', 'aria-hidden': 'true' }, STEPS.map((s) => h('i', { class: s.n === state.step ? 'on' : s.n < state.step ? 'done' : '' })))
  const nav = h('nav', { class: 'stepper', 'aria-label': t.count(state.step) },
    h('button', { class: 'btn', type: 'button', disabled: state.step === 0, onclick: () => go(state.step - 1) }, svg(t.dir === 'rtl' ? ICON.right : ICON.left), h('span', { text: t.prev })),
    h('div', { class: 'progress' }, h('span', { class: 'count', text: t.count(state.step) }), dots),
    h('button', { class: 'btn primary', type: 'button', disabled: state.step === N - 1, onclick: () => go(state.step + 1) }, h('span', { text: t.next }), svg(t.dir === 'rtl' ? ICON.left : ICON.right)))

  const stepBtn = (k) => { const s = STEPS.find((x) => x.key === k); return h('button', { type: 'button', onclick: () => go(s.n), text: `${state.lang === 'ar' ? ar(s.n + 1) : s.n + 1} · ${s.title[state.lang]}` }) }
  const intro = PRAYER ? fillWords(SET.words.intro[state.lang], { name: PRAYER.name[state.lang] }) : t.intro
  // the four fixed fields of every step (add-on 0071-add8 §أ): what to do (our sentence), what to say, the evidence, its
  // ruling; the close-ups after «what to do»; under «the evidence» our data first, then sunnah.com (add-on 0071-add10).
  // In a prayer, the line it sets on the step comes first, under the title (add-on 0072-add13).
  const card = h('article', { class: 'card', 'aria-live': 'polite' },
    h('p', { class: 'kicker', text: `${kickerOf(st)} · ${t.count(state.step)}` }),
    h('h1', { text: st.title[state.lang] }),
    st.tag ? h('p', { class: 'step-tag', text: st.tag[state.lang] }) : null,
    cueBlock(st),
    state.step === 0 ? h('p', { class: 'intro-text', text: intro }) : null,
    PRAYER && state.step === 0 ? modeSwitch() : null,
    h('h2', { text: t.doH }),
    h('p', { class: 'do-text', text: st.do[state.lang] }),
    ...notesAt(st, 'do'),
    st.legs ? excerptBlock(st.legs, 'how-item legs') : null,
    st.nofatiha ? h('div', { class: 'repeat' }, h('button', { type: 'button', onclick: () => go(STEPS.find((x) => x.key === 'nofatiha').n), text: t.nofatiha })) : null,
    st.feet ? feetBlock(st) : null,
    st.seven ? sevenBlock() : null,
    ...st.sunnah.filter((p) => p.place === 'seven').map(evItem),
    st.hand ? handBlock() : null,
    tableBlock(st),
    ...sayBlock(st),
    ...notesAt(st, 'say'),
    ...groupsBlock(st),
    st.how.length || st.bbhow.length ? h('h2', { text: t.howH }) : null,
    ...st.how.flatMap((ex) => [excerptBlock(ex), ...(st.notes || []).filter((n) => n.after === ex.id && ex.field === 'hadeeth').map((n) => h('p', { class: 'fixed-note', text: t.notes[n.key] }))]),
    ...st.sunnah.filter((p) => p.place === 'how').map(evItem),
    ...st.bbhow.map((r) => rulingQuote(r, true)),
    st.repeat ? h('div', {}, h('p', { class: 'src', style: 'color:var(--text)', text: t.repeat }), h('div', { class: 'repeat' }, st.repeat.map(stepBtn))) : null,
    st.then ? h('div', {}, h('p', { class: 'src', style: 'color:var(--text)', text: t.then }), h('div', { class: 'repeat' }, st.then.map(stepBtn))) : null,
    ...rulingBlock(st),
    linksBlock(st),
    st.see ? h('div', { class: 'repeat' }, st.see.map((k) => h('button', { type: 'button', onclick: () => go(STEPS.find((x) => x.key === k).n), text: t.see[k] }))) : null,
    state.step === 0 ? lessonMap() : null)

  const note = opts.chrome ? h('p', { class: 'content-note', text: opts.chrome.contentNote }) : null
  const main = h('div', { class: 'lesson' }, note, PRAYER ? prayerBar() : null, PRAYER ? prayerMap(st, go) : null, stage, nav, card)
  app.replaceChildren(main, footer())
  drive(st)
}

// ---- «تدرّب معي» (add-on 0072-add13 §1): what is said in the prayer, part after part, in large type ----
// From the opening takbir to the salam, in the prayer's own order: each said text of a step (its dhikr, each ayah of
// al-Fatiha and of the surah, Ibn Baz's words where the step says them), and a step with nothing said shows what is
// done. Every text is the approved one, from our server by id and shown only when it is the reviewed bytes, with its
// source. It moves on by itself, calmly, a little longer for a longer text, or by the buttons; nothing is read aloud.
// «للتدرّب قبل الصلاة» stays on it: it is not prayed along with.
let beatTimer = 0
let BEATS = null
// the parts, from the prayer's steps as they are shown (prayers.js practiceBeats; add-on 0072-add17 م5)
const beatsOf = () => practiceBeats(STEPS)
// the text a part shows: null while it comes from our server; '' when it does not come (its source line stays)
function beatText(b) {
  if (b.kind === 'do') return b.st.do[state.lang]
  if (b.kind === 'binbaz') return b.r.text
  const got = b.kind === 'ayah' ? TX.ayah(b.id, 'text') : TX.slice(b.say.ar)
  return got.s === 'wait' ? null : got.s === 'ok' ? got.text : ''
}
// calm: about three seconds and more for a longer text, at most eighteen
const beatMs = (text) => Math.min(18_000, Math.max(3_000, 2_600 + 75 * Array.from(text.replace(/[ً-ٰٟۖ-ۭ]/g, '')).length))

function openPractice() {
  BEATS = beatsOf()
  state.practice = { beat: 0, playing: false }
  sync()
  render()
  opts.scrollTop()
}
function closePractice() {
  state.practice = null
  sync()
  render()
  opts.scrollTop()
}
function toBeat(i, playing = state.practice.playing) {
  state.practice = { beat: Math.max(0, Math.min(BEATS.length - 1, i)), playing, done: false }
  sync()
  render()
}

function renderPractice() {
  const t = T[state.lang]
  BEATS ??= beatsOf()
  const P = state.practice
  P.beat = Math.min(P.beat, BEATS.length - 1)
  const b = BEATS[P.beat]
  const st = b.st
  state.step = st.n // the map and the figure follow the part
  const asked = TX.need(BEATS.map((x) => x.st))
  if (asked) asked.then(() => { if (!destroyed && state.practice) render() })

  let big = null, meaning = null, src = null
  if (b.kind === 'hadith') {
    big = hadithText(b.say.id, 'ar', 'hadeeth', 'excerpt', b.say.ar, 'p', 'ar pm-big')
    if (state.lang === 'en' && b.say.en) meaning = hadithText(b.say.id, 'en', 'hadeeth', 'excerpt', b.say.en, 'p', 'en-text pm-mean')
    src = sourceLine(b.say.id)
  } else if (b.kind === 'ayah') {
    const A = DATA.quran[b.id]
    const text = ayahPart(A, 'text', 'span', {})
    big = text ? h('p', { class: 'ar pm-big', lang: 'ar', dir: 'rtl' }, text, '⁠', ayahMark(A.aya)) : null
    if (state.lang === 'en') meaning = ayahPart(A, 'text_en', 'p', { class: 'en-text pm-mean', lang: 'en', dir: 'ltr' })
    src = h('p', { class: 'src' }, h('span', { text: `${state.lang === 'ar' ? `${A.sura_name} ${ar(A.aya)}` : `Quran ${A.sura}:${A.aya}`} · ${t.quranSrc}` }), h('a', { href: A.url, target: '_blank', rel: 'noopener', text: t.openQuran }))
  } else if (b.kind === 'binbaz') {
    big = h('p', { class: 'ar pm-big', lang: 'ar', dir: 'rtl', 'data-ref': `binbaz:${b.r.id}`, 'data-kind': 'excerpt', 'data-start': b.r.start, 'data-end': b.r.end, text: b.r.text })
    // its meaning in English as HadeethEnc's translation words it, where the step names one
    if (state.lang === 'en' && b.en?.en) meaning = hadithText(b.en.id, 'en', 'hadeeth', 'excerpt', b.en.en, 'p', 'en-text pm-mean')
    src = h('p', { class: 'src' }, h('span', { text: t.rulingSrc(b.r.title) }), h('a', { href: b.r.url, target: '_blank', rel: 'noopener', text: t.openPage }))
  }
  const label = b.kind === 'binbaz' ? h('p', { class: 'part-label', text: t.fromBinbaz }) : b.example ? h('p', { class: 'example', text: t.example }) : null
  const beat = h('div', { class: 'pm-beat', 'aria-live': 'polite' },
    h('p', { class: 'pm-step', text: st.title[state.lang] }),
    // the prayer's own line on the step (the sittings, the recitation), as on the step itself
    st.cue ? h('div', { class: 'pm-cue', role: 'note' }, h('p', { class: 'pm-cue-text', text: st.cue.text[state.lang] })) : null,
    h('p', { class: b.kind === 'do' ? 'do-text pm-do-only' : 'pm-do', text: st.do[state.lang] }),
    b.kind === 'do' ? null : h('div', { class: 'say-box pm-say' }, label, big, meaning),
    src)
  const play = h('button', { class: 'btn primary pm-play', type: 'button', 'aria-pressed': P.playing ? 'true' : 'false',
    onclick: () => (P.done ? toBeat(0, true) : toBeat(P.beat, !P.playing)) },
  svg(P.playing ? ICON.pause : ICON.play), h('span', { text: P.done ? t.againPr : P.playing ? t.pausePr : P.beat ? t.resumePr : t.start }))
  const controls = h('div', { class: 'pm-controls' },
    h('button', { class: 'btn', type: 'button', disabled: P.beat === 0, onclick: () => toBeat(P.beat - 1) }, svg(t.dir === 'rtl' ? ICON.right : ICON.left), h('span', { text: t.backPr })),
    play,
    h('button', { class: 'btn', type: 'button', disabled: P.beat === BEATS.length - 1, onclick: () => toBeat(P.beat + 1) }, h('span', { text: t.fwdPr }), svg(t.dir === 'rtl' ? ICON.left : ICON.right)))
  const firstBeat = (n) => BEATS.findIndex((x) => x.st.n >= n)
  const note = opts.chrome ? h('p', { class: 'content-note', text: opts.chrome.contentNote }) : null
  const view = h('section', { class: 'lesson pm-practice', 'aria-label': `${t.practice} · ${t.practiceNote}` }, note,
    h('div', { class: 'pm-practice-head' }, h('p', { class: 'pm-pr-label', text: t.practiceNote }), h('p', { class: 'pm-pr-lead', text: t.practiceLead })),
    prayerMap(st, (n) => toBeat(firstBeat(n))),
    stageOf(st),
    h('div', { class: 'card pm-practice-card' }, h('p', { class: 'kicker', text: `${kickerOf(st)} · ${t.beatOf(P.beat + 1, BEATS.length)}` }), beat,
      P.done ? h('p', { class: 'fixed-note pm-done', text: t.donePr }) : null, controls,
      // at its end, the way to «إن لم تحفظ الفاتحة بعد» (add-on 0072-add17 ش6)
      P.done || P.beat === BEATS.length - 1 ? h('p', { class: 'pm-nofatiha' }, h('button', { class: 'btn', type: 'button', onclick: () => go(STEPS.find((x) => x.key === 'nofatiha').n), text: t.nofatiha })) : null,
      h('p', { class: 'pm-end' }, h('button', { class: 'btn', type: 'button', onclick: closePractice, text: t.endPr }))))
  app.replaceChildren(view, footer())
  drive(st, false)
  // on by itself: the next part after this one's time, once its text is here
  if (P.playing && !P.done) {
    const text = beatText(b)
    if (text != null) beatTimer = setTimeout(() => {
      if (destroyed || state.practice !== P) return
      if (P.beat < BEATS.length - 1) toBeat(P.beat + 1, true)
      else { state.practice = { ...P, playing: false, done: true }; render() }
    }, beatMs(text || '—'))
  }
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
  return createCompanion(canvas, { theme: state.theme, still, reducedMotion: () => reducedMQ.matches, onViews: placeTags })
}

function go(i) {
  if (i < 0 || i >= N) return
  state.step = i
  state.practice = null
  sync()
  render()
  opts.scrollTop()
}
// a prayer chosen, or (null) back to the choice
function pick(id) {
  choose(id)
  BEATS = null
  state.step = 0
  sync()
  render()
  opts.scrollTop()
}
// the choice «منفردًا أو إمامًا / مأمومًا»: the prayer's steps for it, at the same step (or its rakah's al-Fatiha where the
// step is not in the other: the surah behind an imam in a rakah recited aloud); «تدرّب معي» from that step's first part
function setMode(m) {
  if (m === state.mode) return
  const cur = PRAYER ? STEPS[state.step]?.at : null
  const practising = !!state.practice
  state.mode = m
  if (PRAYER) {
    STEPS = buildSteps(PRAYER, SET, DATA.steps, m)
    N = STEPS.length
    let i = cur ? STEPS.findIndex((s) => s.at.k === cur.k && s.at.r === cur.r) : 0
    if (i < 0) i = STEPS.findIndex((s) => s.at.k === 'fatiha' && s.at.r === cur.r)
    state.step = Math.max(0, i)
    BEATS = null
    if (practising) {
      BEATS = beatsOf()
      state.practice = { beat: Math.max(0, BEATS.findIndex((b) => b.st.n >= state.step)), playing: false }
    }
  }
  sync()
  render()
}
function sync() {
  // the prayer, the step and the practice's part in the address, so a reload keeps them; the app's own history entry
  // (its «back») is kept
  const p = new URLSearchParams(location.search)
  if (PRAYER) p.set('prayer', PRAYER.id)
  else p.delete('prayer')
  if (PRAYER || !SET) p.set('step', String(state.step + 1))
  else p.delete('step')
  if (state.practice) p.set('practice', String(state.practice.beat + 1))
  else p.delete('practice')
  if (state.mode === 'follower') p.set('as', 'follower')
  else p.delete('as')
  const q = p.toString()
  try { history.replaceState(history.state, '', location.pathname + (q ? `?${q}` : '')) } catch { /* ignore */ }
}


// ---- footer: the pronunciation, the sources, and the tools with their licences (in the app: «why no face» left out) ----
function footer() {
  const L = state.lang
  const sec = (id, title, ...kids) => h('section', { id }, h('h2', { text: title }), ...kids)
  const pron = sec('pron', L === 'ar' ? 'النطق' : 'Pronunciation',
    h('p', { text: L === 'ar' ? 'نطق الفاتحة تحت كل آية من «مؤسسة القرآن»، يُطلب من خادمنا لا منهم، ويُعرض كما جاء بلا تعديل. ونطق الأذكار من الترجمة الإنجليزية في موسوعة الأحاديث حيث كتبته. وما سوى ذلك بلا نطق. لا نطق يكتبه النموذج.' : 'Al-Fatiha’s transliteration under each ayah: Quran Foundation’s Transliteration, asked from our server, not from them, and shown as it comes, unedited. The adhkar’s, where HadeethEnc’s English translation writes it. Nothing else has one. No transliteration is written by the model.' }),
    // in the app the transliteration is asked of our server when the page opens and kept nowhere (no copy, no dates)
    DATA.qf && Object.values(DATA.quran).some((A) => A.translit) ? h('p', { class: 'src' }, h('a', { href: DATA.qf.source.url, target: '_blank', rel: 'noopener', lang: 'en', dir: 'ltr', text: 'Transliteration · Quran Foundation' })) : null)
  const srcs = sec('sources', L === 'ar' ? 'المصادر' : 'Sources', h('ul', {},
    h('li', { text: L === 'ar' ? 'القرآن الكريم والتفسير الميسر وترجمة Sahih International: المصحف الإلكتروني بجامعة الملك سعود (quran.ksu.edu.sa)، كما في بياناتنا.' : 'The Quran, al-Muyassar and the Sahih International translation: quran.ksu.edu.sa, as in our data.' }),
    h('li', { text: L === 'ar' ? 'الأحاديث ودرجاتها ومخرّجوها وشرحها: موسوعة الأحاديث النبوية المترجمة (hadeethenc.com)، العربية v1.7.0 والإنجليزية v1.25.0، بلا تعديل.' : 'The hadith, their grades, attributions and explanation: HadeethEnc (hadeethenc.com), Arabic v1.7.0 and English v1.25.0, unmodified.' }),
    h('li', { text: L === 'ar' ? 'تلاوة الفاتحة: mp3quran.net، تُشغَّل من خوادمهم عند الضغط فقط. والأذكار بلا صوت.' : 'The recitation of al-Fatiha: mp3quran.net, played from their servers only when pressed. The adhkar have no audio.' }),
    h('li', { text: L === 'ar' ? 'الأحكام في خانة «حكمه»: من صفحات فتاوى ابن باز على binbaz.org.sa، بنصها ورابطها، قُرئت للقراءة فقط. وما لم نجد له صفحة تبقى خانته فارغة. وكلامه في «ماذا تقول» و«الدليل» عليه «من كلام ابن باز، لا من حديث».' : 'The rulings under «Its ruling»: from Ibn Baz’s fatwa pages on binbaz.org.sa, in their words and with their links, read only. Where we found no page, the field stays empty. His words under «What to say» and «The evidence» are marked as his words, not a hadith.' }),
    h('li', { text: L === 'ar' ? 'ما ليس في موسوعة الأحاديث: من sunnah.com بعد نصوص الموسوعة، بمرجعه ودرجته ومن حكم ورابطه كما في جدول الأدلة، وعليه اسم sunnah.com، بلا نص.' : 'What HadeethEnc does not have: from sunnah.com, after the HadeethEnc texts, by its reference, grading, who graded and link as the evidence table records them, marked sunnah.com, with no text.' }),
    h('li', { text: L === 'ar' ? 'الدرر السنية (dorar.net): اسمها ورابط الصفحة فقط، بلا نقل حكم منها.' : 'Al-Durar Al-Saniyyah (dorar.net): its name and the page link only, no grading copied from it.' })))
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
  // al-Fatiha's transliteration as Quran Foundation gives it through our server (add-on 0071-add14 §4), shown as it comes
  setTranslit(lines) {
    let n = 0
    for (const [id, text] of Object.entries(lines)) if (DATA.quran[id]) { DATA.quran[id].translit = text; n++ }
    if (n && !destroyed && !audio) render() // while al-Fatiha plays, it shows at the next render
  },
  // the prayers' definitions as our server sends them, merged with the bundled ones (prayers.js loadPrayers): a new
  // prayer shows among the cards; the prayer being learned keeps its place
  setPrayers(set) {
    if (!set || set === SET || destroyed) return
    const id = PRAYER?.id ?? null
    const step = state.step
    useSet(set)
    if (state.practice || (id && !SET.prayers.some((p) => p.id === id))) return
    if (id) {
      choose(id)
      state.step = Math.min(N - 1, step)
      BEATS = null
    }
    if (!state.practice && !audio) render()
  },
  destroy() {
    destroyed = true
    clearTimeout(beatTimer)
    stopAudio()
    reducedMQ.removeEventListener?.('change', onReduced)
    if (companion) companion.dispose()
    companion = null
    root.replaceChildren()
  },
}
}

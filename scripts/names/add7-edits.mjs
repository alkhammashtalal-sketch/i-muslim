// Add-on 0071-add7 (Talal's answers), applied by scripts/names/daily-build.mjs after scripts/names/add5-edits.mjs, to
// the readings of the reviewed names file (left as it is), each `before` found once in the text it changes (else the
// build stops). `at` as in add5-edits.mjs, by the reviewed file's own paragraphs. Each edit is one row of
// relay/w1/0071-names/names-changelog.md.
//   §1 `jawad`: of the dispute over الجواد one neutral line stays, Talal's words exactly (DISPUTE_LINE); «عرض القولين»
//      and every reference to the view removed by add5 §2 go.
//   §2 `quote`: السيد and الوتر count with their HadeethEnc evidence (EVIDENCE), shown from D1 with its grade and
//      takhrij; their readings keep the hadith (the add5 edits for them are withdrawn), its quoted words as stored.
//   `attrib`: a reading's attribution of a hadith that the entry's own HadeethEnc evidence contradicts, removed.
//   §3 `name` (and `detach`, where the name stays on the clause that is his and the rest is cut from it): a scholar's
//      name stays only where the claim made in his name has a reference in the entry that opens
//      and holds it (scripts/names/add7-names.json lists each name kept, with that reference); elsewhere the name is
//      removed with the least change, the meaning kept. For Ibn Kathir and al-Saʿdi the reference is their tafsir of
//      the entry's referenced ayah in our data (data/processed); Ibn ʿUthaymin with «القواعد المثلى» stays.
// No word is added beyond DISPUTE_LINE, the stored wording of a hadith, a passive or plain form of the attributing
// verb, or a connective; worker/test/names-day.test.ts checks it.

/** §1, Talal's words exactly. */
export const DISPUTE_LINE = 'أثبته ابن عثيمين في القواعد المثلى، وفي عدّه اسمًا خلاف بين أهل العلم'

/** §2: the evidence hadith of السيد and الوتر, and its words as HadeethEnc stores them (checked in hadith.jsonl). */
export const EVIDENCE = [
  { n: 89, name: 'السيد', hadith: '3389', words: 'السَّيدُ اللهُ' },
  { n: 95, name: 'الوتر', hadith: '10416', words: 'وهو وِترٌ يحبُّ الوِتر' },
]

// The references that do not open from here: dorar.net answers 403 («Sorry, you have been blocked», Cloudflare) to
// every request, curl and fetch alike, on 2026-10-22.
const DORAR_403 = 'الرابط لا يفتح (add7 §3): dorar.net يرد 403 لكل طلب من هنا (Cloudflare)'

export const EDITS = [
  // ---- an attribution our data contradicts (found while checking §3) ----
  // الشافي's evidence is HadeethEnc 5541 («أنت الشافي»), «رواه البخاري» from Anas as stored; the reading gave it to
  // al-Bukhari and Muslim from ʿAisha. Removed: the card shows the hadith with its own takhrij from D1.
  { n: 4, at: 'deep:0', rule: 'attrib', before: 'أنت الشافي. رواه البخاري ومسلم عن عائشة رضي الله عنها.', after: 'أنت الشافي.', why: 'نسبة تخالف شاهد المادة في الموسوعة (5541: رواه البخاري عن أنس)؛ والبطاقة تعرض تخريجه منها (add5 §2، add7)' },
  // ---- §1 الجواد ----
  { n: 83, at: 'easy', rule: 'jawad', before: 'وهذا معنى ثابت لا يتوقف على الخلاف في اسم الجواد.', after: 'وهذا معنى ثابت.', why: 'إشارة إلى الخلاف خارج السطر الواحد (add7 §1)' },
  { n: 83, at: 'easy', rule: 'jawad', before: 'على أساس النصوص الصحيحة، مع بيان الخلاف في ثبوت لفظ الاسم.', after: 'على أساس النصوص الصحيحة.', why: 'إشارة إلى الخلاف خارج السطر الواحد (add7 §1)' },
  {
    n: 83,
    at: 'deep:0',
    rule: 'name',
    names: ['ابن منده', 'البيهقي', 'ابن القيم', 'ابن عثيمين'],
    before: 'الذين أثبتوا الاسم، منهم ابن منده والبيهقي وابن القيم وابن عثيمين.',
    after: 'الذين أثبتوا الاسم.',
    why: `${DORAR_403}: R226 https://dorar.net/aqeeda/609/؛ وابن عثيمين في السطر بعده مع القواعد المثلى`,
  },
  {
    n: 83,
    at: 'deep:0',
    rule: 'jawad',
    before: 'وأدرجه ابن عثيمين في قائمته دون تردد؛ والخلاف في ثبوت اللفظ قائم بين أهل الحديث.',
    after: `${DISPUTE_LINE}.`,
    why: 'السطر الواحد المحايد بنص طلال (add7 §1)',
  },
  { n: 83, at: 'deep:0', rule: 'jawad', before: ' عرض القولين هنا نقل لخلاف الدليل، وليس حكمًا بإبطال اجتهاد كل من أثبت الاسم.', after: '', why: '«عرض القولين» وإشارته إلى القول المحذوف (add7 §1)' },

  // ---- §2 السيد: its quoted words as HadeethEnc 3389 stores them ----
  { n: 89, at: 'deep:0', rule: 'quote', hadith: '3389', before: '«السيد الله تبارك وتعالى»', after: '«السَّيدُ اللهُ»', why: 'لفظ موسوعة الأحاديث 3389 بحروفه (add7 §2)' },

  // ---- §3 names whose reference does not open, or does not hold the claim ----
  { n: 4, at: 'meaning', rule: 'name', names: ['ابن هبيرة'], before: 'ويشرح ابن هبيرة دعاء الشفاء', after: 'ويُشرح دعاء الشفاء', why: `${DORAR_403}: R023 https://dorar.net/aqeeda/705/` },
  { n: 94, at: 'meaning', rule: 'name', names: ['الخطابي'], before: 'في الدرر السنية عن الخطابي أن المنان', after: 'في الدرر السنية أن المنان', why: `${DORAR_403}: R234 https://dorar.net/aqeeda/855` },
  { n: 94, at: 'meaning', rule: 'name', names: ['الأزهري'], before: '«كثير العطاء»، وعن الأزهري أن معناه', after: '«كثير العطاء»، وأن معناه', why: `${DORAR_403}: R234 https://dorar.net/aqeeda/855` },
  { n: 95, at: 'meaning', rule: 'name', names: ['الخطابي'], before: 'تنقل الموسوعة العقدية عن الخطابي تفسير الوتر', after: 'تنقل الموسوعة العقدية تفسير الوتر', why: `${DORAR_403}: R221 https://dorar.net/aqeeda/883/` },
  { n: 95, at: 'deep:0', rule: 'name', names: ['الخطابي'], before: 'ويشرح الخطابي، كما تنقل الموسوعة العقدية، معنى الفرد', after: 'وتنقل الموسوعة العقدية معنى الفرد', why: `${DORAR_403}: R221 https://dorar.net/aqeeda/883/` },
  { n: 96, at: 'meaning', rule: 'name', names: ['ابن باز'], before: 'وأثبت هنا لتصحيح ابن باز حديثه.', after: 'وأثبت هنا لتصحيح حديثه.', why: `${DORAR_403}: R203 https://dorar.net/h/s9eEC4Mx` },
  // ---- §3 al-Saʿdi where his tafsir in our data does not hold the claim (Ibn Kathir's 58 all hold) ----
  {
    n: 39,
    at: 'meaning',
    rule: 'name',
    names: ['السعدي'],
    before: 'يشرح السعدي الرقيب بأنه المطلع على أحوال العباد، سرهم وعلنهم وحركاتهم وسكونهم، ويوصل ذلك',
    after: 'يُشرح الرقيب بأنه المطلع على أحوال العباد، سرهم وعلنهم وحركاتهم وسكونهم، ويُوصَل ذلك',
    why: 'المرجع لا يحوي القول (add7 §3): يصل السعدي الرقيب بالمراقبة والحياء ولزوم التقوى، ولا يصله برعاية الحقوق؛ R089، R096، R142',
  },
  {
    n: 39,
    at: 'deep:0',
    rule: 'name',
    names: ['السعدي'],
    before: 'ويشرح السعدي اطلاعه على جميع أحوال العباد، ويستنبط من ذلك الحياء',
    after: 'ومن اطلاعه على جميع أحوال العباد يُستنبط الحياء',
    why: 'المرجع لا يحوي القول (add7 §3): لا يستنبط السعدي القيام بحقوق الخلق من اطلاع الله، بل من قرن التقوى ببر الأرحام؛ R089، R096، R142',
  },
  {
    n: 81,
    at: 'meaning',
    rule: 'detach',
    names: [],
    before: 'وكثرة الإحسان، ويبين أن الرحمة',
    after: 'وكثرة الإحسان. والرحمة',
    why: 'المرجع لا يحوي القول (add7 §3): يبقى اسم السعدي على شرحه الوهاب (آل عمران 8: «واسع العطايا والهبات، كثير الإحسان»)، ويُفصل عنه ما ليس في تفسيره: الرحمة عنده «توفقنا بها للخيرات وتعصمنا بها من المنكرات»، لا الحفظ من الزيغ؛ R046',
  },
  {
    n: 91,
    at: 'meaning',
    rule: 'name',
    names: ['السعدي'],
    before: 'ويبين السعدي في الشورى أن تقدير الرزق',
    after: 'وتقدير الرزق',
    why: 'المرجع لا يحوي القول (add7 §3): يربط السعدي في الشورى 27 تقدير الرزق بلطفه وحكمته وعلمه بعباده، وليس فيه «لا بالاستحقاق البشري المجرد»؛ R140',
  },
]

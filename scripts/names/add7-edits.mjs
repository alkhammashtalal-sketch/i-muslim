// Add-on 0071-add7 (Talal's answers), applied by scripts/names/daily-build.mjs after scripts/names/add5-edits.mjs, to
// the readings of the reviewed names file (left as it is), each `before` found once in the text it changes (else the
// build stops). `at` as in add5-edits.mjs, by the reviewed file's own paragraphs. Each edit is one row of
// relay/w1/0071-names/names-changelog.md.
//   §1 `jawad`: of the dispute over الجواد one neutral line stays, Talal's words exactly (DISPUTE_LINE); «عرض القولين»
//      and every reference to the view removed by add5 §2 go.
//   §2 `quote`: السيد and الوتر count with their HadeethEnc evidence (EVIDENCE), shown from D1 with its grade and
//      takhrij; their readings keep the hadith (the add5 edits for them are withdrawn), its quoted words as stored.
//   `attrib`: a reading's attribution of a hadith that the entry's own HadeethEnc evidence contradicts, removed.
//   `sense` (add-on 0071-add10 §2): a kept name whose claim is his by meaning, not in his words: the attributing verb
//      becomes «ومعنى ما ذكره …» or «ويفهم من كلام …» (with «أنه» where a verb follows, as Arabic needs), no other word
//      added (SENSE_WORDS).
//   §3 `name` (and `detach`, where the name stays on the clause that is his and the rest is cut from it): a scholar's
//      name stays only where the claim made in his name has a reference in the entry that opens
//      and holds it (scripts/names/add7-names.json lists each name kept, with that reference); elsewhere the name is
//      removed with the least change, the meaning kept. For Ibn Kathir and al-Saʿdi the reference is their tafsir of
//      the entry's referenced ayah in our data (data/processed); Ibn ʿUthaymin with «القواعد المثلى» stays.
// No word is added beyond DISPUTE_LINE, the stored wording of a hadith, a passive or plain form of the attributing
// verb, or a connective; worker/test/names-day.test.ts checks it.

/** add10 §2: the only words a `sense` edit may add, those of the two formulas. */
export const SENSE_WORDS = ['ومعنى', 'معنى', 'ما', 'ذكره', 'ويفهم', 'يفهم', 'من', 'كلام', 'كلامه', 'أن', 'أنه']

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
  // ---- add-on 0071-add10 §2: kept names whose claim is his by meaning, not by his words: the attributing verb becomes
  //      «ومعنى ما ذكره …» or «ويفهم من كلام …» (no other word added; never «يقول») ----
  { n: 4, at: 'deep:0', rule: 'sense', before: 'ويشرح ابن كثير أن الشفاء يقع', after: 'ويفهم من كلام ابن كثير أن الشفاء يقع', why: 'إسناد بالمعنى لا باللفظ (add10 §2): «فوجود السبب لا يجعله مستقلًا عن خالقه» مفهوم من «لا يقدر على شفائي أحد غيره بما يقدر من الأسباب» (الشعراء 80)' },
  { n: 6, at: 'deep:0', rule: 'sense', before: 'ويفسر ابن كثير الشكر هنا بقبول القليل', after: 'ومعنى ما ذكره ابن كثير: الشكر هنا قبول القليل', why: 'إسناد بالمعنى لا باللفظ (add10 §2): لفظه «شكور للقليل من أعمالهم» و«ليوفيهم ثواب ما فعلوه» (فاطر 30)، و«القبول» ليس لفظه' },
  { n: 10, at: 'meaning', rule: 'sense', before: 'ويقرر ابن كثير اختصاصه بالمعبود الحق.', after: 'ومعنى ما ذكره ابن كثير اختصاصه بالمعبود الحق.', why: 'إسناد بالمعنى لا باللفظ (add10 §2): لفظه «لا إله للوجود سواه، وكل ما يعبد من دونه فباطل» (الحشر 22)' },
  { n: 15, at: 'meaning', rule: 'sense', before: 'اعتمد ابن كثير والسعدي هذا البيان في تفسير الآية.', after: 'ومعنى ما ذكره ابن كثير والسعدي في تفسير الآية هذا البيان.', why: 'إسناد بالمعنى لا باللفظ (add10 §2): يورد ابن كثير لفظ الحديث ويفسر السعدي بمعناه (الحديد 3)، ولم يقل أحدهما «اعتمدت»' },
  { n: 20, at: 'meaning', rule: 'sense', before: 'يفسر السعدي بر الله في هذا الموضع برحمته', after: 'معنى ما ذكره السعدي: بر الله في هذا الموضع رحمته', why: 'إسناد بالمعنى لا باللفظ (add10 §2): يقرن السعدي البر بالرحمة «فمن بره بنا ورحمته إيانا» (الطور 28) ولا يفسر أحدهما بالآخر' },
  { n: 20, at: 'meaning', rule: 'sense', before: 'وينقل ابن كثير دعاء أهل الجنة ورجاءهم السابق.', after: 'ومعنى ما ذكره ابن كثير دعاء أهل الجنة ورجاؤهم السابق.', why: 'إسناد بالمعنى لا باللفظ (add10 §2): لفظه «نتضرع إليه فاستجاب لنا» (الطور 28)، و«الرجاء» ليس لفظه' },
  { n: 23, at: 'meaning', rule: 'sense', before: 'ويبين ابن كثير تفويضه', after: 'ومعنى ما ذكره ابن كثير تفويضه', why: 'إسناد بالمعنى لا باللفظ (add10 §2): لفظه «وأرجو من الله أن يرده علي» (يوسف 64)، و«التفويض» ليس لفظه' },
  { n: 29, at: 'meaning', rule: 'sense', before: '، ويؤكد غناه عن حمد عباده.', after: '، ومعنى ما ذكره غناه عن حمد عباده.', why: 'إسناد بالمعنى لا باللفظ (add10 §2): «غناه عن حمد عباده» مفهوم من «الغنى التام من جميع الوجوه، فلا يحتاج إلى ما يحتاج إليه خلقه» (فاطر 15)' },
  { n: 30, at: 'meaning', rule: 'sense', before: 'يفسر السعدي الحي بمن له', after: 'معنى ما ذكره السعدي: الحي من له', why: 'إسناد بالمعنى لا باللفظ (add10 §2): «حياة لا يلحقها موت ولا نقص» مفهوم من «الحياة الكاملة» (البقرة 255)' },
  { n: 33, at: 'meaning', rule: 'sense', before: 'يشرح ابن كثير الخلق في سياق الحشر بالتقدير، والبرء بإبراز المخلوق', after: 'معنى ما ذكره ابن كثير: الخلق في سياق الحشر التقدير، والبرء إبراز المخلوق', why: 'إسناد بالمعنى لا باللفظ (add10 §2): «انفراد الله بالخلق» مفهوم من «وليس كل من قدر شيئا ورتبه يقدر على تنفيذه وإيجاده سوى الله» (الحشر 24)' },
  { n: 53, at: 'meaning', rule: 'sense', before: 'يبين السعدي في آية الأنعام', after: 'يفهم من كلام السعدي في آية الأنعام', why: 'إسناد بالمعنى لا باللفظ (add10 §2): «وأن العباد لا يعجزونه» مفهوم من «فهو قادر على ذلك كله» (الأنعام 65)' },
  { n: 55, at: 'deep:0', rule: 'sense', before: 'ويبين السعدي أن الاسم يجمع', after: 'ويفهم من كلام السعدي أن الاسم يجمع', why: 'إسناد بالمعنى لا باللفظ (add10 §2): «فلا يكون التنزيه نفيًا مجردًا للصفات» مفهوم من «التنزيه عن كل نقص، والتعظيم لله في أوصافه وجلاله» (الحشر 23)' },
  { n: 58, at: 'meaning', rule: 'sense', before: 'خارج مشيئته، ولا تكون', after: 'خارج مشيئته، ومعنى ما ذكره: لا تكون', why: 'إسناد بالمعنى لا باللفظ (add10 §2): «ولا تكون المعبودات المخلوقة أندادًا له» مفهوم من «خير من الآلهة المتفرقة التي هي مجرد أسماء» (يوسف 39)' },
  { n: 59, at: 'deep:0', rule: 'sense', before: 'ويشرح السعدي كماله', after: 'ومعنى ما ذكره السعدي كماله', why: 'إسناد بالمعنى لا باللفظ (add10 §2): لفظه «كامل الصفات» و«الكبير في ذاته، وفي أسمائه، وفي صفاته» (الحج 62)' },
  { n: 70, at: 'meaning', rule: 'sense', before: 'ويختار السعدي في السياق معنى الشهادة', after: 'ومعنى ما ذكره السعدي في السياق الشهادة', why: 'إسناد بالمعنى لا باللفظ (add10 §2): لفظه «شاهدًا حفيظًا حسيبًا على هذه الأعمال» (النساء 85)، ولا يذكر أقوالًا يختار منها' },
  { n: 77, at: 'meaning', rule: 'sense', before: 'يربط السعدي هذا الوصف', after: 'يفهم من كلام السعدي أنه يربط هذا الوصف', why: 'إسناد بالمعنى لا باللفظ (add10 §2): البقاء من «خير الباقين» (الأنبياء 89)، ورجوع الأرض ومن عليها من الآية التي يوردها في الحجر 23' },
  { n: 84, at: 'deep:0', rule: 'sense', before: 'كما يشرح ابن كثير.', after: 'كما يفهم من كلام ابن كثير.', why: 'إسناد بالمعنى لا باللفظ (add10 §2): لفظه «العالم بحقائق الأمور» (سبأ 26)، و«المختلفين» ليس لفظه' },
  { n: 86, at: 'meaning', rule: 'sense', before: '، ويميز بين تربيته العامة', after: '، ويفهم من كلامه أنه يميز بين تربيته العامة', why: 'إسناد بالمعنى لا باللفظ (add10 §2): لفظه «تربيته لأوليائه، فيربيهم بالإيمان، ويوفقهم له» (الفاتحة 2)، و«الهداية» ليست لفظه في الخاصة' },
  // ---- add-on 0072-add1: the appendix notes («تنبيه الملحق»), by the same rules as the readings ----
  {
    n: 102,
    at: 'note',
    rule: 'name',
    names: ['ابن تيمية', 'ابن القيم', 'ابن باز'],
    before: 'أثبته ابن تيمية وابن القيم وابن باز بنقل الموسوعة العقدية',
    after: 'أُثبت بنقل الموسوعة العقدية',
    why: `${DORAR_403}: R227 https://dorar.net/aqeeda/523/`,
  },
  { n: 102, at: 'note', rule: 'number', cite: 'مسلم 1955', before: 'مقالًا، ولا يتضمن حديث مسلم 1955 لفظ «المحسن».', after: 'مقالًا.', why: 'لا يطابق بياناتنا (add5 §2): «حديث مسلم 1955» لا تقتبس الجملة لفظه، بل تنفي عنه «المحسن»' },
]

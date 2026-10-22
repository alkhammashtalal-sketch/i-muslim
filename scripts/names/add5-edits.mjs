// Add-on 0071-add5 §2 (Talal): what the readings of the daily card «اسم من أسماء الله» may cite. Applied by
// scripts/names/daily-build.mjs to the readings of the reviewed names file, in this order, each `before` found once
// in the text it changes (else the build stops); the reviewed file itself is left as it is.
//   • `number`: an ayah or a hadith cited by number that does not match our data (the build's own check: the ayah in
//     quran.jsonl; the hadith quoted by the reading's sentence in a HadeethEnc row by the textual rule of CLAUDE.md §9,
//     whose takhrij names the same book). The mention is removed, with the words it quotes, so no hadith text is left
//     without its source; what matches becomes a link the build writes, not an edit here.
//   • `six`: the six entries with no HadeethEnc hadith (quranOnly): every mention of a hadith leaves their readings.
// Only removals, and the least that keeps the sentence reading correctly (a connective, a pronoun); no word added.
// Each edit is one row of relay/w1/0071-names/names-changelog.md («لا يطابق بياناتنا (add5 §2)»).
// `withdrawn: 'add7 §2'`: السيد and الوتر count with their HadeethEnc evidence since add-on 0071-add7 §2 (3389 and
// 10416), so their hadith stays in their readings; the edits are kept here as the record, and the build skips them.
// `at`: 'meaning' («المعنى»), 'easy' («قراءة ميسرة»), 'deep:0' / 'deep:1' («قراءة أعمق» [1] / [2]); an empty
// paragraph left by its edits is dropped.
export const EDITS = [
  // ---- cited by number, not in our data ----
  { n: 16, at: 'meaning', rule: 'number', cite: 'مسلم 2713', before: 'بأنه ليس بعده شيء، كما في مسلم 2713.', after: 'بأنه ليس بعده شيء.', note: 'الجملة لا تقتبس لفظه: «ليس بعده شيء»، وفي موسوعة الأحاديث 6335 «فليس بعدك شيء»' },
  { n: 96, at: 'meaning', rule: 'number', cite: 'صحيح مسلم (2590)', before: 'وفي صحيح مسلم (2590): «لا يستر الله على عبد في الدنيا إلا ستره الله يوم القيامة»، وفي حديث النجوى', after: 'وفي حديث النجوى', note: 'لفظه ليس في موسوعة الأحاديث: فيها 3777 «لا يستر عبد عبدًا في الدنيا إلا ستره الله يوم القيامة»؛ حُذف مع نصه' },
  { n: 96, at: 'meaning', rule: 'number', cite: 'صحيح البخاري (2441)', before: 'ويحب الستر. وفي حديث النجوى في صحيح البخاري (2441): «سترتها عليك في الدنيا وأنا أغفرها لك اليوم». وليس', after: 'ويحب الستر. وليس', note: 'لفظه ليس في موسوعة الأحاديث: فيها 4242 «فإني قد سترتها عليك في الدنيا، وإني أغفرها لك اليوم»؛ حُذف مع نصه' },

  // ---- the six (four since add-on 0071-add7 §2): no HadeethEnc hadith, no mention of a hadith ----
  // الجواد
  { n: 83, at: 'meaning', rule: 'six', before: 'إثبات علماء لاسم الجواد، مع حكمه بأن طرق الأحاديث الواردة فيه لا تثبت، وصحح', after: 'إثبات علماء لاسم الجواد، وصحح' },
  { n: 83, at: 'meaning', rule: 'six', cite: 'صحيح الجامع (1744)', before: 'لاسم الجواد، وصحح الألباني حديثه في صحيح الجامع (1744)؛ أما', after: 'لاسم الجواد؛ أما' },
  { n: 83, at: 'deep:0', rule: 'six', before: 'وابن عثيمين. ويعرض ألفاظ الروايات، ثم يقرر وجود مقال في أسانيدها وعدم ثبوتها عنده في حديث صحيح. وصحح', after: 'وابن عثيمين. وصحح' },
  {
    n: 83,
    at: 'deep:0',
    rule: 'six',
    cite: 'صحيح الجامع (1744)',
    before: 'وابن عثيمين. وصحح الألباني حديث «إن الله تعالى جواد يحب الجود…» في صحيح الجامع (1744)، وأدرجه ابن عثيمين في قائمته دون تردد؛ فالخلاف',
    after: 'وابن عثيمين. وأدرجه ابن عثيمين في قائمته دون تردد؛ والخلاف',
    note: 'و«فالخلاف» صارت «والخلاف» لأن ما تفرّع عنه حُذف، وبقي التصريح بالخلاف',
  },
  { n: 83, at: 'deep:1', rule: 'six', before: 'إلى الغني. ولا ننسب حديثًا مختلفًا في صحته إلى النبي صلى الله عليه وسلم بصيغة جازمة دون بيان الخلاف فيه.', after: 'إلى الغني.' },
  // الحكم
  { n: 84, at: 'meaning', rule: 'six', before: 'يدل الحديث على اختصاص الله بالحكم المطلق، ويشرح ابن كثير', after: 'يشرح ابن كثير' },
  { n: 84, at: 'deep:0', rule: 'six', before: 'ثبت في حديث هانئ بن يزيد قول النبي صلى الله عليه وسلم إن الله هو الحكم وإليه الحكم. والحديث', after: 'والحديث' },
  { n: 84, at: 'deep:0', rule: 'six', before: 'والحديث متعلق بتصحيح كنية، وتقريره يرد الحكم المطلق إلى الله. وتبين آية سبأ', after: 'تبين آية سبأ', note: 'وحُذفت واو «وتبين» في أول الفقرة' },
  // السيد
  { n: 89, at: 'meaning', rule: 'six', withdrawn: 'add7 §2', before: 'يبين شرح الحديث في الدرر السنية أن السيادة', after: 'السيادة' },
  { n: 89, at: 'deep:0', rule: 'six', withdrawn: 'add7 §2', before: 'ورد قول النبي صلى الله عليه وسلم «السيد الله تبارك وتعالى» في حديث وفد بني عامر، مع تحذيرهم من أن يستدرجهم الشيطان في المدح. ويشرح', after: 'ويشرح' },
  { n: 89, at: 'deep:0', rule: 'six', withdrawn: 'add7 §2', before: 'ويشرح الحديث أن السيادة الكاملة لله، وأن إطلاق', after: 'السيادة الكاملة لله، وإطلاق', note: 'و«وأن إطلاق» صارت «وإطلاق» لأن عاملها حُذف' },
  // المعطي
  { n: 93, at: 'meaning', rule: 'six', before: 'يدل حديث البخاري على أن العطاء من الله، وأن توزيع', after: 'العطاء من الله، وتوزيع', note: 'و«وأن توزيع» صارت «وتوزيع» لأن عاملها حُذف' },
  { n: 93, at: 'deep:0', rule: 'six', before: 'جاء في صحيح البخاري قول النبي صلى الله عليه وسلم: «والله المعطي وأنا القاسم». يميز', after: 'يميز' },
  { n: 93, at: 'deep:0', rule: 'six', before: 'يميز النص بين حقيقة العطاء من الله وبين وظيفة القسمة التي يقوم بها الرسول. وفي هذا', after: 'وفي هذا', note: '«النص» هو الحديث' },
  { n: 93, at: 'deep:0', rule: 'six', before: 'وفي هذا أصل لرد النعمة إلى الله دون إنكار أثر الأسباب التي يجريها.', after: '', note: '«هذا» هو الحديث؛ وبه خلت الفقرة فحُذفت' },
  // المنان
  { n: 94, at: 'meaning', rule: 'six', before: '«المعطي ابتداءً»؛ وورد الاسم في الحديث في سياق الثناء على الله والدعاء بأسمائه، ويؤيده', after: '«المعطي ابتداءً»؛ ويؤيده' },
  { n: 94, at: 'deep:0', rule: 'six', before: 'ورد اسم المنان في دعاء سمعه النبي صلى الله عليه وسلم وأثنى على ما تضمنه من سؤال الله باسمه الأعظم. وقال', after: 'وقال' },
  { n: 94, at: 'deep:0', rule: 'six', cite: 'السلسلة الصحيحة (7/1209)', before: 'وقال الألباني في السلسلة الصحيحة (7/1209): إسناده جيد. لا نعزل', after: 'لا نعزل' },
  { n: 94, at: 'deep:0', rule: 'six', before: 'لا نعزل كلمة من الدعاء ونزعم أن تعيين الاسم الأعظم فيها محل اتفاق؛ وإنما نثبت ورود المنان وفضل الدعاء كما جاء.', after: '', note: '«الدعاء» هو دعاء الحديث؛ وبه خلت الفقرة فحُذفت' },
  // الوتر
  { n: 95, at: 'meaning', rule: 'six', withdrawn: 'add7 §2', before: 'مع إثبات محبته للوتر كما ورد في الحديث.', after: 'مع إثبات محبته للوتر.' },
  { n: 95, at: 'deep:0', rule: 'six', withdrawn: 'add7 §2', before: 'ثبت في الصحيحين وصف الله بأنه وتر يحب الوتر. ويشرح الخطابي', after: 'يشرح الخطابي', note: 'وحُذفت واو «ويشرح» في أول الفقرة' },
  { n: 95, at: 'deep:1', rule: 'six', withdrawn: 'add7 §2', before: 'ولا تستخرج من الحديث قاعدة', after: 'ولا تستخرج قاعدة' },
]

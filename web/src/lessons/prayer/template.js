// «علّمني الصلاة» for each prayer (add-on 0072-add13 §1): ONE template that writes out every step of every rakah of a
// prayer, from the approved lesson's own steps (web/src/lessons/prayer-data.json, reviewed in relay/w1/0071-prayer and
// approved in add-on 0072-add7 §2). Nothing is abridged: no step says «like the first rakah». Each rakah is written in
// full — its takbir (or its standing up), al-Fatiha, the surah where there is one, the bowing, the rising, the first
// prostration, the sitting, the second prostration — and the sittings are said in the step itself: the first
// tashahhud, the standing up to the third rakah with the hands raised, the last tashahhud with tawarruk in a three- or
// four-rakah prayer, and «الفاتحة وحدها، سرًّا» in the rakahs after the second.
//
// What the template adds to the approved steps is wording only, all of it in WORDS below and nothing else: the lines
// at the top of a step (Talal's own sentences of the add-on, and the same pattern where his do not cover a prayer),
// the few «what to do» lines whose approved wording was written for the one example of Fajr («تقوم للركعة الثانية
// وتصلّيها كالأولى», «ثم تقوم للركعة الثانية»), the titles that name the first and the last tashahhud, and the
// position names of the prayer map. No hadith, ayah or Ibn Baz text is new: every text a step shows is one of the
// approved steps' own nodes, named by its place in the data and its id (a «ref»: '<step>/<list>/<index>#<id>').
//
// After the independent review of batch 1 (add-on 0072-add17, relay/w1/0072-prayers/batch-1/review-prayers-batch-1.md,
// its codes ج1–3, م1–5, ش1–7): each prayer is written twice, for the one praying alone or as imam (the default) and for
// the follower behind an imam (the choice on the prayer's card); Ibn Baz's words the review asked for are exact slices
// of his live pages (prayers-texts.json, scripts/lessons/prayer-texts.mjs), held in the set's own texts step
// (TEXTS_KEY below) and named by refs like any approved node; and a step may show texts as visible lines (notes) at
// its line, its «what to do» or its «what to say», and boxes of the set's own (a disputed matter, rule 11, or «من كلام
// ابن باز»).
//
// It runs at build time only (scripts/lessons/prayers.mjs writes web/src/lessons/prayer/prayers-batch-1.json, the
// definitions as our server will later send them, add-on 0072-add13 §2) and in worker/test/lessons-0072.test.ts,
// which holds the bundled file to it and checks every prayer's steps, in order. The app renders the definitions
// (prayers.js); it does not import this file.

/** The batch-1 prayers (add-on 0072-add13 §2): the five, each with the rakah table's row (the «rakat» step) it follows. */
export const PRAYERS = [
  // the table: «الفجر 2 جهر»; jahr in Fajr: 65349's benefit «مشروعية الجهر بالقراءة في الصبح»
  { id: 'fajr', time: 'fajr', row: 0, rakat: 2, recite: ['jahr', 'jahr'], ev: { jahr: 'rakat/how/6#65349' } },
  // «الظهر 4 إسرار»; 3100's benefit «استحباب الإسرار بهاتين الصلاتين» (Dhuhr and Asr)
  { id: 'dhuhr', time: 'dhuhr', row: 1, rakat: 4, recite: ['sirr', 'sirr', 'sirr', 'sirr'], ev: { sirr: 'rakat/how/5#3100' } },
  { id: 'asr', time: 'asr', row: 2, rakat: 4, recite: ['sirr', 'sirr', 'sirr', 'sirr'], ev: { sirr: 'rakat/how/5#3100' } },
  // «المغرب 3 جهر في الأوليين، وسرّ في الثالثة»; 5321 «سمعت النبي ﷺ يقرأ في المغرب بالطور»
  { id: 'maghrib', time: 'maghrib', row: 3, rakat: 3, recite: ['jahr', 'jahr', 'sirr'], ev: { jahr: 'rakat/how/7#5321' } },
  // «العشاء 4 جهر في الأوليين، وسرّ في الأخريين»; 3177's benefit «الجهر في صلاة العشاء»
  { id: 'isha', time: 'isha', row: 4, rakat: 4, recite: ['jahr', 'jahr', 'sirr', 'sirr'], ev: { jahr: 'rakat/how/8#3177' } },
]

// The set's own texts (add-on 0072-add17): one step of the set, not shown, holding Ibn Baz's slices of his live pages
// (bb) and HadeethEnc positions (hadith), from prayers-texts.json, and the set's boxes; named by refs like an approved
// node: 'pm_texts/bb/<name>#<id>'.
export const TEXTS_KEY = 'pm_texts'
const T = (name, id) => `${TEXTS_KEY}/bb/${name}#${id}`
const TH = (name, id) => `${TEXTS_KEY}/hadith/${name}#${id}`
const BB = {
  jahrSolo: T('jahr_solo', '12226'), jahrLower: T('jahr_lower', '12226'), jahrAll: T('jahr_all', '17622'), jahrWomen: T('jahr_women', '17622'),
  fMust: T('f_must', '11314'), fListen: T('f_listen', '11314'), fViews: T('f_views', '11314'), fView1: T('f_view1', '11314'), fView2: T('f_view2', '11314'), fView3: T('f_view3', '11314'),
  fRise: T('f_rise', '10166'), rabbana: T('rabbana', '10166'), sirrBasmala: T('sirr_basmala', '2465'), sayTaawwudh: T('say_taawwudh', '10166'), sayBasmala: T('say_basmala', '10166'), salam: T('salam', '10166'),
  takbirRise: T('takbir_rise', '9934'), taawwudh1: T('taawwudh_1', '24833'), taawwudh2: T('taawwudh_2', '24833'), salatT1: T('salat_t1', '10166'),
  salatKhilaf: T('salat_khilaf', '4110'), salatSahih: T('salat_sahih', '4110'), tongue: T('tongue', '17391'), aloneSunna: T('alone_sunna', '2912'), aloneMore: T('alone_more', '2912'),
  istirahaTakbir: T('istiraha_takbir', '20567'),
}
const HE = { rise2: TH('rise2', '65098'), rabbanaEn: TH('rabbana_en', '3095') }
// the boxes of the set: a disputed matter (kind 'khilaf': the fixed sentence, the texts as they are, the referral; rule
// 11) or Ibn Baz's words on a matter (kind 'bb')
const BOXES = {
  // م2: seeking refuge in the rakahs after the first (24833)
  taawwudh: { kind: 'khilaf', topic: 'box.taawwudh', texts: [BB.taawwudh1, BB.taawwudh2] },
  // م3: the blessing on the Prophet after the first tashahhud (4110)
  salat1: { kind: 'khilaf', topic: 'box.salat1', texts: [BB.salatKhilaf, BB.salatSahih] },
  // §1: the follower's al-Fatiha in a prayer recited aloud: the three views as 11314 states them (rule 11)
  fread: { kind: 'khilaf', topic: 'box.fread', texts: [BB.fViews, BB.fView1, BB.fView2, BB.fView3] },
  // ش4: where the tawarruk is: Ibn Baz 12188, the approved box's own two slices, as his words
  tawarruk: { kind: 'bb', topic: 'box.tawarruk', texts: ['tawarruk/khilaf/texts/0#12188', 'tawarruk/khilaf/texts/1#12188'] },
}
// the lines a step shows of Ibn Baz's words (add-on 0072-add17), each under a topic of ours
const NOTE = {
  basmala: { topic: 'topic.basmala', refs: [BB.sirrBasmala] }, // ج2
  women: { topic: 'topic.women', refs: [BB.jahrWomen] }, // §1
  follower: { topic: 'topic.follower', refs: [BB.fListen] }, // §1
  sirr: { topic: 'topic.sirr', refs: [BB.tongue] }, // م4
  alone: { topic: 'topic.alone', refs: [BB.aloneSunna, BB.aloneMore] }, // ش1
  istiraha: { topic: 'topic.istiraha', refs: [BB.istirahaTakbir] }, // ش2
  salat1: { topic: 'topic.salat1', refs: [BB.salatT1] }, // م3
  // ش3: the tawarruk described, the approved step's own benefit 8 of 10902
  tawarruk: { topic: 'topic.tawarruk', refs: ['tawarruk/how/1#10902'] },
}

// The approved texts the template's lines rest on, each by its place in the approved data and its id.
const EV = {
  // the rakahs after the second: 3100 «وفي الركعتين الأُخْرَيَيْنِ بِأُمِّ الكتاب»; 10916's benefit «استحباب الاقتصار
  // على الفاتحة في الركعتين الأُخريين من صلاة العصر والظهر والعشاء، وثالثة المغرب»; Ibn Baz 7862 «تقرأ الفاتحة فقط من
  // دون جهر»; Ibn Baz 1224 «ثم يسر في الثالثة، والرابعة» (the independent review, item 10)
  alone: ['rakat/how/3#3100', 'rakat/how/4#10916', 'rakat/bbhow/0#7862', 'rakat/bbhow/1#1224'],
  // standing up from the first tashahhud: 65441 «وإذا قام من الركعتين رفع يديه»; Ibn Baz 6797 «وعند القيام من التشهد
  // الأول إلى الثالثة»
  stand3: ['takbir/how/4#65441', 'takbir/rulings/0#6797'],
  // the first tashahhud: 10906 «وكان يقول في كل ركعتين التحية» (the tawarruk step has its own texts, 65440's
  // explanation among them)
  tash1: ['rakat/how/9#10906'],
  // ج3: the takbir on rising from the second prostration to the tashahhud: 65098 «ثُمَّ يُكَبِّرُ حِينَ يَرْفَعُ رَأْسَهُ مِنَ
  // السُّجُودِ» (its second time, after the second prostration), and Ibn Baz 9934 on the transition takbirs
  rise: [HE.rise2, BB.takbirRise],
  // §1, ش5: aloud for the imam and the one praying alone (12226, 17622)
  jahr: [BB.jahrSolo, BB.jahrLower, BB.jahrAll],
}
// What a step shows of the approved texts beyond its own, or leaves out of them (the independent review of batch 1,
// relay/w1/0072-prayers/batch-1/review-batch-1.md, items 3, 4, 6, 7, 12 and 15): approved nodes only, by their refs.
const ADD = {
  // the right hand on the right placing at each standing (65442 «يضع الرجل اليد اليمنى على ذراعه اليسرى»)
  hands: ['istiftah/how/1#65442'],
  // the hands in the last tashahhud with tawarruk: the tashahhud step's own 10941 and 65459
  tawarruk: ['tashahhud/how/2#10941', 'tashahhud/how/3#65459'],
  // the full sentence of 10166 «ثم يقول: أعوذ بالله … ثم يقرأ الحمد» under the evidence; what is said of it is the step's
  // «before» (add-on 0072-add17 م5: Ibn Baz's narration is not shown as what is said)
  before: ['fatiha/before/0#10166'],
}
const HIDE = {
  // «ثم يصنع في الأخرى مثل ذلك» is said of the second rakah
  later: ['rakah2/how/2#10902'],
  // 10906 «يستفتح الصلاة بالتكبير، والقراءة» is the prayer's opening: the first rakah only
  open: ['fatiha/how/1#10906'],
  // 65446 «قال: "آمين" ورفع بها صوته» is not shown under a quiet recitation
  amin: ['fatiha/how/3#65446'],
  // the approved «before» of al-Fatiha (10166's narration), moved under the evidence (ADD.before)
  before: ['fatiha/before/0#10166'],
  // ش3: 10902's benefit 8 is shown under «what to do» on the tawarruk (NOTE.tawarruk), not twice
  tawarrukHow: ['tawarruk/how/1#10902'],
}
// The disputed-matter boxes of a tashahhud: «تحريك السبابة» (9609: at the supplication of the last tashahhud) on the
// last tashahhud, not the first. «موضع التورّك» (12188) is one fatwa of Ibn Baz with no second view in our sources: it is
// shown as «من كلام ابن باز», not as a disputed matter (add-on 0072-add17 ش4; islamqa is not a constant, 0072-add7)
const KHILAF = { first: [], last2: ['tashahhud'], tawarruk: ['tashahhud'] }
// The rulings shown on the tashahhuds. The first: Ibn Baz 13135 «التشهد الأول واجب» and 4218 (from the «minimum» step),
// then the tashahhud step's own two on the pointing; without 4189, which is on the last tashahhud. The last: the
// tashahhud step's own three (4189, 14154, 4145), also on the tawarruk step, which has none of its own.
const RULINGS = {
  tash1: ['rakat/rulings/0#13135', 'minimum/groups/1/items/1#4218', 'tashahhud/rulings/1#14154', 'tashahhud/rulings/2#4145'],
  tashLast: ['tashahhud/rulings/0#4189', 'tashahhud/rulings/1#14154', 'tashahhud/rulings/2#4145'],
}

/** Every word the template adds to the approved steps, Arabic and English. Talal's own sentences (add-on 0072-add13 §1)
 *  are kept as he wrote them: cue.tash1, cue.stand3, cue.alone, and «اجلس للتشهد الأخير متورّكًا» inside
 *  cue.tawarruk3/4. */
export const WORDS = {
  // the lines at the top of a step (the prayer's own instruction, in the step itself)
  // ج3 (add-on 0072-add17): Talal's sentences with the takbir on rising, as the add-on words them
  'cue.tash1': { ar: 'بعد السجدة الثانية من الركعة الثانية لا تقم، بل ارفع رأسك مكبّرًا واجلس للتشهد الأول', en: 'After the second prostration of the second rakah, do not stand up: raise your head saying the takbir and sit for the first tashahhud.' },
  'cue.stand3': { ar: 'قم إلى الثالثة مكبّرًا رافعًا يديك', en: 'Stand up for the third rakah saying the takbir and raising your hands.' },
  'cue.alone': { ar: 'الفاتحة وحدها، سرًّا', en: 'Al-Fatiha alone, quietly.' },
  // ج2: the seeking of refuge and the basmala quietly, al-Fatiha and the surah aloud (the one praying alone or as imam);
  // after the first rakah the basmala alone (م2)
  'cue.jahr': { ar: 'تتعوّذ وتبسمل سرًّا، ثم تقرأ الفاتحة وما تيسر من القرآن جهرًا', en: 'Seek refuge and say the basmala quietly, then recite al-Fatiha and what is easy of the Quran aloud.' },
  'cue.jahr2': { ar: 'تبسمل سرًّا، ثم تقرأ الفاتحة وما تيسر من القرآن جهرًا', en: 'Say the basmala quietly, then recite al-Fatiha and what is easy of the Quran aloud.' },
  // §1: the follower in a rakah recited aloud (11314), and on rising from bowing (10166)
  'cue.f.jahr': { ar: 'تقرأ الفاتحة ثم تنصت لإمامك', en: 'Recite al-Fatiha, then listen to your imam.' },
  'cue.f.itidal': { ar: 'تقول عند الرفع: ربنا ولك الحمد، وحدها', en: 'As you rise, you say only: Rabbana wa laka al-hamd.' },
  'cue.sirr': { ar: 'الفاتحة ثم ما تيسر من القرآن، سرًّا', en: 'Al-Fatiha, then what is easy of the Quran, quietly.' },
  'cue.last2': { ar: 'بعد السجدة الثانية من الركعة الثانية لا تقم، بل ارفع رأسك مكبّرًا واجلس للتشهد الأخير', en: 'After the second prostration of the second rakah, do not stand up: raise your head saying the takbir and sit for the last tashahhud.' },
  'cue.tawarruk3': { ar: 'بعد السجدة الثانية من الركعة الثالثة لا تقم، بل ارفع رأسك مكبّرًا واجلس للتشهد الأخير متورّكًا', en: 'After the second prostration of the third rakah, do not stand up: raise your head saying the takbir and sit for the last tashahhud in tawarruk.' },
  'cue.tawarruk4': { ar: 'بعد السجدة الثانية من الركعة الرابعة لا تقم، بل ارفع رأسك مكبّرًا واجلس للتشهد الأخير متورّكًا', en: 'After the second prostration of the fourth rakah, do not stand up: raise your head saying the takbir and sit for the last tashahhud in tawarruk.' },
  // a small tag on the surah step: how it is recited in this rakah
  'tag.jahr': { ar: 'جهرًا', en: 'Aloud' },
  'tag.sirr': { ar: 'سرًّا', en: 'Quietly' },
  // «what to do» where the approved line was written for Fajr's example only
  'do.stand2': { ar: 'تقوم للركعة الثانية مكبّرًا، وتضع يدك اليمنى على يدك اليسرى.', en: 'You stand up for the second rakah saying the takbir, and place your right hand on your left hand.' },
  'do.stand3': { ar: 'تقوم إلى الثالثة مكبّرًا رافعًا يديك، ثم تضع يدك اليمنى على يدك اليسرى.', en: 'You stand up for the third rakah saying the takbir and raising your hands, then place your right hand on your left hand.' },
  'do.stand4': { ar: 'تقوم إلى الرابعة مكبّرًا، وتضع يدك اليمنى على يدك اليسرى.', en: 'You stand up for the fourth rakah saying the takbir, and place your right hand on your left hand.' },
  // ش7: the prayer named in the intention
  'do.intro': { ar: 'تتوضأ، ثم تقف مستقبل القبلة ناويًا صلاة {name} بقلبك.', en: 'You make ablution, then stand facing the qibla, intending the {name} prayer in your heart.' },
  // م2: al-Fatiha after the first rakah, the approved line without the seeking of refuge
  'do.fatiha2': { ar: 'تقول: بسم الله الرحمن الرحيم، ثم تقرأ الفاتحة وأنت قائم، ثم تقول: آمين.', en: 'You say the basmala, in Ibn Baz’s words below, then recite al-Fatiha standing, then say: Amin.' },
  'do.istiraha4': { ar: 'ترفع رأسك وتجلس جلسة خفيفة، ثم تقوم للركعة الرابعة.', en: 'You raise your head and sit briefly, then rise for the fourth rakah.' },
  // the tawarruk step's approved line with the tashahhud step's own words for the hands (the review's item 3)
  'do.tawarruk': { ar: 'تجلس متورّكًا، ويداك على فخذيك، وتقبض أصابع يدك اليمنى وتشير بسبابتها.', en: 'You sit in tawarruk, your hands on your thighs, closing the fingers of your right hand and pointing with its index finger.' },
  // titles
  'title.stand2': { ar: 'القيام للركعة الثانية', en: 'Standing for the second rakah' },
  'title.stand3': { ar: 'القيام للركعة الثالثة', en: 'Standing for the third rakah' },
  'title.stand4': { ar: 'القيام للركعة الرابعة', en: 'Standing for the fourth rakah' },
  'title.sujud1': { ar: 'السجدة الأولى', en: 'The first prostration' },
  'title.tash1': { ar: 'التشهد الأول', en: 'The first tashahhud' },
  'title.last': { ar: 'التشهد الأخير', en: 'The last tashahhud' },
  // the topics over Ibn Baz's lines on a step, and the set's boxes (add-on 0072-add17)
  'topic.basmala': { ar: 'التعوذ والبسملة سرًّا', en: 'Seeking refuge and the basmala quietly, in Ibn Baz’s words' },
  'topic.women': { ar: 'جهر المرأة', en: 'A woman recites aloud too, unless men not of her family are near, in Ibn Baz’s words' },
  'topic.follower': { ar: 'قراءة المأموم', en: 'The follower recites al-Fatiha, then listens to the imam, in Ibn Baz’s words' },
  'topic.sirr': { ar: 'معنى «سرًّا»', en: 'Quietly still means with the tongue moving, in Ibn Baz’s words' },
  'topic.alone': { ar: 'الفاتحة وحدها، والزيادة أحيانًا', en: 'Al-Fatiha alone, and at times something more (in Dhuhr especially), in Ibn Baz’s words' },
  'topic.istiraha': { ar: 'التكبير مع جلسة الاستراحة', en: 'The takbir with the resting sit: either way, in Ibn Baz’s words' },
  'topic.salat1': { ar: 'بعد التشهد الأول', en: 'After the first tashahhud: the blessing on the Prophet is better, in Ibn Baz’s words' },
  'topic.tawarruk': { ar: 'صفة التورّك', en: 'How to sit in tawarruk' },
  'box.taawwudh': { ar: 'التعوذ في الركعات بعد الأولى', en: 'Seeking refuge in the rakahs after the first' },
  'box.salat1': { ar: 'الصلاة على النبي ﷺ بعد التشهد الأول', en: 'The blessing on the Prophet after the first tashahhud' },
  'box.fread': { ar: 'قراءة المأموم الفاتحة', en: 'The follower reciting al-Fatiha' },
  'box.tawarruk': { ar: 'موضع التورّك', en: 'Where the tawarruk is' },
  // the prayer map's position names («الركعة ٣ من ٤ · السجدة الثانية»)
  'pos.intro': { ar: 'قبل أن نبدأ', en: 'Before we begin' },
  'pos.takbir': { ar: 'تكبيرة الإحرام', en: 'The opening takbir' },
  'pos.istiftah': { ar: 'دعاء الاستفتاح', en: 'The opening supplication' },
  'pos.stand': { ar: 'القيام', en: 'Standing' },
  'pos.fatiha': { ar: 'الفاتحة', en: 'Al-Fatiha' },
  'pos.surah': { ar: 'ما تيسر من القرآن', en: 'What is easy of the Quran' },
  'pos.ruku': { ar: 'الركوع', en: 'Bowing' },
  'pos.itidal': { ar: 'الرفع من الركوع', en: 'Rising from bowing' },
  'pos.sujud1': { ar: 'السجدة الأولى', en: 'The first prostration' },
  'pos.jalsa': { ar: 'الجلسة بين السجدتين', en: 'Sitting between the prostrations' },
  'pos.sujud2': { ar: 'السجدة الثانية', en: 'The second prostration' },
  'pos.istiraha': { ar: 'جلسة الاستراحة', en: 'The brief resting sit' },
  'pos.tash1': { ar: 'التشهد الأول', en: 'The first tashahhud' },
  'pos.last': { ar: 'التشهد الأخير', en: 'The last tashahhud' },
  'pos.ibrahimiyya': { ar: 'الصلاة الإبراهيمية', en: 'Blessings upon the Prophet' },
  'pos.qabla': { ar: 'الدعاء قبل السلام', en: 'Supplication before the salam' },
  'pos.taslim': { ar: 'التسليم', en: 'The closing salam' },
  'pos.after': { ar: 'بعد الصلاة', en: 'After the prayer' },
  'pos.more': { ar: 'ملحق', en: 'Appendix' },
  // the first step's line, with the prayer's name
  intro: {
    ar: 'أهلًا بك. هذا الدرس يمرّ معك على صلاة {name} ركعةً ركعة، وكل ركعة بخطواتها كلها، ومع كل خطوة النص الذي تقوم عليه. تقدّم بزر «التالي» حين تكون مستعدًا.',
    en: 'Welcome. This lesson goes with you through the {name} prayer rakah by rakah, each rakah with all its steps, and each step with the text it rests on. Move on with “Next” when you are ready.',
  },
}

/** The two ways a prayer is written (add-on 0072-add17 §1): the one praying alone or as imam (the default), and the
 *  follower behind an imam. */
export const MODES = ['solo', 'follower']

/** The steps of one prayer, in order: each an approved step (k) with what the template sets on it. r: the rakah (0
 *  before the prayer, null after it); pos: its position name; sit: 1 or 2 on the first or the last tashahhud's steps.
 *  mode: 'solo' (alone or as imam) or 'follower' (add-on 0072-add17 §1). */
export function sequence(p, mode = 'solo') {
  const n = p.rakat
  const F = mode === 'follower'
  const seq = [{ k: 'intro', r: 0, pos: 'pos.intro', do: 'do.intro' }]
  const add = (o) => seq.push(o)
  const tw = n > 2 // the last tashahhud with tawarruk (the «rakat» step's table, Ibn Baz 12188)
  for (let r = 1; r <= n; r++) {
    // the rakah's start: the opening takbir and supplication, or the standing up to it
    if (r === 1) {
      add({ k: 'takbir', r, pos: 'pos.takbir' })
      add({ k: 'istiftah', r, pos: 'pos.istiftah' })
    } else if (r === 2) add({ k: 'rakah2', r, pos: 'pos.stand', title: 'title.stand2', do: 'do.stand2', add: ADD.hands, notes: [{ at: 'do', ...NOTE.istiraha }] })
    else if (r === 3) add({ k: 'rakah2', r, pos: 'pos.stand', title: 'title.stand3', do: 'do.stand3', cue: 'cue.stand3', ev: EV.stand3, pose: 'stand3', add: ADD.hands, hide: HIDE.later })
    else add({ k: 'rakah2', r, pos: 'pos.stand', title: 'title.stand4', do: 'do.stand4', add: ADD.hands, hide: HIDE.later, notes: [{ at: 'do', ...NOTE.istiraha }] })
    // the recitation: the first two rakahs al-Fatiha then a surah; after them al-Fatiha alone, quietly. What is said
    // before al-Fatiha: the seeking of refuge and the basmala in the first rakah, the basmala alone after it (م2), each
    // as 10166 words it (م5); the seeking of refuge after the first rakah is a disputed matter (24833)
    const how = p.recite[r - 1]
    const aloud = how === 'jahr' && r <= 2
    const hide = [...HIDE.before, ...(r > 1 ? HIDE.open : []), ...(how === 'sirr' || (aloud && F) ? HIDE.amin : [])]
    const said = r === 1 ? { before: [BB.sayTaawwudh], add: ADD.before } : { before: [BB.sayBasmala], do: 'do.fatiha2', boxes: ['taawwudh'] }
    const quiet = { at: 'cue', ...NOTE.sirr }
    if (aloud && F) {
      // §1: the follower in a rakah recited aloud: al-Fatiha, then listening to the imam, and no surah (11314)
      add({ k: 'fatiha', r, pos: 'pos.fatiha', cue: 'cue.f.jahr', ev: [BB.fMust, BB.fListen], hide, ...said,
        notes: [{ at: 'cue', ...NOTE.follower }, quiet, { at: 'cue', ...NOTE.basmala }], boxes: [...(said.boxes ?? []), 'fread'] })
    } else if (aloud) {
      add({ k: 'fatiha', r, pos: 'pos.fatiha', cue: r === 1 ? 'cue.jahr' : 'cue.jahr2', ev: [p.ev.jahr, ...EV.jahr], hide, ...said,
        notes: [{ at: 'cue', ...NOTE.basmala }, { at: 'cue', ...NOTE.women }] })
      add({ k: 'surah', r, pos: 'pos.surah', tag: 'tag.jahr' })
    } else if (r <= 2) {
      add({ k: 'fatiha', r, pos: 'pos.fatiha', cue: 'cue.sirr', ev: [p.ev.sirr], hide, ...said, notes: [quiet] })
      add({ k: 'surah', r, pos: 'pos.surah', tag: 'tag.sirr', notes: [quiet] })
    } else {
      // the rakahs after the second: al-Fatiha alone, quietly (Talal's line), and the evidence of a prayer recited
      // aloud in its first two (17622, ش5)
      add({ k: 'fatiha', r, pos: 'pos.fatiha', cue: 'cue.alone', ev: [...EV.alone, ...(p.ev.sirr ? [p.ev.sirr] : [BB.jahrAll])], hide, ...said,
        notes: [quiet, { at: 'cue', ...NOTE.alone }] })
    }
    add({ k: 'ruku', r, pos: 'pos.ruku' })
    // §1: the follower says «ربنا ولك الحمد» alone on rising (10166), the formula from his sentence, its meaning in
    // English from HadeethEnc's translation of 3095
    if (F) add({ k: 'itidal', r, pos: 'pos.itidal', cue: 'cue.f.itidal', ev: [BB.fRise], say: { kind: 'binbaz', texts: [BB.rabbana], en: HE.rabbanaEn } })
    else add({ k: 'itidal', r, pos: 'pos.itidal' })
    add({ k: 'sujud1', r, pos: 'pos.sujud1', title: 'title.sujud1' })
    add({ k: 'jalsa', r, pos: 'pos.jalsa' })
    // the second prostration in the first one's own approved words (its seven parts), not «كالأولى»
    add({ k: 'sujud2', r, pos: 'pos.sujud2', do: '@sujud1' })
    // after the second prostration: the first tashahhud, the last, or the resting sit before an even rakah; the takbir
    // on rising to a tashahhud in the line itself (ج3)
    if (r === n) {
      const sit = { r, pos: 'pos.last', sit: 2, rulings: RULINGS.tashLast, ev: EV.rise, boxes: ['tawarruk'] }
      if (tw) add({ k: 'tawarruk', ...sit, title: 'title.last', cue: `cue.tawarruk${n}`, do: 'do.tawarruk', add: ADD.tawarruk, hide: HIDE.tawarrukHow, khilaf: KHILAF.tawarruk, notes: [{ at: 'do', ...NOTE.tawarruk }] })
      else add({ k: 'tashahhud', ...sit, title: 'title.last', cue: 'cue.last2', khilaf: KHILAF.last2 })
      const pose = tw ? { pose: 'tawarruk', feet: 'tawarruk' } : {}
      add({ k: 'ibrahimiyya', r, pos: 'pos.ibrahimiyya', sit: 2, ...pose })
      add({ k: 'qabla_salam', r, pos: 'pos.qabla', sit: 2, ...pose })
      // م5: what is said is the formula, «السلام عليكم ورحمة الله», from 10166's sentence; the approved step's two
      // sentences (10166, 19967) under the evidence, and its English meaning (10945) as it was
      add({ k: 'taslim', r, pos: 'pos.taslim', sit: 2, ...(tw ? { pose: 'taslim_tw', feet: 'tawarruk' } : {}),
        say: { kind: 'binbaz', texts: [BB.salam], en: 'taslim/say/en#10945' }, add: ['taslim/say/texts/0#10166', 'taslim/say/texts/1#19967'] })
    } else if (r === 2) add({ k: 'tashahhud', r, pos: 'pos.tash1', sit: 1, title: 'title.tash1', cue: 'cue.tash1', ev: [...EV.tash1, ...EV.rise], rulings: RULINGS.tash1, khilaf: KHILAF.first, notes: [{ at: 'say', ...NOTE.salat1 }], boxes: ['salat1'] })
    else add({ k: 'istiraha', r, pos: 'pos.istiraha', ...(r === 3 ? { do: 'do.istiraha4' } : {}) })
  }
  add({ k: 'after', r: null, pos: 'pos.after' })
  // the approved lesson's appendix, as it is: for the new Muslim, the seated prayer, mistakes, the rakah table, the
  // minimum; the table with 17622 among its evidence and «موضع التورّك» as Ibn Baz's words (ش4, ش5)
  for (const k of ['nofatiha', 'seated', 'mistakes']) add({ k, r: null, pos: 'pos.more' })
  add({ k: 'rakat', r: null, pos: 'pos.more', add: [BB.jahrAll], khilaf: [], boxes: ['tawarruk'] })
  add({ k: 'minimum', r: null, pos: 'pos.more' })
  return seq
}

/** The set's own texts as one step of the set (TEXTS_KEY), not shown: Ibn Baz's slices and HadeethEnc positions
 *  (prayers-texts.json) and the boxes, their topics as words. */
export function textsStep(texts, words = WORDS) {
  const boxes = Object.fromEntries(Object.entries(BOXES).map(([k, b]) => [k, { kind: b.kind, topic: words[b.topic], texts: b.texts }]))
  return { key: TEXTS_KEY, hidden: true, title: { ar: 'نصوص الدفعة', en: 'The batch’s texts' }, do: { ar: '—', en: '—' }, how: [], bb: texts.bb, hadith: texts.hadith, boxes }
}

/** The definitions of a batch, in the shape our server will send them (add-on 0072-add13 §2; prayers.js reads it).
 *  `data`: the approved lesson's data, for the prayers' names and recitation words from its rakah table; `texts`: the
 *  set's own texts (prayers-texts.json). */
export function definitions(data, texts) {
  const table = data.steps.find((s) => s.key === 'rakat').table
  return {
    v: 1,
    batch: 1,
    words: WORDS,
    steps: [textsStep(texts)],
    prayers: PRAYERS.map((p) => ({
      id: p.id,
      batch: 1,
      // the prayer-times screen's name for its time today (web/src/daily/prayer.ts DayTimes)
      time: p.time,
      rakat: p.rakat,
      // the rakah table's own words: its name, and how it is recited
      name: table[p.row].p,
      recite: table[p.row].r,
      rakahs: p.recite,
      seq: sequence(p, 'solo'),
      follower: sequence(p, 'follower'),
    })),
  }
}

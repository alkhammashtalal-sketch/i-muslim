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
}
// What a step shows of the approved texts beyond its own, or leaves out of them (the independent review of batch 1,
// relay/w1/0072-prayers/batch-1/review-batch-1.md, items 3, 4, 6, 7, 12 and 15): approved nodes only, by their refs.
const ADD = {
  // the right hand on the right placing at each standing (65442 «يضع الرجل اليد اليمنى على ذراعه اليسرى»)
  hands: ['istiftah/how/1#65442'],
  // the hands in the last tashahhud with tawarruk: the tashahhud step's own 10941 and 65459
  tawarruk: ['tashahhud/how/2#10941', 'tashahhud/how/3#65459'],
}
const HIDE = {
  // «ثم يصنع في الأخرى مثل ذلك» is said of the second rakah
  later: ['rakah2/how/2#10902'],
  // 10906 «يستفتح الصلاة بالتكبير، والقراءة» is the prayer's opening: the first rakah only
  open: ['fatiha/how/1#10906'],
  // 65446 «قال: "آمين" ورفع بها صوته» is not shown under a quiet recitation
  amin: ['fatiha/how/3#65446'],
}
// The disputed-matter boxes of a tashahhud: «تحريك السبابة» (9609: at the supplication of the last tashahhud) on the
// last tashahhud, not the first; «موضع التورّك» (12188) on every last tashahhud, the two-rakah one included
const KHILAF = { first: [], last2: ['tashahhud', 'tawarruk'], tawarruk: ['tawarruk', 'tashahhud'] }
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
  'cue.tash1': { ar: 'بعد السجدة الثانية من الركعة الثانية لا تقم، بل اجلس للتشهد الأول', en: 'After the second prostration of the second rakah, do not stand up: sit for the first tashahhud.' },
  'cue.stand3': { ar: 'قم إلى الثالثة مكبّرًا رافعًا يديك', en: 'Stand up for the third rakah saying the takbir and raising your hands.' },
  'cue.alone': { ar: 'الفاتحة وحدها، سرًّا', en: 'Al-Fatiha alone, quietly.' },
  'cue.jahr': { ar: 'الفاتحة ثم ما تيسر من القرآن، جهرًا', en: 'Al-Fatiha, then what is easy of the Quran, aloud.' },
  'cue.sirr': { ar: 'الفاتحة ثم ما تيسر من القرآن، سرًّا', en: 'Al-Fatiha, then what is easy of the Quran, quietly.' },
  'cue.last2': { ar: 'بعد السجدة الثانية من الركعة الثانية لا تقم، بل اجلس للتشهد الأخير', en: 'After the second prostration of the second rakah, do not stand up: sit for the last tashahhud.' },
  'cue.tawarruk3': { ar: 'بعد السجدة الثانية من الركعة الثالثة لا تقم، بل اجلس للتشهد الأخير متورّكًا', en: 'After the second prostration of the third rakah, do not stand up: sit for the last tashahhud in tawarruk.' },
  'cue.tawarruk4': { ar: 'بعد السجدة الثانية من الركعة الرابعة لا تقم، بل اجلس للتشهد الأخير متورّكًا', en: 'After the second prostration of the fourth rakah, do not stand up: sit for the last tashahhud in tawarruk.' },
  // a small tag on the surah step: how it is recited in this rakah
  'tag.jahr': { ar: 'جهرًا', en: 'Aloud' },
  'tag.sirr': { ar: 'سرًّا', en: 'Quietly' },
  // «what to do» where the approved line was written for Fajr's example only
  'do.stand2': { ar: 'تقوم للركعة الثانية مكبّرًا، وتضع يدك اليمنى على يدك اليسرى.', en: 'You stand up for the second rakah saying the takbir, and place your right hand on your left hand.' },
  'do.stand3': { ar: 'تقوم إلى الثالثة مكبّرًا رافعًا يديك، ثم تضع يدك اليمنى على يدك اليسرى.', en: 'You stand up for the third rakah saying the takbir and raising your hands, then place your right hand on your left hand.' },
  'do.stand4': { ar: 'تقوم إلى الرابعة مكبّرًا، وتضع يدك اليمنى على يدك اليسرى.', en: 'You stand up for the fourth rakah saying the takbir, and place your right hand on your left hand.' },
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

/** The steps of one prayer, in order: each an approved step (k) with what the template sets on it. r: the rakah (0
 *  before the prayer, null after it); pos: its position name; sit: 1 or 2 on the first or the last tashahhud's steps. */
export function sequence(p) {
  const n = p.rakat
  const seq = [{ k: 'intro', r: 0, pos: 'pos.intro' }]
  const add = (o) => seq.push(o)
  const tw = n > 2 // the last tashahhud with tawarruk (the «rakat» step's table, Ibn Baz 12188)
  for (let r = 1; r <= n; r++) {
    // the rakah's start: the opening takbir and supplication, or the standing up to it
    if (r === 1) {
      add({ k: 'takbir', r, pos: 'pos.takbir' })
      add({ k: 'istiftah', r, pos: 'pos.istiftah' })
    } else if (r === 2) add({ k: 'rakah2', r, pos: 'pos.stand', title: 'title.stand2', do: 'do.stand2', add: ADD.hands })
    else if (r === 3) add({ k: 'rakah2', r, pos: 'pos.stand', title: 'title.stand3', do: 'do.stand3', cue: 'cue.stand3', ev: EV.stand3, pose: 'stand3', add: ADD.hands, hide: HIDE.later })
    else add({ k: 'rakah2', r, pos: 'pos.stand', title: 'title.stand4', do: 'do.stand4', add: ADD.hands, hide: HIDE.later })
    // the recitation: the first two rakahs al-Fatiha then a surah, aloud or quietly; after them al-Fatiha alone, quietly
    const how = p.recite[r - 1]
    const hide = [...(r > 1 ? HIDE.open : []), ...(how === 'sirr' ? HIDE.amin : [])]
    const fh = hide.length ? { hide } : {}
    if (r <= 2) {
      add({ k: 'fatiha', r, pos: 'pos.fatiha', cue: `cue.${how}`, ev: [p.ev[how]], ...fh })
      add({ k: 'surah', r, pos: 'pos.surah', tag: `tag.${how}` })
    } else add({ k: 'fatiha', r, pos: 'pos.fatiha', cue: 'cue.alone', ev: [...EV.alone, ...(p.ev.sirr ? [p.ev.sirr] : [])], ...fh })
    add({ k: 'ruku', r, pos: 'pos.ruku' })
    add({ k: 'itidal', r, pos: 'pos.itidal' })
    add({ k: 'sujud1', r, pos: 'pos.sujud1', title: 'title.sujud1' })
    add({ k: 'jalsa', r, pos: 'pos.jalsa' })
    // the second prostration in the first one's own approved words (its seven parts), not «كالأولى»
    add({ k: 'sujud2', r, pos: 'pos.sujud2', do: '@sujud1' })
    // after the second prostration: the first tashahhud, the last, or the resting sit before an even rakah
    if (r === n) {
      const sit = { r, pos: 'pos.last', sit: 2, rulings: RULINGS.tashLast }
      if (tw) add({ k: 'tawarruk', ...sit, title: 'title.last', cue: `cue.tawarruk${n}`, do: 'do.tawarruk', add: ADD.tawarruk, khilaf: KHILAF.tawarruk })
      else add({ k: 'tashahhud', ...sit, title: 'title.last', cue: 'cue.last2', khilaf: KHILAF.last2 })
      const pose = tw ? { pose: 'tawarruk', feet: 'tawarruk' } : {}
      add({ k: 'ibrahimiyya', r, pos: 'pos.ibrahimiyya', sit: 2, ...pose })
      add({ k: 'qabla_salam', r, pos: 'pos.qabla', sit: 2, ...pose })
      add({ k: 'taslim', r, pos: 'pos.taslim', sit: 2, ...(tw ? { pose: 'taslim_tw', feet: 'tawarruk' } : {}) })
    } else if (r === 2) add({ k: 'tashahhud', r, pos: 'pos.tash1', sit: 1, title: 'title.tash1', cue: 'cue.tash1', ev: EV.tash1, rulings: RULINGS.tash1, khilaf: KHILAF.first })
    else add({ k: 'istiraha', r, pos: 'pos.istiraha', ...(r === 3 ? { do: 'do.istiraha4' } : {}) })
  }
  add({ k: 'after', r: null, pos: 'pos.after' })
  // the approved lesson's appendix, as it is: for the new Muslim, the seated prayer, mistakes, the rakah table, the minimum
  for (const k of ['nofatiha', 'seated', 'mistakes', 'rakat', 'minimum']) add({ k, r: null, pos: 'pos.more' })
  return seq
}

/** The definitions of a batch, in the shape our server will send them (add-on 0072-add13 §2; prayers.js reads it).
 *  `data`: the approved lesson's data, for the prayers' names and recitation words from its rakah table. */
export function definitions(data) {
  const table = data.steps.find((s) => s.key === 'rakat').table
  return {
    v: 1,
    batch: 1,
    words: WORDS,
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
      seq: sequence(p),
    })),
  }
}

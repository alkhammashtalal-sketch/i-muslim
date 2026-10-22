// The labels of the daily card «اسم من أسماء الله» (reply 0071 §4.2; add-ons 0071-add1, 0071-add2 §2, 0071-add5 §2).
// Arabic and English reviewed; the other eight are machine translations of the interface (CLAUDE.md §4). No sacred
// text here: the name, the ayat, the hadiths and the tafsir come from the data, and the readings from the server.
// The readings are Arabic in every interface (add-on 0071-add5 §2, reply 0068 question (a)): outside Arabic the card
// says so in the reader's language (`inArabic`) and gives `madeHeading` in it; the three reading labels stay with the
// Arabic text, in Arabic.
import type { Lang } from '../../../../../shared/api'

export type NameDayStrings = {
  title: string
  /** For screen readers: the card and its name. */
  cardLabel: string
  evidence: string
  meaningAyah: string
  duaQuran: string
  /** A praise from the Quran (the names file's «ثناء قرآني»: al-Fatiha 2). */
  praiseQuran: string
  duaSunnah: string
  /** The fold under the first paragraphs of a tafsir: {name} is the tafsir's name. */
  moreTafsir: string
  madeHeading: string
  /** Above the Arabic readings outside Arabic: they are in Arabic only, never machine-translated. */
  inArabic: string
  meaningLabel: string
  easyLabel: string
  deepLabel: string
}

const ar: NameDayStrings = {
  title: 'اسم من أسماء الله',
  cardLabel: 'اسم من أسماء الله: {name}',
  evidence: 'الشاهد',
  meaningAyah: 'شاهد للمعنى من القرآن، لا للفظ الاسم',
  duaQuran: 'دعاء من القرآن',
  praiseQuran: 'ثناء من القرآن',
  duaSunnah: 'دعاء أو ذكر من السنة',
  moreTafsir: 'بقية {name} للآية',
  madeHeading: 'شرح تعليمي أعدّه التطبيق، وليس نقلًا عن العلماء',
  inArabic: 'الشرح متاح بالعربية',
  meaningLabel: 'المعنى:',
  easyLabel: 'قراءة ميسرة:',
  deepLabel: 'قراءة أعمق:',
}

const en: NameDayStrings = {
  title: 'A Name of Allah',
  cardLabel: 'A Name of Allah: {name}',
  evidence: 'Evidence',
  meaningAyah: 'Quranic evidence for the meaning, not for the wording of the name',
  duaQuran: 'A supplication from the Quran',
  praiseQuran: 'Praise from the Quran',
  duaSunnah: 'A supplication or remembrance from the Sunnah',
  moreTafsir: 'The rest of {name} on this ayah',
  madeHeading: 'An educational explanation prepared by the app, not quoted from the scholars',
  inArabic: 'The explanation is available in Arabic',
  meaningLabel: 'Meaning:',
  easyLabel: 'A simple reading:',
  deepLabel: 'A deeper reading:',
}

const ur: NameDayStrings = {
  title: 'اللہ کے ناموں میں سے ایک نام',
  cardLabel: 'اللہ کے ناموں میں سے ایک نام: {name}',
  evidence: 'دلیل',
  meaningAyah: 'معنی کی قرآنی دلیل، نام کے لفظ کی نہیں',
  duaQuran: 'قرآن سے ایک دعا',
  praiseQuran: 'قرآن سے حمد و ثنا',
  duaSunnah: 'سنت سے ایک دعا یا ذکر',
  moreTafsir: 'اس آیت پر {name} کا باقی حصہ',
  madeHeading: 'ایپ کی تیار کردہ تعلیمی وضاحت، علما سے منقول نہیں',
  inArabic: 'وضاحت عربی میں دستیاب ہے',
  meaningLabel: 'معنی:',
  easyLabel: 'آسان مطالعہ:',
  deepLabel: 'گہرا مطالعہ:',
}

const id: NameDayStrings = {
  title: 'Salah Satu Nama Allah',
  cardLabel: 'Salah satu nama Allah: {name}',
  evidence: 'Dalil',
  meaningAyah: 'Dalil Al-Qur’an untuk maknanya, bukan untuk lafaz nama',
  duaQuran: 'Doa dari Al-Qur’an',
  praiseQuran: 'Pujian dari Al-Qur’an',
  duaSunnah: 'Doa atau zikir dari Sunnah',
  moreTafsir: 'Sisa {name} untuk ayat ini',
  madeHeading: 'Penjelasan edukatif yang disusun aplikasi, bukan kutipan dari para ulama',
  inArabic: 'Penjelasan tersedia dalam bahasa Arab',
  meaningLabel: 'Makna:',
  easyLabel: 'Bacaan ringkas:',
  deepLabel: 'Bacaan lebih dalam:',
}

const ms: NameDayStrings = {
  title: 'Satu Nama daripada Nama-nama Allah',
  cardLabel: 'Satu nama daripada nama-nama Allah: {name}',
  evidence: 'Dalil',
  meaningAyah: 'Dalil al-Quran bagi maknanya, bukan bagi lafaz nama',
  duaQuran: 'Doa daripada al-Quran',
  praiseQuran: 'Pujian daripada al-Quran',
  duaSunnah: 'Doa atau zikir daripada Sunnah',
  moreTafsir: 'Baki {name} bagi ayat ini',
  madeHeading: 'Penjelasan pendidikan yang disediakan oleh aplikasi, bukan petikan daripada ulama',
  inArabic: 'Penerangan tersedia dalam bahasa Arab',
  meaningLabel: 'Makna:',
  easyLabel: 'Bacaan mudah:',
  deepLabel: 'Bacaan lebih mendalam:',
}

const tr: NameDayStrings = {
  title: 'Allah’ın İsimlerinden Biri',
  cardLabel: 'Allah’ın isimlerinden biri: {name}',
  evidence: 'Delil',
  meaningAyah: 'İsmin lafzına değil, anlamına Kur’an’dan delil',
  duaQuran: 'Kur’an’dan bir dua',
  praiseQuran: 'Kur’an’dan bir övgü',
  duaSunnah: 'Sünnetten bir dua veya zikir',
  moreTafsir: 'Bu ayet hakkında {name} kitabının devamı',
  madeHeading: 'Uygulamanın hazırladığı öğretici açıklama, âlimlerden alıntı değildir',
  inArabic: 'Açıklama Arapça olarak mevcuttur',
  meaningLabel: 'Anlamı:',
  easyLabel: 'Kolay okuma:',
  deepLabel: 'Derin okuma:',
}

const fr: NameDayStrings = {
  title: 'Un des noms d’Allah',
  cardLabel: 'Un des noms d’Allah : {name}',
  evidence: 'Preuve',
  meaningAyah: 'Preuve coranique du sens, non de la forme du nom',
  duaQuran: 'Une invocation du Coran',
  praiseQuran: 'Une louange du Coran',
  duaSunnah: 'Une invocation ou un rappel de la Sunna',
  moreTafsir: 'La suite de {name} sur ce verset',
  madeHeading: 'Une explication pédagogique préparée par l’application, non citée des savants',
  inArabic: 'L’explication est disponible en arabe',
  meaningLabel: 'Sens :',
  easyLabel: 'Lecture simple :',
  deepLabel: 'Lecture approfondie :',
}

const es: NameDayStrings = {
  title: 'Uno de los nombres de Allah',
  cardLabel: 'Uno de los nombres de Allah: {name}',
  evidence: 'Evidencia',
  meaningAyah: 'Evidencia coránica del significado, no de la forma del nombre',
  duaQuran: 'Una súplica del Corán',
  praiseQuran: 'Una alabanza del Corán',
  duaSunnah: 'Una súplica o recuerdo de la Sunna',
  moreTafsir: 'El resto de {name} sobre esta aleya',
  madeHeading: 'Una explicación educativa preparada por la aplicación, no citada de los sabios',
  inArabic: 'La explicación está disponible en árabe',
  meaningLabel: 'Significado:',
  easyLabel: 'Lectura sencilla:',
  deepLabel: 'Lectura más profunda:',
}

const bn: NameDayStrings = {
  title: 'আল্লাহর নামসমূহের একটি নাম',
  cardLabel: 'আল্লাহর নামসমূহের একটি নাম: {name}',
  evidence: 'দলিল',
  meaningAyah: 'অর্থের কুরআনি দলিল, নামের শব্দের নয়',
  duaQuran: 'কুরআন থেকে একটি দোয়া',
  praiseQuran: 'কুরআন থেকে একটি প্রশংসা',
  duaSunnah: 'সুন্নাহ থেকে একটি দোয়া বা জিকির',
  moreTafsir: 'এই আয়াতে {name}-এর বাকি অংশ',
  madeHeading: 'অ্যাপের প্রস্তুত করা শিক্ষামূলক ব্যাখ্যা, আলেমদের থেকে উদ্ধৃত নয়',
  inArabic: 'ব্যাখ্যাটি আরবিতে পাওয়া যায়',
  meaningLabel: 'অর্থ:',
  easyLabel: 'সহজ পাঠ:',
  deepLabel: 'গভীর পাঠ:',
}

const hi: NameDayStrings = {
  title: 'अल्लाह के नामों में से एक नाम',
  cardLabel: 'अल्लाह के नामों में से एक नाम: {name}',
  evidence: 'दलील',
  meaningAyah: 'अर्थ की क़ुरआनी दलील, नाम के शब्द की नहीं',
  duaQuran: 'क़ुरआन से एक दुआ',
  praiseQuran: 'क़ुरआन से एक स्तुति',
  duaSunnah: 'सुन्नत से एक दुआ या ज़िक्र',
  moreTafsir: 'इस आयत पर {name} का शेष भाग',
  madeHeading: 'ऐप द्वारा तैयार की गई शैक्षिक व्याख्या, विद्वानों से उद्धृत नहीं',
  inArabic: 'व्याख्या अरबी में उपलब्ध है',
  meaningLabel: 'अर्थ:',
  easyLabel: 'सरल पाठ:',
  deepLabel: 'गहरा पाठ:',
}

export const NAME_DAY: Record<Lang, NameDayStrings> = { ar, en, ur, id, ms, tr, fr, es, bn, hi }

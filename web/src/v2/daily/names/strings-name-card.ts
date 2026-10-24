// The labels of the luxury name card (add-on 0072-add11 §1). Arabic and English reviewed; the other eight are machine
// translations of the interface (CLAUDE.md §4). No sacred text and no scholar's words here: the name, the ayat, the
// hadiths, the tafsir and the quotes come from the data, the readings from the server. The section titles are Talal's
// words in Arabic. Outside Arabic (add-on 0071-add5 §2.3) the quotes and the readings stay Arabic under a line in the
// reader's language that says so.
import type { Lang } from '../../../../../shared/api'

export type NameCardStrings = {
  /** The header's first words on the name of the Riyadh day. */
  today: string
  /** On another name's page: no date. */
  other: string
  /** «{n} من {count}» */
  ofCount: string
  /** For screen readers: the card and its name. */
  cardLabel: string
  evidence: string
  meaning: string
  salaf: string
  heart: string
  dua: string
  tafsir: string
  /** The home card: the rest of the sections in place. */
  readMore: string
  /** Above an Arabic quote outside Arabic. */
  quoteInArabic: string
  share: string
  /** For screen readers: «شارك» with the name. */
  shareLabel: string
  /** The footer's navigation, for screen readers. */
  navLabel: string
}

const ar: NameCardStrings = {
  today: 'اسم الله لليوم',
  other: 'اسم من أسماء الله',
  ofCount: '{n} من {count}',
  cardLabel: 'اسم الله لليوم: {name}',
  evidence: 'الدليل',
  meaning: 'معنى الاسم عند العلماء',
  salaf: 'من أقوال السلف في الاسم',
  heart: 'أثره في قلبك',
  dua: 'ادعُ الله به',
  tafsir: 'تفسير الآية',
  readMore: 'أكمل القراءة',
  quoteInArabic: 'النص بالعربية كما في مصدره',
  share: 'شارك',
  shareLabel: 'شارك «{name}»',
  navLabel: 'أسماء الله',
}

const en: NameCardStrings = {
  today: 'Allah’s Name for today',
  other: 'A Name of Allah',
  ofCount: '{n} of {count}',
  cardLabel: 'Allah’s Name for today: {name}',
  evidence: 'The evidence',
  meaning: 'The meaning of the name according to the scholars',
  salaf: 'From the sayings of the Salaf on the name',
  heart: 'Its effect on your heart',
  dua: 'Call upon Allah by it',
  tafsir: 'Tafsir of the ayah',
  readMore: 'Continue reading',
  quoteInArabic: 'The text is in Arabic, as in its source',
  share: 'Share',
  shareLabel: 'Share «{name}»',
  navLabel: 'The Names of Allah',
}

const ur: NameCardStrings = {
  today: 'آج کا اسمِ الٰہی',
  other: 'اللہ کے ناموں میں سے ایک نام',
  ofCount: '{count} میں سے {n}',
  cardLabel: 'آج کا اسمِ الٰہی: {name}',
  evidence: 'دلیل',
  meaning: 'علما کے نزدیک اس نام کا معنی',
  salaf: 'اس نام کے بارے میں سلف کے اقوال سے',
  heart: 'آپ کے دل پر اس کا اثر',
  dua: 'اس نام سے اللہ کو پکاریں',
  tafsir: 'آیت کی تفسیر',
  readMore: 'مزید پڑھیں',
  quoteInArabic: 'متن عربی میں ہے، جیسا کہ اس کے ماخذ میں',
  share: 'شیئر کریں',
  shareLabel: '«{name}» شیئر کریں',
  navLabel: 'اللہ کے نام',
}

const id: NameCardStrings = {
  today: 'Nama Allah hari ini',
  other: 'Salah Satu Nama Allah',
  ofCount: '{n} dari {count}',
  cardLabel: 'Nama Allah hari ini: {name}',
  evidence: 'Dalil',
  meaning: 'Makna nama ini menurut para ulama',
  salaf: 'Dari perkataan Salaf tentang nama ini',
  heart: 'Pengaruhnya di hatimu',
  dua: 'Berdoalah kepada Allah dengannya',
  tafsir: 'Tafsir ayat',
  readMore: 'Lanjutkan membaca',
  quoteInArabic: 'Teks ini berbahasa Arab, sebagaimana dalam sumbernya',
  share: 'Bagikan',
  shareLabel: 'Bagikan «{name}»',
  navLabel: 'Nama-nama Allah',
}

const ms: NameCardStrings = {
  today: 'Nama Allah hari ini',
  other: 'Salah Satu Nama Allah',
  ofCount: '{n} daripada {count}',
  cardLabel: 'Nama Allah hari ini: {name}',
  evidence: 'Dalil',
  meaning: 'Makna nama ini menurut para ulama',
  salaf: 'Daripada kata-kata Salaf tentang nama ini',
  heart: 'Kesannya dalam hatimu',
  dua: 'Berdoalah kepada Allah dengannya',
  tafsir: 'Tafsir ayat',
  readMore: 'Teruskan membaca',
  quoteInArabic: 'Teks ini dalam bahasa Arab, seperti dalam sumbernya',
  share: 'Kongsi',
  shareLabel: 'Kongsi «{name}»',
  navLabel: 'Nama-nama Allah',
}

const tr: NameCardStrings = {
  today: 'Günün Esmâsı',
  other: 'Allah’ın İsimlerinden Biri',
  ofCount: '{count} isimden {n}.',
  cardLabel: 'Günün Esmâsı: {name}',
  evidence: 'Delil',
  meaning: 'Âlimlere göre ismin anlamı',
  salaf: 'Selefin bu isimle ilgili sözlerinden',
  heart: 'Kalbindeki etkisi',
  dua: 'Allah’a bu isimle dua et',
  tafsir: 'Ayetin tefsiri',
  readMore: 'Okumaya devam et',
  quoteInArabic: 'Metin, kaynağındaki gibi Arapçadır',
  share: 'Paylaş',
  shareLabel: '«{name}» paylaş',
  navLabel: 'Allah’ın isimleri',
}

const fr: NameCardStrings = {
  today: 'Le Nom d’Allah du jour',
  other: 'Un des noms d’Allah',
  ofCount: '{n} sur {count}',
  cardLabel: 'Le Nom d’Allah du jour : {name}',
  evidence: 'La preuve',
  meaning: 'Le sens du nom selon les savants',
  salaf: 'Des paroles des Salaf sur ce nom',
  heart: 'Son effet sur ton cœur',
  dua: 'Invoque Allah par ce nom',
  tafsir: 'Tafsir du verset',
  readMore: 'Continuer la lecture',
  quoteInArabic: 'Le texte est en arabe, tel que dans sa source',
  share: 'Partager',
  shareLabel: 'Partager «{name}»',
  navLabel: 'Les noms d’Allah',
}

const es: NameCardStrings = {
  today: 'El Nombre de Allah de hoy',
  other: 'Uno de los nombres de Allah',
  ofCount: '{n} de {count}',
  cardLabel: 'El Nombre de Allah de hoy: {name}',
  evidence: 'La prueba',
  meaning: 'El significado del nombre según los sabios',
  salaf: 'De los dichos de los Salaf sobre el nombre',
  heart: 'Su efecto en tu corazón',
  dua: 'Invoca a Allah con él',
  tafsir: 'Tafsir de la aleya',
  readMore: 'Seguir leyendo',
  quoteInArabic: 'El texto está en árabe, como en su fuente',
  share: 'Compartir',
  shareLabel: 'Compartir «{name}»',
  navLabel: 'Los nombres de Allah',
}

const bn: NameCardStrings = {
  today: 'আজকের আল্লাহর নাম',
  other: 'আল্লাহর নামসমূহের একটি',
  ofCount: '{count}টির মধ্যে {n}',
  cardLabel: 'আজকের আল্লাহর নাম: {name}',
  evidence: 'দলিল',
  meaning: 'আলেমদের মতে নামটির অর্থ',
  salaf: 'এই নাম সম্পর্কে সালাফের উক্তি থেকে',
  heart: 'আপনার হৃদয়ে এর প্রভাব',
  dua: 'এই নামে আল্লাহকে ডাকুন',
  tafsir: 'আয়াতের তাফসির',
  readMore: 'আরও পড়ুন',
  quoteInArabic: 'পাঠটি আরবিতে, যেমন তার উৎসে আছে',
  share: 'শেয়ার করুন',
  shareLabel: '«{name}» শেয়ার করুন',
  navLabel: 'আল্লাহর নামসমূহ',
}

const hi: NameCardStrings = {
  today: 'आज का अल्लाह का नाम',
  other: 'अल्लाह के नामों में से एक नाम',
  ofCount: '{count} में से {n}',
  cardLabel: 'आज का अल्लाह का नाम: {name}',
  evidence: 'दलील',
  meaning: 'उलमा के अनुसार नाम का अर्थ',
  salaf: 'इस नाम के बारे में सलफ़ के कथनों से',
  heart: 'आपके दिल पर इसका असर',
  dua: 'इस नाम से अल्लाह को पुकारें',
  tafsir: 'आयत की तफ़सीर',
  readMore: 'आगे पढ़ें',
  quoteInArabic: 'पाठ अरबी में है, जैसा उसके स्रोत में है',
  share: 'शेयर करें',
  shareLabel: '«{name}» शेयर करें',
  navLabel: 'अल्लाह के नाम',
}

export const NAME_CARD: Record<Lang, NameCardStrings> = { ar, en, ur, id, ms, tr, fr, es, bn, hi }

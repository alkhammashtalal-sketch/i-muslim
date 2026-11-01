// Interface strings of the reader's font and sizes (add-on 0072-add60 §5; reader-display.ts) and of the download of a
// range of suras (§6; Downloads.tsx). Arabic and English reviewed; the other eight are machine translations of the
// interface (CLAUDE.md §4). The fonts keep their names (Amiri is the family's own name), written in each script.
import type { Lang } from '../../../../shared/api'

export type DisplayStrings = {
  title: string
  open: string
  fontHeading: string
  amiri: string
  amiriQuran: string
  quranSize: string
  translationSize: string
  tafsirSize: string
  smaller: string
  larger: string
  sizeNow: string
  digitsHeading: string
  digitsArab: string
  digitsLatn: string
  preview: string
  reset: string
  rangeTitle: string
  rangeFrom: string
  rangeTo: string
  rangeSize: string
  rangeAsk: string
  rangeConfirm: string
  rangeDone: string
  rangeProgress: string
}

const ar: DisplayStrings = {
  title: 'الخط والحجم',
  open: 'الخط والحجم',
  fontHeading: 'خط المصحف',
  amiri: 'أميري',
  amiriQuran: 'أميري قرآن',
  quranSize: 'حجم النص القرآني',
  translationSize: 'حجم الترجمة',
  tafsirSize: 'حجم التفسير',
  smaller: 'تصغير {what}',
  larger: 'تكبير {what}',
  sizeNow: '{what}: {pct}',
  digitsHeading: 'أرقام الآيات',
  digitsArab: 'هندية',
  digitsLatn: 'عربية',
  preview: 'معاينة',
  reset: 'إعادة الضبط',
  rangeTitle: 'تنزيل من سورة إلى سورة',
  rangeFrom: 'من سورة',
  rangeTo: 'إلى سورة',
  rangeSize: 'عدد السور: {n}، نحو {size}',
  rangeAsk: 'تنزيل هذه السور',
  rangeConfirm: 'تُنزَّل السور من {from} إلى {to} بصوت {name}، نحو {size}، سورةً بعد سورة. ويمكنك إيقافه واستئنافه.',
  rangeDone: 'سور هذا النطاق كلها منزّلة ✓',
  rangeProgress: 'نُزّل من سور النطاق {n} من {m}',
}

const en: DisplayStrings = {
  title: 'Font and size',
  open: 'Font and size',
  fontHeading: 'Mushaf font',
  amiri: 'Amiri',
  amiriQuran: 'Amiri Quran',
  quranSize: 'Quran text size',
  translationSize: 'Translation size',
  tafsirSize: 'Tafsir size',
  smaller: 'Smaller {what}',
  larger: 'Larger {what}',
  sizeNow: '{what}: {pct}',
  digitsHeading: 'Ayah numbers',
  digitsArab: 'Eastern Arabic',
  digitsLatn: 'Western',
  preview: 'Preview',
  reset: 'Reset',
  rangeTitle: 'Download from one sura to another',
  rangeFrom: 'From sura',
  rangeTo: 'To sura',
  rangeSize: '{n} suras, about {size}',
  rangeAsk: 'Download these suras',
  rangeConfirm: 'This downloads the suras from {from} to {to} in the voice of {name}, about {size}, one sura after another. You can pause and resume it.',
  rangeDone: 'Every sura of this range is downloaded ✓',
  rangeProgress: '{n} of {m} suras of the range downloaded',
}

const ur: DisplayStrings = {
  title: 'فونٹ اور سائز',
  open: 'فونٹ اور سائز',
  fontHeading: 'مصحف کا فونٹ',
  amiri: 'امیری',
  amiriQuran: 'امیری قرآن',
  quranSize: 'قرآنی متن کا سائز',
  translationSize: 'ترجمے کا سائز',
  tafsirSize: 'تفسیر کا سائز',
  smaller: '{what} چھوٹا کریں',
  larger: '{what} بڑا کریں',
  sizeNow: '{what}: {pct}',
  digitsHeading: 'آیات کے نمبر',
  digitsArab: 'مشرقی عربی',
  digitsLatn: 'مغربی',
  preview: 'پیش نظارہ',
  reset: 'پہلے جیسا کریں',
  rangeTitle: 'ایک سورت سے دوسری سورت تک ڈاؤن لوڈ',
  rangeFrom: 'سورت سے',
  rangeTo: 'سورت تک',
  rangeSize: '{n} سورتیں، تقریباً {size}',
  rangeAsk: 'یہ سورتیں ڈاؤن لوڈ کریں',
  rangeConfirm: 'سورت {from} سے {to} تک {name} کی آواز میں ڈاؤن لوڈ ہوں گی، تقریباً {size}، ایک کے بعد ایک۔ آپ اسے روک کر دوبارہ شروع کر سکتے ہیں۔',
  rangeDone: 'اس حصے کی سب سورتیں ڈاؤن لوڈ ہو چکی ہیں ✓',
  rangeProgress: 'حصے کی {m} میں سے {n} سورتیں ڈاؤن لوڈ ہوئیں',
}

const id: DisplayStrings = {
  title: 'Huruf dan ukuran',
  open: 'Huruf dan ukuran',
  fontHeading: 'Huruf mushaf',
  amiri: 'Amiri',
  amiriQuran: 'Amiri Quran',
  quranSize: 'Ukuran teks Al-Qur’an',
  translationSize: 'Ukuran terjemahan',
  tafsirSize: 'Ukuran tafsir',
  smaller: 'Perkecil {what}',
  larger: 'Perbesar {what}',
  sizeNow: '{what}: {pct}',
  digitsHeading: 'Nomor ayat',
  digitsArab: 'Arab Timur',
  digitsLatn: 'Barat',
  preview: 'Pratinjau',
  reset: 'Atur ulang',
  rangeTitle: 'Unduh dari satu surah ke surah lain',
  rangeFrom: 'Dari surah',
  rangeTo: 'Sampai surah',
  rangeSize: '{n} surah, sekitar {size}',
  rangeAsk: 'Unduh surah-surah ini',
  rangeConfirm: 'Surah {from} sampai {to} dengan suara {name} akan diunduh, sekitar {size}, satu per satu. Anda bisa menjeda dan melanjutkannya.',
  rangeDone: 'Semua surah dalam rentang ini sudah diunduh ✓',
  rangeProgress: '{n} dari {m} surah rentang ini sudah diunduh',
}

const ms: DisplayStrings = {
  title: 'Fon dan saiz',
  open: 'Fon dan saiz',
  fontHeading: 'Fon mushaf',
  amiri: 'Amiri',
  amiriQuran: 'Amiri Quran',
  quranSize: 'Saiz teks al-Quran',
  translationSize: 'Saiz terjemahan',
  tafsirSize: 'Saiz tafsir',
  smaller: 'Kecilkan {what}',
  larger: 'Besarkan {what}',
  sizeNow: '{what}: {pct}',
  digitsHeading: 'Nombor ayat',
  digitsArab: 'Arab Timur',
  digitsLatn: 'Barat',
  preview: 'Pratonton',
  reset: 'Tetapkan semula',
  rangeTitle: 'Muat turun dari satu surah ke surah lain',
  rangeFrom: 'Dari surah',
  rangeTo: 'Hingga surah',
  rangeSize: '{n} surah, kira-kira {size}',
  rangeAsk: 'Muat turun surah-surah ini',
  rangeConfirm: 'Surah {from} hingga {to} dengan suara {name} akan dimuat turun, kira-kira {size}, satu demi satu. Anda boleh menjeda dan menyambungnya.',
  rangeDone: 'Semua surah dalam julat ini sudah dimuat turun ✓',
  rangeProgress: '{n} daripada {m} surah julat ini sudah dimuat turun',
}

const tr: DisplayStrings = {
  title: 'Yazı tipi ve boyut',
  open: 'Yazı tipi ve boyut',
  fontHeading: 'Mushaf yazı tipi',
  amiri: 'Amiri',
  amiriQuran: 'Amiri Quran',
  quranSize: 'Kur’an metni boyutu',
  translationSize: 'Meal boyutu',
  tafsirSize: 'Tefsir boyutu',
  smaller: '{what}: küçült',
  larger: '{what}: büyüt',
  sizeNow: '{what}: {pct}',
  digitsHeading: 'Ayet numaraları',
  digitsArab: 'Doğu Arap',
  digitsLatn: 'Batı',
  preview: 'Önizleme',
  reset: 'Sıfırla',
  rangeTitle: 'Bir sureden diğerine indir',
  rangeFrom: 'Bu sureden',
  rangeTo: 'Bu sureye',
  rangeSize: '{n} sure, yaklaşık {size}',
  rangeAsk: 'Bu sureleri indir',
  rangeConfirm: '{from} ile {to} arasındaki sureler {name} sesiyle, yaklaşık {size}, sırayla indirilir. Duraklatıp devam ettirebilirsiniz.',
  rangeDone: 'Bu aralıktaki surelerin hepsi indirildi ✓',
  rangeProgress: 'Aralıktaki {m} sureden {n} tanesi indirildi',
}

const fr: DisplayStrings = {
  title: 'Police et taille',
  open: 'Police et taille',
  fontHeading: 'Police du Mushaf',
  amiri: 'Amiri',
  amiriQuran: 'Amiri Quran',
  quranSize: 'Taille du texte coranique',
  translationSize: 'Taille de la traduction',
  tafsirSize: 'Taille du tafsir',
  smaller: 'Réduire : {what}',
  larger: 'Agrandir : {what}',
  sizeNow: '{what} : {pct}',
  digitsHeading: 'Numéros des versets',
  digitsArab: 'Arabes orientaux',
  digitsLatn: 'Occidentaux',
  preview: 'Aperçu',
  reset: 'Réinitialiser',
  rangeTitle: 'Télécharger d’une sourate à une autre',
  rangeFrom: 'De la sourate',
  rangeTo: 'À la sourate',
  rangeSize: '{n} sourates, environ {size}',
  rangeAsk: 'Télécharger ces sourates',
  rangeConfirm: 'Les sourates {from} à {to} avec la voix de {name} sont téléchargées, environ {size}, l’une après l’autre. Vous pouvez mettre en pause et reprendre.',
  rangeDone: 'Toutes les sourates de cette plage sont téléchargées ✓',
  rangeProgress: '{n} sourates sur {m} de la plage téléchargées',
}

const es: DisplayStrings = {
  title: 'Fuente y tamaño',
  open: 'Fuente y tamaño',
  fontHeading: 'Fuente del Mushaf',
  amiri: 'Amiri',
  amiriQuran: 'Amiri Quran',
  quranSize: 'Tamaño del texto coránico',
  translationSize: 'Tamaño de la traducción',
  tafsirSize: 'Tamaño del tafsir',
  smaller: 'Reducir: {what}',
  larger: 'Ampliar: {what}',
  sizeNow: '{what}: {pct}',
  digitsHeading: 'Números de las aleyas',
  digitsArab: 'Arábigos orientales',
  digitsLatn: 'Occidentales',
  preview: 'Vista previa',
  reset: 'Restablecer',
  rangeTitle: 'Descargar de una sura a otra',
  rangeFrom: 'Desde la sura',
  rangeTo: 'Hasta la sura',
  rangeSize: '{n} suras, unos {size}',
  rangeAsk: 'Descargar estas suras',
  rangeConfirm: 'Se descargan las suras {from} a {to} en la voz de {name}, unos {size}, una tras otra. Puedes pausar y reanudar.',
  rangeDone: 'Todas las suras de este intervalo están descargadas ✓',
  rangeProgress: '{n} de {m} suras del intervalo descargadas',
}

const bn: DisplayStrings = {
  title: 'ফন্ট ও আকার',
  open: 'ফন্ট ও আকার',
  fontHeading: 'মুসহাফের ফন্ট',
  amiri: 'আমিরি',
  amiriQuran: 'আমিরি কুরআন',
  quranSize: 'কুরআনের লেখার আকার',
  translationSize: 'অনুবাদের আকার',
  tafsirSize: 'তাফসিরের আকার',
  smaller: '{what} ছোট করুন',
  larger: '{what} বড় করুন',
  sizeNow: '{what}: {pct}',
  digitsHeading: 'আয়াতের নম্বর',
  digitsArab: 'পূর্ব আরবি',
  digitsLatn: 'পশ্চিমা',
  preview: 'প্রিভিউ',
  reset: 'আগের মতো করুন',
  rangeTitle: 'এক সূরা থেকে আরেক সূরা পর্যন্ত ডাউনলোড',
  rangeFrom: 'যে সূরা থেকে',
  rangeTo: 'যে সূরা পর্যন্ত',
  rangeSize: '{n}টি সূরা, প্রায় {size}',
  rangeAsk: 'এই সূরাগুলো ডাউনলোড করুন',
  rangeConfirm: 'সূরা {from} থেকে {to} পর্যন্ত {name}-এর কণ্ঠে ডাউনলোড হবে, প্রায় {size}, একটির পর একটি। আপনি থামিয়ে আবার চালু করতে পারেন।',
  rangeDone: 'এই অংশের সব সূরা ডাউনলোড হয়েছে ✓',
  rangeProgress: 'অংশের {m}টির মধ্যে {n}টি সূরা ডাউনলোড হয়েছে',
}

const hi: DisplayStrings = {
  title: 'फ़ॉन्ट और आकार',
  open: 'फ़ॉन्ट और आकार',
  fontHeading: 'मुसहफ़ का फ़ॉन्ट',
  amiri: 'अमीरी',
  amiriQuran: 'अमीरी क़ुरआन',
  quranSize: 'क़ुरआन के पाठ का आकार',
  translationSize: 'अनुवाद का आकार',
  tafsirSize: 'तफ़सीर का आकार',
  smaller: '{what} छोटा करें',
  larger: '{what} बड़ा करें',
  sizeNow: '{what}: {pct}',
  digitsHeading: 'आयतों के अंक',
  digitsArab: 'पूर्वी अरबी',
  digitsLatn: 'पश्चिमी',
  preview: 'पूर्वावलोकन',
  reset: 'पहले जैसा करें',
  rangeTitle: 'एक सूरह से दूसरी सूरह तक डाउनलोड',
  rangeFrom: 'इस सूरह से',
  rangeTo: 'इस सूरह तक',
  rangeSize: '{n} सूरह, लगभग {size}',
  rangeAsk: 'ये सूरह डाउनलोड करें',
  rangeConfirm: 'सूरह {from} से {to} तक {name} की आवाज़ में डाउनलोड होंगी, लगभग {size}, एक के बाद एक। आप इसे रोककर फिर शुरू कर सकते हैं।',
  rangeDone: 'इस हिस्से की सभी सूरह डाउनलोड हो चुकी हैं ✓',
  rangeProgress: 'हिस्से की {m} में से {n} सूरह डाउनलोड हुईं',
}

export const DISPLAY: Record<Lang, DisplayStrings> = { ar, en, ur, id, ms, tr, fr, es, bn, hi }

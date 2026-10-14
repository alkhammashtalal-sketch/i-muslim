import type { Lang } from '../../../../shared/api'

// «تُتلى الآن» (reply 0047 §4, board RepeatAfter): the player's own words. Arabic as on the board, English reviewed,
// the eight others machine-translated like the rest of the interface.
export type PlayerStrings = {
  /** The sura page's button that opens the player. */
  open: string
  nowPlaying: string
  title: string
  minimise: string
  changeReciter: string
  pickReciter: string
  ayahOf: string
  litWith: string
  tapForTafsir: string
  prevAyah: string
  nextAyah: string
  repeat: string
  repeatOff: string
  /** «{n}» times; Arabic counts in its own forms (timesText). */
  times: { one: string; other: string }
  repeatEndless: string
  speed: string
  speedNormal: string
  speedValue: string
  after: string
  afterNext: string
  afterStop: string
  sleep: string
  sleepOff: string
  sleepMin: string
  tapToChange: string
}

const ar: PlayerStrings = {
  open: 'خيارات التلاوة',
  nowPlaying: 'تُتلى الآن',
  title: 'التلاوة',
  minimise: 'تصغير',
  changeReciter: 'تغيير القارئ',
  pickReciter: 'اختر القارئ',
  ayahOf: 'الآية {n} من {m}',
  litWith: 'تضيء الآية مع التلاوة',
  tapForTafsir: 'اضغط الآية لتقرأ تفسيرها',
  prevAyah: 'الآية السابقة',
  nextAyah: 'الآية التالية',
  repeat: 'تكرار الآية',
  repeatOff: 'بلا تكرار',
  times: { one: 'مرة واحدة', other: '{n} مرات' },
  repeatEndless: 'بلا توقف',
  speed: 'السرعة',
  speedNormal: 'عادية',
  speedValue: '{n}×',
  after: 'بعد السورة',
  afterNext: 'التالية تلقائيًا',
  afterStop: 'توقف',
  sleep: 'مؤقت الإيقاف',
  sleepOff: 'بلا مؤقت',
  sleepMin: '{n} دقيقة',
  tapToChange: 'اضغط للتغيير',
}

const en: PlayerStrings = {
  open: 'Recitation options',
  nowPlaying: 'Now reciting',
  title: 'Recitation',
  minimise: 'Minimise',
  changeReciter: 'Change reciter',
  pickReciter: 'Choose the reciter',
  ayahOf: 'Verse {n} of {m}',
  litWith: 'The verse lights up with the recitation',
  tapForTafsir: 'Tap the verse to read its tafsir',
  prevAyah: 'Previous verse',
  nextAyah: 'Next verse',
  repeat: 'Repeat the verse',
  repeatOff: 'No repeat',
  times: { one: 'Once', other: '{n} times' },
  repeatEndless: 'Without end',
  speed: 'Speed',
  speedNormal: 'Normal',
  speedValue: '{n}×',
  after: 'After the sura',
  afterNext: 'Next sura automatically',
  afterStop: 'Stop',
  sleep: 'Sleep timer',
  sleepOff: 'Off',
  sleepMin: '{n} min',
  tapToChange: 'Tap to change',
}

const ur: PlayerStrings = {
  open: 'تلاوت کے اختیارات',
  nowPlaying: 'اب تلاوت ہو رہی ہے',
  title: 'تلاوت',
  minimise: 'چھوٹا کریں',
  changeReciter: 'قاری بدلیں',
  pickReciter: 'قاری منتخب کریں',
  ayahOf: 'آیت {n} از {m}',
  litWith: 'تلاوت کے ساتھ آیت روشن ہوتی ہے',
  tapForTafsir: 'تفسیر پڑھنے کے لیے آیت پر دبائیں',
  prevAyah: 'پچھلی آیت',
  nextAyah: 'اگلی آیت',
  repeat: 'آیت دہرائیں',
  repeatOff: 'بغیر تکرار',
  times: { one: 'ایک بار', other: '{n} بار' },
  repeatEndless: 'مسلسل',
  speed: 'رفتار',
  speedNormal: 'عام',
  speedValue: '{n}×',
  after: 'سورت کے بعد',
  afterNext: 'اگلی سورت خودکار',
  afterStop: 'رک جائیں',
  sleep: 'بند ہونے کا ٹائمر',
  sleepOff: 'ٹائمر نہیں',
  sleepMin: '{n} منٹ',
  tapToChange: 'بدلنے کے لیے دبائیں',
}

const id: PlayerStrings = {
  open: 'Pilihan tilawah',
  nowPlaying: 'Sedang dibacakan',
  title: 'Tilawah',
  minimise: 'Kecilkan',
  changeReciter: 'Ganti qari',
  pickReciter: 'Pilih qari',
  ayahOf: 'Ayat {n} dari {m}',
  litWith: 'Ayat menyala mengikuti tilawah',
  tapForTafsir: 'Ketuk ayat untuk membaca tafsirnya',
  prevAyah: 'Ayat sebelumnya',
  nextAyah: 'Ayat berikutnya',
  repeat: 'Ulangi ayat',
  repeatOff: 'Tanpa pengulangan',
  times: { one: '{n} kali', other: '{n} kali' },
  repeatEndless: 'Tanpa henti',
  speed: 'Kecepatan',
  speedNormal: 'Normal',
  speedValue: '{n}×',
  after: 'Setelah surah',
  afterNext: 'Surah berikutnya otomatis',
  afterStop: 'Berhenti',
  sleep: 'Pengatur waktu tidur',
  sleepOff: 'Mati',
  sleepMin: '{n} menit',
  tapToChange: 'Ketuk untuk mengubah',
}

const ms: PlayerStrings = {
  open: 'Pilihan bacaan',
  nowPlaying: 'Sedang dibacakan',
  title: 'Bacaan',
  minimise: 'Kecilkan',
  changeReciter: 'Tukar qari',
  pickReciter: 'Pilih qari',
  ayahOf: 'Ayat {n} daripada {m}',
  litWith: 'Ayat bercahaya mengikut bacaan',
  tapForTafsir: 'Ketik ayat untuk membaca tafsirnya',
  prevAyah: 'Ayat sebelumnya',
  nextAyah: 'Ayat seterusnya',
  repeat: 'Ulang ayat',
  repeatOff: 'Tanpa ulangan',
  times: { one: '{n} kali', other: '{n} kali' },
  repeatEndless: 'Tanpa henti',
  speed: 'Kelajuan',
  speedNormal: 'Biasa',
  speedValue: '{n}×',
  after: 'Selepas surah',
  afterNext: 'Surah seterusnya secara automatik',
  afterStop: 'Berhenti',
  sleep: 'Pemasa tidur',
  sleepOff: 'Tiada',
  sleepMin: '{n} minit',
  tapToChange: 'Ketik untuk menukar',
}

const tr: PlayerStrings = {
  open: 'Tilavet seçenekleri',
  nowPlaying: 'Şimdi okunuyor',
  title: 'Tilavet',
  minimise: 'Küçült',
  changeReciter: 'Kâriyi değiştir',
  pickReciter: 'Kâri seçin',
  ayahOf: 'Ayet {n} / {m}',
  litWith: 'Ayet tilavetle birlikte parlar',
  tapForTafsir: 'Tefsirini okumak için ayete dokunun',
  prevAyah: 'Önceki ayet',
  nextAyah: 'Sonraki ayet',
  repeat: 'Ayeti tekrarla',
  repeatOff: 'Tekrar yok',
  times: { one: '{n} kez', other: '{n} kez' },
  repeatEndless: 'Durmadan',
  speed: 'Hız',
  speedNormal: 'Normal',
  speedValue: '{n}×',
  after: 'Sureden sonra',
  afterNext: 'Sonraki sure otomatik',
  afterStop: 'Dur',
  sleep: 'Uyku zamanlayıcısı',
  sleepOff: 'Kapalı',
  sleepMin: '{n} dk',
  tapToChange: 'Değiştirmek için dokunun',
}

const fr: PlayerStrings = {
  open: 'Options de la récitation',
  nowPlaying: 'Récitation en cours',
  title: 'Récitation',
  minimise: 'Réduire',
  changeReciter: 'Changer de récitant',
  pickReciter: 'Choisir le récitant',
  ayahOf: 'Verset {n} sur {m}',
  litWith: 'Le verset s’éclaire avec la récitation',
  tapForTafsir: 'Touchez le verset pour lire son tafsir',
  prevAyah: 'Verset précédent',
  nextAyah: 'Verset suivant',
  repeat: 'Répéter le verset',
  repeatOff: 'Sans répétition',
  times: { one: '{n} fois', other: '{n} fois' },
  repeatEndless: 'Sans fin',
  speed: 'Vitesse',
  speedNormal: 'Normale',
  speedValue: '{n}×',
  after: 'Après la sourate',
  afterNext: 'Sourate suivante automatiquement',
  afterStop: 'Arrêter',
  sleep: 'Minuterie',
  sleepOff: 'Désactivée',
  sleepMin: '{n} min',
  tapToChange: 'Touchez pour changer',
}

const es: PlayerStrings = {
  open: 'Opciones de la recitación',
  nowPlaying: 'Recitando ahora',
  title: 'Recitación',
  minimise: 'Minimizar',
  changeReciter: 'Cambiar recitador',
  pickReciter: 'Elegir recitador',
  ayahOf: 'Aleya {n} de {m}',
  litWith: 'La aleya se ilumina con la recitación',
  tapForTafsir: 'Toque la aleya para leer su tafsir',
  prevAyah: 'Aleya anterior',
  nextAyah: 'Aleya siguiente',
  repeat: 'Repetir la aleya',
  repeatOff: 'Sin repetir',
  times: { one: '{n} vez', other: '{n} veces' },
  repeatEndless: 'Sin fin',
  speed: 'Velocidad',
  speedNormal: 'Normal',
  speedValue: '{n}×',
  after: 'Después de la sura',
  afterNext: 'Siguiente sura automáticamente',
  afterStop: 'Detener',
  sleep: 'Temporizador',
  sleepOff: 'Desactivado',
  sleepMin: '{n} min',
  tapToChange: 'Toque para cambiar',
}

const bn: PlayerStrings = {
  open: 'তিলাওয়াতের বিকল্প',
  nowPlaying: 'এখন তিলাওয়াত হচ্ছে',
  title: 'তিলাওয়াত',
  minimise: 'ছোট করুন',
  changeReciter: 'ক্বারী বদলান',
  pickReciter: 'ক্বারী বাছুন',
  ayahOf: 'আয়াত {n} / {m}',
  litWith: 'তিলাওয়াতের সাথে আয়াত আলোকিত হয়',
  tapForTafsir: 'তাফসীর পড়তে আয়াতে চাপুন',
  prevAyah: 'আগের আয়াত',
  nextAyah: 'পরের আয়াত',
  repeat: 'আয়াত পুনরাবৃত্তি',
  repeatOff: 'পুনরাবৃত্তি নেই',
  times: { one: '{n} বার', other: '{n} বার' },
  repeatEndless: 'অবিরাম',
  speed: 'গতি',
  speedNormal: 'স্বাভাবিক',
  speedValue: '{n}×',
  after: 'সূরার পরে',
  afterNext: 'পরের সূরা স্বয়ংক্রিয়ভাবে',
  afterStop: 'থামুন',
  sleep: 'স্লিপ টাইমার',
  sleepOff: 'বন্ধ',
  sleepMin: '{n} মিনিট',
  tapToChange: 'বদলাতে চাপুন',
}

const hi: PlayerStrings = {
  open: 'तिलावत के विकल्प',
  nowPlaying: 'अभी तिलावत हो रही है',
  title: 'तिलावत',
  minimise: 'छोटा करें',
  changeReciter: 'क़ारी बदलें',
  pickReciter: 'क़ारी चुनें',
  ayahOf: 'आयत {n} / {m}',
  litWith: 'तिलावत के साथ आयत रोशन होती है',
  tapForTafsir: 'तफ़सीर पढ़ने के लिए आयत पर टैप करें',
  prevAyah: 'पिछली आयत',
  nextAyah: 'अगली आयत',
  repeat: 'आयत दोहराएँ',
  repeatOff: 'दोहराव नहीं',
  times: { one: '{n} बार', other: '{n} बार' },
  repeatEndless: 'लगातार',
  speed: 'गति',
  speedNormal: 'सामान्य',
  speedValue: '{n}×',
  after: 'सूरह के बाद',
  afterNext: 'अगली सूरह अपने आप',
  afterStop: 'रुकें',
  sleep: 'स्लीप टाइमर',
  sleepOff: 'बंद',
  sleepMin: '{n} मिनट',
  tapToChange: 'बदलने के लिए टैप करें',
}

export const PLAYER: Record<Lang, PlayerStrings> = { ar, en, ur, id, ms, tr, fr, es, bn, hi }

/** «{n} times» in the language, Arabic in its own forms: مرة واحدة، مرتان، ٣–١٠ مرات، ١١ مرة فأكثر. */
export function timesText(n: number, lang: Lang, num: (n: number) => string): string {
  const s = PLAYER[lang]
  if (lang === 'ar') {
    if (n === 1) return s.times.one
    if (n === 2) return 'مرتان'
    return n <= 10 ? s.times.other.replace('{n}', num(n)) : `${num(n)} مرة`
  }
  return (n === 1 ? s.times.one : s.times.other).replace('{n}', num(n))
}

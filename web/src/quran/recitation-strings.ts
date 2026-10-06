import type { Lang } from '../../../shared/api'

// Strings of the recitation player (command 17). Kept apart from i18n/*.ts while those files have another window's
// uncommitted work; Arabic and English are reviewed, the eight others machine-translated like the rest of the UI.
// No Latin letters inside the Arabic line (§8): the site's name is spelled in Arabic there, and the link stays the same.
type S = {
  listen: string
  listenAyah: string
  pause: string
  resume: string
  stop: string
  offline: string
  failed: string
  credit: string
  /** Only while SHOW_RECITER_NAME is on (rule 14). */
  creditNamed: string
  nowAyah: string
}

export const RECITATION: Record<Lang, S> = {
  ar: { listen: 'استمع', listenAyah: 'استمع للآية', pause: 'إيقاف مؤقت', resume: 'متابعة', stop: 'إيقاف', offline: 'التلاوة تحتاج اتصالًا', failed: 'تعذّر تشغيل التلاوة الآن', credit: 'التلاوة: موقع إم بي ثري قرآن', creditNamed: 'التلاوة بصوت {name} — موقع إم بي ثري قرآن', nowAyah: 'الآية {n}' },
  en: { listen: 'Listen', listenAyah: 'Listen to the verse', pause: 'Pause', resume: 'Resume', stop: 'Stop', offline: 'Recitation needs a connection', failed: 'The recitation could not play now', credit: 'Recitation: mp3quran.net', creditNamed: 'Recited by {name} — mp3quran.net', nowAyah: 'Verse {n}' },
  ur: { listen: 'سنیں', listenAyah: 'آیت سنیں', pause: 'روکیں', resume: 'جاری رکھیں', stop: 'بند کریں', offline: 'تلاوت کے لیے انٹرنیٹ درکار ہے', failed: 'ابھی تلاوت نہیں چل سکی', credit: 'تلاوت: mp3quran.net', creditNamed: 'تلاوت: {name} — mp3quran.net', nowAyah: 'آیت {n}' },
  id: { listen: 'Dengarkan', listenAyah: 'Dengarkan ayat', pause: 'Jeda', resume: 'Lanjutkan', stop: 'Berhenti', offline: 'Tilawah memerlukan koneksi', failed: 'Tilawah belum dapat diputar', credit: 'Tilawah: mp3quran.net', creditNamed: 'Tilawah oleh {name} — mp3quran.net', nowAyah: 'Ayat {n}' },
  ms: { listen: 'Dengar', listenAyah: 'Dengar ayat', pause: 'Jeda', resume: 'Sambung', stop: 'Henti', offline: 'Bacaan memerlukan sambungan', failed: 'Bacaan tidak dapat dimainkan sekarang', credit: 'Bacaan: mp3quran.net', creditNamed: 'Bacaan oleh {name} — mp3quran.net', nowAyah: 'Ayat {n}' },
  tr: { listen: 'Dinle', listenAyah: 'Ayeti dinle', pause: 'Duraklat', resume: 'Devam et', stop: 'Durdur', offline: 'Tilavet için bağlantı gerekir', failed: 'Tilavet şu anda çalınamadı', credit: 'Tilavet: mp3quran.net', creditNamed: 'Tilavet: {name} — mp3quran.net', nowAyah: '{n}. ayet' },
  fr: { listen: 'Écouter', listenAyah: 'Écouter le verset', pause: 'Pause', resume: 'Reprendre', stop: 'Arrêter', offline: 'La récitation nécessite une connexion', failed: 'La récitation n’a pas pu être lue', credit: 'Récitation : mp3quran.net', creditNamed: 'Récitation par {name} — mp3quran.net', nowAyah: 'Verset {n}' },
  es: { listen: 'Escuchar', listenAyah: 'Escuchar la aleya', pause: 'Pausa', resume: 'Continuar', stop: 'Detener', offline: 'La recitación necesita conexión', failed: 'La recitación no se pudo reproducir', credit: 'Recitación: mp3quran.net', creditNamed: 'Recitación de {name} — mp3quran.net', nowAyah: 'Aleya {n}' },
  bn: { listen: 'শুনুন', listenAyah: 'আয়াতটি শুনুন', pause: 'বিরতি', resume: 'চালিয়ে যান', stop: 'থামান', offline: 'তিলাওয়াতের জন্য সংযোগ প্রয়োজন', failed: 'এখন তিলাওয়াত চালানো যায়নি', credit: 'তিলাওয়াত: mp3quran.net', creditNamed: 'তিলাওয়াত: {name} — mp3quran.net', nowAyah: 'আয়াত {n}' },
  hi: { listen: 'सुनें', listenAyah: 'आयत सुनें', pause: 'रोकें', resume: 'जारी रखें', stop: 'बंद करें', offline: 'तिलावत के लिए इंटरनेट चाहिए', failed: 'अभी तिलावत नहीं चल सकी', credit: 'तिलावत: mp3quran.net', creditNamed: 'तिलावत: {name} — mp3quran.net', nowAyah: 'आयत {n}' },
}

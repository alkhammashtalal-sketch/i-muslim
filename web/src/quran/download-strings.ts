// Interface strings of the downloaded recitations (reply 0056 أ). Arabic and English reviewed; the other eight are
// machine translations of the interface (CLAUDE.md §4). {size} is a size in the reader's language («١٫٢ غيغابايت»).
import type { Lang } from '../../../shared/api'

export type DownloadStrings = {
  download: string
  downloadSize: string
  downloading: string
  downloaded: string
  failed: string
  mushafTitle: string
  mushafSize: string
  mushafConfirm: string
  cellular: string
  start: string
  cancel: string
  progress: string
  pause: string
  resume: string
  paused: string
  mushafDone: string
  title: string
  empty: string
  total: string
  suras: string
  remove: string
  removeSura: string
  removeReciter: string
  removeReciterConfirm: string
  playsHere: string
}

const ar: DownloadStrings = {
  download: 'تنزيل',
  downloadSize: 'تنزيل ({size})',
  downloading: 'جارٍ التنزيل {pct}',
  downloaded: 'منزّلة ✓',
  failed: 'تعذّر التنزيل. حاول مرة أخرى حين يعود الاتصال.',
  mushafTitle: 'تنزيل المصحف كاملًا بصوته',
  mushafSize: '١١٤ سورة، نحو {size}',
  mushafConfirm: 'يُنزَّل المصحف كاملًا بصوت {name}، نحو {size}، سورةً بعد سورة. ويمكنك إيقافه واستئنافه.',
  cellular: 'أنت على بيانات الجوال، والتنزيل نحو {size}.',
  start: 'ابدأ التنزيل',
  cancel: 'إلغاء',
  progress: 'نُزّلت {n} من {m} سورة',
  pause: 'إيقاف مؤقت',
  resume: 'استئناف',
  paused: 'التنزيل موقوف',
  mushafDone: 'المصحف كاملًا منزّل بصوته ✓',
  title: 'التنزيلات',
  empty: 'لا تلاوة منزّلة بعد. نزّل سورة من «استمع» في صفحتها، أو المصحف كاملًا من صفحة القرّاء.',
  total: 'المجموع: {size}',
  suras: '{n} سورة · {size}',
  remove: 'حذف',
  removeSura: 'حذف {name}',
  removeReciter: 'حذف تلاواته كلها',
  removeReciterConfirm: 'تُحذف من جهازك {n} سورة بصوت {name} ({size}).',
  playsHere: 'تُسمع من جهازك بلا اتصال',
}

const en: DownloadStrings = {
  download: 'Download',
  downloadSize: 'Download ({size})',
  downloading: 'Downloading {pct}',
  downloaded: 'Downloaded ✓',
  failed: 'The download could not finish. Try again when the connection is back.',
  mushafTitle: 'Download the whole Quran in his voice',
  mushafSize: '114 suras, about {size}',
  mushafConfirm: 'The whole Quran in the voice of {name} is downloaded, about {size}, one sura after another. You can pause and resume it.',
  cellular: 'You are on mobile data, and the download is about {size}.',
  start: 'Start the download',
  cancel: 'Cancel',
  progress: '{n} of {m} suras downloaded',
  pause: 'Pause',
  resume: 'Resume',
  paused: 'Download paused',
  mushafDone: 'The whole Quran is downloaded in his voice ✓',
  title: 'Downloads',
  empty: 'No recitation downloaded yet. Download a sura from "Listen" on its page, or the whole Quran from the reciters page.',
  total: 'Total: {size}',
  suras: '{n} suras · {size}',
  remove: 'Delete',
  removeSura: 'Delete {name}',
  removeReciter: 'Delete all his recitations',
  removeReciterConfirm: '{n} suras in the voice of {name} are deleted from your device ({size}).',
  playsHere: 'Plays from your device, offline',
}

const ur: DownloadStrings = {
  download: 'ڈاؤن لوڈ',
  downloadSize: 'ڈاؤن لوڈ ({size})',
  downloading: 'ڈاؤن لوڈ ہو رہا ہے {pct}',
  downloaded: 'ڈاؤن لوڈ شدہ ✓',
  failed: 'ڈاؤن لوڈ مکمل نہ ہو سکا۔ کنکشن واپس آنے پر دوبارہ کوشش کریں۔',
  mushafTitle: 'ان کی آواز میں پورا قرآن ڈاؤن لوڈ کریں',
  mushafSize: '114 سورتیں، تقریباً {size}',
  mushafConfirm: '{name} کی آواز میں پورا قرآن ڈاؤن لوڈ ہوگا، تقریباً {size}، ایک سورت کے بعد دوسری۔ آپ اسے روک کر دوبارہ شروع کر سکتے ہیں۔',
  cellular: 'آپ موبائل ڈیٹا پر ہیں، اور ڈاؤن لوڈ تقریباً {size} ہے۔',
  start: 'ڈاؤن لوڈ شروع کریں',
  cancel: 'منسوخ',
  progress: '{m} میں سے {n} سورتیں ڈاؤن لوڈ ہو گئیں',
  pause: 'روکیں',
  resume: 'جاری رکھیں',
  paused: 'ڈاؤن لوڈ رکا ہوا ہے',
  mushafDone: 'ان کی آواز میں پورا قرآن ڈاؤن لوڈ ہو گیا ✓',
  title: 'ڈاؤن لوڈز',
  empty: 'ابھی کوئی تلاوت ڈاؤن لوڈ نہیں ہوئی۔ سورت کے صفحے پر «سنیں» سے سورت، یا قاریوں کے صفحے سے پورا قرآن ڈاؤن لوڈ کریں۔',
  total: 'کل: {size}',
  suras: '{n} سورتیں · {size}',
  remove: 'حذف',
  removeSura: '{name} حذف کریں',
  removeReciter: 'ان کی تمام تلاوتیں حذف کریں',
  removeReciterConfirm: '{name} کی آواز میں {n} سورتیں آپ کے آلے سے حذف ہوں گی ({size})۔',
  playsHere: 'آپ کے آلے سے بغیر کنکشن سنی جاتی ہے',
}

const id: DownloadStrings = {
  download: 'Unduh',
  downloadSize: 'Unduh ({size})',
  downloading: 'Mengunduh {pct}',
  downloaded: 'Terunduh ✓',
  failed: 'Unduhan tidak selesai. Coba lagi saat koneksi kembali.',
  mushafTitle: 'Unduh seluruh Al-Qur’an dengan suaranya',
  mushafSize: '114 surah, sekitar {size}',
  mushafConfirm: 'Seluruh Al-Qur’an dengan suara {name} akan diunduh, sekitar {size}, surah demi surah. Anda dapat menjeda dan melanjutkannya.',
  cellular: 'Anda memakai data seluler, dan unduhannya sekitar {size}.',
  start: 'Mulai unduh',
  cancel: 'Batal',
  progress: '{n} dari {m} surah terunduh',
  pause: 'Jeda',
  resume: 'Lanjutkan',
  paused: 'Unduhan dijeda',
  mushafDone: 'Seluruh Al-Qur’an terunduh dengan suaranya ✓',
  title: 'Unduhan',
  empty: 'Belum ada bacaan yang diunduh. Unduh surah dari «Dengarkan» di halamannya, atau seluruh Al-Qur’an dari halaman qari.',
  total: 'Total: {size}',
  suras: '{n} surah · {size}',
  remove: 'Hapus',
  removeSura: 'Hapus {name}',
  removeReciter: 'Hapus semua bacaannya',
  removeReciterConfirm: '{n} surah dengan suara {name} dihapus dari perangkat Anda ({size}).',
  playsHere: 'Diputar dari perangkat Anda tanpa koneksi',
}

const ms: DownloadStrings = {
  download: 'Muat turun',
  downloadSize: 'Muat turun ({size})',
  downloading: 'Memuat turun {pct}',
  downloaded: 'Dimuat turun ✓',
  failed: 'Muat turun tidak selesai. Cuba lagi apabila sambungan kembali.',
  mushafTitle: 'Muat turun seluruh al-Quran dengan suaranya',
  mushafSize: '114 surah, kira-kira {size}',
  mushafConfirm: 'Seluruh al-Quran dengan suara {name} dimuat turun, kira-kira {size}, surah demi surah. Anda boleh menjeda dan menyambungnya.',
  cellular: 'Anda menggunakan data mudah alih, dan muat turun kira-kira {size}.',
  start: 'Mula muat turun',
  cancel: 'Batal',
  progress: '{n} daripada {m} surah dimuat turun',
  pause: 'Jeda',
  resume: 'Sambung',
  paused: 'Muat turun dijeda',
  mushafDone: 'Seluruh al-Quran dimuat turun dengan suaranya ✓',
  title: 'Muat turun',
  empty: 'Belum ada bacaan dimuat turun. Muat turun surah daripada «Dengar» di halamannya, atau seluruh al-Quran daripada halaman qari.',
  total: 'Jumlah: {size}',
  suras: '{n} surah · {size}',
  remove: 'Padam',
  removeSura: 'Padam {name}',
  removeReciter: 'Padam semua bacaannya',
  removeReciterConfirm: '{n} surah dengan suara {name} dipadam daripada peranti anda ({size}).',
  playsHere: 'Dimainkan daripada peranti anda tanpa sambungan',
}

const tr: DownloadStrings = {
  download: 'İndir',
  downloadSize: 'İndir ({size})',
  downloading: 'İndiriliyor {pct}',
  downloaded: 'İndirildi ✓',
  failed: 'İndirme tamamlanamadı. Bağlantı geri geldiğinde yeniden deneyin.',
  mushafTitle: 'Kur’an’ın tamamını onun sesiyle indir',
  mushafSize: '114 sure, yaklaşık {size}',
  mushafConfirm: 'Kur’an’ın tamamı {name} sesiyle, yaklaşık {size}, sure sure indirilir. Duraklatıp sürdürebilirsiniz.',
  cellular: 'Mobil verideyiniz ve indirme yaklaşık {size}.',
  start: 'İndirmeyi başlat',
  cancel: 'Vazgeç',
  progress: '{m} sureden {n} tanesi indirildi',
  pause: 'Duraklat',
  resume: 'Sürdür',
  paused: 'İndirme duraklatıldı',
  mushafDone: 'Kur’an’ın tamamı onun sesiyle indirildi ✓',
  title: 'İndirilenler',
  empty: 'Henüz indirilen tilavet yok. Bir sureyi sayfasındaki «Dinle» bölümünden, Kur’an’ın tamamını kârîler sayfasından indirin.',
  total: 'Toplam: {size}',
  suras: '{n} sure · {size}',
  remove: 'Sil',
  removeSura: '{name} sil',
  removeReciter: 'Tüm tilavetlerini sil',
  removeReciterConfirm: '{name} sesiyle {n} sure cihazınızdan silinir ({size}).',
  playsHere: 'Cihazınızdan bağlantısız çalar',
}

const fr: DownloadStrings = {
  download: 'Télécharger',
  downloadSize: 'Télécharger ({size})',
  downloading: 'Téléchargement {pct}',
  downloaded: 'Téléchargée ✓',
  failed: 'Le téléchargement n’a pas abouti. Réessayez quand la connexion reviendra.',
  mushafTitle: 'Télécharger tout le Coran de sa voix',
  mushafSize: '114 sourates, environ {size}',
  mushafConfirm: 'Tout le Coran de la voix de {name} est téléchargé, environ {size}, sourate après sourate. Vous pouvez le mettre en pause et le reprendre.',
  cellular: 'Vous êtes sur les données mobiles, et le téléchargement fait environ {size}.',
  start: 'Lancer le téléchargement',
  cancel: 'Annuler',
  progress: '{n} sourates sur {m} téléchargées',
  pause: 'Pause',
  resume: 'Reprendre',
  paused: 'Téléchargement en pause',
  mushafDone: 'Tout le Coran est téléchargé de sa voix ✓',
  title: 'Téléchargements',
  empty: 'Aucune récitation téléchargée pour l’instant. Téléchargez une sourate depuis « Écouter » sur sa page, ou tout le Coran depuis la page des récitateurs.',
  total: 'Total : {size}',
  suras: '{n} sourates · {size}',
  remove: 'Supprimer',
  removeSura: 'Supprimer {name}',
  removeReciter: 'Supprimer toutes ses récitations',
  removeReciterConfirm: '{n} sourates de la voix de {name} sont supprimées de votre appareil ({size}).',
  playsHere: 'Écoutée depuis votre appareil, hors connexion',
}

const es: DownloadStrings = {
  download: 'Descargar',
  downloadSize: 'Descargar ({size})',
  downloading: 'Descargando {pct}',
  downloaded: 'Descargada ✓',
  failed: 'La descarga no terminó. Inténtelo de nuevo cuando vuelva la conexión.',
  mushafTitle: 'Descargar todo el Corán con su voz',
  mushafSize: '114 suras, unos {size}',
  mushafConfirm: 'Se descarga todo el Corán con la voz de {name}, unos {size}, sura tras sura. Puede pausarlo y reanudarlo.',
  cellular: 'Está usando datos móviles, y la descarga es de unos {size}.',
  start: 'Iniciar la descarga',
  cancel: 'Cancelar',
  progress: '{n} de {m} suras descargadas',
  pause: 'Pausar',
  resume: 'Reanudar',
  paused: 'Descarga en pausa',
  mushafDone: 'Todo el Corán está descargado con su voz ✓',
  title: 'Descargas',
  empty: 'Aún no hay recitaciones descargadas. Descargue una sura desde «Escuchar» en su página, o todo el Corán desde la página de recitadores.',
  total: 'Total: {size}',
  suras: '{n} suras · {size}',
  remove: 'Eliminar',
  removeSura: 'Eliminar {name}',
  removeReciter: 'Eliminar todas sus recitaciones',
  removeReciterConfirm: 'Se eliminan de su dispositivo {n} suras con la voz de {name} ({size}).',
  playsHere: 'Suena desde su dispositivo, sin conexión',
}

const bn: DownloadStrings = {
  download: 'ডাউনলোড',
  downloadSize: 'ডাউনলোড ({size})',
  downloading: 'ডাউনলোড হচ্ছে {pct}',
  downloaded: 'ডাউনলোড হয়েছে ✓',
  failed: 'ডাউনলোড শেষ হয়নি। সংযোগ ফিরলে আবার চেষ্টা করুন।',
  mushafTitle: 'তাঁর কণ্ঠে পুরো কুরআন ডাউনলোড করুন',
  mushafSize: '১১৪টি সূরা, প্রায় {size}',
  mushafConfirm: '{name}-এর কণ্ঠে পুরো কুরআন ডাউনলোড হবে, প্রায় {size}, একটির পর একটি সূরা। আপনি থামিয়ে আবার চালু করতে পারেন।',
  cellular: 'আপনি মোবাইল ডেটায় আছেন, আর ডাউনলোডটি প্রায় {size}।',
  start: 'ডাউনলোড শুরু করুন',
  cancel: 'বাতিল',
  progress: '{m}টির মধ্যে {n}টি সূরা ডাউনলোড হয়েছে',
  pause: 'থামান',
  resume: 'আবার চালু',
  paused: 'ডাউনলোড থামানো আছে',
  mushafDone: 'তাঁর কণ্ঠে পুরো কুরআন ডাউনলোড হয়েছে ✓',
  title: 'ডাউনলোড',
  empty: 'এখনো কোনো তিলাওয়াত ডাউনলোড হয়নি। সূরার পাতায় «শুনুন» থেকে সূরা, বা ক্বারীদের পাতা থেকে পুরো কুরআন ডাউনলোড করুন।',
  total: 'মোট: {size}',
  suras: '{n}টি সূরা · {size}',
  remove: 'মুছুন',
  removeSura: '{name} মুছুন',
  removeReciter: 'তাঁর সব তিলাওয়াত মুছুন',
  removeReciterConfirm: '{name}-এর কণ্ঠে {n}টি সূরা আপনার ডিভাইস থেকে মুছে যাবে ({size})।',
  playsHere: 'আপনার ডিভাইস থেকে সংযোগ ছাড়াই বাজে',
}

const hi: DownloadStrings = {
  download: 'डाउनलोड',
  downloadSize: 'डाउनलोड ({size})',
  downloading: 'डाउनलोड हो रहा है {pct}',
  downloaded: 'डाउनलोड हो गई ✓',
  failed: 'डाउनलोड पूरा नहीं हुआ। कनेक्शन लौटने पर फिर कोशिश करें।',
  mushafTitle: 'उनकी आवाज़ में पूरा क़ुरआन डाउनलोड करें',
  mushafSize: '114 सूरतें, लगभग {size}',
  mushafConfirm: '{name} की आवाज़ में पूरा क़ुरआन डाउनलोड होगा, लगभग {size}, एक सूरत के बाद दूसरी। आप इसे रोककर फिर शुरू कर सकते हैं।',
  cellular: 'आप मोबाइल डेटा पर हैं, और डाउनलोड लगभग {size} है।',
  start: 'डाउनलोड शुरू करें',
  cancel: 'रद्द करें',
  progress: '{m} में से {n} सूरतें डाउनलोड हुईं',
  pause: 'रोकें',
  resume: 'फिर शुरू करें',
  paused: 'डाउनलोड रुका है',
  mushafDone: 'उनकी आवाज़ में पूरा क़ुरआन डाउनलोड हो गया ✓',
  title: 'डाउनलोड',
  empty: 'अभी कोई तिलावत डाउनलोड नहीं हुई। सूरत के पेज पर «सुनें» से सूरत, या क़ारियों के पेज से पूरा क़ुरआन डाउनलोड करें।',
  total: 'कुल: {size}',
  suras: '{n} सूरतें · {size}',
  remove: 'हटाएँ',
  removeSura: '{name} हटाएँ',
  removeReciter: 'उनकी सभी तिलावतें हटाएँ',
  removeReciterConfirm: '{name} की आवाज़ में {n} सूरतें आपके डिवाइस से हटेंगी ({size})।',
  playsHere: 'आपके डिवाइस से बिना कनेक्शन बजती है',
}

export const DOWNLOADS: Record<Lang, DownloadStrings> = { ar, en, ur, id, ms, tr, fr, es, bn, hi }

// The language picker (reply 0033 §أ1; boards LangPicker, LangSearch, LangNotFound, LangPickerN), in the ten interface
// languages. Arabic and English are reviewed; the other eight are machine translations of the interface, as elsewhere
// in the app (CLAUDE.md §4). Interface texts only. Placeholders filled at run time: {latin} «English», {en} «Arabic»,
// {code} «ar», {farsi} «Farsi» (names people type, kept out of the texts so no Latin sits in the Arabic-script ones).
import type { Lang } from '../../../../shared/api'

export type LangStrings = {
  title: string
  back: string
  searchPlaceholder: string
  searchLabel: string
  clear: string
  deviceLang: string
  lastChosen: string
  allLangs: string
  count: { zero?: string; one?: string; two?: string; few?: string; many?: string; other: string }
  badgeFull: string
  badgeNoTafsir: string
  badgeSomeHadithAr: string
  badgeHadithAr: string
  legendLabel: string
  legendFull: string
  legendNoTafsir: string
  legendSomeHadithAr: string
  legendHadithAr: string
  uiNote: string
  closest: string
  moreResults: string
  searchHint: string
  notFoundTitle: string
  notAmong: string
  notFoundBody: string
  request: string
  requestPrivacy: string
  requestSent: string
  requestLimited: string
  requestFailed: string
  requestLetters: string
  untilThen: string
}

const ar: LangStrings = {
  title: 'اللغة',
  back: 'رجوع',
  searchPlaceholder: 'ابحث: عربي، {latin}، اردو…',
  searchLabel: 'ابحث عن لغة',
  clear: 'امسح',
  deviceLang: 'لغة جهازك',
  lastChosen: 'آخر ما اخترت',
  allLangs: 'كل اللغات',
  count: { one: 'لغة واحدة', two: 'لغتان', few: '{n} لغات', many: '{n} لغة', other: '{n} لغة' },
  badgeFull: 'كامل',
  badgeNoTafsir: 'بدون تفسير مترجم',
  badgeSomeHadithAr: 'بعض الأحاديث بالعربية',
  badgeHadithAr: 'الأحاديث بالعربية',
  legendLabel: 'معنى الشارات',
  legendFull: 'معنى الآية وتفسيرها، والحديث وشرحه، كلها بترجمة بشرية.',
  legendNoTafsir: 'معنى الآية والحديث بترجمة بشرية، والتفسير بالعربية حتى تتوفر ترجمته.',
  legendSomeHadithAr: 'ما لم يُترجم من الأحاديث بعد يظهر بالعربية.',
  legendHadithAr: 'الأحاديث بالعربية حتى تتوفر ترجمتها.',
  uiNote: 'أزرار التطبيق بالعربية والإنجليزية مراجَعة، وبالأردية والإندونيسية والملايوية والتركية والفرنسية والإسبانية والبنغالية والهندية مترجمة آليًا، وبغيرها بالإنجليزية. أما الآيات والأحاديث فلا تُترجم آليًا أبدًا.',
  closest: 'أقرب نتيجة',
  moreResults: 'نتائج قريبة',
  searchHint: 'اكتب اسم لغتك بأي طريقة تعرفها: «عربي» أو «العربية» أو {en} أو {code}. ونتحمّل الأخطاء الإملائية، فـ«انقليزي» تجد الإنجليزية، و«{farsi}» تجد الفارسية.',
  notFoundTitle: 'ما لقينا «{q}» بين لغاتنا الحين',
  notAmong: 'إن لم تجد «{q}» بينها فاطلبها.',
  notFoundBody: 'نضيف اللغة متى وُجدت لها ترجمة معتمدة لمعاني القرآن والأحاديث. اطلبها، ونعرف كم واحد يحتاجها.',
  request: 'اطلب هذه اللغة',
  requestPrivacy: 'الطلب يُعدّ فقط، بلا اسم ولا بريد ولا أي بيانات عنك.',
  requestSent: 'وصل طلبك، شكرًا',
  requestLimited: 'بلغت طلبات اليوم حدّها. تقدر تطلبها غدًا.',
  requestFailed: 'ما وصل الطلب. حاول مرة ثانية.',
  requestLetters: 'اكتب اسم اللغة بالحروف فقط، من حرفين إلى ٤٠ حرفًا.',
  untilThen: 'وحتى ذلك الحين',
}

const en: LangStrings = {
  title: 'Language',
  back: 'Back',
  searchPlaceholder: 'Search: Arabic, {latin}, Urdu…',
  searchLabel: 'Search for a language',
  clear: 'Clear',
  deviceLang: 'Your device’s language',
  lastChosen: 'Your last choice',
  allLangs: 'All languages',
  count: { one: '{n} language', other: '{n} languages' },
  badgeFull: 'Complete',
  badgeNoTafsir: 'No translated tafsir',
  badgeSomeHadithAr: 'Some hadiths in Arabic',
  badgeHadithAr: 'Hadiths in Arabic',
  legendLabel: 'What the badges mean',
  legendFull: 'The ayah’s meaning and its tafsir, the hadith and its explanation, all in a human translation.',
  legendNoTafsir: 'The ayah’s meaning and the hadith in a human translation; the tafsir in Arabic until its translation is available.',
  legendSomeHadithAr: 'Hadiths not yet translated appear in Arabic.',
  legendHadithAr: 'The hadiths are in Arabic until their translation is available.',
  uiNote: 'The app’s buttons are reviewed in Arabic and English, machine-translated in Urdu, Indonesian, Malay, Turkish, French, Spanish, Bengali and Hindi, and in English for any other language. The ayat and the hadiths are never machine-translated.',
  closest: 'Closest match',
  moreResults: 'Close matches',
  searchHint: 'Type your language’s name any way you know it: {en}, «عربي» or {code}. Spelling slips are fine: «Englsh» finds English, and «{farsi}» finds Persian.',
  notFoundTitle: 'We don’t have «{q}» among our languages yet',
  notAmong: 'If «{q}» isn’t among these, request it.',
  notFoundBody: 'We add a language once there is an approved translation of the meanings of the Quran and of the hadiths. Request it, so we know how many need it.',
  request: 'Request this language',
  requestPrivacy: 'The request is only counted: no name, no email, nothing about you.',
  requestSent: 'Your request arrived. Thank you.',
  requestLimited: 'Today’s requests have reached their limit. You can request it tomorrow.',
  requestFailed: 'The request didn’t arrive. Please try again.',
  requestLetters: 'Write the language’s name in letters only, 2 to 40 of them.',
  untilThen: 'Until then',
}

const ur: LangStrings = {
  title: 'زبان',
  back: 'واپس',
  searchPlaceholder: 'تلاش کریں: عربی، {latin}، اردو…',
  searchLabel: 'زبان تلاش کریں',
  clear: 'صاف کریں',
  deviceLang: 'آپ کے آلے کی زبان',
  lastChosen: 'آپ کا پچھلا انتخاب',
  allLangs: 'تمام زبانیں',
  count: { one: '{n} زبان', other: '{n} زبانیں' },
  badgeFull: 'مکمل',
  badgeNoTafsir: 'تفسیر کا ترجمہ نہیں',
  badgeSomeHadithAr: 'کچھ احادیث عربی میں',
  badgeHadithAr: 'احادیث عربی میں',
  legendLabel: 'نشانات کا مطلب',
  legendFull: 'آیت کا معنی اور اس کی تفسیر، حدیث اور اس کی شرح، سب انسانی ترجمے میں۔',
  legendNoTafsir: 'آیت کا معنی اور حدیث انسانی ترجمے میں، اور تفسیر عربی میں جب تک اس کا ترجمہ دستیاب نہ ہو۔',
  legendSomeHadithAr: 'جن احادیث کا ترجمہ ابھی نہیں ہوا وہ عربی میں دکھائی دیتی ہیں۔',
  legendHadithAr: 'احادیث عربی میں، جب تک ان کا ترجمہ دستیاب نہ ہو۔',
  uiNote: 'ایپ کے بٹن عربی اور انگریزی میں نظرثانی شدہ ہیں، اردو، انڈونیشیائی، مالے، ترکی، فرانسیسی، ہسپانوی، بنگالی اور ہندی میں مشینی ترجمہ ہیں، اور کسی اور زبان کے لیے انگریزی میں۔ آیات اور احادیث کا مشینی ترجمہ کبھی نہیں کیا جاتا۔',
  closest: 'قریب ترین نتیجہ',
  moreResults: 'قریبی نتائج',
  searchHint: 'اپنی زبان کا نام جس طرح جانتے ہیں لکھیں: {en}، «عربی» یا {code}۔ املا کی غلطی چل جائے گی: «انقليزي» انگریزی تک لے جائے گا اور «{farsi}» فارسی تک۔',
  notFoundTitle: '«{q}» ابھی ہماری زبانوں میں نہیں ملی',
  notAmong: 'اگر «{q}» ان میں نہیں ہے تو اس کی درخواست کریں۔',
  notFoundBody: 'جب کسی زبان میں قرآن کے معانی اور احادیث کا مستند ترجمہ دستیاب ہو تو ہم اسے شامل کرتے ہیں۔ اس کی درخواست کریں تاکہ ہمیں معلوم ہو کتنے لوگوں کو اس کی ضرورت ہے۔',
  request: 'اس زبان کی درخواست کریں',
  requestPrivacy: 'درخواست صرف گنی جاتی ہے، نہ نام، نہ ای میل، نہ آپ کے بارے میں کوئی معلومات۔',
  requestSent: 'آپ کی درخواست پہنچ گئی، شکریہ',
  requestLimited: 'آج کی درخواستوں کی حد پوری ہو گئی۔ کل درخواست کر سکتے ہیں۔',
  requestFailed: 'درخواست نہیں پہنچی۔ دوبارہ کوشش کریں۔',
  requestLetters: 'زبان کا نام صرف حروف میں لکھیں، دو سے چالیس حروف تک۔',
  untilThen: 'تب تک',
}

const id: LangStrings = {
  title: 'Bahasa',
  back: 'Kembali',
  searchPlaceholder: 'Cari: Arab, {latin}, Urdu…',
  searchLabel: 'Cari bahasa',
  clear: 'Hapus',
  deviceLang: 'Bahasa perangkat Anda',
  lastChosen: 'Pilihan terakhir Anda',
  allLangs: 'Semua bahasa',
  count: { other: '{n} bahasa' },
  badgeFull: 'Lengkap',
  badgeNoTafsir: 'Tanpa tafsir terjemahan',
  badgeSomeHadithAr: 'Sebagian hadis berbahasa Arab',
  badgeHadithAr: 'Hadis berbahasa Arab',
  legendLabel: 'Arti lencana',
  legendFull: 'Makna ayat dan tafsirnya, hadis dan syarahnya, semuanya dalam terjemahan manusia.',
  legendNoTafsir: 'Makna ayat dan hadis dalam terjemahan manusia; tafsirnya dalam bahasa Arab sampai terjemahannya tersedia.',
  legendSomeHadithAr: 'Hadis yang belum diterjemahkan tampil dalam bahasa Arab.',
  legendHadithAr: 'Hadis dalam bahasa Arab sampai terjemahannya tersedia.',
  uiNote: 'Tombol aplikasi dalam bahasa Arab dan Inggris sudah ditinjau, dalam bahasa Urdu, Indonesia, Melayu, Turki, Prancis, Spanyol, Bengali, dan Hindi diterjemahkan mesin, dan untuk bahasa lain tampil dalam bahasa Inggris. Ayat dan hadis tidak pernah diterjemahkan mesin.',
  closest: 'Hasil terdekat',
  moreResults: 'Hasil yang mirip',
  searchHint: 'Ketik nama bahasa Anda dengan cara apa pun yang Anda tahu: {en}, «عربي» atau {code}. Salah ketik tidak apa-apa: «Inggrs» menemukan bahasa Inggris, dan «{farsi}» menemukan bahasa Persia.',
  notFoundTitle: 'Kami belum menemukan «{q}» di antara bahasa kami',
  notAmong: 'Jika «{q}» tidak ada di antaranya, mintalah.',
  notFoundBody: 'Kami menambahkan bahasa begitu ada terjemahan resmi makna Al-Qur’an dan hadis. Mintalah, agar kami tahu berapa banyak yang membutuhkannya.',
  request: 'Minta bahasa ini',
  requestPrivacy: 'Permintaan hanya dihitung, tanpa nama, tanpa email, tanpa data apa pun tentang Anda.',
  requestSent: 'Permintaan Anda sudah sampai, terima kasih',
  requestLimited: 'Permintaan hari ini sudah mencapai batas. Anda bisa memintanya besok.',
  requestFailed: 'Permintaan tidak sampai. Silakan coba lagi.',
  requestLetters: 'Tulis nama bahasa dengan huruf saja, 2 sampai 40 huruf.',
  untilThen: 'Sementara itu',
}

const ms: LangStrings = {
  title: 'Bahasa',
  back: 'Kembali',
  searchPlaceholder: 'Cari: Arab, {latin}, Urdu…',
  searchLabel: 'Cari bahasa',
  clear: 'Kosongkan',
  deviceLang: 'Bahasa peranti anda',
  lastChosen: 'Pilihan terakhir anda',
  allLangs: 'Semua bahasa',
  count: { other: '{n} bahasa' },
  badgeFull: 'Lengkap',
  badgeNoTafsir: 'Tiada tafsir terjemahan',
  badgeSomeHadithAr: 'Sebahagian hadis berbahasa Arab',
  badgeHadithAr: 'Hadis berbahasa Arab',
  legendLabel: 'Maksud lencana',
  legendFull: 'Makna ayat dan tafsirnya, hadis dan syarahnya, semuanya dalam terjemahan manusia.',
  legendNoTafsir: 'Makna ayat dan hadis dalam terjemahan manusia; tafsirnya dalam bahasa Arab sehingga terjemahannya tersedia.',
  legendSomeHadithAr: 'Hadis yang belum diterjemah dipaparkan dalam bahasa Arab.',
  legendHadithAr: 'Hadis dalam bahasa Arab sehingga terjemahannya tersedia.',
  uiNote: 'Butang aplikasi dalam bahasa Arab dan Inggeris telah disemak, dalam bahasa Urdu, Indonesia, Melayu, Turki, Perancis, Sepanyol, Benggali dan Hindi diterjemah oleh mesin, dan bagi bahasa lain dipaparkan dalam bahasa Inggeris. Ayat dan hadis tidak sekali-kali diterjemah oleh mesin.',
  closest: 'Hasil paling hampir',
  moreResults: 'Hasil yang hampir',
  searchHint: 'Taip nama bahasa anda dengan apa-apa cara yang anda tahu: {en}, «عربي» atau {code}. Salah ejaan tidak mengapa: «Inggeri» menemui bahasa Inggeris, dan «{farsi}» menemui bahasa Parsi.',
  notFoundTitle: 'Kami belum menemui «{q}» dalam bahasa kami',
  notAmong: 'Jika «{q}» tiada dalam senarai ini, mintalah.',
  notFoundBody: 'Kami menambah sesuatu bahasa apabila ada terjemahan muktamad makna al-Quran dan hadis. Mintalah, supaya kami tahu berapa ramai yang memerlukannya.',
  request: 'Minta bahasa ini',
  requestPrivacy: 'Permintaan hanya dikira, tanpa nama, tanpa e-mel, tanpa sebarang data tentang anda.',
  requestSent: 'Permintaan anda telah sampai, terima kasih',
  requestLimited: 'Permintaan hari ini sudah mencapai had. Anda boleh memintanya esok.',
  requestFailed: 'Permintaan tidak sampai. Sila cuba lagi.',
  requestLetters: 'Tulis nama bahasa dengan huruf sahaja, 2 hingga 40 huruf.',
  untilThen: 'Sementara itu',
}

const tr: LangStrings = {
  title: 'Dil',
  back: 'Geri',
  searchPlaceholder: 'Ara: Arapça, {latin}, Urduca…',
  searchLabel: 'Dil ara',
  clear: 'Temizle',
  deviceLang: 'Cihazınızın dili',
  lastChosen: 'Son seçiminiz',
  allLangs: 'Tüm diller',
  count: { other: '{n} dil' },
  badgeFull: 'Tam',
  badgeNoTafsir: 'Tefsir çevirisi yok',
  badgeSomeHadithAr: 'Bazı hadisler Arapça',
  badgeHadithAr: 'Hadisler Arapça',
  legendLabel: 'Rozetlerin anlamı',
  legendFull: 'Ayetin anlamı ve tefsiri, hadis ve şerhi; hepsi insan çevirisiyle.',
  legendNoTafsir: 'Ayetin anlamı ve hadis insan çevirisiyle; tefsir, çevirisi çıkana kadar Arapça.',
  legendSomeHadithAr: 'Henüz çevrilmemiş hadisler Arapça görünür.',
  legendHadithAr: 'Hadisler, çevirileri çıkana kadar Arapça.',
  uiNote: 'Uygulamanın düğmeleri Arapça ve İngilizcede gözden geçirilmiştir; Urduca, Endonezce, Malayca, Türkçe, Fransızca, İspanyolca, Bengalce ve Hintçede makine çevirisidir; diğer dillerde İngilizce görünür. Ayetler ve hadisler asla makineyle çevrilmez.',
  closest: 'En yakın sonuç',
  moreResults: 'Yakın sonuçlar',
  searchHint: 'Dilinizin adını bildiğiniz her şekilde yazın: {en}, «عربي» ya da {code}. Yazım hataları sorun değil: «Ingilzce» İngilizceyi, «{farsi}» Farsçayı bulur.',
  notFoundTitle: '«{q}» henüz dillerimiz arasında yok',
  notAmong: '«{q}» bunlar arasında değilse talep edin.',
  notFoundBody: 'Kur’an’ın anlamlarının ve hadislerin onaylı bir çevirisi bulunduğunda dili ekliyoruz. Talep edin, kaç kişinin ihtiyacı olduğunu bilelim.',
  request: 'Bu dili talep et',
  requestPrivacy: 'Talep yalnızca sayılır; ad, e-posta ya da sizinle ilgili hiçbir bilgi yok.',
  requestSent: 'Talebiniz ulaştı, teşekkürler',
  requestLimited: 'Bugünkü talepler sınıra ulaştı. Yarın talep edebilirsiniz.',
  requestFailed: 'Talep ulaşmadı. Lütfen yeniden deneyin.',
  requestLetters: 'Dilin adını yalnızca harflerle yazın, 2 ile 40 harf arası.',
  untilThen: 'O zamana kadar',
}

const fr: LangStrings = {
  title: 'Langue',
  back: 'Retour',
  searchPlaceholder: 'Rechercher : arabe, {latin}, ourdou…',
  searchLabel: 'Rechercher une langue',
  clear: 'Effacer',
  deviceLang: 'Langue de votre appareil',
  lastChosen: 'Votre dernier choix',
  allLangs: 'Toutes les langues',
  count: { one: '{n} langue', other: '{n} langues' },
  badgeFull: 'Complet',
  badgeNoTafsir: 'Sans tafsir traduit',
  badgeSomeHadithAr: 'Certains hadiths en arabe',
  badgeHadithAr: 'Hadiths en arabe',
  legendLabel: 'Signification des badges',
  legendFull: 'Le sens du verset et son tafsir, le hadith et son explication, le tout en traduction humaine.',
  legendNoTafsir: 'Le sens du verset et le hadith en traduction humaine ; le tafsir en arabe en attendant sa traduction.',
  legendSomeHadithAr: 'Les hadiths pas encore traduits s’affichent en arabe.',
  legendHadithAr: 'Les hadiths en arabe en attendant leur traduction.',
  uiNote: 'Les boutons de l’application sont révisés en arabe et en anglais, traduits automatiquement en ourdou, indonésien, malais, turc, français, espagnol, bengali et hindi, et en anglais pour toute autre langue. Les versets et les hadiths ne sont jamais traduits automatiquement.',
  closest: 'Résultat le plus proche',
  moreResults: 'Résultats proches',
  searchHint: 'Tapez le nom de votre langue comme vous le connaissez : {en}, «عربي» ou {code}. Les fautes de frappe passent : «Anglai» trouve l’anglais, et «{farsi}» trouve le persan.',
  notFoundTitle: 'Nous n’avons pas encore «{q}» parmi nos langues',
  notAmong: 'Si «{q}» n’en fait pas partie, demandez-la.',
  notFoundBody: 'Nous ajoutons une langue dès qu’il existe une traduction approuvée du sens du Coran et des hadiths. Demandez-la, pour que nous sachions combien en ont besoin.',
  request: 'Demander cette langue',
  requestPrivacy: 'La demande est seulement comptée : ni nom, ni e-mail, ni aucune donnée sur vous.',
  requestSent: 'Votre demande est arrivée, merci',
  requestLimited: 'Les demandes du jour ont atteint leur limite. Vous pourrez la demander demain.',
  requestFailed: 'La demande n’est pas arrivée. Veuillez réessayer.',
  requestLetters: 'Écrivez le nom de la langue en lettres seulement, de 2 à 40.',
  untilThen: 'En attendant',
}

const es: LangStrings = {
  title: 'Idioma',
  back: 'Volver',
  searchPlaceholder: 'Buscar: árabe, {latin}, urdu…',
  searchLabel: 'Buscar un idioma',
  clear: 'Borrar',
  deviceLang: 'Idioma de tu dispositivo',
  lastChosen: 'Tu última elección',
  allLangs: 'Todos los idiomas',
  count: { one: '{n} idioma', other: '{n} idiomas' },
  badgeFull: 'Completo',
  badgeNoTafsir: 'Sin tafsir traducido',
  badgeSomeHadithAr: 'Algunos hadices en árabe',
  badgeHadithAr: 'Hadices en árabe',
  legendLabel: 'Qué significan las insignias',
  legendFull: 'El significado de la aleya y su tafsir, el hadiz y su explicación, todo en traducción humana.',
  legendNoTafsir: 'El significado de la aleya y el hadiz en traducción humana; el tafsir en árabe hasta que haya traducción.',
  legendSomeHadithAr: 'Los hadices aún no traducidos aparecen en árabe.',
  legendHadithAr: 'Los hadices en árabe hasta que haya traducción.',
  uiNote: 'Los botones de la aplicación están revisados en árabe e inglés, traducidos automáticamente en urdu, indonesio, malayo, turco, francés, español, bengalí e hindi, y en inglés para cualquier otro idioma. Las aleyas y los hadices nunca se traducen automáticamente.',
  closest: 'Resultado más cercano',
  moreResults: 'Resultados cercanos',
  searchHint: 'Escribe el nombre de tu idioma como lo conozcas: {en}, «عربي» o {code}. Los errores de escritura no importan: «Ingls» encuentra el inglés y «{farsi}» encuentra el persa.',
  notFoundTitle: 'Aún no tenemos «{q}» entre nuestros idiomas',
  notAmong: 'Si «{q}» no está entre ellos, solicítalo.',
  notFoundBody: 'Añadimos un idioma cuando existe una traducción aprobada del significado del Corán y de los hadices. Solicítalo, así sabremos cuántos lo necesitan.',
  request: 'Solicitar este idioma',
  requestPrivacy: 'La solicitud solo se cuenta: sin nombre, sin correo, sin ningún dato sobre ti.',
  requestSent: 'Tu solicitud ha llegado, gracias',
  requestLimited: 'Las solicitudes de hoy llegaron a su límite. Puedes solicitarlo mañana.',
  requestFailed: 'La solicitud no llegó. Inténtalo de nuevo.',
  requestLetters: 'Escribe el nombre del idioma solo con letras, de 2 a 40.',
  untilThen: 'Mientras tanto',
}

const bn: LangStrings = {
  title: 'ভাষা',
  back: 'ফিরে যান',
  searchPlaceholder: 'খুঁজুন: আরবি, {latin}, উর্দু…',
  searchLabel: 'ভাষা খুঁজুন',
  clear: 'মুছুন',
  deviceLang: 'আপনার ডিভাইসের ভাষা',
  lastChosen: 'আপনার শেষ বাছাই',
  allLangs: 'সব ভাষা',
  count: { other: '{n}টি ভাষা' },
  badgeFull: 'সম্পূর্ণ',
  badgeNoTafsir: 'তাফসিরের অনুবাদ নেই',
  badgeSomeHadithAr: 'কিছু হাদিস আরবিতে',
  badgeHadithAr: 'হাদিস আরবিতে',
  legendLabel: 'ব্যাজের অর্থ',
  legendFull: 'আয়াতের অর্থ ও তার তাফসির, হাদিস ও তার ব্যাখ্যা, সবই মানুষের করা অনুবাদে।',
  legendNoTafsir: 'আয়াতের অর্থ ও হাদিস মানুষের করা অনুবাদে; তাফসির আরবিতে, যতদিন না তার অনুবাদ পাওয়া যায়।',
  legendSomeHadithAr: 'যেসব হাদিসের অনুবাদ এখনও হয়নি, সেগুলো আরবিতে দেখা যায়।',
  legendHadithAr: 'হাদিস আরবিতে, যতদিন না তার অনুবাদ পাওয়া যায়।',
  uiNote: 'অ্যাপের বোতামগুলো আরবি ও ইংরেজিতে পর্যালোচিত, উর্দু, ইন্দোনেশীয়, মালয়, তুর্কি, ফরাসি, স্প্যানিশ, বাংলা ও হিন্দিতে যান্ত্রিক অনুবাদ, আর অন্য কোনো ভাষার জন্য ইংরেজিতে। আয়াত ও হাদিস কখনো যান্ত্রিকভাবে অনুবাদ করা হয় না।',
  closest: 'সবচেয়ে কাছের ফল',
  moreResults: 'কাছাকাছি ফল',
  searchHint: 'আপনার ভাষার নাম যেভাবে জানেন লিখুন: {en}, «عربي» বা {code}। বানান ভুল হলেও চলবে: «ইংরেজী» ইংরেজি খুঁজে দেবে, আর «{farsi}» ফারসি।',
  notFoundTitle: '«{q}» এখনও আমাদের ভাষাগুলোর মধ্যে নেই',
  notAmong: '«{q}» এগুলোর মধ্যে না থাকলে অনুরোধ করুন।',
  notFoundBody: 'কোনো ভাষায় কুরআনের অর্থ ও হাদিসের অনুমোদিত অনুবাদ পাওয়া গেলে আমরা সেই ভাষা যোগ করি। অনুরোধ করুন, যাতে আমরা জানি কতজনের এটি দরকার।',
  request: 'এই ভাষার অনুরোধ করুন',
  requestPrivacy: 'অনুরোধ শুধু গোনা হয়: কোনো নাম, ইমেইল বা আপনার সম্পর্কে কোনো তথ্য নেই।',
  requestSent: 'আপনার অনুরোধ পৌঁছেছে, ধন্যবাদ',
  requestLimited: 'আজকের অনুরোধ সীমায় পৌঁছেছে। আগামীকাল অনুরোধ করতে পারবেন।',
  requestFailed: 'অনুরোধ পৌঁছায়নি। আবার চেষ্টা করুন।',
  requestLetters: 'ভাষার নাম শুধু অক্ষরে লিখুন, ২ থেকে ৪০টি অক্ষর।',
  untilThen: 'ততক্ষণ পর্যন্ত',
}

const hi: LangStrings = {
  title: 'भाषा',
  back: 'वापस',
  searchPlaceholder: 'खोजें: अरबी, {latin}, उर्दू…',
  searchLabel: 'भाषा खोजें',
  clear: 'साफ़ करें',
  deviceLang: 'आपके डिवाइस की भाषा',
  lastChosen: 'आपका पिछला चुनाव',
  allLangs: 'सभी भाषाएँ',
  count: { one: '{n} भाषा', other: '{n} भाषाएँ' },
  badgeFull: 'पूर्ण',
  badgeNoTafsir: 'तफ़सीर का अनुवाद नहीं',
  badgeSomeHadithAr: 'कुछ हदीसें अरबी में',
  badgeHadithAr: 'हदीसें अरबी में',
  legendLabel: 'बैज का अर्थ',
  legendFull: 'आयत का अर्थ और उसकी तफ़सीर, हदीस और उसकी व्याख्या, सब मानव अनुवाद में।',
  legendNoTafsir: 'आयत का अर्थ और हदीस मानव अनुवाद में; तफ़सीर अरबी में, जब तक उसका अनुवाद उपलब्ध न हो।',
  legendSomeHadithAr: 'जिन हदीसों का अनुवाद अभी नहीं हुआ, वे अरबी में दिखती हैं।',
  legendHadithAr: 'हदीसें अरबी में, जब तक उनका अनुवाद उपलब्ध न हो।',
  uiNote: 'ऐप के बटन अरबी और अंग्रेज़ी में समीक्षित हैं, उर्दू, इंडोनेशियाई, मलय, तुर्की, फ़्रांसीसी, स्पेनिश, बांग्ला और हिंदी में मशीनी अनुवाद हैं, और किसी और भाषा के लिए अंग्रेज़ी में। आयतों और हदीसों का मशीनी अनुवाद कभी नहीं किया जाता।',
  closest: 'सबसे नज़दीकी नतीजा',
  moreResults: 'मिलते-जुलते नतीजे',
  searchHint: 'अपनी भाषा का नाम जैसे भी जानते हों लिखें: {en}, «عربي» या {code}। वर्तनी की गलती चलेगी: «अंग्रेजी» अंग्रेज़ी ढूँढ लेगा, और «{farsi}» फ़ारसी।',
  notFoundTitle: '«{q}» अभी हमारी भाषाओं में नहीं है',
  notAmong: 'अगर «{q}» इनमें नहीं है, तो उसका अनुरोध करें।',
  notFoundBody: 'जब किसी भाषा में क़ुरआन के अर्थों और हदीसों का प्रमाणित अनुवाद मिल जाता है, हम वह भाषा जोड़ते हैं। अनुरोध करें, ताकि हमें पता चले कितने लोगों को इसकी ज़रूरत है।',
  request: 'इस भाषा का अनुरोध करें',
  requestPrivacy: 'अनुरोध केवल गिना जाता है: न नाम, न ईमेल, न आपके बारे में कोई जानकारी।',
  requestSent: 'आपका अनुरोध पहुँच गया, धन्यवाद',
  requestLimited: 'आज के अनुरोध अपनी सीमा तक पहुँच गए। आप कल अनुरोध कर सकते हैं।',
  requestFailed: 'अनुरोध नहीं पहुँचा। कृपया फिर कोशिश करें।',
  requestLetters: 'भाषा का नाम केवल अक्षरों में लिखें, 2 से 40 अक्षर।',
  untilThen: 'तब तक',
}

export const LANG_PICKER: Record<Lang, LangStrings> = { ar, en, ur, id, ms, tr, fr, es, bn, hi }

/** The count in the header, in the interface language's plural form («٣١ لغة»). */
export function countText(s: LangStrings, n: number, lang: Lang, num: (n: number) => string): string {
  const form = new Intl.PluralRules(lang).select(n) as keyof LangStrings['count']
  return (s.count[form] ?? s.count.other).replace('{n}', num(n))
}

/** Fills the run-time names into a text: {latin} «English», {en} «Arabic», {code} «ar», {farsi} «Farsi», {q}. */
export const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k: string) => v[k] ?? m)
export const NAMES_TYPED = { latin: 'English', en: 'Arabic', code: 'ar', farsi: 'Farsi' }

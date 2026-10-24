// The lesson page's own frame words in the eight machine-translated interfaces (add-on 0072, item 4), imported by the
// lesson pages only (their lazy chunks). The lesson's content exists in Arabic and English only, as on the review
// pages: in these eight interfaces the page shows the English content with its English labels (as the app does for
// the meanings), and only these words — navigation and the four fields' headings — are in the reader's language,
// with a line saying so. Nothing of the content is machine-translated. Arabic and English keep the review pages' own
// words (each lesson's lesson.js).
import type { Lang } from '../../../shared/api'

export type Chrome = {
  dir: 'rtl' | 'ltr'
  prev: string
  next: string
  /** {n} the step, {total} the steps */
  count: string
  replay: string
  noface: string
  loading: string
  /** {t} the step's title */
  canvasAria: string
  doH: string
  sayH: string
  readH: string
  howH: string
  rulingH: string
  mapH: string
  contentNote: string
  /** the prayer lesson's choice of a prayer and «تدرّب معي» (add-on 0072-add13) */
  prayers?: PrayerChrome
}

export type PrayerChrome = {
  choose: string
  chooseLead: string
  today: string
  timesNote: string
  noPlace: string
  timesOpen: string
  other: string
  mapAria: string
  practice: string
  practiceNote: string
  practiceLead: string
  start: string
  pausePr: string
  resumePr: string
  backPr: string
  fwdPr: string
  endPr: string
  donePr: string
  againPr: string
}

// Machine translations of the prayer lesson's frame words for each prayer (add-on 0072-add13), as the rest of this file.
const PRAYERS: Partial<Record<Lang, PrayerChrome>> = {
  ur: {
    choose: 'آپ کون سی نماز سیکھنا چاہتے ہیں؟',
    chooseLead: 'ایک نماز منتخب کریں، سبق آپ کو رکعت بہ رکعت، ہر رکعت اس کے تمام مراحل کے ساتھ، لے چلے گا۔',
    today: 'آج',
    timesNote: 'اوقات نماز کے اوقات کی اسکرین سے، آپ کے مقام کے لیے۔',
    noPlace: 'نماز کے اوقات کی اسکرین میں اپنا مقام منتخب کریں، تو یہاں ہر نماز کا وقت دکھائی دے گا۔',
    timesOpen: 'نماز کے اوقات',
    other: 'دوسری نماز منتخب کریں',
    mapAria: 'نماز کا نقشہ',
    practice: 'میرے ساتھ مشق کریں',
    practiceNote: 'نماز سے پہلے مشق کے لیے',
    practiceLead: 'یہ نماز میں کہی جانے والی باتیں ترتیب سے، بڑے حروف میں اور سکون سے دکھاتا ہے، تاکہ آپ نماز سے پہلے مشق کر سکیں۔',
    start: 'شروع کریں',
    pausePr: 'روکیں',
    resumePr: 'جاری رکھیں',
    backPr: 'پچھلا',
    fwdPr: 'اگلا',
    endPr: 'مشق ختم کریں',
    donePr: 'مشق ختم ہو گئی۔',
    againPr: 'شروع سے',
  },
  id: {
    choose: 'Salat mana yang ingin Anda pelajari?',
    chooseLead: 'Pilih satu salat, dan pelajaran ini menemani Anda rakaat demi rakaat, setiap rakaat dengan semua langkahnya.',
    today: 'Hari ini',
    timesNote: 'Waktunya dari layar waktu salat, untuk lokasi Anda.',
    noPlace: 'Atur lokasi Anda di layar waktu salat, maka waktu setiap salat tampil di sini.',
    timesOpen: 'Waktu salat',
    other: 'Pilih salat lain',
    mapAria: 'Peta salat',
    practice: 'Berlatih bersama saya',
    practiceNote: 'Untuk berlatih sebelum salat',
    practiceLead: 'Menampilkan apa yang diucapkan dalam salat, berurutan, dengan huruf besar dan tenang, agar Anda dapat berlatih sebelum salat.',
    start: 'Mulai',
    pausePr: 'Jeda',
    resumePr: 'Lanjutkan',
    backPr: 'Sebelumnya',
    fwdPr: 'Berikutnya',
    endPr: 'Akhiri latihan',
    donePr: 'Latihan selesai.',
    againPr: 'Dari awal',
  },
  ms: {
    choose: 'Solat mana yang ingin anda pelajari?',
    chooseLead: 'Pilih satu solat, dan pelajaran ini menemani anda rakaat demi rakaat, setiap rakaat dengan semua langkahnya.',
    today: 'Hari ini',
    timesNote: 'Waktunya daripada skrin waktu solat, untuk lokasi anda.',
    noPlace: 'Tetapkan lokasi anda di skrin waktu solat, dan waktu setiap solat dipaparkan di sini.',
    timesOpen: 'Waktu solat',
    other: 'Pilih solat lain',
    mapAria: 'Peta solat',
    practice: 'Berlatih bersama saya',
    practiceNote: 'Untuk berlatih sebelum solat',
    practiceLead: 'Memaparkan apa yang diucapkan dalam solat, mengikut urutan, dengan huruf besar dan tenang, supaya anda boleh berlatih sebelum solat.',
    start: 'Mula',
    pausePr: 'Jeda',
    resumePr: 'Teruskan',
    backPr: 'Sebelum',
    fwdPr: 'Seterusnya',
    endPr: 'Tamatkan latihan',
    donePr: 'Latihan selesai.',
    againPr: 'Dari mula',
  },
  tr: {
    choose: 'Hangi namazı öğrenmek istersiniz?',
    chooseLead: 'Bir namaz seçin; ders sizinle rekât rekât, her rekâtı bütün adımlarıyla ilerler.',
    today: 'Bugün',
    timesNote: 'Vakitler, konumunuz için namaz vakitleri ekranından.',
    noPlace: 'Namaz vakitleri ekranında konumunuzu belirleyin; her namazın vakti burada görünür.',
    timesOpen: 'Namaz vakitleri',
    other: 'Başka bir namaz seçin',
    mapAria: 'Namazın haritası',
    practice: 'Benimle çalış',
    practiceNote: 'Namazdan önce çalışmak için',
    practiceLead: 'Namazda söylenenleri sırayla, büyük harflerle ve sakince gösterir; böylece namazdan önce çalışabilirsiniz.',
    start: 'Başla',
    pausePr: 'Duraklat',
    resumePr: 'Devam et',
    backPr: 'Geri',
    fwdPr: 'İleri',
    endPr: 'Çalışmayı bitir',
    donePr: 'Çalışma bitti.',
    againPr: 'Baştan',
  },
  fr: {
    choose: 'Quelle prière voulez-vous apprendre ?',
    chooseLead: 'Choisissez une prière : la leçon vous accompagne rakah par rakah, chaque rakah avec toutes ses étapes.',
    today: 'Aujourd’hui',
    timesNote: 'Les horaires viennent de l’écran des heures de prière, pour votre lieu.',
    noPlace: 'Indiquez votre lieu sur l’écran des heures de prière, et l’heure de chaque prière s’affichera ici.',
    timesOpen: 'Heures de prière',
    other: 'Choisir une autre prière',
    mapAria: 'Le plan de la prière',
    practice: 'Entraînez-vous avec moi',
    practiceNote: 'Pour s’entraîner avant la prière',
    practiceLead: 'Affiche ce que l’on dit dans la prière, dans l’ordre, en grands caractères et calmement, pour vous entraîner avant de prier.',
    start: 'Commencer',
    pausePr: 'Pause',
    resumePr: 'Reprendre',
    backPr: 'Précédent',
    fwdPr: 'Suivant',
    endPr: 'Terminer l’entraînement',
    donePr: 'L’entraînement est terminé.',
    againPr: 'Depuis le début',
  },
  es: {
    choose: '¿Qué oración quiere aprender?',
    chooseLead: 'Elija una oración y la lección le acompaña rakah por rakah, cada rakah con todos sus pasos.',
    today: 'Hoy',
    timesNote: 'Las horas vienen de la pantalla de horarios de oración, para su lugar.',
    noPlace: 'Indique su lugar en la pantalla de horarios de oración y aquí aparecerá la hora de cada oración.',
    timesOpen: 'Horarios de oración',
    other: 'Elegir otra oración',
    mapAria: 'El mapa de la oración',
    practice: 'Practique conmigo',
    practiceNote: 'Para practicar antes de la oración',
    practiceLead: 'Muestra lo que se dice en la oración, en orden, en letra grande y con calma, para que practique antes de rezar.',
    start: 'Empezar',
    pausePr: 'Pausa',
    resumePr: 'Continuar',
    backPr: 'Anterior',
    fwdPr: 'Siguiente',
    endPr: 'Terminar la práctica',
    donePr: 'La práctica ha terminado.',
    againPr: 'Desde el principio',
  },
  bn: {
    choose: 'আপনি কোন নামাজ শিখতে চান?',
    chooseLead: 'একটি নামাজ বেছে নিন, পাঠটি আপনাকে রাকাতের পর রাকাত, প্রতিটি রাকাতের সব ধাপসহ নিয়ে যাবে।',
    today: 'আজ',
    timesNote: 'সময়গুলো নামাজের সময়সূচির পর্দা থেকে, আপনার স্থানের জন্য।',
    noPlace: 'নামাজের সময়সূচির পর্দায় আপনার স্থান ঠিক করুন, তাহলে এখানে প্রতিটি নামাজের সময় দেখা যাবে।',
    timesOpen: 'নামাজের সময়সূচি',
    other: 'অন্য নামাজ বেছে নিন',
    mapAria: 'নামাজের মানচিত্র',
    practice: 'আমার সাথে অনুশীলন করুন',
    practiceNote: 'নামাজের আগে অনুশীলনের জন্য',
    practiceLead: 'নামাজে যা বলা হয় তা ক্রমানুসারে, বড় অক্ষরে ও শান্তভাবে দেখায়, যাতে নামাজের আগে অনুশীলন করতে পারেন।',
    start: 'শুরু করুন',
    pausePr: 'বিরতি',
    resumePr: 'চালিয়ে যান',
    backPr: 'আগের',
    fwdPr: 'পরের',
    endPr: 'অনুশীলন শেষ করুন',
    donePr: 'অনুশীলন শেষ হয়েছে।',
    againPr: 'শুরু থেকে',
  },
  hi: {
    choose: 'आप कौन-सी नमाज़ सीखना चाहते हैं?',
    chooseLead: 'एक नमाज़ चुनिए, पाठ आपको रकअत-दर-रकअत, हर रकअत उसके सभी चरणों के साथ, ले चलेगा।',
    today: 'आज',
    timesNote: 'समय नमाज़ के समय वाली स्क्रीन से, आपके स्थान के लिए।',
    noPlace: 'नमाज़ के समय वाली स्क्रीन पर अपना स्थान चुनिए, तो यहाँ हर नमाज़ का समय दिखेगा।',
    timesOpen: 'नमाज़ के समय',
    other: 'दूसरी नमाज़ चुनिए',
    mapAria: 'नमाज़ का नक्शा',
    practice: 'मेरे साथ अभ्यास करें',
    practiceNote: 'नमाज़ से पहले अभ्यास के लिए',
    practiceLead: 'नमाज़ में जो कहा जाता है उसे क्रम से, बड़े अक्षरों में और शांति से दिखाता है, ताकि आप नमाज़ से पहले अभ्यास कर सकें।',
    start: 'शुरू करें',
    pausePr: 'रोकें',
    resumePr: 'जारी रखें',
    backPr: 'पिछला',
    fwdPr: 'अगला',
    endPr: 'अभ्यास समाप्त करें',
    donePr: 'अभ्यास समाप्त हुआ।',
    againPr: 'शुरू से',
  },
}

export const CHROME: Partial<Record<Lang, Chrome>> = {
  ur: {
    dir: 'rtl',
    prev: 'پچھلا',
    next: 'اگلا',
    count: 'قدم {n} از {total}',
    replay: 'حرکت دوبارہ دکھائیں',
    noface: 'چہرے کے خدوخال کے بغیر',
    loading: 'ساتھی لوڈ ہو رہا ہے…',
    canvasAria: 'سبق کا ساتھی اس حالت میں: {t}',
    doH: 'کیا کریں',
    sayH: 'کیا کہیں',
    readH: 'کیا پڑھیں',
    howH: 'دلیل',
    rulingH: 'اس کا حکم',
    mapH: 'سبق اور اس کے متون',
    contentNote: 'اس سبق کا مواد انگریزی میں ہے، جیسا کہ اس کا جائزہ لیا گیا، اور عربی متن ہمیشہ ساتھ ہے۔ اس صفحے کے عنوانات مشینی ترجمہ ہیں۔',
  },
  id: {
    dir: 'ltr',
    prev: 'Sebelumnya',
    next: 'Berikutnya',
    count: 'Langkah {n} dari {total}',
    replay: 'Putar ulang gerakan',
    noface: 'Tanpa fitur wajah',
    loading: 'Memuat pendamping…',
    canvasAria: 'Pendamping pelajaran dalam posisi: {t}',
    doH: 'Yang dilakukan',
    sayH: 'Yang diucapkan',
    readH: 'Yang dibaca',
    howH: 'Dalil',
    rulingH: 'Hukumnya',
    mapH: 'Pelajaran dan teks-teksnya',
    contentNote: 'Isi pelajaran ini dalam bahasa Inggris, sebagaimana telah ditinjau, dan teks Arabnya selalu ditampilkan. Judul-judul di halaman ini adalah terjemahan mesin.',
  },
  ms: {
    dir: 'ltr',
    prev: 'Sebelum',
    next: 'Seterusnya',
    count: 'Langkah {n} daripada {total}',
    replay: 'Main semula pergerakan',
    noface: 'Tanpa ciri wajah',
    loading: 'Memuatkan peneman…',
    canvasAria: 'Peneman pelajaran dalam keadaan: {t}',
    doH: 'Apa yang dilakukan',
    sayH: 'Apa yang diucapkan',
    readH: 'Apa yang dibaca',
    howH: 'Dalil',
    rulingH: 'Hukumnya',
    mapH: 'Pelajaran dan teks-teksnya',
    contentNote: 'Kandungan pelajaran ini dalam bahasa Inggeris, seperti yang telah disemak, dan teks Arabnya sentiasa dipaparkan. Tajuk-tajuk di halaman ini ialah terjemahan mesin.',
  },
  tr: {
    dir: 'ltr',
    prev: 'Geri',
    next: 'İleri',
    count: 'Adım {n} / {total}',
    replay: 'Hareketi tekrar oynat',
    noface: 'Yüz hatları yok',
    loading: 'Arkadaş yükleniyor…',
    canvasAria: 'Ders arkadaşı şu duruşta: {t}',
    doH: 'Ne yapılır',
    sayH: 'Ne söylenir',
    readH: 'Ne okunur',
    howH: 'Delil',
    rulingH: 'Hükmü',
    mapH: 'Ders ve metinleri',
    contentNote: 'Bu dersin içeriği, incelendiği şekliyle İngilizcedir ve Arapça metin her zaman gösterilir. Bu sayfadaki başlıklar makine çevirisidir.',
  },
  fr: {
    dir: 'ltr',
    prev: 'Précédent',
    next: 'Suivant',
    count: 'Étape {n} sur {total}',
    replay: 'Rejouer le mouvement',
    noface: 'Sans traits du visage',
    loading: 'Chargement du compagnon…',
    canvasAria: 'Le compagnon de la leçon dans la posture : {t}',
    doH: 'Ce que vous faites',
    sayH: 'Ce que vous dites',
    readH: 'Ce que vous récitez',
    howH: 'La preuve',
    rulingH: 'Son statut',
    mapH: 'La leçon et ses textes',
    contentNote: 'Le contenu de cette leçon est en anglais, tel qu’il a été relu, et le texte arabe est toujours affiché. Les titres de cette page sont une traduction automatique.',
  },
  es: {
    dir: 'ltr',
    prev: 'Anterior',
    next: 'Siguiente',
    count: 'Paso {n} de {total}',
    replay: 'Repetir el movimiento',
    noface: 'Sin rasgos faciales',
    loading: 'Cargando el acompañante…',
    canvasAria: 'El acompañante de la lección en la postura: {t}',
    doH: 'Qué hacer',
    sayH: 'Qué decir',
    readH: 'Qué recitar',
    howH: 'La evidencia',
    rulingH: 'Su dictamen',
    mapH: 'La lección y sus textos',
    contentNote: 'El contenido de esta lección está en inglés, tal como se revisó, y el texto árabe se muestra siempre. Los títulos de esta página son una traducción automática.',
  },
  bn: {
    dir: 'ltr',
    prev: 'আগের',
    next: 'পরের',
    count: 'ধাপ {n} / {total}',
    replay: 'নড়াচড়া আবার দেখুন',
    noface: 'মুখের অবয়ব ছাড়া',
    loading: 'সঙ্গী লোড হচ্ছে…',
    canvasAria: 'পাঠের সঙ্গী এই ভঙ্গিতে: {t}',
    doH: 'কী করবেন',
    sayH: 'কী বলবেন',
    readH: 'কী পড়বেন',
    howH: 'দলিল',
    rulingH: 'এর বিধান',
    mapH: 'পাঠ ও তার পাঠ্যসমূহ',
    contentNote: 'এই পাঠের বিষয়বস্তু ইংরেজিতে, যেমন পর্যালোচনা করা হয়েছে, এবং আরবি মূল পাঠ সবসময় দেখানো হয়। এই পৃষ্ঠার শিরোনামগুলো যান্ত্রিক অনুবাদ।',
  },
  hi: {
    dir: 'ltr',
    prev: 'पिछला',
    next: 'अगला',
    count: 'चरण {n} / {total}',
    replay: 'हरकत फिर से दिखाएँ',
    noface: 'चेहरे की बनावट के बिना',
    loading: 'साथी लोड हो रहा है…',
    canvasAria: 'पाठ का साथी इस मुद्रा में: {t}',
    doH: 'क्या करें',
    sayH: 'क्या कहें',
    readH: 'क्या पढ़ें',
    howH: 'दलील',
    rulingH: 'इसका हुक्म',
    mapH: 'पाठ और उसके पाठ्य',
    contentNote: 'इस पाठ की सामग्री अंग्रेज़ी में है, जैसी उसकी समीक्षा हुई, और अरबी मूल पाठ हमेशा दिखाया जाता है। इस पृष्ठ के शीर्षक मशीनी अनुवाद हैं।',
  },
}

for (const [l, p] of Object.entries(PRAYERS) as [Lang, PrayerChrome][]) if (CHROME[l]) CHROME[l].prayers = p

/** The content language of a lesson page: Arabic in the Arabic interface, English in every other. */
export const contentLang = (lang: Lang): 'ar' | 'en' => (lang === 'ar' ? 'ar' : 'en')

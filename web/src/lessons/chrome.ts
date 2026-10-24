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

/** The content language of a lesson page: Arabic in the Arabic interface, English in every other. */
export const contentLang = (lang: Lang): 'ar' | 'en' => (lang === 'ar' ? 'ar' : 'en')

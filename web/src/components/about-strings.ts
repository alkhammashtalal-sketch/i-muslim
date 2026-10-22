// «عن التطبيق», what the app offers (reply 0072 §10: «لا تذكر إلا ما يعمل»), in the ten interface languages: Arabic and
// English reviewed, the other eight machine translation like the rest of the interface (About.tsx marks them so).
// Each line names only what the code on `next` does, with what Talal approved for 1.1 and merged on integrate-1.1
// (add-ons 0071-add15, add16, 0072-add1, 0072-add2): prayer times by country, the next occasion under the date with its
// hadith, the forbidden time marked, «الصلوات الخمس» in My goals, the name of Allah of the day with its page and all the
// names, and the sky following the time of day (decoration only). relay/w1/0072-about/README.md: each claim and where
// it is implemented. Not claimed, as not shipped: al-Mukhtasar in English, the salaf card, the wudu and prayer
// lessons. The feature `app` shows in the
// iOS/Android app only (isNative), where the widgets, the local prayer alerts and the Quran inside the app exist.
// The English Ibn Kathir (Quran Foundation) is named in English only, where the ayah's panel asks for it, and «where our
// server provides it», since it shows only where the server holds the Quran Foundation keys (web/src/quran/api.ts).
import type { Lang } from '../../../shared/api'

export const ABOUT_FEATURES = ['ask', 'quran', 'listen', 'hadith', 'day', 'prayer', 'adhkar', 'calendar', 'goals', 'names', 'books', 'starter', 'app'] as const
export type AboutFeature = (typeof ABOUT_FEATURES)[number]

export type AboutStrings = {
  /** One line under the title. */
  lead: string
  featuresTitle: string
  features: Record<AboutFeature, { name: string; text: string }>
  /** After the languages paragraph when the content language has no al-Mukhtasar ({name}: the language's name). */
  mukhtasarNotHere: string
}

const ar: AboutStrings = {
  lead: 'تطبيق «مسلم» يعرض لك نصوص القرآن الكريم والسنة النبوية من مصادر معتمدة، بحروفها ومرجعها ورابطها، ومعها ما يعينك في يومك.',
  featuresTitle: 'ما في التطبيق',
  features: {
    ask: { name: 'اسأل', text: 'اسأل عن الإسلام وأركانه وعباداته كتابةً أو بصوتك، فيعرض لك النص المعتمد بحروفه ومرجعه، ويحيل ما يحتاج فتوى إلى الجهة المختصة.' },
    quran: { name: 'المصحف', text: 'القرآن الكريم بالسور والصفحات، ولكل آية التفسير الميسر وتفسير السعدي وتفسير ابن كثير.' },
    listen: { name: 'التلاوة', text: 'استمع إلى السورة أو الآية بأصوات قرّاء من موقع «إم بي ثري قرآن»، ونزّل سورة أو المصحف كاملًا لتسمعه بلا اتصال.' },
    hadith: { name: 'الحديث', text: 'لكل حديث صفحته من «موسوعة الأحاديث النبوية»: نصه ودرجته وتخريجه، وشرحه وفوائده، كما في المصدر.' },
    day: { name: 'بطاقات اليوم', text: "في الصفحة الرئيسية: التاريخ الهجري والميلادي وتحته المناسبة القادمة بحديثها، وآية اليوم، وحديث اليوم من صحيح البخاري أو صحيح مسلم. وتتبع السماء في بطاقة التاريخ وأعلى الصفحة أوقات اليوم، زينةً فقط." },
    prayer: { name: 'الصلاة', text: "مواقيت الصلاة لمكانك بطريقة الحساب الافتراضية لبلدك، ويمكنك تغييرها، ويُعلَّم فيها وقت النهي عن صلاة النافلة حين تكون فيه. واتجاه القبلة مع بوصلة جوالك، والمساجد القريبة منك." },
    adhkar: { name: 'الأذكار والمسبحة', text: 'أذكار الصباح والمساء والصلاة وغيرها بنصها من القرآن الكريم و«موسوعة الأحاديث النبوية»، وأذكار لكل موقف، ومسبحة تعدّ تسبيحك.' },
    calendar: { name: 'التقويم', text: 'الشهر الهجري بتقويم أم القرى، وعليه الأيام التي يُستحب صيامها، والمناسبات بأحاديثها.' },
    goals: { name: 'أهدافي', text: "أهداف تختارها بنفسك وتعدّ أيامها، ومعها «الصلوات الخمس»: علامة لكل صلاة، وعدد الأيام التي صلّيتها فيها كاملة. وكل ذلك على جهازك وحده." },
    names: { name: 'الأسماء الحسنى', text: "اسم من أسماء الله كل يوم في الصفحة الرئيسية، تفتح بطاقته صفحته بشاهده من القرآن الكريم أو السنة، ومنها قائمة الأسماء الحسنى كلها." },
    books: { name: 'كتب العقيدة', text: 'الأصول الثلاثة، وشروط الصلاة، والقواعد الأربع، وكتاب التوحيد، بنصها من «المكتبة الشاملة» مع رابط كل صفحة.' },
    starter: { name: 'مسار البداية', text: 'للجديد على الإسلام: عشر خطوات قصيرة، في كل خطوة سؤال تُعرض إجابته من المصادر المعتمدة.' },
    app: {
      name: 'في تطبيق الجوال',
      text: 'الويدجت على الشاشة الرئيسية: الصلاة القادمة، ومواقيت اليوم، والتاريخ، وآية اليوم، وحديث اليوم، والمسبحة، والأذكار. وتنبيه بوقت كل صلاة تختارها. ونص القرآن الكريم والتفسير الميسر والأذكار في التطبيق نفسه، تقرؤها بلا اتصال.',
    },
  },
  mukhtasarNotHere: 'ولا يتوفر «المختصر» بـ{name}.',
}

const en: AboutStrings = {
  lead: 'The Muslim app shows you texts of the Noble Quran and the Prophet’s Sunnah from approved sources, letter for letter, with their reference and link, along with what helps you through your day.',
  featuresTitle: 'In the app',
  features: {
    ask: { name: 'Ask', text: 'Ask about Islam, its pillars and its acts of worship, in writing or by voice. The app shows the approved text with its reference, and refers anything that needs a fatwa to the qualified authority.' },
    quran: {
      name: 'The Mushaf',
      text: 'The Noble Quran by sura and by page. For each ayah: al-Tafsir al-Muyassar, Tafsir al-Saʿdi and Tafsir Ibn Kathir in Arabic, and its meaning in your language; and, where our server provides it, Tafsir Ibn Kathir (abridged) in English from Quran Foundation.',
    },
    listen: { name: 'Recitation', text: 'Listen to a sura or an ayah in the voices of reciters from mp3quran.net, and download a sura or the whole Quran to listen without a connection.' },
    hadith: {
      name: 'Hadith',
      text: 'Each hadith has its page from the Encyclopedia of Translated Prophetic Hadiths: its text, grade and source, its explanation and benefits, and their translation in your language where the encyclopedia has translated them.',
    },
    day: { name: 'Today’s cards', text: "On the home page: the Hijri and Gregorian date with the next occasion and its hadith beneath it, the ayah of the day, and the hadith of the day from Sahih al-Bukhari or Sahih Muslim. The sky of the date card and of the top of the page follows the times of the day, as decoration only." },
    prayer: { name: 'Prayer', text: "Prayer times for your place, by your country’s default calculation method, which you can change, with the time when voluntary prayer is not prayed marked while you are in it; the qibla direction with your phone’s compass; and the mosques near you." },
    adhkar: {
      name: 'Adhkar and tasbih',
      text: 'Morning, evening, prayer and other adhkar, with their texts from the Noble Quran and the Encyclopedia of Translated Prophetic Hadiths; adhkar for each moment; and a tasbih counter.',
    },
    calendar: { name: 'Calendar', text: 'The Hijri month by the Umm al-Qura calendar, with the days on which fasting is recommended, and the occasions with their hadiths.' },
    goals: { name: 'My goals', text: "Goals you choose yourself, with a count of their days, and «The five prayers»: a mark for each prayer and a count of the days you prayed all five. All on your device only." },
    names: { name: 'Names of Allah', text: "A Name of Allah each day on the home page; its card opens its page with its evidence from the Noble Quran or the Sunnah, and from there the list of all the Beautiful Names." },
    books: { name: 'Books of creed', text: 'al-Usul al-Thalatha, Shurut al-Salah, al-Qawaʿid al-Arbaʿ and Kitab al-Tawhid, as they stand in al-Maktaba al-Shamila, with a link to every page.' },
    starter: { name: 'Start here', text: 'For those new to Islam: ten short steps, each with one question answered from the approved sources.' },
    app: {
      name: 'In the phone app',
      text: 'Home-screen widgets: the next prayer, today’s times, the date, the ayah of the day, the hadith of the day, tasbih and adhkar. An alert at the time of each prayer you choose. The text of the Quran, al-Tafsir al-Muyassar and the adhkar are inside the app, to read without a connection.',
    },
  },
  mukhtasarNotHere: 'Al-Mukhtasar is not available in {name}.',
}

const ur: AboutStrings = {
  lead: '«مسلم» ایپ معتبر مصادر سے قرآنِ کریم اور سنتِ نبوی کے متون ان کے اصل الفاظ، حوالے اور لنک کے ساتھ دکھاتی ہے، اور ساتھ وہ چیزیں بھی جو آپ کے دن میں کام آئیں۔',
  featuresTitle: 'ایپ میں کیا ہے',
  features: {
    ask: { name: 'پوچھیں', text: 'اسلام، اس کے ارکان اور عبادات کے بارے میں لکھ کر یا بول کر پوچھیں۔ ایپ معتبر متن اس کے حوالے کے ساتھ دکھاتی ہے، اور جس سوال کو فتویٰ درکار ہو اسے متعلقہ ادارے کی طرف بھیجتی ہے۔' },
    quran: { name: 'مصحف', text: 'قرآنِ کریم سورت اور صفحے کے مطابق۔ ہر آیت کے ساتھ عربی میں التفسیر المیسر، تفسیر السعدی اور تفسیر ابن کثیر، اور آپ کی زبان میں آیت کا معنی۔' },
    listen: { name: 'تلاوت', text: 'mp3quran.net کے قاریوں کی آواز میں سورت یا آیت سنیں، اور کوئی سورت یا پورا قرآن ڈاؤن لوڈ کر کے انٹرنیٹ کے بغیر سنیں۔' },
    hadith: {
      name: 'حدیث',
      text: 'ہر حدیث کا اپنا صفحہ «موسوعة الأحاديث النبوية» سے: اس کا متن، درجہ اور تخریج، اس کی شرح اور فوائد، اور جہاں موسوعہ نے ترجمہ کیا ہو وہاں آپ کی زبان میں ان کا ترجمہ۔',
    },
    day: { name: 'آج کے کارڈ', text: "ہوم پیج پر: ہجری اور عیسوی تاریخ اور اس کے نیچے اگلا موقع اپنی حدیث کے ساتھ، آج کی آیت، اور صحیح بخاری یا صحیح مسلم سے آج کی حدیث۔ تاریخ کے کارڈ اور صفحے کے اوپر کا آسمان دن کے اوقات کے ساتھ بدلتا ہے، صرف سجاوٹ کے لیے۔" },
    prayer: {
      name: 'نماز',
      text: "آپ کی جگہ کے لیے نماز کے اوقات، آپ کے ملک کے طے شدہ طریقۂ حساب سے، جسے آپ بدل سکتے ہیں، اور جب نفل نماز کا ممنوع وقت ہو تو اس پر نشان؛ اپنے فون کے قطب نما کے ساتھ قبلے کی سمت؛ اور آپ کے قریب کی مساجد۔",
    },
    adhkar: { name: 'اذکار اور تسبیح', text: 'صبح، شام، نماز اور دیگر اذکار، قرآنِ کریم اور «موسوعة الأحاديث النبوية» کے متن کے مطابق؛ ہر موقع کے اذکار؛ اور تسبیح شمار۔' },
    calendar: { name: 'کیلنڈر', text: 'ام القریٰ کیلنڈر کے مطابق ہجری مہینہ، وہ دن جن میں روزہ مستحب ہے، اور مواقع ان کی احادیث کے ساتھ۔' },
    goals: { name: 'میرے اہداف', text: "اہداف جو آپ خود چنیں اور ان کے دنوں کی گنتی، اور «پانچ نمازیں»: ہر نماز کے لیے نشان، اور ان دنوں کی گنتی جن میں آپ نے پانچوں نمازیں پڑھیں۔ یہ سب صرف آپ کے آلے پر۔" },
    names: { name: 'اسمائے حسنیٰ', text: "ہوم پیج پر ہر دن اللہ کا ایک نام؛ اس کا کارڈ اس کا صفحہ کھولتا ہے جس میں قرآنِ کریم یا سنت سے اس کی دلیل ہے، اور وہاں سے تمام اسمائے حسنیٰ کی فہرست۔" },
    books: { name: 'عقیدے کی کتابیں', text: 'الأصول الثلاثة، شروط الصلاة، القواعد الأربع اور کتاب التوحید، «المکتبۃ الشاملہ» کے متن کے مطابق، ہر صفحے کے لنک کے ساتھ۔' },
    starter: { name: 'آغاز کا راستہ', text: 'اسلام میں نئے آنے والوں کے لیے: دس مختصر قدم، ہر قدم میں ایک سوال جس کا جواب معتبر مصادر سے دکھایا جاتا ہے۔' },
    app: {
      name: 'فون ایپ میں',
      text: 'ہوم اسکرین کے ویجیٹ: اگلی نماز، آج کے اوقات، تاریخ، آج کی آیت، آج کی حدیث، تسبیح اور اذکار۔ آپ کی چنی ہوئی ہر نماز کے وقت اطلاع۔ اور قرآنِ کریم کا متن، التفسیر المیسر اور اذکار ایپ کے اندر، انٹرنیٹ کے بغیر پڑھنے کے لیے۔',
    },
  },
  mukhtasarNotHere: '«المختصر» {name} میں دستیاب نہیں۔',
}

const id: AboutStrings = {
  lead: 'Aplikasi Muslim menampilkan teks Al-Qur’an dan Sunnah Nabi dari sumber yang diakui, huruf demi huruf, dengan rujukan dan tautannya, beserta hal-hal yang membantu hari Anda.',
  featuresTitle: 'Isi aplikasi',
  features: {
    ask: {
      name: 'Tanya',
      text: 'Tanyakan tentang Islam, rukun-rukunnya, dan ibadahnya, dengan menulis atau dengan suara. Aplikasi menampilkan teks yang diakui beserta rujukannya, dan merujuk pertanyaan yang memerlukan fatwa kepada lembaga yang berwenang.',
    },
    quran: { name: 'Mushaf', text: 'Al-Qur’an per surah dan per halaman. Untuk setiap ayat: Tafsir al-Muyassar, Tafsir as-Sa’di, dan Tafsir Ibnu Katsir dalam bahasa Arab, serta maknanya dalam bahasa Anda.' },
    listen: { name: 'Tilawah', text: 'Dengarkan surah atau ayat dengan suara para qari dari mp3quran.net, dan unduh satu surah atau seluruh Al-Qur’an untuk didengarkan tanpa koneksi.' },
    hadith: {
      name: 'Hadis',
      text: 'Setiap hadis memiliki halamannya dari Ensiklopedia Hadis Nabi yang Diterjemahkan: teks, derajat, dan takhrijnya, penjelasan dan faedahnya, serta terjemahannya dalam bahasa Anda bila ensiklopedia telah menerjemahkannya.',
    },
    day: { name: 'Kartu hari ini', text: "Di beranda: tanggal Hijriah dan Masehi beserta momen berikutnya dan hadisnya di bawahnya, ayat hari ini, dan hadis hari ini dari Shahih al-Bukhari atau Shahih Muslim. Langit kartu tanggal dan bagian atas halaman mengikuti waktu-waktu hari, sebagai hiasan saja." },
    prayer: { name: 'Salat', text: "Waktu salat untuk tempat Anda dengan metode perhitungan bawaan negara Anda, yang dapat Anda ubah, dengan tanda pada waktu terlarang untuk salat sunah saat Anda berada di dalamnya; arah kiblat dengan kompas ponsel Anda; dan masjid di dekat Anda." },
    adhkar: {
      name: 'Zikir dan tasbih',
      text: 'Zikir pagi, petang, salat, dan lainnya sesuai teks Al-Qur’an dan Ensiklopedia Hadis Nabi yang Diterjemahkan; zikir untuk setiap keadaan; dan penghitung tasbih.',
    },
    calendar: { name: 'Kalender', text: 'Bulan Hijriah menurut kalender Umm al-Qura, dengan hari-hari yang dianjurkan untuk berpuasa serta momen-momen beserta hadisnya.' },
    goals: { name: 'Targetku', text: "Target yang Anda pilih sendiri beserta hitungan harinya, dan «Salat lima waktu»: tanda untuk setiap salat dan hitungan hari Anda menunaikan kelimanya. Semuanya hanya di perangkat Anda." },
    names: { name: 'Asmaul Husna', text: "Satu nama Allah setiap hari di beranda; kartunya membuka halamannya dengan dalilnya dari Al-Qur’an atau Sunnah, dan dari sana daftar seluruh Asmaul Husna." },
    books: { name: 'Kitab akidah', text: 'Al-Ushul ats-Tsalatsah, Syuruth ash-Shalah, al-Qawa’id al-Arba’, dan Kitab at-Tauhid, sesuai teks al-Maktabah asy-Syamilah, dengan tautan ke setiap halaman.' },
    starter: { name: 'Mulai di sini', text: 'Bagi yang baru mengenal Islam: sepuluh langkah singkat, setiap langkah berisi satu pertanyaan yang jawabannya ditampilkan dari sumber yang diakui.' },
    app: {
      name: 'Di aplikasi ponsel',
      text: 'Widget layar utama: salat berikutnya, waktu salat hari ini, tanggal, ayat hari ini, hadis hari ini, tasbih, dan zikir. Pengingat pada waktu setiap salat yang Anda pilih. Teks Al-Qur’an, Tafsir al-Muyassar, dan zikir ada di dalam aplikasi, untuk dibaca tanpa koneksi.',
    },
  },
  mukhtasarNotHere: 'Al-Mukhtasar tidak tersedia dalam bahasa {name}.',
}

const ms: AboutStrings = {
  lead: 'Aplikasi Muslim memaparkan teks Al-Quran dan Sunnah Nabi daripada sumber yang diiktiraf, huruf demi huruf, bersama rujukan dan pautannya, serta perkara yang membantu hari anda.',
  featuresTitle: 'Kandungan aplikasi',
  features: {
    ask: {
      name: 'Tanya',
      text: 'Tanya tentang Islam, rukun-rukunnya dan ibadahnya, secara bertulis atau dengan suara. Aplikasi memaparkan teks yang diiktiraf bersama rujukannya, dan merujuk soalan yang memerlukan fatwa kepada pihak berkuasa yang berkelayakan.',
    },
    quran: { name: 'Mushaf', text: 'Al-Quran mengikut surah dan halaman. Bagi setiap ayat: Tafsir al-Muyassar, Tafsir as-Sa’di dan Tafsir Ibnu Kathir dalam bahasa Arab, serta maknanya dalam bahasa anda.' },
    listen: { name: 'Tilawah', text: 'Dengar surah atau ayat dengan suara para qari dari mp3quran.net, dan muat turun satu surah atau seluruh Al-Quran untuk didengar tanpa sambungan.' },
    hadith: {
      name: 'Hadis',
      text: 'Setiap hadis mempunyai halamannya daripada Ensiklopedia Hadis Nabi yang Diterjemah: teks, darjat dan takhrijnya, syarah dan faedahnya, serta terjemahannya dalam bahasa anda jika ensiklopedia telah menterjemahkannya.',
    },
    day: { name: 'Kad hari ini', text: "Di halaman utama: tarikh Hijrah dan Masihi berserta peristiwa seterusnya dan hadisnya di bawahnya, ayat hari ini, dan hadis hari ini daripada Sahih al-Bukhari atau Sahih Muslim. Langit kad tarikh dan bahagian atas halaman mengikut waktu-waktu hari, sebagai hiasan sahaja." },
    prayer: { name: 'Solat', text: "Waktu solat bagi tempat anda dengan kaedah pengiraan lalai negara anda, yang boleh anda ubah, dengan tanda pada waktu dilarang solat sunat ketika anda berada di dalamnya; arah kiblat dengan kompas telefon anda; dan masjid berhampiran anda." },
    adhkar: {
      name: 'Zikir dan tasbih',
      text: 'Zikir pagi, petang, solat dan lain-lain mengikut teks Al-Quran dan Ensiklopedia Hadis Nabi yang Diterjemah; zikir bagi setiap keadaan; dan pembilang tasbih.',
    },
    calendar: { name: 'Kalendar', text: 'Bulan Hijrah mengikut kalendar Umm al-Qura, dengan hari-hari yang digalakkan berpuasa serta peristiwa bersama hadisnya.' },
    goals: { name: 'Matlamat saya', text: "Matlamat yang anda pilih sendiri bersama kiraan harinya, dan «Solat lima waktu»: tanda bagi setiap solat dan kiraan hari anda menunaikan kelima-limanya. Semuanya pada peranti anda sahaja." },
    names: { name: 'Asmaul Husna', text: "Satu nama Allah setiap hari di halaman utama; kadnya membuka halamannya dengan dalilnya daripada Al-Quran atau Sunnah, dan dari situ senarai semua Asmaul Husna." },
    books: { name: 'Kitab akidah', text: 'Al-Usul ath-Thalathah, Syurut as-Solah, al-Qawa’id al-Arba’ dan Kitab at-Tauhid, mengikut teks al-Maktabah asy-Syamilah, dengan pautan ke setiap halaman.' },
    starter: { name: 'Mula di sini', text: 'Bagi yang baharu mengenali Islam: sepuluh langkah ringkas, setiap langkah dengan satu soalan yang jawapannya dipaparkan daripada sumber yang diiktiraf.' },
    app: {
      name: 'Dalam aplikasi telefon',
      text: 'Widget skrin utama: solat seterusnya, waktu solat hari ini, tarikh, ayat hari ini, hadis hari ini, tasbih dan zikir. Peringatan pada waktu setiap solat yang anda pilih. Teks Al-Quran, Tafsir al-Muyassar dan zikir ada dalam aplikasi, untuk dibaca tanpa sambungan.',
    },
  },
  mukhtasarNotHere: 'Al-Mukhtasar tidak tersedia dalam bahasa {name}.',
}

const tr: AboutStrings = {
  lead: 'Muslim uygulaması, Kur’ân-ı Kerîm’in ve Nebevî sünnetin metinlerini onaylı kaynaklardan, harfi harfine, kaynağı ve bağlantısıyla gösterir; gününüzde size yardımcı olacak şeyleri de sunar.',
  featuresTitle: 'Uygulamada neler var',
  features: {
    ask: { name: 'Sor', text: 'İslam, rükünleri ve ibadetleri hakkında yazarak ya da sesle sorun. Uygulama onaylı metni kaynağıyla gösterir; fetva gerektiren soruları yetkili kuruma yönlendirir.' },
    quran: { name: 'Mushaf', text: 'Kur’ân-ı Kerîm sure ve sayfa düzeninde. Her ayet için Arapça et-Tefsîru’l-Müyesser, Sa’dî tefsiri ve İbn Kesîr tefsiri, ayrıca ayetin kendi dilinizdeki meali.' },
    listen: { name: 'Tilavet', text: 'Sureyi veya ayeti mp3quran.net’teki kârilerin sesinden dinleyin; bir sureyi ya da Kur’an’ın tamamını indirip internetsiz dinleyin.' },
    hadith: {
      name: 'Hadis',
      text: 'Her hadisin Çevrilmiş Nebevî Hadisler Ansiklopedisi’nden kendi sayfası vardır: metni, derecesi ve tahrici, şerhi ve faydaları; ansiklopedi çevirdiyse bunların sizin dilinizdeki çevirisi.',
    },
    day: { name: 'Günün kartları', text: "Ana sayfada: hicrî ve miladî tarih ile altında hadisiyle birlikte sıradaki özel gün, günün ayeti ve Sahîh-i Buhârî ya da Sahîh-i Müslim’den günün hadisi. Tarih kartının ve sayfanın üstündeki gökyüzü günün vakitlerine göre değişir; yalnızca süsleme içindir." },
    prayer: {
      name: 'Namaz',
      text: "Bulunduğunuz yer için, ülkenizin varsayılan hesap yöntemiyle namaz vakitleri (yöntemi değiştirebilirsiniz); nafile namaz kılınmayan vakitteyken bu vakit işaretlenir; telefonunuzun pusulasıyla kıble yönü; ve yakınınızdaki camiler.",
    },
    adhkar: {
      name: 'Zikirler ve tesbih',
      text: 'Sabah, akşam, namaz ve diğer zikirler, Kur’ân-ı Kerîm’deki ve Çevrilmiş Nebevî Hadisler Ansiklopedisi’ndeki metinleriyle; her durumun zikirleri; ve tesbih sayacı.',
    },
    calendar: { name: 'Takvim', text: 'Ümmü’l-Kurâ takvimine göre hicrî ay; oruç tutulması müstehap olan günler ve hadisleriyle birlikte özel günler.' },
    goals: { name: 'Hedeflerim', text: "Kendi seçtiğiniz hedefler ve günlerinin sayısı; ayrıca «Beş vakit namaz»: her namaz için bir işaret ve beş vakti tamamladığınız günlerin sayısı. Hepsi yalnızca cihazınızda." },
    names: { name: 'Esmâ-i Hüsnâ', text: "Ana sayfada her gün Allah’ın bir ismi; kartı, Kur’ân-ı Kerîm’den veya sünnetten deliliyle ismin sayfasını açar, oradan da bütün Esmâ-i Hüsnâ listesine ulaşılır." },
    books: { name: 'Akaid kitapları', text: 'el-Usûlü’s-Selâse, Şurûtu’s-Salât, el-Kavâidü’l-Erba ve Kitâbü’t-Tevhîd; el-Mektebetü’ş-Şâmile’deki metinleriyle ve her sayfanın bağlantısıyla.' },
    starter: { name: 'Buradan başlayın', text: 'İslam’ı yeni tanıyanlar için: on kısa adım; her adımda, cevabı onaylı kaynaklardan gösterilen bir soru.' },
    app: {
      name: 'Telefon uygulamasında',
      text: 'Ana ekran widget’ları: sıradaki namaz, bugünün vakitleri, tarih, günün ayeti, günün hadisi, tesbih ve zikirler. Seçtiğiniz her namazın vaktinde bildirim. Kur’ân-ı Kerîm metni, et-Tefsîru’l-Müyesser ve zikirler uygulamanın içinde; internetsiz okunur.',
    },
  },
  mukhtasarNotHere: 'El-Muhtasar {name} dilinde mevcut değil.',
}

const fr: AboutStrings = {
  lead: 'L’application Muslim vous présente des textes du Noble Coran et de la Sunna prophétique issus de sources reconnues, lettre pour lettre, avec leur référence et leur lien, ainsi que ce qui vous aide au fil de la journée.',
  featuresTitle: 'Dans l’application',
  features: {
    ask: {
      name: 'Demander',
      text: 'Posez vos questions sur l’islam, ses piliers et ses actes d’adoration, par écrit ou à la voix. L’application affiche le texte reconnu avec sa référence et renvoie toute question qui demande une fatwa à l’autorité compétente.',
    },
    quran: { name: 'Le Mushaf', text: 'Le Noble Coran par sourate et par page. Pour chaque verset : Tafsir al-Muyassar, Tafsir as-Saʿdi et Tafsir d’Ibn Kathîr en arabe, et le sens du verset dans votre langue.' },
    listen: { name: 'Récitation', text: 'Écoutez une sourate ou un verset par la voix de récitateurs de mp3quran.net, et téléchargez une sourate ou le Coran entier pour l’écouter sans connexion.' },
    hadith: {
      name: 'Hadith',
      text: 'Chaque hadith a sa page tirée de l’Encyclopédie des hadiths prophétiques traduits : son texte, son degré et sa source, son explication et ses enseignements, et leur traduction dans votre langue lorsque l’encyclopédie les a traduits.',
    },
    day: { name: 'Cartes du jour', text: "Sur la page d’accueil : la date hégirienne et grégorienne, avec en dessous la prochaine occasion et son hadith, le verset du jour et le hadith du jour tiré du Sahih d’al-Boukhari ou du Sahih de Muslim. Le ciel de la carte de la date et du haut de la page suit les moments de la journée, à titre de décor seulement." },
    prayer: {
      name: 'Prière',
      text: "Les horaires de prière pour votre lieu, selon la méthode de calcul par défaut de votre pays, que vous pouvez changer, avec le moment où la prière surérogatoire n’est pas faite signalé lorsque vous y êtes ; la direction de la qibla avec la boussole de votre téléphone ; et les mosquées proches de vous.",
    },
    adhkar: {
      name: 'Adhkar et tasbih',
      text: 'Les adhkar du matin, du soir, de la prière et d’autres, avec leurs textes du Noble Coran et de l’Encyclopédie des hadiths prophétiques traduits ; des invocations pour chaque moment ; et un compteur de tasbih.',
    },
    calendar: { name: 'Calendrier', text: 'Le mois hégirien selon le calendrier Umm al-Qura, avec les jours où le jeûne est recommandé et les occasions avec leurs hadiths.' },
    goals: { name: 'Mes objectifs', text: "Des objectifs que vous choisissez vous-même, avec le compte de leurs jours, et « Les cinq prières » : une marque pour chaque prière et le compte des jours où vous les avez toutes accomplies. Le tout sur votre appareil uniquement." },
    names: { name: 'Noms d’Allah', text: "Un nom d’Allah chaque jour sur la page d’accueil ; sa carte ouvre sa page avec sa preuve tirée du Noble Coran ou de la Sunna, et de là la liste de tous les plus beaux noms." },
    books: {
      name: 'Livres de croyance',
      text: 'Al-Usul ath-Thalatha, Shurut as-Salat, al-Qawaʿid al-Arbaʿ et Kitab at-Tawhid, tels qu’ils figurent dans al-Maktaba al-Shamila, avec un lien vers chaque page.',
    },
    starter: { name: 'Commencer ici', text: 'Pour qui découvre l’islam : dix courtes étapes, chacune avec une question dont la réponse est tirée des sources reconnues.' },
    app: {
      name: 'Dans l’application mobile',
      text: 'Des widgets pour l’écran d’accueil : prochaine prière, horaires du jour, date, verset du jour, hadith du jour, tasbih et adhkar. Une alerte à l’heure de chaque prière que vous choisissez. Le texte du Coran, al-Tafsir al-Muyassar et les adhkar sont dans l’application, à lire sans connexion.',
    },
  },
  mukhtasarNotHere: 'Al-Mukhtasar n’est pas disponible en {name}.',
}

const es: AboutStrings = {
  lead: 'La aplicación Muslim te muestra textos del Noble Corán y de la Sunna profética de fuentes reconocidas, letra por letra, con su referencia y su enlace, y lo que te ayuda en tu día.',
  featuresTitle: 'En la aplicación',
  features: {
    ask: {
      name: 'Preguntar',
      text: 'Pregunta sobre el islam, sus pilares y sus actos de adoración, por escrito o con tu voz. La aplicación muestra el texto reconocido con su referencia y remite a la autoridad competente lo que requiere una fetua.',
    },
    quran: { name: 'El Mushaf', text: 'El Noble Corán por sura y por página. Para cada aleya: Tafsir al-Muyassar, Tafsir as-Sa’di y Tafsir de Ibn Kazir en árabe, y su significado en tu idioma.' },
    listen: { name: 'Recitación', text: 'Escucha una sura o una aleya con la voz de recitadores de mp3quran.net, y descarga una sura o el Corán completo para escucharlo sin conexión.' },
    hadith: {
      name: 'Hadiz',
      text: 'Cada hadiz tiene su página de la Enciclopedia de Hadices Proféticos Traducidos: su texto, su grado y su fuente, su explicación y sus enseñanzas, y su traducción a tu idioma cuando la enciclopedia los ha traducido.',
    },
    day: { name: 'Tarjetas del día', text: "En la página de inicio: la fecha de la hégira y la gregoriana, con la próxima ocasión y su hadiz debajo, la aleya del día y el hadiz del día del Sahih de al-Bujari o del Sahih de Muslim. El cielo de la tarjeta de la fecha y de la parte superior de la página sigue los momentos del día, solo como adorno." },
    prayer: {
      name: 'Oración',
      text: "Los horarios de oración para tu lugar, con el método de cálculo predeterminado de tu país, que puedes cambiar, y marcado el tiempo en que no se hace la oración voluntaria mientras estás en él; la dirección de la qibla con la brújula de tu teléfono; y las mezquitas cercanas.",
    },
    adhkar: {
      name: 'Adhkar y tasbih',
      text: 'Los adhkar de la mañana, de la tarde, de la oración y otros, con sus textos del Noble Corán y de la Enciclopedia de Hadices Proféticos Traducidos; adhkar para cada momento; y un contador de tasbih.',
    },
    calendar: { name: 'Calendario', text: 'El mes de la hégira según el calendario Umm al-Qura, con los días en que se recomienda ayunar y las ocasiones con sus hadices.' },
    goals: { name: 'Mis metas', text: "Metas que eliges tú, con la cuenta de sus días, y «Las cinco oraciones»: una marca para cada oración y la cuenta de los días en que hiciste las cinco. Todo solo en tu dispositivo." },
    names: { name: 'Nombres de Allah', text: "Un nombre de Allah cada día en la página de inicio; su tarjeta abre su página con su prueba del Noble Corán o de la Sunna, y desde allí la lista de todos los más bellos nombres." },
    books: {
      name: 'Libros de creencia',
      text: 'Al-Usul az-Zalaza, Shurut as-Salat, al-Qawa’id al-Arba’ y Kitab at-Tawhid, tal como están en al-Maktaba al-Shamila, con un enlace a cada página.',
    },
    starter: { name: 'Empieza aquí', text: 'Para quien se acerca al islam: diez pasos breves, cada uno con una pregunta cuya respuesta se muestra de las fuentes reconocidas.' },
    app: {
      name: 'En la aplicación del teléfono',
      text: 'Widgets para la pantalla de inicio: próxima oración, horarios de hoy, fecha, aleya del día, hadiz del día, tasbih y adhkar. Un aviso a la hora de cada oración que elijas. El texto del Corán, al-Tafsir al-Muyassar y los adhkar están dentro de la aplicación, para leerlos sin conexión.',
    },
  },
  mukhtasarNotHere: 'Al-Mujtasar no está disponible en {name}.',
}

const bn: AboutStrings = {
  lead: '«মুসলিম» অ্যাপ স্বীকৃত উৎস থেকে কুরআনুল কারীম ও নবীজির সুন্নাহর পাঠ হুবহু, তার সূত্র ও লিংকসহ দেখায়, সঙ্গে আপনার দিনের কাজে আসে এমন বিষয়ও।',
  featuresTitle: 'অ্যাপে যা আছে',
  features: {
    ask: {
      name: 'জিজ্ঞাসা',
      text: 'ইসলাম, এর রুকনসমূহ ও ইবাদত সম্পর্কে লিখে বা কণ্ঠে প্রশ্ন করুন। অ্যাপ স্বীকৃত পাঠ তার সূত্রসহ দেখায়, আর যে প্রশ্নে ফতোয়া প্রয়োজন তা যথাযথ কর্তৃপক্ষের কাছে পাঠিয়ে দেয়।',
    },
    quran: { name: 'মুসহাফ', text: "কুরআনুল কারীম সূরা ও পৃষ্ঠা অনুযায়ী। প্রতিটি আয়াতের সঙ্গে আরবিতে তাফসীরুল মুয়াস্সার, তাফসীরে সা'দী ও তাফসীরে ইবনে কাসীর, এবং আপনার ভাষায় আয়াতের অর্থ।" },
    listen: { name: 'তিলাওয়াত', text: 'mp3quran.net-এর কারীদের কণ্ঠে সূরা বা আয়াত শুনুন, এবং কোনো সূরা বা পুরো কুরআন ডাউনলোড করে ইন্টারনেট ছাড়া শুনুন।' },
    hadith: {
      name: 'হাদীস',
      text: 'প্রতিটি হাদীসের নিজস্ব পৃষ্ঠা «অনূদিত নববী হাদিস বিশ্বকোষ» থেকে: এর পাঠ, মান ও তাখরীজ, ব্যাখ্যা ও শিক্ষা, এবং বিশ্বকোষ অনুবাদ করে থাকলে আপনার ভাষায় সেগুলোর অনুবাদ।',
    },
    day: { name: 'আজকের কার্ড', text: "হোম পেজে: হিজরি ও ইংরেজি তারিখ এবং তার নিচে হাদীসসহ পরবর্তী বিশেষ দিন, আজকের আয়াত, এবং সহীহ বুখারী বা সহীহ মুসলিম থেকে আজকের হাদীস। তারিখের কার্ড ও পৃষ্ঠার উপরের আকাশ দিনের সময় অনুযায়ী বদলায়, কেবল সাজসজ্জা হিসেবে।" },
    prayer: {
      name: 'নামাজ',
      text: "আপনার স্থানের নামাজের সময়, আপনার দেশের ডিফল্ট হিসাব-পদ্ধতিতে, যা আপনি বদলাতে পারেন, আর নফল নামাজ না পড়ার সময়ে থাকলে তা চিহ্নিত; আপনার ফোনের কম্পাস দিয়ে কিবলার দিক; এবং আপনার কাছের মসজিদ।",
    },
    adhkar: {
      name: 'যিকির ও তাসবিহ',
      text: 'সকাল, সন্ধ্যা, নামাজ ও অন্যান্য যিকির, কুরআনুল কারীম ও «অনূদিত নববী হাদিস বিশ্বকোষ»-এর পাঠ অনুযায়ী; প্রতিটি মুহূর্তের যিকির; এবং তাসবিহ গণনার যন্ত্র।',
    },
    calendar: { name: 'ক্যালেন্ডার', text: 'উম্মুল কুরা ক্যালেন্ডার অনুযায়ী হিজরি মাস, যেসব দিনে রোজা রাখা মুস্তাহাব সেগুলো, এবং হাদীসসহ বিশেষ দিনসমূহ।' },
    goals: { name: 'আমার লক্ষ্য', text: "আপনার নিজের বেছে নেওয়া লক্ষ্য ও তার দিনের হিসাব, এবং «পাঁচ ওয়াক্ত নামাজ»: প্রতিটি নামাজের জন্য একটি চিহ্ন, আর যেসব দিনে পাঁচ ওয়াক্তই পড়েছেন তার হিসাব। সবই কেবল আপনার ডিভাইসে।" },
    names: { name: 'আসমাউল হুসনা', text: "হোম পেজে প্রতিদিন আল্লাহর একটি নাম; তার কার্ড কুরআনুল কারীম বা সুন্নাহ থেকে দলিলসহ নামটির পৃষ্ঠা খোলে, আর সেখান থেকে সব আসমাউল হুসনার তালিকা।" },
    books: { name: 'আকীদার কিতাব', text: 'আল-উসূলুস সালাসা, শুরূতুস সালাত, আল-কাওয়াইদুল আরবা ও কিতাবুত তাওহীদ, আল-মাকতাবা আশ-শামিলার পাঠ অনুযায়ী, প্রতিটি পৃষ্ঠার লিংকসহ।' },
    starter: { name: 'এখান থেকে শুরু', text: 'ইসলামে নতুনদের জন্য: দশটি ছোট ধাপ, প্রতিটি ধাপে একটি প্রশ্ন, যার উত্তর স্বীকৃত উৎস থেকে দেখানো হয়।' },
    app: {
      name: 'ফোনের অ্যাপে',
      text: 'হোম স্ক্রিনের উইজেট: পরবর্তী নামাজ, আজকের সময়সূচি, তারিখ, আজকের আয়াত, আজকের হাদীস, তাসবিহ ও যিকির। আপনার বেছে নেওয়া প্রতিটি নামাজের সময়ে সতর্কবার্তা। কুরআনুল কারীমের পাঠ, তাফসীরুল মুয়াস্সার ও যিকির অ্যাপের ভেতরেই, ইন্টারনেট ছাড়া পড়ার জন্য।',
    },
  },
  mukhtasarNotHere: '«আল-মুখতাসার» {name} ভাষায় পাওয়া যায় না।',
}

const hi: AboutStrings = {
  lead: '«मुस्लिम» ऐप मान्य स्रोतों से क़ुरआन करीम और नबवी सुन्नत के पाठ अक्षरशः, उनके हवाले और लिंक के साथ दिखाता है, और साथ में वे चीज़ें भी जो आपके दिन में काम आएँ।',
  featuresTitle: 'ऐप में क्या है',
  features: {
    ask: {
      name: 'पूछें',
      text: 'इस्लाम, उसके स्तंभों और इबादतों के बारे में लिखकर या बोलकर पूछें। ऐप मान्य पाठ उसके हवाले के साथ दिखाता है, और जिस प्रश्न के लिए फ़तवा चाहिए उसे संबंधित संस्था की ओर भेजता है।',
    },
    quran: { name: 'मुसहफ़', text: 'क़ुरआन करीम सूरा और पृष्ठ के अनुसार। हर आयत के साथ अरबी में तफ़सीर अल-मुयस्सर, तफ़सीर अस-सादी और तफ़सीर इब्ने कसीर, और आपकी भाषा में आयत का अर्थ।' },
    listen: { name: 'तिलावत', text: 'mp3quran.net के क़ारियों की आवाज़ में सूरा या आयत सुनें, और कोई सूरा या पूरा क़ुरआन डाउनलोड करके इंटरनेट के बिना सुनें।' },
    hadith: {
      name: 'हदीस',
      text: 'हर हदीस का अपना पृष्ठ «अनूदित नबवी हदीस विश्वकोश» से: उसका पाठ, दर्जा और तख़रीज, उसकी व्याख्या और सीख, और जहाँ विश्वकोश ने अनुवाद किया हो वहाँ आपकी भाषा में उनका अनुवाद।',
    },
    day: { name: 'आज के कार्ड', text: "होम पेज पर: हिजरी और ग्रेगोरियन तारीख़ और उसके नीचे अपनी हदीस के साथ अगला अवसर, आज की आयत, और सहीह बुख़ारी या सहीह मुस्लिम से आज की हदीस। तारीख़ के कार्ड और पृष्ठ के ऊपर का आसमान दिन के समयों के साथ बदलता है, केवल सजावट के लिए।" },
    prayer: {
      name: 'नमाज़',
      text: "आपकी जगह के लिए नमाज़ के समय, आपके देश की डिफ़ॉल्ट गणना-पद्धति से, जिसे आप बदल सकते हैं, और जब नफ़्ल नमाज़ न पढ़ने का समय हो तो उस पर निशान; आपके फ़ोन के कंपास से क़िबले की दिशा; और आपके पास की मस्जिदें।",
    },
    adhkar: {
      name: 'अज़कार और तस्बीह',
      text: 'सुबह, शाम, नमाज़ और दूसरे अज़कार, क़ुरआन करीम और «अनूदित नबवी हदीस विश्वकोश» के पाठ के अनुसार; हर मौक़े के अज़कार; और तस्बीह गिनने का साधन।',
    },
    calendar: { name: 'कैलेंडर', text: 'उम्मुल-क़ुरा कैलेंडर के अनुसार हिजरी महीना, जिन दिनों रोज़ा रखना मुस्तहब है वे दिन, और हदीसों के साथ विशेष अवसर।' },
    goals: { name: 'मेरे लक्ष्य', text: "लक्ष्य जो आप ख़ुद चुनें और उनके दिनों की गिनती, और «पाँच वक़्त की नमाज़»: हर नमाज़ के लिए एक निशान, और उन दिनों की गिनती जिनमें आपने पाँचों नमाज़ें पढ़ीं। सब केवल आपके डिवाइस पर।" },
    names: { name: 'अस्मा-उल-हुस्ना', text: "होम पेज पर हर दिन अल्लाह का एक नाम; उसका कार्ड क़ुरआन करीम या सुन्नत से उसके प्रमाण के साथ उसका पृष्ठ खोलता है, और वहाँ से सभी अस्मा-उल-हुस्ना की सूची।" },
    books: { name: 'अक़ीदा की किताबें', text: 'अल-उसूल अस-सलासा, शुरूत अस-सलात, अल-क़वाइद अल-अरबा और किताब अत-तौहीद, अल-मकतबा अश-शामिला के पाठ के अनुसार, हर पृष्ठ के लिंक के साथ।' },
    starter: { name: 'यहाँ से शुरू करें', text: 'इस्लाम में नए लोगों के लिए: दस छोटे क़दम, हर क़दम में एक प्रश्न जिसका उत्तर मान्य स्रोतों से दिखाया जाता है।' },
    app: {
      name: 'फ़ोन ऐप में',
      text: 'होम स्क्रीन के विजेट: अगली नमाज़, आज के समय, तारीख़, आज की आयत, आज की हदीस, तस्बीह और अज़कार। आपकी चुनी हर नमाज़ के समय सूचना। क़ुरआन करीम का पाठ, तफ़सीर अल-मुयस्सर और अज़कार ऐप के अंदर ही, इंटरनेट के बिना पढ़ने के लिए।',
    },
  },
  mukhtasarNotHere: '«अल-मुख़्तसर» {name} में उपलब्ध नहीं है।',
}

export const ABOUT: Record<Lang, AboutStrings> = { ar, en, ur, id, ms, tr, fr, es, bn, hi }

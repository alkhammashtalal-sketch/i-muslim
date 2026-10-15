// The Android app's own texts (reply 0067 and its add-on 0067-add1), in the app's ten languages: Arabic and English reviewed, the other eight
// machine translation like the rest of the interface (CLAUDE.md §4). Only what the Android app says differently from
// the iPhone's: the mosques tile's line, the three ways to open a dhikr by itself (instead of Siri and Shortcuts), the
// two buttons on a dhikr's page, and how to install a voice for reading replies aloud. No sacred text here.
import type { Lang } from '../../../../shared/api'

export type AndroidStrings = {
  /** Under «المساجد القريبة» on «يومك» (add-on 0067-add1): the tile opens Google Maps. */
  mapsNote: string
  /** «افتحها تلقائيًا»'s second line on the grid, for Android's three ways. */
  autoSub: string
  iconTitle: string
  iconBody: string
  iconSteps: string[]
  homeTitle: string
  homeBody: string
  homeSteps: string[]
  nfcBody: string
  nfcSteps: string[]
  nfcNeeds: string
  ourPart: string
  /** On a dhikr's page. */
  pin: string
  copyLink: string
  copied: string
  /** The voice conversation: no voice of the language on the phone. */
  voiceMissing: string
  installVoice: string
}

const ar: AndroidStrings = {
  mapsNote: 'يفتح في خرائط Google',
  autoSub: 'من أيقونة التطبيق، أو من شاشتك الرئيسية، أو بلمسة ملصق',
  iconTitle: 'من أيقونة التطبيق',
  iconBody: 'اضغط مطوّلًا على أيقونة «مسلم» تظهر أذكار الصباح والمساء والسفر والنوم، والمس أحدها يفتح مباشرة.',
  iconSteps: ['اضغط مطوّلًا على أيقونة «مسلم».', 'المس الذكر الذي تريده.', 'ولو سحبته إلى الشاشة الرئيسية صار له أيقونة وحده.'],
  homeTitle: 'على شاشتك الرئيسية',
  homeBody: 'أي موقف تضيفه إلى شاشتك الرئيسية يصير له أيقونة تفتحه بلمسة.',
  homeSteps: ['افتح الموقف من «أذكار».', 'اضغط «أضف إلى الشاشة الرئيسية» تحت الذكر.', 'وافق على الإضافة.'],
  nfcBody: 'مثل التعليقة: ألصقه في السيارة أو جنب سريرك، تقرّب الجوال منه فيفتح الذكر اللي تختاره. أي ملصق NFC يكفي.',
  nfcSteps: ['افتح الموقف من «أذكار»، واضغط «انسخ رابط الملصق».', 'افتح أي تطبيق يكتب ملصقات NFC، واختر كتابة رابط.', 'الصق الرابط، وقرّب الجوال من الملصق.', 'بعدها كلما قرّبت الجوال منه فتح الذكر.'],
  nfcNeeds: 'يحتاج جوالًا فيه NFC، وأن يكون مفعّلًا.',
  ourPart: 'نحن نجهّز الأيقونات والروابط، وأنت تختار ما تضيفه.',
  pin: 'أضف إلى الشاشة الرئيسية',
  copyLink: 'انسخ رابط الملصق',
  copied: 'نُسخ الرابط',
  voiceMissing: 'لا يوجد في جوالك صوت لهذه اللغة. ثبّته من: الإعدادات ← النظام ← اللغات ← تحويل النص إلى كلام ← محرك Google ← تثبيت بيانات الصوت.',
  installVoice: 'ثبّت الصوت',
}

const en: AndroidStrings = {
  mapsNote: 'Opens in Google Maps',
  autoSub: 'From the app icon, your home screen, or a tap on a tag',
  iconTitle: 'From the app icon',
  iconBody: 'Touch and hold the Muslim icon to see the morning, evening, travel and sleep adhkar; tap one and it opens.',
  iconSteps: ['Touch and hold the Muslim icon.', 'Tap the dhikr you want.', 'Drag it to your home screen and it gets an icon of its own.'],
  homeTitle: 'On your home screen',
  homeBody: 'Any moment you add to your home screen gets an icon that opens it with one tap.',
  homeSteps: ['Open the moment from Adhkar.', 'Tap "Add to home screen" under the dhikr.', 'Confirm the addition.'],
  nfcBody: 'Like a hang tag: stick it in the car or by your bed, bring the phone close and the dhikr you chose opens. Any NFC tag will do.',
  nfcSteps: ['Open the moment from Adhkar and tap "Copy the tag link".', 'Open any app that writes NFC tags and choose to write a link.', 'Paste the link and hold the phone to the tag.', 'From then on, the dhikr opens whenever the phone touches it.'],
  nfcNeeds: 'Needs a phone with NFC, turned on.',
  ourPart: 'We prepare the icons and links; you choose what to add.',
  pin: 'Add to home screen',
  copyLink: 'Copy the tag link',
  copied: 'Link copied',
  voiceMissing: 'Your phone has no voice for this language. Install one in Settings → System → Languages → Text-to-speech → Google engine → Install voice data.',
  installVoice: 'Install a voice',
}

const ur: AndroidStrings = {
  mapsNote: 'Google Maps میں کھلتا ہے',
  autoSub: 'ایپ کے آئیکن سے، ہوم اسکرین سے، یا ٹیگ چھو کر',
  iconTitle: 'ایپ کے آئیکن سے',
  iconBody: '«مسلم» کے آئیکن کو دبا کر رکھیں تو صبح، شام، سفر اور نیند کے اذکار نظر آئیں گے؛ کسی ایک کو چھوئیں تو وہ کھل جائے گا۔',
  iconSteps: ['«مسلم» کے آئیکن کو دبا کر رکھیں۔', 'جو ذکر چاہیں اسے چھوئیں۔', 'اسے ہوم اسکرین پر کھینچ لیں تو اس کا اپنا آئیکن بن جائے گا۔'],
  homeTitle: 'آپ کی ہوم اسکرین پر',
  homeBody: 'جو موقع آپ ہوم اسکرین پر شامل کریں اس کا ایک آئیکن بن جاتا ہے جو ایک چھونے سے کھلتا ہے۔',
  homeSteps: ['«اذکار» سے موقع کھولیں۔', 'ذکر کے نیچے «ہوم اسکرین پر شامل کریں» دبائیں۔', 'شامل کرنے کی تصدیق کریں۔'],
  nfcBody: 'لٹکنے والے ٹیگ کی طرح: اسے گاڑی میں یا بستر کے پاس چپکا دیں، فون قریب لائیں تو آپ کا چنا ہوا ذکر کھل جائے گا۔ کوئی بھی NFC ٹیگ کافی ہے۔',
  nfcSteps: ['«اذکار» سے موقع کھولیں اور «ٹیگ کا لنک کاپی کریں» دبائیں۔', 'NFC ٹیگ لکھنے والی کوئی بھی ایپ کھولیں اور لنک لکھنا چنیں۔', 'لنک پیسٹ کریں اور فون کو ٹیگ کے قریب رکھیں۔', 'اس کے بعد جب بھی فون اسے چھوئے گا ذکر کھل جائے گا۔'],
  nfcNeeds: 'ایسا فون چاہیے جس میں NFC ہو اور آن ہو۔',
  ourPart: 'ہم آئیکن اور لنک تیار کرتے ہیں؛ آپ چنتے ہیں کہ کیا شامل کریں۔',
  pin: 'ہوم اسکرین پر شامل کریں',
  copyLink: 'ٹیگ کا لنک کاپی کریں',
  copied: 'لنک کاپی ہو گیا',
  voiceMissing: 'آپ کے فون میں اس زبان کی آواز نہیں۔ اسے انسٹال کریں: سیٹنگز ← سسٹم ← زبانیں ← ٹیکسٹ ٹو اسپیچ ← Google انجن ← آواز کا ڈیٹا انسٹال کریں۔',
  installVoice: 'آواز انسٹال کریں',
}

const id: AndroidStrings = {
  mapsNote: 'Dibuka di Google Maps',
  autoSub: 'Dari ikon aplikasi, layar utama, atau sentuhan pada tag',
  iconTitle: 'Dari ikon aplikasi',
  iconBody: 'Sentuh lama ikon Muslim untuk melihat zikir pagi, petang, safar, dan tidur; ketuk salah satunya dan langsung terbuka.',
  iconSteps: ['Sentuh lama ikon Muslim.', 'Ketuk zikir yang Anda inginkan.', 'Seret ke layar utama dan ia mendapat ikon sendiri.'],
  homeTitle: 'Di layar utama Anda',
  homeBody: 'Setiap momen yang Anda tambahkan ke layar utama mendapat ikon yang membukanya dengan satu ketukan.',
  homeSteps: ['Buka momen dari Zikir.', 'Ketuk "Tambahkan ke layar utama" di bawah zikir.', 'Setujui penambahannya.'],
  nfcBody: 'Seperti gantungan: tempelkan di mobil atau di samping tempat tidur, dekatkan ponsel dan zikir pilihan Anda terbuka. Tag NFC apa pun bisa.',
  nfcSteps: ['Buka momen dari Zikir dan ketuk "Salin tautan tag".', 'Buka aplikasi apa pun yang menulis tag NFC dan pilih menulis tautan.', 'Tempel tautannya dan dekatkan ponsel ke tag.', 'Setelah itu zikir terbuka setiap kali ponsel menyentuhnya.'],
  nfcNeeds: 'Perlu ponsel dengan NFC yang aktif.',
  ourPart: 'Kami menyiapkan ikon dan tautan; Anda memilih apa yang ditambahkan.',
  pin: 'Tambahkan ke layar utama',
  copyLink: 'Salin tautan tag',
  copied: 'Tautan disalin',
  voiceMissing: 'Ponsel Anda tidak memiliki suara untuk bahasa ini. Pasang di Setelan → Sistem → Bahasa → Text-to-speech → Mesin Google → Pasang data suara.',
  installVoice: 'Pasang suara',
}

const ms: AndroidStrings = {
  mapsNote: 'Dibuka dalam Google Maps',
  autoSub: 'Dari ikon aplikasi, skrin utama, atau sentuhan pada tag',
  iconTitle: 'Dari ikon aplikasi',
  iconBody: 'Sentuh lama ikon Muslim untuk melihat zikir pagi, petang, musafir dan tidur; ketik salah satu dan ia terus dibuka.',
  iconSteps: ['Sentuh lama ikon Muslim.', 'Ketik zikir yang anda mahu.', 'Seret ke skrin utama dan ia mendapat ikon sendiri.'],
  homeTitle: 'Pada skrin utama anda',
  homeBody: 'Setiap situasi yang anda tambah ke skrin utama mendapat ikon yang membukanya dengan satu ketikan.',
  homeSteps: ['Buka situasi dari Zikir.', 'Ketik "Tambah ke skrin utama" di bawah zikir.', 'Sahkan penambahan.'],
  nfcBody: 'Seperti tag gantung: lekatkan di kereta atau di sisi katil, dekatkan telefon dan zikir pilihan anda dibuka. Mana-mana tag NFC sudah memadai.',
  nfcSteps: ['Buka situasi dari Zikir dan ketik "Salin pautan tag".', 'Buka mana-mana aplikasi yang menulis tag NFC dan pilih untuk menulis pautan.', 'Tampal pautan dan dekatkan telefon pada tag.', 'Selepas itu zikir dibuka setiap kali telefon menyentuhnya.'],
  nfcNeeds: 'Memerlukan telefon dengan NFC yang dihidupkan.',
  ourPart: 'Kami sediakan ikon dan pautan; anda pilih apa yang ditambah.',
  pin: 'Tambah ke skrin utama',
  copyLink: 'Salin pautan tag',
  copied: 'Pautan disalin',
  voiceMissing: 'Telefon anda tiada suara untuk bahasa ini. Pasang di Tetapan → Sistem → Bahasa → Teks ke pertuturan → Enjin Google → Pasang data suara.',
  installVoice: 'Pasang suara',
}

const tr: AndroidStrings = {
  mapsNote: "Google Haritalar'da açılır",
  autoSub: 'Uygulama simgesinden, ana ekranınızdan veya bir etikete dokunarak',
  iconTitle: 'Uygulama simgesinden',
  iconBody: 'Muslim simgesine basılı tutun; sabah, akşam, yolculuk ve uyku zikirleri görünür. Birine dokunun, hemen açılır.',
  iconSteps: ['Muslim simgesine basılı tutun.', 'İstediğiniz zikre dokunun.', 'Ana ekrana sürüklerseniz kendi simgesi olur.'],
  homeTitle: 'Ana ekranınızda',
  homeBody: 'Ana ekranınıza eklediğiniz her durumun, onu tek dokunuşla açan bir simgesi olur.',
  homeSteps: ['Durumu Zikirler bölümünden açın.', 'Zikrin altındaki "Ana ekrana ekle"ye dokunun.', 'Eklemeyi onaylayın.'],
  nfcBody: 'Bir askı etiketi gibi: arabaya veya yatağınızın yanına yapıştırın, telefonu yaklaştırın ve seçtiğiniz zikir açılsın. Herhangi bir NFC etiketi yeterli.',
  nfcSteps: ['Durumu Zikirler bölümünden açın ve "Etiket bağlantısını kopyala"ya dokunun.', 'NFC etiketi yazan herhangi bir uygulamayı açın ve bağlantı yazmayı seçin.', 'Bağlantıyı yapıştırın ve telefonu etikete yaklaştırın.', 'Bundan sonra telefon ona her dokunduğunda zikir açılır.'],
  nfcNeeds: 'NFC özellikli ve NFC\'si açık bir telefon gerekir.',
  ourPart: 'Simgeleri ve bağlantıları biz hazırlarız; neyi ekleyeceğinizi siz seçersiniz.',
  pin: 'Ana ekrana ekle',
  copyLink: 'Etiket bağlantısını kopyala',
  copied: 'Bağlantı kopyalandı',
  voiceMissing: 'Telefonunuzda bu dil için bir ses yok. Ayarlar → Sistem → Diller → Metin okuma → Google motoru → Ses verilerini yükle yolundan yükleyin.',
  installVoice: 'Ses yükle',
}

const fr: AndroidStrings = {
  mapsNote: 'S’ouvre dans Google Maps',
  autoSub: 'Depuis l’icône de l’application, votre écran d’accueil ou un tag',
  iconTitle: 'Depuis l’icône de l’application',
  iconBody: 'Appuyez longuement sur l’icône Muslim pour voir les adhkar du matin, du soir, du voyage et du sommeil ; touchez-en un et il s’ouvre.',
  iconSteps: ['Appuyez longuement sur l’icône Muslim.', 'Touchez le dhikr voulu.', 'Faites-le glisser sur l’écran d’accueil pour lui donner sa propre icône.'],
  homeTitle: 'Sur votre écran d’accueil',
  homeBody: 'Chaque moment ajouté à votre écran d’accueil a une icône qui l’ouvre d’un geste.',
  homeSteps: ['Ouvrez le moment depuis Adhkar.', 'Touchez « Ajouter à l’écran d’accueil » sous le dhikr.', 'Confirmez l’ajout.'],
  nfcBody: 'Comme une étiquette : collez-le dans la voiture ou près de votre lit, approchez le téléphone et le dhikr choisi s’ouvre. N’importe quel tag NFC convient.',
  nfcSteps: ['Ouvrez le moment depuis Adhkar et touchez « Copier le lien du tag ».', 'Ouvrez une application qui écrit des tags NFC et choisissez d’écrire un lien.', 'Collez le lien et approchez le téléphone du tag.', 'Ensuite, le dhikr s’ouvre chaque fois que le téléphone le touche.'],
  nfcNeeds: 'Nécessite un téléphone avec NFC activé.',
  ourPart: 'Nous préparons les icônes et les liens ; vous choisissez quoi ajouter.',
  pin: 'Ajouter à l’écran d’accueil',
  copyLink: 'Copier le lien du tag',
  copied: 'Lien copié',
  voiceMissing: 'Votre téléphone n’a pas de voix pour cette langue. Installez-en une : Paramètres → Système → Langues → Synthèse vocale → Moteur Google → Installer les données vocales.',
  installVoice: 'Installer une voix',
}

const es: AndroidStrings = {
  mapsNote: 'Se abre en Google Maps',
  autoSub: 'Desde el icono de la app, tu pantalla de inicio o tocando una etiqueta',
  iconTitle: 'Desde el icono de la app',
  iconBody: 'Mantén pulsado el icono de Muslim para ver los adhkar de la mañana, la tarde, el viaje y el sueño; toca uno y se abre.',
  iconSteps: ['Mantén pulsado el icono de Muslim.', 'Toca el dhikr que quieras.', 'Arrástralo a la pantalla de inicio y tendrá su propio icono.'],
  homeTitle: 'En tu pantalla de inicio',
  homeBody: 'Cada momento que añadas a tu pantalla de inicio tiene un icono que lo abre con un toque.',
  homeSteps: ['Abre el momento desde Adhkar.', 'Toca «Añadir a la pantalla de inicio» bajo el dhikr.', 'Confirma la adición.'],
  nfcBody: 'Como una etiqueta colgante: pégala en el coche o junto a tu cama, acerca el teléfono y se abre el dhikr que elegiste. Sirve cualquier etiqueta NFC.',
  nfcSteps: ['Abre el momento desde Adhkar y toca «Copiar el enlace de la etiqueta».', 'Abre cualquier app que escriba etiquetas NFC y elige escribir un enlace.', 'Pega el enlace y acerca el teléfono a la etiqueta.', 'Desde entonces, el dhikr se abre cada vez que el teléfono la toca.'],
  nfcNeeds: 'Necesita un teléfono con NFC activado.',
  ourPart: 'Nosotros preparamos los iconos y los enlaces; tú eliges qué añadir.',
  pin: 'Añadir a la pantalla de inicio',
  copyLink: 'Copiar el enlace de la etiqueta',
  copied: 'Enlace copiado',
  voiceMissing: 'Tu teléfono no tiene una voz para este idioma. Instálala en Ajustes → Sistema → Idiomas → Síntesis de voz → Motor de Google → Instalar datos de voz.',
  installVoice: 'Instalar una voz',
}

const bn: AndroidStrings = {
  mapsNote: 'Google Maps-এ খোলে',
  autoSub: 'অ্যাপের আইকন থেকে, হোম স্ক্রিন থেকে, বা ট্যাগ ছুঁয়ে',
  iconTitle: 'অ্যাপের আইকন থেকে',
  iconBody: 'Muslim আইকন চেপে ধরুন, সকাল, সন্ধ্যা, সফর ও ঘুমের যিকির দেখাবে; একটিতে ট্যাপ করলেই খুলবে।',
  iconSteps: ['Muslim আইকন চেপে ধরুন।', 'যে যিকির চান তাতে ট্যাপ করুন।', 'হোম স্ক্রিনে টেনে আনলে এর নিজস্ব আইকন হবে।'],
  homeTitle: 'আপনার হোম স্ক্রিনে',
  homeBody: 'হোম স্ক্রিনে যোগ করা প্রতিটি মুহূর্তের একটি আইকন হয়, যা এক ট্যাপে খোলে।',
  homeSteps: ['যিকির থেকে মুহূর্তটি খুলুন।', 'যিকিরের নিচে «হোম স্ক্রিনে যোগ করুন» চাপুন।', 'যোগ করা নিশ্চিত করুন।'],
  nfcBody: 'ঝোলানো ট্যাগের মতো: গাড়িতে বা বিছানার পাশে লাগিয়ে দিন, ফোন কাছে আনলে আপনার বাছাই করা যিকির খুলবে। যেকোনো NFC ট্যাগই যথেষ্ট।',
  nfcSteps: ['যিকির থেকে মুহূর্তটি খুলে «ট্যাগের লিংক কপি করুন» চাপুন।', 'NFC ট্যাগ লেখে এমন যেকোনো অ্যাপ খুলে লিংক লেখা বেছে নিন।', 'লিংক পেস্ট করে ফোনটি ট্যাগের কাছে ধরুন।', 'এরপর ফোন যখনই এটি ছোঁবে, যিকির খুলবে।'],
  nfcNeeds: 'NFC চালু থাকা একটি ফোন দরকার।',
  ourPart: 'আমরা আইকন ও লিংক প্রস্তুত করি; কী যোগ করবেন তা আপনি বেছে নেন।',
  pin: 'হোম স্ক্রিনে যোগ করুন',
  copyLink: 'ট্যাগের লিংক কপি করুন',
  copied: 'লিংক কপি হয়েছে',
  voiceMissing: 'আপনার ফোনে এই ভাষার কোনো কণ্ঠ নেই। ইনস্টল করুন: সেটিংস → সিস্টেম → ভাষা → টেক্সট-টু-স্পিচ → Google ইঞ্জিন → ভয়েস ডেটা ইনস্টল।',
  installVoice: 'কণ্ঠ ইনস্টল করুন',
}

const hi: AndroidStrings = {
  mapsNote: 'Google Maps में खुलता है',
  autoSub: 'ऐप आइकन से, होम स्क्रीन से, या टैग छूकर',
  iconTitle: 'ऐप आइकन से',
  iconBody: 'Muslim आइकन को दबाकर रखें, सुबह, शाम, सफ़र और नींद के अज़कार दिखेंगे; किसी एक को छुएँ तो वह खुल जाएगा।',
  iconSteps: ['Muslim आइकन को दबाकर रखें।', 'जो ज़िक्र चाहिए उसे छुएँ।', 'इसे होम स्क्रीन पर खींच लें तो इसका अपना आइकन बन जाएगा।'],
  homeTitle: 'आपकी होम स्क्रीन पर',
  homeBody: 'होम स्क्रीन पर जोड़े गए हर मौक़े का एक आइकन बनता है जो एक बार छूने पर खुलता है।',
  homeSteps: ['अज़कार से मौक़ा खोलें।', 'ज़िक्र के नीचे «होम स्क्रीन पर जोड़ें» दबाएँ।', 'जोड़ने की पुष्टि करें।'],
  nfcBody: 'लटकने वाले टैग की तरह: इसे कार में या बिस्तर के पास चिपका दें, फ़ोन पास लाएँ तो आपका चुना हुआ ज़िक्र खुल जाएगा। कोई भी NFC टैग काफ़ी है।',
  nfcSteps: ['अज़कार से मौक़ा खोलें और «टैग का लिंक कॉपी करें» दबाएँ।', 'NFC टैग लिखने वाला कोई भी ऐप खोलें और लिंक लिखना चुनें।', 'लिंक पेस्ट करें और फ़ोन को टैग के पास रखें।', 'इसके बाद जब भी फ़ोन इसे छुएगा, ज़िक्र खुल जाएगा।'],
  nfcNeeds: 'NFC वाला फ़ोन चाहिए, और NFC चालू हो।',
  ourPart: 'हम आइकन और लिंक तैयार करते हैं; आप चुनते हैं कि क्या जोड़ें।',
  pin: 'होम स्क्रीन पर जोड़ें',
  copyLink: 'टैग का लिंक कॉपी करें',
  copied: 'लिंक कॉपी हुआ',
  voiceMissing: 'आपके फ़ोन में इस भाषा की आवाज़ नहीं है। इसे इंस्टॉल करें: सेटिंग्स → सिस्टम → भाषाएँ → टेक्स्ट-टू-स्पीच → Google इंजन → वॉइस डेटा इंस्टॉल करें।',
  installVoice: 'आवाज़ इंस्टॉल करें',
}

export const ANDROID: Record<Lang, AndroidStrings> = { ar, en, ur, id, ms, tr, fr, es, bn, hi }

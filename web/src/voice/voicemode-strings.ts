import type { Lang } from '../../../shared/api'

// Strings of the full-screen voice mode (command 18). Kept apart from i18n/*.ts (another window's files). Arabic and
// English are reviewed; the eight others are machine-translated like the rest of the interface. The other lines the
// mode shows (unclear, limit, no voice, «مطابق للمصدر», referral and apology titles) come from i18n as they are.
type S = {
  open: string
  title: string
  listening: string
  transcribing: string
  heard: string
  searching: string
  reading: string
  tap: string
  muted: string
  end: string
  mute: string
  unmute: string
  show: string
  talk: string
  stopAndTalk: string
  iosTip: string
}

export const VOICE_MODE: Record<Lang, S> = {
  ar: { open: 'محادثة صوتية بملء الشاشة', title: 'المحادثة الصوتية', listening: 'أستمع…', transcribing: 'لحظة، أكتب ما سمعت…', heard: 'سمعت: {text}', searching: 'أبحث في المصادر…', reading: 'أقرأ الإجابة…', tap: 'المس الشمسة لتتكلم', muted: 'الميكروفون مكتوم', end: 'إنهاء', mute: 'كتم الميكروفون', unmute: 'إلغاء الكتم', show: 'عرض الإجابة', talk: 'ابدأ الكلام', stopAndTalk: 'أوقف القراءة وتكلّم', iosTip: 'لصوت أوضح على الآيفون: الإعدادات ← تسهيلات الاستخدام ← المحتوى المنطوق ← الأصوات ← العربية ← نسخة محسّنة.' },
  en: { open: 'Full-screen voice conversation', title: 'Voice conversation', listening: 'Listening…', transcribing: 'One moment, writing down what I heard…', heard: 'I heard: {text}', searching: 'Searching the sources…', reading: 'Reading the answer…', tap: 'Touch the medallion to speak', muted: 'Microphone muted', end: 'End', mute: 'Mute microphone', unmute: 'Unmute', show: 'Show the answer', talk: 'Start speaking', stopAndTalk: 'Stop reading and speak', iosTip: 'For a clearer voice on iPhone: Settings → Accessibility → Spoken Content → Voices → English → an Enhanced voice.' },
  ur: { open: 'پوری اسکرین پر صوتی گفتگو', title: 'صوتی گفتگو', listening: 'سن رہا ہوں…', transcribing: 'ایک لمحہ، جو سنا وہ لکھ رہا ہوں…', heard: 'میں نے سنا: {text}', searching: 'مآخذ میں تلاش کر رہا ہوں…', reading: 'جواب پڑھ رہا ہوں…', tap: 'بولنے کے لیے تمغے کو چھوئیں', muted: 'مائیکروفون بند ہے', end: 'ختم کریں', mute: 'مائیکروفون بند کریں', unmute: 'مائیکروفون کھولیں', show: 'جواب دکھائیں', talk: 'بولنا شروع کریں', stopAndTalk: 'پڑھنا روکیں اور بولیں', iosTip: 'iPhone پر بہتر آواز کے لیے: Settings ← Accessibility ← Spoken Content ← Voices ← Enhanced آواز۔' },
  id: { open: 'Percakapan suara layar penuh', title: 'Percakapan suara', listening: 'Mendengarkan…', transcribing: 'Sebentar, menulis yang saya dengar…', heard: 'Saya dengar: {text}', searching: 'Mencari di sumber…', reading: 'Membacakan jawaban…', tap: 'Sentuh medali untuk berbicara', muted: 'Mikrofon dibisukan', end: 'Selesai', mute: 'Bisukan mikrofon', unmute: 'Aktifkan suara', show: 'Tampilkan jawaban', talk: 'Mulai berbicara', stopAndTalk: 'Hentikan bacaan dan bicara', iosTip: 'Untuk suara lebih jelas di iPhone: Settings → Accessibility → Spoken Content → Voices → pilih suara Enhanced.' },
  ms: { open: 'Perbualan suara skrin penuh', title: 'Perbualan suara', listening: 'Mendengar…', transcribing: 'Sebentar, menulis apa yang saya dengar…', heard: 'Saya dengar: {text}', searching: 'Mencari dalam sumber…', reading: 'Membaca jawapan…', tap: 'Sentuh pingat untuk bercakap', muted: 'Mikrofon disenyapkan', end: 'Tamat', mute: 'Senyapkan mikrofon', unmute: 'Nyahsenyap', show: 'Tunjukkan jawapan', talk: 'Mula bercakap', stopAndTalk: 'Henti membaca dan bercakap', iosTip: 'Untuk suara lebih jelas di iPhone: Settings → Accessibility → Spoken Content → Voices → pilih suara Enhanced.' },
  tr: { open: 'Tam ekran sesli sohbet', title: 'Sesli sohbet', listening: 'Dinliyorum…', transcribing: 'Bir saniye, duyduğumu yazıyorum…', heard: 'Duyduğum: {text}', searching: 'Kaynaklarda arıyorum…', reading: 'Cevabı okuyorum…', tap: 'Konuşmak için madalyona dokunun', muted: 'Mikrofon kapalı', end: 'Bitir', mute: 'Mikrofonu kapat', unmute: 'Mikrofonu aç', show: 'Cevabı göster', talk: 'Konuşmaya başla', stopAndTalk: 'Okumayı durdur ve konuş', iosTip: 'iPhone’da daha net bir ses için: Settings → Accessibility → Spoken Content → Voices → Enhanced bir ses seçin.' },
  fr: { open: 'Conversation vocale plein écran', title: 'Conversation vocale', listening: 'J’écoute…', transcribing: 'Un instant, j’écris ce que j’ai entendu…', heard: 'J’ai entendu : {text}', searching: 'Je cherche dans les sources…', reading: 'Je lis la réponse…', tap: 'Touchez le médaillon pour parler', muted: 'Micro coupé', end: 'Terminer', mute: 'Couper le micro', unmute: 'Réactiver le micro', show: 'Voir la réponse', talk: 'Commencer à parler', stopAndTalk: 'Arrêter la lecture et parler', iosTip: 'Pour une voix plus claire sur iPhone : Réglages → Accessibilité → Contenu énoncé → Voix → une voix « améliorée ».' },
  es: { open: 'Conversación por voz a pantalla completa', title: 'Conversación por voz', listening: 'Escuchando…', transcribing: 'Un momento, escribo lo que oí…', heard: 'Oí: {text}', searching: 'Buscando en las fuentes…', reading: 'Leyendo la respuesta…', tap: 'Toque el medallón para hablar', muted: 'Micrófono silenciado', end: 'Terminar', mute: 'Silenciar micrófono', unmute: 'Activar micrófono', show: 'Ver la respuesta', talk: 'Empezar a hablar', stopAndTalk: 'Detener la lectura y hablar', iosTip: 'Para una voz más clara en iPhone: Ajustes → Accesibilidad → Contenido leído → Voces → una voz «mejorada».' },
  bn: { open: 'পূর্ণ পর্দায় কণ্ঠে কথোপকথন', title: 'কণ্ঠে কথোপকথন', listening: 'শুনছি…', transcribing: 'একটু অপেক্ষা, যা শুনলাম লিখছি…', heard: 'শুনলাম: {text}', searching: 'উৎসে খুঁজছি…', reading: 'উত্তর পড়ছি…', tap: 'কথা বলতে পদকটি ছুঁয়ে দিন', muted: 'মাইক্রোফোন বন্ধ', end: 'শেষ করুন', mute: 'মাইক্রোফোন বন্ধ করুন', unmute: 'মাইক্রোফোন চালু করুন', show: 'উত্তর দেখুন', talk: 'কথা বলা শুরু করুন', stopAndTalk: 'পড়া থামিয়ে কথা বলুন', iosTip: 'iPhone-এ আরও স্পষ্ট কণ্ঠের জন্য: Settings → Accessibility → Spoken Content → Voices → একটি Enhanced কণ্ঠ।' },
  hi: { open: 'पूरी स्क्रीन पर आवाज़ से बातचीत', title: 'आवाज़ से बातचीत', listening: 'सुन रहा हूँ…', transcribing: 'एक पल, जो सुना वह लिख रहा हूँ…', heard: 'मैंने सुना: {text}', searching: 'स्रोतों में खोज रहा हूँ…', reading: 'उत्तर पढ़ रहा हूँ…', tap: 'बोलने के लिए पदक को छुएँ', muted: 'माइक्रोफ़ोन बंद है', end: 'समाप्त करें', mute: 'माइक्रोफ़ोन बंद करें', unmute: 'माइक्रोफ़ोन चालू करें', show: 'उत्तर देखें', talk: 'बोलना शुरू करें', stopAndTalk: 'पढ़ना रोकें और बोलें', iosTip: 'iPhone पर साफ़ आवाज़ के लिए: Settings → Accessibility → Spoken Content → Voices → कोई Enhanced आवाज़।' },
}

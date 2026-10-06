import type { Lang } from '../../../shared/api'
import type { Strings } from '../i18n/en'

// Levels A and B shown as one badge on an answer (plan B, Talal's decision 21:12, reply 0040): the app answers both the
// same way, from the approved text verbatim with its reference, so no badge can say the wrong one of the two. C and D
// (referral) keep their own badges, and «عن التطبيق» and /verify keep the four levels as the challenge defines them.
// Each language keeps the prefix of its levelA/levelB and its word for «معتمد» (approvedSources). Arabic and English
// reviewed; the eight others machine-translated like the rest of the interface.
type S = { levelAB: string; aboutAB: string }

export const LEVELS: Record<Lang, S> = {
  ar: { levelAB: 'المستوى أ–ب · إجابة من نص معتمد', aboutAB: 'ويعرض التطبيق المستويين أ وب بشارة واحدة، لأنه يجيب عنهما بالطريقة نفسها: النص المعتمد بحروفه مع مرجعه.' },
  en: { levelAB: 'Level A–B · Answered from an approved text', aboutAB: 'The app shows levels A and B with one badge, because it answers both the same way: the approved text, letter for letter, with its reference.' },
  ur: { levelAB: 'درجہ الف–ب · معتبر متن سے جواب', aboutAB: 'ایپ درجہ الف اور ب کو ایک ہی نشان سے دکھاتی ہے، کیونکہ دونوں کا جواب ایک ہی طریقے سے دیتی ہے: معتبر متن حرف بحرف، اس کے حوالے کے ساتھ۔' },
  id: { levelAB: 'Tingkat A–B · Dijawab dari teks yang diakui', aboutAB: 'Aplikasi menampilkan tingkat A dan B dengan satu lencana, karena keduanya dijawab dengan cara yang sama: teks yang diakui, huruf demi huruf, beserta rujukannya.' },
  ms: { levelAB: 'Tahap A–B · Dijawab daripada teks muktabar', aboutAB: 'Aplikasi memaparkan tahap A dan B dengan satu lencana, kerana kedua-duanya dijawab dengan cara yang sama: teks muktabar, huruf demi huruf, bersama rujukannya.' },
  tr: { levelAB: 'Seviye A–B · Onaylı bir metinden cevaplandı', aboutAB: 'Uygulama A ve B seviyelerini tek bir rozetle gösterir, çünkü ikisini de aynı şekilde cevaplar: onaylı metin, harfi harfine, kaynağıyla birlikte.' },
  fr: { levelAB: 'Niveau A–B · Réponse tirée d’un texte approuvé', aboutAB: 'L’application affiche les niveaux A et B avec un seul badge, car elle y répond de la même manière : le texte approuvé, lettre pour lettre, avec sa référence.' },
  es: { levelAB: 'Nivel A–B · Respuesta tomada de un texto aprobado', aboutAB: 'La aplicación muestra los niveles A y B con una sola insignia, porque responde a ambos de la misma manera: el texto aprobado, letra por letra, con su referencia.' },
  bn: { levelAB: 'স্তর A–B · অনুমোদিত পাঠ থেকে উত্তর', aboutAB: 'অ্যাপটি স্তর A ও B একটি ব্যাজে দেখায়, কারণ দুটির উত্তর একইভাবে দেয়: অনুমোদিত পাঠ হুবহু, তার সূত্রসহ।' },
  hi: { levelAB: 'स्तर A–B · स्वीकृत पाठ से उत्तर', aboutAB: 'ऐप स्तर A और B को एक ही बैज से दिखाता है, क्योंकि दोनों का उत्तर एक ही तरीके से देता है: स्वीकृत पाठ अक्षरशः, उसके संदर्भ के साथ।' },
}

/** The level badge of an answer: A and B as one, C and D as they are. (levelLabel in i18n/index.ts stays exact.) */
export const answerLevelLabel = (t: Pick<Strings, 'levelC' | 'levelD'>, lang: Lang, level: 'A' | 'B' | 'C' | 'D') =>
  level === 'A' || level === 'B' ? LEVELS[lang].levelAB : level === 'C' ? t.levelC : t.levelD

import type { Lang } from '../../../shared/api'

// The line in «كيف وُجدت هذه الإجابة؟» when the card offers the reviewed translation of al-Muyassar (command 21).
// Kept apart from i18n/*.ts while those files carry the other window's work for the same command. Arabic and English
// are reviewed; the eight others are machine-translated like the rest of the interface.
type S = { howFound: string }

export const REVIEWED: Record<Lang, S> = {
  ar: { howFound: 'الترجمة المعروضة ترجمة آلية للتفسير الميسر، اجتازت مراجعة مستقلة؛ لا شرح مولّد.' },
  en: { howFound: 'The translation shown is a machine translation of al-Tafsir al-Muyassar that passed independent review; no generated explanation.' },
  ur: { howFound: 'دکھایا گیا ترجمہ التفسیر المیسر کا مشینی ترجمہ ہے، جو آزادانہ جائزے میں کامیاب رہا؛ کوئی تیار کردہ تشریح نہیں۔' },
  id: { howFound: 'Terjemahan yang ditampilkan adalah terjemahan mesin Tafsir al-Muyassar yang lolos tinjauan independen; bukan penjelasan buatan mesin.' },
  ms: { howFound: 'Terjemahan yang dipaparkan ialah terjemahan mesin Tafsir al-Muyassar yang lulus semakan bebas; bukan penjelasan janaan mesin.' },
  tr: { howFound: "Gösterilen çeviri, et-Tefsîru'l-Müyesser'in bağımsız incelemeden geçmiş makine çevirisidir; üretilmiş bir açıklama değildir." },
  fr: { howFound: 'La traduction affichée est une traduction automatique du Tafsir al-Muyassar, validée par une relecture indépendante ; aucune explication générée.' },
  es: { howFound: 'La traducción mostrada es una traducción automática del Tafsir al-Muyassar que superó una revisión independiente; no es una explicación generada.' },
  bn: { howFound: 'দেখানো অনুবাদটি তাফসীরুল মুয়াস্সারের যান্ত্রিক অনুবাদ, যা স্বাধীন পর্যালোচনায় উত্তীর্ণ; কোনো তৈরি ব্যাখ্যা নয়।' },
  hi: { howFound: 'दिखाया गया अनुवाद तफ़सीर अल-मुयस्सर का मशीनी अनुवाद है, जो स्वतंत्र समीक्षा में सफल रहा; कोई बनाई गई व्याख्या नहीं।' },
}

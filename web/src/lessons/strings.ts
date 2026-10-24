// The lessons' words in the app's own frame (read at start): the line under the starter path's lesson link, and the
// wait line while a lesson's chunk loads.
// ar/en reviewed; the other eight are machine translations, as the interface marks them.
import type { Lang } from '../../../shared/api'

export const LESSON_CARD: Record<Lang, { lead: string; loading: string }> = {
  ar: { lead: 'درس خطوةً بخطوة، ومع كل خطوة النص الذي تقوم عليه.', loading: 'يُحمَّل الدرس…' },
  en: { lead: 'A lesson step by step, each step with the text it rests on.', loading: 'Loading the lesson…' },
  ur: { lead: 'قدم بہ قدم ایک سبق، ہر قدم کے ساتھ وہ متن جس پر وہ قائم ہے۔', loading: 'سبق لوڈ ہو رہا ہے…' },
  id: { lead: 'Pelajaran langkah demi langkah, setiap langkah dengan teks yang menjadi dasarnya.', loading: 'Memuat pelajaran…' },
  ms: { lead: 'Pelajaran langkah demi langkah, setiap langkah dengan teks yang menjadi asasnya.', loading: 'Memuatkan pelajaran…' },
  tr: { lead: 'Adım adım bir ders; her adım dayandığı metinle birlikte.', loading: 'Ders yükleniyor…' },
  fr: { lead: 'Une leçon pas à pas, chaque étape avec le texte sur lequel elle repose.', loading: 'Chargement de la leçon…' },
  es: { lead: 'Una lección paso a paso, cada paso con el texto en el que se basa.', loading: 'Cargando la lección…' },
  bn: { lead: 'ধাপে ধাপে একটি পাঠ, প্রতিটি ধাপের সাথে সেই পাঠ্য যার উপর তা প্রতিষ্ঠিত।', loading: 'পাঠ লোড হচ্ছে…' },
  hi: { lead: 'कदम-दर-कदम एक पाठ, हर कदम के साथ वह पाठ जिस पर वह आधारित है।', loading: 'पाठ लोड हो रहा है…' },
}

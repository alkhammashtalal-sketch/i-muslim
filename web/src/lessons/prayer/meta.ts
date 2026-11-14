// «علّمني الصلاة» (reply 0071 §4.1 and its add-ons): its review page is relay/w1/0071-prayer. Read at start
// (registry.ts); the page itself is lesson-prayer.tsx, a lazy chunk.
import type { LessonMeta } from '../registry'

export const META: LessonMeta = {
  id: 'prayer',
  starter: 'salah',
  // ar/en as on the review page; the other eight are machine translations
  title: {
    ar: 'علّمني الصلاة',
    en: 'Teach me the prayer',
    ur: 'مجھے نماز سکھائیں',
    id: 'Ajari saya salat',
    ms: 'Ajar saya solat',
    tr: 'Bana namazı öğret',
    fr: 'Apprenez-moi la prière',
    es: 'Enséñame la oración',
    bn: 'আমাকে নামাজ শেখান',
    hi: 'मुझे नमाज़ सिखाइए',
  },
}

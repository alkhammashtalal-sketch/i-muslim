// «علّمني الوضوء» (reply 0072 item 12; add-on 0069-add3): its review page is relay/w1/0072-wudu. Read at start
// (registry.ts); the page itself is lesson-wudu.tsx, a lazy chunk.
import type { LessonMeta } from '../registry'

export const META: LessonMeta = {
  id: 'wudu',
  starter: 'taharah',
  // ar/en as on the review page; the other eight are machine translations
  title: {
    ar: 'علّمني الوضوء',
    en: 'Teach me ablution',
    ur: 'مجھے وضو سکھائیں',
    id: 'Ajari saya wudu',
    ms: 'Ajar saya wuduk',
    tr: 'Bana abdesti öğret',
    fr: 'Apprenez-moi les ablutions',
    es: 'Enséñame la ablución',
    bn: 'আমাকে অজু শেখান',
    hi: 'मुझे वुज़ू सिखाइए',
  },
}

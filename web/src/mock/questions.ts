// DEMO ONLY (local development with VITE_ASK_MODE=mock): questions that trigger each demo response.
import type { Lang } from '../../../shared/api'

// Demo questions from design/Refer.dc.html, translated for the other languages.
export const REFERRAL_Q: Record<Lang, string> = {
  ar: 'هل يجوز لي فعل كذا في زواجي؟',
  en: 'Is it permissible for me to do this in my marriage?',
  ur: 'کیا میرے لیے اپنی شادی میں ایسا کرنا جائز ہے؟',
  id: 'Apakah boleh bagi saya melakukan ini dalam pernikahan saya?',
  ms: 'Adakah harus bagi saya melakukan ini dalam perkahwinan saya?',
  tr: 'Evliliğimde bunu yapmam caiz mi?',
  fr: 'M’est-il permis de faire ceci dans mon mariage ?',
  es: '¿Me está permitido hacer esto en mi matrimonio?',
  bn: 'আমার বিয়েতে এটি করা কি আমার জন্য জায়েজ?',
  hi: 'क्या मेरे लिए अपनी शादी में ऐसा करना जायज़ है?',
}

export const ABSTAIN_Q: Record<Lang, string> = {
  ar: 'أعطني حديثًا عن فضل يوم الأربعاء',
  en: 'Give me a hadith about the virtue of Wednesday',
  ur: 'بدھ کے دن کی فضیلت کے بارے میں کوئی حدیث بتائیں',
  id: 'Berikan hadis tentang keutamaan hari Rabu',
  ms: 'Berikan hadis tentang kelebihan hari Rabu',
  tr: 'Çarşamba gününün fazileti hakkında bir hadis söyle',
  fr: 'Donne-moi un hadith sur le mérite du mercredi',
  es: 'Dame un hadiz sobre la virtud del miércoles',
  bn: 'বুধবারের ফজিলত সম্পর্কে একটি হাদিস দিন',
  hi: 'बुधवार की फ़ज़ीलत के बारे में कोई हदीस बताइए',
}

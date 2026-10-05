// Temporary static list until approved FAQs exist (Arabic from eval/questions.v1.jsonl q001–q004).
// Index 1 ("pillars of Islam") is the one question the demo data can answer.
import type { Lang } from '../../../shared/api'

export const SUGGESTIONS: Record<Lang, string[]> = {
  ar: ['ما هو الإسلام؟', 'ما هي أركان الإسلام؟', 'ما أركان الإيمان؟', 'لماذا خلق الله الإنسان؟'],
  en: ['What is Islam?', 'What are the pillars of Islam?', 'What are the pillars of faith?', 'Why did God create human beings?'],
  ur: ['اسلام کیا ہے؟', 'اسلام کے ارکان کیا ہیں؟', 'ایمان کے ارکان کیا ہیں؟', 'اللہ نے انسان کو کیوں پیدا کیا؟'],
  id: ['Apa itu Islam?', 'Apa saja rukun Islam?', 'Apa saja rukun iman?', 'Mengapa Allah menciptakan manusia?'],
  ms: ['Apakah itu Islam?', 'Apakah rukun Islam?', 'Apakah rukun iman?', 'Mengapa Allah mencipta manusia?'],
  tr: ['İslam nedir?', 'İslam’ın şartları nelerdir?', 'İmanın şartları nelerdir?', 'Allah insanı neden yarattı?'],
  fr: ['Qu’est-ce que l’islam ?', 'Quels sont les piliers de l’islam ?', 'Quels sont les piliers de la foi ?', 'Pourquoi Dieu a-t-il créé l’être humain ?'],
  es: ['¿Qué es el islam?', '¿Cuáles son los pilares del islam?', '¿Cuáles son los pilares de la fe?', '¿Por qué creó Dios al ser humano?'],
  bn: ['ইসলাম কী?', 'ইসলামের স্তম্ভগুলো কী কী?', 'ঈমানের স্তম্ভগুলো কী কী?', 'আল্লাহ মানুষকে কেন সৃষ্টি করেছেন?'],
  hi: ['इस्लाम क्या है?', 'इस्लाम के स्तंभ क्या हैं?', 'ईमान के स्तंभ क्या हैं?', 'अल्लाह ने इंसान को क्यों बनाया?'],
}

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

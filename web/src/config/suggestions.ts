// Suggested questions on the home page. Temporary static list until approved FAQs exist
// (Arabic from eval/questions.v1.jsonl q001–q004; other languages translated for the interface).
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

import type { Lang } from '../../../shared/api'

// The line under the microphone while it records (reply 0035): recording now stops by itself when the speaker goes
// quiet. Kept apart from i18n/*.ts while those files carry the other window's uncommitted work. Arabic and English are
// reviewed; the eight others are machine-translated like the rest of the interface.
type S = { voiceAutoStop: string }

export const MIC: Record<Lang, S> = {
  ar: { voiceAutoStop: 'تكلّم، وسيتوقف التسجيل وحده عند سكوتك' },
  en: { voiceAutoStop: 'Speak; recording stops by itself when you go quiet' },
  ur: { voiceAutoStop: 'بولیں؛ آپ کے خاموش ہونے پر ریکارڈنگ خود رک جائے گی' },
  id: { voiceAutoStop: 'Silakan bicara; rekaman berhenti sendiri saat Anda diam' },
  ms: { voiceAutoStop: 'Sila bercakap; rakaman berhenti sendiri apabila anda diam' },
  tr: { voiceAutoStop: 'Konuşun; sustuğunuzda kayıt kendiliğinden durur' },
  fr: { voiceAutoStop: 'Parlez ; l’enregistrement s’arrête de lui-même quand vous vous taisez' },
  es: { voiceAutoStop: 'Hable; la grabación se detiene sola cuando guarde silencio' },
  bn: { voiceAutoStop: 'কথা বলুন; আপনি চুপ করলে রেকর্ডিং নিজেই থেমে যাবে' },
  hi: { voiceAutoStop: 'बोलिए; आपके चुप होने पर रिकॉर्डिंग अपने आप रुक जाएगी' },
}

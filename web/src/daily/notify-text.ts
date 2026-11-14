// The texts of the bells (reply 0032 part E), in the ten interface languages; the prayer names as the interface writes
// them. No sacred text: a call to prayer is not recited or quoted, only its time announced. One copy for both senders:
// the Worker's Web Push (worker/src/push/strings.ts re-exports it, as the Worker already takes the prayer engine from
// web/src/daily/prayer.ts) and the app's local notifications (web/src/native/bells.ts, reply 0033 §ب3).
export const PUSH_TEXT: Record<string, { title: string; prayer: Record<string, string>; now: string; sunrise: string; ward: string }> = {
  ar: { title: 'مسلم', prayer: { fajr: 'الفجر', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء' }, now: 'حان وقت صلاة {p}', sunrise: 'وقت الشروق', ward: 'وِردك اليوم: نكمل من حيث وقفت' },
  en: { title: 'Muslim', prayer: { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' }, now: 'It is time for {p} prayer', sunrise: 'Sunrise', ward: 'Your daily portion: continue where you stopped' },
  ur: { title: 'مسلم', prayer: { fajr: 'فجر', dhuhr: 'ظہر', asr: 'عصر', maghrib: 'مغرب', isha: 'عشاء' }, now: '{p} کی نماز کا وقت ہو گیا', sunrise: 'طلوعِ آفتاب', ward: 'آج کا ورد: جہاں رکے تھے وہیں سے' },
  id: { title: 'Muslim', prayer: { fajr: 'Subuh', dhuhr: 'Zuhur', asr: 'Asar', maghrib: 'Magrib', isha: 'Isya' }, now: 'Waktu salat {p} telah tiba', sunrise: 'Matahari terbit', ward: 'Wirid harianmu: lanjutkan dari tempat terakhir' },
  ms: { title: 'Muslim', prayer: { fajr: 'Subuh', dhuhr: 'Zohor', asr: 'Asar', maghrib: 'Maghrib', isha: 'Isyak' }, now: 'Telah masuk waktu solat {p}', sunrise: 'Matahari terbit', ward: 'Wirid harian anda: sambung dari tempat terakhir' },
  tr: { title: 'Muslim', prayer: { fajr: 'Sabah', dhuhr: 'Öğle', asr: 'İkindi', maghrib: 'Akşam', isha: 'Yatsı' }, now: '{p} namazı vakti girdi', sunrise: 'Güneş doğuşu', ward: 'Günlük virdin: kaldığın yerden devam et' },
  fr: { title: 'Muslim', prayer: { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Icha' }, now: "C'est l'heure de la prière de {p}", sunrise: 'Lever du soleil', ward: 'Ta lecture du jour : reprends là où tu t’es arrêté' },
  es: { title: 'Muslim', prayer: { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Magrib', isha: 'Isha' }, now: 'Es la hora de la oración de {p}', sunrise: 'Salida del sol', ward: 'Tu lectura del día: sigue donde lo dejaste' },
  bn: { title: 'মুসলিম', prayer: { fajr: 'ফজর', dhuhr: 'যোহর', asr: 'আসর', maghrib: 'মাগরিব', isha: 'এশা' }, now: '{p}-এর নামাজের সময় হয়েছে', sunrise: 'সূর্যোদয়', ward: 'আজকের অংশ: যেখানে থেমেছিলেন সেখান থেকে' },
  hi: { title: 'मुस्लिम', prayer: { fajr: 'फ़ज्र', dhuhr: 'ज़ुहर', asr: 'अस्र', maghrib: 'मग़रिब', isha: 'इशा' }, now: '{p} की नमाज़ का समय हो गया', sunrise: 'सूर्योदय', ward: 'आज का विर्द: जहाँ रुके थे वहीं से' },
}

export function pushMessage(lang: string, kind: string): { title: string; body: string; tag: string; url: string } {
  const s = PUSH_TEXT[lang] ?? PUSH_TEXT.ar
  // The portion's reminder opens the portion's own page (reply 0037 §3.7), web/src/quran/route.ts ReaderPage 'ward'.
  if (kind === 'ward') return { title: s.title, body: s.ward, tag: 'ward', url: '/quran/ward' }
  if (kind === 'sunrise') return { title: s.title, body: s.sunrise, tag: 'sunrise', url: '/today/times' }
  return { title: s.title, body: s.now.replace('{p}', s.prayer[kind] ?? kind), tag: kind, url: '/today/times' }
}

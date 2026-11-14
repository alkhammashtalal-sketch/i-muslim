// Android only (CLAUDE.md §14; add-ons 0072-add18 §1, 0072-add20 §1): one notification channel per alert sound, as
// Android 8+ ties the sound to the channel. The system's sound, the calm tone in res/raw, and each verified download,
// named in the interface language. Made by web/android/…/AlertSoundsPlugin.java; called behind isAndroid() from
// web/src/native/alert-sounds-device.ts, so the iPhone's path does not change.
//
// «حساس للوقت» (add-on 0072-add34 §ب5): Android's counterpart of the iPhone's Time Sensitive level is a channel of its
// own, of high importance, for the five prayers' entry alone (one per sound, `entry-<key>`), made only while the switch
// is on. The person can then let that channel alone through «Do Not Disturb» in the phone's settings; sunrise, the
// portion and the adhkar stay on the channels they have today.
import type { Lang } from '../../../../shared/api'
import { ALERT_TEXT } from '../alert-strings'
import { CALM, TIME_SENSITIVE_KINDS, type Ready } from '../alert-sounds'

export type ChannelSpec = { key: string; name: string; file?: string; raw?: string }

/** The channels the alerts need now, from what is ready on the phone; with `entry`, also the five entries' own. */
export function alertChannels(ready: Ready, lang: string, entry = false): ChannelSpec[] {
  const t = ALERT_TEXT[lang] ?? ALERT_TEXT.ar
  const base: ChannelSpec[] = [
    { key: 'system', name: t.channelSystem },
    { key: 'calm', name: t.channelCalm, raw: CALM.android },
    ...(['adhan-short', 'adhan-fajr-short'] as const).filter((id) => ready[id]).map((id) => ({ key: id, name: id === 'adhan-fajr-short' ? t.channelAdhanFajr : t.channelAdhan, file: ready[id] })),
  ]
  if (!entry) return base
  const e = ENTRY_TEXT[lang as Lang] ?? ENTRY_TEXT.ar
  return [...base, ...base.map((c) => ({ ...c, key: `entry-${c.key}`, name: `${e.channel} (${c.name})` }))]
}

/** An alert's channel: with the switch on, one of the five entries goes to the entry channel of the same sound, once
 *  the phone has made it; everything else, and anything not made yet, keeps the channel soundFor gave it. */
export function entryChannel(kind: string, base: { sound?: string; channelId?: string }, ready: Ready, on: boolean): { sound?: string; channelId?: string } {
  if (!on || !TIME_SENSITIVE_KINDS.includes(kind) || !base.channelId) return base
  const key = Object.keys(ready).find((k) => k.startsWith('channel:') && !k.startsWith('channel:entry-') && ready[k] === base.channelId)
  const entry = key && ready[`channel:entry-${key.slice('channel:'.length)}`]
  return entry ? { ...base, channelId: entry } : base
}

/** The switch in the settings on Android, and the entry channels' name, in the ten languages. */
export const ENTRY_TEXT: Record<Lang, { title: string; hint: string; channel: string }> = {
  ar: {
    title: 'قناة خاصة لتنبيه دخول الوقت',
    hint: 'يصل تنبيه دخول وقت الصلوات الخمس في قناة خاصة بأهمية عالية، فتستطيع أن تسمح لها وحدها بتجاوز «عدم الإزعاج» من إعدادات الجهاز لتطبيق مسلم، في قناة «دخول وقت الصلاة». ولا يشمل الشروق ولا الورد ولا الأذكار.',
    channel: 'دخول وقت الصلاة',
  },
  en: {
    title: 'A channel of its own for the prayer-time alert',
    hint: 'The alert when each of the five prayer times begins comes on a high-importance channel of its own, so you can let it alone through Do Not Disturb in the device settings for Muslim, under «Prayer time begins». Sunrise, the daily portion and the adhkar are not included.',
    channel: 'Prayer time begins',
  },
  ur: {
    title: 'وقت داخل ہونے کی اطلاع کے لیے الگ چینل',
    hint: 'پانچوں نمازوں کا وقت داخل ہونے کی اطلاع ایک الگ اہم چینل پر آتی ہے، تاکہ آپ آلے کی ترتیبات میں مسلم کے «نماز کا وقت داخل» چینل کو اکیلے «ڈسٹرب نہ کریں» سے گزرنے دے سکیں۔ طلوعِ آفتاب، ورد اور اذکار شامل نہیں۔',
    channel: 'نماز کا وقت داخل',
  },
  id: {
    title: 'Saluran khusus untuk pemberitahuan waktu salat',
    hint: 'Pemberitahuan saat masuk waktu lima salat datang di saluran khusus berprioritas tinggi, sehingga Anda dapat mengizinkan saluran itu saja menembus Jangan Ganggu di pengaturan perangkat untuk Muslim, pada «Masuk waktu salat». Tidak termasuk matahari terbit, wirid, dan zikir.',
    channel: 'Masuk waktu salat',
  },
  ms: {
    title: 'Saluran khas untuk pemberitahuan masuk waktu',
    hint: 'Pemberitahuan masuk waktu lima solat tiba dalam saluran khas berkepentingan tinggi, jadi anda boleh membenarkan saluran itu sahaja melepasi Jangan Ganggu dalam tetapan peranti untuk Muslim, pada «Masuk waktu solat». Tidak termasuk matahari terbit, wirid dan zikir.',
    channel: 'Masuk waktu solat',
  },
  tr: {
    title: 'Vakit girişi bildirimi için ayrı kanal',
    hint: 'Beş vakit namazın girişindeki bildirim, yüksek önemli ayrı bir kanaldan gelir; böylece cihaz ayarlarında Muslim için «Namaz vakti girdi» kanalının tek başına Rahatsız Etmeyin’i aşmasına izin verebilirsin. Güneş doğuşu, vird ve zikirler dahil değildir.',
    channel: 'Namaz vakti girdi',
  },
  fr: {
    title: 'Un canal à part pour l’alerte de l’heure de prière',
    hint: 'L’alerte à l’entrée de chacune des cinq prières arrive sur un canal à part, d’importance élevée : tu peux laisser ce canal seul passer outre Ne pas déranger dans les réglages de l’appareil pour Muslim, sous « Entrée de l’heure de prière ». Le lever du soleil, la lecture du jour et les adhkar n’en font pas partie.',
    channel: 'Entrée de l’heure de prière',
  },
  es: {
    title: 'Un canal propio para el aviso de la hora de oración',
    hint: 'El aviso al entrar cada una de las cinco oraciones llega por un canal propio de importancia alta, así que puedes dejar que solo ese canal pase No molestar en los ajustes del dispositivo para Muslim, en «Entra la hora de oración». No incluye la salida del sol, la lectura del día ni los adhkar.',
    channel: 'Entra la hora de oración',
  },
  bn: {
    title: 'ওয়াক্ত শুরুর বিজ্ঞপ্তির জন্য আলাদা চ্যানেল',
    hint: 'পাঁচ ওয়াক্ত নামাজের সময় শুরুর বিজ্ঞপ্তি উচ্চ গুরুত্বের একটি আলাদা চ্যানেলে আসে, তাই ডিভাইসের সেটিংসে মুসলিমের «নামাজের সময় শুরু» চ্যানেলটিকে একাই «বিরক্ত করবেন না» পেরোতে দিতে পারেন। সূর্যোদয়, অংশ ও জিকির এতে নেই।',
    channel: 'নামাজের সময় শুরু',
  },
  hi: {
    title: 'वक़्त शुरू होने की सूचना के लिए अलग चैनल',
    hint: 'पाँचों नमाज़ों का वक़्त शुरू होने की सूचना ऊँचे महत्व वाले एक अलग चैनल पर आती है, ताकि आप डिवाइस की सेटिंग्स में मुस्लिम के «नमाज़ का वक़्त शुरू» चैनल को अकेले «परेशान न करें» के पार आने दे सकें। सूर्योदय, विर्द और अज़कार शामिल नहीं हैं।',
    channel: 'नमाज़ का वक़्त शुरू',
  },
}

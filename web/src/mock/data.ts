// DEMO DATA ONLY — shown while the answer engine (/api/ask) is being built.
// The religious text and its English translation are copied verbatim from design/Main.dc.html
// and design/English.dc.html. No verse or hadith here was written by us.
import type { AnswerResponse, Lang, PassageResponse, Quote } from '../../../shared/api'

export const MOCK_HADITH_ID = 'hadith:bukhari:8'

const HADITH_AR =
  '«بُنِيَ الإِسْلاَمُ عَلَى خَمْسٍ: شَهَادَةِ أَنْ لاَ إِلَهَ إِلاَّ اللَّهُ وَأَنَّ مُحَمَّدًا رَسُولُ اللَّهِ، وَإِقَامِ الصَّلاَةِ، وَإِيتَاءِ الزَّكَاةِ، وَالْحَجِّ، وَصَوْمِ رَمَضَانَ»'
const HADITH_EN =
  'Islam is built upon five: the testimony that there is no god but Allah and that Muhammad is the Messenger of Allah, establishing the Salah, giving the Zakat, the Hajj, and fasting Ramadan.'

const arabicRef = (lang: Lang) => lang === 'ar' || lang === 'ur'

function hadithQuote(lang: Lang): Quote {
  return {
    id: MOCK_HADITH_ID,
    kind: 'hadith',
    text: HADITH_AR,
    text_en: HADITH_EN,
    ref: arabicRef(lang) ? 'صحيح البخاري – كتاب الإيمان – حديث 8' : 'Sahih al-Bukhari – Book of Faith – Hadith 8',
    url: 'https://sunnah.com/bukhari:8',
    verified: true,
    grade: arabicRef(lang) ? 'حديث صحيح' : 'Authentic hadith',
  }
}

// Generated-explanation text per language (not religious text). ar/en from the design mockups;
// the other eight are machine translations, flagged as such in the UI.
const EXPLAIN: Record<Lang, { direct: string; explanation: string[] }> = {
  ar: {
    direct: 'أركان الإسلام خمسة: الشهادتان، وإقامة الصلاة، وإيتاء الزكاة، وحج البيت لمن استطاع، وصوم رمضان.',
    explanation: ['وهي الأساس الذي يقوم عليه إسلام المرء.'],
  },
  en: {
    direct: 'The pillars of Islam are five: the Shahada (الشهادتان), Salah (الصلاة), Zakat (الزكاة), Hajj (الحج) for whoever is able, and fasting Ramadan (الصوم).',
    explanation: ['The five pillars are the foundation of a Muslim’s practice.'],
  },
  ur: {
    direct: 'اسلام کے ارکان پانچ ہیں: شہادتین، نماز (الصلاة) قائم کرنا، زکاة دینا، استطاعت رکھنے والے کے لیے حج، اور رمضان کے روزے (الصوم)۔',
    explanation: ['یہی وہ بنیاد ہے جس پر ایک مسلمان کا اسلام قائم ہوتا ہے۔'],
  },
  id: {
    direct: 'Rukun Islam ada lima: Syahadat (الشهادتان), Salat (الصلاة), Zakat (الزكاة), Haji (الحج) bagi yang mampu, dan puasa Ramadan (الصوم).',
    explanation: ['Kelima rukun ini adalah dasar tempat keislaman seseorang berdiri.'],
  },
  ms: {
    direct: 'Rukun Islam ada lima: Syahadah (الشهادتان), Solat (الصلاة), Zakat (الزكاة), Haji (الحج) bagi yang mampu, dan puasa Ramadan (الصوم).',
    explanation: ['Kelima-lima rukun ini ialah asas tertegaknya Islam seseorang.'],
  },
  tr: {
    direct: 'İslam’ın şartları beştir: Kelime-i Şehadet (الشهادتان), namaz (الصلاة), zekât (الزكاة), gücü yetene hac (الحج) ve Ramazan orucu (الصوم).',
    explanation: ['Bu beş şart, bir Müslümanın İslam’ının üzerine kurulduğu temeldir.'],
  },
  fr: {
    direct: 'Les piliers de l’islam sont cinq : la Shahada (الشهادتان), la Salah (الصلاة), la Zakat (الزكاة), le Hajj (الحج) pour qui en a la capacité, et le jeûne de Ramadan (الصوم).',
    explanation: ['Ces cinq piliers sont le fondement sur lequel repose l’islam d’une personne.'],
  },
  es: {
    direct: 'Los pilares del islam son cinco: la Shahada (الشهادتان), el Salah (الصلاة), el Zakat (الزكاة), el Hajj (الحج) para quien pueda, y el ayuno de Ramadán (الصوم).',
    explanation: ['Estos cinco pilares son la base sobre la que se sostiene el islam de una persona.'],
  },
  bn: {
    direct: 'ইসলামের স্তম্ভ পাঁচটি: শাহাদাহ (الشهادتان), সালাত (الصلاة), যাকাত (الزكاة), সামর্থ্যবানের জন্য হজ (الحج), এবং রমজানের সাওম (الصوم)।',
    explanation: ['এই পাঁচটি স্তম্ভই একজন মুসলিমের ইসলামের ভিত্তি।'],
  },
  hi: {
    direct: 'इस्लाम के स्तंभ पाँच हैं: शहादा (الشهادتان), सलात (الصلاة), ज़कात (الزكاة), सामर्थ्य रखने वाले के लिए हज (الحج), और रमज़ान का सौम (الصوم)।',
    explanation: ['ये पाँच स्तंभ वह नींव हैं जिस पर एक मुसलमान का इस्लाम टिका है।'],
  },
}

export function mockAnswer(lang: Lang): AnswerResponse {
  const e = EXPLAIN[lang]
  return {
    type: 'answer',
    level: 'A',
    direct: { text: e.direct, cites: [MOCK_HADITH_ID] },
    quotes: [hadithQuote(lang)],
    explanation: e.explanation.map((text) => ({ text, cites: [MOCK_HADITH_ID] })),
    machineTranslated: lang !== 'ar' && lang !== 'en',
    fromCache: false,
  }
}

export function mockPassage(id: string, lang: Lang): PassageResponse | null {
  if (id !== MOCK_HADITH_ID) return null
  return hadithQuote(lang)
}

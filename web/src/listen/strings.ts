import type { Lang } from '../../../shared/api'

// The listen button's words (add-on 0072-add14). Arabic and English reviewed; the eight others machine-translated, as
// the rest of the interface. `{lang}` is the language's name in the interface language (Intl.DisplayNames).
type S = {
  /** The one button under a text: its visible word. */
  listen: string
  /** While it plays: the same button stops it. */
  stop: string
  /** Under the Arabic ayah outside Arabic (§4): the recitation, and the meaning in the reader's language. */
  listenAyah: string
  listenMeaning: string
  /** The names (§4): «استمع» under the name, by the recitation of its ayah. */
  listenName: string
  /** The accessible names: what the press plays. */
  ariaRecite: string
  ariaSpeak: string
  /** No voice on the device for the text's language: shown once instead of the button. */
  installVoice: string
}

export const LISTEN: Record<Lang, S> = {
  ar: {
    listen: 'استمع',
    stop: 'إيقاف',
    listenAyah: 'استمع للآية',
    listenMeaning: 'استمع للمعنى',
    listenName: 'استمع',
    ariaRecite: 'استمع للآية بصوت القارئ',
    ariaSpeak: 'استمع لهذا النص بصوت الجهاز',
    installVoice: 'ثبّت صوت {lang} من الإعدادات',
  },
  en: {
    listen: 'Listen',
    stop: 'Stop',
    listenAyah: 'Listen to the ayah',
    listenMeaning: 'Listen to the meaning',
    listenName: 'Listen',
    ariaRecite: 'Listen to the ayah, recited by the reciter',
    ariaSpeak: 'Listen to this text in the device voice',
    installVoice: 'Install a voice for {lang} in Settings',
  },
  ur: {
    listen: 'سنیں',
    stop: 'روکیں',
    listenAyah: 'آیت سنیں',
    listenMeaning: 'معنی سنیں',
    listenName: 'سنیں',
    ariaRecite: 'قاری کی آواز میں آیت سنیں',
    ariaSpeak: 'یہ متن آلے کی آواز میں سنیں',
    installVoice: 'سیٹنگز سے {lang} کی آواز انسٹال کریں',
  },
  id: {
    listen: 'Dengarkan',
    stop: 'Hentikan',
    listenAyah: 'Dengarkan ayat',
    listenMeaning: 'Dengarkan maknanya',
    listenName: 'Dengarkan',
    ariaRecite: 'Dengarkan ayat dengan suara qari',
    ariaSpeak: 'Dengarkan teks ini dengan suara perangkat',
    installVoice: 'Pasang suara {lang} di Setelan',
  },
  ms: {
    listen: 'Dengar',
    stop: 'Henti',
    listenAyah: 'Dengar ayat',
    listenMeaning: 'Dengar maknanya',
    listenName: 'Dengar',
    ariaRecite: 'Dengar ayat dengan suara qari',
    ariaSpeak: 'Dengar teks ini dengan suara peranti',
    installVoice: 'Pasang suara {lang} di Tetapan',
  },
  tr: {
    listen: 'Dinle',
    stop: 'Durdur',
    listenAyah: 'Âyeti dinle',
    listenMeaning: 'Anlamını dinle',
    listenName: 'Dinle',
    ariaRecite: 'Âyeti kârinin sesinden dinle',
    ariaSpeak: 'Bu metni cihaz sesiyle dinle',
    installVoice: 'Ayarlardan {lang} sesi yükleyin',
  },
  fr: {
    listen: 'Écouter',
    stop: 'Arrêter',
    listenAyah: 'Écouter le verset',
    listenMeaning: 'Écouter le sens',
    listenName: 'Écouter',
    ariaRecite: 'Écouter le verset récité par le récitateur',
    ariaSpeak: 'Écouter ce texte avec la voix de l’appareil',
    installVoice: 'Installez une voix {lang} dans les Réglages',
  },
  es: {
    listen: 'Escuchar',
    stop: 'Detener',
    listenAyah: 'Escuchar la aleya',
    listenMeaning: 'Escuchar el significado',
    listenName: 'Escuchar',
    ariaRecite: 'Escuchar la aleya recitada por el recitador',
    ariaSpeak: 'Escuchar este texto con la voz del dispositivo',
    installVoice: 'Instala una voz en {lang} desde Ajustes',
  },
  bn: {
    listen: 'শুনুন',
    stop: 'থামান',
    listenAyah: 'আয়াত শুনুন',
    listenMeaning: 'অর্থ শুনুন',
    listenName: 'শুনুন',
    ariaRecite: 'কারীর কণ্ঠে আয়াত শুনুন',
    ariaSpeak: 'এই লেখাটি ডিভাইসের কণ্ঠে শুনুন',
    installVoice: 'সেটিংস থেকে {lang} কণ্ঠ ইনস্টল করুন',
  },
  hi: {
    listen: 'सुनें',
    stop: 'रोकें',
    listenAyah: 'आयत सुनें',
    listenMeaning: 'अर्थ सुनें',
    listenName: 'सुनें',
    ariaRecite: 'क़ारी की आवाज़ में आयत सुनें',
    ariaSpeak: 'यह पाठ डिवाइस की आवाज़ में सुनें',
    installVoice: 'सेटिंग्स से {lang} आवाज़ इंस्टॉल करें',
  },
}

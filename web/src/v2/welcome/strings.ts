import type { Lang } from '../../../../shared/api'

// The welcome page (0048-add2): its button, and the «عن التطبيق» link that shows it again. The tagline under «مسلم» is
// the app's own (i18n tagline). Arabic and English reviewed, the eight others machine-translated like the interface.
export type WelcomeStrings = { start: string; again: string; label: string }
export const WELCOME: Record<Lang, WelcomeStrings> = {
  ar: { start: 'ابدأ', again: 'صفحة الترحيب', label: 'مرحبًا بك في مسلم' },
  en: { start: 'Start', again: 'Welcome page', label: 'Welcome to Muslim' },
  ur: { start: 'شروع کریں', again: 'خوش آمدید کا صفحہ', label: 'مسلم میں خوش آمدید' },
  id: { start: 'Mulai', again: 'Halaman sambutan', label: 'Selamat datang di Muslim' },
  ms: { start: 'Mula', again: 'Halaman alu-aluan', label: 'Selamat datang ke Muslim' },
  tr: { start: 'Başla', again: 'Karşılama sayfası', label: 'Muslim’e hoş geldiniz' },
  fr: { start: 'Commencer', again: 'Page d’accueil', label: 'Bienvenue dans Muslim' },
  es: { start: 'Empezar', again: 'Página de bienvenida', label: 'Bienvenido a Muslim' },
  bn: { start: 'শুরু করুন', again: 'স্বাগত পাতা', label: 'মুসলিম-এ স্বাগতম' },
  hi: { start: 'शुरू करें', again: 'स्वागत पृष्ठ', label: 'मुस्लिम में आपका स्वागत है' },
}

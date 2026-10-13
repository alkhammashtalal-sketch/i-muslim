// What the iOS/Android app puts in the share sheet (reply 0037 §3.3), the pure part (no Capacitor: tested in
// worker/test/native-app-0037.test.ts). Inside the app nothing shared points at our server (its workers.dev address
// carries a personal name): the shared text is the text with its reference, as the caller writes it, then one line
// naming the app, then the App Store link. No URL is handed to the sheet. The web build keeps its own sharing (the
// text and the link to the page), unchanged; the ayah's image is shared as it is (web/src/native/share.ts shareImage).
import type { Lang } from '../../../shared/api'

/** The app's page on the App Store (reply 0037 §3.3). Android is paused (reply 0034): when it resumes, its own store
 *  link is decided then; until that, the app shares this one on both. */
export const APP_STORE_URL = 'https://apps.apple.com/app/id6822315551'

/**
 * The line before the App Store link, one per interface language: the app's name as the interface writes it, without
 * the letter i. Decided in reply 0039: «من تطبيق مسلم» stays, as CLAUDE.md §8 keeps the letter i out of the share text
 * («نص المشاركة») and allows it only in the logo at the foot of the welcome page; the App Store link takes the reader
 * to the app.
 */
export const SHARE_STRINGS: Record<Lang, { fromApp: string }> = {
  ar: { fromApp: 'من تطبيق مسلم' },
  en: { fromApp: 'From the Muslim app' },
  ur: { fromApp: 'مسلم ایپ سے' },
  id: { fromApp: 'Dari aplikasi Muslim' },
  ms: { fromApp: 'Daripada aplikasi Muslim' },
  tr: { fromApp: 'Muslim uygulamasından' },
  fr: { fromApp: 'Depuis l’application Muslim' },
  es: { fromApp: 'Desde la aplicación Muslim' },
  bn: { fromApp: 'মুসলিম অ্যাপ থেকে' },
  hi: { fromApp: 'मुस्लिम ऐप से' },
}

export type ShareData = { title?: string; text?: string; url?: string }
/** What the app shares instead of the web's text and link: the text with its reference, in the interface language. */
export type AppShare = { text: string; lang: string }

/** The shared text in the app: the text with its reference, the app's line, the App Store link, one per line. */
export function appShareText(text: string, lang: string): string {
  const s = SHARE_STRINGS[lang as Lang] ?? SHARE_STRINGS.ar
  return [text.trim(), s.fromApp, APP_STORE_URL].filter(Boolean).join('\n')
}

/** The share sheet's content in the app: the title (the sheet's heading) and that text; never a URL of ours. */
export const appShareData = (title: string | undefined, app: AppShare): ShareData => ({
  ...(title ? { title } : {}),
  text: appShareText(app.text, app.lang),
})

// The app's line and its store link at the foot of every share image (add-on 0072-add26 §3): ««مسلم» ✦ App Store» in
// Arabic, «Muslim · App Store» and its like in the other interfaces (the app's name as CLAUDE.md §8 writes it, without
// the letter i; «App Store» and «Google Play» are the stores' own names and stay as they are), and the QR code of the
// same link beside it (share-image.ts drawStoreMark). The rest of the image stays Arabic, whatever the interface.
import type { Lang } from '../../../../shared/api'
import { isAndroid } from '../../native/platform'
import { storeLink } from '../../native/share-text'
import { sepOf } from '../daily/arabic-marks'

/** The app's name on the image's foot, per interface language (as i18n's appName; «مسلم» in quotes in Arabic, as the
 *  images carried it before). */
export const APP_NAME_ON_IMAGE: Record<Lang, string> = {
  ar: '«مسلم»',
  en: 'Muslim',
  ur: 'مسلم',
  id: 'Muslim',
  ms: 'Muslim',
  tr: 'Muslim',
  fr: 'Muslim',
  es: 'Muslim',
  bn: 'মুসলিম',
  hi: 'मुस्लिम',
}

export type StoreMark = { line: string; rtl: boolean; url: string }

/** The foot's line and link for an interface language («✦» beside Arabic, «·» elsewhere: arabic-marks.ts sepOf). */
export function storeMark(lang: string, android = isAndroid()): StoreMark {
  const l = (lang in APP_NAME_ON_IMAGE ? lang : 'ar') as Lang
  const s = storeLink(android)
  return { line: `${APP_NAME_ON_IMAGE[l]}${sepOf(l)}${s.store}`, rtl: l === 'ar' || l === 'ur', url: s.url }
}

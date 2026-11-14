// «المساجد القريبة» in the Android app (add-on 0067-add1, Talal 18:10: «ايش الحل بدون ما نسبب اشكاليات»): the tile opens
// Google Maps searching for «مسجد», in the interface language, around the user. The maps app reads where the phone is;
// this app reads no location for it, asks no permission, and sends nothing to our server (no /api/mosques here, and the
// mosques screen's path goes home, v2/daily/TodayView.tsx). In order:
//   - Google Maps when it is on the phone (its own search link, which Android hands to the app);
//   - else any maps app the phone has (geo:0,0?q=…, the phone's own place);
//   - else Google Maps in the browser.
// The manifest lists Google Maps' package and the geo: scheme in <queries>, so Android lets the app see them.
import { AppLauncher } from '@capacitor/app-launcher'
import type { Lang } from '../../../../shared/api'

export const GOOGLE_MAPS = 'com.google.android.apps.maps'

/** The word searched, in the interface language; «مسجد» for any other. */
export const MOSQUE_WORD: Record<Lang, string> = {
  ar: 'مسجد',
  en: 'mosque',
  ur: 'مسجد',
  id: 'masjid',
  ms: 'masjid',
  tr: 'cami',
  fr: 'mosquée',
  es: 'mezquita',
  bn: 'মসজিদ',
  hi: 'मस्जिद',
}
const word = (lang: string) => MOSQUE_WORD[lang as Lang] ?? 'مسجد'

export const googleMapsSearch = (lang: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(word(lang))}`
export const geoSearch = (lang: string) => `geo:0,0?q=${encodeURIComponent(word(lang))}`

export async function openMosqueSearch(lang: string): Promise<void> {
  const google = await AppLauncher.canOpenUrl({ url: GOOGLE_MAPS }).then(
    (r) => r.value,
    () => false,
  )
  if (!google) {
    const r = await AppLauncher.openUrl({ url: geoSearch(lang) }).catch(() => ({ completed: false }))
    if (r.completed) return
  }
  await AppLauncher.openUrl({ url: googleMapsSearch(lang) })
}

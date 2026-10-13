// Directions to a mosque in the app (reply 0043-add5, Talal: «يفضل ان انت تخليها على جوجل ماب»): Google Maps first,
// through the official @capacitor/app-launcher. On iOS, the Google Maps app when it is installed (comgooglemaps, listed
// in Info.plist LSApplicationQueriesSchemes), otherwise Google's directions link; on Android, Google's link (the system
// hands it to Google Maps). Either way iOS or Android opens it outside the app, never in the web view. The small
// «خرائط أبل» link opens Apple Maps the same way. The browser keeps plain links (web/src/v2/daily/Mosques.tsx).
import { AppLauncher } from '@capacitor/app-launcher'
import type { Directions } from '../daily/mosques'
import { platform } from './platform'

export async function openGoogleDirections(d: Directions): Promise<void> {
  let url = d.google
  if (platform() === 'ios') {
    try {
      if ((await AppLauncher.canOpenUrl({ url: 'comgooglemaps://' })).value) url = d.googleApp
    } catch {
      // No answer: Google's link, which iOS opens in Google Maps or Safari.
    }
  }
  await AppLauncher.openUrl({ url })
}

export const openAppleDirections = async (d: Directions): Promise<void> => void (await AppLauncher.openUrl({ url: d.apple }))

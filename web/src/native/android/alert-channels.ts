// Android only (CLAUDE.md §14; add-ons 0072-add18 §1, 0072-add20 §1): one notification channel per alert sound, as
// Android 8+ ties the sound to the channel. The system's sound, the calm tone in res/raw, and each verified download,
// named in the interface language. Made by web/android/…/AlertSoundsPlugin.java; called behind isAndroid() from
// web/src/native/alert-sounds-device.ts, so the iPhone's path does not change.
import { ALERT_TEXT } from '../alert-strings'
import { CALM, type Ready } from '../alert-sounds'

export type ChannelSpec = { key: string; name: string; file?: string; raw?: string }

/** The channels the alerts need now, from what is ready on the phone. */
export function alertChannels(ready: Ready, lang: string): ChannelSpec[] {
  const t = ALERT_TEXT[lang] ?? ALERT_TEXT.ar
  return [
    { key: 'system', name: t.channelSystem },
    { key: 'calm', name: t.channelCalm, raw: CALM.android },
    ...(['adhan-short', 'adhan-fajr-short'] as const).filter((id) => ready[id]).map((id) => ({ key: id, name: id === 'adhan-fajr-short' ? t.channelAdhanFajr : t.channelAdhan, file: ready[id] })),
  ]
}

// The tasbih's and the adhkar counter's tap feedback (reply 0033 §ب3): @capacitor/haptics in the iOS/Android app (the
// iPhone's Taptic Engine; iOS web views have no navigator.vibrate), navigator.vibrate in a browser that has it.
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { isNative } from './platform'

/** Whether this device can give the feedback (the tasbih shows its switch only then). */
export const canBuzz = () => isNative() || (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function')

/** A short tap (under 100 ms in the web's terms) or the end of a round (the web's long buzz). */
export function buzz(ms: number) {
  if (isNative()) {
    const p = ms >= 100 ? Haptics.notification({ type: NotificationType.Success }) : Haptics.impact({ style: ms >= 50 ? ImpactStyle.Medium : ImpactStyle.Light })
    void p.catch(() => undefined)
    return
  }
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(ms)
}

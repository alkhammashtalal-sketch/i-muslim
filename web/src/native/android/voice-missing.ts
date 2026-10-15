// Whether the Android app has no voice for the language (reply 0067): VoiceMode.tsx shows VoiceMissing.tsx then.
import { useEffect, useState } from 'react'
import type { Lang } from '../../../../shared/api'
import { isAndroid } from '../platform'
import { hasAndroidVoice } from './speech'

/** In the Android app: whether the language has no voice on the phone (false until the engine has answered). */
export function useVoiceMissing(lang: Lang): boolean {
  const [missing, setMissing] = useState(false)
  useEffect(() => {
    if (!isAndroid()) return
    let alive = true
    void hasAndroidVoice(lang).then((ok) => alive && setMissing(!ok))
    return () => {
      alive = false
    }
  }, [lang])
  return missing
}

// What the iOS/Android app does by itself (reply 0033 §ب3), mounted once by App.tsx inside the app only:
//   - the bells and the portion reminder are planned again at launch, at every return to the foreground (Capacitor's
//     «resume» and the page becoming visible), and when the place, the language or the calculation changes;
//   - a tapped alert opens its page (the prayer times, or the portion's page /quran/ward);
//   - the content language's meanings are downloaded once and kept (and checked again at the next resume if a
//     download was cut short), on any network; its quiet line tells the size and the progress, and asks first only
//     above 20 MB (MeaningsStrip, reply 0037 §3.6).
// It renders nothing else.
import { useEffect, useRef } from 'react'
import { offline } from './boot'
import { onAlertTap, rescheduleAlerts } from './device'
import { MeaningsStrip } from './MeaningsStrip'

export function NativeDevice({ lang, content, go }: { lang: string; content: string; go: (path: string) => void }) {
  const now = useRef({ lang, content })
  useEffect(() => {
    now.current = { lang, content }
  }, [lang, content])

  useEffect(() => {
    void rescheduleAlerts(lang)
  }, [lang])

  useEffect(() => {
    void offline?.ensureMeanings(content)
  }, [content])

  useEffect(() => {
    // iOS sends both «resume» and «visibilitychange» on the way back: one run for both.
    let last = 0
    const again = () => {
      if (Date.now() - last < 2000) return
      last = Date.now()
      void rescheduleAlerts(now.current.lang)
      void offline?.ensureMeanings(now.current.content)
    }
    const visible = () => document.visibilityState === 'visible' && again()
    // usePlace (web/src/v2/daily/place.tsx) announces a new place with this event.
    const place = () => void rescheduleAlerts(now.current.lang)
    document.addEventListener('resume', again)
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('muslim:place', place)
    const off = onAlertTap(go)
    return () => {
      document.removeEventListener('resume', again)
      document.removeEventListener('visibilitychange', visible)
      window.removeEventListener('muslim:place', place)
      off()
    }
  }, [go])

  return offline ? <MeaningsStrip offline={offline} content={content} /> : null
}

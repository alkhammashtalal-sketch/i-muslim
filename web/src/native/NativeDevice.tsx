// What the iOS/Android app does by itself (reply 0033 §ب3), mounted once by App.tsx inside the app only:
//   - the bells and the portion reminder are planned again at launch, at every return to the foreground (Capacitor's
//     «resume» and the page becoming visible), and when the place, the language or the calculation changes;
//   - a tapped alert opens its page (the prayer times, or the portion's page /quran/ward);
//   - the content language's meanings are downloaded once and kept (and checked again at the next resume if a
//     download was cut short), on any network; its quiet line tells the size and the progress, and asks first only
//     above 20 MB (MeaningsStrip, reply 0037 §3.6).
//   - the iOS widgets' data is written again at launch, at each return, and after a change they show (the place, the
//     language, the prayer settings, the tasbih, the adhkar: «muslim:widgets»); a widget's link imuslim://… opens its
//     page (reply 0046, web/src/native/widget-data.ts, @capacitor/app).
// It renders nothing else.
import { App as CapApp } from '@capacitor/app'
import { useEffect, useRef } from 'react'
import { offline } from './boot'
import { onAlertTap, rescheduleAlerts } from './device'
import { MeaningsStrip } from './MeaningsStrip'
import { requestWidgetSync, syncWidgets } from './widget-data'

/** imuslim://today/times → /today/times; imuslim://quran/2/32 → /quran/2/32 (the host is the first segment). */
export const widgetPath = (url: string) => {
  const m = /^imuslim:\/\/([^?#]*)(\?[^#]*)?/.exec(url)
  return m ? `/${m[1].replace(/^\/+/, '')}${m[2] ?? ''}` : null
}

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
    requestWidgetSync()
  }, [lang, content])

  useEffect(() => {
    // iOS sends both «resume» and «visibilitychange» on the way back: one run for both.
    let last = 0
    const again = () => {
      if (Date.now() - last < 2000) return
      last = Date.now()
      void rescheduleAlerts(now.current.lang)
      void offline?.ensureMeanings(now.current.content)
      void syncWidgets()
    }
    const visible = () => document.visibilityState === 'visible' && again()
    // usePlace (web/src/v2/daily/place.tsx) announces a new place with this event.
    const place = () => {
      void rescheduleAlerts(now.current.lang)
      requestWidgetSync()
    }
    document.addEventListener('resume', again)
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('muslim:place', place)
    window.addEventListener('muslim:widgets', requestWidgetSync)
    const off = onAlertTap(go)
    // A widget's link opens its page.
    const link = CapApp.addListener('appUrlOpen', ({ url }) => {
      const path = widgetPath(url)
      if (path) go(path)
    })
    return () => {
      document.removeEventListener('resume', again)
      document.removeEventListener('visibilitychange', visible)
      window.removeEventListener('muslim:place', place)
      window.removeEventListener('muslim:widgets', requestWidgetSync)
      off()
      void link.then((h) => h.remove())
    }
  }, [go])

  return offline ? <MeaningsStrip offline={offline} content={content} /> : null
}

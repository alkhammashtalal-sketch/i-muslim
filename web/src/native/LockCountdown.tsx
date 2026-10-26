// «اعرض العدّ على شاشة القفل» on the times page of the iPhone app (add-on 0072-add34 §ب7): starts «عدّاد الصلاة
// القادمة», a Live Activity counting down to the next prayer on the Lock Screen and in the Dynamic Island, which says
// «حان وقت …» at its time. Shown only where the phone can show it (iOS 16.2 and later, PrayerCountdown.available).
// The times are the app's own, written for its widgets first (syncWidgets), so the card and the page agree.
import { useEffect, useState } from 'react'
import type { Lang } from '../../../shared/api'
import { ALARM_TEXT } from './alarm-strings'
import { platform } from './platform'
import { countdownMessage, PrayerCountdown, type CountdownMessage } from './prayer-countdown'

export function LockCountdown({ lang }: { lang: Lang }) {
  const t = ALARM_TEXT[lang] ?? ALARM_TEXT.ar
  const [ok, setOk] = useState<{ supported: boolean; enabled: boolean } | null>(null)
  const [active, setActive] = useState(false)
  const [fasting, setFasting] = useState(false)
  const [msg, setMsg] = useState<{ kind: CountdownMessage; prayer?: string } | null>(null)
  useEffect(() => {
    let alive = true
    // The iPhone alone (CLAUDE.md §14): elsewhere nothing is asked and nothing shows.
    if (platform() !== 'ios') return
    PrayerCountdown.available().then(
      (r) => {
        if (!alive) return
        setOk(r)
        setActive(r.active)
        setFasting(r.fasting === true)
      },
      () => alive && setOk({ supported: false, enabled: false }),
    )
    return () => {
      alive = false
    }
  }, [])
  if (!ok?.supported) return null

  const start = async () => {
    setMsg(null)
    const { syncWidgets } = await import('./widget-data')
    await syncWidgets().catch(() => undefined)
    const r = await PrayerCountdown.start().catch(() => ({ ok: false, error: 'failed' }))
    const kind = countdownMessage(r)
    setActive(kind === 'on')
    // Shown: Ramadan's countdown has left the Lock Screen for this one (PrayerPlan.LockCountdown).
    if (kind === 'on') setFasting(false)
    setMsg({ kind, prayer: 'prayer' in r ? r.prayer : undefined })
  }
  const end = async () => {
    await PrayerCountdown.end().catch(() => undefined)
    setActive(false)
    setMsg(null)
  }
  const text = (m: { kind: CountdownMessage; prayer?: string }) =>
    m.kind === 'on' ? t.countdownOn.replace('{p}', m.prayer ?? '') : m.kind === 'off' ? t.countdownOff : m.kind === 'tooFar' ? t.countdownTooFar : t.countdownError

  return (
    <div className="dt-lock-countdown" data-testid="lock-countdown">
      <div className="dt-btn-row">
        <button type="button" className="dt-btn" onClick={active ? end : start} disabled={!ok.enabled} data-testid="lock-countdown-btn">
          {active ? t.hideCountdown : t.showCountdown}
        </button>
      </div>
      {!ok.enabled && <p className="dt-note">{t.countdownOff}</p>}
      {ok.enabled && fasting && !active && (
        <p className="dt-note" data-testid="lock-countdown-ramadan">
          {t.replacesRamadan}
        </p>
      )}
      {msg && (
        <p className="dt-note" role="status">
          {text(msg)}
        </p>
      )}
    </div>
  )
}

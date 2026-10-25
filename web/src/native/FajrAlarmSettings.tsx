// «المنبّه» in the settings of the iPhone app (add-on 0072-add34 §ب6): «منبّه الفجر», off by default, on iOS 26 and
// later only (FajrAlarm.available). Only a tap on its switch turns it on, and that tap is the only moment the system's
// permission is asked. The sound: the phone's usual alarm, or «الأذان مرة» once our server offers the short adhan
// approved (as the alerts' «مطلع الأذان»), downloaded and verified on the phone first. Its device code is imported when
// used, so the web bundle never runs it.
import { useEffect, useState } from 'react'
import type { Lang } from '../../../shared/api'
import { num } from '../v2/daily/format'
import { ALARM_TEXT } from './alarm-strings'
import { alarmSoundFile, alarmSounds, enableResult, FajrAlarm, loadAlarmPrefs, saveAlarmPrefs, type AlarmPrefs, type AlarmSound } from './fajr-alarm'

export function FajrAlarmSettings({ lang }: { lang: Lang }) {
  const t = ALARM_TEXT[lang] ?? ALARM_TEXT.ar
  const [supported, setSupported] = useState(false)
  const [prefs, setPrefs] = useState<AlarmPrefs>(loadAlarmPrefs)
  const [scheduled, setScheduled] = useState(0)
  const [sounds, setSounds] = useState<AlarmSound[]>(['default'])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    FajrAlarm.available().then(
      (r) => {
        if (!alive || !r.supported) return
        setSupported(true)
        setScheduled(r.scheduled)
        // The phone is the truth: the alarm may have been turned off there (Settings) or the app reinstalled.
        setPrefs((p) => (p.on === r.on ? p : { ...p, on: r.on }))
      },
      () => undefined,
    )
    void import('./alert-sounds-device')
      .then((d) => d.serverManifest())
      .then((m) => alive && setSounds(alarmSounds(m)), () => undefined)
    return () => {
      alive = false
    }
  }, [])
  if (!supported) return null

  /** The file for the chosen sound, downloaded and checked when it is the adhan; null is the usual alarm sound. */
  const fileFor = async (s: AlarmSound): Promise<string | null> => {
    if (s !== 'adhan') return null
    const d = await import('./alert-sounds-device')
    const file = alarmSoundFile('adhan', await d.prepareSounds('adhan', lang))
    if (!file) setMsg(t.adhanFailed)
    return file
  }

  const toggle = async () => {
    if (busy) return
    setBusy(true)
    setMsg(null)
    try {
      if (prefs.on) {
        const r = await FajrAlarm.disable()
        setScheduled(r.scheduled)
        const next = { ...prefs, on: false }
        setPrefs(next)
        saveAlarmPrefs(next)
        return
      }
      const r = await FajrAlarm.enable({ sound: await fileFor(prefs.sound), stop: t.stop })
      const res = enableResult(r)
      if (res === 'ok') {
        const next = { ...prefs, on: true }
        setPrefs(next)
        saveAlarmPrefs(next)
        setScheduled(r.scheduled)
      } else setMsg(res === 'denied' ? t.denied : res === 'no_place' ? t.noPlace : t.error)
    } catch {
      setMsg(t.error)
    } finally {
      setBusy(false)
    }
  }

  const pick = async (s: AlarmSound) => {
    setMsg(null)
    const next = { ...prefs, sound: s }
    setPrefs(next)
    saveAlarmPrefs(next)
    if (!prefs.on) return
    const r = await FajrAlarm.setSound({ sound: await fileFor(s), stop: t.stop }).catch(() => null)
    if (r) setScheduled(r.scheduled)
  }

  const shown: AlarmSound = sounds.includes(prefs.sound) ? prefs.sound : 'default'
  const labels: Record<AlarmSound, string> = { default: t.soundDefault, adhan: t.soundAdhan }
  return (
    <section className="v2-set-section" aria-labelledby="set-alarm" data-testid="alarm-settings">
      <h3 id="set-alarm">{t.section}</h3>
      <div className="v2-set-group">
        <div className="row">
          <span className="row-label" id="alarm-fajr">
            {t.alarm}
          </span>
          <span className="switch-wrap">
            <button type="button" role="switch" className="switch" aria-checked={prefs.on} aria-labelledby="alarm-fajr" aria-describedby="alarm-fajr-hint" aria-busy={busy} data-testid="alarm-fajr" onClick={toggle} />
          </span>
        </div>
        <p className="v2-set-hint" id="alarm-fajr-hint">
          {t.alarmHint}
        </p>
        {prefs.on && scheduled > 0 && <p className="v2-set-hint">{t.scheduled.replace('{n}', num(scheduled, lang))}</p>}
        {prefs.on && (
          <>
            <div className="row">
              <span className="row-label" id="alarm-sound">
                {t.sound}
              </span>
            </div>
            <div className="row row-seg-only">
              <div className="segmented" role="radiogroup" aria-labelledby="alarm-sound">
                {sounds.map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={shown === s} data-testid={`alarm-sound-${s}`} onClick={() => pick(s)}>
                    {labels[s]}
                  </button>
                ))}
              </div>
            </div>
            {shown === 'adhan' && <p className="v2-set-hint">{t.adhanNote}</p>}
          </>
        )}
      </div>
      {msg && (
        <p className="v2-set-hint" role="status">
          {msg}
        </p>
      )}
    </section>
  )
}

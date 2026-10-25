// «التنبيهات» in the settings of the iOS/Android app (add-on 0072-add18 §1, §2): the prayer alert's sound, and the
// morning and evening adhkar reminders. Shown inside the app only (SettingsSheet, behind isNative()); its device code
// is imported when used, so the web bundle never runs it. The permission is asked only from a tap that turns a
// reminder on (notify.ts applyLocal), as the bells do.
import { useEffect, useState } from 'react'
import type { Lang } from '../../../shared/api'
import { num } from '../v2/daily/format'
import { loadAdhkarReminders } from './alert-prefs'
import { loadSoundPrefs, type SoundChoice } from './alert-sounds'
import { ALERT_TEXT, withN } from './alert-strings'
import { ADHKAR_MINUTES, type AdhkarReminders } from './bells'

export function AlertSettings({ lang }: { lang: Lang }) {
  const t = ALERT_TEXT[lang] ?? ALERT_TEXT.ar
  const [choice, setChoice] = useState<SoundChoice>(() => loadSoundPrefs().prayer)
  // The adhan appears only when our server offers it, approved (alert-sounds.ts offeredChoices).
  const [offered, setOffered] = useState<SoundChoice[]>(['system', 'calm'])
  const [ad, setAd] = useState<AdhkarReminders>(loadAdhkarReminders)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    void import('./alert-sounds-device')
      .then((d) => d.soundChoices())
      .then((c) => alive && c.length > 0 && setOffered(c), () => undefined)
    return () => {
      alive = false
    }
  }, [])
  const shown: SoundChoice = offered.includes(choice) ? choice : 'system'
  const labels: Record<SoundChoice, string> = { system: t.system, calm: t.calm, adhan: t.adhan }

  const pick = async (c: SoundChoice) => {
    setChoice(c)
    setMsg(null)
    const d = await import('./device')
    const r = await d.applySoundChoice(c, lang).catch(() => 'fallback' as const)
    if (r === 'fallback') setMsg(t.adhanFailed)
  }
  const apply = async (next: AdhkarReminders) => {
    const d = await import('./device')
    const r = await d.applyAdhkarReminders(next, lang).catch(() => 'error' as const)
    if (r === 'ok') {
      setAd(next)
      setMsg(null)
    } else setMsg(r === 'denied' ? t.denied : r === 'no_place' ? t.noPlace : t.error)
  }

  const reminder = (part: 'morning' | 'evening') => {
    const on = part === 'morning' ? ad.morning : ad.evening
    const min = part === 'morning' ? ad.morningMin : ad.eveningMin
    const id = `alert-${part}`
    return (
      <div className="v2-set-group" key={part}>
        <div className="row">
          <span className="row-label" id={id}>
            {part === 'morning' ? t.morning : t.evening}
          </span>
          <span className="switch-wrap">
            <button type="button" role="switch" className="switch" aria-checked={on} aria-labelledby={id} data-testid={id} onClick={() => apply({ ...ad, [part]: !on })} />
          </span>
        </div>
        <p className="v2-set-hint">{withN(part === 'morning' ? t.morningWhen : t.eveningWhen, num(min, lang))}</p>
        {on && (
          <div className="row row-seg-only">
            <div className="segmented" role="radiogroup" aria-labelledby={id}>
              {ADHKAR_MINUTES.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={min === m} onClick={() => apply({ ...ad, [part === 'morning' ? 'morningMin' : 'eveningMin']: m })}>
                  {withN(t.minutes, num(m, lang))}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <section className="v2-set-section" aria-labelledby="set-alerts" data-testid="alert-settings">
      <h3 id="set-alerts">{t.section}</h3>
      <div className="v2-set-group">
        <div className="row">
          <span className="row-label" id="alert-sound">
            {t.prayerSound}
          </span>
        </div>
        <div className="row row-seg-only">
          <div className="segmented" role="radiogroup" aria-labelledby="alert-sound">
            {offered.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={shown === c} data-testid={`alert-sound-${c}`} onClick={() => pick(c)}>
                {labels[c]}
              </button>
            ))}
          </div>
        </div>
        {offered.includes('adhan') && <p className="v2-set-hint">{t.adhanNote}</p>}
      </div>
      {reminder('morning')}
      {reminder('evening')}
      {msg && (
        <p className="v2-set-hint" role="status">
          {msg}
        </p>
      )}
    </section>
  )
}

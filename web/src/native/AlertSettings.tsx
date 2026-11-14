// «التنبيهات» in the settings of the iOS/Android app (add-on 0072-add18 §1, §2): the prayer alert's sound, and the
// morning and evening adhkar reminders, and under them the optional reminders of add-on 0072-add30 §5 (Friday, the
// fasting days, the Name of the day; all off by default, reminders.ts). Shown inside the app only (SettingsSheet, behind isNative()); its device code
// is imported when used, so the web bundle never runs it. The permission is asked only from a tap that turns a
// reminder on (notify.ts applyLocal), as the bells do.
import { useEffect, useState } from 'react'
import type { Lang } from '../../../shared/api'
import { num } from '../v2/daily/format'
import { loadAdhkarReminders, loadExtraReminders } from './alert-prefs'
import { loadSoundPrefs, loadTimeSensitive, type SoundChoice, type TimeSensitiveSetting } from './alert-sounds'
import { ALERT_TEXT, withN } from './alert-strings'
import { ADHKAR_MINUTES, type AdhkarReminders } from './bells'
import { ENTRY_TEXT } from './android/alert-channels'
import { isAndroid } from './platform'
import { REMINDER_TEXT } from './reminder-strings'
import { EXTRA_MINUTES, minKey, type ExtraReminders, type ReminderKind } from './reminders'

export function AlertSettings({ lang }: { lang: Lang }) {
  const t = ALERT_TEXT[lang] ?? ALERT_TEXT.ar
  const [choice, setChoice] = useState<SoundChoice>(() => loadSoundPrefs().prayer)
  // The adhan appears only when our server offers it, approved (alert-sounds.ts offeredChoices).
  const [offered, setOffered] = useState<SoundChoice[]>(['system', 'calm'])
  const [ad, setAd] = useState<AdhkarReminders>(loadAdhkarReminders)
  const [ex, setEx] = useState<ExtraReminders>(loadExtraReminders)
  const rt = REMINDER_TEXT[lang] ?? REMINDER_TEXT.ar
  const [msg, setMsg] = useState<string | null>(null)
  // «حساس للوقت» (add-on 0072-add34 §ب5): on the iPhone once the system reports the app able to (the entitlement); on
  // Android always, with its own wording (the entry channel, web/src/native/android/alert-channels.ts).
  const android = isAndroid()
  const tsText = android ? { tsTitle: (ENTRY_TEXT[lang] ?? ENTRY_TEXT.ar).title, tsHint: (ENTRY_TEXT[lang] ?? ENTRY_TEXT.ar).hint } : t
  const [tsOn, setTsOn] = useState<boolean>(loadTimeSensitive)
  const [tsSetting, setTsSetting] = useState<TimeSensitiveSetting | null>(null)
  useEffect(() => {
    let alive = true
    void import('./alert-sounds-device')
      .then((d) => d.timeSensitiveSetting())
      .then((v) => alive && setTsSetting(v), () => undefined)
    return () => {
      alive = false
    }
  }, [])
  const toggleTs = async () => {
    const next = !tsOn
    setTsOn(next)
    const d = await import('./device')
    await d.applyTimeSensitive(next, lang).catch(() => undefined)
  }
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

  const applyExtra = async (next: ExtraReminders) => {
    const d = await import('./device')
    const r = await d.applyExtraReminders(next, lang).catch(() => 'error' as const)
    if (r === 'ok') {
      setEx(next)
      setMsg(null)
    } else setMsg(r === 'denied' ? t.denied : r === 'no_place' ? t.noPlace : t.error)
  }

  // One row per optional reminder: its switch, what it says of its time, and its minutes once on.
  const extra = (k: ReminderKind) => {
    const on = ex[k]
    const min = ex[minKey(k)]
    const id = `alert-${k}`
    const when = k === 'friday' ? rt.fridayWhen : k === 'fastBid' ? rt.fastBidWhen : k === 'fastMonThu' ? rt.fastMonThuWhen : rt.nameDayWhen
    return (
      <div className="v2-set-group" key={k}>
        <div className="row">
          <span className="row-label" id={id}>
            {rt[k]}
          </span>
          <span className="switch-wrap">
            <button type="button" role="switch" className="switch" aria-checked={on} aria-labelledby={id} data-testid={id} onClick={() => applyExtra({ ...ex, [k]: !on })} />
          </span>
        </div>
        <p className="v2-set-hint">{withN(when, num(min, lang))}</p>
        {on && (
          <div className="row row-seg-only">
            <div className="segmented" role="radiogroup" aria-labelledby={id}>
              {EXTRA_MINUTES.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={min === m} onClick={() => applyExtra({ ...ex, [minKey(k)]: m })}>
                  {withN(t.minutes, num(m, lang))}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
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
      {(android || (tsSetting && tsSetting !== 'notSupported')) && (
        <div className="v2-set-group" data-testid="alert-ts">
          <div className="row">
            <span className="row-label" id="alert-ts">
              {tsText.tsTitle}
            </span>
            <span className="switch-wrap">
              <button type="button" role="switch" className="switch" aria-checked={tsOn} aria-labelledby="alert-ts" aria-describedby="alert-ts-hint" onClick={toggleTs} />
            </span>
          </div>
          <p className="v2-set-hint" id="alert-ts-hint">
            {tsText.tsHint}
          </p>
          {tsOn && tsSetting === 'disabled' && <p className="v2-set-hint">{t.tsOff}</p>}
        </div>
      )}
      {reminder('morning')}
      {reminder('evening')}
      {extra('friday')}
      {extra('fastBid')}
      {extra('fastMonThu')}
      <p className="v2-set-hint" data-testid="alert-fast-note">
        {rt.fastNote}
      </p>
      {extra('nameDay')}
      {msg && (
        <p className="v2-set-hint" role="status">
          {msg}
        </p>
      )}
    </section>
  )
}

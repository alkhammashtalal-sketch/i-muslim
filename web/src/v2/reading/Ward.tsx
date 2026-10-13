import { useEffect, useId, useState } from 'react'
import { useI18n } from '../../i18n'
import { getAyah } from '../../quran/api'
import { arabicDigits, fmt, numFmt } from '../../quran/format'
import { navigate, quranPath } from '../../quran/route'
import { IcBook } from './icons'
import { firstWords, portions } from './meta'
import { savedPlace } from '../../daily/location'
import { applyPush, loadPushPrefs, pushKey, pushSupported } from '../daily/push'
import { loadPrayerPrefs } from '../daily/store'
import { setWard, useReading } from './store'
import { Chips, PageHead, useReadingStrings } from './ui'
import { isolate, useSuras } from './useSuraNames'

const PRESETS = [7, 15, 30, 60]

/** «وردي» (reply 0032 C-5, boards WardAfter and WardAfterN): a khatma in a chosen number of days, today's portion,
 *  and how much is read. No day counter, no streak and no reproach: the next portion waits where the reader stopped
 *  («إذا فاتك يوم، نكمل من حيث وقفت»). The reminder is inside the app (the reader's index) until notifications
 *  arrive (part E). All on this device. */
export function Ward() {
  const { lang } = useI18n()
  const r = useReadingStrings()
  const num = lang === 'ar' ? arabicDigits : numFmt(lang)
  const { ward } = useReading()
  const suras = useSuras()
  const name = (n: number) => isolate(suras?.find((s) => s.n === n)?.name ?? num(n))
  const list = portions(ward.days)
  const done = Math.min(ward.done, list.length)
  const today = list[done]
  const [first, setFirst] = useState<{ key: string; cut: string; more: boolean } | null>(null)
  const [custom, setCustom] = useState(false)
  // Part E: with notifications available, the reminder is a push «every day half an hour after Isha» at the reader’s city (reply 0031-add16 §7).
  const [pushOn, setPushOn] = useState(false)
  const [pushMsg, setPushMsg] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    if (pushSupported()) void pushKey().then((k) => alive && setPushOn(Boolean(k)))
    return () => {
      alive = false
    }
  }, [])
  const toggleReminder = async () => {
    const on = !ward.reminder
    if (pushOn) {
      const prefs = loadPrayerPrefs()
      const res = await applyPush({ ...loadPushPrefs(), ward: on }, { place: savedPlace(), method: prefs.method, asr: prefs.asr, lang })
      if (res !== 'ok') {
        setPushMsg(res === 'no_place' ? r.wardReminderNoPlace : null)
        if (res === 'no_place') return
      } else setPushMsg(null)
    }
    setWard({ reminder: on })
  }
  const [customValue, setCustomValue] = useState(String(ward.days))
  const inputId = useId()
  const key = today ? `${today.from[0]}:${today.from[1]}` : ''

  useEffect(() => {
    if (!key) return
    const [s, a] = key.split(':').map(Number)
    let alive = true
    getAyah(s, a).then(
      (p) => {
        if (alive && p) setFirst({ key, ...firstWords(p.text) })
      },
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [key])

  const changeDays = (days: number) => {
    const d = Math.max(1, Math.min(604, Math.round(days)))
    // The part already read keeps its share of the Quran in the new plan.
    setWard({ days: d, done: Math.min(d, Math.round((done / list.length) * portions(d).length)) })
  }
  const label = (p: [number, number]) => `${name(p[0])} ${num(p[1])}`
  const portionTitle = ward.days === 30 ? 'juzN' : 'wardPortion'
  const segments = list.length <= 60

  return (
    <div className="rd-page">
      <PageHead title={r.wardTitle} onBack={() => navigate('/quran')} />
      <section className="rd-card" style={{ padding: '14px 16px 12px' }} aria-labelledby="ward-today">
        {today ? (
          <>
            <div className="rd-row-label" id="ward-today">
              {r.wardToday}
            </div>
            <div className="rd-ward-big">{fmt(r[portionTitle], { n: num(done + 1) })}</div>
            <div style={{ fontSize: '0.9375rem', marginTop: 2 }}>{fmt(r.wardFromTo, { from: label(today.from), to: label(today.to) })}</div>
            {first?.key === key && (
              <div className="rd-first rd-muted" style={{ margin: '10px 0 12px' }}>
                <span lang="ar" dir="rtl">
                  {first.cut}
                  {first.more ? ' …' : ''}
                </span>
              </div>
            )}
            <button type="button" className="rd-primary" onClick={() => navigate(quranPath(today.from[0], today.from[1]))}>
              <IcBook />
              {r.wardStart}
            </button>
            <button type="button" className="rd-secondary" style={{ marginTop: 8 }} onClick={() => setWard({ done: done + 1 })}>
              {r.wardDone}
            </button>
            <p className="rd-status">{r.wardMissed}</p>
          </>
        ) : (
          <>
            <p className="rd-ward-big" style={{ margin: 0 }}>
              {r.khatmaComplete}
            </p>
            <button type="button" className="rd-primary" style={{ marginTop: 12 }} onClick={() => setWard({ done: 0 })}>
              {r.khatmaAgain}
            </button>
          </>
        )}
      </section>

      <section className="rd-card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
          <span className="rd-section-title" style={{ margin: 0 }}>
            {fmt(r.khatmaIn, { n: num(ward.days) })}
          </span>
          <span className="rd-row-sub">{fmt(r.wardProgress, { n: num(done), total: num(list.length) })}</span>
        </div>
        <div className="rd-progress" role="progressbar" aria-valuemin={0} aria-valuemax={list.length} aria-valuenow={done} aria-label={fmt(r.khatmaIn, { n: num(ward.days) })}>
          {segments ? list.map((_, i) => <span key={i} className={i < done ? 'is-done' : ''} />) : <span style={{ background: `linear-gradient(to left, var(--primary) ${(100 * done) / list.length}%, var(--track) 0)` }} />}
        </div>
      </section>

      <section className="rd-card" style={{ padding: '6px 16px' }}>
        <div className="rd-row" style={{ cursor: 'default' }}>
          <span className="rd-row-main">
            <span className="rd-row-title" style={{ fontWeight: 500 }} id="ward-rem">
              {r.wardReminder}
            </span>
            <span className="rd-row-sub">{pushOn ? r.wardReminderPush : r.wardReminderSub}</span>
            {pushMsg && (
              <span className="rd-row-sub" role="status">
                {pushMsg}
              </span>
            )}
          </span>
          <button type="button" role="switch" className="rd-switch" aria-checked={ward.reminder} aria-labelledby="ward-rem" onClick={() => void toggleReminder()} />
        </div>
      </section>

      <section className="rd-card" style={{ padding: '12px 16px 14px' }}>
        <p className="rd-section-title">{r.wardDuration}</p>
        <Chips<number | 'custom'>
          label={r.wardDuration}
          value={custom || !PRESETS.includes(ward.days) ? 'custom' : ward.days}
          onChange={(v) => {
            if (v === 'custom') return setCustom(true)
            setCustom(false)
            changeDays(v)
          }}
          options={[...PRESETS.map((d) => ({ value: d as number | 'custom', label: d === 7 ? r.days7 : fmt(r.daysN, { n: num(d) }) })), { value: 'custom', label: r.customDays }]}
        />
        {(custom || !PRESETS.includes(ward.days)) && (
          <form
            className="rd-custom"
            onSubmit={(e) => {
              e.preventDefault()
              const n = Number(customValue.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))))
              if (Number.isFinite(n) && n >= 1) changeDays(n)
            }}
          >
            <label htmlFor={inputId}>
              {r.customDaysLabel}
              <input id={inputId} inputMode="numeric" value={customValue} onChange={(e) => setCustomValue(e.target.value)} />
            </label>
            <button type="submit" className="rd-secondary">
              {r.customDaysApply}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}

/** The in-app reminder (until part E): a line on the reader's index while today's portion waits. */
export function WardReminderLine() {
  const { lang } = useI18n()
  const r = useReadingStrings()
  const num = lang === 'ar' ? arabicDigits : numFmt(lang)
  const { ward } = useReading()
  const list = portions(ward.days)
  if (!ward.reminder || ward.done >= list.length) return null
  const portion = fmt(ward.days === 30 ? r.juzN : r.wardPortion, { n: num(ward.done + 1) })
  return (
    <a
      className="rd-reminder"
      href="/quran/ward"
      onClick={(e) => {
        e.preventDefault()
        navigate('/quran/ward')
      }}
    >
      <IcBook size={20} />
      {fmt(r.wardReminderLine, { portion })}
    </a>
  )
}

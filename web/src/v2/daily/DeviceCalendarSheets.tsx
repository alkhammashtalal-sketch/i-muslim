// «أضف إلى تقويم الجهاز» and «أضف المناسبات إلى تقويم الجهاز» on the calendar page (reply 0062 §2; reply 0072 item 14).
// Shown only where the phone's calendar can take them (web/src/native/device-calendar.ts): a day on the iPhone (iOS 17
// and later) and on Android, the occasions' list and the reminders on the iPhone. Nothing is stored by us: the sheet
// keeps what is typed until it closes (the page mounts a sheet each time it opens, so each opening starts empty), and
// the event goes to the phone's calendar.
import { useEffect, useId, useMemo, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { useI18n } from '../../i18n'
import { addToDeviceCalendar, deviceCalendarAbility, type Ability, type AddResult } from '../../native/device-calendar'
import { dayEvent, hijriOf, occasionEvents, occasionSpans, YEARLY, type Reminder } from './device-calendar'
import { fill, gregorianText, plural } from './format'
import { DEVCAL } from './strings-devcal'
import { TODAY } from './strings-today'

/** What this phone can add, asked once. */
export function useDeviceCalendar(): Ability {
  const [a, setA] = useState<Ability>({ day: false, many: false, reminders: false })
  useEffect(() => {
    let alive = true
    deviceCalendarAbility().then((v) => alive && setA(v))
    return () => {
      alive = false
    }
  }, [])
  return a
}

function ResultLine({ r }: { r: AddResult | null }) {
  const { lang } = useI18n()
  const d = DEVCAL[lang]
  if (!r) return null
  const text = r.kind === 'added' ? (r.n === 1 ? d.added : plural(d.addedN, r.n, lang)) : r.kind === 'opened' ? d.opened : r.kind === 'denied' ? d.denied : d.failed
  return (
    <p className="dt-body dt-devcal-result" role="status" data-result={r.kind}>
      {text}
    </p>
  )
}

function Choice<T extends string>({ name, value, current, set, label }: { name: string; value: T; current: T; set: (v: T) => void; label: string }) {
  return (
    <label className="dt-choice">
      <input type="radio" name={name} value={value} checked={current === value} onChange={() => set(value)} />
      <span>{label}</span>
    </label>
  )
}

/** A day: the title typed by the user, the day in Hijri and Gregorian, all day or at a time, and its reminder. */
export function AddDaySheet({ open, onClose, date, offset, ability }: { open: boolean; onClose: () => void; date: Date; offset: number; ability: Ability }) {
  const { lang } = useI18n()
  const d = DEVCAL[lang]
  const id = useId()
  const [title, setTitle] = useState('')
  const [timed, setTimed] = useState<'all' | 'time'>('all')
  const [time, setTime] = useState('09:00')
  const [reminder, setReminder] = useState<Reminder>('none')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<AddResult | null>(null)
  const hijri = hijriOf(date, offset, lang, true)
  const greg = gregorianText(date, lang, { day: 'numeric', month: 'long', year: 'numeric' })
  const at = /^(\d{1,2}):(\d{2})$/.exec(time)
  const ok = title.trim().length > 0 && (timed === 'all' || !!at)

  async function add() {
    if (!ok || busy) return
    setBusy(true)
    const e = dayEvent(title, date, offset, lang, timed === 'time' && at ? { h: Number(at[1]), min: Number(at[2]) } : null, ability.reminders ? reminder : 'none')
    setResult(await addToDeviceCalendar([e]))
    setBusy(false)
  }

  return (
    <Sheet open={open} onClose={onClose} title={d.addDay}>
      <form
        className="dt-form dt-devcal"
        onSubmit={(e) => {
          e.preventDefault()
          void add()
        }}
      >
        <p className="dt-devcal-day">
          {hijri && <bdi className="dt-devcal-hijri">{hijri}</bdi>}
          <bdi className="dt-muted">{greg}</bdi>
        </p>
        <label className="dt-search">
          <span className="dt-label">{d.eventTitle}</span>
          <input id={`${id}-title`} type="text" value={title} maxLength={120} placeholder={d.eventTitleHint} onChange={(e) => setTitle(e.target.value)} dir="auto" />
        </label>
        <fieldset className="dt-choices dt-choices-row">
          <legend>{d.when}</legend>
          <Choice name={`${id}-when`} value="all" current={timed} set={setTimed} label={d.allDay} />
          <Choice name={`${id}-when`} value="time" current={timed} set={setTimed} label={d.atTime} />
        </fieldset>
        {timed === 'time' && (
          <label className="dt-search">
            <span className="dt-label">{d.timeOfDay}</span>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
        )}
        {ability.reminders ? (
          <fieldset className="dt-choices dt-choices-row">
            <legend>{d.reminder}</legend>
            <Choice name={`${id}-rem`} value="none" current={reminder} set={setReminder} label={d.remNone} />
            <Choice name={`${id}-rem`} value="at" current={reminder} set={setReminder} label={d.remAt} />
            <Choice name={`${id}-rem`} value="dayBefore" current={reminder} set={setReminder} label={d.remDayBefore} />
          </fieldset>
        ) : (
          <p className="dt-note">{d.androidReminder}</p>
        )}
        <p className="dt-note">{d.onDevice}</p>
        <button type="submit" className="dt-btn dt-btn-primary" disabled={!ok || busy}>
          {d.add}
        </button>
        <ResultLine r={result} />
      </form>
    </Sheet>
  )
}

/** The occasions: the user picks, all-day events for the next three years, and a reminder a day before or none. */
export function AddOccasionsSheet({ open, onClose, offset }: { open: boolean; onClose: () => void; offset: number }) {
  const { lang } = useI18n()
  const d = DEVCAL[lang]
  const s = TODAY[lang]
  const id = useId()
  const [chosen, setChosen] = useState<string[]>([])
  const [reminder, setReminder] = useState<'none' | 'dayBefore'>('none')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<AddResult | null>(null)
  const [today] = useState(() => new Date())
  // All the occasions' runs for three years, computed once per opening (each occasion's are independent of the
  // others'); the chosen ones are added, and each occasion's next run is shown under its name, to check against the page.
  const all = useMemo(() => (open ? occasionSpans(YEARLY.map((e) => e.key), today, offset, 3) : []), [open, today, offset])
  const spans = useMemo(() => all.filter((x) => chosen.includes(x.key)), [all, chosen])
  const next = (key: string) => all.find((x) => x.key === key)
  const names = s.events as Record<string, string>

  async function add() {
    if (!spans.length || busy) return
    setBusy(true)
    setResult(await addToDeviceCalendar(occasionEvents(spans, offset, lang, names, s.courtLine, reminder)))
    setBusy(false)
  }

  return (
    <Sheet open={open} onClose={onClose} title={d.addOccasions}>
      <div className="dt-form dt-devcal">
        <p className="dt-body">{d.occasionsIntro}</p>
        <fieldset className="dt-choices">
          {YEARLY.map((e) => {
            const n = next(e.key)
            return (
              <label key={e.key} className="dt-choice dt-devcal-occ">
                <input
                  type="checkbox"
                  value={e.key}
                  checked={chosen.includes(e.key)}
                  onChange={(ev) => setChosen((c) => (ev.target.checked ? [...c, e.key] : c.filter((k) => k !== e.key)))}
                />
                <span>
                  <span className="dt-devcal-name">{names[e.key] ?? e.name}</span>
                  {n && (
                    <span className="dt-muted dt-devcal-next">
                      {fill(d.nextOn, { date: `${hijriOf(n.start, offset, lang)} · ${gregorianText(n.start, lang, { day: 'numeric', month: 'long', year: 'numeric' })}` })}
                    </span>
                  )}
                </span>
              </label>
            )
          })}
        </fieldset>
        <fieldset className="dt-choices dt-choices-row">
          <legend>{d.reminder}</legend>
          <Choice name={`${id}-rem`} value="none" current={reminder} set={setReminder} label={d.remNone} />
          <Choice name={`${id}-rem`} value="dayBefore" current={reminder} set={setReminder} label={d.remDayBefore} />
        </fieldset>
        <p className="dt-note" aria-live="polite">
          {plural(d.willAdd, spans.length, lang)}
        </p>
        <p className="dt-note">{d.onDevice}</p>
        <button type="button" className="dt-btn dt-btn-primary" disabled={!spans.length || busy} onClick={() => void add()}>
          {d.add}
        </button>
        <ResultLine r={result} />
      </div>
    </Sheet>
  )
}

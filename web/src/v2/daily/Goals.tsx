// My goals (reply 0032 D-7; board Goals), on the device only (web/src/daily/goals.ts): a tick for today, the number
// of days done out of the days the user chose, and a bar. No streak, and missing a day never takes the count back.
import { useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { daysDone, loadGoals, saveGoals, setDone, type Goal } from '../../daily/goals'
import { useI18n } from '../../i18n'
import { fill, num, plural } from './format'
import { IcChecked, IcClose, IcPlus, IcUnchecked } from './icons'
import { Privacy, Screen } from './Screen'
import { TODAY } from './strings-today'

/** Today's date on the device, YYYY-MM-DD. */
export const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const TARGETS = [30, 40, 100]

export function Goals() {
  const { lang } = useI18n()
  const s = TODAY[lang]
  const [goals, setGoals] = useState<Goal[]>(loadGoals)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState(40)
  const today = localDay()
  const update = (g: Goal[]) => {
    setGoals(g)
    saveGoals(g)
  }
  const add = (name: string) => {
    const t = name.trim()
    if (!t) return
    update([...goals, { id: `g${Date.now().toString(36)}`, title: t.slice(0, 80), createdAt: today, doneDays: [], target }])
    setTitle('')
    setAdding(false)
  }

  return (
    <Screen title={s.goalsTitle}>
      <p className="dt-intro">
        {s.goalsIntro} <b>{s.goalsIntroBold}</b>
      </p>
      {goals.length > 0 && (
        <section className="dt-card dt-goals">
          {goals.map((g) => {
            const done = g.doneDays.includes(today)
            const n = daysDone(g)
            const of = g.target ?? 40
            return (
              <div key={g.id} className="dt-goal">
                {editing ? (
                  <button type="button" className="dt-goal-tick" aria-label={fill(s.removeGoal, { g: g.title })} onClick={() => update(goals.filter((x) => x.id !== g.id))}>
                    <IcClose />
                  </button>
                ) : (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    className={`dt-goal-tick${done ? ' is-done' : ''}`}
                    aria-label={fill(s.doneToday, { g: g.title })}
                    onClick={() => update(goals.map((x) => (x.id === g.id ? setDone(x, today, !done) : x)))}
                  >
                    {done ? <IcChecked /> : <IcUnchecked />}
                  </button>
                )}
                <span className="dt-goal-text">
                  <span className="dt-row-title">{g.title}</span>
                  <span className="dt-row-sub">{plural(s.doneOf, n, lang, { t: num(of, lang) })}</span>
                  <span className="dt-bar" role="presentation">
                    <span style={{ width: `${Math.min(100, Math.round((100 * n) / of))}%` }} />
                  </span>
                </span>
              </div>
            )
          })}
        </section>
      )}
      <button type="button" className="dt-btn dt-btn-wide" onClick={() => setAdding(true)}>
        <IcPlus />
        {s.addGoal}
      </button>
      {goals.length > 0 && (
        <button type="button" className="dt-textbtn" onClick={() => setEditing(!editing)} aria-pressed={editing}>
          {editing ? s.doneEditing : s.editGoals}
        </button>
      )}
      <Privacy>{s.privacyGoals}</Privacy>

      <Sheet open={adding} onClose={() => setAdding(false)} title={s.addGoalTitle}>
        <div className="dt-chips">
          {s.presets
            .filter((p) => !goals.some((g) => g.title === p))
            .map((p) => (
              <button key={p} type="button" className="dt-chip" onClick={() => add(p)}>
                {p}
              </button>
            ))}
        </div>
        <form
          className="dt-form"
          onSubmit={(e) => {
            e.preventDefault()
            add(title)
          }}
        >
          <label className="dt-search">
            <span className="dt-label">{s.goalName}</span>
            <input type="text" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <fieldset className="dt-choices dt-choices-row">
            <legend className="dt-label">{s.goalDays}</legend>
            {TARGETS.map((n) => (
              <label key={n} className="dt-choice">
                <input type="radio" name="dt-target" checked={target === n} onChange={() => setTarget(n)} />
                <span>{plural(s.daysN, n, lang)}</span>
              </label>
            ))}
          </fieldset>
          <button type="submit" className="dt-btn dt-btn-primary" disabled={!title.trim()}>
            {s.save}
          </button>
        </form>
      </Sheet>
    </Screen>
  )
}

// Prayer times (reply 0032 D-2; boards PrayerTimes, PrayerTimesN), from the engine of reply 0031-add10
// (web/src/daily/prayer.ts, on the device). The place row opens «مكانك»; the next prayer with the time left and the
// progress since the previous one; the six times; suhoor, iftar and the night; the times voluntary prayer is not prayed;
// the calculation method. Hidden on purpose:
//   - the alarm bells, until part E (notifications) exists;
//   - the quoted texts and the source line of the forbidden times: the Ibn Baz fatwa numbers given for them do not open
//     those fatwas on binbaz.org.sa (docs/SOURCES.md), so nothing is quoted until the links are verified (V2 rule 3).
import { useEffect, useMemo, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { forbiddenWindows } from '../../daily/forbidden'
import { dayTimes, METHODS, ymdIn, type DayTimes, type Method } from '../../daily/prayer'
import type { Place } from '../../daily/location'
import { useI18n } from '../../i18n'
import { duration, fill, hijriWritten, gregorianText, timeOf } from './format'
import { IcChevron, IcPin } from './icons'
import { Privacy, Screen } from './Screen'
import { PlaceSheet, usePlace, usePlaceName } from './place'
import { loadPrayerPrefs, savePrayerPrefs, type PrayerPrefs } from './store'
import { TODAY } from './strings-today'

type Five = 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha'
const FIVE: Five[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']
const SIX = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
const DAY = 86_400_000

/** A minute clock: re-renders on each minute. */
export function useNow(stepMs = 30_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), stepMs)
    return () => clearInterval(id)
  }, [stepMs])
  return now
}

/** Today's times, the next of the five and the previous one, for a place, at an instant. */
export function prayerState(place: Place, now: Date, prefs: PrayerPrefs) {
  const opts = { method: prefs.method, asr: prefs.asr }
  const today = dayTimes(place, ymdIn(now, place.timeZone), opts)
  let next: { name: Five; at: Date } | null = null
  for (const n of FIVE) if (today[n] > now) (next ??= { name: n, at: today[n] })
  let prev: { name: Five; at: Date }
  if (!next) {
    const tomorrow = dayTimes(place, ymdIn(new Date(now.getTime() + DAY), place.timeZone), opts)
    next = { name: 'fajr', at: tomorrow.fajr }
    prev = { name: 'isha', at: today.isha }
  } else if (next.name === 'fajr') {
    const yesterday = dayTimes(place, ymdIn(new Date(now.getTime() - DAY), place.timeZone), opts)
    prev = { name: 'isha', at: yesterday.isha }
  } else prev = { name: FIVE[FIVE.indexOf(next.name) - 1], at: today[FIVE[FIVE.indexOf(next.name) - 1]] }
  return { today, next, prev }
}

export function PrayerTimes() {
  const { lang } = useI18n()
  const s = TODAY[lang]
  const [place, setPlace] = usePlace()
  const placeName = usePlaceName(place)
  const [prefs, setPrefs] = useState<PrayerPrefs>(loadPrayerPrefs)
  const [sheet, setSheet] = useState<'place' | 'method' | null>(null)
  const now = useNow()
  const state = useMemo(() => (place ? prayerState(place, now, prefs) : null), [place, now, prefs])
  const tz = place?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const t = (d: Date) => timeOf(d, lang, tz)
  const setP = (p: PrayerPrefs) => {
    setPrefs(p)
    savePrayerPrefs(p)
  }

  const hijri = hijriWritten(now, lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, tz)
  const greg = gregorianText(now, lang, { day: 'numeric', month: 'long' }, tz)

  return (
    <Screen title={s.timesTitle}>
      <div className="dt-placerow">
        <button type="button" className="dt-place-btn" onClick={() => setSheet('place')} aria-label={fill(s.changePlace, { place: placeName ?? s.placeTitle })}>
          <IcPin />
          {place ? (
            <>
              {placeName ?? s.placeTitle}
              {place.source === 'gps' && <span className="dt-muted"> · {s.auto}</span>}
            </>
          ) : (
            s.setCity
          )}
        </button>
        <span className="dt-date">
          {hijri && (
            <>
              <bdi>{hijri}</bdi> ·{' '}
            </>
          )}
          <bdi>{greg}</bdi>
        </span>
      </div>

      {!place || !state ? (
        <section className="dt-card dt-pad">
          <p className="dt-lead">{s.setCity}</p>
          <button type="button" className="dt-btn dt-btn-primary" onClick={() => setSheet('place')}>
            <IcPin />
            {s.placeTitle}
          </button>
        </section>
      ) : (
        <>
          <NextCard state={state} now={now} t={t} />
          <section className="dt-card dt-rows" aria-label={s.timesTitle}>
            {SIX.map((n) => (
              <div key={n} className={`dt-time${state.next.name === n && state.next.at.getTime() === state.today[n].getTime() ? ' is-next' : ''}`}>
                <span className="dt-time-name">{s.prayers[n]}</span>
                <span className="dt-time-at">{t(state.today[n])}</span>
              </div>
            ))}
          </section>
          <section className="dt-card dt-list">
            <h2>{s.suhoorTitle}</h2>
            <Row title={s.suhoorEnds} sub={s.atFajr} value={t(state.today.suhoorEnd)} />
            <Row title={s.iftar} sub={s.atMaghrib} value={t(state.today.iftar)} />
            <Row title={s.midnight} value={t(state.today.midnight)} />
            <Row title={s.lastThird} value={t(state.today.lastThird)} />
          </section>
          <Forbidden today={state.today} t={t} />
          <section className="dt-card dt-link-card">
            <button type="button" className="dt-linkrow" onClick={() => setSheet('method')}>
              <span>
                <span className="dt-row-title">{fill(s.methodLine, { m: s.methods[prefs.method] })}</span>
                {prefs.method === 'UmmAlQura' && <span className="dt-row-sub">{s.ramadanIsha}</span>}
              </span>
              <IcChevron />
            </button>
          </section>
        </>
      )}
      <Privacy>{s.privacyTimes}</Privacy>

      <PlaceSheet
        open={sheet === 'place'}
        onClose={() => setSheet(null)}
        onPick={(p) => {
          setPlace(p)
          setSheet(null)
        }}
      />
      <Sheet open={sheet === 'method'} onClose={() => setSheet(null)} title={s.methodTitle}>
        <fieldset className="dt-choices">
          <legend className="sr-only">{s.methodTitle}</legend>
          {METHODS.map((m: Method) => (
            <label key={m} className="dt-choice">
              <input type="radio" name="dt-method" checked={prefs.method === m} onChange={() => setP({ ...prefs, method: m })} />
              <span>{s.methods[m]}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className="dt-choices">
          <legend>{s.asrTitle}</legend>
          {(['shafi', 'hanafi'] as const).map((a) => (
            <label key={a} className="dt-choice">
              <input type="radio" name="dt-asr" checked={prefs.asr === a} onChange={() => setP({ ...prefs, asr: a })} />
              <span>{a === 'shafi' ? s.asrShafi : s.asrHanafi}</span>
            </label>
          ))}
        </fieldset>
      </Sheet>
    </Screen>
  )
}

function NextCard({ state, now, t }: { state: ReturnType<typeof prayerState>; now: Date; t: (d: Date) => string }) {
  const { lang } = useI18n()
  const s = TODAY[lang]
  const { next, prev } = state
  const span = next.at.getTime() - prev.at.getTime()
  const done = Math.min(1, Math.max(0, (now.getTime() - prev.at.getTime()) / span))
  return (
    <section className="dt-card dt-next">
      <div className="dt-muted">{s.nextPrayer}</div>
      <div className="dt-next-row">
        <span className="dt-next-name">{s.prayers[next.name]}</span>
        <span className="dt-next-at">{t(next.at)}</span>
      </div>
      <div className="dt-next-in">{fill(s.inDuration, { d: duration(next.at.getTime() - now.getTime(), lang, s) })}</div>
      <div className="dt-progress" role="presentation">
        <span style={{ width: `${Math.round(done * 100)}%` }} />
      </div>
      <div className="dt-next-ends">
        <span>
          {s.prayers[prev.name]} {t(prev.at)}
        </span>
        <span>
          {s.prayers[next.name]} {t(next.at)}
        </span>
      </div>
    </section>
  )
}

function Forbidden({ today, t }: { today: DayTimes; t: (d: Date) => string }) {
  const { lang } = useI18n()
  const s = TODAY[lang]
  const [a, b, c] = forbiddenWindows(today)
  return (
    <section className="dt-card dt-list">
      <h2>{s.forbiddenTitle}</h2>
      <Row title={s.afterSunrise} value={fill(s.range, { a: t(a.from), b: t(a.to) })} />
      <Row title={s.beforeZawal} value={fill(s.range, { a: t(b.from), b: t(b.to) })} />
      <Row title={s.afterAsr} sub={s.afterAsrNote} value={fill(s.until, { b: t(c.to) })} />
    </section>
  )
}

export function Row({ title, sub, value }: { title: string; sub?: string; value: string }) {
  return (
    <div className="dt-row">
      <span className="dt-row-text">
        <span className="dt-row-title">{title}</span>
        {sub && <span className="dt-row-sub">{sub}</span>}
      </span>
      <span className="dt-row-value">{value}</span>
    </div>
  )
}

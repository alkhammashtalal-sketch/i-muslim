// «رمضان» at /today/ramadan (imuslim://today/ramadan; add-ons 0072-add26 §4 and 0072-add34 §ب8). From 1 Sha'ban it
// counts down to Ramadan; in Ramadan it is complete: the day of the month, the countdown to iftar or to the Fajr adhan
// (and on the iPhone the same countdown on the Lock Screen), and every day the month's table. The table is the app's
// own prayer times for the saved place with the times screen's settings (ramadan-model.ts); the end of suhoor is the
// Fajr adhan and there is no «إمساك» column. Under it Ibn Baz's fatwa 11916 as stored from its page, with its link.
import { useEffect, useMemo, useState } from 'react'
import type { Lang } from '../../../../../shared/api'
import { useI18n } from '../../../i18n'
import { ymdIn } from '../../../daily/prayer'
import { countdownAvailable, countLocale, FastingCountdown } from '../../../native/fasting-countdown'
import { fatwa } from '../fatwas'
import { duration, fill, gregorianText, num, timeOf } from '../format'
import { useHijriOffset } from '../hijri-offset'
import { PlaceSheet, usePlace, usePlaceName } from '../place'
import { useNow } from '../PrayerTimes'
import { Screen } from '../Screen'
import { StoredText } from '../StoredText'
import { loadPrayerChoices, prayerOptions, resolvePrayer } from '../store'
import { TODAY } from '../strings-today'
import { countdownAt, hoursMinutes, liveFits, monthTable, ramadanState, type Countdown, type RamadanState } from './ramadan-model'
import { RAMADAN } from './strings-ramadan'
import './ramadan.css'

const civilNoon = (d: { y: number; m: number; d: number }) => new Date(Date.UTC(d.y, d.m - 1, d.d, 12))

export function RamadanPage() {
  const { lang } = useI18n()
  const R = RAMADAN[lang]
  const s = TODAY[lang]
  const [place, setPlace] = usePlace()
  const placeName = usePlaceName(place)
  const [sheet, setSheet] = useState(false)
  const offset = useHijriOffset()
  const now = useNow(15_000)
  const tz = place?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const today = ymdIn(now, tz)
  const todayKey = `${today.y}-${today.m}-${today.d}`
  const state = useMemo(() => ramadanState(today, offset), [todayKey, offset])
  const prefs = useMemo(() => resolvePrayer(loadPrayerChoices(), place), [place])
  const opts = useMemo(() => prayerOptions(prefs), [prefs])
  const rows = useMemo(() => (place && state ? monthTable(place, state.ramadan.days, opts) : null), [place, state, opts])
  const countdown = place && state?.phase === 'ramadan' ? countdownAt(place, now, state.ramadan.days, opts) : null
  const y = state ? num(state.ramadan.year, lang) : ''

  return (
    <Screen title={R.title}>
      {!state ? (
        <section className="dt-card dt-pad">
          <p className="dt-note">{R.noCalendar}</p>
        </section>
      ) : (
        <>
          <section className="dt-card dt-pad rm-head" data-testid="ramadan-head" data-phase={state.phase}>
            <h2>{fill(R.yearTitle, { y })}</h2>
            {state.phase === 'ramadan' ? (
              <TodayInRamadan state={state} countdown={countdown} now={now} lang={lang} tz={tz} placeName={placeName} rowFast={rows?.[(state.dayN ?? 1) - 1]?.fastMs ?? null} />
            ) : (
              <>
                <p className="rm-big" data-testid="ramadan-until">
                  {fill(R.untilRamadan, { d: daysText(state.daysLeft ?? 0, lang) })}
                </p>
                <p className="dt-note">{fill(R.firstDay, { date: dateLong(state.ramadan.days[0], lang) })}</p>
              </>
            )}
            <p className="dt-note">{s.courtLine}</p>
          </section>

          {!place ? (
            <section className="dt-card dt-pad">
              <p className="dt-lead">{s.setCity}</p>
              <button type="button" className="dt-btn dt-btn-primary" onClick={() => setSheet(true)}>
                {s.placeTitle}
              </button>
            </section>
          ) : (
            rows && (
              <section className="dt-card dt-pad rm-table-card" aria-labelledby="rm-table-h">
                <h2 id="rm-table-h">{R.tableTitle}</h2>
                <p className="dt-note">
                  {placeName ? `${placeName} · ` : ''}
                  {fill(s.methodLine, { m: s.methods[prefs.method] })}
                </p>
                <div className="rm-scroll" tabIndex={0} role="region" aria-labelledby="rm-table-h">
                  <table className="rm-table" data-testid="ramadan-table">
                    <thead>
                      <tr>
                        <th scope="col">{R.colDay}</th>
                        <th scope="col">{R.colDate}</th>
                        <th scope="col">
                          {s.prayers.fajr}
                          <span className="rm-th-sub">{R.fajrSub}</span>
                        </th>
                        <th scope="col">{s.prayers.sunrise}</th>
                        <th scope="col">{s.prayers.dhuhr}</th>
                        <th scope="col">{s.prayers.asr}</th>
                        <th scope="col">
                          {s.prayers.maghrib}
                          <span className="rm-th-sub">{s.iftar}</span>
                        </th>
                        <th scope="col">{s.prayers.isha}</th>
                        <th scope="col">{R.colFast}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const isToday = r.day.y === today.y && r.day.m === today.m && r.day.d === today.d
                        const t = (d: Date) => timeOf(d, lang, tz)
                        return (
                          <tr key={r.n} className={isToday ? 'is-today' : undefined} aria-current={isToday ? 'date' : undefined}>
                            <th scope="row">{num(r.n, lang)}</th>
                            <td>{gregorianText(civilNoon(r.day), lang, { day: 'numeric', month: 'short' }, 'UTC')}</td>
                            <td className="rm-strong">{t(r.fajr)}</td>
                            <td>{t(r.sunrise)}</td>
                            <td>{t(r.dhuhr)}</td>
                            <td>{t(r.asr)}</td>
                            <td className="rm-strong">{t(r.maghrib)}</td>
                            <td>{t(r.isha)}</td>
                            <td dir="ltr">{hoursMinutes(r.fastMs, numLocale(lang))}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="dt-note">{R.tableNote}</p>
              </section>
            )
          )}

          <Fatwa11916 lang={lang} />
        </>
      )}
      <PlaceSheet
        open={sheet}
        onClose={() => setSheet(false)}
        onPick={(p) => {
          setPlace(p)
          setSheet(false)
        }}
      />
    </Screen>
  )
}

const numLocale = (lang: Lang) => (lang === 'ar' ? 'ar-u-nu-arab' : lang)

export function daysText(n: number, lang: Lang) {
  const p = RAMADAN[lang].days
  const rule = new Intl.PluralRules(lang).select(n) as keyof typeof p
  return fill(p[rule] ?? p.other, { n: num(n, lang) })
}

const dateLong = (d: { y: number; m: number; d: number }, lang: Lang) =>
  gregorianText(civilNoon(d), lang, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, 'UTC')

function TodayInRamadan({
  state,
  countdown,
  now,
  lang,
  tz,
  placeName,
  rowFast,
}: {
  state: RamadanState
  countdown: Countdown | null
  now: Date
  lang: Lang
  tz: string
  placeName: string | null
  rowFast: number | null
}) {
  const R = RAMADAN[lang]
  const s = TODAY[lang]
  return (
    <>
      <p className="rm-big" data-testid="ramadan-day">
        {fill(R.dayOf, { n: num(state.dayN ?? 1, lang) })}
      </p>
      {countdown && (
        <div className="rm-count" data-testid="ramadan-countdown" data-kind={countdown.kind}>
          <span className="dt-muted">{countdown.kind === 'iftar' ? R.leftIftar : R.leftFajr}</span>
          <span className="rm-count-left">{duration(countdown.at.getTime() - now.getTime(), lang, s)}</span>
          <span className="dt-muted">
            {countdown.kind === 'iftar' ? s.prayers.maghrib : s.prayers.fajr} {timeOf(countdown.at, lang, tz)}
          </span>
        </div>
      )}
      {rowFast != null && <p className="dt-note">{fill(R.fastToday, { d: duration(rowFast, lang, s) })}</p>}
      {countdown && <LockCountdown countdown={countdown} now={now} lang={lang} tz={tz} placeName={placeName} />}
    </>
  )
}

/** «اعرض العدّاد على شاشة القفل»: on the iPhone, once the time is within Apple's eight hours. */
function LockCountdown({ countdown, now, lang, tz, placeName }: { countdown: Countdown; now: Date; lang: Lang; tz: string; placeName: string | null }) {
  const R = RAMADAN[lang]
  const s = TODAY[lang]
  const [ok, setOk] = useState<{ supported: boolean; enabled: boolean } | null>(null)
  const [active, setActive] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    void countdownAvailable().then((r) => {
      if (!alive) return
      setOk(r)
      if (r.supported) void FastingCountdown.active().then((a) => alive && setActive(a.active), () => undefined)
    })
    return () => {
      alive = false
    }
  }, [])
  if (!ok?.supported) return null
  const fits = liveFits(countdown, now)
  const start = async () => {
    setMsg(null)
    const name = countdown.kind === 'iftar' ? s.prayers.maghrib : s.prayers.fajr
    const at = [`${name} ${timeOf(countdown.at, lang, tz)}`, placeName].filter(Boolean).join(' · ')
    const r = await FastingCountdown.start({
      kind: countdown.kind,
      title: countdown.kind === 'iftar' ? R.leftIftar : R.leftFajr,
      target: countdown.at.getTime(),
      at,
      locale: countLocale(lang),
      stop: R.lockEnd,
      rtl: lang === 'ar' || lang === 'ur',
    }).catch(() => ({ ok: false, error: 'failed' }))
    if (r.ok) {
      setActive(true)
      setMsg(R.lockOn)
    } else setMsg(r.error === 'disabled' ? R.lockOff : R.lockError)
  }
  const end = async () => {
    await FastingCountdown.end().catch(() => undefined)
    setActive(false)
    setMsg(null)
  }
  return (
    <div className="rm-lock" data-testid="ramadan-lock">
      <div className="dt-btn-row">
        <button type="button" className="dt-btn dt-btn-primary" onClick={start} disabled={!ok.enabled || !fits}>
          {R.lockStart}
        </button>
        {active && (
          <button type="button" className="dt-btn" onClick={end}>
            {R.lockEnd}
          </button>
        )}
      </div>
      {!ok.enabled && <p className="dt-note">{R.lockOff}</p>}
      {ok.enabled && !fits && <p className="dt-note">{R.lockLater}</p>}
      {msg && (
        <p className="dt-note" role="status">
          {msg}
        </p>
      )}
    </div>
  )
}

/** Ibn Baz 11916 «حكم الإمساكيات التي توزع في شهر رمضان», as stored from its page (data/fatwas.json): the question,
 *  the answer and its three footnotes, unedited, then its full link. */
function Fatwa11916({ lang }: { lang: Lang }) {
  const R = RAMADAN[lang]
  const s = TODAY[lang]
  const f = fatwa('11916')
  if (!f) return null
  return (
    <section className="dt-card dt-pad" aria-labelledby="rm-fatwa-h" data-testid="ramadan-fatwa">
      <h2 id="rm-fatwa-h">{R.aboutSuhoor}</h2>
      {lang !== 'ar' && <p className="dt-note">{R.arabicOnly}</p>}
      <article className="dt-fatwa" data-fatwa="11916">
        <h3 lang="ar" dir="rtl">
          {f.title}
        </h3>
        <p className="dt-row-sub">
          {fill(s.fatwaOf, { n: num(Number(f.number), lang) })}
        </p>
        <p className="dt-label">{s.question}</p>
        <p className="dt-fatwa-text" lang="ar" dir="rtl">
          <StoredText text={f.question} />
        </p>
        <p className="dt-label">{s.answer}</p>
        <p className="dt-fatwa-text" lang="ar" dir="rtl">
          <StoredText text={f.answer} />
        </p>
        {f.footnotes && (
          <ol className="rm-footnotes" lang="ar" dir="rtl">
            {f.footnotes.map((n, i) => (
              <li key={i}>
                <StoredText text={n} />
              </li>
            ))}
          </ol>
        )}
        <a className="dt-btn" href={f.url} target="_blank" rel="noopener noreferrer">
          {s.openFatwa}
        </a>
      </article>
    </section>
  )
}

export const RAMADAN_PATH = '/today/ramadan'

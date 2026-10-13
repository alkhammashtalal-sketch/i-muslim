// Prayer times (reply 0032 D-2; boards PrayerTimes, PrayerTimesN), from the engine of reply 0031-add10
// (web/src/daily/prayer.ts, on the device). The place row opens «مكانك»; the next prayer with the time left and the
// progress since the previous one; the six times; suhoor, iftar and the night; the times voluntary prayer is not prayed,
// each with the exact words of its source (data/fatwas.json: Ibn Baz 10693 and 12348, al-Sharh al-Mumti 4/88; reply
// 0031-add14), the links in «عن المصدر»; the calculation method. Before the zawal the window covers both sheikhs'
// estimates, and a fixed line under their two quotes says so (reply 0031-add16 §4). The bells (part E) show only once
// the server has its VAPID keys and the browser supports notifications; on iOS a line says they need the app on the
// Home Screen. In the iOS/Android app the bells are always there: local notifications computed on the device
// (reply 0033 §ب3, web/src/native/notify.ts), planned again when the place or the method changes.
import { useEffect, useMemo, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { forbiddenWindows } from '../../daily/forbidden'
import { dayTimes, METHODS, ymdIn, type DayTimes, type Method } from '../../daily/prayer'
import type { Place } from '../../daily/location'
import { useI18n } from '../../i18n'
import { forbiddenQuotes, shownQuote, type Quote } from './fatwas'
import { duration, fill, hijriWritten, gregorianText, num, timeOf } from './format'
import { IcBook, IcChevron, IcPin } from './icons'
import { Privacy, Screen } from './Screen'
import { PlaceSheet, usePlace, usePlaceName } from './place'
import { alertsAvailable, alertsChanged, applyAlerts, deniedIn, iosNeedsHomeScreen, loadPushPrefs, type Bell, type PushPrefs } from './push'
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
  // Bells (part E): on the web only when the server answers with a key and this browser can receive push; in the app
  // always (local notifications, reply 0033 §ب3).
  const [bells, setBells] = useState(false)
  const [push, setPush] = useState<PushPrefs>(loadPushPrefs)
  const [bellMsg, setBellMsg] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    void alertsAvailable().then((ok) => alive && setBells(ok))
    return () => {
      alive = false
    }
  }, [])
  const toggleBell = async (n: Bell) => {
    const next = { ...push, bells: push.bells.includes(n) ? push.bells.filter((b) => b !== n) : [...push.bells, n] }
    const r = await applyAlerts(next, { place, method: prefs.method, asr: prefs.asr, lang })
    if (r === 'ok') {
      setPush(next)
      setBellMsg(null)
    } else setBellMsg(r === 'denied' ? (deniedIn() === 'app' ? s.bellDeniedApp : s.bellDenied) : r === 'no_place' ? s.bellNoPlace : s.bellError)
  }
  const state = useMemo(() => (place ? prayerState(place, now, prefs) : null), [place, now, prefs])
  const tz = place?.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const t = (d: Date) => timeOf(d, lang, tz)
  const setP = (p: PrayerPrefs) => {
    setPrefs(p)
    savePrayerPrefs(p)
    alertsChanged(lang)
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
                {bells && (
                  <button type="button" className={`dt-bell${push.bells.includes(n) ? ' is-on' : ''}`} aria-label={fill(s.bellOf, { prayer: s.prayers[n] })} aria-pressed={push.bells.includes(n)} onClick={() => toggleBell(n)}>
                    <BellIcon on={push.bells.includes(n)} />
                  </button>
                )}
              </div>
            ))}
          </section>
          {bells && iosNeedsHomeScreen() && <p className="dt-note">{s.bellIos}</p>}
          {bellMsg && (
            <p className="dt-note" role="status">
              {bellMsg}
            </p>
          )}
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
  const [src, setSrc] = useState(false)
  const [a, b, c] = forbiddenWindows(today)
  const q = forbiddenQuotes()
  const { f10693, f12348, book } = q.sources
  return (
    <section className="dt-card dt-list">
      <h2>{s.forbiddenTitle}</h2>
      <Row title={s.afterSunrise} quotes={[q.afterSunrise]} value={fill(s.range, { a: t(a.from), b: t(a.to) })} />
      <Row
        title={s.beforeZawal}
        quotes={[q.standing, q.beforeZawal]}
        note={q.standing && q.beforeZawal ? s.zawalEstimates : undefined}
        value={fill(s.range, { a: t(b.from), b: t(b.to) })}
      />
      <Row title={s.afterAsr} sub={s.afterAsrNote} value={fill(s.until, { b: t(c.to) })} />
      {(f10693 || f12348 || book) && (
        <button type="button" className="dt-source" onClick={() => setSrc(true)} aria-label={fill(s.aboutSource, { name: s.fatwaSource })}>
          <span className="dt-source-ic">
            <IcBook size={15} />
          </span>
          <span className="dt-source-text">
            <b>{s.fatwaSource}</b> · {s.fatwaSites}
          </span>
          <IcChevron />
        </button>
      )}
      <Sheet open={src} onClose={() => setSrc(false)} title={s.fatwaSource}>
        <ul className="dt-sources">
          {[f10693, f12348].map(
            (f) =>
              f && (
                <li key={f.number}>
                  <span className="dt-row-title" lang="ar" dir="rtl">
                    {f.title}
                  </span>
                  <span className="dt-row-sub">{fill(s.fatwaOf, { n: num(Number(f.number), lang) })}</span>
                  <a className="dt-btn" href={f.url} target="_blank" rel="noopener noreferrer">
                    {s.openFatwa}
                  </a>
                </li>
              ),
          )}
          {book && (
            <li>
              <span className="dt-row-title" lang="ar" dir="rtl">
                {book.book}
              </span>
              <span className="dt-row-sub">{fill(s.bookRef, { v: num(book.volume, lang), p: num(book.page, lang) })}</span>
              <a className="dt-btn" href={book.url} target="_blank" rel="noopener noreferrer">
                {s.openBook}
              </a>
            </li>
          )}
        </ul>
      </Sheet>
    </section>
  )
}

export function Row({ title, sub, quotes, note, value }: { title: string; sub?: string; quotes?: (Quote | null | undefined)[]; note?: string; value: string }) {
  return (
    <div className="dt-row">
      <span className="dt-row-text">
        <span className="dt-row-title">{title}</span>
        {sub && <span className="dt-row-sub">{sub}</span>}
        {quotes
          ?.filter((q): q is Quote => Boolean(q))
          .map((q) => (
            // A source's own words (Arabic in every interface), shown as written; «…» where words before them are left out.
            <span key={q.text} className="dt-row-sub dt-quote" lang="ar" dir="rtl">
              «{shownQuote(q)}»
            </span>
          ))}
        {/* Our own fixed line, in the interface's language (reply 0031-add16 §4). */}
        {note && <span className="dt-row-sub dt-quote-note">{note}</span>}
      </span>
      <span className="dt-row-value">{value}</span>
    </div>
  )
}

/** The board's bell: gold when on, crossed and faint when off. */
function BellIcon({ on }: { on: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {on ? (
        <>
          <path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 1.5h-14Z" />
          <path d="M10 20a2.2 2.2 0 0 0 4 0" />
        </>
      ) : (
        <>
          <path d="M6.5 16.5V11a5.5 5.5 0 0 1 9.4-3.9" />
          <path d="M17.5 11v5.5l1.5 1.5h-11" />
          <path d="M10 20a2.2 2.2 0 0 0 4 0" />
          <path d="m4.5 4.5 15 15" />
        </>
      )}
    </svg>
  )
}

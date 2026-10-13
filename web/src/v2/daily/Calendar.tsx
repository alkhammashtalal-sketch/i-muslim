// Calendar (reply 0032 D-4; board Calendar): the Umm al-Qura month from Intl on the device, a dot on the days on which
// fasting is recommended, and a tapped day's occasions, each with its hadith from our data (text, grade and attribution
// as received). The Supreme Court line and the user's offset (±2 days, on top of the global one from
// public/config/hijri.json). «لماذا لا نعرض بعض المناسبات؟» shows Ibn Baz's fatwa 15824 in full, question and answer as
// stored in data/fatwas.json, with its full link (reply 0031-add14); and from fatwa 13471 one sentence only, cut as
// written, then «الفتوى كاملة في موقع الشيخ» to its full link: its stored text has two private-use marks of the site's
// font, and nothing of ours is written in their place (reply 0031-add16 §5).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Sheet } from '../../components/Sheet'
import { totalOffset } from '../../daily/hijri'
import { useI18n } from '../../i18n'
import { monthAround, noon, sameDay, type CalDay, type CalEvent } from './calendar-model'
import { fill, gregorianText, hijriWritten, num } from './format'
import { getHadith, hadeethEncUrl, type HadithView } from './hadith-client'
import { contentDir } from '../lang/served'
import { fatwa, mawlidExcerpt } from './fatwas'
import { StoredText } from './StoredText'
import { IcAdjust, IcBook, IcCheckBadge, IcChevron, IcChevronPrev, IcQuestion } from './icons'
import { Screen } from './Screen'
import { loadGlobalOffset, loadHijriOffset, saveHijriOffset } from './store'
import { TODAY } from './strings-today'

const DAY = 86_400_000

export function Calendar() {
  const { lang } = useI18n()
  const s = TODAY[lang]
  const today = noon(new Date())
  const [userOffset, setUserOffset] = useState(loadHijriOffset)
  const [globalOffset, setGlobalOffset] = useState(0)
  useEffect(() => {
    loadGlobalOffset().then(setGlobalOffset)
  }, [])
  const offset = totalOffset(userOffset, globalOffset)
  const [anchor, setAnchor] = useState(today)
  const [selected, setSelected] = useState(today)
  const [sheet, setSheet] = useState(false)
  const [why, setWhy] = useState(false)
  const month = useMemo(() => monthAround(anchor, offset), [anchor, offset])

  if (!month)
    return (
      <Screen title={s.calTitle}>
        <section className="dt-card dt-pad">
          <p className="dt-body">{s.noUmmAlQura}</p>
        </section>
      </Screen>
    )

  const first = month[0]
  const last = month[month.length - 1]
  const shift = (d: Date) => new Date(d.getTime() + offset * DAY)
  const title = hijriWritten(shift(first.date), lang, { month: 'long', year: 'numeric' })
  const range = `${gregorianText(first.date, lang, { day: 'numeric', month: 'long' })} – ${gregorianText(last.date, lang, { day: 'numeric', month: 'long', year: 'numeric' })}`
  const weekdayIn = (weekday: 'short' | 'narrow' | 'long') => Array.from({ length: 7 }, (_, i) => gregorianText(new Date(2026, 9, 11 + i, 12), lang, { weekday }))
  const weekdays = weekdayIn('short')
  const weekdaysNarrow = weekdayIn('narrow')
  const weekdaysLong = weekdayIn('long')
  // Reply 0045 ج: the short names (in Arabic the whole names, «الخميس») can be wider than a seventh of a 375 px phone
  // at 115–135% text. Then the narrow names («خ») are shown, the whole name stays for screen readers; measured, so the
  // calendar at the phone's usual size keeps the short names.
  const gridRef = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(false)
  useLayoutEffect(() => {
    const g = gridRef.current
    if (!g) return
    const check = () => {
      const cell = g.querySelector<HTMLElement>('.dt-cal-wd')
      const widths = [...g.parentElement!.querySelectorAll<HTMLElement>('.dt-cal-wd-measure span')].map((x) => x.getBoundingClientRect().width)
      if (cell && widths.length) setNarrow(Math.max(...widths) > cell.clientWidth - 2)
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(g)
    return () => ro.disconnect()
  }, [lang])
  const sel = month.find((d) => sameDay(d.date, selected)) ?? null
  const hijriName = (d: CalDay) => hijriWritten(shift(d.date), lang, { day: 'numeric', month: 'long' }) ?? ''

  return (
    <Screen title={s.calTitle}>
      <section className="dt-card dt-cal">
        <div className="dt-cal-head">
          <button type="button" className="v2-icon-btn" aria-label={s.prevMonth} onClick={() => setAnchor(new Date(first.date.getTime() - DAY))}>
            <IcChevronPrev />
          </button>
          <span className="dt-cal-title">
            <span className="dt-cal-month">{title}</span>
            <span className="dt-cal-range">{range}</span>
          </span>
          <button type="button" className="v2-icon-btn" aria-label={s.nextMonth} onClick={() => setAnchor(new Date(last.date.getTime() + DAY))}>
            <IcChevron size={19} />
          </button>
        </div>
        <div className="dt-cal-wd-measure" aria-hidden="true">
          {weekdays.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="dt-cal-grid" role="grid" ref={gridRef}>
          {weekdays.map((w, i) => (
            <span key={w} className="dt-cal-wd" role="columnheader" aria-label={weekdaysLong[i]}>
              {narrow ? weekdaysNarrow[i] : w}
            </span>
          ))}
          {Array.from({ length: first.weekday }, (_, i) => (
            <span key={`b${i}`} aria-hidden="true" />
          ))}
          {month.map((d) => {
            const isToday = sameDay(d.date, today)
            const isSel = sameDay(d.date, selected)
            return (
              <button
                key={d.date.getTime()}
                type="button"
                className={`dt-cal-day${isToday ? ' is-today' : ''}${isSel && !isToday ? ' is-selected' : ''}`}
                aria-label={fill(s.dayLabel, { hijri: hijriName(d), greg: gregorianText(d.date, lang, { day: 'numeric', month: 'long' }) })}
                aria-pressed={isSel}
                onClick={() => setSelected(d.date)}
              >
                <span className="dt-cal-h">{num(d.h.day, lang)}</span>
                <span className="dt-cal-g">{num(d.date.getDate(), lang)}</span>
                {d.fasting && <span className="dt-cal-dot" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
        <div className="dt-cal-legend">
          <span className="dt-cal-dot is-legend" aria-hidden="true" />
          {s.fastingLegend}
        </div>
      </section>

      {sel && <DayCard day={sel} hijri={hijriWritten(shift(sel.date), lang, { weekday: 'long', day: 'numeric', month: 'long' }) ?? ''} />}

      <section className="dt-card dt-pad">
        <p className="dt-body">{s.courtLine}</p>
        <div className="dt-chips">
          <button type="button" className="dt-chip" onClick={() => setSheet(true)}>
            <IcAdjust />
            {s.adjustDate}
          </button>
          <button type="button" className="dt-chip" onClick={() => setWhy(true)}>
            <IcQuestion />
            {s.whyButton}
          </button>
        </div>
      </section>

      <Sheet open={why} onClose={() => setWhy(false)} title={s.whyButton}>
        <WhyNotMarked />
      </Sheet>
      <Sheet open={sheet} onClose={() => setSheet(false)} title={s.offsetTitle}>
        <p className="dt-body">{fill(s.offsetNow, { n: num(userOffset, lang) })}</p>
        <div className="dt-chips">
          {(
            [
              [s.minusDay, userOffset - 1],
              [s.resetOffset, 0],
              [s.plusDay, userOffset + 1],
            ] as const
          ).map(([label, v]) => (
            <button
              key={label}
              type="button"
              className="dt-chip"
              disabled={v < -2 || v > 2}
              aria-pressed={label === s.resetOffset ? userOffset === 0 : undefined}
              onClick={() => {
                setUserOffset(v)
                saveHijriOffset(v)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </Sheet>
    </Screen>
  )
}

function DayCard({ day, hijri }: { day: CalDay; hijri: string }) {
  const { lang } = useI18n()
  const s = TODAY[lang]
  const greg = gregorianText(day.date, lang, { day: 'numeric', month: 'long' })
  // One hadith per distinct id (both Eids share theirs).
  const seen = new Set<string>()
  const events = day.events.filter((e) => !seen.has(e.hadith_id) && seen.add(e.hadith_id))
  return (
    <section className="dt-card dt-pad dt-day" aria-live="polite">
      <div className="dt-muted">
        {hijri && (
          <>
            <bdi>{hijri}</bdi> ·{' '}
          </>
        )}
        <bdi>{greg}</bdi>
      </div>
      {day.events.length > 0 && (
        <div className="dt-day-title">{day.events.map((e) => s.events[e.key as keyof typeof s.events] ?? e.name).join(' · ')}</div>
      )}
      {events.map((e) => (
        <EventHadith key={e.key} event={e} />
      ))}
    </section>
  )
}

function EventHadith({ event }: { event: CalEvent }) {
  // HadeethEnc's translation in the content language (reply 0033 §أ1); the interface's texts stay in `lang`.
  const { lang, content } = useI18n()
  const s = TODAY[lang]
  const [h, setH] = useState<HadithView | null | 'loading'>('loading')
  const [src, setSrc] = useState(false)
  useEffect(() => {
    let alive = true
    setH('loading')
    getHadith(event.hadith_id, content).then((v) => alive && setH(v))
    return () => {
      alive = false
    }
  }, [event.hadith_id, content])
  if (h === 'loading') return <p className="dt-note">{s.hadithLoading}</p>
  if (!h) return <p className="dt-note">{s.hadithMissing}</p>
  return (
    <div className="dt-hadith">
      <p className="dt-hadith-text" lang="ar" dir="rtl">
        {h.text}
      </p>
      {h.translation && (
        <p className="dt-hadith-tr" lang={h.translation.lang} dir={contentDir(h.translation.lang)}>
          {h.translation.text}
        </p>
      )}
      <div className="dt-hadith-meta">
        <span className="dt-grade" lang="ar">
          <IcCheckBadge />
          {h.grade}
        </span>
        {h.attribution && (
          <span className="dt-muted" lang="ar">
            {h.attribution}
          </span>
        )}
      </div>
      <button type="button" className="dt-source" onClick={() => setSrc(true)} aria-label={fill(s.aboutSource, { name: s.hadithSource })}>
        <span className="dt-source-ic">
          <IcBook size={15} />
        </span>
        <span className="dt-source-text">
          <b>{s.hadithSource}</b> · {fill(s.hadithNumber, { id: num(Number(h.id), lang) })}
        </span>
        <IcChevron />
      </button>
      <Sheet open={src} onClose={() => setSrc(false)} title={s.hadithSource}>
        <p className="dt-body">{fill(s.hadithNumber, { id: num(Number(h.id), lang) })}</p>
        <a className="dt-btn" href={hadeethEncUrl(h.id, lang)} target="_blank" rel="noopener noreferrer">
          {s.openSource}
        </a>
      </Sheet>
    </div>
  )
}

/** «لماذا لا نعرض بعض المناسبات؟»: the days left unmarked, then fatwa 15824 in full as stored and one sentence of
 *  13471 (reply 0031-add16 §5), each with its link. */
function WhyNotMarked() {
  const { lang } = useI18n()
  const s = TODAY[lang]
  const f = fatwa('15824')
  const m = mawlidExcerpt()
  return (
    <div className="dt-why">
      <p className="dt-body">{fill(s.whyIntro, { days: s.notMarkedDays })}</p>
      {f && (
        <article className="dt-fatwa">
          <h3 lang="ar" dir="rtl">
            {f.title}
          </h3>
          <p className="dt-label">{s.question}</p>
          <p className="dt-fatwa-text" lang="ar" dir="rtl">
            <StoredText text={f.question} />
          </p>
          <p className="dt-label">{s.answer}</p>
          <p className="dt-fatwa-text" lang="ar" dir="rtl">
            <StoredText text={f.answer} />
          </p>
          <a className="dt-btn" href={f.url} target="_blank" rel="noopener noreferrer">
            {s.openFatwa}
          </a>
        </article>
      )}
      {m && (
        <article className="dt-fatwa" data-fatwa="13471">
          <h3 lang="ar" dir="rtl">
            {m.title}
          </h3>
          {m.sentence && (
            <p className="dt-fatwa-text" lang="ar" dir="rtl">
              «{m.sentence}»
            </p>
          )}
          <a className="dt-btn" href={m.url} target="_blank" rel="noopener noreferrer">
            {s.fatwaFull}
          </a>
        </article>
      )}
    </div>
  )
}

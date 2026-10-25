import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import type { PassageResponse } from '../../../../shared/api'
import { Mkp } from '../../components/Ornaments'
import { numberLocale, useI18n } from '../../i18n'
import { WIDGET_STRINGS } from '../../native/widget-strings'
import { getAyah } from '../../quran/api'
import { AyahEnd } from '../../quran/AyahEnd'
import { arabicDigits, ayahOf, displayRef, fmt, numFmt } from '../../quran/format'
import { ListenAyah } from '../../listen/Listen'
import { hadithPath, navigate, quranPath } from '../../quran/route'
import { getToday, splitIntro, type HadithPair } from '../hadith/api'
import { GradeBadge } from '../hadith/GradeBadge'
import { SURA_TYPE } from '../reading/meta'
import { useReadingStrings } from '../reading/ui'
import { useDaySky } from '../daily/day-clock'
import { useCornerMode } from './corner-fit'
import { dailyAyah } from './daily-ayah'
import { SkyLayers } from './SkyLayers'
import { totalOffset } from '../../daily/hijri'
import { IcChevron } from '../daily/icons'
import { loadGlobalOffset, loadHijriOffset } from '../daily/store'
import { cardHijri, occasionWhen } from './occasions'
import { HOME } from './strings'
import './home.css'

// The ayah of the day (reply 0031-add16 §1): data/daily-ayat.json, a list made by a fixed rule (the Beautiful Names'
// Quran evidence and the ayat beginning with «رَبَّنَا»), one a day by the Riyadh date (./daily-ayah.ts). The first
// version's FeaturedAyah keeps its own list (config/featured-ayat.json).
//
// Reply 0071 §3 (a prototype for Talal's word: «آية اليوم وحديث اليوم … في نفس الكرت مع التاريخ … نفرّقها … كل واحدة
// تكون زي في بطاقة بشكل بسيط»): three cards in this order, each on its own:
//   1. the date: B4's own sky and shamsa, cut at the painting's own gold separator and closed with its own bottom frame
//      (public/art/card-date-B4.webp, lossless, 1200 × 865, out/design-v2/assets/card-date-B4.py), at its natural
//      aspect ratio. The Umm al-Qura date on the shamsa as before; the weekday and the Gregorian date in the sky's two
//      lower corners, the only places of the sky without rays.
//   2. «آية اليوم»: the ayah whole (never clamped, CLAUDE.md §3 rule 4), its reference, «التفسير» and «استمع».
//   3. «حديث اليوم»: the hadith (a part; the whole text on its page), its grade badge and attribution.
// The ayah and hadith cards are plain paper in the painting's colours; a card whose text did not arrive is not shown
// (V2 rule 3). Whether the painting may be cut is CLAUDE.md §8's question, Talal's to answer.

/** The Hijri offset the calendar page applies (the user's, and the global one set after the Supreme Court's
 *  announcement); the card's disc and its occasion line both take it (add-on 0071-add15 §3). */
function useHijriOffset() {
  const [user] = useState(loadHijriOffset)
  const [global, setGlobal] = useState(0)
  useEffect(() => {
    let alive = true
    loadGlobalOffset().then((n) => alive && setGlobal(n))
    return () => {
      alive = false
    }
  }, [])
  return totalOffset(user, global)
}

function IconBook() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 6.5C10 5 7 4.6 4 5v13c3-.4 6 0 8 1.5 2-1.5 5-1.9 8-1.5V5c-3-.4-6 0-8 1.5Z" />
      <path d="M12 6.5V19" />
    </svg>
  )
}

/** The day's three cards (reply 0071 §3): the date, «آية اليوم», «حديث اليوم». Each is an article, not a link. The
 *  ayah and its reference open the ayah page, the hadith and its badge open the hadith page; «التفسير» and «استمع»
 *  are separate buttons; no share button (reply 0043 ب: sharing stays in the ayah's panel and on the hadith page). */
/** `afterDate`: what stands right under the date card and its occasion line (the quick-access grid, add-on 0072-add28 §3). */
export function DayCards({ afterDate }: { afterDate?: ReactNode } = {}) {
  const { t, lang, content } = useI18n()
  const r = useReadingStrings()
  const s = HOME[lang]
  const ayahTitle = useId()
  const hadithTitle = useId()
  // One date per visit of the page, taken when the cards first render (the day changes rarely while it is open).
  const [now] = useState(() => new Date())
  // The Umm al-Qura date on the disc (reply 0031-add10 §5) and the occasion under the card, with the same offset.
  const offset = useHijriOffset()
  const { disc: hijri, occasion: occ } = useMemo(() => cardHijri(lang, now, offset), [lang, now, offset])
  const [ayah, setAyah] = useState<PassageResponse | null>(null)
  const [hadith, setHadith] = useState<HadithPair | null>(null)
  const dateCard = useRef<HTMLElement>(null)
  // The sky with the time of day (add-on 0071-add16): the same clock and adhan object as the next-prayer line.
  const sky = useDaySky()

  useEffect(() => {
    let alive = true
    // HadeethEnc's row in the content language (reply 0033 §أ1); a language it has no rows in reads the Arabic alone.
    getToday(content).then(
      (r) => alive && setHadith(r.hadith),
      () => undefined,
    )
    const day = dailyAyah(now.getTime())
    if (day) {
      // Outside Arabic the meaning in the reader's language comes with it, for «استمع للمعنى» (add-on 0072-add14 §4).
      getAyah(day.sura, day.aya, content).then(
        (p) => alive && setAyah(p),
        () => undefined,
      )
    }
    return () => {
      alive = false
    }
  }, [content, now])

  const locale = lang === 'ar' ? 'ar-u-ca-gregory-nu-arab' : `${numberLocale(lang)}-u-ca-gregory`
  // The weekday and the Gregorian date go to the sky's two lower corners: the weekday at the start, the date at the end.
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(now)
  const gDate = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(now)
  const gShort = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(now)
  // In the corners while the year's longest weekday and date fit there, else one line under the card (corner-fit.ts).
  const corners = useCornerMode(dateCard, locale, now.getFullYear())
  const dateLabel = [weekday, hijri?.full, gDate].filter(Boolean).join(' · ')
  const a = ayah?.ayah
  // The meaning the device voice may read outside Arabic: the reader's own (QuranEnc), else Sahih International.
  const meaning = lang !== 'ar' && ayah ? (ayah.meaning ? { text: ayah.meaning.text, lang: ayah.meaning.lang, ayah: ayah.text } : ayah.text_en ? { text: ayah.text_en, lang: 'en', ayah: ayah.text } : null) : null
  const h = hadith?.ar
  const split = h ? splitIntro(h) : null
  // The reference as on the board and in the ayah's panel: sura · number · Makki/Madani.
  const num = numFmt(lang)
  const type = a ? SURA_TYPE[a.sura] : null
  const refLine = a
    ? [lang === 'ar' ? a.suraName : fmt(t.suraNum, { n: num(a.sura) }), lang === 'ar' ? arabicDigits(a.aya) : num(a.aya), type ? r[type] : null].filter(Boolean).join(' · ')
    : ''

  return (
    <>
      <article ref={dateCard} className="day-date" data-sky={sky.state ?? undefined} data-corners={corners} aria-label={fmt(s.cardLabel, { title: WIDGET_STRINGS[lang].names.date.name, date: dateLabel })}>
        <SkyLayers sky={sky} card={dateCard} />
        {hijri && (
          <div className="dc-disc" aria-hidden="true">
            <span className="dc-day">{hijri.day}</span>
            <span className="dc-month">{hijri.month}</span>
            <span className="dc-year">{hijri.year}</span>
          </div>
        )}
        {corners !== 'under' && (
          <>
            <span className="dd-corner dd-start" aria-hidden="true">
              {weekday}
            </span>
            <span className="dd-corner dd-end" aria-hidden="true">
              {corners === 'short' ? gShort : gDate}
            </span>
          </>
        )}
      </article>
      {/* The weekday and the date under the card when they do not fit its corners (corner-fit.ts): first, then the
          occasion's line. */}
      {corners === 'under' && (
        <p className="dd-under" aria-hidden="true">
          {weekday} · {gDate}
        </p>
      )}
      {/* The next occasion (add-on 0071-add13 §3). Not in the sky: its only free places are the two lower corners,
          which the weekday and the date hold, and a line across it would cross the shamsa's rays and its lower
          finial. So it sits under the card, outside the painting, and opens its evidence (the hadith page: the text,
          its grade and takhrij as received, and HadeethEnc's link). */}
      {occ && (
        <a
          className="dc-occasion"
          href={hadithPath(occ.occasion.hadithId)}
          data-occasion={occ.occasion.key}
          onClick={(e) => (e.preventDefault(), navigate(hadithPath(occ.occasion.hadithId)))}
        >
          <span className="sr-only">{s.occ.label}: </span>
          <span className="dc-occ-text">
            {/* A no-break space before «·»: a wrapped line never begins with it. */}
            {s.occ.names[occ.occasion.key]}{' ·'} <span className="dc-occ-when">{occasionWhen(occ.days, s.occ, lang)}</span>
          </span>
          <span className="sr-only">. {s.occ.opens}</span>
          <IcChevron size={16} />
        </a>
      )}
      {afterDate}
      {a && ayah && (
        <article className="dc-card dc-ayah-card" aria-labelledby={ayahTitle}>
          <h2 className="dc-title" id={ayahTitle}>
            {s.ayahDayTitle}
          </h2>
          <a
            className="dc-zone"
            href={quranPath(a.sura, a.aya)}
            aria-label={fmt(s.ayahPage, { ref: displayRef(ayah.ref, lang) })}
            onClick={(e) => (e.preventDefault(), navigate(quranPath(a.sura, a.aya)))}
          >
            <p className="dc-ayah" lang="ar" dir="rtl" data-ayah={ayah.id}>
              <AyahEnd text={ayah.text}>
                <Mkp n={arabicDigits(ayahOf(ayah.id))} size={26} />
              </AyahEnd>
            </p>
            <span className="dc-ref">{refLine}</span>
          </a>
          {/* The listen button under the ayah, at its lines' start (add-on 0072-add14): the reciter's recording, and
              outside Arabic the meaning in the reader's language beside it; «التفسير» at the other end. */}
          <div className="dc-pills dc-foot" dir="rtl">
            <ListenAyah id={ayah.id} meaning={meaning} className="dc-listen" />
            <button type="button" className="dc-pill" dir={lang === 'ar' || lang === 'ur' ? 'rtl' : 'ltr'} onClick={() => navigate(quranPath(a.sura, a.aya))}>
              <span className="dc-pill-in">
                <IconBook />
                {s.tafsir}
              </span>
            </button>
          </div>
        </article>
      )}
      {h && split && (
        <article className="dc-card dc-hadith-card" aria-labelledby={hadithTitle}>
          <h2 className="dc-title" id={hadithTitle}>
            {s.hadithDayTitle}
          </h2>
          <a className="dc-zone dc-hadith" href={hadithPath(h.id)} aria-label={s.hadithPage} onClick={(e) => (e.preventDefault(), navigate(hadithPath(h.id)))}>
            {split.intro && (
              <span className="dc-intro" lang="ar" dir="rtl">
                {split.intro}
              </span>
            )}
            <p className="dc-hadith-text" lang="ar" dir="rtl" data-hadith={h.id}>
              {split.body}
            </p>
            <span className="dc-end">
              <GradeBadge h={h} />
              {h.attribution && (
                <span className="dc-attr" lang="ar" dir="rtl">
                  {h.attribution}
                </span>
              )}
            </span>
          </a>
        </article>
      )}
    </>
  )
}

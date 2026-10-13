import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import type { PassageResponse } from '../../../../shared/api'
import { Mkp } from '../../components/Ornaments'
import { numberLocale, useI18n } from '../../i18n'
import { umalquraSupported } from '../../daily/hijri'
import { getAyah } from '../../quran/api'
import { AyahEnd } from '../../quran/AyahEnd'
import { arabicDigits, ayahOf, displayRef, fmt, numFmt } from '../../quran/format'
import { hasRecitation, pause, play, resume, useRecitation } from '../../quran/recitation'
import { hadithPath, navigate, quranPath } from '../../quran/route'
import { getToday, splitIntro, type HadithPair } from '../hadith/api'
import { GradeBadge } from '../hadith/GradeBadge'
import { SURA_TYPE } from '../reading/meta'
import { useReadingStrings } from '../reading/ui'
import { dailyAyah } from './daily-ayah'
import { HOME } from './strings'
import './home.css'

// The ayah of the day (reply 0031-add16 §1): data/daily-ayat.json, a list made by a fixed rule (the Beautiful Names'
// Quran evidence and the ayat beginning with «رَبَّنَا»), one a day by the Riyadh date (./daily-ayah.ts). The first
// version's FeaturedAyah keeps its own list (config/featured-ayat.json). Should the ayah not load, its part is hidden
// (V2 rule 3) and the card is «حديث اليوم» alone.

/** The Umm al-Qura date on this device (reply 0031-add10 §5): day, month name, year; null when Intl lacks it. */
function useHijri(lang: string, now: Date) {
  return useMemo(() => {
    if (!umalquraSupported()) return null
    const tag = `${lang === 'ar' ? 'ar' : lang}-u-ca-islamic-umalqura${lang === 'ar' ? '-nu-arab' : ''}`
    const p = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(now)
    const v = (t: string) => p.find((x) => x.type === t)?.value ?? ''
    // The era «هـ» as on the board, in Arabic; other languages write it as a word (ہجری, AH…) that does not fit the
    // disc, so there the disc shows the year alone and the card's label carries the full date with its era.
    const era = v('era')
    const year = era && lang === 'ar' ? `${v('year')}${era.trim()}` : v('year')
    return { day: v('day'), month: v('month'), year, full: new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' }).format(now) }
  }, [lang, now])
}

/** The paper is a fixed part of the drawing, and the list holds ayat of one line to nine (reply 0031-add16 §1). When
 *  both parts do not fit, in this order: the hadith gives up whole lines, down to two (its whole text is on its page);
 *  then the ayah takes the card's smaller size, the hadith a size smaller still, so the ayah stays the largest text in
 *  its place (`data-fit="small"`); and if the paper is still short, the paper scrolls (`data-fit="small scroll"`). The
 *  ayah is never cut or clamped: a line clamp drops the last letters of its last line for its «…» (2:255 showed
 *  «خَلْفَهُ…» for «خَلْفَهُمْ»), and the text shown is D1's letter for letter (CLAUDE.md §3 rule 4; board CardAfter shows
 *  the whole ayah). Whether a long ayah may be shown in part is Talal's decision, not built. Measured, so the phone's
 *  width and text size and the font's arrival are taken into account. */
function useFit(paper: RefObject<HTMLDivElement | null>, key: string) {
  useLayoutEffect(() => {
    const p = paper.current
    if (!p) return
    let frame = 0
    const fit = () => {
      const ayah = p.querySelector<HTMLElement>('.dc-ayah')
      const text = p.querySelector<HTMLElement>('.dc-hadith-text')
      delete p.dataset.fit
      text?.style.removeProperty('-webkit-line-clamp')
      // The hadith alone: the style sheet's container queries are enough.
      if (!ayah) return
      // How far the last thing on the paper runs below it: the hadith's grade line, or the ayah's buttons when the
      // ayah is alone (no hadith today).
      const end = (text ? p.querySelector<HTMLElement>('.dc-end') : p.querySelector<HTMLElement>('.dc-pills')) ?? text ?? ayah
      // (+ scrollTop: measured from the paper's content, also when a scrolling paper is refitted part way down.)
      const over = () => Math.ceil(end.getBoundingClientRect().bottom + p.scrollTop - p.getBoundingClientRect().bottom)
      // Only the hadith is ever given fewer lines; the ayah is never clamped (above).
      const clampHadith = () => {
        if (!text) return
        const lh = parseFloat(getComputedStyle(text).lineHeight) || 1
        const lines = Math.round(text.getBoundingClientRect().height / lh)
        text.style.setProperty('-webkit-line-clamp', String(Math.max(2, lines - Math.ceil(over() / lh))))
      }
      if (over() <= 0) return
      clampHadith()
      if (over() <= 0) return
      p.dataset.fit = 'small'
      text?.style.removeProperty('-webkit-line-clamp')
      if (over() <= 0) return
      clampHadith()
      // Still short (a long ayah, a narrow phone or a large text size): the paper scrolls, the ayah whole.
      if (over() > 0) p.dataset.fit = 'small scroll'
    }
    // A paper that no longer scrolls (a wider phone, a smaller text size) shows its top.
    const run = () => {
      fit()
      if (p.dataset.fit !== 'small scroll') p.scrollTop = 0
    }
    const later = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(run)
    }
    run()
    const ro = new ResizeObserver(later)
    ro.observe(p)
    for (const z of p.querySelectorAll('.dc-zone')) ro.observe(z)
    document.fonts?.ready.then(later, () => undefined)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
    }
  }, [paper, key])
}

function IconBook() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 6.5C10 5 7 4.6 4 5v13c3-.4 6 0 8 1.5 2-1.5 5-1.9 8-1.5V5c-3-.4-6 0-8 1.5Z" />
      <path d="M12 6.5V19" />
    </svg>
  )
}
function IconPlay({ paused }: { paused: boolean }) {
  return paused ? (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="6.5" y="5.5" width="4" height="13" rx="1" fill="currentColor" />
      <rect x="13.5" y="5.5" width="4" height="13" rx="1" fill="currentColor" />
    </svg>
  )
}

/** «آية وحديث اليوم» (V2 §2, c02 and c18): an article, not a link. The ayah and its reference open the ayah page, the
 *  hadith and its badge open the hadith page; «التفسير» and «استمع» are separate buttons; the card has no share button (reply 0043 ب: sharing stays in the ayah's panel and on the hadith page). The
 *  background is B4 (public/art/card-art-B4.webp; reply 0043 أ, approved 13 October): the frame redrawn at phone
 *  resolution, the board's sky, shamsa and paper kept (out/design-v2/assets/card-frame-B4.py); stretched to the card as
 *  the board does; the disc and the paper are placed from card-art-B3.json, whose geometry B4 keeps. */
export function DayCard() {
  const { t, lang, content } = useI18n()
  const r = useReadingStrings()
  const s = HOME[lang]
  // One date per visit of the page, taken when the card first renders (the day changes rarely while it is open).
  const [now] = useState(() => new Date())
  const hijri = useHijri(lang, now)
  const [ayah, setAyah] = useState<PassageResponse | null>(null)
  const [hadith, setHadith] = useState<HadithPair | null>(null)
  const rec = useRecitation()
  const paper = useRef<HTMLDivElement>(null)
  useFit(paper, `${ayah?.id ?? ''}|${hadith?.ar.id ?? ''}|${lang}`)

  useEffect(() => {
    let alive = true
    // HadeethEnc's row in the content language (reply 0033 §أ1); a language it has no rows in reads the Arabic alone.
    getToday(content).then(
      (r) => alive && setHadith(r.hadith),
      () => undefined,
    )
    const day = dailyAyah(now.getTime())
    if (day) {
      getAyah(day.sura, day.aya).then(
        (p) => alive && setAyah(p),
        () => undefined,
      )
    }
    return () => {
      alive = false
    }
  }, [content, now])

  if (!hadith && !ayah?.ayah) return null
  const title = ayah?.ayah && hadith ? s.dayTitle : hadith ? s.hadithDayTitle : s.ayahDayTitle
  const gregorian = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-ca-gregory-nu-arab' : `${numberLocale(lang)}-u-ca-gregory`, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .formatToParts(now)
    .map((p) => (p.type === 'literal' && /,|،/.test(p.value) ? ' · ' : p.value))
    .join('')
  const a = ayah?.ayah
  const playing = a && (rec.status === 'playing' || rec.status === 'loading') && rec.sura === a.sura && rec.from === a.aya
  const pausedHere = a && rec.status === 'paused' && rec.sura === a.sura && rec.from === a.aya
  const listen = () => {
    if (!a) return
    if (playing) pause()
    else if (pausedHere) resume()
    else play(a.sura, a.aya, a.aya)
  }
  const h = hadith?.ar
  const split = h ? splitIntro(h) : null
  // The reference as on the board and in the ayah's panel: sura · number · Makki/Madani.
  const num = numFmt(lang)
  const type = a ? SURA_TYPE[a.sura] : null
  const refLine = a
    ? [lang === 'ar' ? a.suraName : fmt(t.suraNum, { n: num(a.sura) }), lang === 'ar' ? arabicDigits(a.aya) : num(a.aya), type ? r[type] : null].filter(Boolean).join(' · ')
    : ''

  return (
    <article className={`day-card${a ? ' has-ayah' : ''}`} aria-label={fmt(s.cardLabel, { title, date: hijri?.full ?? gregorian })}>
      {hijri && (
        <div className="dc-disc" aria-hidden="true">
          <span className="dc-day">{hijri.day}</span>
          <span className="dc-month">{hijri.month}</span>
          <span className="dc-year">{hijri.year}</span>
        </div>
      )}
      <div className="dc-paper" ref={paper}>
        <div className="dc-head">
          <h2 className="dc-title">{title}</h2>
          <span className="dc-date">
            <span>{gregorian}</span>
          </span>
        </div>
        {a && ayah && (
          <>
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
            <div className="dc-pills">
              <button type="button" className="dc-pill" onClick={() => navigate(quranPath(a.sura, a.aya))}>
                <span className="dc-pill-in">
                  <IconBook />
                  {s.tafsir}
                </span>
              </button>
              {hasRecitation(a.sura) && (
                <button type="button" className="dc-pill" onClick={listen} aria-pressed={playing ? true : undefined}>
                  <span className="dc-pill-in">
                    <IconPlay paused={!playing} />
                    {s.listen}
                  </span>
                </button>
              )}
            </div>
          </>
        )}
        {a && h && (
          <div className="dc-rule" aria-hidden="true">
            <span />
            <svg width="14" height="14" viewBox="-12 -12 24 24">
              <use href="#rose" />
            </svg>
            <span />
          </div>
        )}
        {h && split && (
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
        )}
      </div>
    </article>
  )
}

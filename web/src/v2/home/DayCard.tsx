import { useEffect, useMemo, useState } from 'react'
import type { PassageResponse } from '../../../../shared/api'
import { Mkp } from '../../components/Ornaments'
import featured from '../../config/featured-ayat.json'
import { numberLocale, useI18n } from '../../i18n'
import { umalquraSupported } from '../../daily/hijri'
import { getAyah } from '../../quran/api'
import { AyahEnd } from '../../quran/AyahEnd'
import { arabicDigits, ayahOf, displayRef, fmt } from '../../quran/format'
import { hasRecitation, pause, play, resume, useRecitation } from '../../quran/recitation'
import { hadithPath, navigate, quranPath } from '../../quran/route'
import { getToday, splitIntro, type HadithPair } from '../hadith/api'
import { GradeBadge } from '../hadith/GradeBadge'
import { HOME } from './strings'
import './home.css'

// The ayah of the day: the list the reviewer chooses (config/featured-ayat.json), as the first version's FeaturedAyah.
// While the list is empty the ayah part is hidden (V2 rule 3) and the card is «حديث اليوم» alone.
const LIST = (featured as string[]).filter((x) => /^quran:\d{1,3}:\d{1,3}$/.test(x))
const RIYADH_DAY = () => Math.floor((Date.now() + 3 * 3600_000) / 86_400_000)

/** The Umm al-Qura date on this device (reply 0031-add10 §5): day, month name, year; null when Intl lacks it. */
function useHijri(lang: string) {
  return useMemo(() => {
    if (!umalquraSupported()) return null
    const tag = `${lang === 'ar' ? 'ar' : lang}-u-ca-islamic-umalqura${lang === 'ar' ? '-nu-arab' : ''}`
    const p = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(new Date())
    const v = (t: string) => p.find((x) => x.type === t)?.value ?? ''
    // The era «هـ» as on the board, in Arabic; other languages write it as a word (ہجری, AH…) that does not fit the
    // disc, so there the disc shows the year alone and the card's label carries the full date with its era.
    const era = v('era')
    const year = era && lang === 'ar' ? `${v('year')}${era.trim()}` : v('year')
    return { day: v('day'), month: v('month'), year, full: new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()) }
  }, [lang])
}

function IconShare() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 3v12" />
      <path d="m7.5 7.5 4.5-4.5 4.5 4.5" />
      <path d="M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12" />
    </svg>
  )
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
 *  hadith and its badge open the hadith page; «التفسير», «استمع» and the share button are separate buttons. The
 *  background is the approved design's own image, byte for byte (public/art/card-art-B3.webp; Talal, reply
 *  0031-add15), stretched to the card as the board does; the disc and the paper are placed from card-art-B3.json. */
export function DayCard() {
  const { lang } = useI18n()
  const s = HOME[lang]
  const hijri = useHijri(lang)
  const [ayah, setAyah] = useState<PassageResponse | null>(null)
  const [hadith, setHadith] = useState<HadithPair | null>(null)
  const [copied, setCopied] = useState(false)
  const rec = useRecitation()

  useEffect(() => {
    let alive = true
    getToday(lang).then(
      (r) => alive && setHadith(r.hadith),
      () => undefined,
    )
    if (LIST.length) {
      const [, su, a] = LIST[RIYADH_DAY() % LIST.length].split(':')
      getAyah(Number(su), Number(a)).then(
        (r) => alive && setAyah(r),
        () => undefined,
      )
    }
    return () => {
      alive = false
    }
  }, [lang])

  if (!hadith && !ayah?.ayah) return null
  const title = ayah?.ayah && hadith ? s.dayTitle : hadith ? s.hadithDayTitle : s.ayahDayTitle
  const gregorian = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-u-ca-gregory-nu-arab' : `${numberLocale(lang)}-u-ca-gregory`, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .formatToParts(new Date())
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
  const share = async () => {
    const url = hadith ? `${location.origin}${hadithPath(hadith.ar.id)}` : a ? `${location.origin}${quranPath(a.sura, a.aya)}` : location.origin
    const text = fmt(s.shareText, { title })
    try {
      if (navigator.share) return await navigator.share({ title, text, url })
      await navigator.clipboard.writeText(`${text}\n${url}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // the user closed the share sheet
    }
  }
  const h = hadith?.ar
  const split = h ? splitIntro(h) : null

  return (
    <article className={`day-card${a ? ' has-ayah' : ''}`} aria-label={fmt(s.cardLabel, { title, date: hijri?.full ?? gregorian })}>
      {hijri && (
        <div className="dc-disc" aria-hidden="true">
          <span className="dc-day">{hijri.day}</span>
          <span className="dc-month">{hijri.month}</span>
          <span className="dc-year">{hijri.year}</span>
        </div>
      )}
      <div className="dc-paper">
        <div className="dc-head">
          <h2 className="dc-title">{title}</h2>
          <span className="dc-date">
            <span>{gregorian}</span>
            <button type="button" className="dc-share" onClick={share} aria-label={s.shareCard}>
              <span className="dc-share-ring">
                <IconShare />
              </span>
            </button>
          </span>
        </div>
        {copied && (
          <p className="dc-copied" role="status">
            {s.copied}
          </p>
        )}
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
              <span className="dc-ref" lang="ar" dir="rtl">
                {displayRef(ayah.ref, lang)}
              </span>
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

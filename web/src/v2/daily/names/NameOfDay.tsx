// «اسم من أسماء الله» on the home page, under «يومك» (reply 0068; reply 0071 §4.2; add-on 0072-add1): the short card,
// one name a day by the Riyadh date: the name and its ayah, letter for letter from D1 by its id (the evidence ayah,
// else the ayah for the meaning, else the first Quranic dua the entry lists; with none, its HadeethEnc hadith with its
// grade and attribution as stored), and outside Arabic the ayah's meaning in the reader's language. The whole card
// opens the name's page (NamePage.tsx: the entry in the approved look, the readings, the previous and next names).
// It shows once its text has loaded, so nothing moves; with none, or on a server without the route, there is no card.
import { useEffect, useState } from 'react'
import type { PassageResponse } from '../../../../../shared/api'
import { Mkp } from '../../../components/Ornaments'
import { useI18n } from '../../../i18n'
import { AyahEnd } from '../../../quran/AyahEnd'
import { arabicDigits, fmt, numFmt } from '../../../quran/format'
import { SURA_TYPE } from '../../reading/meta'
import { useReadingStrings } from '../../reading/ui'
import { getToolHadith, type ToolHadith } from '../api'
import { IcChevron } from '../icons'
import { openToday } from '../Screen'
import { getNameAyah, getNameDay, namePath, riyadhDate, type NameEntry } from './name-day-api'
import { NAME_DAY } from './strings-name-day'
import '../tools.css'
import './name-day.css'

type Short = { e: NameEntry; ayah?: PassageResponse; hadith?: ToolHadith }

/** The card's one quoted text: an ayah of the entry, else its hadith. */
async function loadShort(day: string, lang: string, content: string): Promise<Short | null> {
  const d = await getNameDay(day, lang)
  const e = d?.entry
  if (!e) return null
  const ayahId = e.ayah ?? e.meaningAyah ?? e.duas.find((x) => x.kind === 'ayah')?.id ?? null
  if (ayahId) {
    const p = await getNameAyah(ayahId, lang !== 'ar' ? content : 'ar', false)
    if (p?.ayah) return { e, ayah: p }
  }
  const hadithId = e.hadith ?? e.duas.find((x) => x.kind === 'hadith')?.id ?? null
  if (hadithId) return { e, hadith: await getToolHadith(hadithId, content) }
  return null
}

export function NameOfDay() {
  const { lang, content, t } = useI18n()
  const s = NAME_DAY[lang]
  const r = useReadingStrings()
  const num = numFmt(lang)
  // One date per visit of the page, as the day card (the day changes rarely while it is open).
  const [day] = useState(() => riyadhDate())
  const key = `${day}|${lang}|${content}`
  const [got, setGot] = useState<{ key: string; card: Short | null } | null>(null)
  useEffect(() => {
    let alive = true
    loadShort(day, lang, content).then(
      (card) => alive && setGot({ key, card }),
      () => alive && setGot({ key, card: null }),
    )
    return () => {
      alive = false
    }
  }, [day, lang, content, key])
  const card = got?.key === key ? got.card : null
  if (!card) return null
  const { e, ayah, hadith } = card
  const a = ayah?.ayah
  const refLine = a
    ? [lang === 'ar' ? a.suraName : fmt(t.suraNum, { n: num(a.sura) }), lang === 'ar' ? arabicDigits(a.aya) : num(a.aya), SURA_TYPE[a.sura] ? r[SURA_TYPE[a.sura]!] : null].filter(Boolean).join(' · ')
    : ''
  const meaning = lang !== 'ar' && ayah ? (ayah.meaning ? { text: ayah.meaning.text, lang: ayah.meaning.lang } : ayah.text_en ? { text: ayah.text_en, lang: 'en' } : null) : null
  const path = namePath(e.n)
  return (
    <a
      className="nd-card nd-short"
      href={path}
      onClick={(ev) => {
        ev.preventDefault()
        openToday(path)
      }}
      aria-label={fmt(s.cardLabel, { name: e.name })}
      data-testid="name-day"
      data-n={e.n}
    >
      <span className="nd-head">
        <span className="nd-title">{s.title}</span>
        <span className="nd-name" lang="ar" dir="rtl">
          {e.name}
        </span>
      </span>
      {ayah && a && (
        <span className="nd-short-q" data-part="ayah" data-id={ayah.id}>
          <span className="nd-ayah" lang="ar" dir="rtl">
            <AyahEnd text={ayah.text}>
              <Mkp n={arabicDigits(a.aya)} size={24} />
            </AyahEnd>
          </span>
          <span className="nd-ref">{refLine}</span>
          {meaning && (
            <span className="nd-short-meaning" lang={meaning.lang} dir={meaning.lang === 'ur' ? 'rtl' : 'ltr'}>
              {meaning.text}
            </span>
          )}
        </span>
      )}
      {!ayah && hadith && (
        <span className="nd-short-q" data-part="hadith" data-id={hadith.id}>
          <span className="nd-hadith" lang="ar" dir="rtl">
            {hadith.text}
          </span>
          <span className="nd-ref" lang="ar" dir="rtl">
            {[hadith.grade, hadith.attribution].filter(Boolean).join(' · ')}
          </span>
        </span>
      )}
      <span className="nd-more">
        <span>{s.more}</span>
        <IcChevron />
      </span>
    </a>
  )
}

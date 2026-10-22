// «اسم من أسماء الله» (reply 0068; reply 0071 §4.2; add-ons 0071-add1 §2–4 and 0071-add2 §2), the daily card in the
// look Talal approved (relay review.html, add-on 0071-add2 §2: «الشكل معتمد»), one name a day by the Riyadh date.
// 1. The quoted texts first, each letter for letter from our data by its id: the name; its evidence (the ayah from
//    /api/passage, or the HadeethEnc hadith with its grade and attribution as stored and its link); the ayah's tafsir
//    by al-Saʿdi and by Ibn Kathir (folded beyond its first paragraphs); the ayah for the meaning, said to be for the
//    meaning; the duas (an ayah, or a HadeethEnc row with its grade). The six entries with no HadeethEnc hadith as
//    evidence show their Quranic evidence alone (add-on 0071-add2 §2): an ayah the reviewed file cites for them.
// 2. Then the names file's readings, under the fixed heading «شرح تعليمي أعدّه التطبيق، وليس نقلًا عن العلماء», in a
//    dashed frame on another ground: only when the server sends them (NAMES_READINGS, worker/src/names-day.ts), and
//    only in the Arabic interface. Elsewhere the Arabic texts show with the ayah's meaning in the reader's language,
//    as in the ayah's panel (reply 0068 question (a) is open).
// The card shows once its parts have loaded, so nothing moves and the readings never come before the quoted texts. A
// part that does not load is left out (V2 rule 3); with none, or on a server without the route, there is no card.
import { useEffect, useState } from 'react'
import type { PassageResponse, TafsirText } from '../../../../../shared/api'
import { Mkp } from '../../../components/Ornaments'
import { useI18n } from '../../../i18n'
import { AyahEnd } from '../../../quran/AyahEnd'
import { MeaningBlock } from '../../../quran/Meaning'
import { arabicDigits, fmt, numFmt } from '../../../quran/format'
import { SURA_TYPE } from '../../reading/meta'
import { SourceLine, useReadingStrings } from '../../reading/ui'
import { meaningSource, type ReportLoc } from '../../sources/place'
import { getToolHadith, type ToolHadith } from '../api'
import { HadithBlock } from '../ToolParts'
import { getNameAyah, getNameDay, partsOf, riyadhDate, type NameDay, type NamePart, type NameReadings } from './name-day-api'
import { NAME_DAY } from './strings-name-day'
import '../tools.css'
import './name-day.css'

/** Paragraphs shown before the fold: al-Saʿdi's first two, Ibn Kathir's first (his entries run long). */
const SHOWN = { saadi: 2, katheer: 1 } as const

type Loaded = (NamePart & { kind: 'ayah'; p: PassageResponse }) | (NamePart & { kind: 'hadith'; h: ToolHadith })

/** The day's entry and each of its parts, read by id; a part that fails is dropped. */
async function loadCard(day: string, lang: string, content: string): Promise<{ d: NameDay; parts: Loaded[] } | null> {
  const d = await getNameDay(day, lang)
  if (!d?.entry) return null
  // The meaning in the content language outside Arabic; in Arabic the ayah's panel shows none, nor does the card.
  const ml = lang !== 'ar' ? content : 'ar'
  const got = await Promise.all(
    partsOf(d.entry, NAME_DAY[lang as keyof typeof NAME_DAY] ?? NAME_DAY.ar).map(async (part): Promise<Loaded | null> => {
      try {
        if (part.kind === 'ayah') {
          const p = await getNameAyah(part.id, ml, part.tafsir)
          return p?.ayah ? { ...part, kind: 'ayah', p } : null
        }
        return { ...part, kind: 'hadith', h: await getToolHadith(part.id, content) }
      } catch {
        return null
      }
    }),
  )
  const parts = got.filter((x): x is Loaded => !!x)
  return parts.length ? { d, parts } : null
}

/** Outside Arabic, the ayah's meaning in the reader's language, as the ayah's panel shows it (command 22). */
function AyahMeaning({ p }: { p: PassageResponse }) {
  const { t } = useI18n()
  if (p.meaning) return <MeaningBlock meaning={p.meaning} textEn={p.text_en} />
  if (!p.text_en) return null
  return (
    <section className="section nd-meaning">
      <p className="section-label">
        {t.englishMeaning}{' '}
        <span className="badge" lang="en" dir="ltr">
          Sahih International
        </span>
      </p>
      <p className="translation" lang="en" dir="ltr">
        {p.text_en}
      </p>
    </section>
  )
}

function Paragraphs({ x, shown, name }: { x: TafsirText; shown: number; name: string }) {
  const { lang } = useI18n()
  const ps = x.paragraphs?.length ? x.paragraphs : [x.text]
  return (
    <>
      {ps.slice(0, shown).map((p, i) => (
        <p key={i} className="nd-tafsir" lang="ar" dir="rtl">
          {p}
        </p>
      ))}
      {ps.length > shown && (
        <details className="nd-more">
          <summary>{fmt(NAME_DAY[lang].moreTafsir, { name })}</summary>
          {ps.slice(shown).map((p, i) => (
            <p key={i} className="nd-tafsir" lang="ar" dir="rtl">
              {p}
            </p>
          ))}
        </details>
      )}
    </>
  )
}

function AyahPart({ part, p }: { part: NamePart; p: PassageResponse }) {
  const { t, lang } = useI18n()
  const r = useReadingStrings()
  const num = numFmt(lang)
  const a = p.ayah!
  const type = SURA_TYPE[a.sura]
  const refLine = [lang === 'ar' ? a.suraName : fmt(t.suraNum, { n: num(a.sura) }), lang === 'ar' ? arabicDigits(a.aya) : num(a.aya), type ? r[type] : null]
    .filter(Boolean)
    .join(' · ')
  const byKind = lang !== 'ar' ? meaningSource(p.meaning) : undefined
  const loc: ReportLoc = { type: 'ayah', id: `${a.sura}:${a.aya}`, lang, source: 'ksu', label: refLine, ...(byKind ? { byKind } : {}) }
  const saadi = part.tafsir ? p.tafsir?.find((x) => x.key === 'saadi') : undefined
  const katheer = part.tafsir ? p.tafsir?.find((x) => x.key === 'katheer') : undefined
  return (
    <>
      <section className="nd-part" data-part="ayah" data-id={p.id}>
        <h3 className="nd-label">{part.label}</h3>
        <p className="nd-ayah" lang="ar" dir="rtl">
          <AyahEnd text={p.text}>
            <Mkp n={arabicDigits(a.aya)} size={26} />
          </AyahEnd>
        </p>
        <p className="nd-ref">{refLine}</p>
        <SourceLine k="mushaf" name={r.srcMushaf} via={r.srcKsu} url={p.url} loc={loc} />
        {lang !== 'ar' && <AyahMeaning p={p} />}
      </section>
      {saadi && (
        <section className="nd-part" data-part="tafsir" data-key="saadi">
          <h3 className="nd-label">{r.srcSaadi}</h3>
          {saadi.empty ? (
            <p className="nd-tafsir is-empty" lang="ar" dir="rtl">
              {saadi.text}
            </p>
          ) : (
            <Paragraphs x={saadi} shown={SHOWN.saadi} name={r.srcSaadi} />
          )}
          <SourceLine k="saadi" name={r.srcSaadi} via={r.srcKsu} url={saadi.url} loc={loc} />
        </section>
      )}
      {katheer && (
        <section className="nd-part" data-part="tafsir" data-key="katheer">
          <h3 className="nd-label">{r.srcKatheer}</h3>
          <Paragraphs x={katheer} shown={SHOWN.katheer} name={r.srcKatheer} />
          <SourceLine k="katheer" name={r.srcKatheer} via={r.srcKsu} url={katheer.url} loc={loc} />
        </section>
      )}
    </>
  )
}

/** The names file's readings: Arabic, under the fixed heading, apart from the quoted texts in face and frame. */
function Readings({ rd }: { rd: NameReadings }) {
  const s = NAME_DAY.ar
  return (
    <aside className="nd-made" lang="ar" dir="rtl" data-testid="name-day-readings">
      <p className="nd-made-h">{s.madeHeading}</p>
      <p>
        <b>{s.meaningLabel}</b> {rd.meaning}
      </p>
      <p>
        <b>{s.easyLabel}</b> {rd.easy}
      </p>
      <p>
        <b>{s.deepLabel}</b>
      </p>
      {rd.deep.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </aside>
  )
}

export function NameOfDay() {
  const { lang, content } = useI18n()
  const s = NAME_DAY[lang]
  // One date per visit of the page, as the day card (the day changes rarely while it is open).
  const [day] = useState(() => riyadhDate())
  const key = `${day}|${lang}|${content}`
  const [got, setGot] = useState<{ key: string; card: Awaited<ReturnType<typeof loadCard>> } | null>(null)
  useEffect(() => {
    let alive = true
    loadCard(day, lang, content).then(
      (card) => alive && setGot({ key, card }),
      () => alive && setGot({ key, card: null }),
    )
    return () => {
      alive = false
    }
  }, [day, lang, content, key])
  const card = got?.key === key ? got.card : null
  if (!card) return null
  const e = card.d.entry
  return (
    <article className="nd-card" aria-label={fmt(s.cardLabel, { name: e.name })} data-testid="name-day" data-n={e.n}>
      <header className="nd-head">
        <h2 className="nd-title">{s.title}</h2>
        <p className="nd-name" lang="ar" dir="rtl">
          {e.name}
        </p>
      </header>
      <div className="nd-quoted" data-testid="name-day-quoted">
        {card.parts.map((x) =>
          x.kind === 'ayah' ? (
            <AyahPart key={`a${x.id}`} part={x} p={x.p} />
          ) : (
            <section key={`h${x.id}`} className="nd-part" data-part="hadith" data-id={x.h.id}>
              <h3 className="nd-label">{x.label}</h3>
              <HadithBlock h={x.h} />
            </section>
          ),
        )}
      </div>
      {lang === 'ar' && card.d.readings && <Readings rd={card.d.readings} />}
    </article>
  )
}

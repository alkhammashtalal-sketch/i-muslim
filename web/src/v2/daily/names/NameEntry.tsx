// «اسم من أسماء الله»: the pieces of an entry shared by the luxury card (NameCard.tsx, add-on 0072-add11 §1) and the
// names page (Names.tsx). Reply 0068; reply 0071 §4.2; add-ons 0071-add1 §2–4, 0071-add2 §2, 0071-add5 §2, 0071-add7.
// - The quoted texts, each letter for letter from our data by its id: the evidence (the ayah from /api/passage, or the
//   HadeethEnc hadith with its grade and attribution as stored and its link), the ayah for the meaning, the duas, and
//   the ayah's tafsir by al-Saʿdi and Ibn Kathir (`tafsirOf` alone). A part that does not load is left out (V2 rule 3).
// - The names file's readings, under the fixed heading «شرح تعليمي أعدّه التطبيق، وليس نقلًا عن العلماء», in a dashed
//   frame on another ground: only when the server sends them (NAMES_READINGS, worker/src/names-day.ts). They are Arabic
//   in every interface (add-on 0071-add5 §2, reply 0068 question (a)), never machine-translated: outside Arabic the
//   heading and the line «الشرح متاح بالعربية» are in the reader's language, the readings below them in Arabic. An ayah
//   or a hadith they cite by number is a link to its page in the app. «أثره في قلبك» (add-on 0072-add11 §3), when the
//   server sends it, takes the readings' place under the same heading and by the same rules.
import { Fragment } from 'react'
import type { PassageResponse } from '../../../../../shared/api'
import { useI18n } from '../../../i18n'
import { MeaningBlock } from '../../../quran/Meaning'
import { navigate } from '../../../quran/route'
import { getToolHadith, type ToolHadith } from '../api'
import { meaningHadithRef, meaningHadithShown } from './name-card-model'
import { getNameAyah, partsOf, readingPieces, type NameEnriched, type NameEntry, type NamePart, type NameReadings } from './name-day-api'
import { NAME_DAY } from './strings-name-day'
import '../tools.css'
import './name-day.css'

export type Loaded = (NamePart & { kind: 'ayah'; p: PassageResponse }) | (NamePart & { kind: 'hadith'; h: ToolHadith })

/** An entry's parts, each read by its id; a part that fails is dropped. `pick` keeps only some (the home card's first). */
export async function loadParts(entry: NameEntry, lang: string, content: string, pick?: (parts: NamePart[]) => NamePart[]): Promise<Loaded[]> {
  // The meaning in the content language outside Arabic; in Arabic the ayah's panel shows none, nor does the card.
  const ml = lang !== 'ar' ? content : 'ar'
  const got = await Promise.all(
    (pick ?? ((x: NamePart[]) => x))(partsOf(entry, NAME_DAY[lang as keyof typeof NAME_DAY] ?? NAME_DAY.ar)).map(async (part): Promise<Loaded | null> => {
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
  return got.filter((x): x is Loaded => !!x)
}

/** The HadeethEnc hadith the server names on the meaning (add-on 0072-add16 §4), read by its id with its translation in
 *  the content language from HadeethEnc; null when there is none, when it fails, or when it is not the one named. */
export async function loadMeaningHadith(d: Pick<NameEnriched, 'meaningHadith'>, content: string): Promise<ToolHadith | null> {
  const ref = meaningHadithRef(d.meaningHadith)
  if (!ref) return null
  try {
    return meaningHadithShown(ref, await getToolHadith(ref.id, content))
  } catch {
    return null
  }
}

/** Outside Arabic, the ayah's meaning in the reader's language, as the ayah's panel shows it (command 22). */
export function AyahMeaning({ p }: { p: PassageResponse }) {
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

/** A reading's words, its citations by number as links to the ayah's or the hadith's page (add-on 0071-add5 §2). */
export function Cited({ t }: { t: string }) {
  return (
    <>
      {readingPieces(t).map((x, i) =>
        x.path ? (
          <a key={i} className="nd-cite" href={x.path} data-cite={x.id} onClick={(e) => (e.preventDefault(), navigate(x.path!))}>
            {x.text}
          </a>
        ) : (
          <Fragment key={i}>{x.text}</Fragment>
        ),
      )}
    </>
  )
}

/** The names file's readings: Arabic, under the fixed heading, apart from the quoted texts in face and frame. Outside
 *  Arabic the heading is in the reader's language, with the line that the explanation is in Arabic. */
export function Readings({ rd, heart }: { rd?: NameReadings; heart?: string[] }) {
  const { lang } = useI18n()
  const ar = NAME_DAY.ar
  const s = NAME_DAY[lang] ?? ar
  const outside = lang !== 'ar'
  return (
    <aside className="nd-made" data-testid="name-day-readings" {...(outside ? {} : { lang: 'ar', dir: 'rtl' })}>
      <p className="nd-made-h" lang={lang}>
        {s.madeHeading}
      </p>
      {outside && (
        <p className="nd-made-lang" lang={lang} data-testid="name-day-in-arabic">
          {s.inArabic}
        </p>
      )}
      <div className="nd-made-ar" lang="ar" dir="rtl" data-testid="name-day-readings-ar">
        {heart
          ? heart.map((p, i) => (
              <p key={i}>
                <Cited t={p} />
              </p>
            ))
          : rd && <ReadingsBody rd={rd} />}
      </div>
    </aside>
  )
}

function ReadingsBody({ rd }: { rd: NameReadings }) {
  const ar = NAME_DAY.ar
  return (
    <>
        <p>
          <b>{ar.meaningLabel}</b> <Cited t={rd.meaning} />
        </p>
        <p>
          <b>{ar.easyLabel}</b> <Cited t={rd.easy} />
        </p>
        <p>
          <b>{ar.deepLabel}</b>
        </p>
        {rd.deep.map((p, i) => (
          <p key={i}>
            <Cited t={p} />
          </p>
        ))}
    </>
  )
}

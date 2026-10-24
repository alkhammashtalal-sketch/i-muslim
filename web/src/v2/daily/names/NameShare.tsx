// «اسم الله لليوم» as an image to share (add-on 0072-add10 §3; the rules of 0072-add9), on the ayah's share sheet
// (ImageShareSheet): story or square, day or night. On it only what is quoted: the name in the shamsa, its Quranic
// evidence from D1 whole with its place (or, for an entry with no ayah, its HadeethEnc hadith with its grade and
// takhrij), the Hijri date by Umm al-Qura of the Riyadh day, «اسم الله لليوم», the source line and «مسلم» small. Never
// «القراءة». The image is in Arabic, as the ayah's, whatever the interface language. The name of the day is the same
// for everyone by the Riyadh date, so the images of one day match; another name's page shares it under «اسم من أسماء
// الله» without a date.
import { useCallback, useMemo } from 'react'
import { arabicDigits, fmt } from '../../../quran/format'
import { useI18n } from '../../../i18n'
import { hijriDisc } from '../../home/hijri-disc'
import { ImageShareSheet } from '../../reading/ShareSheet'
import { drawNameImage, type Look, type NameEvidence, type Shape } from '../../reading/share-image'
import { firstQuoted, type NameEntry } from './name-day-api'
import type { Loaded } from './NameEntry'
import { NAME_DAY } from './strings-name-day'

export const NAME_IMAGE_TITLE = 'اسم الله لليوم'
const OTHER_TITLE = NAME_DAY.ar.title

/** The Hijri date of a Riyadh day by Umm al-Qura, at its noon in Riyadh: «٣ جمادى الأولى ١٤٤٨ هـ». */
export const riyadhHijri = (day: string) => hijriDisc('ar', new Date(Date.parse(`${day}T12:00:00+03:00`)), 'Asia/Riyadh', 0)?.full ?? ''

/** The evidence the image carries, as the widget's first page (widget-names.ts firstQuoted): the evidence ayah or the
 *  ayah for the meaning, else the hadith evidence, else the first Quranic dua. */
export function nameEvidence(e: NameEntry, parts: Loaded[]): { evidence: NameEvidence; sourceLine: string } | null {
  const first = firstQuoted(e)
  const a = first?.kind === 'ayah' ? parts.find((p): p is Extract<Loaded, { kind: 'ayah' }> => p.kind === 'ayah' && p.id === first.id) : undefined
  if (a?.p.ayah) {
    const n = arabicDigits(a.p.ayah.aya)
    return { evidence: { kind: 'ayah', text: a.p.text, ayaLabel: n, refLine: `سورة ${a.p.ayah.suraName} · ${n}` }, sourceLine: 'نص المصحف · المصحف الإلكتروني' }
  }
  const h = first?.kind === 'hadith' ? parts.find((p): p is Extract<Loaded, { kind: 'hadith' }> => p.kind === 'hadith' && p.id === first.id) : undefined
  if (h) return { evidence: { kind: 'hadith', text: h.h.text, grade: h.h.grade ?? '', attribution: h.h.attribution ?? '' }, sourceLine: 'موسوعة الأحاديث النبوية' }
  return null
}

type Props = { open: boolean; onClose: () => void; entry: NameEntry; parts: Loaded[]; /** The Riyadh day whose name it is, or null. */ day: string | null }

export function NameShareSheet({ open, onClose, entry, parts, day }: Props) {
  const { lang } = useI18n()
  const s = NAME_DAY[lang] ?? NAME_DAY.ar
  const ev = useMemo(() => nameEvidence(entry, parts), [entry, parts])
  const draw = useCallback(
    (shape: Shape, look: Look) =>
      drawNameImage({
        name: entry.name,
        title: day ? NAME_IMAGE_TITLE : OTHER_TITLE,
        evidence: ev!.evidence,
        hijri: day ? riyadhHijri(day) : '',
        sourceLine: ev!.sourceLine,
        appName: '«مسلم»',
        shape,
        look,
      }),
    [entry.name, day, ev],
  )
  if (!ev) return null
  return (
    <ImageShareSheet
      open={open}
      onClose={onClose}
      title={s.shareTitle}
      alt={fmt(s.shareAlt, { name: entry.name })}
      label={`${entry.name} · ${day ? NAME_IMAGE_TITLE : OTHER_TITLE}`}
      fileBase={`muslim-name-${entry.n}`}
      draw={draw}
      testId="name-share-image"
    />
  )
}

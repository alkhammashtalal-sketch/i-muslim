// «من أقوال السلف» as an image to share (add-on 0072-add10 §3, by the rules of the name's image): story or square, day
// or night, on the ayah's share sheet (ImageShareSheet). On it the saying as its card shows it (the narrator's gloss in
// the lighter ink), «قال فلان» or «يُروى عن فلان», the book with its author, volume and page, the Shamela library, the
// Hijri date by Umm al-Qura of the Riyadh day it is the saying of, and «مسلم» small. Arabic, as the card.
import { useCallback } from 'react'
import { ImageShareSheet } from '../../reading/ShareSheet'
import { drawSalafImage, type Look, type Shape } from '../../reading/share-image'
import { langMeta, useI18n } from '../../../i18n'
import { arabicIndicIn, quoteNote, sepOf } from '../arabic-marks'
import { useHijriOffset } from '../hijri-offset'
import { riyadhHijri } from '../names/NameShare'
import { salafAttribution, salafParts, salafSource, type SalafCard } from './salaf-model'

export const SALAF_TITLE = 'من أقوال السلف'
const SHAMELA = 'المكتبة الشاملة'

/** `day`: the Riyadh day whose saying it is, for the date; null prints none. */
export function SalafShareSheet({ open, onClose, card, day }: { open: boolean; onClose: () => void; card: SalafCard; day: string | null }) {
  const { lang } = useI18n()
  const offset = useHijriOffset()
  const note = quoteNote(lang)
  const draw = useCallback(
    (shape: Shape, look: Look) =>
      drawSalafImage({
        title: SALAF_TITLE,
        parts: salafParts(card),
        attribution: salafAttribution(card),
        // The image is Arabic: its reference in Arabic-Indic digits and «✦» between its parts (add-on 0072-add23 §4.4–§4.5).
        sourceLine: `${arabicIndicIn(salafSource(card))}${sepOf('ar')}${SHAMELA}`,
        // Outside Arabic, «النص بالعربية» above the saying, which stays Arabic (§4.7).
        quoteNote: note ? { text: note, rtl: langMeta(lang).dir === 'rtl' } : null,
        hijri: day ? riyadhHijri(day, offset) : '',
        appName: '«مسلم»',
        shape,
        look,
      }),
    [card, day, offset, note, lang],
  )
  return (
    <ImageShareSheet
      open={open}
      onClose={onClose}
      title="شارك القول صورة"
      alt={`صورة قول ${card.sayer} مع مصدره`}
      label={`${SALAF_TITLE}${sepOf('ar')}${salafAttribution(card)}`}
      fileBase={`muslim-salaf-${card.n}`}
      draw={draw}
      testId="salaf-share-image"
    />
  )
}

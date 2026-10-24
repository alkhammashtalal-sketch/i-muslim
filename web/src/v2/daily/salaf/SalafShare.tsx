// «من أقوال السلف» as an image to share (add-on 0072-add10 §3, by the rules of the name's image): story or square, day
// or night, on the ayah's share sheet (ImageShareSheet). On it the saying as its card shows it (the narrator's gloss in
// the lighter ink), «قال فلان» or «يُروى عن فلان», the book with its author, volume and page, the Shamela library, the
// Hijri date by Umm al-Qura of the Riyadh day it is the saying of, and «مسلم» small. Arabic, as the card.
import { useCallback } from 'react'
import { ImageShareSheet } from '../../reading/ShareSheet'
import { drawSalafImage, type Look, type Shape } from '../../reading/share-image'
import { riyadhHijri } from '../names/NameShare'
import { salafAttribution, salafParts, salafSource, type SalafCard } from './salaf-model'

export const SALAF_TITLE = 'من أقوال السلف'
const SHAMELA = 'المكتبة الشاملة'

/** `day`: the Riyadh day whose saying it is, for the date; null prints none. */
export function SalafShareSheet({ open, onClose, card, day }: { open: boolean; onClose: () => void; card: SalafCard; day: string | null }) {
  const draw = useCallback(
    (shape: Shape, look: Look) =>
      drawSalafImage({
        title: SALAF_TITLE,
        parts: salafParts(card),
        attribution: salafAttribution(card),
        sourceLine: `${salafSource(card)} · ${SHAMELA}`,
        hijri: day ? riyadhHijri(day) : '',
        appName: '«مسلم»',
        shape,
        look,
      }),
    [card, day],
  )
  return (
    <ImageShareSheet
      open={open}
      onClose={onClose}
      title="شارك القول صورة"
      alt={`صورة قول ${card.sayer} مع مصدره`}
      label={`${SALAF_TITLE} · ${salafAttribution(card)}`}
      fileBase={`muslim-salaf-${card.n}`}
      draw={draw}
      testId="salaf-share-image"
    />
  )
}

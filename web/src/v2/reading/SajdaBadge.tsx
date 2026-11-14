import { useReadingStrings } from './ui'

/** Under an ayah whose text carries ۩ (reply 0032 C-8, board SajdaAfter): «place of a prostration of recitation»,
 *  with no ruling. The mark itself is in the Mushaf text; the one here is decoration for the eye only. `aya`: the
 *  ayah's number, shown after the words where the badge sits under a whole page (Mushaf view). */
export function SajdaBadge({ aya }: { aya?: string }) {
  const r = useReadingStrings()
  return (
    <div className="rd-sajda">
      <span>
        <span aria-hidden="true">۩</span>
        {r.sajdaMark}
        {aya ? ` · ${aya}` : ''}
      </span>
    </div>
  )
}

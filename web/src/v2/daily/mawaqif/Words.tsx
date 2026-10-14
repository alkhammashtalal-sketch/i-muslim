// The words of a dhikr of «أذكار المواقف», as one block for its page and for the adhkar page's sections (0050,
// 0050-add1): the words to say in the gold box (the box means «this is what you say»), the narrator's words inside it
// kept in place and set smaller (3293); a hadith's own wording of what to do, with no words to say, as a smaller quote
// in ink under «بلفظ الحديث» (no gold box); and a recitation's suras from the Mushaf.
import { useI18n } from '../../../i18n'
import { QuranBox } from '../adhkar/QuranBox'
import { boxText, type MawaqifItem } from './mawaqif-model'
import { MAWAQIF } from './strings-mawaqif'
import './mawaqif.css'

export function Words({ item, id, open, close, boxClass, textClass }: { item: MawaqifItem; id: string; open: string; close: string; boxClass: string; textClass: string }) {
  const { lang } = useI18n()
  const quran = item.quran ? <QuranBox h={{ id: `q-${id}`, quran: item.quran, quranLinks: item.quranLinks }} /> : null
  if (item.kind === 'quran') return <div id={id} data-testid="mq-quran">{quran}</div>
  if (item.kind === 'action')
    return (
      <>
        <figure className="mq-wording" id={id} data-testid="mq-wording">
          <figcaption>{MAWAQIF[lang].hadithWording}</figcaption>
          <blockquote lang="ar" dir="rtl">
            «{boxText(item.segments)}»
          </blockquote>
        </figure>
        {quran && <div data-testid="mq-quran">{quran}</div>}
      </>
    )
  const said = item.asides?.some(Boolean) ? (
    item.segments.map((seg, i) => (
      <span key={i} className={item.asides![i] ? 'mq-aside' : undefined}>
        {i ? ' ' : ''}
        {seg}
      </span>
    ))
  ) : (
    boxText(item.segments)
  )
  return (
    <div className={boxClass}>
      <p id={id} className={textClass} lang="ar" dir="rtl" data-testid="mq-words">
        {open}
        {said}
        {close}
      </p>
    </div>
  )
}

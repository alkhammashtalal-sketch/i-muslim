import { useI18n } from '../i18n'

/** Talal's two marks on the welcome page: «i» on the left, the palm on the right, no text (CLAUDE.md §8), one colour
 *  (the footer line's) through CSS masks. Under the footer line; on short phones at the foot of the welcome instead,
 *  so the starter card stays above the fold (decision 16.8). */
export function BrandMarks({ place }: { place: 'footer' | 'welcome' }) {
  const { t } = useI18n()
  return (
    <div className={`footer-marks marks-${place}`} dir="ltr">
      <span className="mark mark-i" role="img" aria-label={t.logoI} />
      <span className="sep" aria-hidden="true">
        ·
      </span>
      <span className="mark mark-palm" role="img" aria-label={t.logoPalm} />
    </div>
  )
}

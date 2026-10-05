import { useI18n } from '../i18n'
import './trust.css'

const ALIFTA_URL = 'https://www.alifta.gov.sa'

/**
 * Rule 13 (CLAUDE.md §3): under every «شروط الصلاة» passage, a fixed line saying the enumeration is the treatise's
 * and scholars hold other views on some details, with the competent authority's link. No other views are shown,
 * because they are not in the fixed sources. Use wherever such a passage is displayed (book, sheet, answer card),
 * with `isShurutPassage(id)` from './shurut'.
 */
export function ShurutNote() {
  const { t } = useI18n()
  return (
    <p className="shurut-note" role="note">
      {t.shurutNote}{' '}
      <a className="text-link" href={ALIFTA_URL} target="_blank" rel="noopener noreferrer">
        {t.referralButton} ↗
      </a>
    </p>
  )
}

// The page view of the reader (reply 0032 D-10; board MushafPage): «صفحة» shows the page's ayat in order from the
// `page` field (SuraView's page mode). The Medina Mushaf's own line division waits for the King Fahd Quran Complex's
// data (MUSHAF_LINES_SOURCE); until then this note says so beside the switch.
import { useI18n } from '../../i18n'
import { MUSHAF_LINES_SOURCE } from './flags'
import { TOOLS } from './strings-tools'
import './tools.css'

export function MushafLinesNote({ pageMode }: { pageMode: boolean }) {
  const { lang } = useI18n()
  if (!pageMode || MUSHAF_LINES_SOURCE === 'on') return null
  return (
    <p className="lines-pending" data-testid="lines-pending">
      {TOOLS[lang].linesPending}
    </p>
  )
}

import { useI18n } from '../i18n'
import { ReaderLink } from '../quran/QuranIndex'

/** «القرآن الكريم | كتب العقيدة» at the top of the library's two index pages. */
export function LibraryTabs({ current }: { current: 'quran' | 'books' }) {
  const { t } = useI18n()
  return (
    <nav className="library-tabs" aria-label={t.navLibrary}>
      <ReaderLink to="/quran" current={current === 'quran'}>
        {t.tabQuran}
      </ReaderLink>
      <ReaderLink to="/books" current={current === 'books'}>
        {t.tabBooks}
      </ReaderLink>
    </nav>
  )
}

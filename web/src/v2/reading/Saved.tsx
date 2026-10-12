import { useState } from 'react'
import { useI18n } from '../../i18n'
import { arabicDigits, fmt, numFmt } from '../../quran/format'
import { ReaderLink } from '../../quran/QuranIndex'
import { navigate, quranPath } from '../../quran/route'
import { IcBookmark, IcLock } from './icons'
import { pageOf } from './meta'
import { removeBookmark, useReading } from './store'
import { PageHead, Tabs, useReadingStrings, whenLabel } from './ui'
import { isolate, useSuras } from './useSuraNames'

/** «محفوظاتي» (reply 0032 C-2 and C-3, boards SavedAfter and NotesAfter): bookmarks and notes, on this device only;
 *  pressing one returns to its ayah. */
export function Saved() {
  const { lang } = useI18n()
  const r = useReadingStrings()
  const num = lang === 'ar' ? arabicDigits : numFmt(lang)
  const { bookmarks, notes } = useReading()
  const [tab, setTab] = useState<'bookmarks' | 'notes'>('bookmarks')
  const suras = useSuras()
  const name = (n: number) => isolate(suras?.find((s) => s.n === n)?.name ?? num(n))
  const head = (sura: number, aya: number) => `${name(sura)} · ${num(aya)} · ${fmt(r.page, { n: num(pageOf(sura, aya)) })}`

  return (
    <div className="rd-page">
      <PageHead title={r.savedTitle} onBack={() => navigate('/quran')} />
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'bookmarks', label: fmt(r.tabBookmarks, { n: num(bookmarks.length) }) },
          { value: 'notes', label: fmt(r.tabNotes, { n: num(notes.length) }) },
        ]}
      />
      {tab === 'bookmarks' ? (
        <section className="rd-card rd-saved" aria-label={r.tabBookmarks.replace(' ({n})', '')}>
          {bookmarks.length === 0 && <p className="rd-empty">{r.emptyBookmarks}</p>}
          {bookmarks.map((b) => (
            <div key={`${b.sura}:${b.aya}`} className="rd-saved-row">
              <span className="rd-mark">
                <IcBookmark filled />
              </span>
              <ReaderLink to={quranPath(b.sura, b.aya)}>
                <span className="rd-row-title">{head(b.sura, b.aya)}</span>
                <span className="rd-first">
                  <span lang="ar" dir="rtl">
                    {b.first}
                    {b.more ? ' …' : ''}
                  </span>
                </span>
              </ReaderLink>
              <span className="rd-saved-when">{whenLabel(b.at, r, num)}</span>
              <button type="button" className="rd-star" aria-label={`${r.removeBookmark}: ${name(b.sura)} ${num(b.aya)}`} onClick={() => removeBookmark(b.sura, b.aya)}>
                ✕
              </button>
            </div>
          ))}
        </section>
      ) : (
        <section className="rd-card rd-notes" aria-label={r.tabNotes.replace(' ({n})', '')}>
          {notes.length === 0 && <p className="rd-empty">{r.emptyNotes}</p>}
          {notes.map((n) => (
            <div key={`${n.sura}:${n.aya}`} className="rd-note-item">
              <p dir="auto">{n.text}</p>
              <ReaderLink to={quranPath(n.sura, n.aya)} label={`${r.openAyah}: ${name(n.sura)} ${num(n.aya)}`}>
                <span>
                  {name(n.sura)} · {num(n.aya)} ·{' '}
                  <span lang="ar" dir="rtl">
                    {n.first}
                    {n.more ? ' …' : ''}
                  </span>
                </span>
              </ReaderLink>
            </div>
          ))}
        </section>
      )}
      <p className="rd-privacy">
        <IcLock />
        {r.savedPrivacy}
      </p>
    </div>
  )
}

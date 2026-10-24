// «اسم من أسماء الله»: the name's own page (add-on 0072-add1), at /today/name/<n> (1–96), or /today/name for the day's
// entry. The entry in the approved look of relay review.html (NameEntry.tsx): the name; its evidence (the ayah from D1
// by id, or the HadeethEnc hadith); al-Saʿdi's tafsir, then Ibn Kathir's folded; the duas with their grade; then the
// readings under «شرح تعليمي أعدّه التطبيق، وليس نقلًا عن العلماء» while the server sends them. Under it the name in
// «القواعد المثلى» (its sheet on the one names page, sourced as there), «الاسم السابق / التالي» in the daily order
// (round from the last to the first), and «كل الأسماء».
import { useEffect, useState, type MouseEvent } from 'react'
import { IcChevron } from '../icons'
import { IcShare } from '../../reading/icons'
import { useI18n } from '../../../i18n'
import { numFmt } from '../../../quran/format'
import { navigate } from '../../../quran/route'
import { Screen } from '../Screen'
import { Failed, Loading, useTools } from '../ToolParts'
import { fill } from '../strings-tools'
import { getNameDay, getNameEntry, isNameShare, nameOfPath, namePath, NAMES_PATH, riyadhDate, type NameEntryDay } from './name-day-api'
import { NameShareSheet } from './NameShare'
import { loadParts, NameArticle, type Loaded } from './NameEntry'
import { bookNamesOf, NameSheet, useSuraNames, type Name } from './Names'
import { NAME_DAY } from './strings-name-day'
import './name-day.css'

const goTo = (path: string) => (e: MouseEvent) => {
  e.preventDefault()
  navigate(path)
  window.scrollTo?.(0, 0)
  document.querySelector('.dt-main')?.scrollTo?.(0, 0)
}

type Got = { key: string; d: NameEntryDay | null; parts: Loaded[]; today: string | null } | { key: string; error: true }

async function load(asked: number | null, lang: string, content: string): Promise<{ d: NameEntryDay | null; parts: Loaded[]; today: string | null }> {
  // No number: the day's entry, by the Riyadh date, as the home card.
  const day = riyadhDate()
  const todayN = await getNameDay(day, lang).then((x) => x?.entry?.n ?? null, () => null)
  const n = asked ?? todayN
  const d = n ? await getNameEntry(n) : null
  // The share image says «اسم الله لليوم» with the date only for the name of this Riyadh day.
  return { d, parts: d?.entry ? await loadParts(d.entry, lang, content) : [], today: d && d.entry.n === todayN ? day : null }
}

export function NamePage() {
  const { lang, content } = useI18n()
  const { s: tools } = useTools()
  const s = NAME_DAY[lang]
  const num = numFmt(lang)
  const suras = useSuraNames()
  const asked = nameOfPath(location.pathname)
  const key = `${asked ?? 'day'}|${lang}|${content}`
  const [got, setGot] = useState<Got | null>(null)
  const [retry, setRetry] = useState(0)
  const [book, setBook] = useState<Name | null>(null)
  // The widget's «شارك» opens the page at …/share with the image already open (add-on 0072-add10 §1).
  const [sharing, setSharing] = useState(() => isNameShare(location.pathname))
  const path = location.pathname
  useEffect(() => {
    if (isNameShare(path)) setSharing(true)
  }, [path])
  const closeShare = () => {
    setSharing(false)
    if (isNameShare(location.pathname) && asked) navigate(namePath(asked), { replace: true })
  }
  useEffect(() => {
    let alive = true
    load(asked, lang, content).then(
      (r) => alive && setGot({ key, ...r }),
      () => alive && setGot({ key, error: true }),
    )
    return () => {
      alive = false
    }
  }, [asked, lang, content, key, retry])
  const cur = got?.key === key ? got : null
  return (
    <Screen title={s.title}>
      {!cur ? (
        <Loading />
      ) : 'error' in cur ? (
        <Failed onRetry={() => setRetry((x) => x + 1)} />
      ) : !cur.d ? (
        <p className="tool-note">
          <a className="text-link" href={NAMES_PATH} onClick={goTo(NAMES_PATH)}>
            {s.allNames}
          </a>
        </p>
      ) : (
        <div className="nd-page" data-testid="name-page" data-n={cur.d.entry.n}>
          <NameArticle entry={cur.d.entry} parts={cur.parts} readings={cur.d.readings} page />
          <div className="nd-share">
            <button type="button" className="tool-btn" onClick={() => setSharing(true)} aria-haspopup="dialog" data-testid="name-share">
              <IcShare />
              {s.share}
            </button>
          </div>
          <NameShareSheet open={sharing} onClose={closeShare} entry={cur.d.entry} parts={cur.parts} day={cur.today} />
          {bookNamesOf(cur.d.entry.name).length > 0 && (
            <div className="nd-book" data-testid="name-book">
              {bookNamesOf(cur.d.entry.name).map((n) => (
                <button key={n.name} type="button" className="tool-btn" onClick={() => setBook(n)} aria-haspopup="dialog">
                  {fill(s.inBook, { book: tools.bookName })}
                  {bookNamesOf(cur.d!.entry.name).length > 1 ? ` · ${n.name}` : ''}
                </button>
              ))}
            </div>
          )}
          <nav className="nd-nav" aria-label={s.allNames} data-testid="name-nav">
            <a href={namePath(cur.d.prev.n)} onClick={goTo(namePath(cur.d.prev.n))} rel="prev" data-testid="name-prev">
              <span className="nd-nav-k">{s.prev}</span>
              <span className="nd-nav-name" lang="ar" dir="rtl">
                {cur.d.prev.name}
              </span>
            </a>
            <a href={namePath(cur.d.next.n)} onClick={goTo(namePath(cur.d.next.n))} rel="next" data-testid="name-next">
              <span className="nd-nav-k">{s.next}</span>
              <span className="nd-nav-name" lang="ar" dir="rtl">
                {cur.d.next.name}
              </span>
            </a>
          </nav>
          <a className="nd-all" href={NAMES_PATH} onClick={goTo(NAMES_PATH)} data-testid="name-all">
            <span>
              {s.allNames} <span className="nd-count">({num(cur.d.count)})</span>
            </span>
            <IcChevron />
          </a>
        </div>
      )}
      <NameSheet n={book} onClose={() => setBook(null)} suras={suras} />
    </Screen>
  )
}

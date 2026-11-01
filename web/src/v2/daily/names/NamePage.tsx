// «اسم من أسماء الله»: the name's own page (add-ons 0072-add1, 0072-add11 §1), at /today/name/<n> (1–96), or /today/name
// for the day's entry: the luxury card (NameCard.tsx) open whole, the same design as the home's. Its footer holds
// «شارك», the name in «القواعد المثلى» (its sheet on the one names page, sourced as there), «الاسم السابق / التالي» in
// the daily order (round from the last to the first), also by a swipe either way (add-on 0072-add54), and «كل الأسماء». The page stays for the widgets and links.
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { useI18n } from '../../../i18n'
import { navigate } from '../../../quran/route'
import { useSwipe } from '../../../paging/useSwipe'
import { Screen } from '../Screen'
import { Failed, Loading } from '../ToolParts'
import { getNameDay, getNameEntry, isNameShare, nameOfPath, namePath, NAMES_PATH, riyadhDate, type NameEntryDay } from './name-day-api'
import { NameCard } from './NameCard'
import { NameShareSheet } from './NameShare'
import { loadMeaningHadith, loadParts, type Loaded } from './NameEntry'
import type { ToolHadith } from '../api'
import { NAME_DAY } from './strings-name-day'
import './name-day.css'

const goTo = (path: string) => (e: MouseEvent) => {
  e.preventDefault()
  navigate(path)
  window.scrollTo?.(0, 0)
  document.querySelector('.dt-main')?.scrollTo?.(0, 0)
}

type Got = { key: string; d: NameEntryDay | null; parts: Loaded[]; today: string | null; sunnah: ToolHadith | null } | { key: string; error: true }

async function load(asked: number | null, lang: string, content: string): Promise<{ d: NameEntryDay | null; parts: Loaded[]; today: string | null; sunnah: ToolHadith | null }> {
  // No number: the day's entry, by the Riyadh date, as the home card. The header carries the date only for that name.
  const day = riyadhDate()
  const todayN = await getNameDay(day, lang).then((x) => x?.entry?.n ?? null, () => null)
  const n = asked ?? todayN
  const d = n ? await getNameEntry(n) : null
  // The share image says «اسم الله لليوم» with the date only for the name of this Riyadh day.
  const [parts, sunnah] = d?.entry ? await Promise.all([loadParts(d.entry, lang, content), loadMeaningHadith(d, content)]) : [[], null]
  return { d, parts, sunnah, today: d && d.entry.n === todayN ? day : null }
}

export function NamePage() {
  const { lang, content } = useI18n()
  const s = NAME_DAY[lang]
  const asked = nameOfPath(location.pathname)
  const key = `${asked ?? 'day'}|${lang}|${content}`
  const [got, setGot] = useState<Got | null>(null)
  const [retry, setRetry] = useState(0)
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
  // A swipe turns to the previous or the next name, as its buttons (add-on 0072-add54); not while the share sheet is open.
  const shown = cur && !('error' in cur) ? cur.d : null
  const pageRef = useRef<HTMLDivElement>(null)
  useSwipe(
    pageRef,
    (k) => {
      const to = k > 0 ? shown?.next : shown?.prev
      if (!to || sharing) return
      navigate(namePath(to.n))
      window.scrollTo?.(0, 0)
      document.querySelector('.dt-main')?.scrollTo?.(0, 0)
    },
    !!shown,
  )
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
        <div className="nd-page" data-testid="name-page" data-n={cur.d.entry.n} ref={pageRef}>
          <NameCard mode="page" day={cur.today} parts={cur.parts} data={{ ...cur.d, sunnah: cur.sunnah }} />
          <NameShareSheet open={sharing} onClose={closeShare} entry={cur.d.entry} parts={cur.parts} day={cur.today} />
        </div>
      )}
    </Screen>
  )
}

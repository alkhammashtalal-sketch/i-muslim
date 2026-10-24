// «اسم الله لليوم» on the home page, under «يومك» (reply 0068; reply 0071 §4.2; add-ons 0072-add1, 0072-add11 §1): the
// luxury card (NameCard.tsx), one name a day by the Riyadh date, opening in place with no navigation: the header, the
// evidence, the first meaning quote and one saying of the Salaf, then «أكمل القراءة» shows the rest where it is. The
// name's page (/today/name/<n>) stays for the widgets and links, the same card open whole.
// It shows once its first text has loaded, so nothing moves; the rest (the other parts, the tafsir, the previous and
// next names) loads right after, before «أكمل القراءة» is pressed. With nothing quoted, or on a server without the
// route, there is no card.
import { useEffect, useState } from 'react'
import { useI18n } from '../../../i18n'
import { getNameDay, getNameEntry, riyadhDate, type NameDay, type NameEntryDay, type NamePart } from './name-day-api'
import { NameCard } from './NameCard'
import { loadParts, type Loaded } from './NameEntry'

/** The home's first text: the evidence (the ayah, else the hadith), else the first dua the entry lists. */
const first = (ps: NamePart[]) => ps.slice(0, 1)

type Got = { key: string; d: NameDay | null; lead: Loaded[]; full: Loaded[] | null; near: NameEntryDay | null }

export function NameOfDay() {
  const { lang, content } = useI18n()
  // One date per visit of the page, as the day card (the day changes rarely while it is open).
  const [day] = useState(() => riyadhDate())
  const key = `${day}|${lang}|${content}`
  const [got, setGot] = useState<Got | null>(null)
  useEffect(() => {
    let alive = true
    ;(async () => {
      const d = await getNameDay(day, lang)
      if (!d?.entry) return alive && setGot({ key, d: null, lead: [], full: null, near: null })
      const lead = await loadParts(d.entry, lang, content, first)
      if (!alive) return
      setGot({ key, d, lead, full: null, near: null })
      const [full, near] = await Promise.all([loadParts(d.entry, lang, content), getNameEntry(d.entry.n).catch(() => null)])
      if (alive) setGot({ key, d, lead, full, near })
    })().catch(() => alive && setGot({ key, d: null, lead: [], full: null, near: null }))
    return () => {
      alive = false
    }
  }, [day, lang, content, key])
  const cur = got?.key === key ? got : null
  if (!cur?.d || !cur.lead.length) return null
  const { d, near } = cur
  return (
    <NameCard
      mode="home"
      day={d.day}
      parts={cur.full ?? cur.lead}
      pending={!cur.full}
      data={{ entry: d.entry, count: d.count, readings: d.readings, meaning: d.meaning, salaf: d.salaf, heart: d.heart, prev: near?.prev, next: near?.next }}
    />
  )
}

import { useEffect, useMemo, useState } from 'react'
import { useI18n } from '../../i18n'
import { arabicDigits, fmt, foldArabic, numFmt } from '../../quran/format'
import { ReaderLink } from '../../quran/QuranIndex'
import { quranPath } from '../../quran/route'
import { HizbMark, IcCaret, QuarterMark } from './icons'
import { JUZ, quarterInfo } from './meta'
import { useReadingStrings } from './ui'
import { isolate, useSuras } from './useSuraNames'
import { api } from '../../api/base'

type Quarter = { q: number; sura: number; aya: number; page: number; first: string; more: boolean }

let memo: Promise<Quarter[]> | null = null
/** The quarters' opening words, cut from D1 by the server (GET /api/quarters, edge-cached). */
function getQuarters(): Promise<Quarter[]> {
  memo ??= fetch(api('/api/quarters')).then((r) => {
    if (!r.ok) throw new Error(`quarters ${r.status}`)
    return r.json() as Promise<Quarter[]>
  })
  memo.catch(() => (memo = null))
  return memo
}

/** The index by juz and quarters (reply 0032 C-1, boards IndexAfter and IndexAfterN): thirty folding juz, each with
 *  its eight quarters (the hizb's start marked by its number), the quarter's opening words cut from its ayah's text,
 *  and its sura, ayah and page. */
export function JuzIndex({ query, initialOpen }: { query: string; initialOpen?: number }) {
  const { t, lang } = useI18n()
  const r = useReadingStrings()
  const num = lang === 'ar' ? arabicDigits : numFmt(lang)
  const suras = useSuras()
  const rawName = (n: number) => suras?.find((s) => s.n === n)?.name ?? num(n)
  const name = (n: number) => isolate(rawName(n))
  const [quarters, setQuarters] = useState<Quarter[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState<Set<number>>(() => new Set([initialOpen ?? 1]))

  useEffect(() => {
    let alive = true
    getQuarters().then(
      (q) => alive && setQuarters(q),
      () => alive && setFailed(true),
    )
    return () => {
      alive = false
    }
  }, [])

  // «٣», «3», «الجزء 3», or a sura's name: the juz that match.
  const shown = useMemo(() => {
    const all = JUZ.map((_, i) => i + 1)
    const q = query.trim()
    if (!q) return all
    const digits = q.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).match(/\d{1,2}/)
    if (digits) return all.filter((j) => j === Number(digits[0]))
    const f = foldArabic(q)
    return all.filter((j) => {
      const startSura = JUZ[j - 1][0]
      const endSura = j < 30 ? JUZ[j][0] : 114
      for (let s = startSura; s <= endSura; s++) if (foldArabic(rawName(s)).includes(f)) return true
      return false
    })
  }, [query, suras]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (j: number) =>
    setOpen((o) => {
      const n = new Set(o)
      if (n.has(j)) n.delete(j)
      else n.add(j)
      return n
    })
  const partLabel = [null, r.quarter1, r.quarter2, r.quarter3] as const

  return (
    <>
      {failed && (
        <p className="card-body" role="alert">
          {t.errConnection}
        </p>
      )}
      {shown.length === 0 && <p className="card-body">{t.suraNoResults}</p>}
      {shown.map((j) => {
        const [s, a] = JUZ[j - 1]
        const isOpen = open.has(j)
        const id = `juz-${j}`
        const qs = quarters?.filter((x) => quarterInfo(x.q).juz === j) ?? []
        return (
          <section key={j} className="rd-card rd-juz">
            <button type="button" className="rd-juz-toggle" aria-expanded={isOpen} aria-controls={id} onClick={() => toggle(j)}>
              <span>
                {fmt(r.juzN, { n: num(j) })}
                <small>
                  {' · '}
                  {name(s)} {num(a)}
                </small>
              </span>
              <IcCaret />
            </button>
            {isOpen && (
              <div id={id}>
                {!quarters && !failed && (
                  <p className="small" role="status">
                    {r.quartersLoading}
                  </p>
                )}
                {qs.map((x) => {
                  const info = quarterInfo(x.q)
                  const label = info.part === 0 ? fmt(r.hizbN, { n: num(info.hizb) }) : partLabel[info.part]!
                  return (
                    <ReaderLink key={x.q} to={quranPath(x.sura, x.aya)} className="rd-row rd-quarter" label={`${label}: ${name(x.sura)} ${num(x.aya)}`}>
                      <span className="rd-qmark" aria-hidden="true">
                        {info.part === 0 ? (
                          <>
                            <HizbMark size={40} />
                            <b>{num(info.hizb)}</b>
                          </>
                        ) : (
                          <QuarterMark part={info.part as 1 | 2 | 3} />
                        )}
                      </span>
                      <span className="rd-row-main">
                        <span className="rd-first">
                          <span lang="ar" dir="rtl">
                            {x.first}
                            {x.more ? ' …' : ''}
                          </span>
                        </span>
                        <span className="rd-row-sub">
                          {name(x.sura)} · {num(x.aya)} · {fmt(r.page, { n: num(x.page) })}
                        </span>
                      </span>
                    </ReaderLink>
                  )
                })}
              </div>
            )}
          </section>
        )
      })}
      <p className="rd-note">{r.indexSourceNote}</p>
    </>
  )
}

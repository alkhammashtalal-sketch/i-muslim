// A dhikr that is reading the Quran (0049-add1 ب, ج): its box from the app's own Mushaf data, in the adhkar lists and
// in «أذكار المواقف».
import { useEffect, useState, type MouseEvent } from 'react'
import type { SuraResponse } from '../../../../../shared/api'
import { Mkp } from '../../../components/Ornaments'
import { AyahEnd } from '../../../quran/AyahEnd'
import { getSura } from '../../../quran/api'
import { arabicDigits } from '../../../quran/format'
import { useSuras } from '../../reading/useSuraNames'
import { openToday } from '../Screen'
import type { QuranRange } from './adhkar-model'

/** A dhikr that is reading the Quran (0049-add1 ب): the ayat from the app's own Mushaf data as the reader shows them (the
 *  basmala before a whole sura, each ayah with its marker), the sura's name opening it in the reader; a long sura is a
 *  button to the reader instead. */
export function QuranBox({ h }: { h: { id: string; quran?: QuranRange[]; quranLinks?: boolean } }) {
  const [suras, setSuras] = useState<Record<number, SuraResponse | null>>({})
  useEffect(() => {
    if (h.quranLinks) return
    let alive = true
    for (const r of h.quran ?? []) void getSura(r.s, false).then((x) => alive && setSuras((m) => ({ ...m, [r.s]: x })))
    return () => {
      alive = false
    }
  }, [h])
  const open = (n: number, aya?: number) => (e: MouseEvent) => {
    e.preventDefault()
    openToday(`/quran/${n}${aya ? `/${aya}` : ''}`)
  }
  if (h.quranLinks)
    return (
      <div className="dhikr-box dhikr-suras" id={`adhkar-${h.id}`} data-testid={`box-${h.id}`}>
        {(h.quran ?? []).map((r) => (
          <a key={r.s} className="dhikr-sura-btn" href={`/quran/${r.s}`} onClick={open(r.s)} lang="ar" dir="rtl" data-testid={`sura-${r.s}`}>
            <SuraName n={r.s} />
          </a>
        ))}
      </div>
    )
  return (
    <div className="dhikr-box dhikr-quran" id={`adhkar-${h.id}`} lang="ar" dir="rtl" data-testid={`box-${h.id}`}>
      {(h.quran ?? []).map((r) => {
        const x = suras[r.s]
        const from = r.from ?? 1
        const ayat = x?.ayat.filter((a) => a.aya >= from && a.aya <= (r.to ?? Infinity)) ?? []
        return (
          <section key={r.s} className="dhikr-sura" data-sura={r.s}>
            <a className="dhikr-sura-name" href={`/quran/${r.s}${from > 1 ? `/${from}` : ''}`} onClick={open(r.s, from > 1 ? from : undefined)}>
              <SuraName n={r.s} />
            </a>
            {!x ? (
              <p className="tool-note" role="status" lang="ar">
                …
              </p>
            ) : (
              <>
                {from === 1 && x.basmala && <p className="dhikr-basmala">{x.basmala}</p>}
                <p className="dhikr-ayat" data-testid={`ayat-${r.s}`}>
                  {ayat.map((a) => (
                    <span key={a.aya} data-aya={a.aya}>
                      <AyahEnd text={a.text}>
                        <Mkp n={arabicDigits(a.aya)} size={32} />
                      </AyahEnd>{' '}
                    </span>
                  ))}
                </p>
              </>
            )}
          </section>
        )
      })}
    </div>
  )
}

function SuraName({ n }: { n: number }) {
  const suras = useSuras()
  const name = suras?.find((x) => x.n === n)?.name
  return <>{name ? `سورة ${name}` : arabicDigits(n)}</>
}


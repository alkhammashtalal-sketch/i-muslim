import { useEffect, useState } from 'react'
import type { PassageResponse } from '../../../shared/api'
import featured from '../config/featured-ayat.json'
import { Mkp, MushafFrame } from '../components/Ornaments'
import { AyahEnd } from './AyahEnd'
import { useI18n } from '../i18n'
import { getAyah } from './api'
import { arabicDigits, ayahOf, displayRef, suraTitle } from './format'
import { ReaderLink } from './QuranIndex'
import { quranPath } from './route'

// Ayah ids chosen by the Sharia reviewer (e.g. "quran:2:255"). The card stays hidden while the list is empty.
const LIST = (featured as string[]).filter((x) => /^quran:\d{1,3}:\d{1,3}$/.test(x))

export function FeaturedAyah() {
  const { t, lang } = useI18n()
  const [p, setP] = useState<PassageResponse | null>(null)

  useEffect(() => {
    if (!LIST.length) return
    const day = Math.floor(Date.now() / 86_400_000)
    const [, s, a] = LIST[day % LIST.length].split(':')
    let alive = true
    getAyah(Number(s), Number(a)).then(
      (r) => alive && setP(r),
      () => undefined,
    )
    return () => {
      alive = false
    }
  }, [])

  if (!LIST.length || !p?.ayah) return null
  return (
    <section className="featured" aria-labelledby="featured-h">
      <h2 className="section-label" id="featured-h">
        {t.featuredTitle}
      </h2>
      <MushafFrame title={suraTitle(p.ref)}>
        <p className="sacred" lang="ar" dir="rtl">
          <AyahEnd text={p.text}>
            <Mkp n={arabicDigits(ayahOf(p.id))} size={30} />
          </AyahEnd>
        </p>
      </MushafFrame>
      <div className="quote-meta">
        <span className="ref" lang="ar" dir="rtl">
          {displayRef(p.ref, lang)}
        </span>
        <ReaderLink to={quranPath(p.ayah.sura, p.ayah.aya)} className="text-link">
          {t.openInMushaf}
        </ReaderLink>
      </div>
    </section>
  )
}

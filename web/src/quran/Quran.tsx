import { useEffect, useRef, useState } from 'react'
import type { Quote, SuraResponse } from '../../../shared/api'
import { AyahSheet } from './AyahSheet'
import { loadPrefs, savePrefs } from './prefs'
import { QuranIndex } from './QuranIndex'
import { isCurrentPath, navigate, quranPath, useRoute } from './route'
import { Reciters } from '../v2/reading/Reciters'
import { Saved } from '../v2/reading/Saved'
import { Ward } from '../v2/reading/Ward'
import { SuraView } from './SuraView'
import './quran.css'

type Props = {
  sura?: number
  aya?: number
  onAsk: (draft: string) => void
  onReport: (q: Quote) => void
}

/** The "Mushaf" section: sura index, or one sura with its ayah sheet. */
export function Quran({ sura, aya, onAsk, onReport }: Props) {
  const [meta, setMeta] = useState<{ n: number; name: string; ayat: number } | null>(null)
  const [openAya, setOpenAya] = useState<number | null>(null)
  const [scrollTo, setScrollTo] = useState<number | undefined>(aya)
  const internal = useRef(false)
  const route = useRoute()
  const page = route.view === 'quran' ? route.page : undefined

  // A route change we did not cause (deep link, back/forward, index search) scrolls to and opens the ayah.
  useEffect(() => {
    if (internal.current) {
      internal.current = false
      return
    }
    setScrollTo(aya)
    setOpenAya(aya ?? null)
  }, [sura, aya])

  // Last position: opening a sura without an ayah keeps the last ayah read in that sura.
  // An ayah is remembered only once the sura has loaded and the ayah exists (never «البقرة: ٩٩٩»).
  useEffect(() => {
    if (!sura) return
    const m = meta?.n === sura ? meta : null
    if (aya !== undefined && (!m || aya < 1 || aya > m.ayat)) return
    const prev = loadPrefs().last
    savePrefs({ last: { sura, aya: aya ?? (prev?.sura === sura ? prev.aya : 1) } })
  }, [sura, aya, meta])

  const select = (a: number | null) => {
    if (!sura) return
    setOpenAya(a)
    const path = quranPath(sura, a ?? undefined)
    if (isCurrentPath(path)) return
    internal.current = true
    navigate(path, { replace: true })
  }

  if (!sura) {
    // The reader's own pages (reply 0032 C): saved, my portion, reciters.
    if (page === 'saved') return <Saved />
    if (page === 'ward') return <Ward />
    if (page === 'reciters') return <Reciters />
    return <QuranIndex />
  }

  const loaded = (s: SuraResponse) => setMeta({ n: s.n, name: s.name, ayat: s.ayat.length })
  const m = meta?.n === sura ? meta : null

  return (
    <>
      <SuraView key={sura} sura={sura} selected={openAya ?? undefined} scrollTo={scrollTo} onOpen={(a) => select(a)} onLoaded={loaded} />
      {m && openAya !== null && (
        <AyahSheet
          open
          sura={sura}
          aya={openAya}
          suraName={m.name}
          suraAyat={m.ayat}
          onClose={() => select(null)}
          onNav={(a) => {
            select(a)
            document.getElementById(`a-${a}`)?.scrollIntoView({ block: 'center' })
          }}
          onAsk={onAsk}
          onReport={onReport}
        />
      )}
    </>
  )
}

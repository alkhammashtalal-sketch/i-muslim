import { useState } from 'react'
import { useI18n } from '../../i18n'
import { foldArabic, fmt } from '../../quran/format'
import { navigate } from '../../quran/route'
import { RECITERS, reciterLabel, setReciter, useReciter, type Reciter } from '../../quran/recitation'
import { IcSearch, IcStar } from './icons'
import { RIWAYA } from './meta'
import { ReciterAvatar } from './ReciterAvatar'
import { toggleFavReciter, useReading } from './store'
import { Chips, PageHead, useReadingStrings } from './ui'

/** «القرّاء» (reply 0032 C-6, board RecitersFav): the reciters with checked timings, each with his riwaya from
 *  mp3quran's reads.json, a favourite star, a filter by riwaya, and the choice of reciter. Favourites stay on this
 *  device. His photo where it has a known licence (reply 0047 §1), else the initial of his name. Opened from the
 *  settings too, and «back» returns there. */
export function Reciters() {
  const { lang } = useI18n()
  const r = useReadingStrings()
  const chosen = useReciter()
  const { favReciters } = useReading()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const riwayat = [...new Set(RECITERS.map((x) => RIWAYA[x.read]).filter((x): x is string => !!x))]
  const match = (x: Reciter) => {
    const f = foldArabic(q.trim().toLowerCase())
    const okQ = !f || foldArabic(x.name.ar).includes(f) || (x.name.en ?? '').toLowerCase().includes(f)
    const okF = filter === 'all' || (filter === 'fav' ? favReciters.includes(x.read) : RIWAYA[x.read] === filter)
    return okQ && okF
  }
  const shown = RECITERS.filter(match)
  const favs = shown.filter((x) => favReciters.includes(x.read))
  const rest = filter === 'fav' ? [] : shown.filter((x) => !favReciters.includes(x.read))

  const row = (x: Reciter) => {
    const fav = favReciters.includes(x.read)
    const name = reciterLabel(x, lang)
    const isChosen = x.read === chosen.read
    return (
      <div key={x.read} className="rd-reciter">
        <button type="button" className="rd-reciter-pick" aria-pressed={isChosen} aria-label={isChosen ? `${r.chosenReciter}: ${name}` : fmt(r.chooseReciter, { name })} onClick={() => setReciter(x.read)}>
          <ReciterAvatar reciter={x} />
          <span>
            <span className="rd-reciter-name">{name}</span>
            {RIWAYA[x.read] && (
              <span className="rd-row-sub" lang="ar">
                {RIWAYA[x.read]}
              </span>
            )}
          </span>
        </button>
        <button type="button" className="rd-star" aria-pressed={fav} aria-label={`${fav ? r.removeFav : r.addFav}: ${name}`} onClick={() => toggleFavReciter(x.read)}>
          <IcStar filled={fav} />
        </button>
        <span className="rd-check" aria-hidden="true">
          {isChosen ? '✓' : ''}
        </span>
      </div>
    )
  }

  return (
    <div className="rd-page">
      <PageHead title={r.recitersTitle} onBack={() => (history.state?.muslimToday ? history.back() : navigate('/quran'))} />
      <div className="rd-search" role="search">
        <IcSearch />
        <label htmlFor="reciter-q" className="sr-only">
          {r.searchReciter}
        </label>
        <input id="reciter-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={r.searchReciter} autoComplete="off" />
      </div>
      <Chips<string>
        label={r.filterLabel}
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: r.filterAll },
          {
            value: 'fav',
            label: (
              <>
                <IcStar size={16} filled={filter === 'fav'} />
                {r.favourites}
              </>
            ),
          },
          ...riwayat.map((x) => ({ value: x, label: <span lang="ar">{x}</span> })),
        ]}
      />
      {favs.length > 0 && (
        <section className="rd-card" style={{ padding: '0 14px 4px' }} aria-labelledby="rec-fav">
          <h2 className="rd-group-title" id="rec-fav">
            {r.favourites}
          </h2>
          {favs.map(row)}
        </section>
      )}
      {rest.length > 0 && (
        <section className="rd-card" style={{ padding: '0 14px 4px' }} aria-labelledby="rec-all">
          <h2 className="rd-group-title" id="rec-all">
            {r.allReciters}
          </h2>
          {rest.map(row)}
        </section>
      )}
      {shown.length === 0 && <p className="rd-empty">{r.noReciters}</p>}
      <p className="rd-note">{r.recitersNote}</p>
    </div>
  )
}

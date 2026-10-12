// The user's place for the daily screens (reply 0031-add10 §4): the browser's location on a tap only, or a city from
// the GeoNames list (public/geo/cities.json, CC BY 4.0, «© GeoNames» shown with the list). Kept on the device with
// web/src/daily/location.ts; never sent to our server (the mosques screen sends a ~1 km cell, nothing else).
import { useEffect, useMemo, useState } from 'react'
import type { Lang } from '../../../../shared/api'
import { Sheet } from '../../components/Sheet'
import { locate, savedPlace, savePlace, searchCities, type CityRow, type Place } from '../../daily/location'
import { distanceM } from '../../daily/mosques'
import { useI18n } from '../../i18n'
import { TODAY } from './strings-today'

const EVENT = 'muslim:place'

/** The saved place, kept in sync across the screens that use it. */
export function usePlace(): [Place | null, (p: Place) => void] {
  const [place, setPlace] = useState<Place | null>(() => savedPlace())
  useEffect(() => {
    const h = () => setPlace(savedPlace())
    window.addEventListener(EVENT, h)
    window.addEventListener('storage', h)
    return () => {
      window.removeEventListener(EVENT, h)
      window.removeEventListener('storage', h)
    }
  }, [])
  const update = (p: Place) => {
    savePlace(p)
    setPlace(p)
    window.dispatchEvent(new Event(EVENT))
  }
  return [place, update]
}

type CityFile = { tz: string[]; rows: [string, string | 0, number, number, string, number][] }
let cities: Promise<CityRow[]> | null = null
/** The city list, fetched from our own static file the first time it is needed. */
export function loadCities(): Promise<CityRow[]> {
  cities ??= fetch('/geo/cities.json')
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json() as Promise<CityFile>
    })
    .then((f) => f.rows.map((r): CityRow => [r[0], r[1] || null, r[2], r[3], r[4], f.tz[r[5]], 0]))
  cities.catch(() => (cities = null))
  return cities
}

/** The city's name in the interface: the Arabic name GeoNames lists in the Arabic interface, else its own name. */
export const cityName = (r: CityRow, lang: Lang) => (lang === 'ar' && r[1] ? r[1] : r[0])

/** The nearest listed city within 30 km of a position (to name a located place), or null. */
export async function nearestCity(p: { lat: number; lng: number }): Promise<CityRow | null> {
  const rows = await loadCities().catch(() => [] as CityRow[])
  let best: CityRow | null = null
  let bestD = 30_000
  for (const r of rows) {
    if (Math.abs(r[2] - p.lat) > 0.5 || Math.abs(r[3] - p.lng) > 0.5) continue
    const d = distanceM(p, { lat: r[2], lng: r[3] })
    if (d < bestD) (best = r), (bestD = d)
  }
  return best
}

/** The place's name for the interface: the chosen city, or for a located place the nearest city if any. */
export function usePlaceName(place: Place | null): string | null {
  const { lang } = useI18n()
  const [near, setNear] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    if (place?.source === 'gps') nearestCity(place).then((r) => alive && setNear(r ? cityName(r, lang) : null))
    return () => {
      alive = false
    }
  }, [place, lang])
  if (!place) return null
  return place.source === 'city' ? (place.name ?? null) : near
}

/** «حدّد مكانك»: the browser's location (on this tap only) or a city from the list. */
export function PlaceSheet({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (p: Place) => void }) {
  const { lang } = useI18n()
  const s = TODAY[lang]
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<CityRow[] | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    let alive = true
    loadCities()
      .then((r) => alive && setRows(r))
      .catch(() => alive && setRows([]))
    return () => {
      alive = false
    }
  }, [open])

  const found = useMemo(() => (rows && q.trim() ? searchCities(rows, q, 30) : []), [rows, q])

  const useMine = async () => {
    setBusy(true)
    setMsg(s.locating)
    try {
      const p = await locate()
      setMsg(null)
      onPick(p)
    } catch (e) {
      setMsg((e as Error).message === 'denied' ? s.denied : s.unavailable)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={s.placeTitle}>
      <div className="dt-place">
        <button type="button" className="dt-btn dt-btn-primary" onClick={useMine} disabled={busy}>
          <PinIcon />
          {s.useMyLocation}
        </button>
        {msg && (
          <p className="dt-note" role="status">
            {msg}
          </p>
        )}
        <label className="dt-search">
          <span className="sr-only">{s.searchCity}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={s.searchCity} autoComplete="off" />
        </label>
        {rows === null && q.trim() && <p className="dt-note">{s.citiesLoading}</p>}
        {rows && q.trim() && found.length === 0 && <p className="dt-note">{s.noCity}</p>}
        {found.length > 0 && (
          <ul className="dt-city-list">
            {found.map((r) => (
              <li key={`${r[0]}|${r[2]}|${r[3]}`}>
                <button type="button" onClick={() => onPick({ lat: r[2], lng: r[3], timeZone: r[5], name: cityName(r, lang), source: 'city' })}>
                  <span className="dt-city-name">{cityName(r, lang)}</span>
                  <span className="dt-city-sub" dir="ltr">
                    {r[0] !== cityName(r, lang) ? `${r[0]} · ` : ''}
                    {r[4]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="dt-attrib">
          <a href="https://www.geonames.org/" target="_blank" rel="noopener noreferrer" dir="ltr">
            {s.geonames}
          </a>
        </p>
      </div>
    </Sheet>
  )
}

export const PinIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </svg>
)

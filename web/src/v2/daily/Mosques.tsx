// Mosques around (reply 0032 D-9; board Mosques), from /api/mosques (worker/src/mosques.ts, OpenStreetMap through
// Overpass): the phone sends only its ~1 km cell (web/src/daily/mosques.ts cellOf), and orders by the exact distance
// itself. «اتجاهات» opens the phone's maps (Apple Maps on Apple devices, Google Maps elsewhere), with no key. The
// OpenStreetMap attribution is shown under the list. The board's «الأسماء للعرض فقط» tag is a review mark, not shown.
// In the iOS app (reply 0043 ج) the list comes from Apple Maps on the phone instead (web/src/native/mosques.ts), searched
// around the same ~1 km cell, so nothing reaches our server; when that search fails or finds nothing, «افتح خرائط أبل»
// opens Apple Maps searching «مسجد» there. The source line and the privacy line say Apple Maps then.
// «اتجاهات» opens Google Maps first (reply 0043-add5; in the app through @capacitor/app-launcher, web/src/native/maps.ts,
// outside the web view), with a small «خرائط أبل» link on Apple devices. A mosque OpenStreetMap leaves unnamed shows
// «مسجد» with its street (addr:street) when it has one.
import { AppLauncher } from '@capacitor/app-launcher'
import { useCallback, useEffect, useState } from 'react'
import { byDistance, cellOf, directions, OSM_ATTRIBUTION, OSM_COPYRIGHT_URL, type Mosque } from '../../daily/mosques'
import { useI18n } from '../../i18n'
import { distanceText, fill } from './format'
import { IcDirections, IcMosque, IcPin } from './icons'
import { PlaceSheet, usePlace } from './place'
import { Privacy, Screen } from './Screen'
import { TODAY } from './strings-today'
import { api } from '../../api/base'
import { isNative, platform } from '../../native/platform'
import { openAppleDirections, openGoogleDirections } from '../../native/maps'
import { appleMapsSearch, searchNativeMosques } from '../../native/mosques'

/** The server's search radius (worker/src/mosques.ts RADIUS_M). */
const RADIUS_M = 3000
type State = { kind: 'idle' | 'loading' } | { kind: 'done'; list: (Mosque & { distance: number })[] } | { kind: 'busy' | 'error' }

const apple = () => /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)
/** The point sent out: the place rounded to its ~1 km cell (as cellOf). */
const cellPoint = (p: { lat: number; lng: number }) => ({ lat: Number(p.lat.toFixed(2)), lng: Number(p.lng.toFixed(2)) })

export function Mosques() {
  const { lang } = useI18n()
  const s = TODAY[lang]
  const [place, setPlace] = usePlace()
  const [sheet, setSheet] = useState(false)
  const [state, setState] = useState<State>({ kind: 'idle' })
  const ios = platform() === 'ios'
  const native = isNative()
  const appleLink = ios || (!native && apple())

  const load = useCallback(async () => {
    if (!place) return
    setState({ kind: 'loading' })
    if (ios) {
      try {
        const found = await searchNativeMosques(cellPoint(place), RADIUS_M)
        return setState({ kind: 'done', list: byDistance(place, found).filter((m) => m.distance <= RADIUS_M).slice(0, 25) })
      } catch {
        return setState({ kind: 'error' })
      }
    }
    try {
      const r = await fetch(api(`/api/mosques?cell=${cellOf(place)}&lang=${lang}`))
      if (r.status === 503) return setState({ kind: 'busy' })
      if (!r.ok) return setState({ kind: 'error' })
      const j = (await r.json()) as { mosques: Mosque[] }
      setState({ kind: 'done', list: byDistance(place, j.mosques).filter((m) => m.distance <= RADIUS_M).slice(0, 25) })
    } catch {
      setState({ kind: 'error' })
    }
  }, [place, lang, ios])

  // Opening this screen is the user's tap on «المساجد»: the one request goes then (and again only on «حاول مرة ثانية»).
  useEffect(() => {
    void load()
  }, [load])

  const within = fill(s.within, { d: distanceText(RADIUS_M, lang) })
  const mapsSearch = place ? appleMapsSearch(cellPoint(place)) : ''
  const openMaps = ios && place ? (
    <a
      className="dt-btn"
      href={mapsSearch}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        e.preventDefault()
        void AppLauncher.openUrl({ url: mapsSearch })
      }}
    >
      <IcPin />
      {s.openAppleMaps}
    </a>
  ) : null
  return (
    <Screen title={s.mosquesTitle}>
      <div className="dt-placerow">
        <button type="button" className="dt-place-btn" onClick={() => setSheet(true)} aria-label={fill(s.changePlace, { place: s.around })}>
          <IcPin />
          {place ? (
            <>
              {s.around}
              <span className="dt-muted"> · {within}</span>
            </>
          ) : (
            s.placeTitle
          )}
        </button>
      </div>

      {!place ? (
        <section className="dt-card dt-pad">
          <p className="dt-lead">{s.findMosques}</p>
          <button type="button" className="dt-btn dt-btn-primary" onClick={() => setSheet(true)}>
            <IcPin />
            {s.useMyLocation}
          </button>
        </section>
      ) : state.kind === 'loading' || state.kind === 'idle' ? (
        <section className="dt-card dt-pad" aria-busy="true">
          <p className="dt-note">…</p>
        </section>
      ) : state.kind === 'done' ? (
        state.list.length === 0 ? (
          <section className="dt-card dt-pad">
            <p className="dt-body">{fill(s.noMosques, { d: distanceText(RADIUS_M, lang) })}</p>
            {openMaps}
          </section>
        ) : (
          <section className="dt-card dt-mosques">
            {state.list.map((m) => {
              const name = m.name ?? (m.street ? `${s.unnamedMosque} · ${m.street}` : s.unnamedMosque)
              const d = directions(m)
              return (
                <div key={m.id} className="dt-mosque">
                  <span className="dt-mosque-ic" aria-hidden="true">
                    <IcMosque />
                  </span>
                  <span className="dt-row-text">
                    <span className="dt-row-title" dir="auto">
                      {name}
                    </span>
                    <span className="dt-row-sub">{distanceText(m.distance, lang)}</span>
                  </span>
                  <span className="dt-dir">
                    <a
                      className="dt-dir-btn"
                      href={d.google}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={fill(s.directionsTo, { m: name })}
                      onClick={
                        native
                          ? (e) => {
                              e.preventDefault()
                              void openGoogleDirections(d)
                            }
                          : undefined
                      }
                    >
                      <IcDirections />
                      {s.directions}
                    </a>
                    {appleLink ? (
                      <a
                        className="dt-dir-apple"
                        href={d.apple}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={fill(s.appleDirectionsTo, { m: name })}
                        onClick={
                          native
                            ? (e) => {
                                e.preventDefault()
                                void openAppleDirections(d)
                              }
                            : undefined
                        }
                      >
                        {s.appleMapsLink}
                      </a>
                    ) : null}
                  </span>
                </div>
              )
            })}
          </section>
        )
      ) : (
        <section className="dt-card dt-pad" role="status">
          <p className="dt-body">{state.kind === 'busy' ? s.mosquesBusy : s.mosquesError}</p>
          <div className="dt-btn-row">
            <button type="button" className="dt-btn" onClick={() => void load()}>
              {s.tryAgain}
            </button>
            {openMaps}
          </div>
        </section>
      )}
      {ios ? (
        <p className="dt-attrib">{s.sourceAppleMaps}</p>
      ) : (
        <p className="dt-attrib" dir="ltr">
          <a href={OSM_COPYRIGHT_URL} target="_blank" rel="noopener noreferrer">
            {OSM_ATTRIBUTION}
          </a>
        </p>
      )}
      <Privacy>{ios ? s.privacyMosquesApple : s.privacyMosques}</Privacy>
      <PlaceSheet
        open={sheet}
        onClose={() => setSheet(false)}
        onPick={(p) => {
          setPlace(p)
          setSheet(false)
        }}
      />
    </Screen>
  )
}

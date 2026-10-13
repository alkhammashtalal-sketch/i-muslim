// The user's place (reply 0031-add10, §4): navigator.geolocation on a tap only; the coordinates stay on the device
// (localStorage) and are never sent to our server. Who declines picks a city from the GeoNames list (CC BY 4.0,
// «© GeoNames», geonames.org), which carries its own time zone. In the iOS/Android app the position comes from
// @capacitor/geolocation (reply 0033 §ب3), still only from the tap on «استعمل موقعي»: the system asks once, with the
// app's own permission text (ios/App/App/*.lproj/InfoPlist.strings), and the web view's second prompt never shows.
import { isNative } from '../native/platform'
import type { LatLng } from './prayer'

export type Place = LatLng & { timeZone: string; name?: string; source: 'gps' | 'city' }
/** One row of data/processed/cities.json: [name, arabicName, lat, lng, countryCode, timeZone, population]. */
export type CityRow = [string, string | null, number, number, string, string, number]

const KEY = 'muslim.place.v1'

export function savedPlace(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): Place | null {
  try {
    const p = JSON.parse(storage?.getItem(KEY) ?? 'null') as Place | null
    return p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && typeof p.timeZone === 'string' ? p : null
  } catch {
    return null
  }
}

export function savePlace(p: Place, storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(p))
  } catch {}
}

/** Ask the browser (or, in the app, the system) for the position (call only from a tap). The time zone is the device's. */
export function locate(timeoutMs = 15_000): Promise<Place> {
  if (isNative()) return locateNative(timeoutMs)
  return new Promise((resolve, reject) => {
    if (!globalThis.navigator?.geolocation) return reject(new Error('no_geolocation'))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, source: 'gps' }),
      (e) => reject(new Error(e.code === 1 ? 'denied' : 'unavailable')),
      { enableHighAccuracy: false, maximumAge: 10 * 60_000, timeout: timeoutMs },
    )
  })
}

async function locateNative(timeoutMs: number): Promise<Place> {
  const { Geolocation } = await import('@capacitor/geolocation')
  try {
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, maximumAge: 10 * 60_000, timeout: timeoutMs })
    return { lat: pos.coords.latitude, lng: pos.coords.longitude, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, source: 'gps' }
  } catch {
    // Refused now or before («denied»), or no fix / location services off («unavailable»): the same two messages.
    const st = await Geolocation.checkPermissions().catch(() => null)
    throw new Error(st?.location === 'denied' ? 'denied' : 'unavailable')
  }
}

const fold = (s: string) => s.normalize('NFKD').replace(/[̀-ًͯ-ٰٟ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase().trim()

/** Cities whose name (Latin or Arabic) starts with the query, the most populous first. */
export function searchCities(rows: CityRow[], q: string, limit = 20): CityRow[] {
  const f = fold(q)
  if (!f) return []
  const out: CityRow[] = []
  for (const r of rows) {
    if (fold(r[0]).startsWith(f) || (r[1] && fold(r[1]).startsWith(f))) out.push(r)
    if (out.length >= limit) break
  }
  return out
}

export const placeFromCity = (r: CityRow): Place => ({ lat: r[2], lng: r[3], timeZone: r[5], name: r[1] ?? r[0], source: 'city' })

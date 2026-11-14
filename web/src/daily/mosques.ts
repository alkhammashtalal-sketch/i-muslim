// Nearby mosques, device side (reply 0031-add10, §6). The device sends only a grid cell of about 1 km (the
// coordinates rounded to 0.01°), never its position; the server asks OpenStreetMap's Overpass once per cell and caches
// it; the exact distances and the order are computed here. Directions open the device's maps, with no key.
// Attribution shown with the list: «© OpenStreetMap contributors» → https://www.openstreetmap.org/copyright
import type { LatLng } from './prayer'

export const OSM_ATTRIBUTION = '© OpenStreetMap contributors'
export const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright'

/** street: OpenStreetMap's addr:street, shown with «مسجد» when the mosque has no name there (reply 0043-add5). */
export type Mosque = { id: string; name: string | null; street?: string | null; lat: number; lng: number }

/** The cell sent to the server: lat and lng rounded to 0.01° (~1.1 km), as text. */
export const cellOf = (p: LatLng) => `${p.lat.toFixed(2)},${p.lng.toFixed(2)}`

/** Great-circle distance in metres. */
export function distanceM(a: LatLng, b: LatLng): number {
  const R = 6_371_008.8
  const r = (x: number) => (x * Math.PI) / 180
  const dLat = r(b.lat - a.lat)
  const dLng = r(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

export const byDistance = (from: LatLng, list: Mosque[]) =>
  list.map((m) => ({ ...m, distance: distanceM(from, m) })).sort((a, b) => a.distance - b.distance)

/** Driving directions to the mosque's own position (reply 0043-add5): Google Maps first (its app on iOS when installed,
 *  else its link), Apple Maps as the small second link. */
export const directions = (m: Pick<Mosque, 'lat' | 'lng'>) => ({
  google: `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}&travelmode=driving`,
  googleApp: `comgooglemaps://?daddr=${m.lat},${m.lng}&directionsmode=driving`,
  apple: `https://maps.apple.com/?daddr=${m.lat},${m.lng}&dirflg=d`,
})
export type Directions = ReturnType<typeof directions>

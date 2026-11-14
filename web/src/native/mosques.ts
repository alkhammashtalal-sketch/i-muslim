// Mosques around in the iOS app (reply 0043 ج): the local Capacitor plugin MosqueSearch
// (web/ios/App/App/MosqueSearchPlugin.swift) searches Apple Maps on the device for «مسجد» and «mosque» around the ~1 km
// cell, so the request never reaches our server or Overpass. The browser and Android keep /api/mosques
// (worker/src/mosques.ts). When the search fails, the screen offers «افتح خرائط أبل» (appleMapsSearch).
import { registerPlugin } from '@capacitor/core'
import type { Mosque } from '../daily/mosques'
import type { LatLng } from '../daily/prayer'

type Plugin = { search(o: { lat: number; lng: number; radius: number }): Promise<{ mosques: Mosque[] }> }
const MosqueSearch = registerPlugin<Plugin>('MosqueSearch')

/** Apple Maps' answer around the cell's point (lat and lng already rounded to 0.01°); throws when both searches fail. */
export async function searchNativeMosques(cell: LatLng, radius: number): Promise<Mosque[]> {
  const { mosques } = await MosqueSearch.search({ lat: cell.lat, lng: cell.lng, radius })
  return mosques
}

/** Apple Maps searching «مسجد» around the cell: the fallback that always works on iOS. */
export const appleMapsSearch = (cell: LatLng) => `https://maps.apple.com/?q=${encodeURIComponent('مسجد')}&sll=${cell.lat.toFixed(2)},${cell.lng.toFixed(2)}&z=14`

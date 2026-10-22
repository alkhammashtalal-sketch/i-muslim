// «تلقائي حسب البلد» (add-on 0071-add13 §1): the calculation method from the place's country, on the device, from what
// the device already holds: the country of the city picked from the GeoNames list, else the place's IANA time zone (a
// located place keeps the device's zone). No network, no new data.
//
// Chosen by measurement, not by habit (relay/w1/0071-market/1-methods.md): on 23 October 2026 each adhan method was
// compared, minute by minute, with the table the country's own authority publishes, and a country is listed only where
// one method beat Umm al-Qura. Every other country keeps Umm al-Qura, as before this change.
//   SA  KACST's Umm al-Qura calendar service ........ Umm al-Qura (≤1 min)
//   EG  Dar al-Ifta (Egyptian General Authority of Survey) Egyptian (≤1; Umm al-Qura: Isha +12)
//   TR  Diyanet ...................................... Turkey (≤1; Umm al-Qura: Maghrib −8)
//   GB  London Unified Prayer Timetable (East London Mosque) Moonsighting Committee (≤4; Umm al-Qura: Fajr −17)
//   FR  Grande Mosquée de Paris ...................... Moonsighting Committee (≤6; Umm al-Qura: Fajr −14)
//   US  Islamic Cultural Center of New York .......... ISNA (≤5; Umm al-Qura: Fajr −20)
//   ID  Kemenag (Bimas Islam) ........................ Singapore (≤3; Umm al-Qura: Isha +16)
//   PK  Jamia Uloom-ul-Islamia, Banuri Town .......... Karachi (≤1; Umm al-Qura: Isha +13)
//   MY  JAKIM e-Solat ................................ Karachi (≤3: JAKIM's own 18°/18° since 2019-20; adhan's
//                                                       «Singapore» for Malaysia gives Fajr −10)
//   SG  MUIS ......................................... Singapore (≤1; Umm al-Qura: Isha +19)
//   AE  General Authority of Islamic Affairs (Awqaf) . Dubai (≤2; Umm al-Qura: Isha +13)
// Qatar's Awqaf table ties Umm al-Qura (≤2 either way), so Qatar keeps it; Kuwait's table was not reached, so Kuwait keeps it.
import type { Method } from './prayer'

export const METHOD_BY_COUNTRY: Readonly<Record<string, Method>> = {
  SA: 'UmmAlQura',
  EG: 'Egyptian',
  TR: 'Turkey',
  GB: 'MoonsightingCommittee',
  FR: 'MoonsightingCommittee',
  US: 'NorthAmerica',
  ID: 'Singapore',
  PK: 'Karachi',
  MY: 'Karachi',
  SG: 'Singapore',
  AE: 'Dubai',
}

/** Every country not listed above, and a place whose country is unknown. */
export const AUTO_FALLBACK: Method = 'UmmAlQura'

/** The time zones of the listed countries (tzdata zone1970.tab, and the old names a device may still report). */
const ZONES: Readonly<Record<string, string>> = {
  'Asia/Riyadh': 'SA',
  'Africa/Cairo': 'EG',
  'Egypt': 'EG',
  'Europe/Istanbul': 'TR',
  'Asia/Istanbul': 'TR',
  'Turkey': 'TR',
  'Europe/London': 'GB',
  'Europe/Belfast': 'GB',
  'GB': 'GB',
  'Europe/Paris': 'FR',
  'America/New_York': 'US',
  'America/Detroit': 'US',
  'America/Chicago': 'US',
  'America/Menominee': 'US',
  'America/Denver': 'US',
  'America/Boise': 'US',
  'America/Phoenix': 'US',
  'America/Los_Angeles': 'US',
  'America/Anchorage': 'US',
  'America/Juneau': 'US',
  'America/Sitka': 'US',
  'America/Metlakatla': 'US',
  'America/Yakutat': 'US',
  'America/Nome': 'US',
  'America/Adak': 'US',
  'Pacific/Honolulu': 'US',
  'US/Eastern': 'US',
  'US/Central': 'US',
  'US/Mountain': 'US',
  'US/Pacific': 'US',
  'US/Arizona': 'US',
  'US/Alaska': 'US',
  'US/Hawaii': 'US',
  'Asia/Jakarta': 'ID',
  'Asia/Pontianak': 'ID',
  'Asia/Makassar': 'ID',
  'Asia/Ujung_Pandang': 'ID',
  'Asia/Jayapura': 'ID',
  'Asia/Karachi': 'PK',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Kuching': 'MY',
  'Asia/Singapore': 'SG',
  'Singapore': 'SG',
  'Asia/Dubai': 'AE',
}
const ZONE_PREFIXES: readonly [string, string][] = [
  ['America/Indiana/', 'US'],
  ['America/Kentucky/', 'US'],
  ['America/North_Dakota/', 'US'],
]

/** The listed country a time zone belongs to, or null (a zone of an unlisted country, or none). */
export function countryOfZone(timeZone: string | undefined): string | null {
  if (!timeZone) return null
  return ZONES[timeZone] ?? ZONE_PREFIXES.find(([p]) => timeZone.startsWith(p))?.[1] ?? null
}

type Where = { country?: string; timeZone?: string } | null | undefined

/** The place's country: the city list's own code when the place was picked from it, else its time zone's. */
export function placeCountry(place: Where): string | null {
  const c = typeof place?.country === 'string' ? place.country.toUpperCase() : ''
  return /^[A-Z]{2}$/.test(c) ? c : countryOfZone(place?.timeZone)
}

/** The method «تلقائي حسب البلد» gives for a place. */
export const autoMethod = (place: Where): Method => METHOD_BY_COUNTRY[placeCountry(place) ?? ''] ?? AUTO_FALLBACK

// «تلقائي حسب البلد» (add-ons 0071-add13 §1 and 0071-add15 §1): the calculation method, the Asr school and the
// precaution minutes from the place's country, on the device, from what the device already holds: the country of the
// city picked from the GeoNames list, else the place's IANA time zone (a located place keeps the device's zone). No
// network, no new data.
//
// Chosen by measurement, not by habit (relay/w1/0071-market/1-methods.md): on 23 October 2026 each adhan method was
// compared, minute by minute, with the table the country's authority publishes; the method closest at Fajr and Isha
// (where the methods' angles differ), then over the six times, then in total. Largest difference before (Umm al-Qura)
// → after, in minutes:
//   SA  KACST's Umm al-Qura calendar service ................ Umm al-Qura 1 → 1
//   EG  Dar al-Ifta (Egyptian General Authority of Survey) .. Egyptian 12 → 1
//   TR  Diyanet ............................................. Turkey 8 → 1
//   GB  London Unified Prayer Timetable (East London Mosque)  Moonsighting Committee + its stated allowances, 17 → 4
//   FR  Grande Mosquée de Paris ............................. Moonsighting Committee 14 → 6
//   US  Islamic Cultural Center of New York ................. ISNA 20 → 5
//   CA  Islamic Foundation of Toronto (no national table) ... ISNA 19 → 8
//   ID  Kemenag (Bimas Islam) ............................... Singapore + Kemenag's 2-minute ihtiyat, 16 → 1
//   PK  Jamia Uloom-ul-Islamia, Banuri Town ................. Karachi, Hanafi Asr as printed, 13 → 1
//   MY  JAKIM e-Solat ....................................... Karachi (JAKIM's 18°/18°) 18 → 3
//   SG  MUIS ................................................ Singapore 19 → 1
//   AE  General Authority of Islamic Affairs (Awqaf) ........ Dubai 13 → 2
//   QA  Ministry of Awqaf ................................... Qatar 2 → 2 (a tie with Umm al-Qura; the country's own)
//   JO  Ministry of Awqaf ................................... Dubai 8 → 4
// Not measured, by the authority's own method in adhan-js (add-on 0071-add15 §1.4): KW (the Ministry's site publishes
// no table we could reach). The Hanafi Asr of IN, BD and AF is Talal's decision (add-on 0071-add15 §1.2); their method,
// with no authority's table reached, is the fallback. Every other country, and a place whose country is unknown: Muslim
// World League (add-on 0071-add15 §1.4); against Diyanet's table for Berlin (Germany has no official one) it is 8 minutes
// off where Umm al-Qura was 12. Iran is left on it: the Tehran method's Maghrib is a madhab's, for Talal to decide.
import type { AsrSchool, Method, PrayerOptions } from './prayer'

export type Adjust = NonNullable<PrayerOptions['adjust']>
export type CountryRule = {
  method: Method
  /** The Asr the country's table prints, when it is the Hanafi one. */
  asr?: AsrSchool
  /** Minutes the country's table states it adds as precaution, beyond what the method itself adds. */
  adjust?: Adjust
}

export const COUNTRY_RULES: Readonly<Record<string, CountryRule>> = {
  SA: { method: 'UmmAlQura' },
  EG: { method: 'Egyptian' },
  TR: { method: 'Turkey' },
  // London Unified Prayer Timetable, «Accuracy and geographic coverage» (londonsalahtimes.com/technical): «Sunrise:
  // 3 minutes earlier; ‘Asr: 2 minutes later; Sunset: 3 minutes later; … Zuhr: 5 minutes later». The method already
  // adds the last two (Moonsighting Committee: Dhuhr +5, Maghrib +3), so only the first two are added here.
  GB: { method: 'MoonsightingCommittee', adjust: { sunrise: -3, asr: 2 } },
  FR: { method: 'MoonsightingCommittee' },
  US: { method: 'NorthAmerica' },
  CA: { method: 'NorthAmerica' },
  // Kemenag's ihtiyat of 2 minutes (Depag RI 1994, «Pedoman Penentuan Jadwal Waktu Shalat Sepanjang Masa», as quoted
  // in ejournal.uin-malang.ac.id/index.php/jurisdictie/article/view/2181): every time 2 minutes later, sunrise 2
  // minutes earlier.
  ID: { method: 'Singapore', adjust: { fajr: 2, sunrise: -2, dhuhr: 2, asr: 2, maghrib: 2, isha: 2 } },
  PK: { method: 'Karachi', asr: 'hanafi' },
  IN: { method: 'MuslimWorldLeague', asr: 'hanafi' },
  BD: { method: 'MuslimWorldLeague', asr: 'hanafi' },
  AF: { method: 'MuslimWorldLeague', asr: 'hanafi' },
  MY: { method: 'Karachi' },
  SG: { method: 'Singapore' },
  AE: { method: 'Dubai' },
  QA: { method: 'Qatar' },
  KW: { method: 'Kuwait' },
  JO: { method: 'Dubai' },
}

/** Every country not listed above, and a place whose country is unknown. */
export const AUTO_FALLBACK: CountryRule = { method: 'MuslimWorldLeague' }

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
  'America/Toronto': 'CA',
  'America/Montreal': 'CA',
  'America/Vancouver': 'CA',
  'America/Edmonton': 'CA',
  'America/Winnipeg': 'CA',
  'America/Regina': 'CA',
  'America/Swift_Current': 'CA',
  'America/Halifax': 'CA',
  'America/Glace_Bay': 'CA',
  'America/Moncton': 'CA',
  'America/Goose_Bay': 'CA',
  'America/St_Johns': 'CA',
  'America/Whitehorse': 'CA',
  'America/Dawson': 'CA',
  'America/Dawson_Creek': 'CA',
  'America/Fort_Nelson': 'CA',
  'America/Cambridge_Bay': 'CA',
  'America/Inuvik': 'CA',
  'America/Iqaluit': 'CA',
  'America/Rankin_Inlet': 'CA',
  'America/Resolute': 'CA',
  'Canada/Eastern': 'CA',
  'Canada/Central': 'CA',
  'Canada/Mountain': 'CA',
  'Canada/Pacific': 'CA',
  'Canada/Atlantic': 'CA',
  'Canada/Newfoundland': 'CA',
  'Asia/Jakarta': 'ID',
  'Asia/Pontianak': 'ID',
  'Asia/Makassar': 'ID',
  'Asia/Ujung_Pandang': 'ID',
  'Asia/Jayapura': 'ID',
  'Asia/Karachi': 'PK',
  'Asia/Kolkata': 'IN',
  'Asia/Calcutta': 'IN',
  'Asia/Dhaka': 'BD',
  'Asia/Dacca': 'BD',
  'Asia/Kabul': 'AF',
  'Asia/Kuala_Lumpur': 'MY',
  'Asia/Kuching': 'MY',
  'Asia/Singapore': 'SG',
  'Singapore': 'SG',
  'Asia/Dubai': 'AE',
  'Asia/Qatar': 'QA',
  'Asia/Kuwait': 'KW',
  'Asia/Amman': 'JO',
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

/** What «تلقائي حسب البلد» gives for a place: the method, the Asr the table prints, and its precaution minutes. */
export const autoRule = (place: Where): CountryRule => COUNTRY_RULES[placeCountry(place) ?? ''] ?? AUTO_FALLBACK

/** The method «تلقائي حسب البلد» gives for a place. */
export const autoMethod = (place: Where): Method => autoRule(place).method

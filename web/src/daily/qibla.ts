// The qibla (reply 0031-add10, §3): the bearing from true north by adhan's Qibla, and the phone's heading.
//   iOS: DeviceOrientationEvent.requestPermission() on the user's tap only, then webkitCompassHeading, which is from
//        MAGNETIC north: corrected by the declination of the World Magnetic Model 2025 (magvar 2.2.0, MIT).
//   Android: deviceorientationabsolute, heading = 360 − alpha (true north).
//   No sensor (desktop): the number and the sentence «اتجه X° من الشمال».
import { Coordinates, Qibla } from 'adhan'
import { magvar } from 'magvar'
import type { LatLng } from './prayer'

export const qiblaBearing = (at: LatLng) => Qibla(new Coordinates(at.lat, at.lng))

export const norm360 = (x: number) => ((x % 360) + 360) % 360

/** Declination in degrees (east positive) at a place and time; WMM2025 is valid 2025.0–2030.0. */
export const declination = (at: LatLng, when: Date | number = new Date()) => magvar(at.lat, at.lng, 0, when)

/** True heading from an iOS compass reading (magnetic): true = magnetic + declination. */
export const trueFromIosHeading = (webkitCompassHeading: number, at: LatLng, when?: Date) => norm360(webkitCompassHeading + declination(at, when))

/** True heading from Android's absolute orientation alpha (counter-clockwise from north). */
export const trueFromAndroidAlpha = (alpha: number) => norm360(360 - alpha)

/** How far to turn the phone (clockwise, −180…180) so it faces the qibla. */
export function turnBy(heading: number, bearing: number): number {
  const d = norm360(bearing - heading)
  return d > 180 ? d - 360 : d
}

/** iOS asks for permission, and only from a user gesture; elsewhere there is nothing to ask. */
export async function askCompassPermission(): Promise<'granted' | 'denied' | 'not_needed'> {
  const D = (globalThis as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent
  if (!D?.requestPermission) return 'not_needed'
  try {
    return (await D.requestPermission()) === 'granted' ? 'granted' : 'denied'
  } catch {
    return 'denied'
  }
}

/** The heading from the app's own reading (iOS CLLocationManager, web/src/native/heading.ts; reply 0043 د): the true
 *  heading when iOS gives one (≥ 0, location allowed and running), else the magnetic heading corrected by WMM2025. */
export const headingFromNative = (r: { trueHeading: number; magneticHeading: number }, at: LatLng, when?: Date) =>
  r.trueHeading >= 0 ? norm360(r.trueHeading) : trueFromIosHeading(r.magneticHeading, at, when)

/** A weak calibration: iOS reports a negative accuracy when the heading is not valid, or an error in degrees. */
export const weakCalibration = (accuracy: number | null | undefined) => accuracy != null && (accuracy < 0 || accuracy > 20)

/** Circular smoothing: a step toward the new reading along the shorter arc, so 359° then 1° moves by 2°, never 358°. */
export function smoothHeading(prev: number | null, next: number, k = 0.3): number {
  if (prev == null) return norm360(next)
  return norm360(prev + k * turnBy(prev, next))
}

// The qibla (reply 0043 د): the bearing to the Kaaba by the great circle, within ±0.3° of the coordinator's table; the
// phone's heading from the device in the iOS app (true when iOS gives one, else magnetic + WMM2025), circular smoothing
// and the weak-calibration rule; the native plugin reads the heading without asking any permission.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { declination, headingFromNative, qiblaBearing, smoothHeading, weakCalibration } from '../../web/src/daily/qibla'

const WEB = path.resolve(import.meta.dirname, '../../web')
const read = (p: string) => fs.readFileSync(path.join(WEB, p), 'utf8')

describe('the bearing to the Kaaba (21.4224779, 39.8262136)', () => {
  // City points: GeoNames/Wikipedia centres. Jeddah is about 65 km from the Kaaba, so its bearing moves with the point
  // chosen (about 90° to 106° across the city); 21.5433, 39.1728 is the point the table was computed for.
  const CITIES: [string, number, number, number][] = [
    ['Riyadh', 24.7136, 46.6753, 243.8],
    ['Jeddah', 21.5433, 39.1728, 101.1],
    ['Madinah', 24.4686, 39.6142, 176.2],
    ['Dammam', 26.4207, 50.0888, 244.1],
    ['Dubai', 25.2048, 55.2708, 258.2],
    ['Cairo', 30.0444, 31.2357, 136.1],
    ['London', 51.5074, -0.1278, 119.0],
    ['New York', 40.7128, -74.006, 58.5],
    ['Jakarta', -6.2088, 106.8456, 295.2],
  ]
  it.each(CITIES)('%s: %f, %f → %f° (±0.3°)', (_name, lat, lng, expected) => {
    expect(Math.abs(qiblaBearing({ lat, lng }) - expected)).toBeLessThanOrEqual(0.3)
  })
})

describe('the phone\'s heading', () => {
  const riyadh = { lat: 24.7136, lng: 46.6753 }
  const when = new Date('2026-10-13T12:00:00Z')
  it('the device\'s true heading when iOS gives one; else magnetic + the WMM2025 declination', () => {
    expect(headingFromNative({ trueHeading: 243.5, magneticHeading: 240.0 }, riyadh, when)).toBeCloseTo(243.5, 6)
    const d = declination(riyadh, when)
    expect(Math.abs(d)).toBeLessThan(10)
    expect(headingFromNative({ trueHeading: -1, magneticHeading: 240.0 }, riyadh, when)).toBeCloseTo((240 + d + 360) % 360, 6)
  })
  it('smoothing goes the short way round: 359° then 1° moves 2°, never 358°', () => {
    const a = smoothHeading(null, 359)
    const b = smoothHeading(a, 1, 0.5)
    expect(b === 0 || Math.abs(b - 360) < 1e-9 || b < 1).toBe(true)
    expect(smoothHeading(10, 350, 0.5)).toBeCloseTo(0, 6)
    expect(smoothHeading(90, 100, 0.3)).toBeCloseTo(93, 6)
  })
  it('weak calibration: a negative accuracy or more than 20°', () => {
    expect(weakCalibration(-1)).toBe(true)
    expect(weakCalibration(25)).toBe(true)
    expect(weakCalibration(20)).toBe(false)
    expect(weakCalibration(5)).toBe(false)
    expect(weakCalibration(null)).toBe(false)
  })
})

describe('the iOS plugin (QiblaHeadingPlugin.swift)', () => {
  const swift = read('ios/App/App/QiblaHeadingPlugin.swift')
  it('reads CLHeading on the device, portrait, and never asks for a permission', () => {
    expect(swift).toContain('m.startUpdatingHeading()')
    expect(swift).toContain('m.headingOrientation = .portrait')
    expect(swift).toMatch(/"trueHeading": newHeading\.trueHeading/)
    expect(swift).toMatch(/"accuracy": newHeading\.headingAccuracy/)
    expect(swift).not.toMatch(/request(WhenInUse|Always)Authorization/)
    // Location runs only when the user has already allowed it (for trueHeading).
    expect(swift).toMatch(/if status == \.authorizedWhenInUse \|\| status == \.authorizedAlways/)
  })
  it('is registered by the app and in the Xcode project; the web side calls it QiblaHeading', () => {
    expect(read('ios/App/App/AppViewController.swift')).toContain('bridge?.registerPluginInstance(QiblaHeadingPlugin())')
    expect(read('ios/App/App.xcodeproj/project.pbxproj')).toMatch(/QiblaHeadingPlugin\.swift in Sources \*\/,/)
    expect(swift).toContain('public let jsName = "QiblaHeading"')
    expect(read('src/native/heading.ts')).toContain("registerPlugin<Plugin>('QiblaHeading')")
    // The app uses it; the web keeps the browser's events.
    const screen = read('src/v2/daily/Qibla.tsx')
    expect(screen).toContain("await import('../../native/heading')")
    expect(screen).toMatch(/if \(isNative\(\)\)/)
  })
})

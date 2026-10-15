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
    // The iPhone app uses it; the web keeps the browser's events, and so does the Android app (reply 0066: the plugin is
    // iOS code, and the web view gives Android's absolute compass event).
    const screen = read('src/v2/daily/Qibla.tsx')
    expect(screen).toContain("await import('../../native/heading')")
    expect(screen).toMatch(/if \(isNative\(\) && !isAndroid\(\)\)/)
  })
})

describe('the «سماء» compass (0043-add6)', () => {
  const view = read('src/v2/daily/Qibla.tsx')
  const css = read('src/v2/daily/today.css')

  it('the board\'s drawing with its values; the old compass is gone', () => {
    expect(view).toContain('viewBox="-14 0 348 356"')
    expect(view).toContain('const C = 160')
    expect(view).toContain('<g transform="translate(0 20)">')
    expect(view).not.toContain('viewBox="0 0 300 300"')
    expect(view).toContain('baseFrequency="0.045" numOctaves={3} seed={4}')
    expect(view.match(/<feTurbulence/g)).toHaveLength(1)
  })

  it('a reading changes transforms only: the fixed art and the filter are memoised', () => {
    for (const part of ['Defs', 'Back', 'DialArt', 'KaabaArt', 'Medallion', 'PointerArt']) expect(view).toContain(`const ${part} = memo(function ${part}(`)
    expect(view).toContain('<g transform={`rotate(${f2(-heading)} ${C} ${C})`}>')
    expect(view).toContain('<g transform={`rotate(${f2(needle)} ${C} ${C})`}>')
    expect(view).toContain('<g transform={`translate(${f2(kx)} ${f2(ky)}) rotate(${f2(heading)})`}>')
  })

  it('facing: the glow fades in 200 ms (none with reduced motion) and one light tap, re-armed past 8°', () => {
    expect(view).toContain("const aligned = sensor === 'on' && turn != null && Math.abs(turn) < 5")
    expect(view).toContain('} else if (Math.abs(turn) > 8) armed.current = true')
    expect(read('src/native/haptics.ts')).toContain('export const tapLight = () => buzz(10)')
    expect(css).toMatch(/\.dt-compass-halo \{\s*opacity: 0;\s*transition: opacity 200ms ease-out;/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.dt-compass-mark,\s*\.dt-compass-halo \{\s*transition: none;/)
  })

  it('«من الشمال» in ten languages, in a colour that passes AA on the paper disc', async () => {
    const { TODAY } = await import('../../web/src/v2/daily/strings-today')
    for (const [lang, s] of Object.entries(TODAY)) expect(s.fromNorthShort, lang).toBeTruthy()
    expect([TODAY.ar.fromNorthShort, TODAY.en.fromNorthShort]).toEqual(['من الشمال', 'from north'])
    expect(view).toContain('fill="#6b5a45"')
  })
})

describe('reply 0045 أ: the qibla hint line is gone', () => {
  it('no «إذا صار السهم على الكعبة» on the screen or in the ten languages; «ضع الجوال مسطحًا» and the calibration stay', async () => {
    const { TODAY } = await import('../../web/src/v2/daily/strings-today')
    const view = read('src/v2/daily/Qibla.tsx')
    expect(view).not.toContain('qiblaHint')
    for (const [lang, s] of Object.entries(TODAY)) expect((s as Record<string, unknown>).qiblaHint, lang).toBeUndefined()
    expect(view).toContain('{s.holdFlat}')
    expect(view).toContain('{s.calibrate}')
  })
})

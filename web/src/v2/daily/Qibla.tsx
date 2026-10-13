// Qibla (reply 0032 D-3; boards Qibla, QiblaN), from the engine of reply 0031-add10 (web/src/daily/qibla.ts):
// the bearing from true north by adhan; the compass only after the user's tap:
//   the iOS app: the device's own heading (CLLocationManager, web/src/native/heading.ts; reply 0043 د): the true
//     heading when iOS gives one, else the magnetic one + the WMM2025 declination; no motion permission is asked;
//   a browser on iOS: webkitCompassHeading, which WebKit reads from CLHeading.magneticHeading (WebCoreMotionManager.mm),
//     + the WMM2025 declination, after the permission; Android: deviceorientationabsolute, 360 − alpha.
// Every reading is smoothed along the circle (no jump between 359° and 0°); the phone's own heading is shown in
// degrees, with «hold the phone flat» and, when iOS reports a weak calibration, how to calibrate.
// Without a sensor (no reading within two seconds): the degrees and «اتجه X° من الشمال». Nothing leaves the phone.
// Reply 0043-add6: the «سماء» compass below; facing the qibla (|turn| < 5°) glows, with one light tap on entering it
// (@capacitor/haptics in the app), not again until the phone has turned more than 8° away and come back.
import { memo, useEffect, useId, useRef, useState } from 'react'
import { askCompassPermission, headingFromNative, norm360, qiblaBearing, smoothHeading, trueFromAndroidAlpha, trueFromIosHeading, turnBy, weakCalibration } from '../../daily/qibla'
import { tapLight } from '../../native/haptics'
import { isNative } from '../../native/platform'
import { useI18n } from '../../i18n'
import { fill, num } from './format'
import { IcPin } from './icons'
import { PlaceSheet, usePlace, usePlaceName } from './place'
import { Privacy, Screen } from './Screen'
import { TODAY } from './strings-today'

type Sensor = 'idle' | 'on' | 'denied' | 'none'

export function Qibla() {
  const { lang } = useI18n()
  const s = TODAY[lang]
  const [place, setPlace] = usePlace()
  const placeName = usePlaceName(place)
  const [sheet, setSheet] = useState(false)
  const [heading, setHeading] = useState<number | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [sensor, setSensor] = useState<Sensor>('idle')
  const stop = useRef<(() => void) | null>(null)
  useEffect(() => () => stop.current?.(), [])
  // The readings use the place chosen now, not the one when the compass started (its declination), so the glow and
  // the tap stay right when the place changes while the compass runs.
  const placeRef = useRef(place)
  useEffect(() => {
    placeRef.current = place
  }, [place])

  const bearing = place ? qiblaBearing(place) : null

  const start = async () => {
    if (!place) return
    const take = (h: number) => setHeading((prev) => smoothHeading(prev, h))
    if (isNative()) {
      // The app: the device's own heading, with no permission to ask (reply 0043 د).
      const { startNativeHeading } = await import('../../native/heading')
      const off = await startNativeHeading((r) => {
        take(headingFromNative(r, placeRef.current ?? place))
        setAccuracy(r.accuracy)
      }).catch(() => null)
      if (!off) return setSensor('none')
      stop.current = off
      return setSensor('on')
    }
    const perm = await askCompassPermission()
    if (perm === 'denied') return setSensor('denied')
    let got = false
    const onAbs = (e: DeviceOrientationEvent) => {
      if (e.alpha == null) return
      got = true
      take(trueFromAndroidAlpha(e.alpha))
    }
    const onRel = (e: DeviceOrientationEvent) => {
      const ev = e as DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number }
      const h = ev.webkitCompassHeading
      if (h == null || Number.isNaN(h)) return
      got = true
      take(trueFromIosHeading(h, placeRef.current ?? place))
      if (ev.webkitCompassAccuracy != null) setAccuracy(ev.webkitCompassAccuracy)
    }
    window.addEventListener('deviceorientationabsolute' as 'deviceorientation', onAbs)
    window.addEventListener('deviceorientation', onRel)
    stop.current = () => {
      window.removeEventListener('deviceorientationabsolute' as 'deviceorientation', onAbs)
      window.removeEventListener('deviceorientation', onRel)
    }
    setSensor('on')
    setTimeout(() => {
      if (!got) {
        stop.current?.()
        setSensor('none')
      }
    }, 2000)
  }

  const deg = bearing == null ? '' : num(Math.round(bearing), lang)
  const turn = heading != null && bearing != null ? turnBy(heading, bearing) : null
  const advice = turn == null ? null : Math.abs(turn) < 5 ? s.facing : turn > 0 ? s.turnRight : s.turnLeft
  const aligned = sensor === 'on' && turn != null && Math.abs(turn) < 5
  // One tap on entering the qibla; armed again only after more than 8° away.
  const armed = useRef(true)
  useEffect(() => {
    if (sensor !== 'on' || turn == null) return
    if (Math.abs(turn) < 5 && armed.current) {
      armed.current = false
      tapLight()
    } else if (Math.abs(turn) > 8) armed.current = true
  }, [sensor, turn])

  return (
    <Screen title={s.qiblaTitle}>
      <section className="dt-card dt-pad dt-qibla">
        <div className="dt-placerow dt-placerow-in">
          <button type="button" className="dt-place-btn" onClick={() => setSheet(true)} aria-label={fill(s.changePlace, { place: placeName ?? s.placeTitle })}>
            <IcPin />
            {place ? (
              <>
                {placeName ?? s.placeTitle}
                {place.source === 'gps' && <span className="dt-muted"> · {s.auto}</span>}
              </>
            ) : (
              s.placeTitle
            )}
          </button>
          {bearing != null && <span className="dt-date">{fill(s.fromNorth, { d: deg })}</span>}
        </div>
        {bearing == null ? (
          <>
            <p className="dt-lead">{s.placeTitle}</p>
            <button type="button" className="dt-btn dt-btn-primary" onClick={() => setSheet(true)}>
              <IcPin />
              {s.useMyLocation}
            </button>
          </>
        ) : (
          <>
            <Compass bearing={bearing} heading={heading ?? 0} aligned={aligned} />
            {sensor === 'on' && advice ? (
              <>
                <p className={`dt-qibla-advice ${aligned ? 'dt-qibla-facing' : 'dt-qibla-turn'}`} aria-live="polite">
                  {advice}
                </p>
                <p className="dt-qibla-heading">{fill(s.headingNow, { d: num(Math.round(heading ?? 0) % 360, lang) })}</p>
                {weakCalibration(accuracy) && (
                  <p className="dt-qibla-hint dt-qibla-calibrate" role="status">
                    {s.calibrate}
                  </p>
                )}
                <p className="dt-qibla-hint">{s.holdFlat}</p>
                <p className="dt-qibla-hint">{s.qiblaHint}</p>
              </>
            ) : (
              <>
                <p className="dt-qibla-advice">{fill(s.noSensor, { d: deg })}</p>
                {sensor === 'denied' && <p className="dt-qibla-hint">{s.compassDenied}</p>}
                {(sensor === 'idle' || sensor === 'denied') && (
                  <button type="button" className="dt-btn dt-btn-primary" onClick={start}>
                    {s.startCompass}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </section>
      <section className="dt-card dt-pad">
        <h2 className="dt-h2">{s.accuracyTitle}</h2>
        <p className="dt-body">{s.accuracy}</p>
      </section>
      <Privacy>{s.privacyQibla}</Privacy>
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

/* ---------- The «سماء» compass (reply 0043-add6; approved by Talal 13 October with its tap) ----------
 * Moved from compassSVG in out/design-v2/qibla/qibla-compass-ref.js with its values: viewBox −14 0 348 356, centre
 * (160, 160), the art lowered 20. What turns with the phone (rotate(−heading)): the bezel's stars and dots, the letters,
 * the degree ticks, the sky's stars and the Kaaba, which stays upright. What stays: the sky and its grain, the medallion
 * with its rays and flowers, the paper disc and the top mark. The gold pointer turns by bearing − heading. The fixed art
 * and the grain filter are drawn once (memo): a new reading changes the transforms only (the dial, the pointer, and the
 * Kaaba's counter-turn that keeps it upright). When the phone faces the qibla, a gold glow fades in (200 ms; none with
 * reduced motion) on the pointer and the top mark. One change from the board: «من الشمال» is #6b5a45, not #7d6d55,
 * whose contrast on the paper disc is 3.6–4.3:1, under AA (CLAUDE.md §8); #6b5a45 gives 4.7–5.7:1. */
const C = 160
const rad = (d: number) => (d * Math.PI) / 180
const pol = (r: number, a: number): [number, number] => [C + r * Math.sin(rad(a)), C - r * Math.cos(rad(a))]
const f2 = (n: number) => n.toFixed(2)

/** The sky's star: eight thin rays round a dot, long at 0/90/180/270 and shorter between. */
function Star({ x, y, r, rot = 0, fill }: { x: number; y: number; r: number; rot?: number; fill: string }) {
  const pts = Array.from({ length: 16 }, (_, k) => {
    const a = rot + k * 22.5
    const rr = k % 2 ? r * 0.14 : (k / 2) % 2 ? r * 0.7 : r
    return `${f2(x + rr * Math.sin(rad(a)))},${f2(y - rr * Math.cos(rad(a)))}`
  }).join(' ')
  return (
    <>
      <polygon points={pts} fill={fill} />
      <circle cx={f2(x)} cy={f2(y)} r={f2(r * 0.2)} fill={fill} />
    </>
  )
}

/** A five-petal flower like the medallion's ring. */
function Flower({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <>
      {Array.from({ length: 5 }, (_, k) => (
        <circle key={k} cx={f2(x + r * 0.55 * Math.sin(rad(k * 72)))} cy={f2(y - r * 0.55 * Math.cos(rad(k * 72)))} r={f2(r * 0.48)} fill="#f3ead6" />
      ))}
      <circle cx={f2(x)} cy={f2(y)} r={f2(r * 0.3)} fill="#c99a3e" />
    </>
  )
}

const SKY: [number, number, number][] = [[18, 104, 4.2], [47, 97, 3.0], [71, 108, 3.6], [103, 99, 2.6], [128, 106, 4.0], [152, 97, 3.0], [196, 102, 3.4], [221, 108, 2.8], [248, 98, 4.2], [283, 104, 3.0], [307, 109, 3.4], [337, 98, 2.6], [33, 82, 2.2], [88, 84, 2.4], [141, 84, 2.0], [177, 86, 2.6], [233, 83, 2.2], [266, 86, 2.4], [322, 84, 2.0]]
const POINTER = `M${C} ${C - 47} C${C + 6} ${C - 55} ${C + 6.5} ${C - 64} ${C + 2.4} ${C - 70} L${C + 2} ${C - 76} L${C + 8} ${C - 79} L${C} ${C - 89} L${C - 8} ${C - 79} L${C - 2} ${C - 76} L${C - 2.4} ${C - 70} C${C - 6.5} ${C - 64} ${C - 6} ${C - 55} ${C} ${C - 47} Z`
const MARK = `M${C} ${C - 158 - 2} l-8 -13 h16 Z`

const Defs = memo(function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}gold`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f0d58f" />
        <stop offset="0.45" stopColor="#c9a04e" />
        <stop offset="0.7" stopColor="#a77f33" />
        <stop offset="1" stopColor="#e2c27c" />
      </linearGradient>
      <radialGradient id={`${id}sky`} cx="0.5" cy="0.45" r="0.6">
        <stop offset="0" stopColor="#1f4a96" />
        <stop offset="0.7" stopColor="#163a7c" />
        <stop offset="1" stopColor="#0f2a5e" />
      </radialGradient>
      <radialGradient id={`${id}paper`} cx="0.45" cy="0.4" r="0.7">
        <stop offset="0" stopColor="#f6eedb" />
        <stop offset="1" stopColor="#e6d9b9" />
      </radialGradient>
      <filter id={`${id}grain`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves={3} seed={4} result="n" />
        <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.42  0 0 0 0 0.58  0 0 0 0 0.95  0 0 0 0.55 -0.2" result="c" />
        <feComposite in="c" in2="SourceGraphic" operator="in" />
      </filter>
      {/* The board's glow is the blur merged under the shape: here the blur alone, on a copy that fades in. */}
      <filter id={`${id}glow`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.6" />
      </filter>
      <filter id={`${id}shadow`} x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0b1a3a" floodOpacity="0.28" />
      </filter>
    </defs>
  )
})

/** Bezel, lapis band and the sky with its grain: under the dial, fixed. */
const Back = memo(function Back({ id }: { id: string }) {
  const gold = `url(#${id}gold)`
  return (
    <>
      <g filter={`url(#${id}shadow)`}>
        <circle cx={C} cy={C} r="157" fill={gold} />
      </g>
      <circle cx={C} cy={C} r="156.4" fill="none" stroke="#5a4214" strokeWidth="0.8" />
      <circle cx={C} cy={C} r="153" fill="#13306b" />
      <circle cx={C} cy={C} r="153" fill="none" stroke="#5a4214" strokeWidth="0.7" />
      <circle cx={C} cy={C} r="130" fill={gold} />
      <circle cx={C} cy={C} r="130" fill="none" stroke="#5a4214" strokeWidth="0.7" />
      <circle cx={C} cy={C} r="127" fill={`url(#${id}sky)`} />
      <circle cx={C} cy={C} r="127" fill="#fff" filter={`url(#${id}grain)`} opacity="0.5" />
      <circle cx={C} cy={C} r="127" fill="none" stroke="#5a4214" strokeWidth="0.7" />
      <circle cx={C} cy={C} r="128.6" fill="none" stroke="#5a4214" strokeWidth="0.5" />
    </>
  )
})

/** What turns with the phone, but the Kaaba: bezel stars and dots, the letters, the degree ticks, the sky's stars. */
const DialArt = memo(function DialArt({ id, labels }: { id: string; labels: { n: string; e: string; s: string; w: string } }) {
  const gold = `url(#${id}gold)`
  const band = Array.from({ length: 60 }, (_, i) => i * 6).filter((a) => a % 90 !== 0)
  return (
    <>
      {band.map((a) => {
        const [x, y] = pol(141, a)
        return a % 30 === 0 ? <Star key={a} x={x} y={y} r={6.2} rot={a} fill={gold} /> : <circle key={a} cx={f2(x)} cy={f2(y)} r="1.15" fill="#d9b66c" opacity="0.85" />
      })}
      {(['n', 'e', 's', 'w'] as const).map((k, i) => (
        <g key={k} transform={`rotate(${i * 90} ${C} ${C})`}>
          <text x={C} y={C - 141 + 5.2} textAnchor="middle" fontSize="14.5" fontWeight="700" fill={k === 'n' ? '#f1d391' : '#efe5cf'} fontFamily="IBM Plex Sans Arabic">
            {labels[k]}
          </text>
        </g>
      ))}
      {Array.from({ length: 72 }, (_, i) => i * 5).map((a) => {
        const long = a % 30 === 0
        const [x1, y1] = pol(124, a)
        const [x2, y2] = pol(long ? 115 : 119.5, a)
        return <line key={a} x1={f2(x1)} y1={f2(y1)} x2={f2(x2)} y2={f2(y2)} stroke="#d9b66c" strokeWidth={long ? 1.4 : 0.8} opacity={long ? 0.95 : 0.6} strokeLinecap="round" />
      })}
      {SKY.map(([a, r, sz], i) => {
        const [x, y] = pol(r, a)
        return <Star key={i} x={x} y={y} r={sz * 1.45} rot={(i * 17) % 45} fill="#e2c27c" />
      })}
    </>
  )
})

const KaabaArt = memo(function KaabaArt({ id }: { id: string }) {
  return (
    <>
      <circle r="14.5" fill="#0c1f47" stroke={`url(#${id}gold)`} strokeWidth="1.6" />
      <rect x="-7.5" y="-7.5" width="15" height="15" rx="1.4" fill="#141310" />
      <rect x="-7.5" y="-3.6" width="15" height="2.6" fill="#d8b46a" />
      <rect x="1.2" y="1.4" width="3.2" height="4.6" fill="#d8b46a" opacity="0.9" />
    </>
  )
})

/** The medallion, fixed: rays, the scalloped gold, the lapis ring with its flowers, the paper disc. */
const Medallion = memo(function Medallion({ id }: { id: string }) {
  const gold = `url(#${id}gold)`
  return (
    <>
      {Array.from({ length: 48 }, (_, k) => {
        const a = k * 7.5
        const long = k % 2 === 0
        const [x1, y1] = pol(50, a)
        const [x2, y2] = pol(long ? 76 : 64, a)
        const [dx, dy] = pol(78.5, a)
        return (
          <g key={k}>
            <line x1={f2(x1)} y1={f2(y1)} x2={f2(x2)} y2={f2(y2)} stroke="#d6b062" strokeWidth={long ? 1.1 : 0.7} opacity={long ? 0.9 : 0.6} />
            {long && k % 4 === 0 && <circle cx={f2(dx)} cy={f2(dy)} r="1.4" fill="#e2c27c" />}
          </g>
        )
      })}
      <circle cx={C} cy={C} r="44" fill={gold} />
      {Array.from({ length: 20 }, (_, k) => {
        const [x, y] = pol(45.5, k * 18)
        return <circle key={k} cx={f2(x)} cy={f2(y)} r="5.2" fill={gold} />
      })}
      <circle cx={C} cy={C} r="41.5" fill="none" stroke="#6f531c" strokeWidth="0.6" />
      <circle cx={C} cy={C} r="40.5" fill="#13306b" />
      {Array.from({ length: 12 }, (_, k) => {
        const [x, y] = pol(36.5, k * 30 + 15)
        return <Flower key={k} x={x} y={y} r={4.2} />
      })}
      <circle cx={C} cy={C} r="31" fill={gold} />
      <circle cx={C} cy={C} r="28.6" fill={`url(#${id}paper)`} stroke="#6f531c" strokeWidth="0.5" />
    </>
  )
})

const PointerArt = memo(function PointerArt({ id }: { id: string }) {
  return (
    <>
      <path d={POINTER} fill={`url(#${id}gold)`} stroke="#5a4214" strokeWidth="0.6" />
      <circle cx={C} cy={C - 59} r="2.6" fill="#13306b" stroke="#f1d391" strokeWidth="0.8" />
    </>
  )
})

/** The compass: the dial turns with the phone (−heading), the Kaaba sits on the bearing, the pointer shows the turn
 *  (bearing − heading); the small mark at the top is the phone's direction. */
function Compass({ bearing, heading, aligned }: { bearing: number; heading: number; aligned: boolean }) {
  const { lang } = useI18n()
  const s = TODAY[lang]
  const id = `qc${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const needle = norm360(bearing - heading)
  const [kx, ky] = pol(101, bearing)
  const deg = num(Math.round(bearing), lang)
  return (
    <svg
      className={`dt-compass${aligned ? ' dt-compass-aligned' : ''}`}
      width="348"
      height="356"
      viewBox="-14 0 348 356"
      role="img"
      aria-label={`${s.compassLabel}: ${fill(s.fromNorth, { d: deg })}`}
    >
      <Defs id={id} />
      <g transform="translate(0 20)">
        <path className="dt-compass-halo" d={MARK} fill="#e9c877" filter={`url(#${id}glow)`} />
        <path className="dt-compass-mark" d={MARK} />
        <Back id={id} />
        <g transform={`rotate(${f2(-heading)} ${C} ${C})`}>
          <DialArt id={id} labels={s.compass} />
          <g transform={`translate(${f2(kx)} ${f2(ky)}) rotate(${f2(heading)})`}>
            <KaabaArt id={id} />
          </g>
        </g>
        <Medallion id={id} />
        <g transform={`rotate(${f2(needle)} ${C} ${C})`}>
          <path className="dt-compass-halo" d={POINTER} fill="#e9c877" filter={`url(#${id}glow)`} />
          <PointerArt id={id} />
        </g>
        <text x={C} y={C + 3} textAnchor="middle" fontSize="19" fontWeight="700" fill="#1b3466" fontFamily="IBM Plex Sans Arabic">
          {deg}°
        </text>
        <text x={C} y={C + 17} textAnchor="middle" fontSize="8.6" fontWeight="500" fill="#6b5a45" fontFamily="IBM Plex Sans Arabic">
          {s.fromNorthShort}
        </text>
      </g>
    </svg>
  )
}

// Qibla (reply 0032 D-3; boards Qibla, QiblaN), from the engine of reply 0031-add10 (web/src/daily/qibla.ts):
// the bearing from true north by adhan; the compass only after the user's tap:
//   the iOS app: the device's own heading (CLLocationManager, web/src/native/heading.ts; reply 0043 د): the true
//     heading when iOS gives one, else the magnetic one + the WMM2025 declination; no motion permission is asked;
//   a browser on iOS: webkitCompassHeading, which WebKit reads from CLHeading.magneticHeading (WebCoreMotionManager.mm),
//     + the WMM2025 declination, after the permission; Android: deviceorientationabsolute, 360 − alpha.
// Every reading is smoothed along the circle (no jump between 359° and 0°); the phone's own heading is shown in
// degrees, with «hold the phone flat» and, when iOS reports a weak calibration, how to calibrate.
// Without a sensor (no reading within two seconds): the degrees and «اتجه X° من الشمال». Nothing leaves the phone.
import { useEffect, useRef, useState } from 'react'
import { askCompassPermission, headingFromNative, norm360, qiblaBearing, smoothHeading, trueFromAndroidAlpha, trueFromIosHeading, turnBy, weakCalibration } from '../../daily/qibla'
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

  const bearing = place ? qiblaBearing(place) : null

  const start = async () => {
    if (!place) return
    const take = (h: number) => setHeading((prev) => smoothHeading(prev, h))
    if (isNative()) {
      // The app: the device's own heading, with no permission to ask (reply 0043 د).
      const { startNativeHeading } = await import('../../native/heading')
      const off = await startNativeHeading((r) => {
        take(headingFromNative(r, place))
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
      take(trueFromIosHeading(h, place))
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
            <Compass bearing={bearing} heading={heading ?? 0} />
            {sensor === 'on' && advice ? (
              <>
                <p className="dt-qibla-advice" aria-live="polite">
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

/** The board's compass: the dial turns with the phone (−heading), the Kaaba sits on the bearing, the needle shows the
 *  turn left (bearing − heading); the small mark at the top is the phone's direction. */
function Compass({ bearing, heading }: { bearing: number; heading: number }) {
  const { lang } = useI18n()
  const s = TODAY[lang]
  const ticks = Array.from({ length: 60 }, (_, i) => i * 6)
  const needle = norm360(bearing - heading)
  return (
    <svg className="dt-compass" width="300" height="300" viewBox="0 0 300 300" role="img" aria-label={`${s.compassLabel}: ${fill(s.fromNorth, { d: num(Math.round(bearing), lang) })}`}>
      <circle cx="150" cy="150" r="140" fill="var(--card)" stroke="var(--border)" />
      <g transform={`rotate(${-heading} 150 150)`}>
        <circle cx="150" cy="150" r="132" fill="none" stroke="var(--gold)" strokeWidth="1.2" />
        <circle cx="150" cy="150" r="88" fill="none" stroke="var(--border)" />
        {ticks.map((a) => (
          <line
            key={a}
            x1="150"
            y1="22"
            x2="150"
            y2={a % 30 === 0 ? 32 : 26}
            stroke="var(--gold)"
            strokeWidth={a % 30 === 0 ? 1.6 : 1}
            opacity={a % 30 === 0 ? 1 : 0.6}
            transform={`rotate(${a} 150 150)`}
          />
        ))}
        {(['n', 'e', 's', 'w'] as const).map((k, i) => (
          <text key={k} x="150" y="52" textAnchor="middle" fontSize="17" fontWeight="600" fill={k === 'n' ? 'var(--primary)' : 'var(--muted)'} transform={`rotate(${i * 90} 150 150)`} fontFamily="IBM Plex Sans Arabic">
            {s.compass[k]}
          </text>
        ))}
        <g transform={`rotate(${bearing} 150 150)`}>
          <g transform={`translate(150 22) rotate(${heading - bearing})`}>
            <rect x="-15" y="-15" width="30" height="30" rx="5" fill="#1b1a17" stroke="var(--gold)" strokeWidth="1.6" />
            <rect x="-15" y="-7" width="30" height="4" fill="var(--gold)" />
          </g>
        </g>
      </g>
      <path
        d="M150 116 L158.42 129.67 L174.04 125.96 L170.33 141.58 L184 150 L170.33 158.42 L174.04 174.04 L158.42 170.33 L150 184 L141.58 170.33 L125.96 174.04 L129.67 158.42 L116 150 L129.67 141.58 L125.96 125.96 L141.58 129.67 Z"
        fill="var(--soft-box)"
        stroke="var(--gold)"
        strokeWidth="1.2"
      />
      <g transform={`rotate(${needle} 150 150)`}>
        <path d="M150 52 L159 150 L150 164 L141 150 Z" fill="var(--primary)" />
        <circle cx="150" cy="150" r="6" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
      </g>
      <path d="M150 6 l-7 -10 h14 Z" fill="var(--gold-dark)" />
    </svg>
  )
}

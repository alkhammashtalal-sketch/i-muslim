// The phone's heading in the iOS app (reply 0043 د): the local Capacitor plugin QiblaHeading
// (web/ios/App/App/QiblaHeadingPlugin.swift) reads CLLocationManager on the device. It needs no motion permission (the
// web view's compass event asked one that named «localhost») and gives the true heading when iOS has one. The web keeps
// the browser's compass events (web/src/v2/daily/Qibla.tsx).
import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'

export type NativeHeading = { trueHeading: number; magneticHeading: number; accuracy: number }
type Plugin = {
  start(): Promise<{ available: boolean }>
  stop(): Promise<void>
  addListener(event: 'heading', f: (r: NativeHeading) => void): Promise<PluginListenerHandle>
}
const QiblaHeading = registerPlugin<Plugin>('QiblaHeading')

/** Starts the readings; returns the function that stops them, or null when the device has no compass. */
export async function startNativeHeading(onReading: (r: NativeHeading) => void): Promise<(() => void) | null> {
  const handle = await QiblaHeading.addListener('heading', onReading)
  const { available } = await QiblaHeading.start()
  if (!available) {
    await handle.remove()
    return null
  }
  return () => {
    void handle.remove()
    void QiblaHeading.stop()
  }
}

import Capacitor
import CoreLocation

// The phone's heading for the qibla screen (reply 0043 د), read on the device from CLLocationManager instead of the web
// view's compass event: no motion permission (the web view asked one that named «localhost»), and the true heading when
// iOS gives one. trueHeading is valid only while location updates run, so they run only if the user has ALREADY allowed
// location («استخدم موقعي»); the plugin never asks for it. Otherwise the magnetic heading is sent and the app adds the
// WMM2025 declination (web/src/daily/qibla.ts headingFromNative). The reference is the phone held upright (portrait,
// the app's only orientation). Registered in AppViewController; used by web/src/native/heading.ts.
@objc(QiblaHeadingPlugin)
public class QiblaHeadingPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "QiblaHeadingPlugin"
    public let jsName = "QiblaHeading"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]
    private var manager: CLLocationManager?
    private var locating = false

    @objc func start(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard CLLocationManager.headingAvailable() else {
                call.resolve(["available": false])
                return
            }
            let m = self.manager ?? CLLocationManager()
            m.delegate = self
            m.headingFilter = 1
            m.headingOrientation = .portrait
            self.manager = m
            let status = m.authorizationStatus
            if status == .authorizedWhenInUse || status == .authorizedAlways {
                m.desiredAccuracy = kCLLocationAccuracyKilometer
                m.startUpdatingLocation()
                self.locating = true
            }
            m.startUpdatingHeading()
            call.resolve(["available": true])
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.manager?.stopUpdatingHeading()
            if self.locating {
                self.manager?.stopUpdatingLocation()
                self.locating = false
            }
            call.resolve()
        }
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateHeading newHeading: CLHeading) {
        notifyListeners("heading", data: [
            "trueHeading": newHeading.trueHeading,
            "magneticHeading": newHeading.magneticHeading,
            "accuracy": newHeading.headingAccuracy
        ])
    }

    // The screen says how to calibrate (a weak headingAccuracy); iOS's own overlay is not shown over the app.
    public func locationManagerShouldDisplayHeadingCalibration(_ manager: CLLocationManager) -> Bool {
        return false
    }
}

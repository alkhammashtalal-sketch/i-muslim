import ActivityKit
import Capacitor
import Foundation

// «اعرض العدّ على شاشة القفل» on the times page (add-on 0072-add34 §ب7; web/src/native/prayer-countdown.ts): starts
// and ends «عدّاد الصلاة القادمة», the Live Activity of web/ios/App/Shared/PrayerCountdown.swift, from the times the app
// has just written for its widgets. iOS 16.2 and later (ActivityContent). Registered in AppViewController.
@objc(PrayerCountdownPlugin)
public class PrayerCountdownPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PrayerCountdownPlugin"
    public let jsName = "PrayerCountdown"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
    ]

    @objc func available(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            let now = Date()
            let active = PrayerCountdownRunner.current().contains { $0.activityState == .active && $0.content.state.at > now }
            // Ramadan's countdown on the Lock Screen now: the page says that this one would take its place.
            call.resolve(["supported": true, "enabled": ActivityAuthorizationInfo().areActivitiesEnabled, "active": active,
                          "fasting": LockCountdowns.fastingShown])
        } else {
            call.resolve(["supported": false, "enabled": false, "active": false, "fasting": false])
        }
    }

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["ok": false, "error": "unsupported"])
            return
        }
        Task {
            let (o, n) = await PrayerCountdownRunner.start()
            var r: [String: Any] = ["ok": o == .ok, "error": o == .ok ? "" : o.rawValue]
            if let n = n { r["prayer"] = n.name; r["at"] = n.at; r["text"] = n.text }
            call.resolve(r)
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        Task {
            await PrayerCountdownRunner.end()
            call.resolve()
        }
    }
}

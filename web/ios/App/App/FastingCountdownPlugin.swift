import ActivityKit
import Capacitor
import Foundation

// «اعرض العدّاد على شاشة القفل» on the Ramadan page (add-on 0072-add34 §ب8): starts and ends the iftar or suhoor
// countdown, the Live Activity of web/ios/App/Shared/FastingCountdown.swift. iOS 16.2 and later (ActivityContent); its
// «أوقف» button needs iOS 17. Used by web/src/native/fasting-countdown.ts; registered in AppViewController.
@objc(FastingCountdownPlugin)
public class FastingCountdownPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FastingCountdownPlugin"
    public let jsName = "FastingCountdown"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "active", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "endStale", returnType: CAPPluginReturnPromise),
    ]

    @objc func available(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            call.resolve(["supported": true, "enabled": ActivityAuthorizationInfo().areActivitiesEnabled])
        } else {
            call.resolve(["supported": false, "enabled": false])
        }
    }

    @objc func active(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *), let a = FastingCountdownRunner.current() {
            call.resolve(["active": true, "kind": a.attributes.kind, "target": a.content.state.target.timeIntervalSince1970 * 1000])
        } else {
            call.resolve(["active": false])
        }
    }

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve(["ok": false, "error": "unsupported"])
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve(["ok": false, "error": "disabled"])
            return
        }
        guard let kind = call.getString("kind"), kind == "iftar" || kind == "suhoor",
              let title = call.getString("title"), !title.isEmpty,
              let ms = call.getDouble("target") else {
            call.resolve(["ok": false, "error": "input"])
            return
        }
        let target = Date(timeIntervalSince1970: ms / 1000)
        let left = target.timeIntervalSinceNow
        guard left > 60, left <= FastingCountdownRunner.maxAge else {
            call.resolve(["ok": false, "error": "window"])
            return
        }
        let attrs = FastingCountdownAttributes(kind: kind, title: title, at: call.getString("at") ?? "",
                                               locale: call.getString("locale") ?? "ar@numbers=arab", stop: call.getString("stop") ?? "",
                                               rtl: call.getBool("rtl") ?? true)
        Task {
            do {
                try await FastingCountdownRunner.start(attrs, target: target)
                call.resolve(["ok": true])
            } catch {
                call.resolve(["ok": false, "error": "failed"])
            }
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        Task {
            await FastingCountdownRunner.end()
            call.resolve()
        }
    }

    @objc func endStale(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else {
            call.resolve()
            return
        }
        Task {
            await FastingCountdownRunner.endStale()
            call.resolve()
        }
    }
}

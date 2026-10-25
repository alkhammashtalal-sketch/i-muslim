import ActivityKit
import Capacitor
import Foundation

// «اعرضها على شاشة القفل» on the tasbih page (add-on 0072-add19 §3): starts and ends «جلسة تسبيح بعد الصلاة», the
// Live Activity of web/ios/App/Shared/TasbihSession.swift. iOS 16.2 and later (ActivityContent); its «+١» buttons need
// iOS 17 (App Intents in a Live Activity). Used by web/src/native/tasbih-session.ts; registered in AppViewController.
@objc(TasbihSessionPlugin)
public class TasbihSessionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "TasbihSessionPlugin"
    public let jsName = "TasbihSession"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "active", returnType: CAPPluginReturnPromise),
    ]

    @objc func available(_ call: CAPPluginCall) {
        if #available(iOS 17.0, *) {
            call.resolve(["supported": true, "enabled": ActivityAuthorizationInfo().areActivitiesEnabled])
        } else {
            call.resolve(["supported": false, "enabled": false])
        }
    }

    @objc func active(_ call: CAPPluginCall) {
        if #available(iOS 17.0, *) {
            call.resolve(["active": TasbihSessionRunner.current() != nil])
        } else {
            call.resolve(["active": false])
        }
    }

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 17.0, *) else {
            call.resolve(["ok": false, "error": "unsupported"])
            return
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve(["ok": false, "error": "disabled"])
            return
        }
        let raw = call.getArray("steps", JSObject.self) ?? []
        let steps = raw.compactMap { o -> TasbihSessionAttributes.Step? in
            guard let z = o["zikr"] as? String, !z.isEmpty, let t = (o["target"] as? NSNumber)?.intValue, t > 0 else { return nil }
            return .init(zikr: z, target: t)
        }
        guard !steps.isEmpty, steps.count == raw.count, let title = call.getString("title") else {
            call.resolve(["ok": false, "error": "input"])
            return
        }
        let attrs = TasbihSessionAttributes(title: title, steps: steps, source: call.getString("source") ?? "",
                                            doneText: call.getString("done") ?? "", digits: call.getString("digits") ?? "0123456789",
                                            rtl: call.getBool("rtl") ?? true)
        Task {
            do {
                try await TasbihSessionRunner.start(attrs)
                call.resolve(["ok": true])
            } catch {
                call.resolve(["ok": false, "error": "failed"])
            }
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 17.0, *) else {
            call.resolve()
            return
        }
        Task {
            await TasbihSessionRunner.end()
            call.resolve()
        }
    }
}

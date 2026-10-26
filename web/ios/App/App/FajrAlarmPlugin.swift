import Capacitor
import Foundation
#if canImport(AlarmKit)
import AlarmKit
#endif

// The settings' «منبّه الفجر» (add-on 0072-add34 §ب6; web/src/native/fajr-alarm.ts, FajrAlarmSettings.tsx): iOS 26 and
// later only, off until the user's own tap turns it on, which is also the only moment the system's permission is
// asked. The alarms themselves: FajrAlarm.swift. Registered in AppViewController.
@objc(FajrAlarmPlugin)
public class FajrAlarmPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "FajrAlarmPlugin"
    public let jsName = "FajrAlarm"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "enable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setSound", returnType: CAPPluginReturnPromise),
    ]

    @objc func available(_ call: CAPPluginCall) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            let cfg = FajrAlarmConfig.load()
            let auth = FajrAlarmScheduler.authorization
            call.resolve(["supported": true, "auth": FajrAlarmScheduler.authString(auth),
                          "on": cfg.on && auth == .authorized, "scheduled": auth == .authorized ? FajrAlarmScheduler.ours().count : 0])
            return
        }
        #endif
        call.resolve(["supported": false, "auth": "notDetermined", "on": false, "scheduled": 0])
    }

    /// The user's tap: ask the system (once), then set the days ahead.
    @objc func enable(_ call: CAPPluginCall) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            var cfg = FajrAlarmConfig.load()
            cfg.sound = call.getString("sound")
            if let stop = call.getString("stop"), !stop.isEmpty { cfg.stop = stop }
            let chosen = cfg
            Task {
                var cfg = chosen
                var auth = FajrAlarmScheduler.authorization
                if auth == .notDetermined { auth = await FajrAlarmScheduler.requestAuthorization() }
                guard auth == .authorized else {
                    call.resolve(["ok": false, "error": "denied", "scheduled": 0])
                    return
                }
                cfg.on = true
                FajrAlarmConfig.save(cfg)
                let r = await FajrAlarmScheduler.renew()
                MuslimBackground.schedule()
                if r.scheduled == 0 && r.error == nil && !r.limit {
                    call.resolve(["ok": false, "error": "noData", "scheduled": 0])
                } else {
                    call.resolve(["ok": r.error == nil || r.scheduled > 0, "error": r.error ?? (r.limit ? "limit" : ""), "scheduled": r.scheduled])
                }
            }
            return
        }
        #endif
        call.resolve(["ok": false, "error": "unsupported", "scheduled": 0])
    }

    @objc func disable(_ call: CAPPluginCall) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            var cfg = FajrAlarmConfig.load()
            cfg.on = false
            FajrAlarmConfig.save(cfg)
            Task {
                let r = await FajrAlarmScheduler.renew()
                call.resolve(["scheduled": r.scheduled])
            }
            return
        }
        #endif
        call.resolve(["scheduled": 0])
    }

    /// The sound's choice (a verified file name, or nothing for the system's sound) and the stop button's word.
    @objc func setSound(_ call: CAPPluginCall) {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) {
            var cfg = FajrAlarmConfig.load()
            cfg.sound = call.getString("sound")
            if let stop = call.getString("stop"), !stop.isEmpty { cfg.stop = stop }
            FajrAlarmConfig.save(cfg)
            Task {
                let r = await FajrAlarmScheduler.renew()
                call.resolve(["scheduled": r.scheduled])
            }
            return
        }
        #endif
        call.resolve(["scheduled": 0])
    }
}

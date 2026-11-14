import ActivityKit
import AppIntents
import Foundation
import SwiftUI
#if canImport(AlarmKit)
import AlarmKit
#endif

// «منبّه الفجر» (add-on 0072-add34 §ب6): an alarm at each day's Fajr with AlarmKit, iOS 26 and later, off until the
// user turns it on from the settings (FajrAlarmPlugin.swift, web/src/native/FajrAlarmSettings.tsx).
//   - Apple, WWDC25 «Wake up to the AlarmKit API» (developer.apple.com/videos/play/wwdc2025/230/): «When it fires, the
//     alert breaks through the silent mode and the current focus.»
//   - The authorization is the user's: asked from the tap that turns it on (AlarmManager.requestAuthorization), with
//     NSAlarmKitUsageDescription in the ten languages (InfoPlist.strings). «If the NSAlarmKitUsageDescription key is
//     missing or its value is an empty string, apps can't schedule alarms with AlarmKit.»
//   - Fajr moves every day, so each day has its own one-time alarm (Alarm.Schedule.fixed: «a single future date …
//     absolute and does not change when device timezone changes»; the app plans again when the place changes). The
//     times are the app's own, from widgets.json (60 days ahead; PrayerPlan.swift). The alarms are renewed on every
//     open, whenever the app writes its widgets' data, in a background refresh, and each time the alarm is stopped
//     (its stopIntent runs in the app's process).
//   - The sound: the system's alarm sound, or «الأذان مرة»: the short Fajr adhan the alerts use (alert-sounds.ts),
//     once it is on the phone, verified, in Library/Sounds («the name of the sound file, which should be either in your
//     app's main bundle or Library/Sounds folder of your app's data container», WWDC25), named with its extension.
//     It plays once: a sound file under 30 seconds does not repeat (developer forums 807752, November 2025).
//   - No countdown, no snooze: so no Live Activity of AlarmKit is needed in the widget extension («AlarmKit expects a
//     widget extension if an app supports a countdown presentation»).
// Before iOS 26 nothing here runs: the Fajr bell (a notification) is what the phone has.

enum FajrAlarmConfig {
    /// The user's choice, on the phone only (UserDefaults of the app).
    struct Saved: Codable, Equatable {
        var on: Bool
        /// A verified file in Library/Sounds (muslim-adhan-fajr-short-<hash>.caf), or nil for the system's sound.
        var sound: String?
        /// «إيقاف», for iOS 26.0's stop button (26.1 draws its own «slide to stop»).
        var stop: String
    }

    static let key = "muslim.fajrAlarm.v1"
    /// How many days ahead are set at once: a renewal comes at least daily while the alarm is used (its stop), and the
    /// app's data holds 60 days. See PrayerPlan.fajrSlots and relay/w1/0072-alarm/README.md for the limit found.
    static let days = 14

    static func load() -> Saved {
        guard let d = UserDefaults.standard.data(forKey: key), let s = try? JSONDecoder().decode(Saved.self, from: d) else {
            return Saved(on: false, sound: nil, stop: "إيقاف")
        }
        return s
    }

    static func save(_ s: Saved) {
        if let d = try? JSONEncoder().encode(s) { UserDefaults.standard.set(d, forKey: key) }
    }

    /// What the set alarms were made with: a change of sound, words or language makes them again.
    static let signatureKey = "muslim.fajrAlarm.signature"
}

#if canImport(AlarmKit)
@available(iOS 26.0, *)
struct FajrAlarmMetadata: AlarmMetadata {}

@available(iOS 26.0, *)
enum FajrAlarmScheduler {
    struct Result { var scheduled: Int; var limit: Bool; var error: String? }

    static var authorization: AlarmManager.AuthorizationState { AlarmManager.shared.authorizationState }

    static func authString(_ s: AlarmManager.AuthorizationState) -> String {
        switch s {
        case .authorized: return "authorized"
        case .denied: return "denied"
        default: return "notDetermined"
        }
    }

    /// The system's prompt with NSAlarmKitUsageDescription, if the user has not answered it yet.
    static func requestAuthorization() async -> AlarmManager.AuthorizationState {
        (try? await AlarmManager.shared.requestAuthorization()) ?? AlarmManager.shared.authorizationState
    }

    static func ours() -> [Alarm] { ((try? AlarmManager.shared.alarms) ?? []).filter { PrayerPlan.isOurs($0.id) } }

    /// The chosen file is in Library/Sounds now (a new edition of the short adhan deletes the old one).
    static func soundPresent(_ cfg: FajrAlarmConfig.Saved) -> Bool {
        guard let name = cfg.sound, !name.isEmpty, !name.contains("/"),
              let lib = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first
        else { return false }
        return FileManager.default.fileExists(atPath: lib.appendingPathComponent("Sounds").appendingPathComponent(name).path)
    }

    /// The alarm's sound: the verified file when it is there, otherwise the system's alarm sound.
    static func sound(_ cfg: FajrAlarmConfig.Saved) -> AlertConfiguration.AlertSound {
        guard soundPresent(cfg), let name = cfg.sound else { return .default }
        return .named(name)
    }

    static func configuration(_ slot: PrayerPlan.Slot, title: String, cfg: FajrAlarmConfig.Saved) -> AlarmManager.AlarmConfiguration<FajrAlarmMetadata> {
        let alert: AlarmPresentation.Alert
        if #available(iOS 26.1, *) {
            alert = AlarmPresentation.Alert(title: LocalizedStringResource(stringLiteral: title))
        } else {
            alert = AlarmPresentation.Alert(title: LocalizedStringResource(stringLiteral: title),
                                            stopButton: AlarmButton(text: LocalizedStringResource(stringLiteral: cfg.stop), textColor: .white, systemImageName: "stop.circle"))
        }
        let attrs = AlarmAttributes<FajrAlarmMetadata>(presentation: AlarmPresentation(alert: alert), metadata: FajrAlarmMetadata(),
                                                       tintColor: Color(red: 0.118, green: 0.227, blue: 0.420))
        return .alarm(schedule: .fixed(Date(timeIntervalSince1970: slot.at / 1000)), attributes: attrs,
                      stopIntent: FajrAlarmStoppedIntent(), secondaryIntent: nil, sound: sound(cfg))
    }

    /// Put the system's alarms in line with the choice and the app's times: nothing when it is off or not allowed;
    /// otherwise the next `FajrAlarmConfig.days` Fajrs. Alarms already right are kept; AlarmKit's own limit
    /// (AlarmManager.AlarmError.maximumLimitReached) stops the adding and is reported.
    /// One renewal at a time (the open, the widgets' data and the stop can come together): each waits for the one before.
    @MainActor private static var tail: Task<Result, Never>?

    @MainActor @discardableResult
    static func renew(now: Date = Date()) async -> Result {
        let before = tail
        let mine = Task { () -> Result in
            _ = await before?.value
            return await renewNow(now: now)
        }
        tail = mine
        return await mine.value
    }

    private static func renewNow(now: Date) async -> Result {
        let cfg = FajrAlarmConfig.load()
        // Never turned on here: AlarmKit is not touched at all (no list, no prompt), the phone as before the alarm.
        guard cfg.on || UserDefaults.standard.string(forKey: FajrAlarmConfig.signatureKey) != nil else {
            return Result(scheduled: 0, limit: false, error: nil)
        }
        let file = PrayerPlan.load()
        let allowed = authorization == .authorized
        // On, allowed, but the times cannot be read now: the alarms set stay as they are (never all cancelled for that).
        if cfg.on && allowed && file == nil { return Result(scheduled: ours().count, limit: false, error: nil) }
        let nowMs = now.timeIntervalSince1970 * 1000
        let wanted = cfg.on && allowed ? PrayerPlan.fajrSlots(file, now: nowMs, max: FajrAlarmConfig.days) : []
        let title = file?.days.lazy.compactMap { $0.times.first(where: { $0.key == "fajr" })?.name }.first ?? "الفجر"
        // The file's presence is part of it: once the chosen file is gone, the alarms are made again with the sound
        // that will really play, and again when a new file is chosen.
        let signature = PrayerPlan.alarmSignature(sound: cfg.sound, soundPresent: soundPresent(cfg), stop: cfg.stop, title: title)
        let same = UserDefaults.standard.string(forKey: FajrAlarmConfig.signatureKey) == signature
        let existing = ours().map { a -> PrayerPlan.Existing in
            var fixed: Double?
            if case .fixed(let d)? = a.schedule { fixed = d.timeIntervalSince1970 * 1000 }
            return PrayerPlan.Existing(id: a.id, at: same ? fixed : nil,
                                       due: PrayerPlan.isDue(fixed: fixed, alerting: a.state == .alerting, now: nowMs))
        }
        // The one ringing or about to ring is never cancelled while the alarm is on (PrayerPlan.isDue).
        let diff = PrayerPlan.reconcile(existing: existing, wanted: wanted, keepDue: cfg.on && allowed)
        for id in diff.cancel { try? AlarmManager.shared.cancel(id: id) }
        var scheduled = existing.count - diff.cancel.count
        var limit = false
        var failure: String?
        for slot in diff.add {
            guard let id = PrayerPlan.alarmID(day: slot.day) else { continue }
            do {
                _ = try await AlarmManager.shared.schedule(id: id, configuration: configuration(slot, title: title, cfg: cfg))
                scheduled += 1
            } catch AlarmManager.AlarmError.maximumLimitReached {
                limit = true
                break
            } catch {
                failure = "failed"
                break
            }
        }
        UserDefaults.standard.set(signature, forKey: FajrAlarmConfig.signatureKey)
        return Result(scheduled: scheduled, limit: limit, error: failure)
    }
}

/// Runs when the alarm is stopped, in the app's process, the app not opened: the next days are set again.
@available(iOS 26.0, *)
struct FajrAlarmStoppedIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = LocalizedStringResource("alarm.stopped.title", table: "Countdown")
    static let isDiscoverable: Bool = false
    static let openAppWhenRun: Bool = false

    init() {}

    func perform() async throws -> some IntentResult {
        await FajrAlarmScheduler.renew()
        return .result()
    }
}

#if DEBUG
/// The limit's test (relay/w1/0072-alarm/README.md): in a Debug build on the simulator, with MUSLIM_ALARM_PROBE in the
/// launch environment, set one-time alarms far ahead (in 2031, never ringing) until AlarmKit refuses, then cancel them
/// all, and write what happened into the app's Documents/alarm-probe.json.
@available(iOS 26.0, *)
enum FajrAlarmProbe {
    static func run(max: Int = 1000) async {
        var out: [String: Any] = ["auth": FajrAlarmScheduler.authString(AlarmManager.shared.authorizationState)]
        let start = Date()
        if AlarmManager.shared.authorizationState == .notDetermined {
            out["requested"] = FajrAlarmScheduler.authString(await FajrAlarmScheduler.requestAuthorization())
        }
        var ids: [UUID] = []
        var refused: String?
        if AlarmManager.shared.authorizationState == .authorized {
            let base = Date(timeIntervalSince1970: 1_925_000_000) // 2031
            for i in 0..<max {
                let id = UUID()
                let slot = PrayerPlan.Slot(day: "2031-01-01", at: (base.timeIntervalSince1970 + Double(i) * 86_400) * 1000)
                do {
                    _ = try await AlarmManager.shared.schedule(id: id, configuration: FajrAlarmScheduler.configuration(slot, title: "probe", cfg: .init(on: true, sound: nil, stop: "stop")))
                    ids.append(id)
                } catch AlarmManager.AlarmError.maximumLimitReached {
                    refused = "maximumLimitReached"
                    break
                } catch {
                    refused = String(describing: error)
                    break
                }
            }
            out["listed"] = ((try? AlarmManager.shared.alarms) ?? []).count
            for id in ids { try? AlarmManager.shared.cancel(id: id) }
            out["afterCancel"] = ((try? AlarmManager.shared.alarms) ?? []).count
        }
        out["scheduled"] = ids.count
        out["refused"] = refused ?? "none (stopped at \(max))"
        out["seconds"] = Date().timeIntervalSince(start)
        if let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first,
           let d = try? JSONSerialization.data(withJSONObject: out, options: [.prettyPrinted, .sortedKeys]) {
            try? d.write(to: dir.appendingPathComponent("alarm-probe.json"))
        }
    }
}
#endif
#endif

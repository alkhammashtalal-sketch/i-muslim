import AVFoundation
import Capacitor
import CryptoKit
import Foundation
import UserNotifications

// The alerts' recorded sounds (add-ons 0072-add18 §1, 0072-add20 §1): downloaded from our own server (the Worker's
// static /sounds/…, listed in /sounds/manifest.json) into the app container's Library/Sounds, where
// UNNotificationSound(named:) looks first (then the App Group container's Library/Sounds, then the bundle:
// developer.apple.com/documentation/usernotifications/unnotificationsound). A file is kept only when its SHA-256 is the
// manifest's, it is one of the formats the system plays for an alert (Linear PCM, IMA4, µLaw, aLaw in CAF/WAV/AIFF) and
// it lasts less than 30 seconds (Apple: «If the sound file is longer than 30 seconds, the system plays the default
// sound instead»). On any failure nothing is kept and the app rings the phone's own sound (alert-sounds.ts soundFor).
// The folder is left out of the backup: everything in it can be downloaded again. Used by
// web/src/native/alert-sounds-device.ts; registered in AppViewController.
@objc(AlertSoundsPlugin)
public class AlertSoundsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AlertSoundsPlugin"
    public let jsName = "AlertSounds"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "prepare", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "channels", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "timeSensitive", returnType: CAPPluginReturnPromise),
    ]

    static let maxBytes = 5_000_000
    static let pattern = try! NSRegularExpression(pattern: "^muslim-([a-z0-9-]+)-([0-9a-f]{12})\\.(caf|wav|aiff?)$")
    static let formats: Set<AudioFormatID> = [kAudioFormatLinearPCM, kAudioFormatAppleIMA4, kAudioFormatULaw, kAudioFormatALaw]

    static var dir: URL? {
        guard let lib = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first else { return nil }
        var d = lib.appendingPathComponent("Sounds", isDirectory: true)
        try? FileManager.default.createDirectory(at: d, withIntermediateDirectories: true)
        var v = URLResourceValues()
        v.isExcludedFromBackup = true
        try? d.setResourceValues(v)
        return d
    }

    /// slot id → file name, for the files already checked and kept.
    static func ready() -> [String: String] {
        guard let d = dir, let names = try? FileManager.default.contentsOfDirectory(atPath: d.path) else { return [:] }
        var out: [String: String] = [:]
        for n in names.sorted() {
            let r = NSRange(n.startIndex..., in: n)
            guard let m = pattern.firstMatch(in: n, range: r), let id = Range(m.range(at: 1), in: n) else { continue }
            out[String(n[id])] = n
        }
        return out
    }

    @objc func status(_ call: CAPPluginCall) {
        call.resolve(["ready": Self.ready()])
    }

    /// Android only (one notification channel per sound); on iOS the sound is the notification's own.
    @objc func channels(_ call: CAPPluginCall) {
        call.resolve(["ready": [:]])
    }

    /// «حساس للوقت» (add-on 0072-add34 §ب5): the system's Time Sensitive setting for the app (iOS 15+, the deployment
    /// target). `notSupported` while the app does not carry com.apple.developer.usernotifications.time-sensitive, so the
    /// settings hide the switch and the alerts never ask for the level (alert-sounds.ts timeSensitiveFor).
    static func timeSensitiveName(_ s: UNNotificationSetting) -> String {
        switch s {
        case .enabled: return "enabled"
        case .disabled: return "disabled"
        case .notSupported: return "notSupported"
        default: return "notDetermined"
        }
    }

    @objc func timeSensitive(_ call: CAPPluginCall) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            call.resolve(["setting": Self.timeSensitiveName(settings.timeSensitiveSetting)])
        }
    }

    /// Why a downloaded file may not ring an alert, or nil.
    static func problem(_ file: URL, sha256: String, maxSeconds: Double) -> String? {
        guard let data = try? Data(contentsOf: file), !data.isEmpty, data.count <= maxBytes else { return "bytes" }
        let hex = SHA256.hash(data: data).map { String(format: "%02x", $0) }.joined()
        guard hex == sha256.lowercased() else { return "sha256" }
        guard let audio = try? AVAudioFile(forReading: file) else { return "format" }
        let id = audio.fileFormat.streamDescription.pointee.mFormatID
        guard formats.contains(id) else { return "format" }
        let seconds = Double(audio.length) / audio.fileFormat.sampleRate
        guard seconds > 0, seconds < maxSeconds else { return "too_long" }
        return nil
    }

    @objc func prepare(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), let urlText = call.getString("url"), let url = URL(string: urlText),
              url.scheme == "https", let sha = call.getString("sha256"), let name = call.getString("name"),
              let dir = Self.dir, Self.pattern.firstMatch(in: name, range: NSRange(name.startIndex..., in: name)) != nil,
              name.hasPrefix("muslim-\(id)-")
        else {
            call.resolve(["ok": false, "error": "input"])
            return
        }
        let maxSeconds = call.getDouble("maxSeconds") ?? 30
        let target = dir.appendingPathComponent(name)
        if FileManager.default.fileExists(atPath: target.path), Self.problem(target, sha256: sha, maxSeconds: maxSeconds) == nil {
            call.resolve(["ok": true])
            return
        }
        let task = URLSession.shared.downloadTask(with: url) { tmp, response, error in
            guard error == nil, let tmp = tmp, (response as? HTTPURLResponse)?.statusCode == 200 else {
                call.resolve(["ok": false, "error": "download"])
                return
            }
            // The audio reader wants the file's own extension.
            let checked = FileManager.default.temporaryDirectory.appendingPathComponent(name)
            try? FileManager.default.removeItem(at: checked)
            do { try FileManager.default.moveItem(at: tmp, to: checked) } catch {
                call.resolve(["ok": false, "error": "move"])
                return
            }
            if let p = Self.problem(checked, sha256: sha, maxSeconds: maxSeconds) {
                try? FileManager.default.removeItem(at: checked)
                call.resolve(["ok": false, "error": p])
                return
            }
            // The older editions of this sound go; then the new one takes its place.
            for (k, old) in Self.ready() where k == id { try? FileManager.default.removeItem(at: dir.appendingPathComponent(old)) }
            do { try FileManager.default.moveItem(at: checked, to: target) } catch {
                call.resolve(["ok": false, "error": "move"])
                return
            }
            call.resolve(["ok": true])
        }
        task.resume()
    }
}

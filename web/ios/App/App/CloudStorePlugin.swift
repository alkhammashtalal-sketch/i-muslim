import Capacitor
import Foundation

// The copy of the person's data in their own iCloud, with no sign-in to us (add-on 0072-add34 §ب2):
// NSUbiquitousKeyValueStore, the app's single key-value store in the person's iCloud account (the entitlement
// com.apple.developer.ubiquity-kvstore-identifier in App.entitlements). Strings only, each a small JSON {t, v} written
// by web/src/storage/cloud.ts, which decides what goes there and how two copies become one. Apple's limits: 1024 keys,
// 1 MB for all values, 128 characters for a key; a value over 64 KB is refused here. No iCloud on the device: the store
// keeps the values on the device and nothing is sent; the app says nothing. Registered in AppViewController.
@objc(CloudStorePlugin)
public class CloudStorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "CloudStorePlugin"
    public let jsName = "CloudStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getAll", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise)
    ]
    private let store = NSUbiquitousKeyValueStore.default
    private var observer: NSObjectProtocol?
    static let maxValue = 64 * 1024

    override public func load() {
        observer = NotificationCenter.default.addObserver(
            forName: NSUbiquitousKeyValueStore.didChangeExternallyNotification, object: store, queue: .main
        ) { [weak self] note in
            let info = note.userInfo ?? [:]
            let reason: String
            switch info[NSUbiquitousKeyValueStoreChangeReasonKey] as? Int {
            case NSUbiquitousKeyValueStoreServerChange: reason = "server"
            case NSUbiquitousKeyValueStoreInitialSyncChange: reason = "initial"
            case NSUbiquitousKeyValueStoreQuotaViolationChange: reason = "quota"
            case NSUbiquitousKeyValueStoreAccountChange: reason = "account"
            default: reason = "unknown"
            }
            let keys = info[NSUbiquitousKeyValueStoreChangedKeysKey] as? [String] ?? []
            self?.notifyListeners("change", data: ["reason": reason, "keys": keys])
        }
        store.synchronize()
    }

    deinit {
        if let observer { NotificationCenter.default.removeObserver(observer) }
    }

    /// Signed in to iCloud on this device (the identity token exists); otherwise the app keeps its data on the device.
    @objc func available(_ call: CAPPluginCall) {
        call.resolve(["available": FileManager.default.ubiquityIdentityToken != nil])
    }

    @objc func getAll(_ call: CAPPluginCall) {
        var values: [String: String] = [:]
        for (key, value) in store.dictionaryRepresentation {
            if let s = value as? String { values[key] = s }
        }
        call.resolve(["values": values])
    }

    @objc func set(_ call: CAPPluginCall) {
        guard let key = call.getString("key"), let value = call.getString("value"),
              !key.isEmpty, key.utf16.count <= 128, value.utf8.count <= CloudStorePlugin.maxValue else {
            call.resolve(["ok": false])
            return
        }
        store.set(value, forKey: key)
        call.resolve(["ok": true])
    }
}

import Capacitor
import Foundation

// The downloaded recitations' folder (reply 0056 أ): Library/Application Support/recitations, made by the app through
// @capacitor/filesystem and filled by @capacitor/file-transfer (web/src/quran/downloads.ts). Here only one thing: the
// folder is marked NSURLIsExcludedFromBackupKey, as Apple asks of data that can be downloaded again, so it stays out
// of the iCloud backup and is not purged as Caches is. The flag on the folder covers what is put in it.
// Registered in AppViewController.
@objc(RecitationStorePlugin)
public class RecitationStorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RecitationStorePlugin"
    public let jsName = "RecitationStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "prepare", returnType: CAPPluginReturnPromise)
    ]

    @objc func prepare(_ call: CAPPluginCall) {
        guard let path = call.getString("path"), var url = URL(string: path), url.isFileURL else {
            call.reject("bad_path")
            return
        }
        // Only the app's own recitations folder, under its Library.
        let library = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first
        guard let library, url.standardizedFileURL.path.hasPrefix(library.standardizedFileURL.path),
              url.lastPathComponent == "recitations" else {
            call.reject("bad_path")
            return
        }
        do {
            try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            try url.setResourceValues(values)
            let excluded = (try? url.resourceValues(forKeys: [.isExcludedFromBackupKey]))?.isExcludedFromBackup ?? false
            call.resolve(["excluded": excluded])
        } catch {
            call.reject("prepare_failed", nil, error)
        }
    }
}

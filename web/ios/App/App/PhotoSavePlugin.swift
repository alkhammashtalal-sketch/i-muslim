import Capacitor
import Photos

// «احفظ الكل» of «اصنع كروت» (add-on 0072-add30 §1): the cards the person made, written to the app's cache folder by
// web/src/native/photos.ts, added to Photos together, add-only (NSPhotoLibraryAddUsageDescription): the app asks for
// no access to read the library and reads nothing from it. Registered in AppViewController.
@objc(PhotoSavePlugin)
public class PhotoSavePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PhotoSavePlugin"
    public let jsName = "PhotoSave"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise)
    ]

    /// { paths: [file URL of each PNG, in order] } → { saved: n }; rejects with "denied" when the person said no.
    @objc func save(_ call: CAPPluginCall) {
        let paths = call.getArray("paths", String.self) ?? []
        let urls = paths.compactMap { p -> URL? in
            if let u = URL(string: p), u.isFileURL { return u }
            return p.hasPrefix("/") ? URL(fileURLWithPath: p) : nil
        }
        guard !urls.isEmpty, urls.count == paths.count else {
            call.reject("no files")
            return
        }
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
            guard status == .authorized || status == .limited else {
                call.reject("denied")
                return
            }
            PHPhotoLibrary.shared().performChanges({
                // One request per card, in the set's order, so the Photos library keeps the cards in sequence.
                for url in urls {
                    PHAssetCreationRequest.forAsset().addResource(with: .photo, fileURL: url, options: nil)
                }
            }) { ok, error in
                if ok { call.resolve(["saved": urls.count]) } else { call.reject(error?.localizedDescription ?? "not saved") }
            }
        }
    }
}

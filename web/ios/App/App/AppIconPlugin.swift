import Capacitor
import UIKit

// «أيقونة التطبيق» in the settings (add-ons 0072-add30 §2 and 0072-add31 §2): the person chooses the Home Screen icon
// among three, «الصافية» (the primary AppIcon) and the two alternates «المؤطّرة» (AppIconFramed) and «العاجية»
// (AppIconIvory). The alternates are app icon sets in Assets.xcassets, listed in the build setting
// ASSETCATALOG_COMPILER_ALTERNATE_APPICON_NAMES, so actool writes CFBundleAlternateIcons into the built Info.plist
// (developer.apple.com/documentation/xcode/configuring-your-app-icon, «Alternate App Icon Sets»).
// UIApplication.setAlternateIconName shows the system's own notice of the change; it is not hidden. Registered in
// AppViewController; used by web/src/native/app-icon.ts.
@objc(AppIconPlugin)
public class AppIconPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppIconPlugin"
    public let jsName = "AppIcon"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise)
    ]
    /** The alternates this build carries; anything else is refused before it reaches UIKit. */
    private static let alternates: Set<String> = ["AppIconClassic", "AppIconFramed", "AppIconIvory"]

    @objc func get(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let app = UIApplication.shared
            var r: [String: Any] = ["supported": app.supportsAlternateIcons]
            r["name"] = app.alternateIconName ?? NSNull()
            call.resolve(r)
        }
    }

    /** `name`: an alternate's name, or absent / null for the primary icon. */
    @objc func set(_ call: CAPPluginCall) {
        let name = call.getString("name")
        if let name, !Self.alternates.contains(name) {
            call.reject("unknown icon")
            return
        }
        DispatchQueue.main.async {
            let app = UIApplication.shared
            guard app.supportsAlternateIcons else {
                call.reject("alternate icons unsupported")
                return
            }
            if app.alternateIconName == name {
                call.resolve(["name": name ?? NSNull()])
                return
            }
            app.setAlternateIconName(name) { error in
                DispatchQueue.main.async {
                    if let error {
                        call.reject(error.localizedDescription)
                    } else {
                        call.resolve(["name": UIApplication.shared.alternateIconName ?? NSNull()])
                    }
                }
            }
        }
    }
}

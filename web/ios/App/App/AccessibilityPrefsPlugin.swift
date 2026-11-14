import Capacitor
import UIKit

// iOS's «Reduce Transparency» for the web view (add-on 0071-add16 §5): Safari and WKWebView have no
// prefers-reduced-transparency query, so the date card's sky reads the setting here, once and then on each change
// (UIAccessibility.reduceTransparencyStatusDidChangeNotification). With it on, the sky has no layer: the painting as
// painted. Increased contrast and inverted colours reach the web view as CSS queries and need nothing here. Registered
// in AppViewController; used by web/src/native/a11y-prefs.ts.
@objc(AccessibilityPrefsPlugin)
public class AccessibilityPrefsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AccessibilityPrefsPlugin"
    public let jsName = "AccessibilityPrefs"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise)
    ]
    private var observer: NSObjectProtocol?

    override public func load() {
        observer = NotificationCenter.default.addObserver(
            forName: UIAccessibility.reduceTransparencyStatusDidChangeNotification, object: nil, queue: .main
        ) { [weak self] _ in
            self?.notifyListeners("change", data: ["reduceTransparency": UIAccessibility.isReduceTransparencyEnabled])
        }
    }

    deinit {
        if let observer { NotificationCenter.default.removeObserver(observer) }
    }

    @objc func get(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(["reduceTransparency": UIAccessibility.isReduceTransparencyEnabled])
        }
    }
}

import UIKit
import Capacitor

// The app's view controller: Capacitor's own, through its documented subclass point (capacitorjs.com/docs/ios/viewcontroller;
// SceneDelegate makes it the window's root). One change: until the first page paints, the web view shows the launch screen's sky
// (the colour LaunchSky: #9fc0e8, and #040a1c in dark mode) instead of the system's white or black, so nothing flashes
// between the launch screen and the app (CLAUDE.md §11, السكينة).
class AppViewController: CAPBridgeViewController {
    // The launch has no status bar (Info.plist UIStatusBarHidden, 0072-add7 §3.5), which Capacitor reads as it loads this
    // view. But its own SystemBars plugin then asks to show the bar as it loads (its "hidden" setting, false), on the main
    // queue, before the page is drawn: on the iPhone SE the launch screen kept by @capacitor/splash-screen was then laid
    // out under a 20 pt bar and moved up when the welcome page hid it. That one request, queued during the load, is not
    // followed; the page's own requests come later and are (web/src/native/status-bar.ts, Welcome.tsx).
    private var holdHidden = false

    override func setStatusBarVisible(_ isStatusBarVisible: Bool) {
        if holdHidden && isStatusBarVisible { return }
        super.setStatusBarVisible(isStatusBarVisible)
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        if Bundle.main.object(forInfoDictionaryKey: "UIStatusBarHidden") as? Bool == true {
            holdHidden = true
            // After the requests the plugins queued as they loaded (the main queue runs in order).
            DispatchQueue.main.async { [weak self] in self?.holdHidden = false }
        }
        let sky = UIColor(named: "LaunchSky") ?? .systemBackground
        // Transparent until the page paints, so the sky shows through (an opaque web view draws white first).
        webView?.isOpaque = false
        webView?.backgroundColor = sky
        webView?.scrollView.backgroundColor = sky
        webView?.underPageBackgroundColor = sky
        // The app's own plugin: the phone's heading for the qibla (reply 0043 د; QiblaHeadingPlugin.swift).
        bridge?.registerPluginInstance(QiblaHeadingPlugin())
        // And mosques around from Apple Maps on the device (reply 0043 ج; MosqueSearchPlugin.swift).
        bridge?.registerPluginInstance(MosqueSearchPlugin())
        // And the widgets' data in the App Group (reply 0046; WidgetBridgePlugin.swift).
        bridge?.registerPluginInstance(WidgetBridgePlugin())
        // And the downloaded recitations' folder, out of the backup (reply 0056 أ; RecitationStorePlugin.swift).
        bridge?.registerPluginInstance(RecitationStorePlugin())
        // And iOS's «Reduce Transparency», which the web view cannot query (add-on 0071-add16; AccessibilityPrefsPlugin.swift).
        bridge?.registerPluginInstance(AccessibilityPrefsPlugin())
        // And «أضف إلى تقويم الجهاز», write-only, never reading the calendar (reply 0062; DeviceCalendarPlugin.swift).
        bridge?.registerPluginInstance(DeviceCalendarPlugin())
        // And the alerts' sounds from our server into Library/Sounds (add-on 0072-add20 §1; AlertSoundsPlugin.swift).
        bridge?.registerPluginInstance(AlertSoundsPlugin())
        // And «جلسة تسبيح بعد الصلاة» on the Lock Screen (add-on 0072-add19 §3; TasbihSessionPlugin.swift).
        bridge?.registerPluginInstance(TasbihSessionPlugin())
        // And «منبّه الفجر» (iOS 26, AlarmKit) and «عدّاد الصلاة القادمة» (add-on 0072-add34 §ب6, §ب7).
        bridge?.registerPluginInstance(FajrAlarmPlugin())
        bridge?.registerPluginInstance(PrayerCountdownPlugin())
    }
}

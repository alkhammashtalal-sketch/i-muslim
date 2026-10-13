import UIKit
import Capacitor

// The app's view controller: Capacitor's own, through its documented subclass point (capacitorjs.com/docs/ios/viewcontroller;
// SceneDelegate makes it the window's root). One change: until the first page paints, the web view shows the launch screen's sky
// (the colour LaunchSky: #9fc0e8, and #040a1c in dark mode) instead of the system's white or black, so nothing flashes
// between the launch screen and the app (CLAUDE.md §11, السكينة).
class AppViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        let sky = UIColor(named: "LaunchSky") ?? .systemBackground
        // Transparent until the page paints, so the sky shows through (an opaque web view draws white first).
        webView?.isOpaque = false
        webView?.backgroundColor = sky
        webView?.scrollView.backgroundColor = sky
        webView?.underPageBackgroundColor = sky
    }
}

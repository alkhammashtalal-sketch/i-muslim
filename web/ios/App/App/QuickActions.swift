import Capacitor
import UIKit

// The app icon's menu (touch and hold; add-on 0072-add30 §3): «سبّح»، «اسأل»، «القبلة»، «أذكار الوقت», each opening its
// page by the app's own link, as the widgets, the controls and Siri do (web/src/native/NativeDevice.tsx):
//   imuslim://today/tasbih, imuslim://ask (the question box on the home page), imuslim://today/qibla, and the adhkar of
//   the time (the morning's from Fajr, the evening's from Asr: MuslimRouter, as the «أذكار الوقت» control).
// Dynamic Home Screen quick actions, set by the app at each launch and each time it leaves the screen, not static ones
// in Info.plist: a static title follows the phone's language, and the app speaks the language chosen inside it (the
// welcome page), which the app writes into the App Group (widgets.json «lang»). Their titles are Localizable.strings of
// that language («quick.*», the same words as the app's: web/src/native/quick-actions.ts). Apple: dynamic quick
// actions appear once the app has run once.

enum QuickActions {
    static let ids = ["tasbih", "ask", "qibla", "adhkar"]
    /// The controls' symbols (MuslimWidgets/LockWidgets.swift); «sun.horizon» is iOS 16's, «sunrise» before it.
    private static var symbols: [String: String] {
        let sun: String
        if #available(iOS 16.0, *) { sun = "sun.horizon" } else { sun = "sunrise" }
        return ["tasbih": "circle.dotted", "ask": "bubble.left", "qibla": "location.north.line", "adhkar": sun]
    }
    private static let prefix = "com.alkhammashtalal.imuslim.quick."

    /// The app's language: widgets.json's, else the phone's first of the app's ten.
    static func lang() -> String {
        if let l = SiriAnswers.load()?.lang, Bundle.main.path(forResource: l, ofType: "lproj") != nil { return l }
        return Bundle.main.preferredLocalizations.first ?? "ar"
    }

    static func title(_ id: String, lang: String) -> String {
        let bundle = Bundle.main.path(forResource: lang, ofType: "lproj").flatMap(Bundle.init(path:)) ?? .main
        return bundle.localizedString(forKey: "quick.\(id)", value: nil, table: nil)
    }

    static func install() {
        let l = lang()
        UIApplication.shared.shortcutItems = ids.map { id in
            UIApplicationShortcutItem(type: prefix + id, localizedTitle: title(id, lang: l), localizedSubtitle: nil,
                                      icon: UIApplicationShortcutIcon(systemImageName: symbols[id] ?? "circle"), userInfo: nil)
        }
    }

    /// The page of a quick action, now.
    static func url(_ item: UIApplicationShortcutItem, now: Date = Date()) -> URL? {
        guard item.type.hasPrefix(prefix) else { return nil }
        switch String(item.type.dropFirst(prefix.count)) {
        case "tasbih": return URL(string: "imuslim://today/tasbih")
        case "ask": return URL(string: "imuslim://ask")
        case "qibla": return URL(string: "imuslim://today/qibla")
        case "adhkar":
            if #available(iOS 16.0, *) { return MuslimRouter.url(.adhkar, now: now) }
            return URL(string: "imuslim://today/adhkar")
        default: return nil
        }
    }

    // MARK: - Opening a link inside the app

    /// True once the page has appeared: Capacitor's plugins (@capacitor/app's «appUrlOpen») are listening.
    private static var ready = false
    private static var waiting: [URL] = []

    /// Called once at launch (AppDelegate).
    static func watch() {
        NotificationCenter.default.addObserver(forName: .capacitorViewDidAppear, object: nil, queue: .main) { _ in
            ready = true
            let urls = waiting
            waiting = []
            urls.forEach(send)
        }
    }

    /// Opens the app's own link as a tapped widget's link arrives: through Capacitor's delegate proxy, so
    /// @capacitor/app sends «appUrlOpen» (kept until the page listens). At a cold start it waits for the page.
    static func deliver(_ url: URL) {
        if ready { send(url) } else { waiting.append(url) }
    }

    private static func send(_ url: URL) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
    }
}

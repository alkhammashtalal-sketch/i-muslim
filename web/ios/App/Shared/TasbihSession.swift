import ActivityKit
import AppIntents
import Foundation
import WidgetKit

// «جلسة تسبيح بعد الصلاة» (add-on 0072-add19 §3): a Live Activity on the Lock Screen and in the Dynamic Island,
// started from the app's tasbih page (web/src/native/tasbih-session.ts → TasbihSessionPlugin.swift). Compiled into the
// app and the widget extension both: the extension draws it (LockViews.swift), the app starts it, and «+١» runs in the
// app's process as a LiveActivityIntent (iOS 17), which updates the activity and ends it once the last step is done.
// The steps' words come from the hadith's own text (data/tasbih-after-prayer.json, cut by the app); the session keeps
// its count in the App Group (tasbih-session.json), never on any server.

@available(iOS 16.1, *)
struct TasbihSessionAttributes: ActivityAttributes {
    struct Step: Codable, Hashable { var zikr: String; var target: Int }

    struct ContentState: Codable, Hashable {
        var step: Int
        var n: Int
        var done: Bool
    }

    var title: String          // «جلسة تسبيح بعد الصلاة»
    var steps: [Step]
    var source: String         // «صحيح — رواه مسلم · موسوعة الأحاديث النبوية»
    var doneText: String       // «تمّت»
    var digits: String         // the ten digits of the app's language
    var rtl: Bool
}

enum TasbihSessionLogic {
    struct Saved: Codable { var steps: [Int]; var step: Int; var n: Int; var done: Bool; var started: Double }

    static let file = "tasbih-session.json"
    static var url: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.alkhammashtalal.imuslim")?.appendingPathComponent(file)
    }
    static func load() -> Saved? {
        guard let url = url, let d = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(Saved.self, from: d)
    }
    static func save(_ s: Saved?) {
        guard let url = url else { return }
        if let s = s, let d = try? JSONEncoder().encode(s) {
            try? d.write(to: url, options: .atomic)
        } else {
            try? FileManager.default.removeItem(at: url)
        }
    }

    /// One press, as «بعد الصلاة» counts in the app (Tasbih.tsx): n + 1; at a step's number the next step begins at 0;
    /// the last step stays at its number, and the session is done. Returns whether a step was completed (for the alert).
    static func tap(_ s: inout Saved) -> Bool {
        guard !s.done, !s.steps.isEmpty else { return false }
        s.step = min(max(0, s.step), s.steps.count - 1)
        let target = max(1, s.steps[s.step])
        let n = s.n + 1
        if n < target {
            s.n = n
            return false
        }
        if s.step >= s.steps.count - 1 {
            s.n = target
            s.done = true
        } else {
            s.step += 1
            s.n = 0
        }
        return true
    }

    /// Apple: a Live Activity is active for up to eight hours; the session asks for its end a little before.
    static let maxAge: TimeInterval = 8 * 3600
}

@available(iOS 16.2, *)
enum TasbihSessionRunner {
    static func current() -> Activity<TasbihSessionAttributes>? { Activity<TasbihSessionAttributes>.activities.first }

    static func state(_ s: TasbihSessionLogic.Saved) -> TasbihSessionAttributes.ContentState {
        .init(step: s.step, n: s.n, done: s.done)
    }

    /// Start a session (the app, from the tasbih page): ends any earlier one first.
    static func start(_ attrs: TasbihSessionAttributes) async throws {
        for a in Activity<TasbihSessionAttributes>.activities { await a.end(nil, dismissalPolicy: .immediate) }
        let saved = TasbihSessionLogic.Saved(steps: attrs.steps.map(\.target), step: 0, n: 0, done: false, started: Date().timeIntervalSince1970)
        TasbihSessionLogic.save(saved)
        let content = ActivityContent(state: state(saved), staleDate: Date().addingTimeInterval(TasbihSessionLogic.maxAge))
        _ = try Activity.request(attributes: attrs, content: content, pushType: nil)
    }

    /// «+١»: count, update the card, and at a step's end let the phone know (the alert lights the screen and gives the
    /// phone's feedback); once the last step is done the card says «تمّت» and leaves the Lock Screen by itself.
    static func tap() async {
        guard var s = TasbihSessionLogic.load(), let a = current() else { return }
        let stepDone = TasbihSessionLogic.tap(&s)
        TasbihSessionLogic.save(s)
        let content = ActivityContent(state: state(s), staleDate: Date(timeIntervalSince1970: s.started).addingTimeInterval(TasbihSessionLogic.maxAge))
        if s.done {
            await a.end(content, dismissalPolicy: .after(Date().addingTimeInterval(60)))
            TasbihSessionLogic.save(nil)
        } else if stepDone {
            let next = a.attributes.steps[min(s.step, a.attributes.steps.count - 1)].zikr
            await a.update(content, alertConfiguration: AlertConfiguration(title: LocalizedStringResource(stringLiteral: a.attributes.title),
                                                                         body: LocalizedStringResource(stringLiteral: next), sound: .default))
        } else {
            await a.update(content)
        }
    }

    static func end() async {
        for a in Activity<TasbihSessionAttributes>.activities { await a.end(nil, dismissalPolicy: .immediate) }
        TasbihSessionLogic.save(nil)
    }
}

/// «+١» on the session's card and in the Dynamic Island (iOS 17): runs in the app's process, the app not opened.
@available(iOS 17.0, *)
struct TasbihSessionTapIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Tasbih session +1"
    static let isDiscoverable: Bool = false

    init() {}

    func perform() async throws -> some IntentResult {
        await TasbihSessionRunner.tap()
        return .result()
    }
}

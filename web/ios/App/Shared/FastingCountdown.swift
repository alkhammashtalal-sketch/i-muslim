import ActivityKit
import AppIntents
import Foundation
import WidgetKit

// The iftar and suhoor countdown (add-ons 0072-add26 §4.2 and 0072-add34 §ب8): a Live Activity on the Lock Screen and
// in the Dynamic Island, started from the Ramadan page (web/src/native/fasting-countdown.ts → FastingCountdownPlugin).
// Compiled into the app and the widget extension both, like TasbihSession.swift: the extension draws it
// (LockWidgets.swift), the app starts and ends it. The count is the system's own (Text(timerInterval:)), so nothing
// updates it and nothing is sent anywhere; at its time the stale date shows the prayer and its time alone. It ends by
// itself: when the app next comes to the front (endStale), from «أوقف» on the card (iOS 17), or at Apple's limit.

@available(iOS 16.1, *)
struct FastingCountdownAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var target: Date
    }

    var kind: String           // "iftar" or "suhoor"
    var title: String          // «يبقى على الإفطار» / «يبقى على أذان الفجر»
    var at: String             // «المغرب ٥:٤٣ م · الرياض»
    var locale: String         // the locale the system writes the count in (its digits)
    var stop: String           // «أوقف العدّاد», the stop button's spoken name
    var rtl: Bool
}

@available(iOS 16.2, *)
enum FastingCountdownRunner {
    /// Apple: a Live Activity is active for up to eight hours (ActivityKit, «Displaying live data with Live Activities»).
    static let maxAge: TimeInterval = 8 * 3600

    static func current() -> Activity<FastingCountdownAttributes>? { Activity<FastingCountdownAttributes>.activities.first }

    /// Start a countdown (the app, from the Ramadan page): ends any earlier one first. Refused beyond eight hours.
    static func start(_ attrs: FastingCountdownAttributes, target: Date) async throws {
        for a in Activity<FastingCountdownAttributes>.activities { await a.end(nil, dismissalPolicy: .immediate) }
        let content = ActivityContent(state: FastingCountdownAttributes.ContentState(target: target), staleDate: target)
        _ = try Activity.request(attributes: attrs, content: content, pushType: nil)
    }

    static func end() async {
        for a in Activity<FastingCountdownAttributes>.activities { await a.end(nil, dismissalPolicy: .immediate) }
    }

    /// The app is back: a countdown whose time has passed leaves the Lock Screen a little after it (15 minutes).
    static func endStale(now: Date = Date()) async {
        for a in Activity<FastingCountdownAttributes>.activities where a.content.state.target <= now {
            let leave = a.content.state.target.addingTimeInterval(15 * 60)
            await a.end(nil, dismissalPolicy: leave > now ? .after(leave) : .immediate)
        }
    }
}

/// «أوقف» on the card and in the Dynamic Island (iOS 17): runs in the app's process, the app not opened.
@available(iOS 17.0, *)
struct FastingCountdownEndIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "Stop the Ramadan countdown"
    static let isDiscoverable: Bool = false

    init() {}

    func perform() async throws -> some IntentResult {
        await FastingCountdownRunner.end()
        return .result()
    }
}

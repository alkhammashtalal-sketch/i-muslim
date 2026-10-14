import AppIntents
import Foundation
import WidgetKit

// «+١» in the tasbih widget (reply 0046, iOS 17+): one tap counts in the App Group exactly as a tap in the app's
// Tasbih.tsx (`tap`), and the app reads it back when it opens. Runs in the extension; nothing leaves the device.

enum TasbihCount {
    /// The app's rule, word for word (WidgetData.Tasbih's comment):
    ///   a free count (after == false): target 0 counts on; otherwise at the target it stays full and the next tap
    ///   starts again at one;
    ///   after the prayer (after == true): the last step done stays done; otherwise n + 1, and at the step's target the
    ///   next step begins at 0 (the last step keeps n at its target).
    /// Each counted tap adds one to today's total (`day` its date, as the app's `today()`: the device's date).
    static func tap(_ t: WidgetData.Tasbih, today: String) -> WidgetData.Tasbih {
        var v = t
        if v.day != today {                                          // the app's load: a new day's total starts at 0
            v.day = today
            v.total = 0
        }
        guard !v.steps.isEmpty else { return v }
        v.step = min(max(0, v.step), v.steps.count - 1)
        if v.after {
            let lim = max(1, v.steps[v.step].target)
            let last = v.step >= v.steps.count - 1
            if last && v.n >= lim { return v }
            let n = v.n + 1
            v.total += 1
            if n < lim || last {
                v.n = n
            } else {
                v.n = 0
                v.step += 1
            }
        } else {
            let limit = v.steps[v.step].target
            v.n = limit > 0 && v.n >= limit ? 1 : v.n + 1
            v.total += 1
        }
        v.changedByWidget = true
        return v
    }

    /// The device's date as the app's `new Date().toLocaleDateString('en-CA')`: yyyy-MM-dd.
    static func today(_ now: Date = Date()) -> String {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = .current
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: now)
    }
}

@available(iOS 17.0, *)
struct IncrementTasbihIntent: AppIntent {
    // Constants, as the App Intents metadata extraction reads them at build time.
    static let title: LocalizedStringResource = "Tasbih +1"
    static let isDiscoverable: Bool = false
    static let openAppWhenRun: Bool = false

    init() {}

    func perform() async throws -> some IntentResult {
        if var data = WidgetStore.load() {
            let before = data.tasbih
            data.tasbih = TasbihCount.tap(before, today: TasbihCount.today())
            WidgetStore.save(data)
        }
        WidgetCenter.shared.reloadTimelines(ofKind: MuslimKind.tasbih)
        return .result()
    }
}

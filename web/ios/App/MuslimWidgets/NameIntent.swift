import AppIntents
import Foundation
import WidgetKit

// «التالي» in the widget «اسم الله لليوم» (add-on 0072-add10 §1, iOS 17+): the next page inside the widget, without
// opening the app, as the tasbih's «+١» (TasbihIntent.swift). The page is the widget's own (NamePageStore in the App
// Group, per size), back to the first each new Riyadh day; the app neither writes nor reads it. Nothing leaves the
// device.

@available(iOS 17.0, *)
struct NextNamePageIntent: AppIntent {
    // Constants, as the App Intents metadata extraction reads them at build time.
    static let title: LocalizedStringResource = "Next page"
    static let isDiscoverable: Bool = false
    static let openAppWhenRun: Bool = false

    @Parameter(title: "Day") var day: String
    @Parameter(title: "Size") var family: String
    @Parameter(title: "Pages") var pages: Int

    init() {}

    init(day: String, family: String, pages: Int) {
        self.day = day
        self.family = family
        self.pages = pages
    }

    func perform() async throws -> some IntentResult {
        NamePageStore.advance(day: day, family: family, pages: pages)
        WidgetCenter.shared.reloadTimelines(ofKind: MuslimKind.name)
        return .result()
    }
}

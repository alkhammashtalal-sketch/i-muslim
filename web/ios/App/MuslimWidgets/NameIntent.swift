import AppIntents
import Foundation
import WidgetKit

// «التالي» in the widget «اسم الله لليوم» (add-on 0072-add10 §1, iOS 17+): the next page inside the widget, without
// opening the app, as the tasbih's «+١» (TasbihIntent.swift). The page is the widget's own (NamePageStore in the App
// Group, per size), back to the first each new Riyadh day; the app neither writes nor reads it. Nothing leaves the
// device. «السابق» beside it (add-on 0072-add54): one page back, never from the first page to the last (NamePaging).
// Every title is a key with its English default (ITMS-90626: a bare key is what Metadata.appintents would hold).

@available(iOS 17.0, *)
struct NextNamePageIntent: AppIntent {
    // Constants, as the App Intents metadata extraction reads them at build time.
    static let title = LocalizedStringResource("widget.name.next.title", defaultValue: "Next page")
    static let isDiscoverable: Bool = false
    static let openAppWhenRun: Bool = false

    @Parameter(title: LocalizedStringResource("widget.name.page.day", defaultValue: "Day")) var day: String
    @Parameter(title: LocalizedStringResource("widget.name.page.size", defaultValue: "Size")) var family: String
    @Parameter(title: LocalizedStringResource("widget.name.page.pages", defaultValue: "Pages")) var pages: Int

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

@available(iOS 17.0, *)
struct PrevNamePageIntent: AppIntent {
    static let title = LocalizedStringResource("widget.name.prev.title", defaultValue: "Previous page")
    static let isDiscoverable: Bool = false
    static let openAppWhenRun: Bool = false

    @Parameter(title: LocalizedStringResource("widget.name.page.day", defaultValue: "Day")) var day: String
    @Parameter(title: LocalizedStringResource("widget.name.page.size", defaultValue: "Size")) var family: String
    @Parameter(title: LocalizedStringResource("widget.name.page.pages", defaultValue: "Pages")) var pages: Int

    init() {}

    init(day: String, family: String, pages: Int) {
        self.day = day
        self.family = family
        self.pages = pages
    }

    func perform() async throws -> some IntentResult {
        NamePageStore.back(day: day, family: family, pages: pages)
        WidgetCenter.shared.reloadTimelines(ofKind: MuslimKind.name)
        return .result()
    }
}

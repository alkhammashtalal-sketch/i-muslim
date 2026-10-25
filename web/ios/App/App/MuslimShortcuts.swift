import AppIntents
import UIKit

// Siri and Spotlight (add-on 0072-add30 §4): three App Shortcuts, iOS 16 and later, in the Shortcuts app, Spotlight
// (its Top Hit when someone searches for the app, and by each shortcut's title) and Siri, by their phrases:
//   «متى الصلاة القادمة؟»  answers with the next prayer and its time, without opening the app (SiriAnswers.swift);
//   «افتح المسبحة»        opens the tasbih (imuslim://today/tasbih, as its control and widget do);
//   «اسم الله لليوم»      answers with the day's Name, without opening the app.
// The answers come from the App Group's widgets.json only: no network. The phrases are in AppShortcuts.strings of each
// .lproj and every one holds ${applicationName}, which Apple requires (the name under the icon «مسلم», and the name
// Info.plist's INAlternativeAppNames gives Siri, «Muslim»). The titles and descriptions are in Localizable.strings.
//
// An app has one AppShortcutsProvider and up to ten App Shortcuts (Apple's Human Interface Guidelines, App Shortcuts):
// «أذكار المواقف»'s seven (reply 0050 د, compiled once its table is reviewed; MawaqifIntent.swift) are here too, after
// these three, as the order is the one Spotlight and the Shortcuts app show first.

@available(iOS 16.0, *)
struct NextPrayerIntent: AppIntent {
    static let title: LocalizedStringResource = "siri.next.title"
    static let description = IntentDescription("siri.next.description")
    static let openAppWhenRun: Bool = false
    /// A prayer time is no secret: answered on the Lock Screen too, Apple's default written out.
    static let authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed

    init() {}

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let text = SiriAnswers.nextPrayer(SiriAnswers.load(), now: Date(), noData: String(localized: "siri.next.none"))
        return .result(dialog: IntentDialog(stringLiteral: text))
    }
}

@available(iOS 16.0, *)
struct NameOfDayIntent: AppIntent {
    static let title: LocalizedStringResource = "siri.name.title"
    static let description = IntentDescription("siri.name.description")
    static let openAppWhenRun: Bool = false
    static let authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed

    init() {}

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let text = SiriAnswers.nameOfDay(SiriAnswers.load(), now: Date(), noData: String(localized: "siri.name.none"),
                                         title: String(localized: "siri.name.title"))
        return .result(dialog: IntentDialog(stringLiteral: text))
    }
}

@available(iOS 16.0, *)
struct OpenTasbihIntent: AppIntent {
    static let title: LocalizedStringResource = "siri.tasbih.title"
    static let description = IntentDescription("siri.tasbih.description")
    static let openAppWhenRun: Bool = true

    init() {}

    @MainActor
    func perform() async throws -> some IntentResult {
        if let url = MuslimRouter.url(.tasbih) { QuickActions.deliver(url) }
        return .result()
    }
}

@available(iOS 16.0, *)
struct MuslimShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: NextPrayerIntent(), phrases: ["When is the next prayer in \(.applicationName)", "Next prayer in \(.applicationName)"], shortTitle: "siri.next.short", systemImageName: "clock")
        AppShortcut(intent: OpenTasbihIntent(), phrases: ["Open the tasbih in \(.applicationName)", "Tasbih in \(.applicationName)"], shortTitle: "siri.tasbih.short", systemImageName: "circle.dotted")
        AppShortcut(intent: NameOfDayIntent(), phrases: ["Name of Allah for today in \(.applicationName)", "Today's Name of Allah in \(.applicationName)"], shortTitle: "siri.name.short", systemImageName: "sparkles")
        #if MAWAQIF_REVIEWED
        AppShortcut(intent: OpenMawaqifIntent(situation: .travel), phrases: ["Travel prayer in \(.applicationName)"], shortTitle: "mawaqif.travel", systemImageName: "car")
        AppShortcut(intent: OpenMawaqifIntent(situation: .sleep), phrases: ["Sleep adhkar in \(.applicationName)"], shortTitle: "mawaqif.sleep", systemImageName: "moon")
        AppShortcut(intent: OpenMawaqifIntent(situation: .waking), phrases: ["Waking adhkar in \(.applicationName)"], shortTitle: "mawaqif.waking", systemImageName: "sunrise")
        AppShortcut(intent: OpenMawaqifIntent(situation: .home_in), phrases: ["Entering home in \(.applicationName)"], shortTitle: "mawaqif.home_in", systemImageName: "house")
        AppShortcut(intent: OpenMawaqifIntent(situation: .home_out), phrases: ["Leaving home in \(.applicationName)"], shortTitle: "mawaqif.home_out", systemImageName: "door.left.hand.open")
        AppShortcut(intent: OpenMawaqifIntent(situation: .mosque), phrases: ["Mosque adhkar in \(.applicationName)"], shortTitle: "mawaqif.mosque", systemImageName: "building.columns")
        AppShortcut(intent: OpenMawaqifIntent(situation: .food), phrases: ["Food adhkar in \(.applicationName)"], shortTitle: "mawaqif.food", systemImageName: "fork.knife")
        #endif
    }
}

#if MAWAQIF_REVIEWED
import AppIntents
import UIKit

// «افتح ذكر الموقف» (reply 0050 د): an App Intent for Siri, the Shortcuts app and its automations (CarPlay, Bluetooth,
// an NFC tag), and App Shortcuts with phrases, on iOS 16 and later. It opens the app at the situation's page through
// the app's own link imuslim://mawaqif/<situation> (web/src/native/NativeDevice.tsx), with no welcome page. The names
// of the situations and the phrases are in the ten languages (Localizable.strings and AppShortcuts.strings in each
// .lproj). The app sets nothing up by itself: an automation is the user's own, in the Shortcuts app.
// Compiled only once the table is reviewed (MAWAQIF_REVIEWED, set by web/scripts/ios-build.sh from data/mawaqif.json).

@available(iOS 16.0, *)
enum MawaqifSituation: String, AppEnum {
    case travel, sleep, waking, home_in, home_out, mosque, toilet, food, iftar, rain, wind, crescent, sneeze, anger, distress, majlis, calamity, sick, dream

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: LocalizedStringResource("mawaqif.type"))
    static var caseDisplayRepresentations: [MawaqifSituation: DisplayRepresentation] = [
        .travel: DisplayRepresentation(title: LocalizedStringResource("mawaqif.travel")),
        .sleep: DisplayRepresentation(title: LocalizedStringResource("mawaqif.sleep")),
        .waking: DisplayRepresentation(title: LocalizedStringResource("mawaqif.waking")),
        .home_in: DisplayRepresentation(title: LocalizedStringResource("mawaqif.home_in")),
        .home_out: DisplayRepresentation(title: LocalizedStringResource("mawaqif.home_out")),
        .mosque: DisplayRepresentation(title: LocalizedStringResource("mawaqif.mosque")),
        .toilet: DisplayRepresentation(title: LocalizedStringResource("mawaqif.toilet")),
        .food: DisplayRepresentation(title: LocalizedStringResource("mawaqif.food")),
        .iftar: DisplayRepresentation(title: LocalizedStringResource("mawaqif.iftar")),
        .rain: DisplayRepresentation(title: LocalizedStringResource("mawaqif.rain")),
        .wind: DisplayRepresentation(title: LocalizedStringResource("mawaqif.wind")),
        .crescent: DisplayRepresentation(title: LocalizedStringResource("mawaqif.crescent")),
        .sneeze: DisplayRepresentation(title: LocalizedStringResource("mawaqif.sneeze")),
        .anger: DisplayRepresentation(title: LocalizedStringResource("mawaqif.anger")),
        .distress: DisplayRepresentation(title: LocalizedStringResource("mawaqif.distress")),
        .majlis: DisplayRepresentation(title: LocalizedStringResource("mawaqif.majlis")),
        .calamity: DisplayRepresentation(title: LocalizedStringResource("mawaqif.calamity")),
        .sick: DisplayRepresentation(title: LocalizedStringResource("mawaqif.sick")),
        .dream: DisplayRepresentation(title: LocalizedStringResource("mawaqif.dream")),
    ]
}

@available(iOS 16.0, *)
struct OpenMawaqifIntent: AppIntent {
    static var title = LocalizedStringResource("mawaqif.intent.title")
    static var description = IntentDescription(LocalizedStringResource("mawaqif.intent.description"))
    static var openAppWhenRun = true

    @Parameter(title: LocalizedStringResource("mawaqif.type"))
    var situation: MawaqifSituation

    init() {}
    init(situation: MawaqifSituation) {
        self.situation = situation
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        if let url = URL(string: "imuslim://mawaqif/\(situation.rawValue)") {
            await UIApplication.shared.open(url)
        }
        return .result()
    }
}

@available(iOS 16.0, *)
struct MawaqifShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: OpenMawaqifIntent(situation: .travel), phrases: ["Travel prayer in \(.applicationName)"], shortTitle: "mawaqif.travel", systemImageName: "car")
        AppShortcut(intent: OpenMawaqifIntent(situation: .sleep), phrases: ["Sleep adhkar in \(.applicationName)"], shortTitle: "mawaqif.sleep", systemImageName: "moon")
        AppShortcut(intent: OpenMawaqifIntent(situation: .waking), phrases: ["Waking adhkar in \(.applicationName)"], shortTitle: "mawaqif.waking", systemImageName: "sunrise")
        AppShortcut(intent: OpenMawaqifIntent(situation: .home_in), phrases: ["Entering home in \(.applicationName)"], shortTitle: "mawaqif.home_in", systemImageName: "house")
        AppShortcut(intent: OpenMawaqifIntent(situation: .home_out), phrases: ["Leaving home in \(.applicationName)"], shortTitle: "mawaqif.home_out", systemImageName: "door.left.hand.open")
        AppShortcut(intent: OpenMawaqifIntent(situation: .mosque), phrases: ["Mosque adhkar in \(.applicationName)"], shortTitle: "mawaqif.mosque", systemImageName: "building.columns")
        AppShortcut(intent: OpenMawaqifIntent(situation: .food), phrases: ["Food adhkar in \(.applicationName)"], shortTitle: "mawaqif.food", systemImageName: "fork.knife")
    }
}
#endif

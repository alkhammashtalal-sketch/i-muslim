import AppIntents
import Foundation

// The iOS 18 controls «المسبحة»، «أذكار الوقت»، «القبلة» (add-on 0072-add18 §3.2): buttons on the Lock Screen (in
// place of the flashlight and camera), in Control Center, or on the Action button, each opening its page in the app.
// Apple: an OpenIntent opens the app, and its target membership must be both the app and the widget extension; its
// perform() runs in the app, which opens the page through its own link imuslim://… (as the widgets and the Siri
// shortcuts do; web/src/native/NativeDevice.tsx). «أذكار الوقت» is the morning's from Fajr and the evening's from Asr,
// by the times the app wrote for the widgets (widgets.json), as the adhkar widget chooses.

@available(iOS 16.0, *)
enum MuslimPage: String, AppEnum {
    case tasbih, adhkar, qibla

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Page")
    static var caseDisplayRepresentations: [MuslimPage: DisplayRepresentation] = [
        .tasbih: DisplayRepresentation(title: "Tasbih"),
        .adhkar: DisplayRepresentation(title: "Adhkar of the time"),
        .qibla: DisplayRepresentation(title: "Qibla"),
    ]
}

@available(iOS 16.0, *)
/// Set by the app at launch (AppDelegate): how its process opens one of its links. Nil in the widget extension, which
/// never runs this intent (the system runs an OpenIntent in the app).
enum MuslimRouter {
    static var open: ((URL) -> Void)?

    /// The page of a control, now.
    static func url(_ page: MuslimPage, now: Date = Date()) -> URL? {
        switch page {
        case .tasbih: return URL(string: "imuslim://today/tasbih")
        case .qibla: return URL(string: "imuslim://today/qibla")
        case .adhkar: return URL(string: AdhkarOfTheTime.url(now: now))
        }
    }
}

@available(iOS 16.0, *)
/// The few fields of widgets.json that choose the adhkar of the time (WidgetData.swift is the whole contract).
enum AdhkarOfTheTime {
    private struct File: Decodable {
        struct Time: Decodable { var key: String; var at: Double }
        struct Day: Decodable { var start: Double; var end: Double; var times: [Time] }
        struct Part: Decodable { var url: String }
        struct Adhkar: Decodable { var morning: Part; var evening: Part }
        var days: [Day]
        var adhkar: Adhkar
    }

    static func url(now: Date) -> String {
        guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.alkhammashtalal.imuslim"),
              let d = try? Data(contentsOf: dir.appendingPathComponent("widgets.json")),
              let f = try? JSONDecoder().decode(File.self, from: d)
        else { return "imuslim://today/adhkar" }
        let t = now.timeIntervalSince1970 * 1000
        guard let day = f.days.first(where: { $0.start <= t && t < $0.end }) else { return "imuslim://today/adhkar" }
        if let fajr = day.times.first(where: { $0.key == "fajr" })?.at, let asr = day.times.first(where: { $0.key == "asr" })?.at {
            return t >= fajr && t < asr ? f.adhkar.morning.url : f.adhkar.evening.url
        }
        return t < day.start + 12 * 3_600_000 ? f.adhkar.morning.url : f.adhkar.evening.url
    }
}

@available(iOS 16.0, *)
struct OpenMuslimPageIntent: OpenIntent {
    static let title: LocalizedStringResource = "Open a page of Muslim"
    static let isDiscoverable: Bool = false

    @Parameter(title: "Page")
    var target: MuslimPage

    init() {}
    init(_ page: MuslimPage) {
        self.target = page
    }

    @MainActor
    func perform() async throws -> some IntentResult {
        if let url = MuslimRouter.url(target) { MuslimRouter.open?(url) }
        return .result()
    }
}

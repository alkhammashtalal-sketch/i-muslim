import SwiftUI
import WidgetKit

// The eight widgets of «مسلم» (reply 0046; the eighth, «أذكار المواقف», reply 0051), each its own widget as the reply's table: their kinds, families, gallery
// names, timelines and the page each opens. The content is in Views.swift; the data is the app's (WidgetData.swift),
// read from the App Group. No network anywhere here.

enum MuslimKind {
    static let next = "MuslimNextPrayer"
    static let times = "MuslimTodayTimes"
    static let date = "MuslimDate"
    static let ayah = "MuslimAyah"
    static let hadith = "MuslimHadith"
    static let tasbih = "MuslimTasbih"
    static let adhkar = "MuslimAdhkar"
    static let mawaqif = "MuslimMawaqif"
}

/// The gallery's keys of the widgets (the data's labels.names).
enum MuslimKindName {
    static let mawaqif = "mawaqif"
}

@main
struct MuslimWidgetsBundle: WidgetBundle {
    var body: some Widget {
        NextPrayerWidget()
        TodayTimesWidget()
        DateWidget()
        AyahWidget()
        HadithWidget()
        TasbihWidget()
        AdhkarWidget()
        MawaqifWidget()
    }
}

// MARK: - The gallery's names: the app's language from the data, else the built-in table

enum Gallery {
    /// Read once per launch of the extension: kind → [name, desc].
    static let stored: [String: [String]] = {
        guard let names = WidgetStore.load()?.labels.names else { return [:] }
        return names.mapValues { [$0.name, $0.desc] }
    }()

    static func name(_ kind: String) -> String { text(kind, 0) }
    static func desc(_ kind: String) -> String { text(kind, 1) }

    private static func text(_ kind: String, _ i: Int) -> String {
        if let v = stored[kind], v.count > i, !v[i].isEmpty { return v[i] }
        let table = MWFallback.table[MWFallback.lang] ?? MWFallback.table["ar"]
        return table?.names[kind]?[i] ?? ""
    }
}

// MARK: - Timelines

struct MuslimEntry: TimelineEntry {
    let date: Date
    let data: WidgetData?
}

enum Schedule { case prayer, daily, adhkar, tasbih }

struct MuslimProvider: TimelineProvider {
    let schedule: Schedule

    func placeholder(in context: Context) -> MuslimEntry {
        MuslimEntry(date: Date(), data: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (MuslimEntry) -> Void) {
        completion(MuslimEntry(date: Date(), data: WidgetStore.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MuslimEntry>) -> Void) {
        let data = WidgetStore.load()
        let now = Date()
        var fine = false
        if #available(iOS 16.0, *) { fine = context.family == .accessoryCircular }
        let dates = MuslimProvider.dates(schedule, data: data, now: now, fineRing: fine)
        let entries = dates.map { MuslimEntry(date: $0, data: data) }
        let policy: TimelineReloadPolicy
        switch schedule {
        case .tasbih:
            policy = .never                                         // the intent and the app reload it
        default:
            if let last = dates.last, last > now {
                policy = .after(last)
            } else {
                policy = .after(now.addingTimeInterval(6 * 3600))
            }
        }
        completion(Timeline(entries: entries, policy: policy))
    }

    /// When the widget changes on its own: now, then each time and day start ahead (the countdown itself is live).
    static func dates(_ schedule: Schedule, data: WidgetData?, now: Date, fineRing: Bool) -> [Date] {
        var out: [Double] = [now.ms]
        guard let data = data, schedule != .tasbih else { return [now] }
        let t0 = now.ms
        let hour = 3_600_000.0
        switch schedule {
        case .prayer:
            let horizon = t0 + 36 * hour
            for day in data.days where day.end > t0 && day.start < horizon {
                if day.start > t0 { out.append(day.start) }
                for t in day.times where t.at > t0 && t.at < horizon { out.append(t.at) }
            }
            if fineRing {
                // The lock screen's ring moves every quarter hour for twelve hours.
                var t = (t0 / (15 * 60_000)).rounded(.down) * 15 * 60_000 + 15 * 60_000
                while t < t0 + 12 * hour { out.append(t); t += 15 * 60_000 }
            }
        case .daily:
            for day in data.days where day.start > t0 {
                out.append(day.start)
                if out.count > 3 { break }
            }
        case .adhkar:
            let horizon = t0 + 36 * hour
            for day in data.days where day.end > t0 && day.start < horizon {
                if day.start > t0 { out.append(day.start) }
                for t in day.times where (t.key == "fajr" || t.key == "asr") && t.at > t0 && t.at < horizon {
                    out.append(t.at)
                }
                if day.times.isEmpty {
                    let noon = day.start + 12 * hour                // no city yet: the morning's until noon
                    if noon > t0 { out.append(noon) }
                }
            }
        case .tasbih:
            break
        }
        let sorted = Array(Set(out)).sorted()
        return sorted.prefix(120).map { Date(ms: $0) }
    }
}

// MARK: - Container background and margins (iOS 17)

extension View {
    /// iOS 17 asks every widget for its container background; the views paint their own ground edge to edge.
    @ViewBuilder func muslimBackground(_ color: Color) -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(for: .widget) { color }
        } else {
            self
        }
    }

    func muslimURL(_ string: String) -> some View {
        widgetURL(URL(string: string))
    }
}

extension WidgetConfiguration {
    /// The board's grounds reach the edges; iOS 17's default content margins are off.
    func muslimNoMargins() -> some WidgetConfiguration {
        if #available(iOS 17.0, *) {
            return self.contentMarginsDisabled()
        } else {
            return self
        }
    }
}

// MARK: - 1. The next prayer: small on the home screen, and the lock screen's line, rectangle and circle

struct NextPrayerWidget: Widget {
    static var families: [WidgetFamily] {
        if #available(iOS 16.0, *) {
            return [.systemSmall, .accessoryInline, .accessoryRectangular, .accessoryCircular]
        }
        return [.systemSmall]
    }

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: MuslimKind.next, provider: MuslimProvider(schedule: .prayer)) { entry in
            NextPrayerEntryView(entry: entry)
        }
        .configurationDisplayName(Gallery.name("next"))
        .description(Gallery.desc("next"))
        .supportedFamilies(NextPrayerWidget.families)
        .muslimNoMargins()
    }
}

struct NextPrayerEntryView: View {
    var entry: MuslimEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        let url = PrayerState.resolve(entry.data, entry.date).url
        lockOrHome
            .muslimURL(url)
    }

    @ViewBuilder private var lockOrHome: some View {
        if #available(iOS 16.0, *), family == .accessoryInline {
            NextPrayerView(data: entry.data, date: entry.date, family: .inline)
                .muslimBackground(.clear)
        } else if #available(iOS 16.0, *), family == .accessoryRectangular {
            NextPrayerView(data: entry.data, date: entry.date, family: .rectangular)
                .muslimBackground(.clear)
        } else if #available(iOS 16.0, *), family == .accessoryCircular {
            NextPrayerView(data: entry.data, date: entry.date, family: .circular)
                .lockCircleBackground()
        } else {
            NextPrayerView(data: entry.data, date: entry.date, family: .small)
                .muslimBackground(MW.skyMid)
        }
    }
}

extension View {
    /// The circle's system disc behind the ring (iOS 16), as the container background on iOS 17.
    @available(iOS 16.0, *)
    @ViewBuilder func lockCircleBackground() -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(for: .widget) { AccessoryWidgetBackground() }
        } else {
            self.background(AccessoryWidgetBackground())
        }
    }
}

// MARK: - 2. Today's times (large)

struct TodayTimesWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: MuslimKind.times, provider: MuslimProvider(schedule: .prayer)) { entry in
            TodayTimesView(data: entry.data, date: entry.date)
                .muslimBackground(MW.paperBase)
                .muslimURL(PrayerState.resolve(entry.data, entry.date).url)
        }
        .configurationDisplayName(Gallery.name("times"))
        .description(Gallery.desc("times"))
        .supportedFamilies([.systemLarge])
        .muslimNoMargins()
    }
}

// MARK: - 3. The date (small)

struct DateWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: MuslimKind.date, provider: MuslimProvider(schedule: .daily)) { entry in
            DateView(data: entry.data, date: entry.date)
                .muslimBackground(MW.skyMid)
                .muslimURL(entry.data?.day(at: entry.date) != nil ? "imuslim://today/calendar" : "imuslim://today")
        }
        .configurationDisplayName(Gallery.name("date"))
        .description(Gallery.desc("date"))
        .supportedFamilies([.systemSmall])
        .muslimNoMargins()
    }
}

// MARK: - 4. The ayah of the day (medium)

struct AyahWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: MuslimKind.ayah, provider: MuslimProvider(schedule: .daily)) { entry in
            AyahView(data: entry.data, date: entry.date)
                .muslimBackground(MW.paperBase)
                .muslimURL(entry.data?.day(at: entry.date)?.ayah?.url ?? "imuslim://today")
        }
        .configurationDisplayName(Gallery.name("ayah"))
        .description(Gallery.desc("ayah"))
        .supportedFamilies([.systemMedium])
        .muslimNoMargins()
    }
}

// MARK: - 5. The hadith of the day (medium)

struct HadithWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: MuslimKind.hadith, provider: MuslimProvider(schedule: .daily)) { entry in
            HadithView(data: entry.data, date: entry.date)
                .muslimBackground(MW.paperBase)
                .muslimURL(entry.data?.day(at: entry.date)?.hadith?.url ?? "imuslim://today")
        }
        .configurationDisplayName(Gallery.name("hadith"))
        .description(Gallery.desc("hadith"))
        .supportedFamilies([.systemMedium])
        .muslimNoMargins()
    }
}

// MARK: - 6. The tasbih (small): «+١» counts in the widget on iOS 17, and opens the tasbih on iOS 15–16

struct TasbihWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: MuslimKind.tasbih, provider: MuslimProvider(schedule: .tasbih)) { entry in
            TasbihView(data: entry.data, date: entry.date) { label in
                if #available(iOS 17.0, *) {
                    Button(intent: IncrementTasbihIntent()) { label }
                        .buttonStyle(.plain)
                } else {
                    label
                }
            }
            .muslimBackground(MW.skyMid)
            .muslimURL(entry.data == nil ? "imuslim://today" : "imuslim://today/tasbih")
        }
        .configurationDisplayName(Gallery.name("tasbih"))
        .description(Gallery.desc("tasbih"))
        .supportedFamilies([.systemSmall])
        .muslimNoMargins()
    }
}

// MARK: - 7. The adhkar of the time (small)

struct AdhkarWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: MuslimKind.adhkar, provider: MuslimProvider(schedule: .adhkar)) { entry in
            AdhkarView(data: entry.data, date: entry.date)
                .muslimBackground(MW.paperBase)
                .muslimURL(entry.data.flatMap { AdhkarNow.part($0, entry.date)?.part.url } ?? "imuslim://today")
        }
        .configurationDisplayName(Gallery.name("adhkar"))
        .description(Gallery.desc("adhkar"))
        .supportedFamilies([.systemSmall])
        .muslimNoMargins()
    }
}

// MARK: - 8. «أذكار المواقف» (large, reply 0051): eight buttons, each opening its situation in the app

struct MawaqifWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: MuslimKind.mawaqif, provider: MuslimProvider(schedule: .daily)) { entry in
            MawaqifView(data: entry.data)
                .muslimBackground(MW.paperBase)
                .muslimURL("imuslim://mawaqif")
        }
        .configurationDisplayName(Gallery.name(MuslimKindName.mawaqif))
        .description(Gallery.desc(MuslimKindName.mawaqif))
        .supportedFamilies([.systemLarge])
        .muslimNoMargins()
    }
}

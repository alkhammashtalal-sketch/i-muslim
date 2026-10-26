import SwiftUI
import WidgetKit

// The widgets of «مسلم» (reply 0046; the eighth, «أذكار المواقف», reply 0051; «اسم الله لليوم» and «من أقوال السلف»,
// add-on 0072-add10), each its own widget as the reply's table: their kinds, families, gallery
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
    static let name = "MuslimNameOfDay"
    static let salaf = "MuslimSalaf"
    /// The iOS 18 controls (add-ons 0072-add18 §3.2, 0072-add19 §2).
    static let tasbihControl = "MuslimTasbihCountControl"
    static let tasbihPageControl = "MuslimTasbihControl"
    static let adhkarControl = "MuslimAdhkarControl"
    static let qiblaControl = "MuslimQiblaControl"
}

/// The gallery's keys of the widgets (the data's labels.names).
enum MuslimKindName {
    static let mawaqif = "mawaqif"
    static let name = "name"
    static let salaf = "salaf"
    static let ctlCount = "ctlCount"
    static let ctlTasbih = "ctlTasbih"
    static let ctlAdhkar = "ctlAdhkar"
    static let ctlQibla = "ctlQibla"
}

@main
struct MuslimWidgetsBundle: WidgetBundle {
    var body: some Widget {
        MuslimHomeWidgets().body
        // «جلسة تسبيح بعد الصلاة» (add-on 0072-add19 §3): ActivityKit's content API is iOS 16.2.
        if #available(iOS 16.2, *) {
            TasbihSessionActivity()
            // The iftar and suhoor countdown (add-on 0072-add34 §ب8; FastingViews.swift).
            FastingCountdownActivity()
        }
        // The controls of iOS 18 (Lock Screen, Control Center, the Action button); nothing changes before iOS 18.
        if #available(iOS 18.0, *) {
            MuslimControls().body
        }
    }
}

/// The ten widgets of replies 0046 and 0051 and add-on 0072-add10, in the gallery's order.
struct MuslimHomeWidgets: WidgetBundle {
    var body: some Widget {
        NextPrayerWidget()
        TodayTimesWidget()
        DateWidget()
        AyahWidget()
        HadithWidget()
        TasbihWidget()
        AdhkarWidget()
        MawaqifWidget()
        NameOfDayWidget()
        SalafWidget()
    }
}

@available(iOS 18.0, *)
struct MuslimControls: WidgetBundle {
    var body: some Widget {
        TasbihCountControl()
        TasbihPageControl()
        AdhkarPageControl()
        QiblaControl()
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
        return table?.names[kind]?[i] ?? MWFallback.controls[MWFallback.lang]?[kind]?[i] ?? MWFallback.controls["en"]?[kind]?[i] ?? ""
    }
}

// MARK: - Timelines

struct MuslimEntry: TimelineEntry {
    let date: Date
    let data: WidgetData?
}

enum Schedule { case prayer, daily, adhkar, tasbih, name, salaf }

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
        case .name:
            // Each Riyadh day's name, and the sky's six states of the place's days (add-on 0071-add16): the light moves
            // with the prayer times, every entry known ahead, nothing asked of the network.
            let horizon = t0 + 48 * hour
            for d in data.nameDays ?? [] where d.start > t0 && d.start < horizon { out.append(d.start) }
            for day in data.days where day.end > t0 && day.start < horizon {
                for k in day.sky ?? [] where k.at > t0 && k.at < horizon { out.append(k.at) }
                if day.start > t0 { out.append(day.start) }
            }
        case .salaf:
            for d in data.salafDays ?? [] where d.start > t0 {
                out.append(d.start)
                if out.count > 3 { break }
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

// MARK: - 6. The tasbih: small on the home screen; the Lock Screen's circle and rectangle (add-on 0072-add19 §1).
// «+١» counts in the widget on iOS 17, and opens the tasbih on iOS 15–16.

struct TasbihWidget: Widget {
    static var families: [WidgetFamily] {
        if #available(iOS 16.0, *) {
            return [.systemSmall, .accessoryCircular, .accessoryRectangular]
        }
        return [.systemSmall]
    }

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: MuslimKind.tasbih, provider: MuslimProvider(schedule: .tasbih)) { entry in
            TasbihEntryView(entry: entry)
        }
        .configurationDisplayName(Gallery.name("tasbih"))
        .description(Gallery.desc("tasbih"))
        .supportedFamilies(TasbihWidget.families)
        .muslimNoMargins()
    }
}

// MARK: - 7. The adhkar of the time (small)

struct AdhkarWidget: Widget {
    /// The Lock Screen's rectangle «الأذكار» (add-on 0072-add18 §3.1) joins the small one.
    static var families: [WidgetFamily] {
        if #available(iOS 16.0, *) {
            return [.systemSmall, .accessoryRectangular]
        }
        return [.systemSmall]
    }

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: MuslimKind.adhkar, provider: MuslimProvider(schedule: .adhkar)) { entry in
            AdhkarEntryView(entry: entry)
        }
        .configurationDisplayName(Gallery.name("adhkar"))
        .description(Gallery.desc("adhkar"))
        .supportedFamilies(AdhkarWidget.families)
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

// MARK: - 9. «اسم الله لليوم» (add-on 0072-add10 §1): small, medium, large; the lock screen's rectangle and line

struct NameOfDayWidget: Widget {
    static var families: [WidgetFamily] {
        if #available(iOS 16.0, *) {
            return [.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryInline]
        }
        return [.systemSmall, .systemMedium, .systemLarge]
    }

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: MuslimKind.name, provider: MuslimProvider(schedule: .name)) { entry in
            NameOfDayEntryView(entry: entry)
        }
        .configurationDisplayName(Gallery.name(MuslimKindName.name))
        .description(Gallery.desc(MuslimKindName.name))
        .supportedFamilies(NameOfDayWidget.families)
        .muslimNoMargins()
    }
}

struct NameOfDayEntryView: View {
    var entry: MuslimEntry
    @Environment(\.widgetFamily) private var family

    private var day: WidgetData.NameDay? { NameNow.name(entry.data, entry.date) }
    /// The pages and the buttons need iOS 17's App Intents; before it, the first page and a tap to the name's page.
    private var interactive: Bool {
        if #available(iOS 17.0, *) { return true }
        return false
    }

    var body: some View {
        content
            .muslimURL(day?.url ?? "imuslim://today")
    }

    @ViewBuilder private var content: some View {
        if #available(iOS 16.0, *), family == .accessoryRectangular {
            NameRectangularView(data: entry.data, date: entry.date)
                .muslimBackground(.clear)
        } else if #available(iOS 16.0, *), family == .accessoryInline {
            NameInlineView(data: entry.data, date: entry.date)
                .muslimBackground(.clear)
        } else if family == .systemSmall {
            ModeReader { NameSmallView(data: entry.data, date: entry.date) }
                .nameSmallBackground(entry)
        } else if family == .systemMedium {
            ModeReader {
                NameMediumView(data: entry.data, date: entry.date, interactive: interactive, page: page("medium")) { label in
                    nextButton(label, family: "medium", pages: day.map { NameNow.mediumPages($0).count } ?? 0)
                }
            }
            .muslimBackground(MW.paperBase)
        } else {
            ModeReader {
                NameLargeView(data: entry.data, date: entry.date, interactive: interactive, page: page("large")) { label in
                    nextButton(label, family: "large", pages: day?.pages.count ?? 0)
                }
            }
            .muslimBackground(MW.paperBase)
        }
    }

    private func page(_ family: String) -> Int {
        guard let day = day else { return 0 }
        return NamePageStore.page(day: day.day, family: family)
    }

    @ViewBuilder private func nextButton(_ label: NamePill, family: String, pages: Int) -> some View {
        if #available(iOS 17.0, *), let day = day {
            Button(intent: NextNamePageIntent(day: day.day, family: family, pages: pages)) { label }
                .buttonStyle(.plain)
        } else {
            label
        }
    }
}

/// The system's rendering mode and container background, handed to the views as plain values (NameViews.swift), so
/// the same views render for the screenshots.
struct ModeReader<Content: View>: View {
    var content: () -> Content
    init(@ViewBuilder content: @escaping () -> Content) { self.content = content }

    @Environment(\.showsWidgetContainerBackground) private var showsBackground

    var body: some View {
        if #available(iOS 16.0, *) {
            ModeReader16(showsBackground: showsBackground, content: content)
        } else {
            content()
        }
    }
}

@available(iOS 16.0, *)
private struct ModeReader16<Content: View>: View {
    var showsBackground: Bool
    var content: () -> Content
    @Environment(\.widgetRenderingMode) private var mode

    var body: some View {
        content()
            .environment(\.mwFullColor, mode == .fullColor)
            .environment(\.mwShowsBackground, showsBackground)
    }
}

extension View {
    /// The small widget's sky is its container background, which StandBy and the accented modes may take away.
    @ViewBuilder func nameSmallBackground(_ entry: MuslimEntry) -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(for: .widget) { NameSmallBackground(data: entry.data, date: entry.date) }
        } else {
            self.background(NameSmallBackground(data: entry.data, date: entry.date))
        }
    }
}

// MARK: - 10. «من أقوال السلف» (add-on 0072-add10 §2): medium and large, Arabic

struct SalafWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: MuslimKind.salaf, provider: MuslimProvider(schedule: .salaf)) { entry in
            SalafEntryView(entry: entry)
        }
        .configurationDisplayName(Gallery.name(MuslimKindName.salaf))
        .description(Gallery.desc(MuslimKindName.salaf))
        .supportedFamilies([.systemMedium, .systemLarge])
        .muslimNoMargins()
    }
}

struct SalafEntryView: View {
    var entry: MuslimEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        ModeReader { SalafView(data: entry.data, date: entry.date, family: family == .systemLarge ? .large : .medium) }
            .muslimBackground(MW.paperBase)
            .muslimURL(NameNow.salaf(entry.data, entry.date)?.appUrl ?? "imuslim://today")
    }
}

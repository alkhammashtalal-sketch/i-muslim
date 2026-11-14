import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// The Lock Screen's widgets' entry views, the iOS 18 controls and the Live Activity (add-ons 0072-add18 §3,
// 0072-add19). Their views are in LockViews.swift; the shared counter is the App Group's widgets.json, the same the
// app, the home-screen widget and every button count in (TasbihIntent.swift).

// MARK: - The tasbih widget on the Lock Screen (iOS 16 to show, iOS 17 to count)

struct TasbihEntryView: View {
    var entry: MuslimEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        content.muslimURL(entry.data == nil ? "imuslim://today" : "imuslim://today/tasbih")
    }

    @ViewBuilder private var content: some View {
        if #available(iOS 16.0, *), family == .accessoryCircular {
            plus { TasbihCircularView(data: entry.data) }
                .lockCircleBackground()
        } else if #available(iOS 16.0, *), family == .accessoryRectangular {
            plus { TasbihRectangularView(data: entry.data) }
                .muslimBackground(.clear)
        } else {
            TasbihView(data: entry.data, date: entry.date) { label in
                if #available(iOS 17.0, *) {
                    Button(intent: IncrementTasbihIntent()) { label }
                        .buttonStyle(.plain)
                } else {
                    label
                }
            }
            .muslimBackground(MW.skyMid)
        }
    }

    /// The whole widget is «+١» on iOS 17 (the App Intent counts in the App Group, the app not opened); on iOS 16 a tap
    /// opens the tasbih page.
    @ViewBuilder private func plus<V: View>(@ViewBuilder _ v: () -> V) -> some View {
        if #available(iOS 17.0, *), entry.data != nil {
            Button(intent: IncrementTasbihIntent()) { v() }
                .buttonStyle(.plain)
        } else {
            v()
        }
    }
}

// MARK: - The adhkar widget on the Lock Screen

struct AdhkarEntryView: View {
    var entry: MuslimEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        content.muslimURL(entry.data.flatMap { AdhkarNow.part($0, entry.date)?.part.url } ?? "imuslim://today")
    }

    @ViewBuilder private var content: some View {
        if #available(iOS 16.0, *), family == .accessoryRectangular {
            AdhkarRectangularView(data: entry.data, date: entry.date)
                .muslimBackground(.clear)
        } else {
            AdhkarView(data: entry.data, date: entry.date)
                .muslimBackground(MW.paperBase)
        }
    }
}

// MARK: - iOS 18 controls: «سبّح», «المسبحة», «أذكار الوقت», «القبلة»

/// The name of a control in the app's language (the data's labels.names, else the built-in table).
@available(iOS 16.0, *)
private func controlName(_ key: String) -> LocalizedStringResource {
    LocalizedStringResource(stringLiteral: Gallery.name(key))
}

@available(iOS 18.0, *)
struct TasbihCountValue: ControlValueProvider {
    /// «سبّح ١٢»: the title Control Center shows at its larger sizes (the Lock Screen shows the symbol alone).
    var previewValue: String { Gallery.name(MuslimKindName.ctlCount) }

    func currentValue() async throws -> String {
        let name = Gallery.name(MuslimKindName.ctlCount)
        guard let t = WidgetStore.load()?.tasbih, let now = TasbihNow.of(t) else { return name }
        let today = t.day == TasbihCount.today()
        return "\(name) \(MWDigits.write(today ? now.n : 0, t.digits))"
    }
}

/// «سبّح»: each press counts one in the shared counter, the app not opened.
@available(iOS 18.0, *)
struct TasbihCountControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(kind: MuslimKind.tasbihControl, provider: TasbihCountValue()) { title in
            ControlWidgetButton(action: IncrementTasbihIntent()) {
                Label(title, systemImage: "plus.circle")
            }
        }
        .displayName(controlName(MuslimKindName.ctlCount))
        .description(LocalizedStringResource(stringLiteral: Gallery.desc(MuslimKindName.ctlCount)))
    }
}

/// A control that opens one page of the app (OpenMuslimPageIntent, in the app and the extension both).
@available(iOS 18.0, *)
func openPageControl(kind: String, page: MuslimPage, key: String, symbol: String) -> some ControlWidgetConfiguration {
    StaticControlConfiguration(kind: kind) {
        ControlWidgetButton(action: OpenMuslimPageIntent(page)) {
            Label(Gallery.name(key), systemImage: symbol)
        }
    }
    .displayName(controlName(key))
    .description(LocalizedStringResource(stringLiteral: Gallery.desc(key)))
}

/// «المسبحة»
@available(iOS 18.0, *)
struct TasbihPageControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        openPageControl(kind: MuslimKind.tasbihPageControl, page: .tasbih, key: MuslimKindName.ctlTasbih, symbol: "circle.dotted")
    }
}

/// «أذكار الوقت»: the morning's from Fajr, the evening's from Asr.
@available(iOS 18.0, *)
struct AdhkarPageControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        openPageControl(kind: MuslimKind.adhkarControl, page: .adhkar, key: MuslimKindName.ctlAdhkar, symbol: "sun.horizon")
    }
}

/// «القبلة»
@available(iOS 18.0, *)
struct QiblaControl: ControlWidget {
    var body: some ControlWidgetConfiguration {
        openPageControl(kind: MuslimKind.qiblaControl, page: .qibla, key: MuslimKindName.ctlQibla, symbol: "location.north.line")
    }
}

// MARK: - «جلسة تسبيح بعد الصلاة» (Live Activity)

@available(iOS 16.2, *)
extension SessionModel {
    init(_ a: TasbihSessionAttributes, _ s: TasbihSessionAttributes.ContentState) {
        self.init(title: a.title, steps: a.steps.map { ($0.zikr, $0.target) }, step: s.step, n: s.n, done: s.done,
                  source: a.source, doneText: a.doneText, digits: a.digits, rtl: a.rtl)
    }
}

@available(iOS 16.2, *)
struct TasbihSessionActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: TasbihSessionAttributes.self) { context in
            SessionCardView(m: SessionModel(context.attributes, context.state)) { label in sessionPlus(label) }
                .activityBackgroundTint(MW.skyMid)
                .activitySystemActionForegroundColor(MW.paper)
                .widgetURL(URL(string: "imuslim://today/tasbih"))
        } dynamicIsland: { context in
            let m = SessionModel(context.attributes, context.state)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.center) { SessionExpandedCenter(m: m) }
                DynamicIslandExpandedRegion(.bottom) { SessionExpandedBottom(m: m) { label in sessionPlus(label) } }
            } compactLeading: {
                SessionCompactLeading(m: m)
            } compactTrailing: {
                SessionCompactTrailing(m: m)
            } minimal: {
                SessionCompactLeading(m: m)
            }
            .widgetURL(URL(string: "imuslim://today/tasbih"))
        }
    }
}

/// «+١» in the card and the Island counts without opening the app (iOS 17); on iOS 16 the card opens the tasbih.
@available(iOS 16.2, *)
@ViewBuilder func sessionPlus(_ label: SessionPlusLabel) -> some View {
    if #available(iOS 17.0, *) {
        Button(intent: TasbihSessionTapIntent()) { label }
            .buttonStyle(.plain)
    } else {
        label
    }
}

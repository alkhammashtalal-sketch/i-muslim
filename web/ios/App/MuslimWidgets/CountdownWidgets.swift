import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// «عدّاد الصلاة القادمة» (add-on 0072-add34 §ب7) in the widget extension: the Live Activity (iOS 16.2), and the
// «عدّاد الصلاة» control (iOS 18) whose press starts it without opening the app, as Apple's own example has it: «you
// might create a control that people place in Control Center. The control could use a LiveActivityIntent and starts the
// Live Activity in the intent's perform() method» (Displaying live data with Live Activities). The views:
// CountdownViews.swift; the activity, its intent and its words: Shared/PrayerCountdown.swift.

@available(iOS 16.2, *)
extension CountdownModel {
    init(_ a: PrayerCountdownAttributes, _ s: PrayerCountdownAttributes.ContentState, stale: Bool) {
        self.init(title: a.title, place: a.place, name: s.name, text: s.text, nowText: PrayerPlan.fill(a.nowFormat, s.name),
                  start: s.start, at: s.at, stale: stale || s.at <= Date(), digits: a.digits, rtl: a.rtl)
    }
}

@available(iOS 16.2, *)
struct PrayerCountdownActivity: Widget {
    static let url = URL(string: "imuslim://today/times")

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: PrayerCountdownAttributes.self) { context in
            CountdownCardView(m: CountdownModel(context.attributes, context.state, stale: context.isStale))
                .activityBackgroundTint(MW.skyMid)
                .activitySystemActionForegroundColor(MW.paper)
                .widgetURL(Self.url)
        } dynamicIsland: { context in
            let m = CountdownModel(context.attributes, context.state, stale: context.isStale)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) { CountdownExpandedLeading(m: m).padding(.leading, 4) }
                DynamicIslandExpandedRegion(.trailing) { CountdownExpandedTrailing(m: m).padding(.trailing, 4) }
                DynamicIslandExpandedRegion(.bottom) { CountdownExpandedBottom(m: m) }
            } compactLeading: {
                CountdownCompactLeading(m: m)
            } compactTrailing: {
                CountdownCompactTrailing(m: m)
            } minimal: {
                CountdownMinimal(m: m)
            }
            .widgetURL(Self.url)
        }
    }
}

/// «عدّاد الصلاة»: one press shows the countdown to the next prayer on the Lock Screen.
@available(iOS 18.0, *)
struct PrayerCountdownControl: ControlWidget {
    static let kind = "MuslimPrayerCountdownControl"

    var body: some ControlWidgetConfiguration {
        let w = CountdownText.of(PrayerPlan.load()?.lang)
        return StaticControlConfiguration(kind: Self.kind) {
            ControlWidgetButton(action: StartPrayerCountdownIntent()) {
                Label(w.control, systemImage: "timer")
            }
        }
        .displayName(LocalizedStringResource(stringLiteral: w.control))
        .description(LocalizedStringResource(stringLiteral: w.controlDesc))
    }
}

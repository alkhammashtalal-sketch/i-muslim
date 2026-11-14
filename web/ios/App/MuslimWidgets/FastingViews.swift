import ActivityKit
import AppIntents
import SwiftUI
import WidgetKit

// The iftar and suhoor countdown's Live Activity (add-on 0072-add34 §ب8; FastingCountdown.swift): on the Lock Screen
// a card, «يبقى على الإفطار» and the system's own count, then the prayer and its time; in the Dynamic Island the count.
// No updates: Text(timerInterval:) counts by itself, and once the time has come (the stale date) only the prayer and
// its time are shown. «أوقف» (iOS 17) ends it at once. The colours of «سماء» (Theme.swift), like the tasbih session.

@available(iOS 16.2, *)
struct FastingCountdownActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: FastingCountdownAttributes.self) { context in
            FastingCardView(a: context.attributes, target: context.state.target, stale: context.isStale)
                .activityBackgroundTint(MW.skyMid)
                .activitySystemActionForegroundColor(MW.paper)
                .widgetURL(URL(string: "imuslim://today/ramadan"))
        } dynamicIsland: { context in
            let a = context.attributes
            let target = context.state.target
            let stale = context.isStale
            return DynamicIsland {
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 2) {
                        Text(a.title)
                            .font(MWFont.plex(13, .semibold))
                            .foregroundColor(MW.gold2)
                            .lineLimit(1)
                        FastingTimer(a: a, target: target, stale: stale, size: 24)
                    }
                    .environment(\.layoutDirection, a.rtl ? .rightToLeft : .leftToRight)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack(spacing: 10) {
                        Text(a.at)
                            .font(MWFont.plex(12))
                            .foregroundColor(MW.paper.opacity(0.85))
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                        fastingStop(a.stop, small: true)
                    }
                    .environment(\.layoutDirection, a.rtl ? .rightToLeft : .leftToRight)
                }
            } compactLeading: {
                Image(systemName: "moon.stars.fill")
                    .foregroundColor(MW.gold2)
            } compactTrailing: {
                FastingTimer(a: a, target: target, stale: stale, size: 14)
                    .frame(maxWidth: 60)
            } minimal: {
                Image(systemName: "moon.fill")
                    .foregroundColor(MW.gold2)
            }
            .widgetURL(URL(string: "imuslim://today/ramadan"))
        }
    }
}

/// The count by the system, or the time alone once it has come. The lower bound is never after the target.
@available(iOS 16.2, *)
struct FastingTimer: View {
    var a: FastingCountdownAttributes
    var target: Date
    var stale: Bool
    var size: CGFloat

    var body: some View {
        Group {
            if stale || target <= Date() {
                Text(a.at)
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
            } else {
                Text(timerInterval: min(Date(), target)...target, countsDown: true)
                    .monospacedDigit()
                    .multilineTextAlignment(.center)
            }
        }
        .font(MWFont.plex(size, .bold))
        .foregroundColor(MW.countdown)
        .environment(\.locale, Locale(identifier: a.locale))
        .environment(\.layoutDirection, .leftToRight)
    }
}

/// The Lock Screen's card (and the banner on a phone without the Island).
@available(iOS 16.2, *)
struct FastingCardView: View {
    var a: FastingCountdownAttributes
    var target: Date
    var stale: Bool

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                if !stale {
                    Text(a.title)
                        .font(MWFont.plex(14, .semibold))
                        .foregroundColor(MW.gold2)
                        .lineLimit(1)
                }
                FastingTimer(a: a, target: target, stale: stale, size: 30)
                if !stale {
                    Text(a.at)
                        .font(MWFont.plex(12))
                        .foregroundColor(MW.paper.opacity(0.85))
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            fastingStop(a.stop, small: false)
        }
        .padding(16)
        .environment(\.layoutDirection, a.rtl ? .rightToLeft : .leftToRight)
    }
}

/// «أوقف» as a small round mark: the end intent on iOS 17; nothing before it (the card opens the page).
@available(iOS 16.2, *)
@ViewBuilder func fastingStop(_ label: String, small: Bool) -> some View {
    if #available(iOS 17.0, *) {
        Button(intent: FastingCountdownEndIntent()) {
            Image(systemName: "xmark")
                .font(.system(size: small ? 12 : 14, weight: .bold))
                .foregroundColor(MW.paper.opacity(0.9))
                .frame(width: small ? 28 : 34, height: small ? 28 : 34)
                .background(Circle().fill(Color.white.opacity(0.16)))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(Text(label))
    }
}

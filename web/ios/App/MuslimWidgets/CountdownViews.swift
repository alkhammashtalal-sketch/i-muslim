import SwiftUI

// «عدّاد الصلاة القادمة» (add-on 0072-add34 §ب7): the Live Activity's views, on plain values (no ActivityKit here), so
// the pictures' renderer draws the same views (web/scripts/countdown-render.swift). The countdown and its bar are the
// system's own live timers (Text(timerInterval:) and ProgressView(timerInterval:)): nothing updates them while they run,
// and at the prayer's time the card says «حان وقت …» (the activity's staleDate; CountdownWidgets.swift).

struct CountdownModel {
    var title: String           // «الصلاة القادمة»
    var place: String
    var name: String            // «العصر»
    var text: String            // «٣:٢٥ م»
    var nowText: String         // «حان وقت العصر»
    var start: Date
    var at: Date
    var stale: Bool
    var digits: String
    var rtl: Bool
    /// The pictures only (web/scripts/countdown-render.swift): the moment drawn, for the bar and the ring, which
    /// ImageRenderer cannot draw as live timers. Never set by the widget extension, so the phone shows the system's own.
    var still: Date? = nil

    /// The timer's span; never empty, so a card drawn after the time still lays out.
    var span: ClosedRange<Date> { start...max(at, start.addingTimeInterval(1)) }
    /// The system's timer writes the app's digits through a locale of that numbering system (as the lock widgets do).
    var locale: Locale { MWDigits.locale(digits) }
    var direction: LayoutDirection { rtl ? .rightToLeft : .leftToRight }
    /// How much of the span has passed at `t`, from 0 to 1.
    func passed(at t: Date) -> Double {
        let all = span.upperBound.timeIntervalSince(span.lowerBound)
        return min(1, max(0, t.timeIntervalSince(span.lowerBound) / all))
    }
}

@available(iOS 16.0, *)
struct CountdownTimerText: View {
    var m: CountdownModel
    var size: CGFloat
    var body: some View {
        Text(timerInterval: m.span, countsDown: true)
            .font(MWFont.plex(size, .bold))
            .monospacedDigit()
            .foregroundColor(MW.countdown)
            .lineLimit(1)
            .environment(\.locale, m.locale)
    }
}

/// The bar from the start to the prayer, filled by the system as time passes.
@available(iOS 16.0, *)
struct CountdownBar: View {
    var m: CountdownModel
    var body: some View {
        if let t = m.still {
            // The pictures: the same bar drawn at the moment shown (ImageRenderer draws no ProgressView).
            GeometryReader { g in
                ZStack(alignment: .leading) {
                    Capsule().fill(MW.paper.opacity(0.25))
                    Capsule().fill(MW.gold).frame(width: g.size.width * m.passed(at: t))
                }
            }
            .frame(height: 4)
            .environment(\.layoutDirection, m.direction)
        } else {
            ProgressView(timerInterval: m.span, countsDown: false) { EmptyView() } currentValueLabel: { EmptyView() }
                .progressViewStyle(.linear)
                .tint(MW.gold)
                .environment(\.layoutDirection, m.direction)
        }
    }
}

/// The card on the Lock Screen (and the banner on a phone without the Island).
@available(iOS 16.0, *)
struct CountdownCardView: View {
    var m: CountdownModel

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Text(m.title)
                    .font(MWFont.plex(13, .semibold))
                    .foregroundColor(MW.gold2)
                    .lineLimit(1)
                Spacer(minLength: 6)
                Text(m.place)
                    .font(MWFont.plex(12))
                    .foregroundColor(MW.paper.opacity(0.78))
                    .lineLimit(1)
            }
            if m.stale {
                Text(m.nowText)
                    .font(MWFont.plex(26, .bold))
                    .foregroundColor(MW.countdown)
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text(verbatim: "\(m.name) \(m.text)")
                    .font(MWFont.plex(15, .medium))
                    .foregroundColor(MW.paper.opacity(0.9))
                    .lineLimit(1)
            } else {
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    VStack(alignment: .leading, spacing: 0) {
                        Text(m.name)
                            .font(MWFont.plex(28, .bold))
                            .foregroundColor(MW.paper)
                            .lineLimit(1)
                            .minimumScaleFactor(0.5)
                        Text(m.text)
                            .font(MWFont.plex(16, .medium))
                            .foregroundColor(MW.paper.opacity(0.9))
                            .lineLimit(1)
                    }
                    Spacer(minLength: 8)
                    CountdownTimerText(m: m, size: 32)
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: 170, alignment: .trailing)
                }
                CountdownBar(m: m)
            }
        }
        .padding(16)
        .environment(\.layoutDirection, m.direction)
    }
}

/// The Dynamic Island's compact parts: the prayer's name leading, the countdown trailing.
@available(iOS 16.0, *)
struct CountdownCompactLeading: View {
    var m: CountdownModel
    var body: some View {
        Text(m.name)
            .font(MWFont.plex(14, .semibold))
            .foregroundColor(MW.gold2)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .frame(maxWidth: 64)
    }
}

@available(iOS 16.0, *)
struct CountdownCompactTrailing: View {
    var m: CountdownModel
    var body: some View {
        if m.stale {
            Image(systemName: "checkmark")
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(MW.countdown)
        } else {
            CountdownTimerText(m: m, size: 14)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 64)
        }
    }
}

/// The smallest form (another app's activity beside it): a ring that fills to the prayer.
@available(iOS 16.0, *)
struct CountdownMinimal: View {
    var m: CountdownModel
    var body: some View {
        if let t = m.still {
            // The pictures: the ring at the moment shown.
            ZStack {
                Circle().stroke(MW.countdown.opacity(0.25), lineWidth: 3)
                Circle().trim(from: 0, to: m.passed(at: t)).stroke(MW.countdown, style: StrokeStyle(lineWidth: 3, lineCap: .round)).rotationEffect(.degrees(-90))
            }
            .padding(2)
        } else {
            ProgressView(timerInterval: m.span, countsDown: false) { EmptyView() } currentValueLabel: { EmptyView() }
                .progressViewStyle(.circular)
                .tint(MW.countdown)
        }
    }
}

/// The Dynamic Island expanded: the name and time leading, the countdown trailing, the bar and the place below.
@available(iOS 16.0, *)
struct CountdownExpandedLeading: View {
    var m: CountdownModel
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text(m.name)
                .font(MWFont.plex(22, .bold))
                .foregroundColor(MW.paper)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
            Text(m.text)
                .font(MWFont.plex(13, .medium))
                .foregroundColor(MW.paper.opacity(0.85))
                .lineLimit(1)
        }
        .environment(\.layoutDirection, m.direction)
    }
}

@available(iOS 16.0, *)
struct CountdownExpandedTrailing: View {
    var m: CountdownModel
    var body: some View {
        if m.stale {
            Text(m.nowText)
                .font(MWFont.plex(16, .bold))
                .foregroundColor(MW.countdown)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
        } else {
            CountdownTimerText(m: m, size: 26)
                .multilineTextAlignment(.trailing)
                .frame(maxWidth: 140, alignment: .trailing)
        }
    }
}

@available(iOS 16.0, *)
struct CountdownExpandedBottom: View {
    var m: CountdownModel
    var body: some View {
        VStack(spacing: 6) {
            if !m.stale { CountdownBar(m: m) }
            HStack {
                Text(m.title)
                    .font(MWFont.plex(11, .semibold))
                    .foregroundColor(MW.gold2)
                Spacer()
                Text(m.place)
                    .font(MWFont.plex(11))
                    .foregroundColor(MW.paper.opacity(0.78))
            }
            .lineLimit(1)
        }
        .environment(\.layoutDirection, m.direction)
    }
}

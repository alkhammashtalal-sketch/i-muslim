import SwiftUI

// The Lock Screen's new views (add-ons 0072-add18 §3, 0072-add19 §1, §3), as plain views on plain values, so the same
// views draw the widgets, the Live Activity and the approval pictures (web/scripts/widget-render.swift):
//   - «المسبحة» circular: a ring filling with the count, the number in its middle (tap: +1, iOS 17);
//   - «المسبحة» rectangular: the current dhikr, and the count of its target (١٢ / ٣٣) (tap: +1, iOS 17);
//   - «الأذكار» rectangular: «أذكار الصباح» from Fajr, «أذكار المساء» from Asr, and a short line (tap: its page);
//     never a long dhikr, never an ayah cut;
//   - «جلسة تسبيح بعد الصلاة»: the Live Activity's card and the Dynamic Island's parts.
// On the Lock Screen the system draws widgets in one tint (the vibrant mode): one ink, its opacity, and the ring.

// MARK: - The tasbih on the Lock Screen

enum TasbihNow {
    /// The step shown, its count and target (0: a free count with no end), from the shared counter (widgets.json).
    static func of(_ t: WidgetData.Tasbih) -> (zikr: String, n: Int, target: Int)? {
        guard !t.steps.isEmpty else { return nil }
        let s = t.steps[min(max(0, t.step), t.steps.count - 1)]
        return (s.zikr, t.n, s.target)
    }

    /// The ring: the count of the target; a free count goes round every 33.
    static func fraction(n: Int, target: Int) -> Double {
        if target > 0 { return min(1, Double(n) / Double(target)) }
        let r = n % 33
        return n > 0 && r == 0 ? 1 : Double(r) / 33
    }
}

struct TasbihCircularView: View {
    var data: WidgetData?

    var body: some View {
        GeometryReader { geo in
            let s = min(geo.size.width, geo.size.height) / 76
            if let data = data, let now = TasbihNow.of(data.tasbih) {
                let done = TasbihNow.fraction(n: now.n, target: now.target)
                ZStack {
                    Circle()
                        .inset(by: 6 * s)
                        .stroke(Color.white.opacity(0.28), lineWidth: 5 * s)
                    Circle()
                        .inset(by: 6 * s)
                        .trim(from: 0, to: CGFloat(done))
                        .stroke(Color.white, style: StrokeStyle(lineWidth: 5 * s, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .mwAccentable()
                    Text(verbatim: MWDigits.write(now.n, data.tasbih.digits))
                        .font(MWFont.plex(24 * s, .bold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.4)
                        .padding(.horizontal, 15 * s)
                }
                .frame(width: geo.size.width, height: geo.size.height)
            } else {
                Image(systemName: "circle.dotted")
                    .font(.system(size: 26 * s, weight: .medium))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }
}

struct TasbihRectangularView: View {
    var data: WidgetData?

    var body: some View {
        GeometryReader { geo in
            let s = min(1, min(geo.size.width / 172, geo.size.height / 70))
            if let data = data, let now = TasbihNow.of(data.tasbih) {
                let d = data.tasbih.digits
                let count = now.target > 0
                    ? "\u{2066}\(MWDigits.write(now.n, d)) / \(MWDigits.write(now.target, d))\u{2069}"
                    : MWDigits.write(now.n, d)
                HStack(spacing: 8 * s) {
                    VStack(alignment: .leading, spacing: 1 * s) {
                        Text(now.zikr)
                            .font(MWFont.amiri(17 * s, bold: true))
                            .lineLimit(1)
                            .minimumScaleFactor(0.5)
                            .environment(\.layoutDirection, MWScript.direction(now.zikr))
                        Text(verbatim: count)
                            .font(MWFont.plex(20 * s, .bold))
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            .mwAccentable()
                        ProgressCapsule(fraction: TasbihNow.fraction(n: now.n, target: now.target), s: s)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    Text(verbatim: "\u{2066}+" + MWDigits.write(1, d) + "\u{2069}")
                        .font(MWFont.plex(15 * s, .bold))
                        .frame(width: 38 * s, height: 38 * s)
                        .background(Circle().fill(Color.white.opacity(0.22)))
                }
                .padding(.horizontal, 2 * s)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                .environment(\.layoutDirection, data.rtl ? .rightToLeft : .leftToRight)
            } else {
                Text(data?.labels.openApp ?? MWFallback.openApp)
                    .font(MWFont.plex(14 * s, .semibold))
                    .lineLimit(3)
                    .minimumScaleFactor(0.6)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            }
        }
    }
}

/// A thin bar for the Lock Screen's one-tint drawing.
struct ProgressCapsule: View {
    var fraction: Double
    var s: CGFloat

    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.white.opacity(0.28))
                Capsule().fill(Color.white)
                    .frame(width: max(0, g.size.width * CGFloat(fraction)))
                    .opacity(fraction > 0 ? 1 : 0)
                    .mwAccentable()
            }
        }
        .frame(height: 4 * s)
    }
}

// MARK: - «الأذكار» on the Lock Screen

struct AdhkarRectangularView: View {
    var data: WidgetData?
    var date: Date

    var body: some View {
        GeometryReader { geo in
            let s = min(1, min(geo.size.width / 172, geo.size.height / 70))
            if let data = data, let now = AdhkarNow.part(data, date) {
                let fraction = now.today ? min(1, max(0, now.part.fraction)) : 0
                VStack(alignment: .leading, spacing: 2 * s) {
                    Text(now.part.title)
                        .font(MWFont.plex(18 * s, .bold))
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                        .mwAccentable()
                    Text(verbatim: "\(data.labels.adhkarNow)\(data.rtl ? "، " : " · ")\(now.today ? now.part.progress : now.part.none)")
                        .font(MWFont.plex(13 * s))
                        .opacity(0.85)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                    ProgressCapsule(fraction: fraction, s: s)
                        .padding(.top, 3 * s)
                }
                .padding(.horizontal, 2 * s)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                .environment(\.layoutDirection, data.rtl ? .rightToLeft : .leftToRight)
            } else {
                Text(data?.labels.openApp ?? MWFallback.openApp)
                    .font(MWFont.plex(14 * s, .semibold))
                    .lineLimit(3)
                    .minimumScaleFactor(0.6)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            }
        }
    }
}

// MARK: - «جلسة تسبيح بعد الصلاة»: the Live Activity's views

/// The session as the views need it (TasbihSessionAttributes and its state, or a sample for the pictures).
struct SessionModel {
    var title: String
    var steps: [(zikr: String, target: Int)]
    var step: Int
    var n: Int
    var done: Bool
    var source: String
    var doneText: String
    var digits: String
    var rtl: Bool

    var current: (zikr: String, target: Int) { steps.isEmpty ? ("", 1) : steps[min(max(0, step), steps.count - 1)] }
    func num(_ v: Int) -> String { MWDigits.write(v, digits) }
    /// «١٢ / ٣٣», kept left to right.
    var count: String { "\u{2066}\(num(done ? current.target : n)) / \(num(current.target))\u{2069}" }
}

/// The card on the Lock Screen (and the banner on a phone without the Island).
struct SessionCardView<Plus: View>: View {
    var m: SessionModel
    var plus: (SessionPlusLabel) -> Plus

    init(m: SessionModel, @ViewBuilder plus: @escaping (SessionPlusLabel) -> Plus) {
        self.m = m
        self.plus = plus
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(m.title)
                    .font(MWFont.plex(13, .semibold))
                    .foregroundColor(MW.gold2)
                    .lineLimit(1)
                Spacer(minLength: 6)
                StepDots(count: m.steps.count, at: m.done ? m.steps.count : m.step)
            }
            HStack(alignment: .center, spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(m.done ? m.doneText : m.current.zikr)
                        .font(MWFont.amiri(24, bold: true))
                        .foregroundColor(MW.paper)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                        .environment(\.layoutDirection, MWScript.direction(m.done ? m.doneText : m.current.zikr))
                    Text(verbatim: m.count)
                        .font(MWFont.plex(26, .bold))
                        .foregroundColor(MW.countdown)
                        .lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                if !m.done {
                    plus(SessionPlusLabel(text: "\u{2066}+" + m.num(1) + "\u{2069}"))
                }
            }
            Text(m.source)
                .font(MWFont.plex(11))
                .foregroundColor(MW.paper.opacity(0.78))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .padding(16)
        .environment(\.layoutDirection, m.rtl ? .rightToLeft : .leftToRight)
    }
}

struct SessionPlusLabel: View {
    var text: String
    var small = false

    var body: some View {
        Text(verbatim: text)
            .font(MWFont.plex(small ? 16 : 20, .bold))
            .foregroundColor(Color(hex: 0x3a2a0c))
            .frame(width: small ? 52 : 64, height: small ? 36 : 44)
            .background(Capsule().fill(LinearGradient(colors: [Color(hex: 0xf0d58f), Color(hex: 0xc9a04e)], startPoint: .top, endPoint: .bottom)))
            .environment(\.layoutDirection, .leftToRight)
    }
}

/// Which step of the session: one dot each, the done ones filled.
struct StepDots: View {
    var count: Int
    var at: Int

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<max(0, count), id: \.self) { i in
                Circle()
                    .fill(i < at ? MW.gold : (i == at ? MW.countdown : Color.white.opacity(0.3)))
                    .frame(width: 6, height: 6)
            }
        }
    }
}

/// The Dynamic Island's compact parts: the count leading, its target trailing.
struct SessionCompactLeading: View {
    var m: SessionModel
    var body: some View {
        Text(verbatim: m.num(m.done ? m.current.target : m.n))
            .font(MWFont.plex(15, .bold))
            .foregroundColor(MW.countdown)
    }
}

struct SessionCompactTrailing: View {
    var m: SessionModel
    var body: some View {
        Text(verbatim: m.done ? "✓" : "\u{2066}/ \(m.num(m.current.target))\u{2069}")
            .font(MWFont.plex(13, .semibold))
            .foregroundColor(MW.gold2)
    }
}

/// The Dynamic Island expanded: the dhikr and its count, «+١», the source line.
struct SessionExpandedCenter: View {
    var m: SessionModel
    var body: some View {
        VStack(spacing: 2) {
            Text(m.done ? m.doneText : m.current.zikr)
                .font(MWFont.amiri(20, bold: true))
                .foregroundColor(MW.paper)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
            Text(verbatim: m.count)
                .font(MWFont.plex(20, .bold))
                .foregroundColor(MW.countdown)
        }
    }
}

struct SessionExpandedBottom<Plus: View>: View {
    var m: SessionModel
    var plus: (SessionPlusLabel) -> Plus

    init(m: SessionModel, @ViewBuilder plus: @escaping (SessionPlusLabel) -> Plus) {
        self.m = m
        self.plus = plus
    }

    var body: some View {
        VStack(spacing: 6) {
            if !m.done { plus(SessionPlusLabel(text: "\u{2066}+" + m.num(1) + "\u{2069}", small: true)) }
            Text(m.source)
                .font(MWFont.plex(10.5))
                .foregroundColor(MW.paper.opacity(0.78))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .environment(\.layoutDirection, m.rtl ? .rightToLeft : .leftToRight)
    }
}

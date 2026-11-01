import SwiftUI

// «اسم الله لليوم» and «من أقوال السلف» (add-on 0072-add10 §1–§2; the content rules of 0072-add9), in the welcome
// painting's manner: the lapis and the gold, the frame, and the name inside the shamsa as «مسلم» is in the welcome's.
// Pure SwiftUI on plain values, as Views.swift, so the same views render for the screenshots. Every text comes ready
// from the app's file (WidgetData.NameDay / SalafDay, web/src/native/widget-names.ts); nothing is written here.
// - The Quranic evidence is never cut: it shrinks to 0.7 (as the ayah widget), else its place and «اضغط لقراءتها».
// - The hadith and the quoted tafsir shrink to 0.7, then show their whole sentences that fit and «التكملة في التطبيق».
// - «القراءة» only under its heading, its whole sentences that fit, then «التكملة في التطبيق»; it comes only while the
//   server sends it, so a day without it has one page fewer.
// - The light follows the date card's six skies by the day's prayer times (WidgetData.Day.sky).
// - Full colour, and the tinted and clear modes (and the lock screen and StandBy): without the pictures, the shamsa
//   drawn as rings, every text in one ink at full or 0.75 opacity, which the system tints.

// MARK: - Environment: the rendering mode and the container background, set by the widget (Widgets.swift) or the renderer

private struct MWFullColorKey: EnvironmentKey { static let defaultValue = true }
private struct MWShowsBackgroundKey: EnvironmentKey { static let defaultValue = true }
private struct MWSkyKey: EnvironmentKey { static let defaultValue = "night" }

extension EnvironmentValues {
    /// False in the tinted and clear modes and on the lock screen: no pictures, one ink.
    var mwFullColor: Bool {
        get { self[MWFullColorKey.self] }
        set { self[MWFullColorKey.self] = newValue }
    }
    /// False where the system removed the container background (StandBy, and the accented modes).
    var mwShowsBackground: Bool {
        get { self[MWShowsBackgroundKey.self] }
        set { self[MWShowsBackgroundKey.self] = newValue }
    }
    /// The sky's state now (WidgetData.Day.sky), whose light also falls on the shamsa's painting.
    var mwSky: String {
        get { self[MWSkyKey.self] }
        set { self[MWSkyKey.self] = newValue }
    }
}

extension MW {
    /// The labels' gold on the paper: #7a5b22 on #f1e6cc is 5.1:1 (AA); the board's #94712c is 3.9:1.
    static let goldInk = Color(hex: 0x7a5b22)
}

// MARK: - Reading the data

enum NameNow {
    static func name(_ data: WidgetData?, _ date: Date) -> WidgetData.NameDay? {
        let t = date.ms
        return data?.nameDays?.first { $0.start <= t && t < $0.end }
    }

    static func salaf(_ data: WidgetData?, _ date: Date) -> WidgetData.SalafDay? {
        let t = date.ms
        return data?.salafDays?.first { $0.start <= t && t < $0.end }
    }

    /// The medium shows the first two pages of the quoted texts (the evidence, then the hadith or the quoted tafsir),
    /// never «القراءة».
    static func mediumPages(_ day: WidgetData.NameDay) -> [WidgetData.NamePage] {
        Array(day.pages.filter { $0.kind != "reading" }.prefix(2))
    }

    /// The sky's state now: the last of the day's moments at or before it; the night without a place.
    static func sky(_ data: WidgetData?, _ date: Date) -> String {
        guard let day = data?.day(at: date), let sky = day.sky, !sky.isEmpty else { return "night" }
        let t = date.ms
        return sky.last { $0.at <= t }?.state ?? "night"
    }
}

/// «التالي» and «السابق» (add-ons 0072-add10 §1, 0072-add54): «التالي» from the last page back to the first, as it
/// always was; «السابق» one page back, never from the first to the last (it is hidden on the first page). Android's
/// widget turns its pages by the same rules (NamePaging.java).
enum NamePaging {
    static func next(_ page: Int, pages: Int) -> Int { pages > 0 ? (min(max(0, page), pages - 1) + 1) % pages : 0 }
    static func prev(_ page: Int, pages: Int) -> Int { pages > 0 ? max(0, min(page, pages - 1) - 1) : 0 }
    static func hasPrev(_ page: Int) -> Bool { page > 0 }

    /// What a screen reader says for a button: its word, then the page it opens in the app's digits
    /// («السابق، صفحة ٢ من ٣»); the word alone with data written before add-on 0072-add54.
    static func label(_ word: String, to page: Int, of pages: Int, template: String?, digits: String) -> String {
        guard let t = template, !t.isEmpty else { return word }
        return t.replacingOccurrences(of: "{b}", with: word)
            .replacingOccurrences(of: "{n}", with: MWDigits.write(page + 1, digits))
            .replacingOccurrences(of: "{t}", with: MWDigits.write(pages, digits))
    }
}

/// The widget's own page, kept in the App Group by the «التالي» and «السابق» intents (NameIntent.swift), per size,
/// back to the first page each new day.
enum NamePageStore {
    static let key = "nameWidget.page"
    static var defaults: UserDefaults? { UserDefaults(suiteName: WidgetStore.group) }

    static func page(day: String, family: String) -> Int {
        guard let raw = defaults?.string(forKey: "\(key).\(family)"), let data = raw.data(using: .utf8),
              let v = try? JSONDecoder().decode(Stored.self, from: data), v.day == day else { return 0 }
        return max(0, v.page)
    }

    static func advance(day: String, family: String, pages: Int) {
        set(NamePaging.next(page(day: day, family: family), pages: pages), day: day, family: family)
    }

    static func back(day: String, family: String, pages: Int) {
        set(NamePaging.prev(page(day: day, family: family), pages: pages), day: day, family: family)
    }

    private static func set(_ page: Int, day: String, family: String) {
        guard let data = try? JSONEncoder().encode(Stored(day: day, page: page)), let raw = String(data: data, encoding: .utf8) else { return }
        defaults?.set(raw, forKey: "\(key).\(family)")
    }

    struct Stored: Codable { var day: String; var page: Int }
}

/// Sentences of a quoted text, each ending at «.» «؟» «?» «!» with its mark (web/src/native/widget-names.ts sentencesOf).
enum MWSentences {
    static func split(_ text: String) -> [String] {
        var out: [String] = []
        var cur = ""
        var afterMark = false
        for ch in text {
            if afterMark && !".؟?!»\")]".contains(ch) {
                let s = cur.trimmingCharacters(in: .whitespacesAndNewlines)
                if !s.isEmpty { out.append(s) }
                cur = ""
                afterMark = false
            }
            cur.append(ch)
            if ".؟?!".contains(ch) { afterMark = true }
        }
        let s = cur.trimmingCharacters(in: .whitespacesAndNewlines)
        if !s.isEmpty { out.append(s) }
        return out.map { $0.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ") }
    }

    /// The counts of whole sentences to try, longest first: all of them, then fewer, at most `limit` tries.
    static func counts(_ n: Int, limit: Int = 10) -> [Int] {
        guard n > 0 else { return [] }
        if n <= limit { return Array((1...n).reversed()) }
        let step = Double(n - 1) / Double(limit - 1)
        return Array(Set((0..<limit).map { n - Int((Double($0) * step).rounded()) })).sorted(by: >)
    }
}

/// One candidate of a ViewThatFits: a scale or a count of sentences, with an id of its own (ViewThatFits needs its
/// children's ids unique across all its ForEach).
struct MWTry: Identifiable {
    var id: String
    var k: CGFloat = 1
    var n: Int = 0
    static func scales(_ tag: String, _ ks: [CGFloat]) -> [MWTry] { ks.map { MWTry(id: "\(tag)\($0)", k: $0) } }
    static func counts(_ tag: String, _ ns: [Int]) -> [MWTry] { ns.map { MWTry(id: "\(tag)\($0)", n: $0) } }
}

// MARK: - The sky's light (add-on 0071-add16), over the painting's sky

struct SkyLight: View {
    var state: String
    var s: CGFloat
    @Environment(\.layoutDirection) private var direction

    var body: some View {
        // The east is the reading's start: right in Arabic, left otherwise.
        let east: CGFloat = direction == .rightToLeft ? 1 : 0
        let west: CGFloat = 1 - east
        ZStack {
            switch state {
            case "fajr":
                // A pearl band across the horizon, the night above it.
                LinearGradient(stops: [.init(color: Color(red: 222 / 255, green: 228 / 255, blue: 244 / 255).opacity(0.42), location: 0),
                                       .init(color: Color(red: 205 / 255, green: 214 / 255, blue: 240 / 255).opacity(0.16), location: 0.35),
                                       .init(color: .clear, location: 0.6)],
                               startPoint: .bottom, endPoint: .top)
                    .blendMode(.screen)
            case "morning":
                RadialGradient(colors: [Color(red: 246 / 255, green: 212 / 255, blue: 150 / 255).opacity(0.38), .clear],
                               center: UnitPoint(x: east * 0.8 + 0.1, y: 0.3), startRadius: 0, endRadius: 220 * s)
                    .blendMode(.screen)
                Color(red: 66 / 255, green: 96 / 255, blue: 204 / 255).opacity(0.14).blendMode(.screen)
            case "dhuhr":
                Color(red: 66 / 255, green: 96 / 255, blue: 204 / 255).opacity(0.26).blendMode(.screen)
                RadialGradient(colors: [Color(red: 248 / 255, green: 226 / 255, blue: 170 / 255).opacity(0.2), .clear],
                               center: UnitPoint(x: 0.5, y: 0), startRadius: 0, endRadius: 180 * s)
                    .blendMode(.screen)
            case "asr":
                RadialGradient(colors: [Color(red: 240 / 255, green: 176 / 255, blue: 100 / 255).opacity(0.42), .clear],
                               center: UnitPoint(x: west * 0.85 + 0.075, y: 0.78), startRadius: 0, endRadius: 200 * s)
                    .blendMode(.screen)
                Color(red: 66 / 255, green: 96 / 255, blue: 204 / 255).opacity(0.08).blendMode(.screen)
            case "maghrib":
                RadialGradient(colors: [Color(red: 232 / 255, green: 104 / 255, blue: 64 / 255).opacity(0.55),
                                        Color(red: 150 / 255, green: 70 / 255, blue: 140 / 255).opacity(0.18), .clear],
                               center: UnitPoint(x: west, y: 0.95), startRadius: 0, endRadius: 230 * s)
                    .blendMode(.screen)
                LinearGradient(colors: [Color(hex: 0x0a1640, alpha: 0.35), .clear],
                               startPoint: UnitPoint(x: east, y: 0), endPoint: UnitPoint(x: west, y: 0.6))
            default:
                // The night: the field deepened from the zenith.
                LinearGradient(colors: [Color(hex: 0x0a1640, alpha: 0.42), Color(hex: 0x0a1640, alpha: 0.1)], startPoint: .top, endPoint: .bottom)
            }
        }
        .allowsHitTesting(false)
    }
}

/// The ground of the name's widgets: the painting's sky with the time's light.
struct NameSky: View {
    var state: String
    var s: CGFloat
    /// Where the shamsa and the lines are (SkyBackground's `clear`).
    var clear: [SkyClear] = []
    var seed: UInt32 = 21

    var body: some View {
        ZStack {
            SkyBackground(s: s, clear: clear, seed: seed)
            SkyLight(state: state, s: s)
        }
        .compositingGroup()
    }
}

// MARK: - The shamsa with the name in it

/// The name in the shamsa's light disc, in ink (full colour); with no pictures, the shamsa as two gold rings with
/// sixteen rays, the name in the one ink. The disc is 300/660 of the picture.
struct ShamsaName: View {
    var name: String
    var d: CGFloat
    @Environment(\.mwImages) private var images
    @Environment(\.mwFullColor) private var fullColor
    @Environment(\.mwShowsBackground) private var showsBackground
    @Environment(\.mwSky) private var sky

    static let disc: CGFloat = 300 / 660
    /// The mask's stops over the half side: whole to the gold ring and past it (0.68 of the half side), then eased out
    /// to nothing at the inscribed circle, so the rays' tips fade into the sky.
    static let fade: [Gradient.Stop] = [.init(color: .black, location: 0), .init(color: .black, location: 0.68),
                                        .init(color: .black.opacity(0.8), location: 0.78), .init(color: .black.opacity(0.45), location: 0.88),
                                        .init(color: .black.opacity(0.15), location: 0.95), .init(color: .black.opacity(0), location: 1)]

    var body: some View {
        let picture = fullColor && showsBackground
        ZStack {
            if picture {
                // The picture whole, melting into the sky round it by a radial mask that is clear before the square's
                // sides (its inscribed circle), so neither its corners nor its edges show on the sky in any light
                // (add-on 0072-add23 §4.2); the time's light on it as on the sky; the name above both, untouched.
                ZStack {
                    images.image("medallion")
                        .resizable()
                        .interpolation(.high)
                        .frame(width: d, height: d)
                    SkyLight(state: sky, s: d / 150)
                }
                .compositingGroup()
                .mask(RadialGradient(stops: ShamsaName.fade, center: .center, startRadius: 0, endRadius: d * 0.5))
            } else {
                ShamsaRings(d: d)
            }
            NameInDisc(name: name, disc: d * ShamsaName.disc, ink: picture ? MW.ink : (fullColor ? MW.gold2 : .white))
        }
        .frame(width: d, height: d)
    }
}

struct NameInDisc: View {
    var name: String
    var disc: CGFloat
    var ink: Color

    var body: some View {
        let words = name.split(separator: " ").map(String.init)
        let pair = words.count > 1
        let half = (words.count + 1) / 2
        let text = pair ? words[0..<half].joined(separator: " ") + "\n" + words[half...].joined(separator: " ") : name
        Text(text)
            .font(MWFont.amiri(disc * (pair ? 0.27 : 0.36), bold: true))
            .foregroundColor(ink)
            .multilineTextAlignment(.center)
            .lineLimit(pair ? 2 : 1)
            .minimumScaleFactor(0.5)
            .lineSpacing(0)
            .frame(width: disc * 0.84, height: disc * 0.84)
            .environment(\.layoutDirection, .rightToLeft)
            .mwAccentable()
    }
}

/// The shamsa drawn for the modes without pictures: an outer and an inner ring and sixteen short rays.
struct ShamsaRings: View {
    var d: CGFloat
    @Environment(\.mwFullColor) private var fullColor

    var body: some View {
        let ink = fullColor ? MW.gold2 : Color.white
        ZStack {
            Circle().strokeBorder(ink.opacity(0.9), lineWidth: max(1, d * 0.012))
                .frame(width: d * 0.62, height: d * 0.62)
            Circle().strokeBorder(ink.opacity(0.6), lineWidth: max(0.75, d * 0.006))
                .frame(width: d * 0.52, height: d * 0.52)
            ForEach(0..<16, id: \.self) { i in
                Capsule()
                    .fill(ink.opacity(i % 2 == 0 ? 0.8 : 0.45))
                    .frame(width: max(1, d * 0.012), height: d * (i % 2 == 0 ? 0.1 : 0.06))
                    .offset(y: -d * (i % 2 == 0 ? 0.38 : 0.36))
                    .rotationEffect(.degrees(Double(i) * 22.5))
            }
        }
        .frame(width: d, height: d)
        .mwAccentable()
    }
}

// MARK: - Shared pieces

/// The page dots: the current one gold and wider. The first page is at the reading's start, on the right in Arabic,
/// in every mode (add-on 0072-add23 §4.1): the dots are laid out left to right by hand from `rtl`, the data's
/// direction, so no rendering mode or layout direction the system gives the widget can turn them round.
struct PageDots: View {
    var count: Int
    var current: Int
    var s: CGFloat
    var rtl: Bool
    var onSky = false
    @Environment(\.mwFullColor) private var fullColor

    /// The pages from left to right.
    static func order(_ count: Int, rtl: Bool) -> [Int] { rtl ? Array((0..<count).reversed()) : Array(0..<count) }

    var body: some View {
        HStack(spacing: 5 * s) {
            ForEach(PageDots.order(count, rtl: rtl), id: \.self) { i in
                Capsule()
                    .fill(i == current ? (fullColor ? (onSky ? MW.gold2 : MW.goldInk) : .white) : (fullColor ? (onSky ? MW.paper.opacity(0.45) : MW.muted.opacity(0.45)) : .white.opacity(0.4)))
                    .frame(width: (i == current ? 14 : 6) * s, height: 6 * s)
            }
        }
        .environment(\.layoutDirection, .leftToRight)
        .accessibilityHidden(true)
    }
}

/// A button's face: «التالي», «السابق» or «شارك», a pill with a gold rule, 30 board points high. «التالي» and «السابق»
/// carry their chevron, which follows the reading direction (add-on 0072-add54): «التالي» on the left in Arabic, its
/// chevron pointing left; `turn` is +1 for «التالي», -1 for «السابق», 0 for «شارك» (Widgets.swift picks the intent by it).
/// `icon`: the share symbol alone, its word kept for the screen reader, where the words do not all fit.
struct NamePill: View {
    var text: String
    var s: CGFloat
    var filled: Bool
    var turn: Int = 0
    var icon = false
    /// What a screen reader says («السابق، صفحة ٢ من ٣»); the text itself otherwise.
    var spoken: String? = nil
    @Environment(\.mwFullColor) private var fullColor

    private var ink: Color { fullColor ? (filled ? MW.paper : MW.lapis) : .white }

    var body: some View {
        HStack(spacing: 4 * s) {
            if icon {
                Image(systemName: "square.and.arrow.up").font(.system(size: 12.5 * s, weight: .semibold))
            } else {
                if turn < 0 { chevron("chevron.backward") }
                Text(text)
                    .font(MWFont.plex(12 * s, .semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                if turn > 0 { chevron("chevron.forward") }
            }
        }
        .foregroundColor(ink)
        .padding(.horizontal, (icon ? 8 : turn == 0 ? 14 : 11) * s)
        .frame(minWidth: icon ? 28 * s : nil, minHeight: 28 * s)
        .background(Capsule().fill(fullColor ? (filled ? MW.lapis : Color.clear) : Color.white.opacity(filled ? 0.2 : 0)))
        .overlay(Capsule().strokeBorder(fullColor ? MW.gold.opacity(0.9) : Color.white.opacity(0.6), lineWidth: max(0.75, 1 * s)))
        .fixedSize()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(spoken ?? text))
    }

    private func chevron(_ name: String) -> some View {
        Image(systemName: name).font(.system(size: 9.5 * s, weight: .bold)).accessibilityHidden(true)
    }
}

/// «شارك» (the pill, or its symbol alone where the words do not fit), then «السابق», the dots and «التالي» together at
/// the end (add-on 0072-add54): «السابق» hidden on the first page, its place kept so nothing moves.
struct NamePager<Btn: View>: View {
    var labels: WidgetData.Labels
    var digits: String
    var shareUrl: String
    var count: Int
    var current: Int
    var s: CGFloat
    var rtl: Bool
    var dots: Bool
    var button: (NamePill) -> Btn

    var body: some View {
        if #available(iOS 16.0, macOS 13.0, *) {
            ViewThatFits(in: .horizontal) {
                row(shareIcon: false, dots: dots, prevIcon: false)
                row(shareIcon: true, dots: dots, prevIcon: false)
                row(shareIcon: true, dots: false, prevIcon: false)
                row(shareIcon: true, dots: false, prevIcon: true)
            }
        } else {
            row(shareIcon: true, dots: false, prevIcon: false)
        }
    }

    private func row(shareIcon: Bool, dots: Bool, prevIcon: Bool) -> some View {
        let next = labels.nextPage ?? "التالي", prev = labels.prevPage ?? "السابق"
        let toNext = NamePaging.next(current, pages: count), toPrev = NamePaging.prev(current, pages: count)
        return HStack(spacing: 6 * s) {
            if let url = URL(string: shareUrl) {
                Link(destination: url) { NamePill(text: labels.share ?? "شارك", s: s, filled: false, icon: shareIcon) }
            }
            Spacer(minLength: 4 * s)
            if count > 1 {
                let back = button(NamePill(text: prevIcon ? "" : prev, s: s, filled: true, turn: -1,
                                           spoken: NamePaging.label(prev, to: toPrev, of: count, template: labels.navPage, digits: digits)))
                if NamePaging.hasPrev(current) { back } else { back.hidden().accessibilityHidden(true) }
                if dots { PageDots(count: count, current: current, s: s, rtl: rtl) }
                button(NamePill(text: next, s: s, filled: true, turn: 1,
                                spoken: NamePaging.label(next, to: toNext, of: count, template: labels.navPage, digits: digits)))
            }
        }
    }
}

/// The label of a part: «الشاهد», «تفسير السعدي», the readings' heading.
struct PartLabel: View {
    var text: String
    var s: CGFloat
    @Environment(\.mwFullColor) private var fullColor

    var body: some View {
        Text(text)
            .font(MWFont.plex(11.5 * s, .semibold))
            .foregroundColor(fullColor ? MW.goldInk : .white.opacity(0.8))
            .lineLimit(2)
            .minimumScaleFactor(0.7)
            .multilineTextAlignment(.center)
    }
}

// MARK: - One page's content (large and medium)

/// A page of the name's day, as large as fits in its box: the ayah never cut, the others cut at a whole sentence.
struct NamePageContent: View {
    var page: WidgetData.NamePage
    var labels: WidgetData.Labels
    var s: CGFloat
    /// The board's sizes: the ayah 19 on the large, 16 on the medium.
    var base: CGFloat
    @Environment(\.mwFullColor) private var fullColor

    private var ink: Color { fullColor ? MW.ink : .white }
    private var hadithInk: Color { fullColor ? MW.hadithText : .white }
    private var muted: Color { fullColor ? MW.muted : .white.opacity(0.75) }
    private var more: String { labels.continueInApp ?? "التكملة في التطبيق" }

    var body: some View {
        switch page.kind {
        case "ayah": ayah
        case "hadith": hadith
        case "meaning": quoted(page.paragraphs ?? [], ink: ink)
        case "reading": reading
        default: EmptyView()
        }
    }

    // The ayah: whole at 1 … 0.7, its meaning with it while it fits (else the ayah alone), else its place.
    @ViewBuilder private var ayah: some View {
        let text = page.text ?? ""
        if #available(iOS 16.0, macOS 13.0, *) {
            ViewThatFits(in: .vertical) {
                ForEach(MWTry.scales("am", [1, 0.9, 0.8, 0.7])) { t in ayahBlock(text, t.k, meaning: true) }
                ForEach(MWTry.scales("a", [1, 0.9, 0.8, 0.7])) { t in ayahBlock(text, t.k, meaning: false) }
                invitation
            }
        } else if let k = AyahFit.legacyScale(text) {
            ayahBlock(text, k * 0.9, meaning: false)
        } else {
            invitation
        }
    }

    private func ayahBlock(_ text: String, _ k: CGFloat, meaning: Bool) -> some View {
        let a = base * s * k
        return VStack(spacing: 4 * s) {
            PartLabel(text: page.label, s: s)
            note
            Text(text)
                .font(MWFont.amiri(a))
                .lineSpacing(MWFont.amiriLineSpacing(a, cssLineHeight: 1.75))
                .foregroundColor(ink)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .environment(\.layoutDirection, .rightToLeft)
            Text(page.ref ?? "")
                .font(MWFont.plex(11 * s, .semibold))
                .foregroundColor(fullColor ? MW.goldInk : .white.opacity(0.8))
                .lineLimit(1)
                .minimumScaleFactor(0.7)
            if meaning, let m = page.meaning {
                meaningText(m, k)
            }
        }
        .frame(maxWidth: .infinity)
    }

    private func meaningText(_ m: WidgetData.Meaning, _ k: CGFloat) -> some View {
        VStack(spacing: 1 * s) {
            Text(m.text)
                .font(MWFont.plex(11.5 * s * max(0.85, k)))
                .foregroundColor(muted)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .environment(\.layoutDirection, m.lang == "ur" ? .rightToLeft : .leftToRight)
            Text(m.source)
                .font(MWFont.plex(9.5 * s))
                .foregroundColor(muted)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
    }

    private var invitation: some View {
        VStack(spacing: 4 * s) {
            PartLabel(text: page.label, s: s)
            Text(page.ref ?? "")
                .font(MWFont.plex(17 * s, .bold))
                .foregroundColor(ink)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(labels.readAyah ?? "اضغط لقراءتها")
                .font(MWFont.plex(12.5 * s))
                .foregroundColor(muted)
                .lineLimit(2)
                .minimumScaleFactor(0.7)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }

    // The hadith with its grade and takhrij as stored.
    @ViewBuilder private var hadith: some View {
        let text = page.text ?? ""
        let sentences = MWSentences.split(text)
        if #available(iOS 16.0, macOS 13.0, *) {
            ViewThatFits(in: .vertical) {
                ForEach(MWTry.scales("hm", [1, 0.9, 0.8, 0.7])) { t in hadithBlock(text, t.k, cut: false, meaning: true) }
                ForEach(MWTry.scales("h", [1, 0.85, 0.7])) { t in hadithBlock(text, t.k, cut: false, meaning: false) }
                ForEach(MWTry.counts("hc", MWSentences.counts(sentences.count - 1))) { t in
                    hadithBlock(sentences.prefix(t.n).joined(separator: " "), 0.7, cut: true, meaning: false)
                }
                hadithBlock("", 0.7, cut: true, meaning: false)
            }
        } else {
            hadithBlock(text, 0.8, cut: false, meaning: false)
        }
    }

    private func hadithBlock(_ text: String, _ k: CGFloat, cut: Bool, meaning: Bool) -> some View {
        let a = (base - 1) * s * k
        return VStack(spacing: 4 * s) {
            HStack(spacing: 6 * s) {
                PartLabel(text: page.label, s: s)
                if let g = page.grade, !g.isEmpty {
                    if fullColor { GradeBadge(text: g, s: s) } else {
                        Text(g).font(MWFont.plex(11 * s, .semibold)).foregroundColor(.white).padding(.horizontal, 8 * s)
                            .overlay(Capsule().strokeBorder(Color.white.opacity(0.6), lineWidth: 1))
                    }
                }
            }
            note
            if !text.isEmpty {
                Text(text)
                    .font(MWFont.amiri(a))
                    .lineSpacing(MWFont.amiriLineSpacing(a, cssLineHeight: 1.7))
                    .foregroundColor(hadithInk)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .environment(\.layoutDirection, .rightToLeft)
            }
            if cut { moreLine }
            Text(page.attribution ?? "")
                .font(MWFont.plex(11 * s))
                .foregroundColor(muted)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            if meaning, let m = page.meaning { meaningText(m, k) }
        }
        .frame(maxWidth: .infinity)
    }

    /// «النص بالعربية» in the reader's language above a quoted text with no meaning in it (add-on 0072-add23 §4.7);
    /// nothing in Arabic. «القراءة» has its own line («الشرح متاح بالعربية»).
    @ViewBuilder private var note: some View {
        if page.kind != "reading", let n = page.inArabic, !n.isEmpty {
            Text(n)
                .font(MWFont.plex(10.5 * s))
                .foregroundColor(muted)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
    }

    private var moreLine: some View {
        Text(more)
            .font(MWFont.plex(11 * s, .semibold))
            .foregroundColor(fullColor ? MW.lapis : .white)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
    }

    // The quoted tafsir: whole while it fits, then its whole sentences.
    @ViewBuilder private func quoted(_ paragraphs: [String], ink: Color) -> some View {
        let text = paragraphs.joined(separator: " ")
        let sentences = MWSentences.split(text)
        if #available(iOS 16.0, macOS 13.0, *) {
            ViewThatFits(in: .vertical) {
                ForEach(MWTry.scales("q", [1, 0.85, 0.7])) { t in quotedBlock(text, t.k, cut: false) }
                ForEach(MWTry.counts("qc", MWSentences.counts(sentences.count - 1))) { t in
                    quotedBlock(sentences.prefix(t.n).joined(separator: " "), 0.7, cut: true)
                }
                quotedBlock("", 0.7, cut: true)
            }
        } else {
            quotedBlock(sentences.prefix(2).joined(separator: " "), 0.8, cut: sentences.count > 2)
        }
    }

    private func quotedBlock(_ text: String, _ k: CGFloat, cut: Bool) -> some View {
        let a = (base - 2) * s * k
        return VStack(spacing: 4 * s) {
            PartLabel(text: page.label, s: s)
            note
            if !text.isEmpty {
                Text(text)
                    .font(MWFont.amiri(a))
                    .lineSpacing(MWFont.amiriLineSpacing(a, cssLineHeight: 1.7))
                    .foregroundColor(ink)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .environment(\.layoutDirection, .rightToLeft)
            }
            if cut { moreLine }
            if let src = page.source {
                Text(src)
                    .font(MWFont.plex(10 * s))
                    .foregroundColor(muted)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            }
        }
        .frame(maxWidth: .infinity)
    }

    // «القراءة»: under its heading, in a dashed frame on another ground; its whole sentences that fit.
    @ViewBuilder private var reading: some View {
        let ss = page.sentences ?? []
        if #available(iOS 16.0, macOS 13.0, *) {
            ViewThatFits(in: .vertical) {
                ForEach(MWTry.counts("r", MWSentences.counts(ss.count, limit: 14))) { t in readingBlock(Array(ss.prefix(t.n)), cut: t.n < ss.count) }
                readingBlock([], cut: true)
            }
        } else {
            readingBlock(Array(ss.prefix(2)), cut: ss.count > 2)
        }
    }

    private func readingBlock(_ ss: [WidgetData.Sentence], cut: Bool) -> some View {
        let labelsAr = page.partLabels ?? []
        // One Text: each part a paragraph, its label first in bold.
        var text = Text("")
        var lastPart = -1
        for x in ss {
            if x.part != lastPart {
                if lastPart >= 0 { text = text + Text("\n") }
                let l = x.part < labelsAr.count ? labelsAr[x.part] : ""
                text = text + Text(l + " ").font(MWFont.plex(11.5 * s, .bold))
                lastPart = x.part
            } else {
                text = text + Text(" ")
            }
            text = text + Text(x.text)
        }
        return VStack(spacing: 4 * s) {
            PartLabel(text: page.label, s: s)
            if let a = page.inArabic {
                Text(a).font(MWFont.plex(10.5 * s)).foregroundColor(muted).lineLimit(1).minimumScaleFactor(0.7)
            }
            if !ss.isEmpty {
                text
                    .font(MWFont.plex(12 * s))
                    .lineSpacing(2 * s)
                    .foregroundColor(fullColor ? MW.rowText : .white)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .environment(\.layoutDirection, .rightToLeft)
                    .padding(.horizontal, 10 * s)
                    .padding(.vertical, 7 * s)
                    .background(RoundedRectangle(cornerRadius: 10 * s).fill(fullColor ? Color(hex: 0xfaf5e8) : Color.white.opacity(0.08)))
                    .overlay(RoundedRectangle(cornerRadius: 10 * s)
                        .strokeBorder(fullColor ? MW.frameOnPaper : Color.white.opacity(0.5), style: StrokeStyle(lineWidth: max(0.75, 1 * s), dash: [4 * s, 3 * s])))
            }
            if cut { moreLine }
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - «اسم الله لليوم»: large

/// The large widget: four pages at most, «شارك», then «السابق», its dots and «التالي» (NamePager; iOS 17); before
/// iOS 17 the first page alone, the whole widget opening the name's page.
struct NameLargeView<Btn: View>: View {
    var data: WidgetData?
    var date: Date
    var interactive: Bool
    var page: Int
    var button: (NamePill) -> Btn

    init(data: WidgetData?, date: Date, interactive: Bool, page: Int, @ViewBuilder button: @escaping (NamePill) -> Btn) {
        self.data = data
        self.date = date
        self.interactive = interactive
        self.page = page
        self.button = button
    }

    @Environment(\.mwFullColor) private var fullColor

    var body: some View {
        if let data = data, let day = NameNow.name(data, date), !day.pages.isEmpty {
            let count = interactive ? day.pages.count : 1
            let current = min(max(0, page), count - 1)
            let p = day.pages[current]
            let sky = NameNow.sky(data, date)
            MWCanvas(board: Board.large, rtl: data.rtl, lang: data.lang) { s, size in
                VStack(spacing: 0) {
                    // The sky: the shamsa large on the first page, the name in a line on the others.
                    ZStack {
                        // The shamsa in the middle with its line under it, or the name's line across the middle.
                        if fullColor {
                            NameSky(state: sky, s: s,
                                    clear: current == 0 ? [.oval(0.27, -0.02, 0.46, 0.9), .rect(0.18, 0.8, 0.64, 0.2)]
                                                        : [.rect(0.2, 0, 0.6, 1)],
                                    seed: current == 0 ? 21 : 22)
                        }
                        if current == 0 {
                            VStack(spacing: 2 * s) {
                                ShamsaName(name: day.name, d: 146 * s)
                                    .environment(\.mwSky, sky)
                                titleLine(data, day, s)
                            }
                            .padding(.top, 4 * s)
                        } else {
                            VStack(spacing: 1 * s) {
                                Text(day.name)
                                    .font(MWFont.amiri(24 * s, bold: true))
                                    .foregroundColor(fullColor ? MW.paper : .white)
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.6)
                                    .environment(\.layoutDirection, .rightToLeft)
                                    .mwAccentable()
                                titleLine(data, day, s)
                            }
                        }
                    }
                    .frame(height: (current == 0 ? 176 : 66) * s)
                    .clipped()
                    if fullColor { GoldBand(s: s) } else { Rectangle().fill(Color.white.opacity(0.4)).frame(height: max(1, 1 * s)) }
                    ZStack {
                        if fullColor { PaperBackground(s: s) }
                        VStack(spacing: 6 * s) {
                            NamePageContent(page: p, labels: data.labels, s: s, base: 19)
                                .frame(maxHeight: .infinity)
                            if interactive {
                                footer(data, day, count: count, current: current, s: s)
                            }
                        }
                        .padding(.top, 10 * s)
                        .padding(.bottom, 12 * s)
                        .padding(.horizontal, 18 * s)
                    }
                }
                .overlay(InsetFrame(color: fullColor ? MW.frameOnPaper : Color.white.opacity(0.35), s: s))
            }
        } else {
            QuietCard(text: data?.labels.openApp ?? MWFallback.openApp, ground: .sky, board: Board.large,
                      rtl: data?.rtl ?? MWFallback.rtl, lang: data?.lang ?? MWFallback.lang)
        }
    }

    private func titleLine(_ data: WidgetData, _ day: WidgetData.NameDay, _ s: CGFloat) -> some View {
        // «✦» in Arabic: a «·» beside «٢» reads as a zero (add-on 0072-add23 §4.4).
        Text("\(data.labels.nameOfDay ?? "اسم الله لليوم") \(data.lang == "ar" ? "✦" : "·") \(day.of)")
            .font(MWFont.plex(11.5 * s, .semibold))
            .foregroundColor(fullColor ? MW.gold2 : .white.opacity(0.85))
            .lineLimit(1)
            .minimumScaleFactor(0.7)
    }

    private func footer(_ data: WidgetData, _ day: WidgetData.NameDay, count: Int, current: Int, s: CGFloat) -> some View {
        NamePager(labels: data.labels, digits: data.tasbih.digits, shareUrl: day.shareUrl, count: count, current: current,
                  s: s, rtl: data.rtl, dots: true, button: button)
    }
}

// MARK: - Medium: the shamsa and the evidence beside it, «السابق» and «التالي» between pages 1 and 2

struct NameMediumView<Btn: View>: View {
    var data: WidgetData?
    var date: Date
    var interactive: Bool
    var page: Int
    var button: (NamePill) -> Btn

    init(data: WidgetData?, date: Date, interactive: Bool, page: Int, @ViewBuilder button: @escaping (NamePill) -> Btn) {
        self.data = data
        self.date = date
        self.interactive = interactive
        self.page = page
        self.button = button
    }

    @Environment(\.mwFullColor) private var fullColor

    var body: some View {
        if let data = data, let day = NameNow.name(data, date), !NameNow.mediumPages(day).isEmpty {
            let pages = NameNow.mediumPages(day)
            let count = interactive ? pages.count : 1
            let current = min(max(0, page), count - 1)
            let sky = NameNow.sky(data, date)
            MWCanvas(board: Board.medium, rtl: data.rtl, lang: data.lang) { s, size in
                ZStack {
                    if fullColor { PaperBackground(s: s) }
                    HStack(spacing: 0) {
                        ZStack {
                            if fullColor {
                                NameSky(state: sky, s: s, clear: [.oval(0.03, -0.02, 0.94, 0.9), .rect(0.2, 0.78, 0.6, 0.22)], seed: 23)
                            }
                            // «٢ من ٩٦» under the shamsa, on the plain sky where its rays have faded, not over them
                            // (add-on 0072-add23 §4.3): the shamsa a little smaller, no scrim.
                            VStack(spacing: 0) {
                                ShamsaName(name: day.name, d: 144 * s)
                                    .environment(\.mwSky, sky)
                                Text(day.of)
                                    .font(MWFont.plex(10.5 * s, .semibold))
                                    .foregroundColor(fullColor ? MW.gold2 : .white.opacity(0.85))
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.7)
                                    .padding(.top, 1 * s)
                            }
                        }
                        .frame(width: size.height, height: size.height)
                        .clipped()
                        Rectangle().fill(fullColor ? MW.gold : Color.white.opacity(0.4)).frame(width: max(1, 2 * s))
                        VStack(spacing: 4 * s) {
                            NamePageContent(page: pages[current], labels: data.labels, s: s, base: 16)
                                .frame(maxHeight: .infinity)
                            if interactive {
                                NamePager(labels: data.labels, digits: data.tasbih.digits, shareUrl: day.shareUrl, count: count,
                                          current: current, s: s * 0.9, rtl: data.rtl, dots: true, button: button)
                            }
                        }
                        .padding(.top, 10 * s)
                        .padding(.bottom, 10 * s)
                        .padding(.horizontal, 14 * s)
                    }
                    InsetFrame(color: fullColor ? MW.frameOnPaper : Color.white.opacity(0.35), s: s)
                }
            }
        } else {
            QuietCard(text: data?.labels.openApp ?? MWFallback.openApp, ground: .paper, board: Board.medium,
                      rtl: data?.rtl ?? MWFallback.rtl, lang: data?.lang ?? MWFallback.lang)
        }
    }
}

// MARK: - Small (and StandBy): the name in the shamsa, «٥ من ٩٦»

/// The ground of the small widget, given to the container so the system may take it away (StandBy, the accented modes).
struct NameSmallBackground: View {
    var data: WidgetData?
    var date: Date

    var body: some View {
        GeometryReader { geo in
            let s = Board.scale(geo.size, board: Board.small)
            ZStack {
                // The shamsa fills the box from the top, «٥ من ٩٦» across the foot: the stars in the top corners.
                NameSky(state: NameNow.sky(data, date), s: s, clear: [.oval(0, -0.04, 1, 1.02), .rect(0, 0.78, 1, 0.22)], seed: 24)
            }
        }
    }
}

struct NameSmallView: View {
    var data: WidgetData?
    var date: Date
    @Environment(\.mwFullColor) private var fullColor
    @Environment(\.mwShowsBackground) private var showsBackground

    var body: some View {
        if let data = data, let day = NameNow.name(data, date) {
            MWCanvas(board: Board.small, rtl: data.rtl, lang: data.lang) { s, size in
                ZStack {
                    VStack(spacing: 0) {
                        ShamsaName(name: day.name, d: (showsBackground ? 172 : 150) * s)
                            .environment(\.mwSky, NameNow.sky(data, date))
                            .padding(.top, (showsBackground ? -6 : 0) * s)
                        Spacer(minLength: 0)
                    }
                    // «٥ من ٩٦» over the shamsa's last rays: a soft lapis dusk rising from the foot over two fifths of the
                    // widget, with no edge (add-on 0072-add53: no hard box behind a text).
                    if fullColor && showsBackground {
                        VStack(spacing: 0) {
                            Spacer(minLength: 0)
                            LinearGradient(stops: [.init(color: Color(hex: 0x091634, alpha: 0), location: 0),
                                                   .init(color: Color(hex: 0x091634, alpha: 0.35), location: 0.45),
                                                   .init(color: Color(hex: 0x091634, alpha: 0.72), location: 1)],
                                           startPoint: .top, endPoint: .bottom)
                                .frame(height: size.height * 0.42)
                        }
                        .allowsHitTesting(false)
                    }
                    VStack(spacing: 0) {
                        Spacer(minLength: 0)
                        Text(day.of)
                            .font(MWFont.plex(12 * s, .semibold))
                            .foregroundColor(fullColor ? (showsBackground ? MW.paper : MW.gold2) : .white.opacity(0.85))
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            .padding(.horizontal, 12 * s)
                            .frame(maxWidth: .infinity)
                            .padding(.top, 8 * s)
                            .padding(.bottom, 11 * s)
                    }
                    if showsBackground {
                        InsetFrame(color: fullColor ? MW.frameOnSky : Color.white.opacity(0.35), s: s)
                    }
                }
                .accessibilityElement(children: .combine)
            }
        } else {
            QuietCard(text: data?.labels.openApp ?? MWFallback.openApp, ground: .medallion, board: Board.small,
                      rtl: data?.rtl ?? MWFallback.rtl, lang: data?.lang ?? MWFallback.lang)
        }
    }
}

// MARK: - The lock screen

/// The rectangle: the name, and «اسم الله لليوم» under it.
struct NameRectangularView: View {
    var data: WidgetData?
    var date: Date

    var body: some View {
        let day = NameNow.name(data, date)
        VStack(alignment: .center, spacing: 0) {
            Text(day?.name ?? "")
                .font(MWFont.amiri(22, bold: true))
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .environment(\.layoutDirection, .rightToLeft)
                .mwAccentable()
            Text(day == nil ? (data?.labels.openApp ?? MWFallback.openApp) : (data?.labels.nameOfDay ?? "اسم الله لليوم"))
                .font(MWFont.plex(12, .medium))
                .opacity(0.8)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .environment(\.layoutDirection, (data?.rtl ?? MWFallback.rtl) ? .rightToLeft : .leftToRight)
    }
}

/// The line: the name.
struct NameInlineView: View {
    var data: WidgetData?
    var date: Date

    var body: some View {
        Text(NameNow.name(data, date)?.name ?? (data?.labels.nameOfDay ?? "اسم الله لليوم"))
    }
}

// MARK: - «من أقوال السلف»: medium and large

/// The saying as its card has it, the narrator's gloss lighter; then «قال» or «يُروى عن», then the book with its author
/// and place. Arabic in every language. The saying is a short quote (one to three lines): it shrinks to fit, and is
/// never cut.
struct SalafView: View {
    var data: WidgetData?
    var date: Date
    var family: MWFamily
    @Environment(\.mwFullColor) private var fullColor

    var body: some View {
        let board = family == .large ? Board.large : Board.medium
        if let data = data, let c = NameNow.salaf(data, date) {
            MWCanvas(board: board, rtl: true, lang: "ar") { s, _ in
                ZStack {
                    if fullColor { PaperBackground(s: s) }
                    VStack(spacing: (family == .large ? 10 : 4) * s) {
                        HStack(spacing: 6 * s) {
                            Text("من أقوال السلف")
                                .font(MWFont.amiri((family == .large ? 18 : 14) * s, bold: true))
                                .foregroundColor(fullColor ? MW.goldInk : .white.opacity(0.85))
                                .lineLimit(1)
                            Spacer(minLength: 0)
                            if family == .large {
                                Text(c.topic)
                                    .font(MWFont.plex(11 * s, .semibold))
                                    .foregroundColor(fullColor ? MW.goldInk : .white.opacity(0.85))
                                    .lineLimit(1)
                            }
                        }
                        // Outside Arabic: «النص بالعربية» in the app's language above the saying, which stays Arabic,
                        // never translated (add-on 0072-add23 §4.7–§4.8).
                        if data.lang != "ar", let q = data.labels.quoteInArabic, !q.isEmpty {
                            Text(q)
                                .font(MWFont.plex((family == .large ? 11.5 : 10) * s))
                                .foregroundColor(fullColor ? MW.muted : .white.opacity(0.75))
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                                .environment(\.layoutDirection, data.rtl ? .rightToLeft : .leftToRight)
                        }
                        saying(c, s)
                            .frame(maxHeight: .infinity)
                        VStack(spacing: 2 * s) {
                            Text(c.attribution)
                                .font(MWFont.plex((family == .large ? 14 : 12) * s, .semibold))
                                .foregroundColor(fullColor ? MW.ink : .white)
                                .lineLimit(1)
                                .minimumScaleFactor(0.6)
                                .mwAccentable()
                            Text(c.source)
                                .font(MWFont.plex((family == .large ? 11.5 : 10.5) * s))
                                .foregroundColor(fullColor ? MW.muted : .white.opacity(0.75))
                                .lineLimit(2)
                                .minimumScaleFactor(0.6)
                                .multilineTextAlignment(.center)
                        }
                        HStack {
                            Spacer(minLength: 0)
                            if let url = URL(string: c.shareUrl) {
                                Link(destination: url) { NamePill(text: data.labels.share ?? "شارك", s: s * (family == .large ? 1 : 0.85), filled: false) }
                            }
                        }
                    }
                    .padding(.vertical, (family == .large ? 18 : 10) * s)
                    .padding(.horizontal, (family == .large ? 22 : 16) * s)
                    InsetFrame(color: fullColor ? MW.frameOnPaper : Color.white.opacity(0.35), s: s)
                }
            }
        } else {
            QuietCard(text: data?.labels.openApp ?? MWFallback.openApp, ground: .paper, board: board,
                      rtl: data?.rtl ?? MWFallback.rtl, lang: data?.lang ?? MWFallback.lang)
        }
    }

    private func sayingText(_ c: WidgetData.SalafDay) -> Text {
        c.parts.reduce(Text("")) { acc, p in
            acc + Text(p.text).foregroundColor(p.gloss ? (fullColor ? Color(hex: 0x6b6153) : .white.opacity(0.7)) : (fullColor ? MW.hadithText : .white))
        }
    }

    @ViewBuilder private func saying(_ c: WidgetData.SalafDay, _ s: CGFloat) -> some View {
        let base: CGFloat = family == .large ? 24 : 17
        if #available(iOS 16.0, macOS 13.0, *) {
            ViewThatFits(in: .vertical) {
                ForEach(MWTry.scales("s", [1, 0.9, 0.8, 0.7, 0.6, 0.5])) { t in let k = t.k
                    sayingText(c)
                        .font(MWFont.amiri(base * s * k))
                        .lineSpacing(MWFont.amiriLineSpacing(base * s * k, cssLineHeight: 1.8))
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        } else {
            sayingText(c)
                .font(MWFont.amiri(base * s * 0.8))
                .multilineTextAlignment(.center)
                .minimumScaleFactor(0.5)
        }
    }
}

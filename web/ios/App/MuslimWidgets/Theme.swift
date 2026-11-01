import SwiftUI
#if os(iOS)
import WidgetKit
#endif

// The widgets' look (reply 0046), from out/design-v2/widgets/widgets.html: its colours, fonts, frames and backgrounds.
// The board draws a 179-pt small widget; every size here is that board's number times `s`, the real widget's size over
// the board's. Pure SwiftUI so the same views render on macOS for the screenshots.

// MARK: - Colours

extension Color {
    init(hex: UInt32, alpha: Double = 1) {
        self.init(.sRGB,
                  red: Double((hex >> 16) & 0xff) / 255,
                  green: Double((hex >> 8) & 0xff) / 255,
                  blue: Double(hex & 0xff) / 255,
                  opacity: alpha)
    }
}

enum MW {
    static let lapis = Color(hex: 0x13306b)
    static let ink = Color(hex: 0x1b3466)
    static let gold = Color(hex: 0xc9a04e)
    static let gold2 = Color(hex: 0xe2c27c)
    static let goldDark = Color(hex: 0x94712c)
    static let paper = Color(hex: 0xf3ead6)
    static let muted = Color(hex: 0x6b5a45)
    static let paperBase = Color(hex: 0xf1e6cc)
    static let skyMid = Color(hex: 0x163a7c)
    static let countdown = Color(hex: 0xf1d391)
    static let discMonth = Color(hex: 0x5d4a2c)
    static let discYear = Color(hex: 0x6b5636)
    static let rowText = Color(hex: 0x3b2c17)
    static let hadithText = Color(hex: 0x2b2113)
    static let datesText = Color(hex: 0xdfe6f5)
    /// The inner frame on the sky and the medallion, and on the paper.
    static let frameOnSky = Color(hex: 0xe2c27c, alpha: 0.75)
    static let frameOnPaper = Color(hex: 0xa77f33, alpha: 0.6)
    /// Under the sky's picture while it loads: the picture's own mean tone.
    static let skyField = Color(hex: 0x1a2e55)
    /// The date card's stars: their gold, and the light at their heart.
    static let starGold = Color(hex: 0xd4ad5e)
    static let starHeart = Color(hex: 0xf4e3b5)
}

// MARK: - Fonts (bundled in the extension, PostScript names)

enum MWFont {
    enum Weight { case regular, medium, semibold, bold }

    /// IBM Plex Sans Arabic, the interface. Fixed sizes: a widget's space is fixed, so the board's proportions hold.
    static func plex(_ size: CGFloat, _ weight: Weight = .regular) -> Font {
        let name: String
        switch weight {
        case .regular: name = "IBMPlexSansArabic-Regular"
        case .medium: name = "IBMPlexSansArabic-Medium"
        case .semibold: name = "IBMPlexSansArabic-SemiBold"
        case .bold: name = "IBMPlexSansArabic-Bold"
        }
        return Font.custom(name, fixedSize: size)
    }

    /// Amiri, for the ayah, the hadith and the zikr.
    static func amiri(_ size: CGFloat, bold: Bool = false) -> Font {
        Font.custom(bold ? "Amiri-Bold" : "Amiri-Regular", fixedSize: size)
    }

    /// Amiri's own line is 1.758 em (ascent 1.124 + descent 0.634); the board's CSS line-height L needs this much more.
    static func amiriLineSpacing(_ size: CGFloat, cssLineHeight: CGFloat) -> CGFloat {
        max(0, (cssLineHeight - 1.758) * size)
    }
}

// MARK: - Images

/// The widget loads its pictures from the extension's asset catalog by name; the macOS renderer hands in the same
/// pictures loaded from files.
struct MWImages {
    var named: [String: Image] = [:]
    func image(_ name: String) -> Image { named[name] ?? Image(name) }
}

private struct MWImagesKey: EnvironmentKey {
    static let defaultValue = MWImages()
}

private struct MWLiveTimersKey: EnvironmentKey {
    static let defaultValue = true
}

extension EnvironmentValues {
    var mwImages: MWImages {
        get { self[MWImagesKey.self] }
        set { self[MWImagesKey.self] = newValue }
    }
    /// True in the widget: the countdown is the system's live timer. The renderer sets false for a still picture.
    var mwLiveTimers: Bool {
        get { self[MWLiveTimersKey.self] }
        set { self[MWLiveTimersKey.self] = newValue }
    }
}

// MARK: - The board's scale

struct Board {
    /// The board's 179-pt small widget, 380 × 179 medium and 380 × 396 large.
    static let small = CGSize(width: 179, height: 179)
    static let medium = CGSize(width: 380, height: 179)
    static let large = CGSize(width: 380, height: 396)

    static func scale(_ size: CGSize, board: CGSize) -> CGFloat {
        guard size.width > 0, size.height > 0 else { return 1 }
        return min(size.width / board.width, size.height / board.height)
    }
}

// MARK: - Frames and backgrounds

/// The inner gold frame: 1 pt at inset 6, concentric with the widget's own corner (ContainerRelativeShape).
struct InsetFrame: View {
    var color: Color
    var s: CGFloat
    var inset: CGFloat = 6
    var width: CGFloat = 1

    var body: some View {
        ContainerRelativeShape()
            .inset(by: inset * s)
            .strokeBorder(color, lineWidth: max(0.75, width * s))
            .allowsHitTesting(false)
    }
}

/// A picture repeated as CSS `background: url() center / w` does: tiles of the given size, one centred.
struct TiledImage: View {
    var name: String
    var tile: CGSize
    @Environment(\.mwImages) private var images

    var body: some View {
        GeometryReader { geo in
            let w = max(tile.width, 1), h = max(tile.height, 1)
            // The tile centred on the box, then as many on each side as cover it.
            let x0 = geo.size.width / 2 - w / 2, y0 = geo.size.height / 2 - h / 2
            let left = Int(ceil(x0 / w)), top = Int(ceil(y0 / h))
            let cols = left + Int(ceil((geo.size.width - x0) / w))
            let rows = top + Int(ceil((geo.size.height - y0) / h))
            let image = images.image(name)
            ZStack(alignment: .topLeading) {
                ForEach(0..<max(rows, 1), id: \.self) { r in
                    ForEach(0..<max(cols, 1), id: \.self) { c in
                        image
                            .resizable()
                            .frame(width: w, height: h)
                            .offset(x: x0 + CGFloat(c - left) * w, y: y0 + CGFloat(r - top) * h)
                    }
                }
            }
            .frame(width: geo.size.width, height: geo.size.height, alignment: .topLeading)
            .environment(\.layoutDirection, .leftToRight)
        }
        .clipped()
    }
}

/// The sky (add-on 0072-add53, Talal's word of 31 October): the approved painting's own lapis with no star in it
/// (sky.png, 1121 × 253, cut from welcome-B4 by web/scripts/sky-lapis-cut.py), drawn once over the whole box as CSS
/// `cover` (never tiled, so no seam), and over it small sharp gold stars drawn in code (SkyStars), as the date card's
/// sky. `clear` is where the text and the shamsa are, so no star falls on them.
struct SkyBackground: View {
    var s: CGFloat
    var clear: [SkyClear] = []
    var seed: UInt32 = 1
    @Environment(\.mwImages) private var images

    var body: some View {
        ZStack {
            MW.skyField
            GeometryReader { geo in
                images.image("sky")
                    .resizable()
                    .interpolation(.high)
                    .scaledToFill()
                    .frame(width: geo.size.width, height: geo.size.height)
                    .clipped()
            }
            SkyStars(s: s, clear: clear, seed: seed)
        }
        .compositingGroup()
    }
}

/// A place the stars keep out of, in the box's unit square: x from the reading's start (mirrored right to left).
struct SkyClear {
    var x: CGFloat
    var y: CGFloat
    var w: CGFloat
    var h: CGFloat
    var oval = false

    static func rect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> SkyClear { SkyClear(x: x, y: y, w: w, h: h) }
    static func oval(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> SkyClear { SkyClear(x: x, y: y, w: w, h: h, oval: true) }

    /// Whether a star at (px, py) of radius r, in a box of `size`, touches this place (with `pad` round it).
    func hits(_ px: CGFloat, _ py: CGFloat, _ r: CGFloat, _ size: CGSize, pad: CGFloat) -> Bool {
        let x0 = x * size.width, y0 = y * size.height, x1 = (x + w) * size.width, y1 = (y + h) * size.height
        if oval {
            let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
            let rx = (x1 - x0) / 2 + r + pad, ry = (y1 - y0) / 2 + r + pad
            let dx = (px - cx) / rx, dy = (py - cy) / ry
            return dx * dx + dy * dy < 1
        }
        return px > x0 - r - pad && px < x1 + r + pad && py > y0 - r - pad && py < y1 + r + pad
    }
}

/// The stars' places, the same on every platform for the same box (web/src/v2/daily/names/sky-stars.ts and
/// WidgetPainter.java SkyStars carry the same steps): a seeded mulberry32, then darts thrown into the box and kept when
/// they are whole inside it (12 pt in from its edge, past the inner frame at 6), clear of the text and of each other.
/// Sparse and of mixed sizes, as the date card's sky: about one star for every 2,600 pt² at the board's scale.
enum SkyStarField {
    struct Star { var x: CGFloat; var y: CGFloat; var r: CGFloat }

    /// Radii in board points and how often each comes: most small, a few larger.
    static let sizes: [(CGFloat, Double)] = [(3.2, 0.4), (4.2, 0.75), (5.2, 0.93), (6.4, 1.0)]
    /// The heart's radius over the star's, one number on the three platforms (worker/test/sky-stars-0072.test.ts).
    static let heartRatio: CGFloat = 0.2

    static func place(_ size: CGSize, s: CGFloat, clear: [SkyClear], seed: UInt32) -> [Star] {
        var a: UInt32 = seed &* 0x9E3779B9 &+ 0x6D2B79F5
        func next() -> Double {
            a = a &+ 0x6D2B79F5
            var t = a
            t = (t ^ (t >> 15)) &* (t | 1)
            t ^= t &+ ((t ^ (t >> 7)) &* (t | 61))
            return Double(t ^ (t >> 14)) / 4294967296
        }
        let w = size.width, h = size.height
        guard w > 0, h > 0, s > 0 else { return [] }
        let margin = 12 * s
        let target = min(40, max(1, Int((w * h / (2600 * s * s)).rounded())))
        var stars: [Star] = []
        for _ in 0..<(target * 60) {
            if stars.count >= target { break }
            let u = next()
            let r = (sizes.first { u < $0.1 }?.0 ?? 3.2) * s
            let px = margin + r + CGFloat(next()) * max(0, w - 2 * (margin + r))
            let py = margin + r + CGFloat(next()) * max(0, h - 2 * (margin + r))
            if w - 2 * (margin + r) <= 0 || h - 2 * (margin + r) <= 0 { continue }
            if clear.contains(where: { $0.hits(px, py, r, size, pad: 3 * s) }) { continue }
            if stars.contains(where: { hypot($0.x - px, $0.y - py) < 26 * s + $0.r + r }) { continue }
            stars.append(Star(x: px, y: py, r: r))
        }
        return stars
    }
}

/// One star of the date card: eight sharp rays, the four on the axes long and the four between them half as long,
/// on a fine waist, with a light at the heart.
struct SkyStarShape: Shape {
    var stars: [SkyStarField.Star]
    var heart = false

    func path(in rect: CGRect) -> Path {
        var p = Path()
        for st in stars {
            if heart {
                let k = st.r * SkyStarField.heartRatio
                p.addEllipse(in: CGRect(x: st.x - k, y: st.y - k, width: 2 * k, height: 2 * k))
                continue
            }
            for i in 0..<16 {
                let angle = Double(i) * .pi / 8 - .pi / 2
                let len: CGFloat = i % 4 == 0 ? st.r : (i % 2 == 0 ? st.r * 0.5 : st.r * 0.15)
                let pt = CGPoint(x: st.x + len * CGFloat(cos(angle)), y: st.y + len * CGFloat(sin(angle)))
                if i == 0 { p.move(to: pt) } else { p.addLine(to: pt) }
            }
            p.closeSubpath()
        }
        return p
    }
}

/// The stars over the sky, placed by SkyStarField; mirrored right to left with the reading.
struct SkyStars: View {
    var s: CGFloat
    var clear: [SkyClear] = []
    var seed: UInt32 = 1
    @Environment(\.layoutDirection) private var direction

    var body: some View {
        GeometryReader { geo in
            let rtl = direction == .rightToLeft
            let places = clear.map { c -> SkyClear in
                var m = c
                if rtl { m.x = 1 - c.x - c.w }
                return m
            }
            let stars = SkyStarField.place(geo.size, s: s, clear: places, seed: seed)
            ZStack {
                SkyStarShape(stars: stars).fill(MW.starGold)
                SkyStarShape(stars: stars, heart: true).fill(MW.starHeart)
            }
            .environment(\.layoutDirection, .leftToRight)
        }
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

/// The paper: paper.png at 320 px over #f1e6cc.
struct PaperBackground: View {
    var s: CGFloat

    var body: some View {
        ZStack {
            MW.paperBase
            TiledImage(name: "paper", tile: CGSize(width: 320 * s, height: 320 * s))
        }
    }
}

/// The shamsa: medallion.png at 208/179 of the box, placed as CSS `center 44%` (its 44% on the box's 44%), on #163a7c.
struct MedallionBackground: View {
    var s: CGFloat
    @Environment(\.mwImages) private var images

    var body: some View {
        GeometryReader { geo in
            let d = 208 * s
            ZStack(alignment: .topLeading) {
                MW.skyMid
                images.image("medallion")
                    .resizable()
                    .interpolation(.high)
                    .frame(width: d, height: d)
                    .offset(x: (geo.size.width - d) / 2, y: (geo.size.height - d) * 0.44)
            }
            .frame(width: geo.size.width, height: geo.size.height, alignment: .topLeading)
            .environment(\.layoutDirection, .leftToRight)
        }
        .clipped()
    }
}

/// The gold band under the large widget's sky: 3 px, #a77f33 → #f0d58f → #a77f33.
struct GoldBand: View {
    var s: CGFloat

    var body: some View {
        LinearGradient(colors: [Color(hex: 0xa77f33), Color(hex: 0xf0d58f), Color(hex: 0xa77f33)],
                       startPoint: UnitPoint(x: 0, y: 0.5), endPoint: UnitPoint(x: 1, y: 0.5))
            .frame(height: max(2, 3 * s))
    }
}

/// The hadith's grade: #2f6b4a on #dcefe3, border #a9d4b8, a pill.
struct GradeBadge: View {
    var text: String
    var s: CGFloat

    var body: some View {
        Text(text)
            .font(MWFont.plex(11 * s, .semibold))
            .foregroundColor(Color(hex: 0x2f6b4a))
            .lineLimit(1)
            .padding(.horizontal, 10 * s)
            .padding(.vertical, 2 * s)
            .background(Capsule().fill(Color(hex: 0xdcefe3)))
            .overlay(Capsule().strokeBorder(Color(hex: 0xa9d4b8), lineWidth: max(0.75, 1 * s)))
            .fixedSize()
    }
}

/// Arabic-script text (the ayah, the hadith, the zikr) keeps its own direction in a left-to-right widget.
enum MWScript {
    static func isRTL(_ text: String) -> Bool {
        for u in text.unicodeScalars where u.properties.isAlphabetic {
            switch u.value {
            case 0x0590...0x08FF, 0xFB1D...0xFDFF, 0xFE70...0xFEFF: return true
            default: return false
            }
        }
        return false
    }

    static func direction(_ text: String) -> LayoutDirection { isRTL(text) ? .rightToLeft : .leftToRight }
}

// MARK: - Lock screen accent

extension View {
    /// The lock screen's accented part (iOS 16+); nothing elsewhere.
    @ViewBuilder func mwAccentable(_ on: Bool = true) -> some View {
        #if os(iOS)
        if #available(iOS 16.0, *) {
            self.widgetAccentable(on)
        } else {
            self
        }
        #else
        self
        #endif
    }
}

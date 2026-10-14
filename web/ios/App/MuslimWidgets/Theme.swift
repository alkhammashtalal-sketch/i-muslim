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

/// The sky: radial-gradient(90% 90% at 50% 40%, #1f4a96 0, #163a7c 60%, #0f2a5e 100%), and sky.png at 180 px, 0.55,
/// screen.
struct SkyBackground: View {
    var s: CGFloat

    var body: some View {
        ZStack {
            EllipticalGradient(
                stops: [
                    .init(color: Color(hex: 0x1f4a96), location: 0),
                    .init(color: Color(hex: 0x163a7c), location: 0.6),
                    .init(color: Color(hex: 0x0f2a5e), location: 1),
                ],
                center: UnitPoint(x: 0.5, y: 0.4),
                startRadiusFraction: 0,
                endRadiusFraction: 0.9)
            TiledImage(name: "sky", tile: CGSize(width: 180 * s, height: 180 * s * 235 / 230))
                .opacity(0.55)
                .blendMode(.screen)
        }
        .compositingGroup()
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

/// The board's ✦: a four-pointed star with curved sides, gold2 at 0.85.
struct Sparkle: Shape {
    func path(in rect: CGRect) -> Path {
        let c = CGPoint(x: rect.midX, y: rect.midY)
        let rx = rect.width / 2, ry = rect.height / 2
        let k: CGFloat = 0.18
        var p = Path()
        p.move(to: CGPoint(x: c.x, y: c.y - ry))
        p.addQuadCurve(to: CGPoint(x: c.x + rx, y: c.y), control: CGPoint(x: c.x + rx * k, y: c.y - ry * k))
        p.addQuadCurve(to: CGPoint(x: c.x, y: c.y + ry), control: CGPoint(x: c.x + rx * k, y: c.y + ry * k))
        p.addQuadCurve(to: CGPoint(x: c.x - rx, y: c.y), control: CGPoint(x: c.x - rx * k, y: c.y + ry * k))
        p.addQuadCurve(to: CGPoint(x: c.x, y: c.y - ry), control: CGPoint(x: c.x - rx * k, y: c.y - ry * k))
        p.closeSubpath()
        return p
    }
}

/// Stars placed as the board's spans: top and left in board points, and the glyph's font size. The board is right to
/// left with the text at the right; left to right, the stars move to the other side, away from the text.
struct Stars: View {
    struct Star { var top: CGFloat; var left: CGFloat; var size: CGFloat }
    var stars: [Star]
    var s: CGFloat
    @Environment(\.layoutDirection) private var direction

    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .topLeading) {
                ForEach(0..<stars.count, id: \.self) { i in
                    let st = stars[i]
                    let d = st.size * 0.8 * s
                    let x = (st.left + st.size * 0.1) * s
                    Sparkle()
                        .fill(MW.gold2.opacity(0.85))
                        .frame(width: d, height: d)
                        .offset(x: direction == .rightToLeft ? x : geo.size.width - x - d, y: (st.top + st.size * 0.35) * s)
                }
            }
            .frame(width: geo.size.width, height: geo.size.height, alignment: .topLeading)
            .environment(\.layoutDirection, .leftToRight)
        }
        .allowsHitTesting(false)
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

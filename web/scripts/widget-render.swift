import CoreText
import SwiftUI
import UIKit
import WidgetKit

// The approval pictures of «اسم الله لليوم» and «من أقوال السلف» (add-on 0072-add10; web/scripts/widget-render.sh):
// the widget extension's own views (web/ios/App/MuslimWidgets: NameViews.swift, Views.swift, Theme.swift,
// WidgetData.swift), with its fonts and pictures, on the file the app writes (worker/test/widget-names-0072.test.ts
// WIDGET_SAMPLES), drawn by SwiftUI's ImageRenderer inside the iOS simulator (xcrun simctl spawn), at the device's
// widget sizes and scale. WidgetKit's own compositing of the tinted and clear modes, StandBy and the lock screen is not
// available outside SpringBoard: the views are drawn in the mode the system gives them (widgetRenderingMode accented,
// no container background), and the system's tint, glass and wallpaper are imitated around them, as said in the README.
//   render <widgets dir> <samples dir> <out dir> <promax|se>

struct Device {
    var name: String
    var scale: CGFloat
    var small: CGSize
    var medium: CGSize
    var large: CGSize
    var rect: CGSize
    var inline: CGSize
    var corner: CGFloat
    var screen: CGSize
}

let devices: [String: Device] = [
    // Apple HIG «Widgets» sizes: iPhone 16 Pro Max (430 × 932 pt) and iPhone SE 3rd generation (375 × 667 pt).
    "promax": Device(name: "16promax", scale: 3, small: CGSize(width: 170, height: 170), medium: CGSize(width: 364, height: 170),
                     large: CGSize(width: 364, height: 382), rect: CGSize(width: 172, height: 76), inline: CGSize(width: 257, height: 26),
                     corner: 23, screen: CGSize(width: 430, height: 932)),
    "se": Device(name: "se", scale: 2, small: CGSize(width: 148, height: 148), medium: CGSize(width: 321, height: 148),
                 large: CGSize(width: 321, height: 324), rect: CGSize(width: 157, height: 72), inline: CGSize(width: 234, height: 26),
                 corner: 21, screen: CGSize(width: 375, height: 667)),
]

let args = CommandLine.arguments
guard args.count >= 5, let device = devices[args[4]] else {
    print("render <widgets dir> <samples dir> <out dir> <promax|se>")
    exit(2)
}
let widgets = URL(fileURLWithPath: args[1])
let samples = URL(fileURLWithPath: args[2])
let out = URL(fileURLWithPath: args[3])
try? FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)

for f in (try? FileManager.default.contentsOfDirectory(at: widgets.appendingPathComponent("Fonts"), includingPropertiesForKeys: nil)) ?? []
where f.pathExtension == "ttf" {
    CTFontManagerRegisterFontsForURL(f as CFURL, .process, nil)
}

func asset(_ name: String) -> Image {
    let u = widgets.appendingPathComponent("Assets.xcassets/\(name).imageset/\(name).png")
    return Image(uiImage: UIImage(contentsOfFile: u.path) ?? UIImage())
}
let images = MWImages(named: ["medallion": asset("medallion"), "paper": asset("paper"), "sky": asset("sky")])

func load(_ name: String) -> WidgetData {
    let d = try! Data(contentsOf: samples.appendingPathComponent("\(name).json"))
    return try! JSONDecoder().decode(WidgetData.self, from: d)
}

enum Mode: String { case full, tinted, clear }

@MainActor
func cg<V: View>(_ view: V, _ size: CGSize) -> CGImage {
    let r = ImageRenderer(content: view.frame(width: size.width, height: size.height))
    r.scale = device.scale
    r.isOpaque = false
    return r.cgImage!
}

@MainActor
func widget<V: View>(_ view: V, _ size: CGSize, mode: Mode, showsBackground: Bool = true, background: Color? = nil) -> some View {
    let full = mode == .full
    return view
        .environment(\.mwImages, images)
        .environment(\.mwLiveTimers, false)
        .environment(\.mwFullColor, full)
        .environment(\.mwShowsBackground, full && showsBackground)
        .environment(\.widgetRenderingMode, full ? .fullColor : .accented)
        .background(background ?? Color.clear)
        .frame(width: size.width, height: size.height)
        .containerShape(RoundedRectangle(cornerRadius: device.corner, style: .continuous))
        .clipShape(RoundedRectangle(cornerRadius: device.corner, style: .continuous))
}

func save(_ image: CGImage, _ name: String) {
    let u = out.appendingPathComponent("\(name).png")
    try! UIImage(cgImage: image).pngData()!.write(to: u)
    print(u.path)
}

/// A drawing context of `size` points at the device's scale, top-left origin.
func canvas(_ size: CGSize, _ draw: (CGContext) -> Void) -> CGImage {
    let w = Int(size.width * device.scale), h = Int(size.height * device.scale)
    let ctx = CGContext(data: nil, width: w, height: h, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpace(name: CGColorSpace.sRGB)!,
                        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.translateBy(x: 0, y: CGFloat(h))
    ctx.scaleBy(x: device.scale, y: -device.scale)
    draw(ctx)
    return ctx.makeImage()!
}

/// Draws a CGImage in a rect of the top-left canvas (CGContext draws images bottom-up).
func put(_ ctx: CGContext, _ img: CGImage, _ r: CGRect) {
    ctx.saveGState()
    ctx.translateBy(x: r.minX, y: r.maxY)
    ctx.scaleBy(x: 1, y: -1)
    ctx.draw(img, in: CGRect(origin: .zero, size: r.size))
    ctx.restoreGState()
}

/// The content's alpha filled with one colour: how the system tints a widget in the accented modes.
func tint(_ ctx: CGContext, _ content: CGImage, _ r: CGRect, _ color: UIColor) {
    ctx.saveGState()
    ctx.translateBy(x: r.minX, y: r.maxY)
    ctx.scaleBy(x: 1, y: -1)
    ctx.clip(to: CGRect(origin: .zero, size: r.size), mask: content)
    ctx.setFillColor(color.cgColor)
    ctx.fill(CGRect(origin: .zero, size: r.size))
    ctx.restoreGState()
}

func rounded(_ r: CGRect, _ c: CGFloat) -> CGPath { CGPath(roundedRect: r, cornerWidth: c, cornerHeight: c, transform: nil) }

/// A wallpaper: the welcome painting's lapis, darkened, as an imitation of a photo behind the glass.
func wallpaper(_ ctx: CGContext, _ size: CGSize, dark: Bool) {
    let colors = (dark ? [UIColor(red: 0.05, green: 0.08, blue: 0.16, alpha: 1), UIColor(red: 0.12, green: 0.10, blue: 0.22, alpha: 1)]
                       : [UIColor(red: 0.35, green: 0.47, blue: 0.70, alpha: 1), UIColor(red: 0.80, green: 0.62, blue: 0.52, alpha: 1)]).map(\.cgColor)
    let g = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB)!, colors: colors as CFArray, locations: [0, 1])!
    ctx.drawLinearGradient(g, start: .zero, end: CGPoint(x: size.width * 0.3, y: size.height), options: [.drawsBeforeStartLocation, .drawsAfterEndLocation])
}

@MainActor
func home<V: View>(_ view: V, _ size: CGSize, _ name: String, modes: [Mode] = [.full], background: NameSmallBackground? = nil) {
    for mode in modes {
        let pad: CGFloat = 18
        let board = CGSize(width: size.width + pad * 2, height: size.height + pad * 2)
        let r = CGRect(x: pad, y: pad, width: size.width, height: size.height)
        switch mode {
        case .full:
            // The small widget's sky is its container background: drawn behind it here, as the system does.
            let img = cg(widget(ZStack { if let b = background { b.environment(\.mwImages, images) }; view }, size, mode: .full), size)
            save(canvas(board) { ctx in wallpaper(ctx, board, dark: false); put(ctx, img, r) }, "\(name)")
        case .tinted:
            // iOS 18 «Tinted»: a dark tinted plate, the content in the tint.
            let img = cg(widget(view, size, mode: .tinted), size)
            save(canvas(board) { ctx in
                wallpaper(ctx, board, dark: true)
                ctx.addPath(rounded(r, device.corner)); ctx.setFillColor(UIColor(red: 0.10, green: 0.16, blue: 0.27, alpha: 0.92).cgColor); ctx.fillPath()
                tint(ctx, img, r, UIColor(red: 0.62, green: 0.78, blue: 1.0, alpha: 1))
            }, "\(name)-tinted")
        case .clear:
            // iOS 26 «Clear»: glass over the wallpaper, the content in white.
            let img = cg(widget(view, size, mode: .clear), size)
            save(canvas(board) { ctx in
                wallpaper(ctx, board, dark: false)
                ctx.addPath(rounded(r, device.corner)); ctx.setFillColor(UIColor(white: 1, alpha: 0.16).cgColor); ctx.fillPath()
                ctx.addPath(rounded(r.insetBy(dx: 0.5, dy: 0.5), device.corner)); ctx.setStrokeColor(UIColor(white: 1, alpha: 0.35).cgColor); ctx.setLineWidth(1); ctx.strokePath()
                ctx.saveGState(); ctx.addPath(rounded(r, device.corner)); ctx.clip()
                ctx.setFillColor(UIColor(white: 0, alpha: 0.18).cgColor); ctx.fill(r)
                ctx.restoreGState()
                tint(ctx, img, r, UIColor(white: 1, alpha: 0.96))
            }, "\(name)-clear")
        }
    }
}

let pages = { (d: WidgetData) -> Int in NameNow.name(d, date(d))?.pages.count ?? 0 }
func date(_ d: WidgetData) -> Date { Date(ms: d.built) }

MainActor.assumeIsolated {
    for lang in ["ar", "en"] {
        for sample in ["2", "2-noreadings", "4", "91"] {
            let d = load("sample-\(lang)-\(sample)")
            let t = date(d)
            let tag = "\(device.name)-\(lang)-n\(sample)"
            let n = pages(d)
            for p in 0..<n {
                home(NameLargeView(data: d, date: t, interactive: true, page: p) { $0 }, device.large, "name-large-\(tag)-p\(p + 1)of\(n)",
                     modes: p == 0 && sample == "2" ? [.full, .tinted, .clear] : [.full])
            }
            let mp = NameNow.name(d, t).map { NameNow.mediumPages($0).count } ?? 0
            for p in 0..<max(1, mp) {
                home(NameMediumView(data: d, date: t, interactive: true, page: p) { $0 }, device.medium, "name-medium-\(tag)-p\(p + 1)of\(mp)",
                     modes: p == 0 && sample == "2" ? [.full, .tinted, .clear] : [.full])
            }
            home(NameSmallView(data: d, date: t), device.small, "name-small-\(tag)", modes: sample == "2" || sample == "91" ? [.full, .tinted, .clear] : [.full],
                 background: NameSmallBackground(data: d, date: t))
            if sample == "2" {
                // iOS 15–16: the first page alone, no buttons.
                home(NameLargeView(data: d, date: t, interactive: false, page: 0) { $0 }, device.large, "name-large-\(tag)-ios16")
                // The salaf saying (Arabic in every language).
                home(SalafView(data: d, date: t, family: .medium), device.medium, "salaf-medium-\(device.name)-\(lang)", modes: [.full, .tinted, .clear])
                home(SalafView(data: d, date: t, family: .large), device.large, "salaf-large-\(device.name)-\(lang)", modes: [.full, .tinted, .clear])
            }
        }

        // The six skies by the day's prayer times (Riyadh, the sample's day).
        let d = load("sample-\(lang)-2")
        if let sky = d.days.first?.sky {
            for k in sky.dropFirst().prefix(6) + [sky[0]] {
                let at = Date(ms: k.at + 20 * 60_000)
                home(NameSmallView(data: d, date: at), device.small, "sky-\(k.state)-small-\(device.name)-\(lang)", background: NameSmallBackground(data: d, date: at))
                home(NameLargeView(data: d, date: at, interactive: true, page: 0) { $0 }, device.large, "sky-\(k.state)-large-\(device.name)-\(lang)")
            }
        }

        // StandBy: the phone on its side on the charger, the small widget scaled up on black, its background taken away.
        let t = date(d)
        let small = cg(widget(NameSmallView(data: d, date: t), device.small, mode: .full, showsBackground: false), device.small)
        let land = CGSize(width: device.screen.height, height: device.screen.width)
        let side = land.height - 40
        save(canvas(land) { ctx in
            ctx.setFillColor(UIColor.black.cgColor); ctx.fill(CGRect(origin: .zero, size: land))
            put(ctx, small, CGRect(x: 30, y: 20, width: side, height: side))
            put(ctx, small, CGRect(x: land.width - 30 - side, y: 20, width: side, height: side))
        }, "standby-\(device.name)-\(lang)")
        // StandBy at night: the system's red.
        save(canvas(land) { ctx in
            ctx.setFillColor(UIColor.black.cgColor); ctx.fill(CGRect(origin: .zero, size: land))
            tint(ctx, small, CGRect(x: 30, y: 20, width: side, height: side), UIColor(red: 0.85, green: 0.12, blue: 0.10, alpha: 1))
        }, "standby-night-\(device.name)-\(lang)")

        // The lock screen: the line above the clock, the rectangle under it, in the system's vibrant white.
        let rect = cg(widget(NameRectangularView(data: d, date: t), device.rect, mode: .tinted), device.rect)
        let inline = cg(widget(NameInlineView(data: d, date: t).font(.system(size: 15, weight: .semibold)).frame(maxWidth: .infinity), device.inline, mode: .tinted), device.inline)
        let clock = cg(Text("9:41").font(.system(size: 92, weight: .semibold, design: .rounded)).foregroundColor(.white).frame(width: device.screen.width, height: 110), CGSize(width: device.screen.width, height: 110))
        save(canvas(device.screen) { ctx in
            wallpaper(ctx, device.screen, dark: true)
            let w = device.screen.width
            tint(ctx, inline, CGRect(x: (w - device.inline.width) / 2, y: 64, width: device.inline.width, height: device.inline.height), UIColor(white: 1, alpha: 0.9))
            put(ctx, clock, CGRect(x: 0, y: 90, width: w, height: 110))
            tint(ctx, rect, CGRect(x: (w - device.rect.width) / 2, y: 214, width: device.rect.width, height: device.rect.height), UIColor(white: 1, alpha: 0.92))
        }, "lockscreen-\(device.name)-\(lang)")
    }
}
print("done")

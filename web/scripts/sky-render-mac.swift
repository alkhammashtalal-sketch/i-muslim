import AppKit
import CoreText
import SwiftUI

// The sky widgets' review pictures (add-on 0072-add53; web/scripts/sky-render-mac.sh): the widget extension's own
// views (Theme.swift, Views.swift, WidgetData.swift, NameViews.swift; pure SwiftUI) drawn by SwiftUI's ImageRenderer on
// macOS at the iPhone 16 Pro Max's widget sizes and 3x, with the extension's fonts and pictures, on the file the app
// writes (worker/test/widget-names-0072.test.ts WIDGET_SAMPLES). No simulator: the home screen's full-colour mode only.
//   sky-render-mac <widgets dir> <samples dir> <out dir>

let args = CommandLine.arguments
guard args.count >= 4 else { print("sky-render-mac <widgets dir> <samples dir> <out dir>"); exit(2) }
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
    return Image(nsImage: NSImage(contentsOf: u) ?? NSImage())
}
let images = MWImages(named: ["medallion": asset("medallion"), "paper": asset("paper"), "sky": asset("sky")])

func load(_ name: String) -> WidgetData {
    let d = try! Data(contentsOf: samples.appendingPathComponent("\(name).json"))
    return try! JSONDecoder().decode(WidgetData.self, from: d)
}

// iPhone 16 Pro Max (Apple HIG «Widgets»), as widget-render.swift.
let scale: CGFloat = 3
let small = CGSize(width: 170, height: 170), medium = CGSize(width: 364, height: 170), large = CGSize(width: 364, height: 382)
let corner: CGFloat = 23

@MainActor
func save<V: View>(_ view: V, _ size: CGSize, _ name: String, background: AnyView? = nil) {
    let v = ZStack { if let b = background { b }; view }
        .environment(\.mwImages, images)
        .environment(\.mwLiveTimers, false)
        .environment(\.mwFullColor, true)
        .environment(\.mwShowsBackground, true)
        .frame(width: size.width, height: size.height)
        .containerShape(RoundedRectangle(cornerRadius: corner, style: .continuous))
        .clipShape(RoundedRectangle(cornerRadius: corner, style: .continuous))
    let r = ImageRenderer(content: v)
    r.scale = scale
    r.isOpaque = false
    guard let cg = r.cgImage else { print("no image: \(name)"); return }
    let rep = NSBitmapImageRep(cgImage: cg)
    let u = out.appendingPathComponent("\(name).png")
    try! rep.representation(using: .png, properties: [:])!.write(to: u)
    print(u.path)
}

MainActor.assumeIsolated {
    for lang in ["ar", "en"] {
        let d = load("sample-\(lang)-2")
        let t = Date(ms: d.built)
        save(NextPrayerView(data: d, date: t, family: .small), small, "next-small-\(lang)")
        save(TodayTimesView(data: d, date: t), large, "times-large-\(lang)")
        save(MawaqifView(data: d), large, "mawaqif-large-\(lang)")
        save(TasbihView(data: d, date: t), small, "tasbih-small-\(lang)")
        save(NameSmallView(data: d, date: t), small, "name-small-\(lang)", background: AnyView(NameSmallBackground(data: d, date: t)))
        save(NameMediumView(data: d, date: t, interactive: true, page: 0) { $0 }, medium, "name-medium-\(lang)")
        save(NameLargeView(data: d, date: t, interactive: true, page: 0) { $0 }, large, "name-large-p1-\(lang)")
        save(NameLargeView(data: d, date: t, interactive: true, page: 1) { $0 }, large, "name-large-p2-\(lang)")
        save(QuietCard(text: d.labels.openApp, ground: .sky, board: Board.small, rtl: d.rtl, lang: d.lang), small, "quiet-small-\(lang)")
        save(QuietCard(text: d.labels.openApp, ground: .sky, board: Board.large, rtl: d.rtl, lang: d.lang), large, "quiet-large-\(lang)")
        // Untouched: the date widget (the shamsa on its own ground).
        save(DateView(data: d, date: t), small, "date-small-\(lang)")
        // The six skies of the name's small widget.
        if lang == "ar", let sky = d.days.first?.sky {
            for k in sky {
                let at = Date(ms: k.at + 20 * 60_000)
                save(NameSmallView(data: d, date: at), small, "sky-\(k.state)-small", background: AnyView(NameSmallBackground(data: d, date: at)))
            }
        }
    }
    // The bare sky at the largest size, for the seam check.
    save(SkyBackground(s: 364.0 / 380), large, "bare-sky-large")
    save(SkyBackground(s: 364.0 / 380), medium, "bare-sky-medium")
}
print("done")

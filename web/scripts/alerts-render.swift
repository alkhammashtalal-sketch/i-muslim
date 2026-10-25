import CoreText
import SwiftUI
import UIKit
import WidgetKit

// The approval pictures of add-ons 0072-add18 §3 and 0072-add19 (web/scripts/alerts-render.sh): the widget extension's
// own views (web/ios/App/MuslimWidgets: LockViews.swift, Views.swift, Theme.swift, WidgetData.swift) on the file the app
// writes (worker/test/alerts-0072.test.ts «samples»), drawn by SwiftUI's ImageRenderer inside the iOS simulator
// (xcrun simctl spawn), at the iPhone 16 Pro Max's Lock Screen sizes (3x). What only SpringBoard draws is imitated
// around them, and the README says so: the wallpaper, the clock, the controls' circles and Control Center's tiles,
// the Live Activity's rounded card and the Dynamic Island's black shape. Placing a widget or a control on the Lock
// Screen takes touching the screen, which the rules do not allow here.
//   render <widgets dir> <samples dir> <out dir>

let args = CommandLine.arguments
guard args.count >= 4 else {
    print("render <widgets dir> <samples dir> <out dir>")
    exit(2)
}
let widgets = URL(fileURLWithPath: args[1])
let samples = URL(fileURLWithPath: args[2])
let out = URL(fileURLWithPath: args[3])
try? FileManager.default.createDirectory(at: out.appendingPathComponent("tasbih"), withIntermediateDirectories: true)
for f in (try? FileManager.default.contentsOfDirectory(at: widgets.appendingPathComponent("Fonts"), includingPropertiesForKeys: nil)) ?? []
where f.pathExtension == "ttf" {
    CTFontManagerRegisterFontsForURL(f as CFURL, .process, nil)
}

func load(_ name: String) -> WidgetData {
    let d = try! Data(contentsOf: samples.appendingPathComponent("\(name).json"))
    return try! JSONDecoder().decode(WidgetData.self, from: d)
}

let screen = CGSize(width: 430, height: 932)
let rect = CGSize(width: 172, height: 76)
let circ = CGSize(width: 76, height: 76)
// 7:20 in the morning in Riyadh, 25 October 2026: after Fajr, so «أذكار الصباح».
let morning = Date(timeIntervalSince1970: 1_792_902_000)

@MainActor
func save<V: View>(_ view: V, _ size: CGSize, _ name: String) {
    let r = ImageRenderer(content: view.frame(width: size.width, height: size.height).environment(\.colorScheme, .dark))
    r.scale = 3
    r.isOpaque = true
    let u = out.appendingPathComponent("\(name).png")
    try! UIImage(cgImage: r.cgImage!).pngData()!.write(to: u)
    print(u.path)
}

/// A wallpaper, as an imitation of a photo behind the Lock Screen.
struct Wallpaper: View {
    var body: some View {
        LinearGradient(colors: [Color(red: 0.10, green: 0.16, blue: 0.33), Color(red: 0.36, green: 0.30, blue: 0.48), Color(red: 0.78, green: 0.56, blue: 0.46)],
                       startPoint: .top, endPoint: .bottom)
    }
}

/// The system's Lock Screen widget, as WidgetKit hands it the vibrant mode: one light ink.
struct Slot<V: View>: View {
    var size: CGSize
    var circle = false
    var content: V
    var body: some View {
        content
            .foregroundStyle(Color.white)
            .environment(\.widgetRenderingMode, .vibrant)
            .frame(width: size.width, height: size.height)
            .background(circle ? AnyView(Circle().fill(Color.white.opacity(0.14))) : AnyView(Color.clear))
    }
}

/// A control's circle at the bottom of the Lock Screen (iOS 18), in place of the flashlight and the camera.
struct LockButton: View {
    var symbol: String
    var body: some View {
        Image(systemName: symbol)
            .font(.system(size: 21, weight: .medium))
            .foregroundStyle(.white)
            .frame(width: 50, height: 50)
            .background(Circle().fill(Color.black.opacity(0.32)))
    }
}

struct LockScreen<Row: View, Below: View>: View {
    var data: WidgetData
    var left = "plus.circle"
    var right = "circle.dotted"
    var row: Row
    var below: Below

    var body: some View {
        ZStack(alignment: .top) {
            Wallpaper()
            VStack(spacing: 0) {
                Text(data.lang == "ar" ? "الأحد ٢٥ أكتوبر" : "Sunday, October 25")
                    .font(.system(size: 21, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.9))
                    .padding(.top, 68)
                Text(verbatim: data.lang == "ar" ? "٧:٢٠" : "7:20")
                    .font(.system(size: 96, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.95))
                row.padding(.top, 6)
                Spacer()
                below
                Spacer().frame(height: 26)
                HStack {
                    LockButton(symbol: left)
                    Spacer()
                    LockButton(symbol: right)
                }
                .padding(.horizontal, 46)
                .padding(.bottom, 38)
            }
            .environment(\.layoutDirection, .leftToRight)
        }
        .frame(width: screen.width, height: screen.height)
    }
}

let sessionAr = SessionModel(title: "جلسة تسبيح بعد الصلاة",
                             steps: [("سَبَّحَ اللهَ", 33), ("حَمِدَ اللهَ", 33), ("كَبَّرَ اللهَ", 33), ("تَمَامَ الْمِائَةِ", 1)],
                             step: 0, n: 12, done: false,
                             source: "صحيح — رواه مسلم · موسوعة الأحاديث النبوية", doneText: "تمّت", digits: "٠١٢٣٤٥٦٧٨٩", rtl: true)

/// The Live Activity's card on the Lock Screen: the system's rounded card with the app's tint.
struct ActivityCard: View {
    var m: SessionModel
    var body: some View {
        SessionCardView(m: m) { $0 }
            .frame(width: screen.width - 28)
            .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(MW.skyMid))
    }
}

@MainActor
func render() {
    for lang in ["ar", "en"] {
        let data = load(lang)
        let sfx = "-\(lang)"
        // add-on 0072-add18 §3.1: «الأذكار» (rectangle) beside the next prayer (rectangle).
        save(LockScreen(data: data, left: "sun.horizon", right: "location.north.line", row: HStack(spacing: 12) {
            Slot(size: rect, content: AdhkarRectangularView(data: data, date: morning))
            Slot(size: rect, content: NextPrayerView(data: data, date: morning, family: .rectangular))
        }, below: EmptyView()), screen, "lock-adhkar\(sfx)")
        // add-on 0072-add19 §1: the tasbih's rectangle and circle, with the next prayer's circle.
        save(LockScreen(data: data, row: HStack(spacing: 12) {
            Slot(size: rect, content: TasbihRectangularView(data: data))
            Slot(size: circ, circle: true, content: TasbihCircularView(data: data))
            Slot(size: circ, circle: true, content: NextPrayerView(data: data, date: morning, family: .circular))
        }, below: EmptyView()), screen, "tasbih/lock-tasbih\(sfx)")
        // The four small ones: the tasbih and the next prayer in circles, twice the space of one rectangle.
        save(LockScreen(data: data, row: HStack(spacing: 12) {
            Slot(size: circ, circle: true, content: TasbihCircularView(data: data))
            Slot(size: circ, circle: true, content: NextPrayerView(data: data, date: morning, family: .circular))
            Slot(size: rect, content: AdhkarRectangularView(data: data, date: morning))
        }, below: EmptyView()), screen, "tasbih/lock-mix\(sfx)")
        // Each widget alone, larger, to read its text.
        save(Slot(size: rect, content: AdhkarRectangularView(data: data, date: morning)).padding(14).background(Wallpaper()), CGSize(width: rect.width + 28, height: rect.height + 28), "widget-adhkar-rect\(sfx)")
        save(Slot(size: rect, content: TasbihRectangularView(data: data)).padding(14).background(Wallpaper()), CGSize(width: rect.width + 28, height: rect.height + 28), "tasbih/widget-tasbih-rect\(sfx)")
        save(Slot(size: circ, circle: true, content: TasbihCircularView(data: data)).padding(14).background(Wallpaper()), CGSize(width: circ.width + 28, height: circ.height + 28), "tasbih/widget-tasbih-circle\(sfx)")
    }
    let ar = load("ar")
    var at33 = ar
    at33.tasbih.n = 33
    save(Slot(size: circ, circle: true, content: TasbihCircularView(data: at33)).padding(14).background(Wallpaper()), CGSize(width: circ.width + 28, height: circ.height + 28), "tasbih/widget-tasbih-circle-33-ar")

    // add-on 0072-add19 §3: the session on the Lock Screen, then at its second step, then done.
    save(LockScreen(data: ar, row: HStack(spacing: 12) {
        Slot(size: rect, content: NextPrayerView(data: ar, date: morning, family: .rectangular))
    }, below: ActivityCard(m: sessionAr)), screen, "tasbih/session-lock-ar")
    var second = sessionAr
    second.step = 1
    second.n = 3
    save(ActivityCard(m: second).padding(14).background(Wallpaper()), CGSize(width: screen.width, height: 190), "tasbih/session-card-step2-ar")
    var done = sessionAr
    done.step = 3
    done.n = 1
    done.done = true
    save(ActivityCard(m: done).padding(14).background(Wallpaper()), CGSize(width: screen.width, height: 190), "tasbih/session-card-done-ar")
    var alt = sessionAr
    alt.steps = [("تَسْبِيحَةً", 33), ("تَحْمِيدَةً", 33), ("تَكْبِيرَةً", 34)]
    alt.step = 2
    alt.n = 20
    alt.source = "صحيح — رواه مسلم · موسوعة الأحاديث النبوية"
    save(ActivityCard(m: alt).padding(14).background(Wallpaper()), CGSize(width: screen.width, height: 190), "tasbih/session-card-34-ar")

    // The Dynamic Island: compact (the count and its target either side of the camera) and expanded.
    let island = ZStack(alignment: .top) {
        Wallpaper()
        VStack(spacing: 40) {
            HStack(spacing: 0) {
                SessionCompactLeading(m: sessionAr).frame(width: 52)
                Spacer().frame(width: 126)
                SessionCompactTrailing(m: sessionAr).frame(width: 52)
            }
            .frame(height: 37)
            .background(Capsule().fill(Color.black))
            .padding(.top, 11)
            VStack(spacing: 8) {
                SessionExpandedCenter(m: sessionAr)
                SessionExpandedBottom(m: sessionAr) { $0 }
            }
            .padding(.vertical, 18)
            .frame(width: 400)
            .background(RoundedRectangle(cornerRadius: 44, style: .continuous).fill(Color.black))
        }
    }
    save(island, CGSize(width: screen.width, height: 330), "tasbih/session-island-ar")

    // iOS 18 controls in Control Center: «سبّح» at its wide size shows its title with the count; the others their
    // symbol and name. An imitation of Control Center's own tiles around the system's symbols.
    for lang in ["ar", "en"] {
        let data = load(lang)
        let n = MWDigits.write(data.tasbih.n, data.tasbih.digits)
        let name = { (k: String) -> String in data.labels.names[k]?.name ?? k }
        let tile = { (symbol: String, title: String, wide: Bool) -> AnyView in
            AnyView(HStack(spacing: 10) {
                Image(systemName: symbol).font(.system(size: 22, weight: .medium)).frame(width: 44, height: 44)
                    .background(Circle().fill(Color.white.opacity(0.18)))
                if wide {
                    Text(title).font(MWFont.plex(15, .semibold)).lineLimit(1).minimumScaleFactor(0.6)
                    Spacer(minLength: 0)
                }
            }
            .foregroundStyle(.white)
            .padding(wide ? 14 : 18)
            .frame(width: wide ? 172 : 80, height: 80)
            .background(RoundedRectangle(cornerRadius: 26, style: .continuous).fill(Color.white.opacity(0.14))))
        }
        let cc = ZStack {
            Wallpaper().blur(radius: 30).overlay(Color.black.opacity(0.45))
            VStack(alignment: .leading, spacing: 14) {
                Text(lang == "ar" ? "مركز التحكم (تقليد)" : "Control Center (imitation)").font(.system(size: 13)).foregroundStyle(.white.opacity(0.6))
                HStack(spacing: 14) {
                    tile("plus.circle", "\(name("ctlCount")) \(n)", true)
                    tile("circle.dotted", name("ctlTasbih"), false)
                    tile("sun.horizon", name("ctlAdhkar"), false)
                }
                HStack(spacing: 14) {
                    tile("sun.horizon", name("ctlAdhkar"), true)
                    tile("location.north.line", name("ctlQibla"), false)
                    tile("circle.dotted", name("ctlTasbih"), false)
                }
                HStack(spacing: 14) {
                    tile("circle.dotted", name("ctlTasbih"), true)
                    tile("location.north.line", name("ctlQibla"), true)
                }
            }
            .environment(\.layoutDirection, data.rtl ? .rightToLeft : .leftToRight)
        }
        save(cc, CGSize(width: screen.width, height: 420), "controls-center-\(lang)")
        save(LockScreen(data: data, left: "plus.circle", right: "circle.dotted", row: HStack(spacing: 12) {
            Slot(size: rect, content: NextPrayerView(data: data, date: morning, family: .rectangular))
        }, below: EmptyView()), screen, "tasbih/control-lock-\(lang)")
        save(LockScreen(data: data, left: "sun.horizon", right: "location.north.line", row: HStack(spacing: 12) {
            Slot(size: rect, content: AdhkarRectangularView(data: data, date: morning))
        }, below: EmptyView()), screen, "controls-lock-\(lang)")
    }
}

/// A notification banner on the Lock Screen, as iOS draws one (imitated: the system's own banner needs the permission,
/// which only a tap on the system's dialog gives): the app's icon, «مسلم», «الآن», and the text the app schedules.
struct Banner: View {
    var title: String
    var body_: String
    var now: String
    var rtl: Bool
    var body: some View {
        let icon = UIImage(contentsOfFile: widgets.deletingLastPathComponent().appendingPathComponent("App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png").path) ?? UIImage()
        HStack(alignment: .center, spacing: 12) {
            Image(uiImage: icon).resizable().frame(width: 38, height: 38).clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(title).font(.system(size: 15, weight: .semibold))
                    Spacer()
                    Text(now).font(.system(size: 13)).opacity(0.6)
                }
                Text(body_).font(.system(size: 15))
            }
        }
        .foregroundStyle(.black)
        .padding(14)
        .frame(width: screen.width - 20)
        .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(Color.white.opacity(0.82)))
        .environment(\.layoutDirection, rtl ? .rightToLeft : .leftToRight)
    }
}

@MainActor
func banners() {
    let ar = load("ar"), en = load("en")
    let cases: [(WidgetData, String, String, String)] = [
        (ar, "حان وقت صلاة الظهر", "notify-prayer-ar", "١١:٣٧"),
        (en, "It is time for Dhuhr prayer", "notify-prayer-en", "11:37"),
        (ar, "أذكار الصباح", "notify-adhkar-morning-ar", "٦:٢٥"),
        (ar, "أذكار المساء", "notify-adhkar-evening-ar", "٣:١٧"),
        (en, "Morning adhkar", "notify-adhkar-morning-en", "6:25"),
    ]
    for (data, text, name, clock) in cases {
        let rtl = data.rtl
        let view = ZStack(alignment: .top) {
            Wallpaper()
            VStack(spacing: 0) {
                Text(verbatim: clock)
                    .font(.system(size: 96, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.95))
                    .padding(.top, 96)
                Spacer()
                Banner(title: rtl ? "مسلم" : "Muslim", body_: text, now: rtl ? "الآن" : "now", rtl: rtl)
                    .padding(.bottom, 140)
            }
        }
        save(view, screen, name)
    }
}

MainActor.assumeIsolated {
    render()
    banners()
}

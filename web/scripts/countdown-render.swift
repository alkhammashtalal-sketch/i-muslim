import CoreText
import SwiftUI
import UIKit

// The approval pictures of add-on 0072-add34 §ب6 and §ب7 (web/scripts/countdown-render.sh): the widget extension's own
// views of «عدّاد الصلاة القادمة» (web/ios/App/MuslimWidgets/CountdownViews.swift, Theme.swift, Views.swift) drawn by
// SwiftUI's ImageRenderer inside the iOS simulator, at the iPhone 16 Pro Max's sizes (3x), with Riyadh's times of
// 25 October 2026 as the app writes them. What only SpringBoard draws is imitated around them, and the README says so:
// the wallpaper, the clock, the Live Activity's rounded card, the Dynamic Island's black shapes, the control's circle,
// and the whole of AlarmKit's alerting screen (the system draws it; an app only gives its title, colour and sound).
// The live timers are frozen at the moment drawn (ImageRenderer draws one frame); the bar and the ring, which it cannot
// draw as live timers, are drawn at that moment through CountdownModel.still (never set on the phone).
//   render <widgets dir> <out dir>

let args = CommandLine.arguments
guard args.count >= 3 else {
    print("render <widgets dir> <out dir>")
    exit(2)
}
let widgets = URL(fileURLWithPath: args[1])
let out = URL(fileURLWithPath: args[2])
try? FileManager.default.createDirectory(at: out, withIntermediateDirectories: true)
for f in (try? FileManager.default.contentsOfDirectory(at: widgets.appendingPathComponent("Fonts"), includingPropertiesForKeys: nil)) ?? []
where f.pathExtension == "ttf" {
    CTFontManagerRegisterFontsForURL(f as CFURL, .process, nil)
}

let screen = CGSize(width: 430, height: 932)

@MainActor
func save<V: View>(_ view: V, _ size: CGSize, _ name: String) {
    let r = ImageRenderer(content: view.frame(width: size.width, height: size.height).environment(\.colorScheme, .dark))
    r.scale = 3
    r.isOpaque = true
    let u = out.appendingPathComponent("\(name).png")
    try! UIImage(cgImage: r.cgImage!).pngData()!.write(to: u)
    print(u.path)
}

struct Wallpaper: View {
    var body: some View {
        LinearGradient(colors: [Color(red: 0.10, green: 0.16, blue: 0.33), Color(red: 0.36, green: 0.30, blue: 0.48), Color(red: 0.78, green: 0.56, blue: 0.46)],
                       startPoint: .top, endPoint: .bottom)
    }
}

// Riyadh, Sunday 25 October 2026 (Umm al-Qura), the times as the app writes them.
struct Sample {
    var lang: String
    var clock: String
    var date: String
    var m: CountdownModel
}

// ImageRenderer draws the system's timer at the real moment it runs, so the sample's times are placed around that
// moment: 12:24 on the clock shown, Asr (3:06 PM) 2 h 42 min later, the countdown begun at Dhuhr (11:41 AM).
let drawn = Date()
let asrAt = drawn.addingTimeInterval(2 * 3600 + 42 * 60)
let dhuhrAt = drawn.addingTimeInterval(-43 * 60)
let ar = Sample(lang: "ar", clock: "١٢:٢٤", date: "الأحد ٢٥ أكتوبر",
                m: CountdownModel(title: "الصلاة القادمة", place: "الرياض", name: "العصر", text: "٣:٠٦ م", nowText: "حان وقت العصر",
                                  start: dhuhrAt, at: asrAt, stale: false, digits: "٠١٢٣٤٥٦٧٨٩", rtl: true, still: drawn))
let en = Sample(lang: "en", clock: "12:24", date: "Sunday, October 25",
                m: CountdownModel(title: "Next prayer", place: "Riyadh", name: "Asr", text: "3:06 PM", nowText: "It’s time for Asr",
                                  start: dhuhrAt, at: asrAt, stale: false, digits: "0123456789", rtl: false, still: drawn))

/// The Live Activity's card on the Lock Screen: the system's rounded card with the app's tint.
struct ActivityCard: View {
    var m: CountdownModel
    var body: some View {
        CountdownCardView(m: m)
            .frame(width: screen.width - 28)
            .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(MW.skyMid))
    }
}

struct LockScreen<Below: View>: View {
    var s: Sample
    var below: Below
    var body: some View {
        ZStack(alignment: .top) {
            Wallpaper()
            VStack(spacing: 0) {
                Text(s.date)
                    .font(.system(size: 21, weight: .semibold))
                    .foregroundStyle(.white.opacity(0.9))
                    .padding(.top, 68)
                Text(verbatim: s.clock)
                    .font(.system(size: 96, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.95))
                Spacer()
                below
                Spacer().frame(height: 26)
                HStack {
                    circle("flashlight.off.fill")
                    Spacer()
                    circle("timer")
                }
                .padding(.horizontal, 46)
                .padding(.bottom, 38)
            }
            .environment(\.layoutDirection, .leftToRight)
        }
        .frame(width: screen.width, height: screen.height)
    }
    func circle(_ symbol: String) -> some View {
        Image(systemName: symbol)
            .font(.system(size: 21, weight: .medium))
            .foregroundStyle(.white)
            .frame(width: 50, height: 50)
            .background(Circle().fill(Color.black.opacity(0.32)))
    }
}

@MainActor
func render() {
    for s in [ar, en] {
        // §ب7: the countdown on the Lock Screen, with the «عدّاد الصلاة» control at the bottom right (iOS 18).
        save(LockScreen(s: s, below: ActivityCard(m: s.m)), screen, "countdown-lock-\(s.lang)")
        save(ActivityCard(m: s.m).padding(14).background(Wallpaper()), CGSize(width: screen.width, height: 190), "countdown-card-\(s.lang)")
        var stale = s
        stale.m.stale = true
        save(ActivityCard(m: stale.m).padding(14).background(Wallpaper()), CGSize(width: screen.width, height: 190), "countdown-card-time-\(s.lang)")

        // The Dynamic Island: compact (the name and the countdown either side of the camera), minimal, and expanded.
        let island = ZStack(alignment: .top) {
            Wallpaper()
            VStack(spacing: 28) {
                HStack(spacing: 0) {
                    CountdownCompactLeading(m: s.m).frame(width: 64)
                    Spacer().frame(width: 120)
                    CountdownCompactTrailing(m: s.m).frame(width: 64)
                }
                .frame(height: 37)
                .background(Capsule().fill(Color.black))
                .environment(\.layoutDirection, .leftToRight)
                .padding(.top, 11)
                HStack(spacing: 8) {
                    Capsule().fill(Color.black).frame(width: 170, height: 37)
                    CountdownMinimal(m: s.m).frame(width: 24, height: 24).padding(6.5).background(Circle().fill(Color.black))
                }
                VStack(spacing: 10) {
                    HStack(alignment: .center) {
                        CountdownExpandedLeading(m: s.m)
                        Spacer()
                        CountdownExpandedTrailing(m: s.m)
                    }
                    .environment(\.layoutDirection, s.m.direction)
                    CountdownExpandedBottom(m: s.m)
                }
                .padding(.horizontal, 22)
                .padding(.vertical, 18)
                .frame(width: 400)
                .background(RoundedRectangle(cornerRadius: 44, style: .continuous).fill(Color.black))
            }
        }
        save(island, CGSize(width: screen.width, height: 330), "countdown-island-\(s.lang)")
    }

    // The control «عدّاد الصلاة» in Control Center (iOS 18): the system's tile around its symbol and name.
    for (lang, name, rtl) in [("ar", "عدّاد الصلاة", true), ("en", "Prayer countdown", false)] {
        let tile = ZStack {
            Wallpaper().blur(radius: 30)
            HStack(spacing: 12) {
                Image(systemName: "timer")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(Circle().fill(Color.white.opacity(0.18)))
                Text(name).font(.system(size: 15, weight: .semibold)).foregroundStyle(.white)
                Spacer()
            }
            .padding(.horizontal, 14)
            .frame(width: 176, height: 72)
            .background(RoundedRectangle(cornerRadius: 22, style: .continuous).fill(Color.black.opacity(0.35)))
            .environment(\.layoutDirection, rtl ? .rightToLeft : .leftToRight)
        }
        save(tile, CGSize(width: 260, height: 130), "countdown-control-\(lang)")
    }
}

/// AlarmKit's alerting screen at Fajr: drawn by the system, imitated here (the title is the app's word for Fajr from
/// its data, the tint the app's lazuli; the slide to stop is iOS 26.1's own).
@MainActor
func alarm() {
    for (lang, title, app, slide, clock) in [("ar", "الفجر", "مسلم", "اسحب للإيقاف", "٤:٣٨"), ("en", "Fajr", "Muslim", "slide to stop", "4:38")] {
        let rtl = lang == "ar"
        let view = ZStack(alignment: .top) {
            LinearGradient(colors: [Color(red: 0.03, green: 0.05, blue: 0.12), Color(red: 0.10, green: 0.16, blue: 0.33)], startPoint: .top, endPoint: .bottom)
            VStack(spacing: 0) {
                Text(verbatim: clock)
                    .font(.system(size: 96, weight: .bold, design: .rounded))
                    .foregroundStyle(.white.opacity(0.95))
                    .padding(.top, 110)
                Spacer()
                VStack(spacing: 10) {
                    HStack(spacing: 8) {
                        Image(systemName: "alarm.fill").foregroundStyle(Color(red: 0.118, green: 0.227, blue: 0.420)).padding(6).background(Circle().fill(.white))
                        Text(app).font(.system(size: 15, weight: .semibold)).foregroundStyle(.white.opacity(0.8))
                    }
                    Text(title).font(MWFont.plex(40, .bold)).foregroundStyle(.white)
                }
                Spacer().frame(height: 120)
                ZStack {
                    Capsule().fill(Color.white.opacity(0.22)).frame(width: 330, height: 70)
                    Text(slide).font(.system(size: 18, weight: .medium)).foregroundStyle(.white.opacity(0.85))
                    HStack {
                        Circle().fill(Color.white).frame(width: 60, height: 60)
                            .overlay(Image(systemName: "stop.fill").foregroundStyle(Color(red: 0.118, green: 0.227, blue: 0.420)))
                        Spacer()
                    }
                    .frame(width: 320)
                }
                .environment(\.layoutDirection, rtl ? .rightToLeft : .leftToRight)
                .padding(.bottom, 90)
            }
        }
        save(view, screen, "alarm-alert-\(lang)")
    }
}

MainActor.assumeIsolated {
    render()
    alarm()
}

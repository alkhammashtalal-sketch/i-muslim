import Foundation

// What Siri and Spotlight say for «متى الصلاة القادمة؟» and «اسم الله لليوم» (add-on 0072-add30 §4), without opening
// the app and with no network: from the times and the day's Name the app already writes for its widgets into the App
// Group (widgets.json, web/src/native/widget-data.ts; WidgetData.swift is the whole contract). Only the few fields
// read here are decoded, so a field added to the widgets' data never breaks an answer. Every word comes from that data,
// in the app's language: the names of the prayers, their times as the app writes them («٣:٢٥ م»), «الصلاة القادمة»,
// «بعد {t}» and «اسم الله لليوم». The countdown alone is the system's (DateComponentsFormatter) in the app's language
// and digits. No ayah or hadith is ever in an answer: Siri reads its answer aloud (CLAUDE.md §11).
// Pure Foundation, so worker/test/shortcuts-siri-0072.test.ts compiles and runs it on the Mac.

enum SiriAnswers {
    struct File: Decodable {
        struct Place: Decodable { var name: String }
        struct Labels: Decodable {
            var nextPrayer: String
            var after: String
            var openApp: String
            var noPlace: String
            var nameOfDay: String?
        }
        struct Time: Decodable { var key: String; var name: String; var at: Double; var text: String; var prayer: Bool }
        struct Day: Decodable { var start: Double; var end: Double; var times: [Time] }
        struct NameDay: Decodable { var start: Double; var end: Double; var name: String; var of: String; var url: String }
        var lang: String
        var place: Place?
        var labels: Labels
        var days: [Day]
        var nameDays: [NameDay]?
    }

    static func read(_ data: Data?) -> File? {
        guard let data = data else { return nil }
        return try? JSONDecoder().decode(File.self, from: data)
    }

    /// The App Group's widgets.json, as the widgets read it.
    static func load() -> File? {
        guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.alkhammashtalal.imuslim") else { return nil }
        return read(try? Data(contentsOf: dir.appendingPathComponent("widgets.json")))
    }

    /// «الصلاة القادمة: العصر، ٣:٢٥ م، بعد ساعة و٢٠ دقيقة». Without data, `noData` (the app's own line in the phone's
    /// language, Localizable.strings); without a city, the app's «حدّد مدينتك في التطبيق»; past the last day written,
    /// «افتح التطبيق لتحديث المواقيت».
    static func nextPrayer(_ f: File?, now: Date, noData: String) -> String {
        guard let f = f else { return noData }
        guard f.place != nil else { return f.labels.noPlace }
        let t = now.timeIntervalSince1970 * 1000
        guard let next = f.days.lazy.flatMap({ $0.times }).first(where: { $0.prayer && $0.at > t }) else { return f.labels.openApp }
        let digits = numbering(of: next.text)
        let after = f.labels.after.replacingOccurrences(of: "{t}", with: countdown(ms: next.at - t, lang: f.lang, numbers: digits))
        let s = separator(f.lang)
        return "\(f.labels.nextPrayer): \(next.name)\(s)\(next.text)\(s)\(after)"
    }

    /// «اسم الله لليوم: الحفيظ، ٥ من ٩٦». The Name is in Arabic in every language, as the widget shows it.
    static func nameOfDay(_ f: File?, now: Date, noData: String, title: String) -> String {
        let t = now.timeIntervalSince1970 * 1000
        guard let f = f, let day = f.nameDays?.first(where: { $0.start <= t && t < $0.end }) else { return noData }
        return "\(f.labels.nameOfDay ?? title): \(day.name)\(separator(f.lang))\(day.of)"
    }

    /// The day's Name page, imuslim://today/name/<n>, or the Names when there is none.
    static func nameURL(_ f: File?, now: Date) -> String {
        let t = now.timeIntervalSince1970 * 1000
        return f?.nameDays?.first(where: { $0.start <= t && t < $0.end })?.url ?? "imuslim://today/names"
    }

    static func separator(_ lang: String) -> String { lang == "ar" || lang == "ur" ? "، " : ", " }

    /// The numbering system of a time the app wrote («٣:٢٥ م» → arab), so the countdown's digits are the same.
    static func numbering(of text: String) -> String {
        for ch in text.unicodeScalars {
            switch ch.value {
            case 0x0660...0x0669: return "arab"
            case 0x06F0...0x06F9: return "arabext"
            case 0x09E6...0x09EF: return "beng"
            case 0x0966...0x096F: return "deva"
            case 0x30...0x39: return "latn"
            default: continue
            }
        }
        return "latn"
    }

    /// «ساعة و٢٠ دقيقة»: hours and minutes, the minutes rounded up (never «0 minutes»), in the app's language.
    static func countdown(ms: Double, lang: String, numbers: String) -> String {
        let minutes = max(1, Int((ms / 60_000).rounded(.up)))
        let f = DateComponentsFormatter()
        f.allowedUnits = minutes >= 60 ? [.hour, .minute] : [.minute]
        f.unitsStyle = .full
        f.zeroFormattingBehavior = .dropAll
        var cal = Calendar(identifier: .gregorian)
        cal.locale = Locale(identifier: "\(lang)@numbers=\(numbers)")
        f.calendar = cal
        return f.string(from: TimeInterval(minutes * 60)) ?? "\(minutes)"
    }
}

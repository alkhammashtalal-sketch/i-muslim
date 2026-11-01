import Foundation

// The widgets' data (reply 0046): written by the app into the App Group (web/src/native/widget-data.ts builds it from the
// app's own engines, web/ios/App/App/WidgetBridgePlugin.swift writes it), read here. The app computes; the widgets only
// show. Every text is ready to show, in the app's language and its digits; only the countdown is a live timer.
// Nothing here reaches the network.

enum WidgetStore {
    static let group = "group.com.alkhammashtalal.imuslim"
    static let file = "widgets.json"

    static var url: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group)?.appendingPathComponent(file)
    }

    static func load() -> WidgetData? {
        guard let url = url, let data = try? Data(contentsOf: url) else { return nil }
        return try? JSONDecoder().decode(WidgetData.self, from: data)
    }

    static func save(_ value: WidgetData) {
        guard let url = url, let data = try? JSONEncoder().encode(value) else { return }
        try? data.write(to: url, options: .atomic)
    }
}

struct WidgetData: Codable {
    var v: Int
    var lang: String
    var rtl: Bool
    /// When the app wrote this (ms since 1970).
    var built: Double
    var place: Place?
    var labels: Labels
    var days: [Day]
    var tasbih: Tasbih
    var adhkar: Adhkar
    /// «اسم الله لليوم» and «من أقوال السلف» (add-on 0072-add10; web/src/native/widget-names.ts, the contract in
    /// relay/w1/0072-names-widget/data-contract.md), each by the Riyadh date. Optional: a file of an older app has none.
    var nameDays: [NameDay]?
    var salafDays: [SalafDay]?

    struct Place: Codable { var name: String; var tz: String }

    struct Labels: Codable {
        var nextPrayer: String     // «الصلاة القادمة»
        var remaining: String      // «المتبقي»
        var after: String          // «بعد {t}»: {t} is the countdown, for the lock screen
        var ayahOfDay: String      // «آية اليوم»
        var hadithOfDay: String    // «حديث اليوم»
        var tasbih: String         // «المسبحة»
        var adhkarNow: String      // «حان وقتها»
        var cont: String           // «تابع ←»
        var openApp: String        // «افتح التطبيق لتحديث المواقيت»
        var noPlace: String        // «حدّد مدينتك في التطبيق»
        /// «اضغط لقراءتها»: an ayah too long for the widget is never shown in part (CLAUDE.md §3 rule 4).
        var readAyah: String?
        /// The gallery's name and description of each widget, in the app's language: keys next, times, date, ayah,
        /// hadith, tasbih, adhkar, mawaqif.
        var names: [String: NameDesc]
        /// «أذكار المواقف»'s eight buttons (reply 0051): each situation's name as the app has it, and its link.
        var mawaqif: [MawaqifButton]?
        /// Add-on 0072-add10: «اسم الله لليوم», «التالي», «شارك», «التكملة في التطبيق».
        var nameOfDay: String?
        var nextPage: String?
        /// Add-on 0072-add54: «السابق», and the screen reader's «{b}، صفحة {n} من {t}» for «السابق» and «التالي».
        var prevPage: String?
        var navPage: String?
        var share: String?
        var continueInApp: String?
        /// Add-on 0072-add23 §4.7: «النص بالعربية» in the app's language, above a quoted text in Arabic outside the
        /// Arabic interface (the salaf saying); none in Arabic.
        var quoteInArabic: String?
    }
    struct MawaqifButton: Codable { var id: String; var name: String; var url: String }
    struct NameDesc: Codable { var name: String; var desc: String }

    struct Day: Codable {
        var date: String           // 2026-10-14, in the place's time zone
        var start: Double          // its midnight (ms)
        var end: Double            // the next midnight (ms)
        var weekday: String        // «الأربعاء»
        var gregorian: String      // «الأربعاء ١٤ أكتوبر ٢٠٢٦»
        var gregorianShort: String // «الأربعاء ١٤ أكتوبر»
        var hijri: Hijri
        /// fajr, sunrise, dhuhr, asr, maghrib, isha, then midnight and lastThird (of the night that begins this
        /// evening), each with its name and its time, ready to show.
        var times: [Time]
        var ayah: Ayah?
        var hadith: Hadith?
        /// The date card's sky through the day (add-on 0071-add16): each state from its moment on. Empty with no place.
        var sky: [Sky]?
    }
    struct Sky: Codable {
        var state: String          // night, fajr, morning, dhuhr, asr, maghrib
        var at: Double             // ms
    }

    /// One Riyadh day's name (add-on 0072-add10 §1): its pages in the order of the name's page, only those it has.
    struct NameDay: Codable {
        var day: String
        var start: Double
        var end: Double
        var n: Int
        var count: Int
        var name: String           // Arabic, in every language
        var latin: String?         // a sourced pronunciation; none today
        var of: String             // «٥ من ٩٦»
        var url: String            // imuslim://today/name/5
        var shareUrl: String       // imuslim://today/name/5/share
        var pages: [NamePage]
    }
    /// kind: ayah (label text ref source url meaning), hadith (label text grade attribution source url meaning),
    /// meaning (label paragraphs source url), reading (label inArabic partLabels sentences url).
    struct NamePage: Codable {
        var kind: String
        var label: String
        var text: String?
        var ref: String?
        var grade: String?
        var attribution: String?
        var source: String?
        var url: String
        var meaning: Meaning?
        var paragraphs: [String]?
        /// «الشرح متاح بالعربية» on «القراءة»; «النص بالعربية» on a quoted text with no meaning in the reader's
        /// language (al-Saʿdi; add-on 0072-add23 §4.7). Outside Arabic only.
        var inArabic: String?
        var partLabels: [String]?
        var sentences: [Sentence]?
    }
    struct Meaning: Codable { var text: String; var lang: String; var source: String }
    struct Sentence: Codable { var part: Int; var text: String }

    /// One Riyadh day's salaf saying (add-on 0072-add10 §2), Arabic in every language.
    struct SalafDay: Codable {
        var day: String
        var start: Double
        var end: Double
        var n: Int
        var topic: String
        var text: String
        var parts: [SalafPart]
        var attribution: String    // «قال فلان» / «يُروى عن فلان»
        var source: String         // «الزهد» للإمام أحمد بن حنبل، ص99
        var book: String
        var author: String
        var place: String
        var url: String            // the Shamela page
        var appUrl: String
        var shareUrl: String
    }
    struct SalafPart: Codable { var text: String; var gloss: Bool }
    struct Hijri: Codable {
        var day: String            // «٣»
        var month: String          // «جمادى الأولى»
        var year: String           // «١٤٤٨هـ»
        var text: String           // «٣ جمادى الأولى ١٤٤٨هـ»
    }
    struct Time: Codable {
        var key: String            // fajr … isha, midnight, lastThird
        var name: String           // «العصر»
        var at: Double             // ms
        var text: String           // «٣:٢٥ م»
        /// One of the five prayers (the countdown and «next» use only these, with sunrise excluded).
        var prayer: Bool
        /// The line under the five prayers' names in the large times widget (add-on 0072-add59;
        /// web/src/v2/daily/sunan.ts): the sunnah before, the fard and the sunnah after, and the row's spoken label.
        /// None for sunrise, the middle of the night and the last third, and in a file written before it.
        var sunan: Sunan?
    }
    struct Sunan: Codable {
        var parts: [Part]          // «٤ قبلها», «الفرض ٤», «٢ بعدها», in reading order
        var sep: String            // « ✦ » in Arabic, « · » elsewhere
        var label: String          // «الظهر، ١٢:٠٢ م، أربع ركعات قبلها، الفرض أربع، ركعتان بعدها»
        struct Part: Codable {
            var kind: String       // before, fard, after
            var text: String
        }
    }
    struct Ayah: Codable {
        var text: String           // the ayah as the app shows it (D1's text, offline copy in the app)
        var ref: String            // «البقرة • ٣٢»
        var url: String            // imuslim://quran/2/32
    }
    struct Hadith: Codable {
        var text: String           // HadeethEnc's Arabic text as served
        var grade: String          // «صحيح»
        var attribution: String    // «متفق عليه»
        var url: String            // imuslim://hadith/5503
    }

    /// The tasbih as the app's Tasbih.tsx counts (web/src/v2/daily/tasbih/Tasbih.tsx `tap`), so «+١» in the widget
    /// counts exactly as a tap in the app; the app reads the state back when it opens.
    ///   after == false (a free count): one step; target 0 counts on without end; otherwise at the target it stays full,
    ///     and the next tap starts again at one (n >= target → n = 1, else n + 1).
    ///   after == true («بعد الصلاة», hadith 10948: 33, 33, 33, then the hundredth): at the last step's target it stays
    ///     done (no change); otherwise n + 1, and when n reaches the step's target, the next step begins at n = 0 (the
    ///     last step keeps n at its target).
    /// Each tap also adds one to `total` (today's total, `day` its date).
    struct Tasbih: Codable {
        var steps: [Step]
        var step: Int
        var n: Int
        var after: Bool
        var total: Int
        var day: String
        /// The ten digits the app writes in this language, 0 to 9 («٠١٢٣٤٥٦٧٨٩», «০১২৩৪৫৬৭৮৯», "0123456789"):
        /// the count is written with them.
        var digits: String
        /// Set by the widget when it counts; the app clears it after reading.
        var changedByWidget: Bool?
        struct Step: Codable { var zikr: String; var target: Int }
    }

    /// The adhkar of the time: the morning's after fajr, the evening's after asr (the rule shown on the board; no ruling
    /// is written here), with today's progress.
    struct Adhkar: Codable {
        var day: String            // the day the progress is for
        var morning: Part
        var evening: Part
        struct Part: Codable {
            var title: String      // «أذكار الصباح»
            var progress: String   // «٤ من ١٢»
            var none: String       // «٠ من ١٢», for a day the app has not opened yet
            var fraction: Double   // 0…1
            var url: String        // imuslim://today/adhkar?c=…
        }
    }
}

import SwiftUI

// The content of the seven widgets (reply 0046), as the board out/design-v2/widgets/widgets.html draws them. Pure
// SwiftUI on plain values (a WidgetData, a Date and a family), no WidgetKit here, so the same views compile for iOS 15+
// and macOS 14+ (the screenshots' renderer). Every text comes ready from the data; the views only place it.

enum MWFamily { case small, medium, large, inline, rectangular, circular }

// MARK: - Reading the data

extension Date {
    var ms: Double { timeIntervalSince1970 * 1000 }
    init(ms: Double) { self.init(timeIntervalSince1970: ms / 1000) }
}

extension WidgetData {
    /// The day whose midnights hold this moment.
    func day(at now: Date) -> Day? {
        let t = now.ms
        return days.first { $0.start <= t && t < $0.end }
    }

    struct NextPrayer {
        var time: Time
        var at: Date
        /// The prayer before it (for the lock screen's ring), when the data holds one.
        var previous: Date?
    }

    /// The first of the five prayers after this moment, across today and the days after it.
    func nextPrayer(after now: Date) -> NextPrayer? {
        let t = now.ms
        var previous: Double?
        for day in days {
            for time in day.times where time.prayer {
                if time.at > t { return NextPrayer(time: time, at: Date(ms: time.at), previous: previous.map { Date(ms: $0) }) }
                previous = time.at
            }
        }
        return nil
    }

    var timeZone: TimeZone { place.flatMap { TimeZone(identifier: $0.tz) } ?? .current }
}

/// The digits the app writes (WidgetData.Tasbih.digits: ten characters for 0…9).
enum MWDigits {
    static func write(_ n: Int, _ digits: String) -> String {
        let set = Array(digits)
        let latin = String(n)
        guard set.count == 10 else { return latin }
        return String(latin.map { ch -> Character in
            guard let v = ch.wholeNumberValue, (0...9).contains(v) else { return ch }
            return set[v]
        })
    }

    /// A locale whose numbering system writes these digits, for the system's live timer on the lock screen.
    static func locale(_ digits: String?) -> Locale {
        switch digits?.first {
        case "٠": return Locale(identifier: "ar@numbers=arab")
        case "۰": return Locale(identifier: "ur@numbers=arabext")
        case "০": return Locale(identifier: "bn@numbers=beng")
        case "०": return Locale(identifier: "hi@numbers=deva")
        default: return Locale(identifier: "en_US_POSIX")
        }
    }

    /// The digits of the times shown (from a ready text such as «٣:٢٥ م»), for the lock screen's countdown.
    static func of(_ text: String) -> String {
        for ch in text {
            switch ch {
            case "٠"..."٩": return "٠١٢٣٤٥٦٧٨٩"
            case "۰"..."۹": return "۰۱۲۳۴۵۶۷۸۹"
            case "০"..."৯": return "০১২৩৪৫৬৭৮৯"
            case "०"..."९": return "०१२३४५६७८९"
            case "0"..."9": return "0123456789"
            default: continue
            }
        }
        return "0123456789"
    }
}

/// The texts shown before the app has written any data: the app's ten languages (web/src/native/widget-strings.ts),
/// the device's language when it is one of them, else Arabic. The stored labels always win.
enum MWFallback {
    struct Strings { var openApp: String; var names: [String: [String]]; var mawaqif: [String] = [] }

    static var lang: String {
        for pref in Locale.preferredLanguages {
            let code = String(pref.prefix(2))
            if table[code] != nil { return code }
        }
        return "ar"
    }
    static var rtl: Bool { lang == "ar" || lang == "ur" }
    static var openApp: String { table[lang]?.openApp ?? "افتح التطبيق لتحديث المواقيت" }

    static let table: [String: Strings] = [
        "ar": Strings(openApp: "افتح التطبيق لتحديث المواقيت", names: [
            "next": ["الصلاة القادمة", "اسم الصلاة القادمة ووقتها والوقت المتبقي"],
            "times": ["مواقيت اليوم", "مواقيت الصلاة لليوم كله"],
            "date": ["التاريخ", "اليوم الهجري والميلادي"],
            "ayah": ["آية اليوم", "آية اليوم ومرجعها"],
            "hadith": ["حديث اليوم", "حديث اليوم بدرجته وتخريجه"],
            "tasbih": ["المسبحة", "سبّح من الويدجت نفسها"],
            "adhkar": ["أذكار الوقت", "أذكار الصباح بعد الفجر، والمساء بعد العصر"],
            "mawaqif": ["أذكار", "افتح أذكار السفر والنوم وغيرها بلمسة"],
        ], mawaqif: ["السفر", "النوم", "الاستيقاظ", "المنزل", "المسجد", "الطعام", "الكرب", "كل الأذكار"]),
        "en": Strings(openApp: "Open the app to update the times", names: [
            "next": ["Next prayer", "The next prayer, its time and the time left"],
            "times": ["Today’s times", "All of today’s prayer times"],
            "date": ["Date", "The Hijri and Gregorian date"],
            "ayah": ["Ayah of the day", "The ayah of the day and its reference"],
            "hadith": ["Hadith of the day", "The hadith of the day with its grade and source"],
            "tasbih": ["Tasbih", "Count from the widget itself"],
            "adhkar": ["Adhkar of the time", "Morning adhkar after Fajr, evening adhkar after Asr"],
            "mawaqif": ["Adhkar", "Open the adhkar for travel, sleep and more with a tap"],
        ], mawaqif: ["Travel", "Sleep", "Waking up", "Home", "The mosque", "Food", "Distress", "All adhkar"]),
        "ur": Strings(openApp: "اوقات تازہ کرنے کے لیے ایپ کھولیں", names: [
            "next": ["اگلی نماز", "اگلی نماز، اس کا وقت اور باقی وقت"],
            "times": ["آج کے اوقات", "آج کے تمام اوقاتِ نماز"],
            "date": ["تاریخ", "ہجری اور عیسوی تاریخ"],
            "ayah": ["آج کی آیت", "آج کی آیت اور اس کا حوالہ"],
            "hadith": ["آج کی حدیث", "آج کی حدیث، اس کے درجے اور تخریج کے ساتھ"],
            "tasbih": ["تسبیح", "ویجیٹ ہی سے گنیں"],
            "adhkar": ["وقت کے اذکار", "فجر کے بعد صبح کے اذکار، عصر کے بعد شام کے"],
            "mawaqif": ["اذکار", "سفر، نیند اور دیگر اذکار ایک ٹچ میں کھولیں"],
        ], mawaqif: ["سفر", "سونا", "جاگنا", "گھر", "مسجد", "کھانا", "پریشانی", "تمام اذکار"]),
        "id": Strings(openApp: "Buka aplikasi untuk memperbarui waktu", names: [
            "next": ["Salat berikutnya", "Salat berikutnya, waktunya, dan sisa waktunya"],
            "times": ["Waktu salat hari ini", "Semua waktu salat hari ini"],
            "date": ["Tanggal", "Tanggal Hijriah dan Masehi"],
            "ayah": ["Ayat hari ini", "Ayat hari ini dan rujukannya"],
            "hadith": ["Hadis hari ini", "Hadis hari ini dengan derajat dan takhrijnya"],
            "tasbih": ["Tasbih", "Hitung langsung dari widget"],
            "adhkar": ["Zikir waktu ini", "Zikir pagi setelah Subuh, zikir petang setelah Asar"],
            "mawaqif": ["Zikir", "Buka zikir bepergian, tidur, dan lainnya dengan sekali sentuh"],
        ], mawaqif: ["Bepergian", "Tidur", "Bangun tidur", "Rumah", "Masjid", "Makan", "Kesusahan", "Semua zikir"]),
        "ms": Strings(openApp: "Buka aplikasi untuk mengemas kini waktu", names: [
            "next": ["Solat seterusnya", "Solat seterusnya, waktunya dan baki masa"],
            "times": ["Waktu solat hari ini", "Semua waktu solat hari ini"],
            "date": ["Tarikh", "Tarikh Hijrah dan Masihi"],
            "ayah": ["Ayat hari ini", "Ayat hari ini dan rujukannya"],
            "hadith": ["Hadis hari ini", "Hadis hari ini dengan darjat dan takhrijnya"],
            "tasbih": ["Tasbih", "Kira terus dari widget"],
            "adhkar": ["Zikir waktu ini", "Zikir pagi selepas Subuh, zikir petang selepas Asar"],
            "mawaqif": ["Zikir", "Buka zikir bermusafir, tidur dan lain-lain dengan sekali sentuh"],
        ], mawaqif: ["Bermusafir", "Tidur", "Bangun tidur", "Rumah", "Masjid", "Makan", "Kesusahan", "Semua zikir"]),
        "tr": Strings(openApp: "Vakitleri güncellemek için uygulamayı aç", names: [
            "next": ["Sıradaki namaz", "Sıradaki namaz, vakti ve kalan süre"],
            "times": ["Bugünün vakitleri", "Bugünün tüm namaz vakitleri"],
            "date": ["Tarih", "Hicri ve miladi tarih"],
            "ayah": ["Günün ayeti", "Günün ayeti ve kaynağı"],
            "hadith": ["Günün hadisi", "Günün hadisi, derecesi ve kaynağıyla"],
            "tasbih": ["Tesbih", "Widget üzerinden say"],
            "adhkar": ["Vaktin zikirleri", "Sabah namazından sonra sabah, ikindiden sonra akşam zikirleri"],
            "mawaqif": ["Zikirler", "Yolculuk, uyku ve diğer zikirleri tek dokunuşla açın"],
        ], mawaqif: ["Yolculuk", "Uyku", "Uyanma", "Ev", "Mescit", "Yemek", "Sıkıntı", "Tüm zikirler"]),
        "fr": Strings(openApp: "Ouvre l’application pour mettre à jour les horaires", names: [
            "next": ["Prochaine prière", "La prochaine prière, son heure et le temps restant"],
            "times": ["Horaires du jour", "Tous les horaires de prière du jour"],
            "date": ["Date", "La date hégirienne et grégorienne"],
            "ayah": ["Verset du jour", "Le verset du jour et sa référence"],
            "hadith": ["Hadith du jour", "Le hadith du jour avec son degré et sa source"],
            "tasbih": ["Tasbih", "Compte depuis le widget lui-même"],
            "adhkar": ["Adhkar du moment", "Ceux du matin après Fajr, ceux du soir après Asr"],
            "mawaqif": ["Invocations", "Ouvrez les invocations du voyage, du sommeil et d’autres d’une touche"],
        ], mawaqif: ["Le voyage", "Le sommeil", "Le réveil", "La maison", "La mosquée", "Le repas", "L'angoisse", "Toutes les invocations"]),
        "es": Strings(openApp: "Abre la aplicación para actualizar los horarios", names: [
            "next": ["Próxima oración", "La próxima oración, su hora y el tiempo que falta"],
            "times": ["Horarios de hoy", "Todos los horarios de oración de hoy"],
            "date": ["Fecha", "La fecha hégira y gregoriana"],
            "ayah": ["Aleya del día", "La aleya del día y su referencia"],
            "hadith": ["Hadiz del día", "El hadiz del día con su grado y su fuente"],
            "tasbih": ["Tasbih", "Cuenta desde el propio widget"],
            "adhkar": ["Adhkar del momento", "Los de la mañana tras Fajr, los de la tarde tras Asr"],
            "mawaqif": ["Adhkar", "Abra los adhkar del viaje, del sueño y más con un toque"],
        ], mawaqif: ["El viaje", "El sueño", "Al despertar", "La casa", "La mezquita", "La comida", "La angustia", "Todos los adhkar"]),
        "bn": Strings(openApp: "সময় হালনাগাদ করতে অ্যাপ খুলুন", names: [
            "next": ["পরবর্তী নামাজ", "পরবর্তী নামাজ, তার সময় ও বাকি সময়"],
            "times": ["আজকের সময়সূচি", "আজকের সব নামাজের সময়"],
            "date": ["তারিখ", "হিজরি ও খ্রিস্টীয় তারিখ"],
            "ayah": ["আজকের আয়াত", "আজকের আয়াত ও তার সূত্র"],
            "hadith": ["আজকের হাদিস", "আজকের হাদিস, তার মান ও সূত্রসহ"],
            "tasbih": ["তাসবিহ", "উইজেট থেকেই গুনুন"],
            "adhkar": ["সময়ের জিকির", "ফজরের পর সকালের, আসরের পর সন্ধ্যার জিকির"],
            "mawaqif": ["যিকির", "এক ছোঁয়ায় সফর, ঘুম ও অন্যান্য যিকির খুলুন"],
        ], mawaqif: ["সফর", "ঘুম", "জাগরণ", "ঘর", "মসজিদ", "খাবার", "বিপদ ও দুশ্চিন্তা", "সব যিকির"]),
        "hi": Strings(openApp: "समय अपडेट करने के लिए ऐप खोलें", names: [
            "next": ["अगली नमाज़", "अगली नमाज़, उसका समय और बचा हुआ समय"],
            "times": ["आज के समय", "आज की सभी नमाज़ों के समय"],
            "date": ["तारीख़", "हिजरी और ईसवी तारीख़"],
            "ayah": ["आज की आयत", "आज की आयत और उसका संदर्भ"],
            "hadith": ["आज की हदीस", "आज की हदीस, उसके दर्जे और स्रोत के साथ"],
            "tasbih": ["तस्बीह", "विजेट से ही गिनें"],
            "adhkar": ["समय के अज़कार", "फ़ज्र के बाद सुबह के, अस्र के बाद शाम के अज़कार"],
            "mawaqif": ["अज़कार", "एक टच में सफ़र, नींद और दूसरे अज़कार खोलें"],
        ], mawaqif: ["सफ़र", "सोना", "जागना", "घर", "मस्जिद", "खाना", "परेशानी", "सभी अज़कार"]),
    ]
}

// MARK: - Shared pieces

/// The canvas of one widget: its size, the board's scale, the data's direction and language.
struct MWCanvas<Content: View>: View {
    var board: CGSize
    var rtl: Bool
    var lang: String
    var content: (CGFloat, CGSize) -> Content

    init(board: CGSize, rtl: Bool, lang: String, @ViewBuilder content: @escaping (CGFloat, CGSize) -> Content) {
        self.board = board
        self.rtl = rtl
        self.lang = lang
        self.content = content
    }

    var body: some View {
        GeometryReader { geo in
            content(Board.scale(geo.size, board: board), geo.size)
                .frame(width: geo.size.width, height: geo.size.height)
        }
        .environment(\.layoutDirection, rtl ? .rightToLeft : .leftToRight)
        .environment(\.locale, Locale(identifier: lang))
    }
}

/// The countdown to a time: the system's live timer in the widget (Latin digits on the home screen, as on the board;
/// the app's digits on the lock screen), a still picture of it in the renderer.
enum Countdown {
    static func text(to target: Date, now: Date, live: Bool, digits: String? = nil) -> Text {
        if live { return Text(target, style: .timer) }
        let left = max(0, Int(target.timeIntervalSince(now).rounded(.down)))
        let h = left / 3600, m = (left % 3600) / 60, sec = left % 60
        let latin = h > 0 ? String(format: "%d:%02d:%02d", h, m, sec) : String(format: "%d:%02d", m, sec)
        guard let digits = digits else { return Text(verbatim: latin) }
        return Text(verbatim: String(latin.map { ch -> Character in
            guard let v = ch.wholeNumberValue else { return ch }
            return Array(digits).count == 10 ? Array(digits)[v] : ch
        }))
    }
}

/// A quiet card: one line, centred, on the widget's own ground.
struct QuietCard: View {
    enum Ground { case sky, paper, medallion }
    var text: String
    var ground: Ground
    var board: CGSize
    var rtl: Bool
    var lang: String

    var body: some View {
        MWCanvas(board: board, rtl: rtl, lang: lang) { s, size in
            ZStack {
                switch ground {
                case .sky: SkyBackground(s: s)
                case .paper: PaperBackground(s: s)
                case .medallion: MedallionBackground(s: s)
                }
                if ground == .medallion {
                    // Inside the shamsa's light disc, in ink, where the date stands.
                    Text(text)
                        .font(MWFont.plex(11.5 * s, .semibold))
                        .foregroundColor(MW.ink)
                        .multilineTextAlignment(.center)
                        .lineLimit(4)
                        .minimumScaleFactor(0.6)
                        .frame(width: 84 * s)
                        .position(x: size.width / 2, y: size.height * 0.44)
                } else {
                    Text(text)
                        .font(MWFont.plex((board.height > 300 ? 16 : board.width > 300 ? 14 : 13) * s, .semibold))
                        .foregroundColor(ground == .paper ? MW.ink : MW.paper)
                        .multilineTextAlignment(.center)
                        .lineLimit(3)
                        .minimumScaleFactor(0.6)
                        .padding(.horizontal, 22 * s)
                        .padding(.vertical, 18 * s)
                        .frame(maxWidth: .infinity)
                }
                InsetFrame(color: ground == .paper ? MW.frameOnPaper : MW.frameOnSky, s: s)
            }
        }
    }
}

/// The hijri date inside the shamsa's disc: the day big, then the month and the year.
struct DiscDate: View {
    var hijri: WidgetData.Hijri
    var day: CGFloat
    var month: CGFloat
    var year: CGFloat
    var s: CGFloat

    var body: some View {
        VStack(spacing: 0) {
            Text(hijri.day)
                .font(MWFont.plex(day * s, .bold))
                .foregroundColor(MW.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .frame(height: day * s)                 // the board's line-height: 1
            Text(hijri.month)
                .font(MWFont.plex(month * s, .semibold))
                .foregroundColor(MW.discMonth)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .padding(.top, 3 * s)
            Text(hijri.year)
                .font(MWFont.plex(year * s))
                .foregroundColor(MW.discYear)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .padding(.top, 2 * s)
        }
        .multilineTextAlignment(.center)
        .frame(width: 90 * s)
    }
}

// MARK: - 1. The next prayer (small, and the lock screen)

enum PrayerState {
    case quiet(String)
    case noPlace(String)
    case ready(WidgetData, WidgetData.Day, WidgetData.NextPrayer)

    static func resolve(_ data: WidgetData?, _ now: Date) -> PrayerState {
        guard let data = data else { return .quiet(MWFallback.openApp) }
        guard data.place != nil else { return .noPlace(data.labels.noPlace) }
        guard let day = data.day(at: now), !day.times.isEmpty, let next = data.nextPrayer(after: now) else {
            return .quiet(data.labels.openApp)
        }
        return .ready(data, day, next)
    }

    /// Where a tap goes: the times, or the app when there is nothing to show.
    var url: String {
        switch self {
        case .quiet: return "imuslim://today"
        case .noPlace, .ready: return "imuslim://today/times"
        }
    }
}

struct NextPrayerView: View {
    var data: WidgetData?
    var date: Date
    var family: MWFamily = .small

    var body: some View {
        let state = PrayerState.resolve(data, date)
        switch family {
        case .inline: NextPrayerInline(state: state, date: date)
        case .rectangular: NextPrayerRectangular(state: state, date: date)
        case .circular: NextPrayerCircular(state: state, date: date)
        default: NextPrayerSmall(state: state, date: date, data: data)
        }
    }
}

struct NextPrayerSmall: View {
    var state: PrayerState
    var date: Date
    var data: WidgetData?
    @Environment(\.mwLiveTimers) private var live

    var body: some View {
        switch state {
        case .quiet(let text), .noPlace(let text):
            QuietCard(text: text, ground: .sky, board: Board.small, rtl: data?.rtl ?? MWFallback.rtl,
                      lang: data?.lang ?? MWFallback.lang)
        case let .ready(data, _, next):
            MWCanvas(board: Board.small, rtl: data.rtl, lang: data.lang) { s, _ in
                ZStack {
                    SkyBackground(s: s)
                    Stars(stars: [.init(top: 22, left: 30, size: 10), .init(top: 58, left: 62, size: 7),
                                  .init(top: 40, left: 118, size: 6)], s: s)
                    VStack(alignment: .leading, spacing: 0) {
                        Text(data.labels.nextPrayer)
                            .font(MWFont.plex(12 * s, .semibold))
                            .foregroundColor(MW.gold2)
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                        Text(next.time.name)
                            .font(MWFont.plex(26 * s, .bold))
                            .foregroundColor(MW.paper)
                            .lineLimit(1)
                            .minimumScaleFactor(0.5)
                            .padding(.top, 4 * s)
                        Text(next.time.text)
                            .font(MWFont.plex(17 * s, .medium))
                            .foregroundColor(MW.paper.opacity(0.92))
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                        Spacer(minLength: 0)
                        Countdown.text(to: next.at, now: date, live: live)
                            .font(MWFont.plex(24 * s, .semibold))
                            .tracking(0.5 * s)
                            .foregroundColor(MW.countdown)
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            .multilineTextAlignment(.leading)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .environment(\.locale, Locale(identifier: "en_US_POSIX"))
                        Text(data.place?.name ?? "")
                            .font(MWFont.plex(11 * s))
                            .foregroundColor(MW.paper.opacity(0.75))
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .padding(18 * s)
                    InsetFrame(color: MW.frameOnSky, s: s)
                }
            }
        }
    }
}

/// The lock screen's line: «العصر ٣:٢٥ م، ٣ جمادى الأولى».
struct NextPrayerInline: View {
    var state: PrayerState
    var date: Date

    var body: some View {
        switch state {
        case .quiet(let text), .noPlace(let text):
            Text(text)
        case let .ready(data, day, next):
            Text(verbatim: "\(next.time.name) \(next.time.text)\(data.rtl ? "، " : ", ")\(day.hijri.day) \(day.hijri.month)")
                .environment(\.layoutDirection, data.rtl ? .rightToLeft : .leftToRight)
        }
    }
}

/// The lock screen's rectangle: the label, «العصر ٣:٢٥ م», and «بعد» with the live countdown.
struct NextPrayerRectangular: View {
    var state: PrayerState
    var date: Date
    @Environment(\.mwLiveTimers) private var live

    var body: some View {
        GeometryReader { geo in
            let s = min(1, min(geo.size.width / 172, geo.size.height / 70))
            Group {
                switch state {
                case .quiet(let text), .noPlace(let text):
                    Text(text)
                        .font(MWFont.plex(14 * s, .semibold))
                        .lineLimit(3)
                        .minimumScaleFactor(0.6)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                case let .ready(data, _, next):
                    let digits = MWDigits.of(next.time.text)
                    let parts = data.labels.after.components(separatedBy: "{t}")
                    VStack(alignment: .leading, spacing: 0) {
                        Text(data.labels.nextPrayer)
                            .font(MWFont.plex(13 * s, .semibold))
                            .opacity(0.85)
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                        Text(verbatim: "\(next.time.name) \(next.time.text)")
                            .font(MWFont.plex(20 * s, .bold))
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            .mwAccentable()
                        (Text(verbatim: parts.first ?? "")
                            + Countdown.text(to: next.at, now: date, live: live, digits: live ? nil : digits)
                            + Text(verbatim: parts.count > 1 ? parts[1] : ""))
                            .font(MWFont.plex(13 * s))
                            .opacity(0.85)
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            .environment(\.locale, MWDigits.locale(digits))
                    }
                    .padding(.horizontal, 2 * s)              // the Arabic first letter's tail stays inside the widget
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
                    .environment(\.layoutDirection, data.rtl ? .rightToLeft : .leftToRight)
                }
            }
        }
    }
}

/// The lock screen's circle: a ring from the prayer before to the next, the name and the countdown inside.
struct NextPrayerCircular: View {
    var state: PrayerState
    var date: Date
    @Environment(\.mwLiveTimers) private var live

    var body: some View {
        GeometryReader { geo in
            let s = min(geo.size.width, geo.size.height) / 80
            switch state {
            case .quiet, .noPlace:
                Image(systemName: "moon.stars")
                    .font(.system(size: 24 * s, weight: .medium))
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            case let .ready(_, day, next):
                let start = next.previous ?? Date(ms: day.start)
                let span = max(1, next.at.timeIntervalSince(start))
                let done = min(1, max(0, date.timeIntervalSince(start) / span))
                let digits = MWDigits.of(next.time.text)
                ZStack {
                    Circle()
                        .inset(by: 8.5 * s)
                        .stroke(Color.white.opacity(0.25), lineWidth: 5 * s)
                    Circle()
                        .inset(by: 8.5 * s)
                        .trim(from: 0, to: CGFloat(done))
                        .stroke(Color.white, style: StrokeStyle(lineWidth: 5 * s, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .mwAccentable()
                    VStack(spacing: 0) {
                        Text(next.time.name)
                            .font(MWFont.plex(13 * s, .bold))
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                        Countdown.text(to: next.at, now: date, live: live, digits: live ? nil : digits)
                            .font(MWFont.plex(12 * s, .bold))
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            .multilineTextAlignment(.center)
                            .environment(\.locale, MWDigits.locale(digits))
                    }
                    .padding(.horizontal, 15 * s)
                }
                .frame(width: geo.size.width, height: geo.size.height)
            }
        }
    }
}

// MARK: - 2. Today's times (large)

struct TodayTimesView: View {
    var data: WidgetData?
    var date: Date
    @Environment(\.mwLiveTimers) private var live

    var body: some View {
        switch PrayerState.resolve(data, date) {
        case .quiet(let text), .noPlace(let text):
            QuietCard(text: text, ground: .sky, board: Board.large, rtl: data?.rtl ?? MWFallback.rtl,
                      lang: data?.lang ?? MWFallback.lang)
        case let .ready(data, day, next):
            MWCanvas(board: Board.large, rtl: data.rtl, lang: data.lang) { s, size in
                ZStack {
                    PaperBackground(s: s)
                    VStack(spacing: 0) {
                        header(data, day, next, s, size)
                            .frame(height: 150 * s)
                        GoldBand(s: s)
                        table(day, next, s)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                    InsetFrame(color: MW.frameOnPaper, s: s)
                }
            }
        }
    }

    private func header(_ data: WidgetData, _ day: WidgetData.Day, _ next: WidgetData.NextPrayer, _ s: CGFloat,
                        _ size: CGSize) -> some View {
        ZStack {
            SkyBackground(s: s)
            Stars(stars: [.init(top: 26, left: 170, size: 10), .init(top: 70, left: 240, size: 7),
                          .init(top: 96, left: 130, size: 8), .init(top: 40, left: 300, size: 6)], s: s)
            HStack(alignment: .top, spacing: 8 * s) {
                VStack(alignment: .leading, spacing: 0) {
                    Text(data.labels.nextPrayer)
                        .font(MWFont.plex(12 * s, .semibold))
                        .foregroundColor(MW.gold2)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                    Text(next.time.name)
                        .font(MWFont.plex(30 * s, .bold))
                        .foregroundColor(MW.paper)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                        .padding(.top, 2 * s)
                    Text(next.time.text)
                        .font(MWFont.plex(16 * s))
                        .foregroundColor(MW.paper.opacity(0.9))
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                }
                .padding(.top, 20 * s)
                .frame(maxWidth: .infinity, alignment: .leading)
                VStack(alignment: .trailing, spacing: 0) {
                    Countdown.text(to: next.at, now: date, live: live)
                        .font(MWFont.plex(34 * s, .semibold))
                        .tracking(0.5 * s)
                        .foregroundColor(MW.countdown)
                        .lineLimit(1)
                        .minimumScaleFactor(0.5)
                        .multilineTextAlignment(.trailing)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                        .environment(\.locale, Locale(identifier: "en_US_POSIX"))
                    Text(data.labels.remaining)
                        .font(MWFont.plex(11.5 * s))
                        .foregroundColor(MW.gold2)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                }
                .padding(.top, 24 * s)
                .frame(width: (size.width - 44 * s) * 0.5)
            }
            .padding(.horizontal, 22 * s)
            .frame(maxHeight: .infinity, alignment: .top)
            HStack(spacing: 8 * s) {
                Text(day.gregorian)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                Spacer(minLength: 4 * s)
                Text(day.hijri.text)
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
            }
            .font(MWFont.plex(12 * s))
            .foregroundColor(MW.datesText.opacity(0.9))
            .padding(.horizontal, 22 * s)
            .padding(.bottom, 12 * s)
            .frame(maxHeight: .infinity, alignment: .bottom)
        }
        .clipped()
    }

    private func table(_ day: WidgetData.Day, _ next: WidgetData.NextPrayer, _ s: CGFloat) -> some View {
        let times = day.times
        let half = (times.count + 1) / 2
        let nowMs = date.ms
        return HStack(alignment: .top, spacing: 18 * s) {
            column(Array(times.prefix(half)), next: next, nowMs: nowMs, s: s)
            column(Array(times.dropFirst(half)), next: next, nowMs: nowMs, s: s)
        }
        .padding(.top, 14 * s)
        .padding(.horizontal, 18 * s)
        .padding(.bottom, 16 * s)
    }

    private func column(_ times: [WidgetData.Time], next: WidgetData.NextPrayer, nowMs: Double, s: CGFloat) -> some View {
        VStack(spacing: 4 * s) {
            ForEach(0..<times.count, id: \.self) { i in
                let t = times[i]
                TimeRow(time: t, isNext: t.key == next.time.key && t.at == next.time.at, isPast: t.at <= nowMs, s: s)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

/// A row of the table: the name at the start, the time at the end; past ones faded, the next one a gold pill.
/// «أذكار المواقف» (reply 0051): the large widget of the times' own parts, the sky with its title, the gold band, then
/// on the paper eight buttons in two columns, each a situation's icon and name opening its page in the app
/// (imuslim://mawaqif/<situation>; the last, «كل الأذكار» (reply 0053), the adhkar page, imuslim://today/adhkar). No dhikr is written here: the widget opens, the app
/// shows. The names are the app's (the data), else the built-in table.
struct MawaqifView: View {
    var data: WidgetData?
    @Environment(\.mwImages) private var images

    static let ids = ["travel", "sleep", "waking", "home", "mosque", "food", "distress", "all"]

    static func buttons(_ data: WidgetData?) -> [WidgetData.MawaqifButton] {
        if let b = data?.labels.mawaqif, b.count == ids.count { return b }
        let names = (MWFallback.table[MWFallback.lang] ?? MWFallback.table["ar"])?.mawaqif ?? []
        return ids.enumerated().map { i, id in
            WidgetData.MawaqifButton(id: id, name: i < names.count ? names[i] : id, url: id == "all" ? "imuslim://today/adhkar" : "imuslim://mawaqif/\(id)")
        }
    }

    var body: some View {
        let rtl = data?.rtl ?? MWFallback.rtl
        let lang = data?.lang ?? MWFallback.lang
        let buttons = MawaqifView.buttons(data)
        let title = data?.labels.names["mawaqif"]?.name ?? (MWFallback.table[MWFallback.lang] ?? MWFallback.table["ar"])?.names["mawaqif"]?.first ?? ""
        return MWCanvas(board: Board.large, rtl: rtl, lang: lang) { s, _ in
            ZStack {
                PaperBackground(s: s)
                VStack(spacing: 0) {
                    ZStack {
                        SkyBackground(s: s)
                        Stars(stars: [.init(top: 22, left: 40, size: 9), .init(top: 54, left: 310, size: 7),
                                      .init(top: 30, left: 250, size: 6)], s: s)
                        Text(title)
                            .font(MWFont.plex(30 * s, .bold))
                            .foregroundColor(MW.paper)
                            .lineLimit(1)
                            .minimumScaleFactor(0.5)
                            .padding(.horizontal, 22 * s)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .frame(height: 96 * s)
                    .clipped()
                    GoldBand(s: s)
                    VStack(spacing: 8 * s) {
                        ForEach(0..<4, id: \.self) { row in
                            HStack(spacing: 10 * s) {
                                ForEach(0..<2, id: \.self) { col in
                                    let b = buttons[row * 2 + col]
                                    MawaqifButtonView(button: b, icon: images.image("mq-\(b.id)"), s: s)
                                }
                            }
                        }
                    }
                    .padding(.top, 14 * s)
                    .padding(.horizontal, 18 * s)
                    .padding(.bottom, 16 * s)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
                InsetFrame(color: MW.frameOnPaper, s: s)
            }
        }
    }
}

struct MawaqifButtonView: View {
    var button: WidgetData.MawaqifButton
    var icon: Image
    var s: CGFloat

    @Environment(\.mwLiveTimers) private var live

    var body: some View {
        // A Link in the widget; the still picture of the macOS renderer (no live timers) draws the button alone.
        if live {
            Link(destination: URL(string: button.url) ?? URL(string: "imuslim://mawaqif")!) { label }
        } else {
            label
        }
    }

    private var label: some View {
            HStack(spacing: 8 * s) {
                icon
                    .renderingMode(.template)
                    .resizable()
                    .scaledToFit()
                    .frame(width: 22 * s, height: 22 * s)
                    .foregroundColor(MW.goldDark)
                    .accessibilityHidden(true)
                // A long name wraps to a second line rather than being cut, as the times' rows.
                Text(button.name)
                    .font(MWFont.plex(15 * s))
                    .foregroundColor(MW.rowText)
                    .lineLimit(2)
                    .minimumScaleFactor(0.7)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
            }
            .padding(.vertical, 6 * s)
            .padding(.horizontal, 12 * s)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(
                RoundedRectangle(cornerRadius: 12 * s, style: .continuous)
                    .fill(MW.paper.opacity(0.55))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12 * s, style: .continuous)
                            .stroke(MW.frameOnPaper.opacity(0.7), lineWidth: 1 * s)
                    )
            )
    }
}

struct TimeRow: View {
    var time: WidgetData.Time
    var isNext: Bool
    var isPast: Bool
    var s: CGFloat

    var body: some View {
        HStack(spacing: 6 * s) {
            // A long name wraps to a second line rather than being cut; the time keeps its width.
            Text(time.name)
                .font(MWFont.plex(15 * s))
                .foregroundColor(isNext ? .white : MW.rowText)
                .lineLimit(2)
                .minimumScaleFactor(0.7)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
            Text(time.text)
                .font(MWFont.plex(15 * s, .semibold))
                .foregroundColor(isNext ? .white : MW.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .layoutPriority(1)
        }
        .padding(.vertical, 7 * s)
        .padding(.horizontal, 12 * s)
        .background(
            Group {
                if isNext {
                    RoundedRectangle(cornerRadius: 12 * s, style: .continuous)
                        .fill(LinearGradient(colors: [Color(hex: 0xb88a35), Color(hex: 0xd8b064)],
                                             startPoint: UnitPoint(x: 0, y: 0.5), endPoint: UnitPoint(x: 1, y: 0.5)))
                        .shadow(color: Color(hex: 0x785514, alpha: 0.35), radius: 3 * s, x: 0, y: 2 * s)
                }
            }
        )
        .opacity(isPast && !isNext ? 0.5 : 1)
    }
}

// MARK: - 3. The date (small)

struct DateView: View {
    var data: WidgetData?
    var date: Date

    var body: some View {
        if let data = data, let day = data.day(at: date) {
            MWCanvas(board: Board.small, rtl: data.rtl, lang: data.lang) { s, size in
                ZStack {
                    MedallionBackground(s: s)
                    DiscDate(hijri: day.hijri, day: 33, month: 11.5, year: 10.5, s: s)
                        .position(x: size.width / 2, y: size.height * 0.44)
                    VStack(spacing: 0) {
                        Spacer(minLength: 0)
                        Text(day.gregorianShort)
                            .font(MWFont.plex(12.5 * s, .semibold))
                            .foregroundColor(MW.paper)
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            .padding(.horizontal, 12 * s)
                            .frame(maxWidth: .infinity)
                            .padding(.top, 10 * s)
                            .padding(.bottom, 13 * s)
                            .background(LinearGradient(
                                stops: [.init(color: Color(hex: 0x091634, alpha: 0), location: 0),
                                        .init(color: Color(hex: 0x091634, alpha: 0.92), location: 0.45),
                                        .init(color: Color(hex: 0x091634, alpha: 0.92), location: 1)],
                                startPoint: .top, endPoint: .bottom))
                    }
                    InsetFrame(color: MW.frameOnSky, s: s)
                }
            }
        } else {
            QuietCard(text: data?.labels.openApp ?? MWFallback.openApp, ground: .medallion, board: Board.small,
                      rtl: data?.rtl ?? MWFallback.rtl, lang: data?.lang ?? MWFallback.lang)
        }
    }
}

// MARK: - 4. The ayah of the day (medium)

struct AyahView: View {
    var data: WidgetData?
    var date: Date

    var body: some View {
        if let data = data, let day = data.day(at: date) {
            MWCanvas(board: Board.medium, rtl: data.rtl, lang: data.lang) { s, size in
                ZStack {
                    PaperBackground(s: s)
                    HStack(spacing: 0) {
                        ZStack {
                            MedallionBackground(s: s)
                            DiscDate(hijri: day.hijri, day: 30, month: 11, year: 10, s: s)
                                .position(x: size.height / 2, y: size.height * 0.44)
                        }
                        .frame(width: size.height, height: size.height)
                        Rectangle()
                            .fill(MW.gold)
                            .frame(width: max(1, 2 * s))
                        Group {
                            if let ayah = day.ayah {
                                AyahFit(ayah: ayah, header: data.labels.ayahOfDay,
                                        invite: data.labels.readAyah ?? "اضغط لقراءتها", s: s)
                            } else {
                                VStack(spacing: 4 * s) {
                                    Text(day.hijri.text)
                                        .font(MWFont.plex(17 * s, .bold))
                                        .foregroundColor(MW.ink)
                                    Text(day.gregorian)
                                        .font(MWFont.plex(12.5 * s))
                                        .foregroundColor(MW.muted)
                                }
                                .lineLimit(1)
                                .minimumScaleFactor(0.6)
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                            }
                        }
                        .padding(.top, 12 * s)
                        .padding(.bottom, 12 * s)
                        .padding(.leading, 18 * s)
                        .padding(.trailing, 16 * s)
                    }
                    InsetFrame(color: MW.frameOnPaper, s: s)
                }
            }
        } else {
            QuietCard(text: data?.labels.openApp ?? MWFallback.openApp, ground: .paper, board: Board.medium,
                      rtl: data?.rtl ?? MWFallback.rtl, lang: data?.lang ?? MWFallback.lang)
        }
    }
}

/// The ayah is never cut, clamped or ellipsised (CLAUDE.md §3 rule 4): it shrinks to fit, down to 0.7 of the board's
/// size (about 12 pt, still easy to read and the largest text on its side); when even that cannot hold it whole, the
/// widget shows its reference and an invitation to open it, and no part of it.
struct AyahFit: View {
    var ayah: WidgetData.Ayah
    var header: String
    var invite: String
    var s: CGFloat

    static let steps: [CGFloat] = [1, 0.9, 0.8, 0.7]

    var body: some View {
        if #available(iOS 16.0, macOS 13.0, *) {
            ViewThatFits(in: .vertical) {
                side(AyahFit.steps[0])
                side(AyahFit.steps[1])
                side(AyahFit.steps[2])
                side(AyahFit.steps[3])
                invitation
            }
        } else if let k = AyahFit.legacyScale(ayah.text) {
            side(k)
        } else {
            invitation
        }
    }

    /// iOS 15 has no ViewThatFits: a rule by the number of letters, kept on the safe side of what ViewThatFits takes
    /// for every ayah of the daily list at the medium sizes from 321 × 148 to 364 × 170 (measured with these fonts).
    static func legacyScale(_ text: String) -> CGFloat? {
        let letters = text.unicodeScalars.filter { $0.properties.isAlphabetic && $0.properties.generalCategory != .nonspacingMark }.count
        switch letters {
        case ..<40: return 1
        case ..<70: return 0.85
        case ..<120: return 0.7
        default: return nil
        }
    }

    private func small(_ k: CGFloat) -> CGFloat { min(11.5 * s, 17 * s * k * 0.9) }

    private func headerLine(_ size: CGFloat) -> some View {
        Text(header)
            .font(MWFont.plex(size, .semibold))
            .foregroundColor(MW.goldDark)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.leading, -2 * s)                   // the board's label sits at 16 from the rule, the text at 18
            .frame(height: size * 1.5)
    }

    private func side(_ k: CGFloat) -> some View {
        let a = 17 * s * k
        let small = small(k)
        return VStack(spacing: 0) {
            headerLine(small)
            Spacer(minLength: 3 * s)
            Text(ayah.text)
                .font(MWFont.amiri(a))
                .lineSpacing(MWFont.amiriLineSpacing(a, cssLineHeight: 1.8))
                .foregroundColor(MW.ink)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity)
                .environment(\.layoutDirection, MWScript.direction(ayah.text))
            Text(ayah.ref)
                .font(MWFont.plex(small, .semibold))
                .foregroundColor(MW.goldDark)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
                .padding(.top, 4 * s * min(1, k + 0.2))
            Spacer(minLength: 3 * s)
            Color.clear.frame(height: small * 1.5)       // balances the label, so the ayah sits in the middle
        }
    }

    private var invitation: some View {
        VStack(spacing: 0) {
            headerLine(11.5 * s)
            Spacer(minLength: 0)
            Text(ayah.ref)
                .font(MWFont.plex(17 * s, .bold))
                .foregroundColor(MW.ink)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(invite)
                .font(MWFont.plex(12.5 * s))
                .foregroundColor(MW.muted)
                .lineLimit(2)
                .minimumScaleFactor(0.7)
                .multilineTextAlignment(.center)
                .padding(.top, 4 * s)
            Spacer(minLength: 0)
            Color.clear.frame(height: 11.5 * s * 1.5)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - 5. The hadith of the day (medium)

struct HadithView: View {
    var data: WidgetData?
    var date: Date

    var body: some View {
        if let data = data, let day = data.day(at: date) {
            MWCanvas(board: Board.medium, rtl: data.rtl, lang: data.lang) { s, _ in
                ZStack {
                    PaperBackground(s: s)
                    if let hadith = day.hadith {
                        VStack(alignment: .leading, spacing: 0) {
                            HStack(alignment: .center, spacing: 8 * s) {
                                Text(data.labels.hadithOfDay)
                                    .font(MWFont.plex(12 * s, .semibold))
                                    .foregroundColor(MW.goldDark)
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.6)
                                Spacer(minLength: 0)
                                GradeBadge(text: hadith.grade, s: s)
                            }
                            .layoutPriority(2)
                            // The hadith may give up whole lines, as the day card does: its whole text is on its page.
                            Text(hadith.text)
                                .font(MWFont.amiri(18 * s))
                                .foregroundColor(MW.hadithText)
                                .multilineTextAlignment(.leading)
                                .truncationMode(.tail)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .environment(\.layoutDirection, MWScript.direction(hadith.text))
                                .padding(.top, 8 * s)
                            Spacer(minLength: 0)
                            Text(hadith.attribution)
                                .font(MWFont.plex(11.5 * s))
                                .foregroundColor(MW.muted)
                                .lineLimit(1)
                                .minimumScaleFactor(0.6)
                                .layoutPriority(2)
                        }
                        .padding(.vertical, 16 * s)
                        .padding(.horizontal, 20 * s)
                    } else {
                        VStack(spacing: 4 * s) {
                            Text(data.labels.hadithOfDay)
                                .font(MWFont.plex(15 * s, .semibold))
                                .foregroundColor(MW.goldDark)
                            Text(day.gregorian)
                                .font(MWFont.plex(12.5 * s))
                                .foregroundColor(MW.muted)
                        }
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                        .padding(.horizontal, 20 * s)
                    }
                    InsetFrame(color: MW.frameOnPaper, s: s)
                }
            }
        } else {
            QuietCard(text: data?.labels.openApp ?? MWFallback.openApp, ground: .paper, board: Board.medium,
                      rtl: data?.rtl ?? MWFallback.rtl, lang: data?.lang ?? MWFallback.lang)
        }
    }
}

// MARK: - 6. The tasbih (small)

/// The «+١» button's face; the widget wraps it in the App Intent's button on iOS 17.
struct TasbihPlusLabel: View {
    var text: String
    var s: CGFloat

    var body: some View {
        ZStack {
            Capsule().fill(Color(hex: 0x8a6a2a)).offset(y: 2 * s)
            Capsule().fill(LinearGradient(colors: [Color(hex: 0xf0d58f), Color(hex: 0xc9a04e)],
                                          startPoint: .top, endPoint: .bottom))
            Text(verbatim: text)
                .font(MWFont.plex(17 * s, .bold))
                .foregroundColor(Color(hex: 0x3a2a0c))
                .environment(\.layoutDirection, .leftToRight)
        }
        .frame(maxWidth: .infinity)
        .frame(height: 40 * s)
    }
}

struct TasbihView<Plus: View>: View {
    var data: WidgetData?
    var date: Date
    var plus: (TasbihPlusLabel) -> Plus

    init(data: WidgetData?, date: Date, @ViewBuilder plus: @escaping (TasbihPlusLabel) -> Plus) {
        self.data = data
        self.date = date
        self.plus = plus
    }

    var body: some View {
        if let data = data, !data.tasbih.steps.isEmpty {
            let t = data.tasbih
            let step = t.steps[min(max(0, t.step), t.steps.count - 1)]
            MWCanvas(board: Board.small, rtl: data.rtl, lang: data.lang) { s, _ in
                ZStack {
                    SkyBackground(s: s)
                    Stars(stars: [.init(top: 20, left: 22, size: 10), .init(top: 30, left: 140, size: 7)], s: s)
                    VStack(spacing: 0) {
                        Text(data.labels.tasbih)
                            .font(MWFont.plex(12 * s, .semibold))
                            .foregroundColor(MW.gold2)
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                        Text(step.zikr)
                            .font(MWFont.amiri(20 * s, bold: true))
                            .foregroundColor(MW.paper)
                            .multilineTextAlignment(.center)
                            .lineLimit(3)
                            .minimumScaleFactor(0.45)
                            .environment(\.layoutDirection, MWScript.direction(step.zikr))
                        Text(verbatim: MWDigits.write(t.n, t.digits))
                            .font(MWFont.plex(34 * s, .bold))
                            .foregroundColor(MW.countdown)
                            .lineLimit(1)
                            .minimumScaleFactor(0.5)
                            .padding(.top, 2 * s)
                            .layoutPriority(1)
                        Spacer(minLength: 0)
                        plus(TasbihPlusLabel(text: "\u{2066}+" + MWDigits.write(1, t.digits) + "\u{2069}", s: s))
                            .layoutPriority(2)
                    }
                    .padding(16 * s)
                    InsetFrame(color: MW.frameOnSky, s: s)
                }
            }
        } else {
            QuietCard(text: data?.labels.openApp ?? MWFallback.openApp, ground: .sky, board: Board.small,
                      rtl: data?.rtl ?? MWFallback.rtl, lang: data?.lang ?? MWFallback.lang)
        }
    }
}

extension TasbihView where Plus == TasbihPlusLabel {
    init(data: WidgetData?, date: Date) {
        self.init(data: data, date: date) { $0 }
    }
}

// MARK: - 7. The adhkar of the time (small)

enum AdhkarNow {
    /// The morning's after fajr until asr, the evening's after asr until the next fajr (the board's rule; no ruling
    /// written). With no times (no city yet): the morning's before noon, the evening's after.
    static func part(_ data: WidgetData, _ now: Date) -> (part: WidgetData.Adhkar.Part, today: Bool)? {
        guard let day = data.day(at: now) else { return nil }
        let t = now.ms
        let morning: Bool
        if let fajr = day.times.first(where: { $0.key == "fajr" }), let asr = day.times.first(where: { $0.key == "asr" }) {
            morning = t >= fajr.at && t < asr.at
        } else {
            var cal = Calendar(identifier: .gregorian)
            cal.timeZone = data.timeZone
            morning = cal.component(.hour, from: now) < 12
        }
        return (morning ? data.adhkar.morning : data.adhkar.evening, data.adhkar.day == day.date)
    }
}

struct AdhkarView: View {
    var data: WidgetData?
    var date: Date

    var body: some View {
        if let data = data, let now = AdhkarNow.part(data, date) {
            let fraction = now.today ? min(1, max(0, now.part.fraction)) : 0
            MWCanvas(board: Board.small, rtl: data.rtl, lang: data.lang) { s, size in
                ZStack {
                    PaperBackground(s: s)
                    VStack(alignment: .leading, spacing: 0) {
                        Text(data.labels.adhkarNow)
                            .font(MWFont.plex(12 * s, .semibold))
                            .foregroundColor(MW.goldDark)
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                        Text(now.part.title)
                            .font(MWFont.plex(21 * s, .bold))
                            .foregroundColor(MW.ink)
                            .lineLimit(2)
                            .minimumScaleFactor(0.6)
                            .padding(.top, 4 * s)
                        Text(now.today ? now.part.progress : now.part.none)
                            .font(MWFont.plex(12.5 * s))
                            .foregroundColor(MW.muted)
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            .padding(.top, 2 * s)
                        Spacer(minLength: 0)
                        ProgressBar(fraction: fraction, width: size.width - 36 * s, s: s)
                        Text(data.labels.cont)
                            .font(MWFont.plex(12.5 * s, .semibold))
                            .foregroundColor(MW.goldDark)
                            .lineLimit(1)
                            .minimumScaleFactor(0.6)
                            .padding(.top, 9 * s)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .padding(18 * s)
                    InsetFrame(color: MW.frameOnPaper, s: s)
                }
            }
        } else {
            QuietCard(text: data?.labels.openApp ?? MWFallback.openApp, ground: .paper, board: Board.small,
                      rtl: data?.rtl ?? MWFallback.rtl, lang: data?.lang ?? MWFallback.lang)
        }
    }
}

/// The adhkar's bar: #e4d7b8, filled from the start side with #c9a04e → #e2c27c.
struct ProgressBar: View {
    var fraction: Double
    var width: CGFloat
    var s: CGFloat

    var body: some View {
        RoundedRectangle(cornerRadius: 4 * s)
            .fill(Color(hex: 0xe4d7b8))
            .frame(height: 7 * s)
            .overlay(alignment: .leading) {
                RoundedRectangle(cornerRadius: 4 * s)
                    .fill(LinearGradient(colors: [Color(hex: 0xc9a04e), Color(hex: 0xe2c27c)],
                                         startPoint: UnitPoint(x: 0, y: 0.5), endPoint: UnitPoint(x: 1, y: 0.5)))
                    .frame(width: max(0, width * CGFloat(fraction)))
                    .opacity(fraction > 0 ? 1 : 0)
            }
            .clipShape(RoundedRectangle(cornerRadius: 4 * s))
    }
}

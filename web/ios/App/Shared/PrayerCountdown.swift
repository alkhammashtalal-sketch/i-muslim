import ActivityKit
import AppIntents
import Foundation

// «عدّاد الصلاة القادمة» (add-on 0072-add34 §ب7): a Live Activity on the Lock Screen and in the Dynamic Island that
// counts down to the next of the five prayers and, at its time, says «حان وقت …» by itself (its staleDate), with no
// server and no push. It starts from the app's times page (PrayerCountdownPlugin.swift), from the «عدّاد الصلاة» control
// (iOS 18), and from Siri and the Shortcuts app (StartPrayerCountdownIntent, a LiveActivityIntent: «When the system
// performs the intent, the system launches your app process without opening the app, performs the intent, and starts
// the Live Activity», developer.apple.com/documentation/appintents/liveactivityintent). The prayer, its time and every
// word but «حان وقت {p}» come from the app's widgets.json (PrayerPlan.swift); the countdown is the system's own timer
// (Text(timerInterval:)), so nothing updates it while it runs. Compiled into the app and the widget extension both:
// the extension draws it (CountdownWidgets.swift), the app starts and ends it.
// Apple's limits (Displaying live data with Live Activities): active for up to eight hours, then on the Lock Screen up
// to four more; at most 4 KB of data (this is under half a kilobyte). Without a push server the activity cannot be
// ended at a set time by anyone but the app: at the time its card shows «حان وقت …», and the app ends it the next
// time it runs (opening, a background refresh, any of its intents), or the system at its eight hours.

@available(iOS 16.1, *)
struct PrayerCountdownAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var key: String         // fajr … isha
        var name: String        // «العصر», in the app's language
        var at: Date
        var text: String        // «٣:٢٥ م»
        var start: Date         // when the countdown began (the ring's start)
    }

    var title: String           // «الصلاة القادمة» (the widgets' own label)
    var place: String           // «الرياض»
    var nowFormat: String       // «حان وقت {p}»
    var digits: String          // the ten digits of the app's language
    var lang: String
    var rtl: Bool
}

/// The few words of the countdown that the widgets' data does not carry, in the app's ten languages (Arabic and English
/// reviewed, the other eight machine translation as the rest of the interface). No sacred text.
enum CountdownText {
    struct Words {
        var now: String         // «حان وقت {p}»
        var control: String     // the control's name
        var controlDesc: String
        var on: String          // Siri's reply once it shows: «{p}» the prayer, «{t}» its time
        var off: String         // Live Activities are off for the app
        var noData: String
        var tooFar: String
        var failed: String
    }

    static let table: [String: Words] = [
        "ar": Words(now: "حان وقت {p}", control: "عدّاد الصلاة", controlDesc: "العدّ إلى الصلاة القادمة على شاشة القفل",
                    on: "العدّ إلى {p} على شاشة القفل الآن، {t}", off: "الأنشطة الحية مطفأة لهذا التطبيق في إعدادات الجوال",
                    noData: "افتح التطبيق لتحديث المواقيت", tooFar: "الصلاة القادمة بعد أكثر من اثنتي عشرة ساعة، فيبدأ العدّ لاحقًا",
                    failed: "تعذّر بدء العدّ الآن"),
        "en": Words(now: "It’s time for {p}", control: "Prayer countdown", controlDesc: "The countdown to the next prayer on the Lock Screen",
                    on: "The countdown to {p} is on the Lock Screen, {t}", off: "Live Activities are off for this app in Settings",
                    noData: "Open the app to update the prayer times", tooFar: "The next prayer is more than twelve hours away, so the countdown can start later",
                    failed: "The countdown could not start now"),
        "ur": Words(now: "{p} کا وقت ہو گیا", control: "نماز کی الٹی گنتی", controlDesc: "لاک اسکرین پر اگلی نماز تک الٹی گنتی",
                    on: "{p} تک الٹی گنتی اب لاک اسکرین پر ہے، {t}", off: "فون کی ترتیبات میں اس ایپ کے لیے لائیو ایکٹیویٹیز بند ہیں",
                    noData: "اوقات تازہ کرنے کے لیے ایپ کھولیں", tooFar: "اگلی نماز بارہ گھنٹے سے زیادہ دور ہے، اس لیے گنتی بعد میں شروع ہو سکتی ہے",
                    failed: "گنتی ابھی شروع نہ ہو سکی"),
        "id": Words(now: "Waktu {p} telah tiba", control: "Hitung mundur salat", controlDesc: "Hitung mundur ke salat berikutnya di Layar Kunci",
                    on: "Hitung mundur ke {p} kini di Layar Kunci, {t}", off: "Aktivitas Langsung untuk aplikasi ini mati di Pengaturan",
                    noData: "Buka aplikasi untuk memperbarui waktu salat", tooFar: "Salat berikutnya lebih dari dua belas jam lagi, jadi hitung mundur bisa dimulai nanti",
                    failed: "Hitung mundur tidak dapat dimulai sekarang"),
        "ms": Words(now: "Telah masuk waktu {p}", control: "Kira detik solat", controlDesc: "Kira detik ke solat seterusnya di Skrin Kunci",
                    on: "Kira detik ke {p} kini di Skrin Kunci, {t}", off: "Aktiviti Langsung untuk aplikasi ini dimatikan dalam Tetapan",
                    noData: "Buka aplikasi untuk mengemas kini waktu solat", tooFar: "Solat seterusnya lebih dua belas jam lagi, jadi kira detik boleh bermula kemudian",
                    failed: "Kira detik tidak dapat bermula sekarang"),
        "tr": Words(now: "{p} vakti girdi", control: "Namaz geri sayımı", controlDesc: "Kilit Ekranında bir sonraki namaza geri sayım",
                    on: "{p} için geri sayım şimdi Kilit Ekranında, {t}", off: "Ayarlar’da bu uygulama için Canlı Etkinlikler kapalı",
                    noData: "Vakitleri güncellemek için uygulamayı açın", tooFar: "Bir sonraki namaza on iki saatten fazla var, geri sayım daha sonra başlayabilir",
                    failed: "Geri sayım şu an başlatılamadı"),
        "fr": Words(now: "L’heure de {p} est arrivée", control: "Compte à rebours de la prière", controlDesc: "Le compte à rebours jusqu’à la prochaine prière sur l’écran verrouillé",
                    on: "Le compte à rebours jusqu’à {p} est sur l’écran verrouillé, {t}", off: "Les Activités en direct sont désactivées pour cette app dans Réglages",
                    noData: "Ouvrez l’app pour mettre à jour les horaires", tooFar: "La prochaine prière est dans plus de douze heures, le compte à rebours pourra commencer plus tard",
                    failed: "Le compte à rebours n’a pas pu démarrer"),
        "es": Words(now: "Es la hora de {p}", control: "Cuenta atrás de la oración", controlDesc: "La cuenta atrás hasta la próxima oración en la pantalla bloqueada",
                    on: "La cuenta atrás hasta {p} está en la pantalla bloqueada, {t}", off: "Las Actividades en vivo están desactivadas para esta app en Ajustes",
                    noData: "Abre la app para actualizar los horarios", tooFar: "La próxima oración es en más de doce horas, la cuenta atrás podrá empezar más tarde",
                    failed: "La cuenta atrás no pudo empezar ahora"),
        "bn": Words(now: "{p}-এর সময় হয়েছে", control: "নামাজের কাউন্টডাউন", controlDesc: "লক স্ক্রিনে পরবর্তী নামাজ পর্যন্ত কাউন্টডাউন",
                    on: "{p} পর্যন্ত কাউন্টডাউন এখন লক স্ক্রিনে, {t}", off: "সেটিংসে এই অ্যাপের জন্য লাইভ অ্যাক্টিভিটি বন্ধ",
                    noData: "সময় হালনাগাদ করতে অ্যাপটি খুলুন", tooFar: "পরবর্তী নামাজ বারো ঘণ্টার বেশি দূরে, তাই কাউন্টডাউন পরে শুরু হতে পারে",
                    failed: "কাউন্টডাউন এখন শুরু করা গেল না"),
        "hi": Words(now: "{p} का समय हो गया", control: "नमाज़ की उलटी गिनती", controlDesc: "लॉक स्क्रीन पर अगली नमाज़ तक उलटी गिनती",
                    on: "{p} तक उलटी गिनती अब लॉक स्क्रीन पर है, {t}", off: "सेटिंग्स में इस ऐप के लिए लाइव एक्टिविटी बंद हैं",
                    noData: "समय अपडेट करने के लिए ऐप खोलें", tooFar: "अगली नमाज़ बारह घंटे से ज़्यादा दूर है, इसलिए गिनती बाद में शुरू हो सकती है",
                    failed: "गिनती अभी शुरू नहीं हो सकी"),
    ]

    /// The app's language from its data, else the phone's (an app never opened has no data).
    static func of(_ lang: String?) -> Words {
        if let l = lang, let w = table[l] { return w }
        let phone = Locale.preferredLanguages.first.map { String($0.prefix(2)) } ?? "ar"
        return table[phone] ?? table["ar"]!
    }
}

@available(iOS 16.2, *)
enum PrayerCountdownRunner {
    enum Outcome: String { case ok, disabled, noData, tooFar, failed }

    static func current() -> [Activity<PrayerCountdownAttributes>] { Activity<PrayerCountdownAttributes>.activities }

    /// The app sets this (MuslimBackground.swift): ask for a background refresh at the prayer's time, to end the card.
    static var afterStart: ((Date) -> Void)?

    /// Start the countdown to the next prayer, ending any earlier one first. Returns what happened and the prayer.
    static func start(now: Date = Date()) async -> (Outcome, PrayerPlan.Next?) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else { return (.disabled, nil) }
        let file = PrayerPlan.load()
        let next: PrayerPlan.Next
        switch PrayerPlan.countdown(file, now: now.timeIntervalSince1970 * 1000) {
        case .noData: return (.noData, nil)
        case .tooFar(let n): return (.tooFar, n)
        case .start(let n): next = n
        }
        guard let f = file else { return (.noData, nil) }
        for a in current() { await a.end(nil, dismissalPolicy: .immediate) }
        let attrs = PrayerCountdownAttributes(title: f.labels.nextPrayer, place: f.place?.name ?? "",
                                              nowFormat: CountdownText.of(f.lang).now, digits: f.digits, lang: f.lang, rtl: f.rtl)
        let at = Date(timeIntervalSince1970: next.at / 1000)
        let state = PrayerCountdownAttributes.ContentState(key: next.key, name: next.name, at: at, text: next.text, start: now)
        // At the prayer's time the card becomes stale: «At the specified date, the activityState changes to stale and
        // isStale changes to true», and the view says «حان وقت …».
        let content = ActivityContent(state: state, staleDate: at)
        do {
            _ = try Activity.request(attributes: attrs, content: content, pushType: nil)
        } catch {
            return (.failed, next)
        }
        afterStart?(at)
        return (.ok, next)
    }

    /// End every countdown whose prayer has come (the app's next run after the time).
    static func endPast(now: Date = Date()) async {
        for a in current() where a.content.state.at <= now {
            await a.end(a.content, dismissalPolicy: .immediate)
        }
    }

    static func end() async {
        for a in current() { await a.end(nil, dismissalPolicy: .immediate) }
    }

    /// Siri's reply, in the app's language: no ayah or hadith, only the prayer's name and time from the app's data.
    static func reply(_ o: Outcome, _ n: PrayerPlan.Next?, lang: String?) -> String {
        let w = CountdownText.of(lang)
        switch o {
        case .ok: return w.on.replacingOccurrences(of: "{p}", with: n?.name ?? "").replacingOccurrences(of: "{t}", with: n?.text ?? "")
        case .disabled: return w.off
        case .noData: return w.noData
        case .tooFar: return w.tooFar
        case .failed: return w.failed
        }
    }
}

/// «اعرض عدّاد الصلاة القادمة»: from Siri, the Shortcuts app, and the «عدّاد الصلاة» control. Runs in the app's process
/// without opening the app (LiveActivityIntent, iOS 17).
@available(iOS 17.0, *)
struct StartPrayerCountdownIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = LocalizedStringResource("countdown.start.title", table: "Countdown")
    static let description = IntentDescription(LocalizedStringResource("countdown.start.description", table: "Countdown"))
    static let openAppWhenRun: Bool = false
    static let isDiscoverable: Bool = true
    /// A prayer's time is no secret: from the Lock Screen too, Apple's default written out.
    static let authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed

    init() {}

    func perform() async throws -> some IntentResult & ProvidesDialog {
        let (o, n) = await PrayerCountdownRunner.start()
        let text = PrayerCountdownRunner.reply(o, n, lang: PrayerPlan.load()?.lang)
        return .result(dialog: IntentDialog(stringLiteral: text))
    }
}

import Foundation

// The plans of «منبّه الفجر» (add-on 0072-add34 §ب6) and «عدّاد الصلاة القادمة» (§ب7), from the times the app already
// writes for its widgets into the App Group (widgets.json: web/src/native/widget-data.ts, 60 days ahead, every time
// ready to show in the app's language). Nothing is computed here that the app has not computed: the next of the five
// prayers, the Fajr times of the days ahead, and which alarms to keep, cancel or add. Only the fields read here are
// decoded, so a field added to the widgets' data never breaks a plan.
// Pure Foundation (no ActivityKit, no AlarmKit), in the app and the widget extension both, so
// worker/test/alarm-live-0072.test.ts compiles and runs it on the Mac.

enum PrayerPlan {
    struct File: Decodable {
        struct Place: Decodable { var name: String }
        struct Labels: Decodable { var nextPrayer: String }
        struct Time: Decodable { var key: String; var name: String; var at: Double; var text: String; var prayer: Bool }
        struct Day: Decodable { var date: String; var start: Double; var end: Double; var times: [Time] }
        struct Tasbih: Decodable { var digits: String }
        var lang: String
        var rtl: Bool
        var place: Place?
        var labels: Labels
        var days: [Day]
        var tasbih: Tasbih?

        /// The ten digits the app writes in its language (the tasbih's, the same everywhere in the data).
        var digits: String { tasbih?.digits ?? "0123456789" }
    }

    static let group = "group.com.alkhammashtalal.imuslim"

    static func read(_ data: Data?) -> File? {
        guard let data = data else { return nil }
        return try? JSONDecoder().decode(File.self, from: data)
    }

    /// The App Group's widgets.json, as the widgets read it.
    static func load() -> File? {
        guard let dir = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) else { return nil }
        return read(try? Data(contentsOf: dir.appendingPathComponent("widgets.json")))
    }

    // MARK: - The next prayer (§ب7)

    struct Next: Equatable {
        var key: String
        var name: String
        var at: Double          // ms
        var text: String        // «٣:٢٥ م», as the app writes it
    }

    /// The first of the five prayers after `now` (ms), across midnight and the days after: sunrise is not one of them,
    /// and after Isha it is the next day's Fajr.
    static func next(_ f: File?, now: Double) -> Next? {
        guard let f = f else { return nil }
        var best: Time?
        for day in f.days {
            for t in day.times where t.prayer && t.at > now {
                if best == nil || t.at < best!.at { best = t }
            }
        }
        return best.map { Next(key: $0.key, name: $0.name, at: $0.at, text: $0.text) }
    }

    typealias Time = File.Time

    /// Apple (Displaying live data with Live Activities): «A Live Activity can be active for up to eight hours», then
    /// the system ends it and removes it from the Dynamic Island, and it «remains on the Lock Screen … for up to four
    /// additional hours». So the countdown is offered for a prayer at most twelve hours away (only the night from Isha
    /// to Fajr, far from the equator in winter, can be longer); beyond that the app says so and starts nothing.
    static let activeLimitMs: Double = 8 * 3_600_000
    static let lockLimitMs: Double = 12 * 3_600_000

    enum Countdown: Equatable {
        case start(Next)        // within twelve hours
        case tooFar(Next)
        case noData             // no file, no place, or the file's days are behind us
    }

    static func countdown(_ f: File?, now: Double) -> Countdown {
        guard let n = next(f, now: now) else { return .noData }
        return n.at - now <= lockLimitMs ? .start(n) : .tooFar(n)
    }

    /// «حان وقت {p}»: the line the card shows once the time has come (the Live Activity's staleDate).
    static func fill(_ format: String, _ name: String) -> String { format.replacingOccurrences(of: "{p}", with: name) }

    // MARK: - The Fajr alarm (§ب6)

    struct Slot: Equatable {
        var day: String         // 2026-10-25, the place's date
        var at: Double          // ms
    }

    /// No alarm is set for a Fajr less than this far ahead: a renewal a few seconds before the time never races it.
    static let alarmLeadMs: Double = 60_000

    /// The Fajr of each day ahead, after `now`, at most `max`, in time order.
    static func fajrSlots(_ f: File?, now: Double, max: Int) -> [Slot] {
        guard let f = f, max > 0 else { return [] }
        var out: [Slot] = []
        var seen = Set<String>()
        for day in f.days.sorted(by: { $0.start < $1.start }) {
            guard let t = day.times.first(where: { $0.key == "fajr" }), t.at > now + alarmLeadMs, !seen.contains(day.date) else { continue }
            seen.insert(day.date)
            out.append(Slot(day: day.date, at: t.at))
            if out.count >= max { break }
        }
        return out
    }

    /// Each day's alarm has its own id, the same from one renewal to the next: «MUSLIM FAJR» and the date.
    ///   2026-10-25 → 4D55534C-494D-4641-8A52-202610250000
    static let idPrefix = "4D55534C-494D-4641-8A52-"
    static func alarmID(day: String) -> UUID? {
        let digits = day.filter(\.isNumber)
        guard digits.count == 8 else { return nil }
        return UUID(uuidString: idPrefix + digits + "0000")
    }
    static func isOurs(_ id: UUID) -> Bool { id.uuidString.hasPrefix(idPrefix) }

    struct Existing: Equatable {
        var id: UUID
        var at: Double?         // its fixed date (ms), when it has one
    }
    struct Diff: Equatable {
        var cancel: [UUID]
        var add: [Slot]
    }

    /// What to do so that exactly the wanted alarms are set: an alarm whose day is wanted at the same minute stays; any
    /// other of ours is cancelled (a moved time, a day behind us, the alarm turned off); a wanted day not set is added.
    /// Alarms that are not ours are never touched.
    static func reconcile(existing: [Existing], wanted: [Slot]) -> Diff {
        var keep = Set<UUID>()
        var cancel: [UUID] = []
        let want = Dictionary(wanted.compactMap { s in alarmID(day: s.day).map { ($0, s) } }, uniquingKeysWith: { a, _ in a })
        for e in existing where isOurs(e.id) {
            if let s = want[e.id], let at = e.at, abs(at - s.at) < 1000 { keep.insert(e.id) } else { cancel.append(e.id) }
        }
        let add = wanted.filter { s in alarmID(day: s.day).map { !keep.contains($0) } ?? false }
        return Diff(cancel: cancel, add: add)
    }
}

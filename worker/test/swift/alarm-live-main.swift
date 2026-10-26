import Foundation

// worker/test/alarm-live-0072.test.ts: the app's own PrayerPlan.swift (web/ios/App/Shared), compiled on the Mac and
// asked here, so the tests check the Swift that runs on the iPhone, not a copy of it.
//   main next <widgets.json> <now ms>            → {"key","name","at","text"} or null
//   main countdown <widgets.json> <now ms>       → {"kind": "start"|"tooFar"|"noData", "key", "at"}
//   main slots <widgets.json> <now ms> <max>     → [{"day","at"}]
//   main reconcile <request.json>                → {"cancel": [uuid], "add": [{"day","at"}]}
//     request: {"existing": [{"id","at","fixed"?,"alerting"?}], "wanted": [{"day","at"}], "now"?, "keepDue"?}
//   main id <yyyy-MM-dd>                         → the alarm's UUID, and whether it is ours
//   main fill <format> <name>                    → the «حان وقت {p}» line
//   main signature <sound|-> <present 0|1> <stop> <title> → the alarms' signature
//   main afterStart <request.json>               → the ids a start ends; request: {"started": id|null, "running": [{"id","kind"}]}
//   main onStop <prayer|fasting> <request.json>  → the ids a stop ends; request: {"running": [{"id","kind"}]}

let a = CommandLine.arguments
func out(_ v: Any?) {
    let d = try! JSONSerialization.data(withJSONObject: v ?? NSNull(), options: [.sortedKeys, .fragmentsAllowed])
    print(String(data: d, encoding: .utf8)!)
}
func file(_ p: String) -> PrayerPlan.File? { PrayerPlan.read(FileManager.default.contents(atPath: p)) }
func next(_ n: PrayerPlan.Next) -> [String: Any] { ["key": n.key, "name": n.name, "at": n.at, "text": n.text] }
func slot(_ s: PrayerPlan.Slot) -> [String: Any] { ["day": s.day, "at": s.at] }

switch a[1] {
case "next":
    out(PrayerPlan.next(file(a[2]), now: Double(a[3])!).map(next))
case "countdown":
    switch PrayerPlan.countdown(file(a[2]), now: Double(a[3])!) {
    case .start(let n): out(["kind": "start"].merging(next(n)) { x, _ in x })
    case .tooFar(let n): out(["kind": "tooFar"].merging(next(n)) { x, _ in x })
    case .noData: out(["kind": "noData"])
    }
case "slots":
    out(PrayerPlan.fajrSlots(file(a[2]), now: Double(a[3])!, max: Int(a[4])!).map(slot))
case "reconcile":
    let j = try! JSONSerialization.jsonObject(with: FileManager.default.contents(atPath: a[2])!) as! [String: Any]
    let now = j["now"] as? Double
    let ex = (j["existing"] as! [[String: Any]]).map { e -> PrayerPlan.Existing in
        let at = e["at"] as? Double
        let due = now.map { PrayerPlan.isDue(fixed: e["fixed"] as? Double ?? at, alerting: e["alerting"] as? Bool ?? false, now: $0) } ?? false
        return PrayerPlan.Existing(id: UUID(uuidString: e["id"] as! String)!, at: at, due: due)
    }
    let want = (j["wanted"] as! [[String: Any]]).map { PrayerPlan.Slot(day: $0["day"] as! String, at: $0["at"] as! Double) }
    let d = PrayerPlan.reconcile(existing: ex, wanted: want, keepDue: j["keepDue"] as? Bool ?? false)
    out(["cancel": d.cancel.map(\.uuidString), "add": d.add.map(slot)])
case "id":
    let id = PrayerPlan.alarmID(day: a[2])
    out(["id": id?.uuidString as Any, "ours": id.map(PrayerPlan.isOurs) as Any])
case "signature":
    out(PrayerPlan.alarmSignature(sound: a[2] == "-" ? nil : a[2], soundPresent: a[3] == "1", stop: a[4], title: a[5]))
case "fill":
    out(PrayerPlan.fill(a[2], a[3]))
case "afterStart", "onStop":
    let j = try! JSONSerialization.jsonObject(with: FileManager.default.contents(atPath: a[a[1] == "onStop" ? 3 : 2])!) as! [String: Any]
    let running = (j["running"] as! [[String: Any]]).map { PrayerPlan.Running(id: $0["id"] as! String, kind: PrayerPlan.LockCountdown(rawValue: $0["kind"] as! String)!) }
    if a[1] == "afterStart" {
        out(PrayerPlan.endAfterStart(j["started"] as? String, running: running))
    } else {
        out(PrayerPlan.endOnStop(PrayerPlan.LockCountdown(rawValue: a[2])!, running: running))
    }
default:
    exit(2)
}

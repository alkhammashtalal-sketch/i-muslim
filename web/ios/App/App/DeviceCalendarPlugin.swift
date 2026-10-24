import Capacitor
import EventKit
import Foundation

// «أضف إلى تقويم الجهاز» (reply 0062 §2–§3): the calendar page's events go into the phone's own calendar with
// WRITE-ONLY access (iOS 17 and later; Info.plist NSCalendarsWriteOnlyAccessUsageDescription). Apple, «Accessing the event
// store»: write-only access «lets your app create new events but doesn't let it read any events or other calendar
// information, including events your app created», and «EventKit saves it to a calendar that's chosen by the person».
// This file never reads an event or a calendar and never asks for full access; before iOS 17 there is no write-only
// access, so `available` is false and the page offers nothing. Nothing is sent anywhere. A refused permission is an
// answer (`denied`), not an error. Registered in AppViewController; used by web/src/native/device-calendar.ts.
@objc(DeviceCalendarPlugin)
public class DeviceCalendarPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DeviceCalendarPlugin"
    public let jsName = "DeviceCalendar"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "available", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "add", returnType: CAPPluginReturnPromise)
    ]
    private let store = EKEventStore()

    @objc func available(_ call: CAPPluginCall) {
        if #available(iOS 17.0, *) {
            call.resolve(["available": true])
        } else {
            call.resolve(["available": false])
        }
    }

    @objc func add(_ call: CAPPluginCall) {
        guard #available(iOS 17.0, *) else {
            call.reject("unavailable")
            return
        }
        guard let events = call.getArray("events") as? [JSObject], !events.isEmpty else {
            call.reject("no_events")
            return
        }
        switch EKEventStore.authorizationStatus(for: .event) {
        case .fullAccess, .writeOnly:
            save(events, call)
        case .notDetermined:
            store.requestWriteOnlyAccessToEvents { [weak self] granted, _ in
                DispatchQueue.main.async {
                    guard let self else { return }
                    if granted { self.save(events, call) } else { call.resolve(["added": 0, "denied": true]) }
                }
            }
        default:
            // Denied or restricted: the page says so calmly.
            call.resolve(["added": 0, "denied": true])
        }
    }

    /// A Gregorian day on the phone's calendar, in the phone's time zone, at a time or at its midnight.
    private func date(_ o: JSObject?, hour: Int = 0, minute: Int = 0) -> Date? {
        guard let o, let y = o["y"] as? Int, let m = o["m"] as? Int, let d = o["d"] as? Int else { return nil }
        var c = DateComponents()
        c.calendar = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone.current
        c.year = y
        c.month = m
        c.day = d
        c.hour = hour
        c.minute = minute
        return c.date
    }

    private func save(_ events: [JSObject], _ call: CAPPluginCall) {
        guard let calendar = store.defaultCalendarForNewEvents else {
            call.reject("no_calendar")
            return
        }
        var added = 0
        for o in events {
            let e = EKEvent(eventStore: store)
            e.calendar = calendar
            e.title = o["title"] as? String ?? ""
            e.notes = o["notes"] as? String
            let allDay = o["allDay"] as? Bool ?? true
            let time = o["time"] as? JSObject
            if allDay || time == nil {
                guard let s = date(o["start"] as? JSObject), let t = date(o["end"] as? JSObject) else { continue }
                e.isAllDay = true
                e.startDate = s
                e.endDate = t
            } else {
                guard let s = date(o["start"] as? JSObject, hour: time?["h"] as? Int ?? 0, minute: time?["min"] as? Int ?? 0) else { continue }
                e.startDate = s
                e.endDate = s.addingTimeInterval(3600)
            }
            for offset in (o["alarms"] as? [Any] ?? []).compactMap({ ($0 as? NSNumber)?.doubleValue }) {
                e.addAlarm(EKAlarm(relativeOffset: offset))
            }
            do {
                try store.save(e, span: .thisEvent, commit: false)
                added += 1
            } catch {
                continue
            }
        }
        do {
            try store.commit()
        } catch {
            call.reject("save_failed")
            return
        }
        call.resolve(["added": added])
    }
}

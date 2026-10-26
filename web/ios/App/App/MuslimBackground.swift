import BackgroundTasks
import Foundation
import UIKit

// Keeping «منبّه الفجر» and «عدّاد الصلاة القادمة» right while the app is closed (add-on 0072-add34 §ب6, §ب7): one
// background app refresh (BGAppRefreshTask; Info.plist: UIBackgroundModes «fetch» and BGTaskSchedulerPermittedIdentifiers,
// as Apple's «Using background tasks to update your app» asks, and «Register all of the tasks before the end of the app
// launch sequence»). It sets the next days' alarms again and ends a countdown whose prayer has come. Its time is the
// system's: «the system doesn't guarantee launching the task at the specified date, but only that it won't begin sooner»
// (BGTaskRequest.earliestBeginDate), so the same work runs at every open and whenever the app writes its widgets' data.
// No network, no server.

enum MuslimBackground {
    static let refreshID = "com.alkhammashtalal.imuslim.refresh"

    /// AppDelegate, before the launch ends.
    static func register() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: refreshID, using: nil) { task in
            guard let task = task as? BGAppRefreshTask else { task.setTaskCompleted(success: false); return }
            let work = Task {
                await refresh()
                task.setTaskCompleted(success: true)
            }
            task.expirationHandler = { work.cancel() }
        }
        if #available(iOS 16.2, *) { PrayerCountdownRunner.afterStart = { at in schedule(at: at) } }
        // Every open (the app has scenes, so UIApplicationDelegate's applicationDidBecomeActive is not called; the
        // notification is posted all the same).
        NotificationCenter.default.addObserver(forName: UIApplication.didBecomeActiveNotification, object: nil, queue: .main) { _ in
            Task { await refresh() }
        }
    }

    /// The work itself: the alarms' days ahead, and the end of a countdown whose time has come; then the next refresh.
    static func refresh() async {
        #if canImport(AlarmKit)
        if #available(iOS 26.0, *) { await FajrAlarmScheduler.renew() }
        #endif
        if #available(iOS 16.2, *) { await PrayerCountdownRunner.endPast() }
        schedule()
    }

    /// The app wrote new times (a new place, method, day): set the alarms again from them, at once.
    static func dataChanged() {
        Task { await refresh() }
    }

    /// Ask for the next refresh: at a running countdown's prayer, else in twelve hours, and only while there is
    /// something to keep (the alarm on, or a countdown on the Lock Screen).
    static func schedule(at: Date? = nil) {
        var earliest = at
        var needed = at != nil
        if #available(iOS 16.2, *), let c = PrayerCountdownRunner.current().map({ $0.content.state.at }).min() {
            earliest = min(earliest ?? c, c)
            needed = true
        }
        if FajrAlarmConfig.load().on { needed = true }
        guard needed else { return }
        let r = BGAppRefreshTaskRequest(identifier: refreshID)
        r.earliestBeginDate = max(Date().addingTimeInterval(60), earliest ?? Date().addingTimeInterval(12 * 3600))
        try? BGTaskScheduler.shared.submit(r)
    }
}

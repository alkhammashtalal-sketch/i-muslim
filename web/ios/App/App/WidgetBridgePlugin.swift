import Capacitor
import Foundation
import WidgetKit

// The bridge between the app and its widgets (reply 0046): the app computes the widgets' data
// (web/src/native/widget-data.ts) and writes it here into the App Group shared with the extension MuslimWidgets, then
// asks WidgetKit to read it again; the app reads it back to learn what the tasbih widget counted. The file stays on the
// phone. Registered in AppViewController; used by web/src/native/widget-data.ts.
@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "write", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "read", returnType: CAPPluginReturnPromise)
    ]
    static let group = "group.com.alkhammashtalal.imuslim"
    static let file = "widgets.json"

    private var url: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: Self.group)?.appendingPathComponent(Self.file)
    }

    @objc func write(_ call: CAPPluginCall) {
        guard let json = call.getString("json"), let data = json.data(using: .utf8) else {
            call.reject("no_json")
            return
        }
        guard let url = url else {
            call.reject("no_group")
            return
        }
        do {
            try data.write(to: url, options: .atomic)
        } catch {
            call.reject("write_failed")
            return
        }
        if #available(iOS 14.0, *) { WidgetCenter.shared.reloadAllTimelines() }
        call.resolve()
    }

    @objc func read(_ call: CAPPluginCall) {
        guard let url = url, let data = try? Data(contentsOf: url), let json = String(data: data, encoding: .utf8) else {
            call.resolve(["json": NSNull()])
            return
        }
        call.resolve(["json": json])
    }
}

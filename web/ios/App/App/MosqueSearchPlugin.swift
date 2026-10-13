import Capacitor
import MapKit

// Mosques around, in the iOS app, from Apple Maps on the device (reply 0043 ج): MKLocalSearch for «مسجد» and «mosque»
// in a square of twice the radius around the point the app sends, which is the user's ~1 km cell (web/src/daily/mosques.ts
// cellOf), not the exact position. The search goes from the phone to Apple and never through our server, so Overpass's
// limits do not apply. Results are merged (one per position) and returned with their positions; the app keeps those within
// the radius of the exact position and orders them there. No location permission is asked here. Registered in
// AppViewController; used by web/src/native/mosques.ts.
@objc(MosqueSearchPlugin)
public class MosqueSearchPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MosqueSearchPlugin"
    public let jsName = "MosqueSearch"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "search", returnType: CAPPluginReturnPromise)
    ]

    @objc func search(_ call: CAPPluginCall) {
        guard let lat = call.getDouble("lat"), let lng = call.getDouble("lng"), abs(lat) <= 90, abs(lng) <= 180 else {
            call.reject("bad_point")
            return
        }
        let radius = min(max(call.getDouble("radius") ?? 3000, 500), 10000)
        let queries = ["مسجد", "mosque"]
        let center = CLLocationCoordinate2D(latitude: lat, longitude: lng)
        DispatchQueue.main.async {
            var found: [String: [String: Any]] = [:]
            var failures = 0
            let group = DispatchGroup()
            for q in queries {
                let request = MKLocalSearch.Request()
                request.naturalLanguageQuery = q
                request.region = MKCoordinateRegion(center: center, latitudinalMeters: radius * 2, longitudinalMeters: radius * 2)
                request.resultTypes = .pointOfInterest
                if #available(iOS 18.0, *) { request.regionPriority = .required }
                group.enter()
                MKLocalSearch(request: request).start { response, error in
                    if let items = response?.mapItems {
                        for item in items {
                            let c = item.placemark.coordinate
                            let key = String(format: "%.5f,%.5f", c.latitude, c.longitude)
                            if found[key] == nil {
                                found[key] = ["id": "apple/\(key)", "name": item.name ?? NSNull(), "lat": c.latitude, "lng": c.longitude]
                            }
                        }
                    } else if error != nil {
                        failures += 1
                    }
                    group.leave()
                }
            }
            group.notify(queue: .main) {
                if failures == queries.count {
                    call.reject("search_failed")
                } else {
                    call.resolve(["mosques": Array(found.values)])
                }
            }
        }
    }
}

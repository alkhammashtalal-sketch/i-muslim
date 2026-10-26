import Foundation

// The runner of worker/test/shortcuts-siri-0072.test.ts: compiled on the Mac with web/ios/App/App/SiriAnswers.swift,
//   siri-answers <widgets.json | -> <now in ms> <next | name | nameurl>
// prints what Siri would answer, from that file as the App Group holds it («-»: no file).
let args = CommandLine.arguments
let file = args[1] == "-" ? nil : SiriAnswers.read(FileManager.default.contents(atPath: args[1]))
let now = Date(timeIntervalSince1970: (Double(args[2]) ?? 0) / 1000)
switch args[3] {
case "next": print(SiriAnswers.nextPrayer(file, now: now, noData: "NO-DATA"))
case "name": print(SiriAnswers.nameOfDay(file, now: now, noData: "NO-NAME", title: "TITLE"))
default: print(SiriAnswers.nameURL(file, now: now))
}

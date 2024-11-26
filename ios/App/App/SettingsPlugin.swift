import Foundation
import Capacitor

@objc(SettingsPlugin)
public class SettingsPlugin: CAPPlugin, CAPBridgedPlugin {
  public let identifier = "SettingsPlugin"
  public let jsName = "Settings"
  public let pluginMethods: [CAPPluginMethod] = [
    CAPPluginMethod(name: "load", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise)
  ]

  @objc func load(_ call: CAPPluginCall) {
    do {
      if let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
        let json = try Data(contentsOf: dir.appendingPathComponent("settings.config"))
        let obj = try JSONSerialization.jsonObject(with: json) as? [String: Any]
        call.resolve(obj ?? [:])
        return
      }
    } catch {
      print(error.localizedDescription)
    }
    call.resolve([:])
  }
  
  @objc func save(_ call: CAPPluginCall) {
    do {
      let json = try JSONSerialization.data(withJSONObject: call.getObject("settings") ?? [:], options: [.withoutEscapingSlashes, .prettyPrinted])
      if let dir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first {
        try json.write(to: dir.appendingPathComponent("settings.config"))
      }
    } catch {
      print(error.localizedDescription)
    }
    call.resolve()
  }
}


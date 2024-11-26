import Foundation
import Capacitor
import LocalAuthentication

@objc(MimiriPlatformPlugin)
public class MimiriPlatformPlugin: CAPPlugin, CAPBridgedPlugin {
  public let identifier = "MimiriPlatformPlugin"
  public let jsName = "MimiriPlatform"
  public let pluginMethods: [CAPPluginMethod] = [
    CAPPluginMethod(name: "info", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "verifyBiometry", returnType: CAPPluginReturnPromise)
  ]

  @objc func info(_ call: CAPPluginCall) {
    var result = [:] as [String: Any]
    if UIDevice.current.userInterfaceIdiom == .phone {
      result["mode"] = "phone"
    }
    if UIDevice.current.userInterfaceIdiom == .pad {
      result["mode"] = "tablet"
    }
    if UIDevice.current.userInterfaceIdiom == .tv {
      result["mode"] = "tv"
    }
    if UIDevice.current.userInterfaceIdiom == .carPlay {
      result["mode"] = "carPlay"
    }
    
    let context = LAContext()
    var error: NSError?
    result["biometrics"] = context.canEvaluatePolicy(LAPolicy.deviceOwnerAuthenticationWithBiometrics, error: &error)
    call.resolve(result)
  }
  
  @objc func verifyBiometry(_ call: CAPPluginCall) {
     print("verifyBiometry")
     let context = LAContext()
    var error: NSError?
    if context.canEvaluatePolicy(LAPolicy.deviceOwnerAuthenticationWithBiometrics, error: &error) {
      context.evaluatePolicy(LAPolicy.deviceOwnerAuthenticationWithBiometrics, localizedReason: "Verify Identity")  { (success, evaluateError) in
        call.resolve(["verified": success])
      }
    } else {
      call.resolve(["verified": false])
    }
  }
  
}


import UIKit
import Capacitor

class MimiriViewController: CAPBridgeViewController  {
  override open func capacitorDidLoad() {
    /*
    do {
      try KeyValueStore.standard.delete("serverBasePath")
    } catch {
          }
     */
    bridge?.registerPluginInstance(CachePlugin())
    bridge?.registerPluginInstance(SettingsPlugin())
    bridge?.registerPluginInstance(MimiriUpdatePlugin())
    bridge?.registerPluginInstance(MimiriPlatformPlugin())
    
  }

}

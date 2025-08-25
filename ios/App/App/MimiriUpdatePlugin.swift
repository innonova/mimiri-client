import Foundation
import Capacitor

@objc(MimiriUpdatePlugin)
public class MimiriUpdatePlugin: CAPPlugin, CAPBridgedPlugin {
  private var _bundlesPath = URL(fileURLWithPath: "")
	private var _configPath = URL(fileURLWithPath: "")
	private var _initialized = false
  private var _config: [String: Any] = [:]
  public let identifier = "MimiriUpdatePlugin"
  public let jsName = "MimiriUpdate"
  public let pluginMethods: [CAPPluginMethod] = [
    CAPPluginMethod(name: "getInstalledVersions", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "use", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "delete", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "good", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "activate", returnType: CAPPluginReturnPromise)
	]

  private func ensureConfig() {
    if (!_initialized) {
      _initialized = true;
      do {
        if let dir = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first {
          _bundlesPath = dir.appendingPathComponent("NoCloud/ionic_built_snapshots/")
          if (!FileManager.default.fileExists(atPath: _bundlesPath.path)) {
            try FileManager.default.createDirectory(at: _bundlesPath, withIntermediateDirectories: true)
          }
          _configPath = _bundlesPath.appendingPathComponent("config.json")
          if (FileManager.default.fileExists(atPath: _configPath.path)) {
            let json = try Data(contentsOf: _configPath)
            _config = try JSONSerialization.jsonObject(with: json) as? [String: Any] ?? [ "activeVersion": "base" ]
          } else {
            _config = [ "activeVersion": "base" ]
          }
        }

      } catch {
        print(error.localizedDescription)
      }
    }
  }

  @objc func getInstalledVersions(_ call: CAPPluginCall) {
		ensureConfig()
    var bundles = [[String: Any]]()
    do {
      bundles.append([
        "version": VersionInfo.BaseVersion,
        "hostVersion": VersionInfo.HostVersion,
				"base": true,
				"description": "base",
				"releaseDate": VersionInfo.ReleaseDate,
        "active": _config["activeVersion"] as? String == "base",
        "previous": _config["previousActiveVersion"] as? String == "base",
      ])
      for item in try FileManager.default.contentsOfDirectory(at: _bundlesPath, includingPropertiesForKeys: nil, options: []) {
        let infoPath = item.appendingPathComponent("info.json")
        if (FileManager.default.fileExists(atPath: infoPath.path)) {
          let json = try Data(contentsOf: infoPath)
          var info = try JSONSerialization.jsonObject(with: json) as? [String: Any] ?? [:]
          info["hostVersion"] = VersionInfo.HostVersion
          info["base"] = false
          info["active"] = _config["activeVersion"] as? String == info["version"] as? String
          info["previous"] = _config["previousActiveVersion"]as? String == info["version"] as? String
          bundles.append(info)
        }
      }

    } catch {
      print(error.localizedDescription)
    }
    call.resolve(["bundles": bundles])
  }

  func saveFileRecursive(dir: URL, item: JSObject) throws {
    let name = item["name"] as? String
    let files = item["files"] as? JSArray
    let path = dir.appendingPathComponent(name!)
    if (files != nil) {
      if (!FileManager.default.fileExists(atPath: path.path)) {
        try FileManager.default.createDirectory(at: path, withIntermediateDirectories: true)
      }
      for (_, file) in files!.enumerated() {
        try saveFileRecursive(dir: path, item: file as! JSObject)
      }
    } else {
      if let content = item["content"] as? String {
        if let data = Data(base64Encoded: content.data(using: .utf8)!) {
          let inflated = try data.gunzipped()
          try inflated.write(to: path)
        }
      }
    }
  }

  @objc func save(_ call: CAPPluginCall) {
    ensureConfig();
    do {
      let version = call.getString("version")
      let files = call.getObject("bundle")!["files"] as? JSArray
      if (files != nil) {
        let bundlePath = _bundlesPath.appendingPathComponent(version!)
        if (!FileManager.default.fileExists(atPath: bundlePath.path)) {
          try FileManager.default.createDirectory(at: bundlePath, withIntermediateDirectories: true)
        }
        for (_, file) in files!.enumerated() {
          try saveFileRecursive(dir: _bundlesPath.appendingPathComponent(version!), item: file as! JSObject)
        }
      }
      if var bundle = call.getObject("bundle") {
        let infoPath = _bundlesPath.appendingPathComponent(version!).appendingPathComponent("info.json")
        bundle.removeValue(forKey: "files")
        bundle.removeValue(forKey: "signatures")
        let json = try JSONSerialization.data(withJSONObject: bundle, options: [.withoutEscapingSlashes, .prettyPrinted])
        try json.write(to: infoPath)
      }
    } catch {
      print(error.localizedDescription)
    }

    //print(call.getObject("bundle"))
    call.resolve([:])
  }

  @objc func use(_ call: CAPPluginCall) {
    ensureConfig();
    do {
      let version = call.getString("version")
      let noActivate = call.getBool("noActivate") ?? false
      let activeVersion = _config["activeVersion"] as? String
      if (version != nil && activeVersion != nil && version != activeVersion) {
        _config["previousActiveVersion"] = activeVersion
        _config["activeVersion"] = version
        let json = try JSONSerialization.data(withJSONObject: _config, options: [.withoutEscapingSlashes, .prettyPrinted])
        try json.write(to: _configPath)
        if (version != "base") {
          KeyValueStore.standard["serverBasePath"] = version
        }
      }
			if (version != nil && !noActivate) {
				(self.bridge!.viewController! as? CAPBridgeViewController)!.setServerBasePath(path: _bundlesPath.appendingPathComponent(version!).path)
			}
    } catch {
      print(error.localizedDescription)
    }
    call.resolve([:])
  }

  @objc func activate(_ call: CAPPluginCall) {
    ensureConfig();
    let version = _config["activeVersion"] as? String
    if (version != nil && version != "base") {
      KeyValueStore.standard["serverBasePath"] = version
      (self.bridge!.viewController! as? CAPBridgeViewController)!.setServerBasePath(path: _bundlesPath.appendingPathComponent(version!).path)
    }
    call.resolve([:])
  }

  @objc func delete(_ call: CAPPluginCall) {
    ensureConfig();
    do {
      let version = call.getString("version")
      let activeVersion = _config["activeVersion"] as? String
      if (version != nil && activeVersion != nil && version != activeVersion) {
        try FileManager.default.removeItem(atPath: _bundlesPath.appendingPathComponent(version!).path)
      }
    } catch {
      print(error.localizedDescription)
    }
    call.resolve([:])
  }

  @objc func good(_ call: CAPPluginCall) {
    do {
      let version = call.getString("version")
      let activeVersion = _config["activeVersion"] as? String
      if (version != nil && activeVersion != nil && version == activeVersion) {
      	let infoPath = _bundlesPath.appendingPathComponent(version!).appendingPathComponent("info.json")
          let json = try Data(contentsOf: infoPath)
          var info = try JSONSerialization.jsonObject(with: json) as? [String: Any]
					if (info != nil) {
            info!["good"] = true
            let json = try JSONSerialization.data(withJSONObject: info!, options: [.withoutEscapingSlashes, .prettyPrinted])
            try json.write(to: infoPath)
					}
			}
    } catch {
      print(error.localizedDescription)
    }
    call.resolve([:])
  }
}


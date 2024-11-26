import Capacitor
import SQLite

@objc(CachePlugin)
public class CachePlugin: CAPPlugin, CAPBridgedPlugin {
  public let identifier = "CachePlugin"
  public let jsName = "Cache"
  public let pluginMethods: [CAPPluginMethod] = [
    CAPPluginMethod(name: "getPreLogin", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "getUser", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "setUser", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "deleteUser", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "setUserData", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "getAllKeys", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "setKey", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "deleteKey", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "getNote", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "setNote", returnType: CAPPluginReturnPromise),
    CAPPluginMethod(name: "deleteNote", returnType: CAPPluginReturnPromise)
  ]

  private let dbPath: String

  override init() {
    if let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first {
      dbPath = dir.appendingPathComponent("cache.db").absoluteString
    } else {
      dbPath = ""
    }
    super.init()
    do {
      let db = try Connection(dbPath)
      // print("create db ", dbPath)
      try db.execute("""
          CREATE TABLE IF NOT EXISTS mimer_user (
             id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
             username TEXT NOT NULL UNIQUE,
             data TEXT NOT NULL,
             pre_login TEXT NOT NULL
          );
          """)
      try db.execute("""
          CREATE TABLE IF NOT EXISTS mimer_key (
           id TEXT NOT NULL PRIMARY KEY,
           user_id TEXT NOT NULL,
           data TEXT NOT NULL
          );
          """)
      try db.execute("""
          CREATE TABLE IF NOT EXISTS mimer_note (
          id TEXT NOT NULL PRIMARY KEY,
          data TEXT NOT NULL
          );
          """)
    } catch {
      print(error.localizedDescription)
    }
  }

  @objc func getPreLogin(_ call: CAPPluginCall) {
    let username = call.getString("username")
    do {
      let db = try Connection(dbPath)
      for row in try db.prepare("SELECT pre_login FROM mimer_user WHERE username = ?", username) {
        let preLogin = row[0] as? String
        let data = preLogin!.data(using: .utf8)
        let obj = try JSONSerialization.jsonObject(with: data!) as? [String: Any]
        call.resolve(obj!);
        return
      }
    } catch {
      print(error.localizedDescription)
    }
    call.resolve()
  }

  @objc func getUser(_ call: CAPPluginCall) {
    do {
      let username = call.getString("username")
      let db = try Connection(dbPath)
      for row in try db.prepare("SELECT data FROM mimer_user WHERE username = ?", username) {
        let preLogin = row[0] as? String
        let data = preLogin!.data(using: .utf8)
        let obj = try JSONSerialization.jsonObject(with: data!) as? [String: Any]
        call.resolve(obj!);
        return
      }
    } catch {
      print(error.localizedDescription)
    }
    call.resolve()
  }

  @objc func setUser(_ call: CAPPluginCall) {
    do {
      let username = call.getString("username")
      let data = try String(data: JSONSerialization.data(withJSONObject: call.getObject("data") ?? [:], options: [.withoutEscapingSlashes, .prettyPrinted]), encoding: .utf8)
      let preLogin = try String(data: JSONSerialization.data(withJSONObject: call.getObject("preLogin") ?? [:], options: [.withoutEscapingSlashes, .prettyPrinted]), encoding: .utf8)
      let db = try Connection(dbPath)
      for row in try db.prepare("SELECT data, pre_login FROM mimer_user WHERE username = ?", username) {
        let dataDb = row[0] as? String
        let preLoginDb = row[1] as? String
        if (data == dataDb && preLogin == preLoginDb) {
          call.resolve()
          return
        }
      }
      do {
        try db.run("INSERT INTO mimer_user (username, data, pre_login) VALUES (?, ?, ?)", username, data, preLogin)
      } catch {
        try db.run("UPDATE mimer_user SET data = ?, pre_login = ? WHERE username = ?", data, preLogin, username)
      }
    } catch {
      print(error.localizedDescription)
    }
    call.resolve()
  }

  @objc func deleteUser(_ call: CAPPluginCall) {
    do {
      let username = call.getString("username")
      let db = try Connection(dbPath)
      try db.run("DELETE FROM mimer_user WHERE username = ?", username)
    } catch {
      print(error.localizedDescription)
    }
    call.resolve()
  }

  @objc func setUserData(_ call: CAPPluginCall) {
    do {
      let username = call.getString("username")
      let data = try String(data: JSONSerialization.data(withJSONObject: call.getObject("data") ?? [:], options: [.withoutEscapingSlashes, .prettyPrinted]), encoding: .utf8)
      let db = try Connection(dbPath)
      for row in try db.prepare("SELECT data FROM mimer_user WHERE username = ?", username) {
        let dataDb = row[0] as? String
        if (data == dataDb ) {
          call.resolve()
          return
        }
      }
      try db.run("UPDATE mimer_user SET data = ? WHERE username = ?", data, username)
    } catch {
      print(error.localizedDescription)
    }
    call.resolve()
  }

  @objc func getKey(_ call: CAPPluginCall) {
    do {
      let userId = call.getString("userId")
      let id = call.getString("id")
      let db = try Connection(dbPath)
      for row in try db.prepare("SELECT data FROM mimer_key WHERE user_id = ? AND id = ?", userId, id) {
        let data = row[0] as? String
        let bytes = data!.data(using: .utf8)
        let obj = try JSONSerialization.jsonObject(with: bytes!) as? [String: Any]
        call.resolve(obj!);
        return
      }
    } catch {
      print(error.localizedDescription)
    }
    call.resolve()
  }

  @objc func getAllKeys(_ call: CAPPluginCall) {
    var keys = [[String: Any]]()
    do {
      let username = call.getString("username")
      let db = try Connection(dbPath)
      for row in try db.prepare("SELECT data FROM mimer_key WHERE user_id = ?", username) {
        let data = row[0] as? String
        let bytes = data!.data(using: .utf8)
        let obj = try JSONSerialization.jsonObject(with: bytes!) as? [String: Any]
        keys.append(obj!)
      }
    } catch {
      print(error.localizedDescription)
    }
    call.resolve(["keys": keys])
  }

  @objc func setKey(_ call: CAPPluginCall) {
    do {
      let userId = call.getString("userId")
      let id = call.getString("id")
      let data = try String(data: JSONSerialization.data(withJSONObject: call.getObject("data") ?? [:], options: [.withoutEscapingSlashes, .prettyPrinted]), encoding: .utf8)
      let db = try Connection(dbPath)
      for row in try db.prepare("SELECT data FROM mimer_key WHERE user_id = ? AND id = ?", userId, id) {
        let dataDb = row[0] as? String
        if (data == dataDb) {
          call.resolve()
          return
        }
      }
      do {
        try db.run("INSERT INTO mimer_key (id, user_id, data) VALUES (?, ?, ?)", id, userId, data)
      } catch {
        try db.run("UPDATE mimer_key SET data = ? WHERE user_id = ? AND id = ?", data, userId, id)
      }
    } catch {
      print(error.localizedDescription)
    }
    call.resolve()
  }

  @objc func deleteKey(_ call: CAPPluginCall) {
    do {
      let id = call.getString("id")
      let db = try Connection(dbPath)
      try db.run("DELETE FROM mimer_key WHERE id = ?", id)
    } catch {
      print(error.localizedDescription)
    }
    call.resolve()
  }

  @objc func getNote(_ call: CAPPluginCall) {
    do {
      let id = call.getString("id")
      let db = try Connection(dbPath)
      for row in try db.prepare("SELECT data FROM mimer_note WHERE id = ?", id) {
        let data = row[0] as? String
        let bytes = data!.data(using: .utf8)
        let obj = try JSONSerialization.jsonObject(with: bytes!) as? [String: Any]
        call.resolve(obj!);
        return
      }
    } catch {
      print(error.localizedDescription)
    }
    call.resolve()
  }

  @objc func setNote(_ call: CAPPluginCall) {
    do {
      let id = call.getString("id")
      let data = try String(data: JSONSerialization.data(withJSONObject: call.getObject("data") ?? [:], options: [.withoutEscapingSlashes, .prettyPrinted]), encoding: .utf8)
      let db = try Connection(dbPath)
      for row in try db.prepare("SELECT data FROM mimer_note WHERE id = ?", id) {
        let dataDb = row[0] as? String
        if (data == dataDb) {
          call.resolve()
          return
        }
      }
      do {
        try db.run("INSERT INTO mimer_note (id, data) VALUES (?, ?)", id, data)
      } catch {
        try db.run("UPDATE mimer_note SET data = ? WHERE id = ?", data, id)
      }
    } catch {
      print(error.localizedDescription)
    }
    call.resolve()
  }

  @objc func deleteNote(_ call: CAPPluginCall) {
    do {
      let id = call.getString("id")
      let db = try Connection(dbPath)
      try db.run("DELETE FROM mimer_note WHERE id = ?", id)
    } catch {
      print(error.localizedDescription)
    }
    call.resolve()
  }
}


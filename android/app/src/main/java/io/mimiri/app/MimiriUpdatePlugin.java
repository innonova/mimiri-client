package io.mimiri.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.SharedPreferences;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.Base64;
import java.util.Objects;
import java.util.zip.GZIPInputStream;

@CapacitorPlugin(name = "MimiriUpdate")
public class MimiriUpdatePlugin extends Plugin {
  private boolean _initialized = false;
  private File _bundlesPath;
  private File _configPath;
  private JSObject _config;

  private void init() {
    if (!_initialized) {
      _initialized = true;
      try {
        _bundlesPath = new File(getContext().getFilesDir(), "bundles");
        _configPath = new File(_bundlesPath, "config.json");
        if (_bundlesPath.exists() || _bundlesPath.mkdirs()) {
          if (_configPath.exists()) {
            _config = FileUtil.readJson(_configPath);
          }
        }
        if (_config == null) {
          _config = new JSObject();
          _config.put("activeVersion", "base");
        }
      } catch (Exception e) {
        _bundlesPath = new File("");
        _configPath = new File("");
        System.out.println(e.toString());
      }

    }
  }

  @PluginMethod()
  public void getInstalledVersions(PluginCall call) {
    init();
    JSObject result = new JSObject();
    JSArray bundles = new JSArray();

    JSObject baseBundle = new JSObject();
    bundles.put(baseBundle);
    baseBundle.put("version", VersionInfo.BaseVersion);
    baseBundle.put("hostVersion", VersionInfo.HostVersion);
    baseBundle.put("base", true);
    baseBundle.put("description", "base");
    baseBundle.put("releaseDate", VersionInfo.ReleaseDate);
    baseBundle.put("active", "base".equals(_config.getString("activeVersion")));
    baseBundle.put("previous", "base".equals(_config.getString("previousActiveVersion")));

    for (final File file : Objects.requireNonNull(_bundlesPath.listFiles())) {
      File infoPath =  new File(file, "info.json");
      if (infoPath.exists()) {
        JSObject info = FileUtil.readJson(infoPath);
        if (info != null) {
          String version = info.getString("version", "");
          info.put("hostVersion", VersionInfo.HostVersion);
          info.put("base", false);
          assert version != null;
          info.put("active", version.equals(_config.getString("activeVersion")));
          info.put("previous", version.equals(_config.getString("previousActiveVersion")));
          bundles.put(info);
        }
      }
    }
    result.put("bundles", bundles);
    call.resolve(result);
  }

  private void saveFileRecursive(File dir, JSONObject item) throws JSONException, IOException {
    init();
    File path = new File(dir, item.getString("name"));
    if (item.has("files")) {
      if (path.exists() || path.mkdirs()) {
        JSONArray files = item.getJSONArray("files");
        for (int i = 0; i < files.length(); i++) {
          saveFileRecursive(path, files.getJSONObject(i));
        }
      }
    } else {
      String content = item.getString("content");
      try (GZIPInputStream zipStream = new GZIPInputStream(new ByteArrayInputStream(Base64.getDecoder().decode(content)))) {
        Files.copy(zipStream, path.toPath(), StandardCopyOption.REPLACE_EXISTING);
      }
    }
  }

  @PluginMethod()
  public void save(PluginCall call) {
    init();
    try {
      String version = call.getString("version");
      JSObject bundle = call.getObject("bundle");
      if (version != null && bundle != null) {
        File bundlePath = new File(_bundlesPath, version);
        System.out.println("save " + bundlePath);
        if (bundlePath.exists() || bundlePath.mkdirs()) {
          JSONArray files = bundle.getJSONArray("files");
          for (int i = 0; i < files.length(); i++) {
            saveFileRecursive(bundlePath, files.getJSONObject(i));
          }
        }
        bundle.remove("files");
        bundle.remove("signatures");
        File infoPath = new File(bundlePath, "info.json");
        FileUtil.writeJson(infoPath, bundle);
      }
    } catch (Exception e) {
      System.out.println(e.toString());
    }
    call.resolve();
  }

  @SuppressLint("ApplySharedPref")
  @PluginMethod()
  public void use(PluginCall call) {
    init();
    String version = call.getString("version");
    if (version != null && !version.equals(_config.getString("activeVersion"))) {
      _config.put("previousActiveVersion", _config.getString("activeVersion"));
      _config.put("activeVersion", version);
      FileUtil.writeJson(_configPath, _config);
      String serverBasePath = "";
      if (!version.equals("base")) {
        serverBasePath = new File(_bundlesPath, version).toString();
      }
      System.out.println("use " + serverBasePath);
      SharedPreferences.Editor webViewSettingsEditor = getContext().getSharedPreferences("CapWebViewSettings", Activity.MODE_PRIVATE).edit();
      webViewSettingsEditor.putString("serverBasePath", serverBasePath);
      webViewSettingsEditor.commit();
      getBridge().setServerBasePath(serverBasePath);
      getBridge().reload();
    }
    call.resolve();
  }

  @PluginMethod()
  public void delete(PluginCall call) {
    init();
    String version = call.getString("version");
    if (version != null && !version.equals(_config.getString("activeVersion")) && !version.equals("base")) {
      File versionPath = new File(_bundlesPath, version);
      if (versionPath.exists()) {
        FileUtil.deleteDir(versionPath);
      }
    }
    call.resolve();
  }

  @PluginMethod()
  public void good(PluginCall call) {
    init();
    String version = call.getString("version");
    if (version != null && version.equals(_config.getString("activeVersion")) && !version.equals("base")) {
      File bundlePath = new File(_bundlesPath, version);
      File infoPath = new File(bundlePath, "info.json");
      if (infoPath.exists()) {
        JSObject info = FileUtil.readJson(infoPath);
        if (info != null && Boolean.FALSE.equals(info.getBoolean("good", false))) {
          info.put("good", true);
          FileUtil.writeJson(infoPath, info);
        }
      }
    }
    call.resolve();
  }

}

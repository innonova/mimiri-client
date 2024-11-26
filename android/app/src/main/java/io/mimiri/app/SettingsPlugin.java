package io.mimiri.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.PrintWriter;

@CapacitorPlugin(name = "Settings")
public class SettingsPlugin extends Plugin {

  @PluginMethod()
  public void load(PluginCall call) {
    File file = new File(getContext().getFilesDir().toString(), "settings.config");
    StringBuilder json = new StringBuilder();
    if (file.exists()) {
      try {
        BufferedReader reader = new BufferedReader(new FileReader(file));
        String line = reader.readLine();
        while (line != null) {
          json.append(line);
          line = reader.readLine();
        }
        call.resolve(new JSObject(json.toString()));
        return;
      } catch (Exception e) {
        System.out.println(e.toString());
      }
    }
    call.resolve(new JSObject());
  }

  @PluginMethod()
  public void save(PluginCall call) {
    try {
      try (PrintWriter out = new PrintWriter(new File(getContext().getFilesDir(), "settings.config"))) {
        out.println(call.getObject("settings").toString(2));
      }
    } catch (Exception e) {
      System.out.println(e.toString());
    }
    call.resolve();
  }


}

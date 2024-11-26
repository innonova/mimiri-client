package io.mimiri.app;

import android.content.ClipData;
import android.content.ClipDescription;
import android.content.ClipboardManager;
import android.os.Build;
import android.os.PersistableBundle;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "MimiriClipboard")
public class MimiriClipboardPlugin extends Plugin {
  public static ClipboardManager clipboardManager;

  @PluginMethod()
  public void write(PluginCall call) {
    System.out.println("clipboard write");
    ClipData clip = ClipData.newPlainText("Mimiri Password", call.getString("text"));
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      PersistableBundle extras = new PersistableBundle();
      extras.putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true);
      clip.getDescription().setExtras(extras);
    }
    clipboardManager.setPrimaryClip(clip);
    call.resolve();
  }


}

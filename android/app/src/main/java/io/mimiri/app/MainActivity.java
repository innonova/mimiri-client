package io.mimiri.app;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(CachePlugin.class);
    registerPlugin(SettingsPlugin.class);
    registerPlugin(MimiriClipboardPlugin.class);
    registerPlugin(MimiriUpdatePlugin.class);
    registerPlugin(MimiriPlatformPlugin.class);



    try {
      CachePlugin.database = new MimiriDatabase(this);
      CachePlugin.database.test();
    } catch (Exception e) {
      System.out.println(e.toString());
    }

    super.onCreate(savedInstanceState);
  }


}

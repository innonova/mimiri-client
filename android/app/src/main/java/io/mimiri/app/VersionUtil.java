package io.mimiri.app;


public class VersionUtil {

  public static boolean isGreater(String version, String than) {
    String[] versionItems = version.split("[.\\-]");
    String[] thanItems = than.split("[.\\-]");
    for (int i = 0; i < versionItems.length && i < thanItems.length; i++) {
      String versionItem = versionItems[i];
      String thanItem = thanItems[i];
      try {
        int cmp = Integer.parseInt(versionItem) - Integer.parseInt(thanItem);
        if (cmp > 0) {
          return true;
        }
        if (cmp < 0) {
          return false;
        }
      } catch (NumberFormatException e) {
        int cmp = versionItem.length() - thanItem.length();
        if (cmp == 0) {
          cmp = versionItems[i].compareToIgnoreCase(thanItems[i]);
        }
        if (cmp > 0) {
          return true;
        }
        if (cmp < 0) {
          return false;
        }
      }
    }
    return versionItems.length > thanItems.length;
  }


}

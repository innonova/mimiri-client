package io.mimiri.app;

import com.getcapacitor.JSObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.Objects;

public class FileUtil {

  public static String readAllText(File file) {
    try {
      StringBuilder data = new StringBuilder();
      BufferedReader reader = new BufferedReader(new FileReader(file));
      String line = reader.readLine();
      while (line != null) {
        data.append(line);
        line = reader.readLine();
      }
      return data.toString();
    } catch (Exception e) {
      System.out.println(e.toString());
    }
    return null;
  }

  public static JSObject readJson(File file) {
    try {
      StringBuilder data = new StringBuilder();
      BufferedReader reader = new BufferedReader(new FileReader(file));
      String line = reader.readLine();
      while (line != null) {
        data.append(line);
        line = reader.readLine();
      }
      return new JSObject(data.toString());
    } catch (Exception e) {
      System.out.println(e.toString());
    }
    return null;
  }

  public static void writeJson(File file, JSObject json) {
    try {
      try (PrintWriter out = new PrintWriter(file)) {
        out.println(json.toString(2));
      }
    } catch (Exception e) {
      System.out.println(e.toString());
    }
  }

  private static void recursiveDelete(File dir) {
    try {
      if (dir.isDirectory()) {
        for (File file : Objects.requireNonNull(dir.listFiles())) {
          recursiveDelete(file);
        }
      }
      if (dir.delete()) {
        System.out.println("Failed to delete dir");
      }
    } catch (Exception e) {
      System.out.println(e.toString());
    }
  }
  public static void deleteDir(File dir) {
    recursiveDelete(dir);
  }

}

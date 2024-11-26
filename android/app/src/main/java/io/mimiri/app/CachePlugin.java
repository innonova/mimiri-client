package io.mimiri.app;

import android.content.ContentValues;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONException;

@CapacitorPlugin(name = "Cache")
public class CachePlugin extends Plugin {
  public static MimiriDatabase database;

  @PluginMethod()
  public void getPreLogin(PluginCall call) {
    try {
      //System.out.println("getPreLogin called " + call.getData().toString(2));
      try (SQLiteDatabase db = database.getReadableDatabase()) {
        try (Cursor reader = db.rawQuery("SELECT pre_login FROM mimer_user WHERE username = ?", new String[]{call.getString("username")})) {
          if (reader.moveToFirst()) {
            call.resolve(new JSObject(reader.getString(0)));
            return;
          }
        }
      }
    } catch (Exception e) {
      System.out.println(e.toString());
    }
    call.resolve();
  }

  @PluginMethod()
  public void getUser(PluginCall call) {
    try {
      //System.out.println("getUser called " + call.getData().toString(2));
      try (SQLiteDatabase db = database.getReadableDatabase()) {
        try (Cursor reader = db.rawQuery("SELECT data FROM mimer_user WHERE username = ?", new String[]{call.getString("username")})) {
          if (reader.moveToFirst()) {
            call.resolve(new JSObject(reader.getString(0)));
            return;
          }
        }
      }
    } catch (Exception e) {
      System.out.println(e.toString());
    }
    call.resolve();
  }

  @PluginMethod()
  public void setUser(PluginCall call) {
    try {
      //System.out.println("setUser called " + call.getData().toString(2));
      String username = call.getString("username");
      String data = call.getObject("data").toString();
      String preLogin = call.getObject("preLogin").toString();

      try (SQLiteDatabase db = database.getWritableDatabase()) {
        try (Cursor reader = db.rawQuery("SELECT data, pre_login FROM mimer_user WHERE username = ?", new String[] { username })) {
          if (reader.moveToFirst()) {
            String dataDb = reader.getString(0);
            String preLoginDb = reader.getString(1);
            if (data.equals(dataDb) && preLogin.equals(preLoginDb)) {
              call.resolve();
              return;
            }
          }
        }
        ContentValues values = new ContentValues();
        values.put("data", data);
        values.put("pre_login", preLogin);
        if (db.update("mimer_user", values, "username = ?", new String[]{ username}) == 0) {
          values.put("username", username);
          db.insert("mimer_user", null, values);
        }
      }
    } catch (Exception e) {
      System.out.println(e.toString());
    }
    call.resolve();
  }

  @PluginMethod()
  public void deleteUser(PluginCall call) {
    try {
      //System.out.println("deleteUser called " + call.getData().toString(2));
      String username = call.getString("username");
      try (SQLiteDatabase db = database.getWritableDatabase()) {
        db.delete("mimer_user", "username = ?", new String[]{ username});
      }
    } catch (Exception e) {
      System.out.println(e.toString());
    }
    call.resolve();
  }

  @PluginMethod()
  public void setUserData(PluginCall call) {
    try {
      //System.out.println("setUserData called " + call.getData().toString(2));
      String username = call.getString("username");
      String data = call.getObject("data").toString();
      try (SQLiteDatabase db = database.getWritableDatabase()) {
        ContentValues values = new ContentValues();
        values.put("data", data);
        db.update("mimer_user", values, "username = ?", new String[]{ username});
      }
    } catch (Exception e) {
      System.out.println(e.toString());
    }
    call.resolve();
  }

  @PluginMethod()
  public void getKey(PluginCall call) {
    try {
      //System.out.println("getKey called " + call.getData().toString(2));
      String userId = call.getString("userId");
      String id = call.getString("id");
      try (SQLiteDatabase db = database.getReadableDatabase()) {
        try (Cursor reader = db.rawQuery("SELECT data FROM mimer_key WHERE user_id = ? AND id = ?", new String[] { userId, id })) {
          if (reader.moveToFirst()) {
            call.resolve(new JSObject(reader.getString(0)));
            return;
          }
        }
      }
    } catch (Exception e) {
      System.out.println(e.toString());
    }
    call.resolve();
  }

  @PluginMethod()
  public void getAllKeys(PluginCall call) {
    try {
      //System.out.println("getAllKeys called " + call.getData().toString(2));
      String userId = call.getString("userId");
      JSArray keys = new JSArray();
      try (SQLiteDatabase db = database.getReadableDatabase()) {
        try (Cursor reader = db.rawQuery("SELECT data FROM mimer_key WHERE user_id = ?", new String[] { userId })) {
          if (reader.moveToFirst()) {
            do {
              keys.put(new JSObject(reader.getString(0)));
            }
            while (reader.moveToNext());
          }
        }
      }
      JSObject result = new JSObject();
      result.put("keys", keys);
      call.resolve(result);
    } catch (Exception e) {
      System.out.println(e.toString());
    }
    call.resolve();
  }

  @PluginMethod()
  public void setKey(PluginCall call) {
    try {
      //System.out.println("setKey called " + call.getData().toString(2));
      String userId = call.getString("userId");
      String id = call.getString("id");
      String data = call.getObject("data").toString();

      try (SQLiteDatabase db = database.getWritableDatabase()) {
        try (Cursor reader = db.rawQuery("SELECT data FROM mimer_key WHERE user_id = ? AND id = ?", new String[] { userId, id })) {
          if (reader.moveToFirst()) {
            String dataDb = reader.getString(0);
            if (data.equals(dataDb)) {
              call.resolve();
              return;
            }
          }
        }
        ContentValues values = new ContentValues();
        values.put("data", data);
        if (db.update("mimer_key", values, "user_id = ? AND id = ?", new String[]{ userId, id }) == 0) {
          values.put("user_id", userId);
          values.put("id", id);
          db.insert("mimer_key", null, values);
        }
      }
    } catch (Exception e) {
      System.out.println(e.toString());
    }
    call.resolve();
  }

  @PluginMethod()
  public void deleteKey(PluginCall call) {
    try {
      //System.out.println("deleteKey called " + call.getData().toString(2));
      String id = call.getString("id");
      try (SQLiteDatabase db = database.getWritableDatabase()) {
        db.delete("mimer_key", "id = ?", new String[]{ id });
      }
    } catch (Exception e) {
      System.out.println(e.toString());
    }
    call.resolve();
  }

  @PluginMethod()
  public void getNote(PluginCall call) {
    try {
      //System.out.println("getNote called " + call.getData().toString(2));
      String id = call.getString("id");
      try (SQLiteDatabase db = database.getReadableDatabase()) {
        try (Cursor reader = db.rawQuery("SELECT data FROM mimer_note WHERE id = ?", new String[] { id })) {
          if (reader.moveToFirst()) {
            call.resolve(new JSObject(reader.getString(0)));
            return;
          }
        }
      }
    } catch (Exception e) {
      System.out.println(e.toString());
    }
    call.resolve();
  }

  @PluginMethod()
  public void setNote(PluginCall call) {
    try {
      // System.out.println("setNote called " + call.getData().toString(2));
      String id = call.getString("id");
      String data = call.getObject("data").toString();

      try (SQLiteDatabase db = database.getWritableDatabase()) {
        try (Cursor reader = db.rawQuery("SELECT data FROM mimer_note WHERE id =?", new String[] { id })) {
          if (reader.moveToFirst()) {
            String dataDb = reader.getString(0);
            if (data.equals(dataDb)) {
    					call.resolve();
              return;
            }
          }
        }
        ContentValues values = new ContentValues();
        values.put("data", data);
        if (db.update("mimer_note", values, "id = ?", new String[]{ id }) == 0) {
          values.put("id", id);
          db.insert("mimer_note", null, values);
        }
      }
    } catch (Exception e) {
      System.out.println(e.toString());
    }
    call.resolve();
  }

  @PluginMethod()
  public void deleteNote(PluginCall call) {
    try {
      //System.out.println("deleteNote called " + call.getData().toString(2));
      String id = call.getString("id");
      try (SQLiteDatabase db = database.getWritableDatabase()) {
        db.delete("mimer_note", "id = ?", new String[]{ id });
      }
    } catch (Exception e) {
      System.out.println(e.toString());
    }
    call.resolve();
  }

}

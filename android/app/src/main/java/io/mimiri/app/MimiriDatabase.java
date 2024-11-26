package io.mimiri.app;

import android.content.Context;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;

import androidx.annotation.Nullable;

public class MimiriDatabase extends SQLiteOpenHelper {


  public MimiriDatabase(Context context) {
    super(context, "cache", null, 1);
    System.out.println("MimiriDatabase constructor");
  }

  @Override
  public void onCreate(SQLiteDatabase db) {
    try {
      System.out.println("create database");
      db.execSQL("""
              CREATE TABLE IF NOT EXISTS mimer_user (
                 id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                 username TEXT NOT NULL UNIQUE,
                 data TEXT NOT NULL,
                 pre_login TEXT NOT NULL
              );
              """);

      db.execSQL("""
               CREATE TABLE IF NOT EXISTS mimer_key (
                 id TEXT NOT NULL PRIMARY KEY,
                 user_id TEXT NOT NULL,
                 data TEXT NOT NULL
               );
              """);

      db.execSQL("""
                CREATE TABLE IF NOT EXISTS mimer_note (
                  id TEXT NOT NULL PRIMARY KEY,
                  data TEXT NOT NULL
                );
            """);
    } catch (Exception e) {
      System.out.println(e.toString());
    }
  }

  @Override
  public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {

  }

  public void test() {
    System.out.println("test");
    SQLiteDatabase db = this.getWritableDatabase();
    db.close();
  }
}

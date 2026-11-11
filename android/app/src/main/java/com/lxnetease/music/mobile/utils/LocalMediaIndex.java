package com.lxnetease.music.mobile.utils;

import android.content.Context;
import android.database.Cursor;
import android.os.Build;
import android.provider.MediaStore;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableMap;
import org.json.JSONArray;
import java.io.File;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;

// 只查询已选目录的系统音频索引，不遍历文件或打开音频读取标签。
final class LocalMediaIndex {
  private LocalMediaIndex() {}

  // 把查询放在工作线程，避免媒体库较大时占用 React Native 模块线程。
  static void query(Context context, ReadableArray paths, Promise promise) {
    // 保留用户路径及其规范路径，兼容 /sdcard 等指向共享存储的别名。
    final Map<String, String> roots = new LinkedHashMap<>();
    try {
      for (int index = 0; index < paths.size(); index++) {
        final String path = paths.getString(index);
        if (path != null && path.startsWith("/")) {
          roots.put(path, new File(path).getCanonicalPath());
        }
      }
    } catch (Exception error) {
      promise.reject("MEDIA_INDEX_PATH", "无法解析本地音乐目录", error);
      return;
    }
    new Thread(() -> {
      try {
        // 空目录集合无需读取媒体库；SAF 授权目录由文件列表检查兜底。
        final WritableMap result = Arguments.createMap();
        if (roots.isEmpty()) {
          promise.resolve(result);
          return;
        }
        // 参数化目录过滤，并转义 LIKE 通配符，防止误匹配其他目录。
        final ArrayList<String> arguments = new ArrayList<>();
        final ArrayList<String> clauses = new ArrayList<>();
        for (String root : roots.values()) {
          final String prefix = root.equals("/") ? "/" : root + "/";
          clauses.add(MediaStore.Audio.Media.DATA + " LIKE ? ESCAPE '\\'");
          arguments.add(prefix.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%");
        }
        // 老系统比较标签及文件属性；Android 11 起额外比较媒体记录修订号。
        final ArrayList<String> columns = new ArrayList<>();
        columns.add(MediaStore.Audio.Media.DATA);
        columns.add(MediaStore.Audio.Media._ID);
        columns.add(MediaStore.Audio.Media.SIZE);
        columns.add(MediaStore.Audio.Media.DATE_MODIFIED);
        columns.add(MediaStore.Audio.Media.TITLE);
        columns.add(MediaStore.Audio.Media.ARTIST);
        columns.add(MediaStore.Audio.Media.ALBUM);
        columns.add(MediaStore.Audio.Media.DURATION);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          columns.add(MediaStore.MediaColumns.GENERATION_MODIFIED);
        }
        // 媒体库重建时版本变化，不能沿用旧数据库中的修订号。
        final String version = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q ? MediaStore.getVersion(context) : "legacy";
        try (Cursor cursor = context.getContentResolver().query(
            MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, columns.toArray(new String[0]),
            android.text.TextUtils.join(" OR ", clauses), arguments.toArray(new String[0]), null)) {
          if (cursor == null) throw new IllegalStateException("媒体索引不可用");
          while (cursor.moveToNext()) {
            // 指纹采用 JSON 编码，避免标签中的分隔符造成错误比较。
            final String filePath = cursor.getString(0);
            if (filePath == null || filePath.isEmpty()) throw new IllegalStateException("媒体路径不可用");
            final JSONArray signature = new JSONArray();
            signature.put(version);
            for (int column = 1; column < columns.size(); column++) signature.put(cursor.getString(column));
            for (Map.Entry<String, String> root : roots.entrySet()) {
              final String prefix = root.getValue().equals("/") ? "/" : root.getValue() + "/";
              if (filePath.startsWith(prefix)) {
                final String originalPrefix = root.getKey().equals("/") ? "/" : root.getKey() + "/";
                result.putString(originalPrefix + filePath.substring(prefix.length()), signature.toString());
              }
            }
          }
        }
        promise.resolve(result);
      } catch (Exception error) {
        // 权限丢失或厂商查询失败交给 JS 回退，不能解释为音乐已全部删除。
        promise.reject("MEDIA_INDEX_QUERY", "无法读取系统音频索引", error);
      }
    }, "local-music-index").start();
  }
}

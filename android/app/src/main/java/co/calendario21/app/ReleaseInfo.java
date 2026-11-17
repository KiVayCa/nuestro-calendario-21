package co.calendario21.app;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.json.*;

/** Untrusted remote metadata is validated before any URL reaches the downloader. */
final class ReleaseInfo {
  static final String DOWNLOAD_HOST = "vz4dp1vu2kie6kny.public.blob.vercel-storage.com";
  static final String PACKAGE = "co.calendario21.app";
  static final long MAX_BYTES = 50L * 1024 * 1024;
  final int versionCode;
  final String versionName, apkUrl, sha256;
  final long bytes;
  final List<String> notes;

  private ReleaseInfo(JSONObject json) throws Exception {
    if (json.getInt("format") != 1 || !PACKAGE.equals(json.getString("packageName")))
      throw new IOException("Release format");
    versionCode = json.getInt("versionCode");
    versionName = json.getString("versionName");
    apkUrl = json.getString("apkUrl");
    sha256 = json.getString("sha256").toLowerCase(Locale.ROOT);
    bytes = json.getLong("bytes");
    URI uri = new URI(apkUrl);
    if (versionCode < 1
        || versionName.isEmpty()
        || versionName.length() > 80
        || bytes < 1024
        || bytes > MAX_BYTES
        || !sha256.matches("[a-f0-9]{64}")
        || !"https".equals(uri.getScheme())
        || !DOWNLOAD_HOST.equals(uri.getHost())
        || uri.getPort() != -1
        || uri.getUserInfo() != null
        || uri.getQuery() != null
        || uri.getFragment() != null
        || !uri.getPath().equals("/android/nuestro-calendario-21-v" + versionCode + ".apk"))
      throw new IOException("Invalid release metadata");
    JSONArray list = json.getJSONArray("notes");
    if (list.length() > 12) throw new IOException("Release notes");
    List<String> copy = new ArrayList<>();
    for (int i = 0; i < list.length(); i++) {
      String note = list.getString(i);
      if (note.length() > 500) throw new IOException("Release notes");
      copy.add(note);
    }
    notes = Collections.unmodifiableList(copy);
  }

  static ReleaseInfo parse(String raw) throws Exception {
    return new ReleaseInfo(new JSONObject(raw));
  }

  boolean newerThan(long installed) {
    return versionCode > installed;
  }

  String notesText() {
    return "• " + String.join("\n• ", notes);
  }

  static ReleaseInfo fetch() throws Exception {
    HttpURLConnection c =
        (HttpURLConnection) new URL(MainActivity.ORIGIN + "/android-release.json").openConnection();
    c.setInstanceFollowRedirects(false);
    c.setUseCaches(false);
    c.setConnectTimeout(2200);
    c.setReadTimeout(2200);
    c.setRequestProperty("Cache-Control", "no-cache");
    try {
      if (c.getResponseCode() != 200) throw new IOException("Release unavailable");
      try (InputStream in = c.getInputStream();
          ByteArrayOutputStream out = new ByteArrayOutputStream()) {
        byte[] buffer = new byte[2048];
        int n;
        while ((n = in.read(buffer)) != -1) {
          out.write(buffer, 0, n);
          if (out.size() > 32768) throw new IOException("Release too large");
        }
        return parse(out.toString(StandardCharsets.UTF_8.name()));
      }
    } finally {
      c.disconnect();
    }
  }
}

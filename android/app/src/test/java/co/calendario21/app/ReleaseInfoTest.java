package co.calendario21.app;

import static org.junit.Assert.*;

import org.json.*;
import org.junit.Test;

public class ReleaseInfoTest {
  private JSONObject release() throws Exception {
    return new JSONObject()
        .put("format", 1)
        .put("packageName", ReleaseInfo.PACKAGE)
        .put("versionCode", 4)
        .put("versionName", "1.0.0-preview.4")
        .put(
            "apkUrl",
            "https://" + ReleaseInfo.DOWNLOAD_HOST + "/android/nuestro-calendario-21-v4.apk")
        .put("sha256", "a".repeat(64))
        .put("bytes", 4000000)
        .put("notes", new JSONArray().put("Mejoras de la aplicación"));
  }

  private void reject(JSONObject candidate) throws Exception {
    try {
      ReleaseInfo.parse(candidate.toString());
      fail("Untrusted release accepted");
    } catch (java.io.IOException expected) {
    }
  }

  @Test
  public void offersOnlyStrictlyNewerVersions() throws Exception {
    ReleaseInfo parsed = ReleaseInfo.parse(release().toString());
    assertTrue(parsed.newerThan(3));
    assertFalse(parsed.newerThan(4));
    assertFalse(parsed.newerThan(5));
  }

  @Test
  public void rejectsUnexpectedHostsPathsAndSchemes() throws Exception {
    for (String url :
        new String[] {
          "http://" + ReleaseInfo.DOWNLOAD_HOST + "/android/nuestro-calendario-21-v4.apk",
          "https://evil.example/android/nuestro-calendario-21-v4.apk",
          "https://" + ReleaseInfo.DOWNLOAD_HOST + "/android/nuestro-calendario-21-v3.apk",
          "https://"
              + ReleaseInfo.DOWNLOAD_HOST
              + "/android/nuestro-calendario-21-v4.apk?redirect=https://evil.example",
          "https://user:pass@" + ReleaseInfo.DOWNLOAD_HOST + "/android/nuestro-calendario-21-v4.apk"
        }) reject(release().put("apkUrl", url));
  }

  @Test
  public void rejectsWrongPackageHashAndOversizedFiles() throws Exception {
    reject(release().put("packageName", "other.app"));
    reject(release().put("sha256", "not-a-hash"));
    reject(release().put("bytes", ReleaseInfo.MAX_BYTES + 1));
    reject(release().put("bytes", 0));
  }

  @Test
  public void preservesBoundedReleaseNotes() throws Exception {
    ReleaseInfo parsed = ReleaseInfo.parse(release().toString());
    assertTrue(parsed.notesText().contains("Mejoras"));
    reject(release().put("notes", new JSONArray().put("x".repeat(501))));
  }
}

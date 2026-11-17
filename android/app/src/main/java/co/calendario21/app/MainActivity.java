package co.calendario21.app;

import android.net.Uri;
import android.os.Bundle;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

/** Keeps Chrome's existing web session, service worker, push and download support. */
public class MainActivity extends LauncherActivity {
  static final String ORIGIN = "https://nuestrocalendario21.vercel.app";

  @Override
  protected void onCreate(Bundle state) {
    // Never forward arbitrary URLs into the browser helper.
    Uri uri = getIntent().getData();
    if (uri != null
        && (!"https".equals(uri.getScheme())
            || !"nuestrocalendario21.vercel.app".equals(uri.getHost())
            || uri.getPort() != -1
            || uri.getUserInfo() != null)) getIntent().setData(null);
    WidgetWorker.schedule(this);
    super.onCreate(state);
  }

  @Override
  protected Uri getLaunchingUrl() {
    Uri uri = getIntent().getData();
    return uri != null ? uri : Uri.parse(ORIGIN + "/");
  }
}

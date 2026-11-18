package co.calendario21.app;

import android.net.Uri;
import android.os.Bundle;
import com.google.androidbrowserhelper.trusted.LauncherActivity;

/** Browser-backed calendar preserves the web session, push, service worker and downloads. */
public class CalendarActivity extends LauncherActivity {
  @Override
  protected void onCreate(Bundle state) {
    if (getIntent().getData() != null)
      getIntent().setData(UpdateSupport.safeUrl(getIntent().getData()));
    super.onCreate(state);
    // Widget work must not prevent opening the browser-backed calendar.
    try { WidgetWorker.schedule(this); }
    catch (RuntimeException error) { android.util.Log.w("Calendar21", "Widget sync unavailable", error); }
  }

  @Override
  protected Uri getLaunchingUrl() {
    return UpdateSupport.launchUrl(this, getIntent().getData());
  }
}

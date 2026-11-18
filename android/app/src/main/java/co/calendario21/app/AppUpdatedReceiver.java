package co.calendario21.app;

import android.content.*;
import java.io.File;

public class AppUpdatedReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context c, Intent intent) {
    if (!Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) return;
    if (!c.getSharedPreferences("appearance", 0).getBoolean("theme_sync_v4", false))
      c.getSharedPreferences("appearance", 0)
          .edit()
          .putString("frame", "app")
          .putBoolean("theme_sync_v4", true)
          .apply();
    WidgetRenderer.updateAll(c);
    WidgetWorker.schedule(c);
    File[] files = new File(c.getCacheDir(), "updates").listFiles();
    if (files != null)
      for (File file : files)
        if (file.isFile() && file.getName().startsWith("app-v") && file.getName().endsWith(".apk"))
          file.delete();
  }
}

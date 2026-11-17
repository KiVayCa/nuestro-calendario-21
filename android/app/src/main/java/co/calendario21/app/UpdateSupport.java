package co.calendario21.app;

import android.app.Activity;
import android.content.*;
import android.content.pm.*;
import android.net.Uri;
import android.os.Build;

final class UpdateSupport {
  static PackageInfo installed(Context c) throws PackageManager.NameNotFoundException {
    return c.getPackageManager().getPackageInfo(c.getPackageName(), 0);
  }

  static long code(PackageInfo info) {
    return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode;
  }

  static Uri safeUrl(Uri uri) {
    return uri != null
            && "https".equals(uri.getScheme())
            && "nuestrocalendario21.vercel.app".equals(uri.getHost())
            && uri.getPort() == -1
            && uri.getUserInfo() == null
        ? uri
        : Uri.parse(MainActivity.ORIGIN + "/");
  }

  static void openCalendar(Activity activity, Uri uri) {
    activity.startActivity(
        new Intent(activity, CalendarActivity.class).setData(uri == null ? null : safeUrl(uri)));
    activity.finish();
  }
}

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

  static Uri launchUrl(Activity activity, Uri input) {
    Uri base = safeUrl(input);
    try {
      android.content.pm.PackageInfo info = installed(activity);
      Uri.Builder builder = base.buildUpon().clearQuery();
      for (String key : base.getQueryParameterNames()) {
        if (key.equals("ncAndroidVersion") || key.equals("ncAndroidName")) continue;
        for (String value : base.getQueryParameters(key)) builder.appendQueryParameter(key, value);
      }
      return builder
          .appendQueryParameter("ncAndroidVersion", "" + code(info))
          .appendQueryParameter("ncAndroidName", info.versionName)
          .build();
    } catch (Exception ignored) {
      return base;
    }
  }

  static void openCalendar(Activity activity, Uri uri) {
    activity.startActivity(
        new Intent(activity, WidgetSessionActivity.needed(activity) ? WidgetSessionActivity.class : CalendarActivity.class).setData(uri == null ? null : safeUrl(uri)));
    activity.finish();
  }
}

package co.calendario21.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/** Creates an Android notification whose tap launches the calendar activity directly. */
public final class CalendarMessagingService extends FirebaseMessagingService {
  private static final String CHANNEL_ID = "calendar_updates";

  @Override
  public void onMessageReceived(RemoteMessage message) {
    Map<String, String> data = message.getData();
    if ("widget_refresh".equals(data.get("type"))) {
      WidgetWorker.refresh(this);
      return;
    }
    String tag = data.get("tag");
    if (tag == null || tag.isEmpty()) return;
    WidgetWorker.refresh(this);
    NotificationManagerCompat notifications = NotificationManagerCompat.from(this);
    if (!notifications.areNotificationsEnabled()) return;
    if (Build.VERSION.SDK_INT >= 33 &&
        checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;

    Uri target = UpdateSupport.safeUrl(
        Uri.parse(MainActivity.ORIGIN + data.getOrDefault("url", "/")));
    Intent open = new Intent(this, CalendarActivity.class).setData(target);
    PendingIntent tap = PendingIntent.getActivity(
        this, 0, open, PendingIntent.FLAG_IMMUTABLE);

    getSystemService(NotificationManager.class).createNotificationChannel(
        new NotificationChannel(CHANNEL_ID, "Avisos del calendario",
            NotificationManager.IMPORTANCE_DEFAULT));

    try {
      notifications.notify(tag, 0, new NotificationCompat.Builder(this, CHANNEL_ID)
          .setSmallIcon(R.drawable.ic_notification_heart)
          .setContentTitle(data.getOrDefault("title", "Nuestro Calendario #21"))
          .setContentText(data.getOrDefault("body", "Tienes una novedad en el calendario."))
          .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
          .setContentIntent(tap)
          .setAutoCancel(true)
          .build());
    } catch (SecurityException ignored) {
      // Android can revoke notification permission while the message is being handled.
    }
  }
}

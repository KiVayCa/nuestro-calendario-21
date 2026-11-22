package co.calendario21.app;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.*;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;

public class WidgetWorker extends Worker {
  public WidgetWorker(@NonNull Context c, @NonNull WorkerParameters p) {
    super(c, p);
  }

  private static Constraints constraints() {
    return new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
  }

  static void schedule(Context c) {
    if (!WidgetRenderer.hasWidgets(c)) return;
    WorkManager.getInstance(c)
        .enqueueUniquePeriodicWork(
            "nc21-widget-sync",
            ExistingPeriodicWorkPolicy.KEEP,
            new PeriodicWorkRequest.Builder(WidgetWorker.class, 15, TimeUnit.MINUTES)
                .setConstraints(constraints())
                .build());
    refresh(c);
  }

  static void stopWhenUnused(Context c) {
    if (!WidgetRenderer.hasWidgets(c)) {
      WorkManager.getInstance(c).cancelUniqueWork("nc21-widget-sync");
      WorkManager.getInstance(c).cancelUniqueWork("nc21-widget-now");
    }
  }

  static void refresh(Context c) {
    if (!WidgetRenderer.hasWidgets(c)) return;
    OneTimeWorkRequest.Builder request = new OneTimeWorkRequest.Builder(WidgetWorker.class)
        .setConstraints(constraints());
    if (android.os.Build.VERSION.SDK_INT >= 31)
      request.setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST);
    WorkManager.getInstance(c)
        .enqueueUniqueWork(
            "nc21-widget-now",
            ExistingWorkPolicy.REPLACE,
            request.build());
  }

  static void sync(Context c) throws Exception {
    synchronized (SecureStore.LOCK) {
      JSONObject snapshot = new WidgetApi(c).fetch();
      SecureStore.write(c, "snapshot", snapshot);
    }
  }

  @NonNull
  @Override
  public Result doWork() {
    Context c = getApplicationContext();
    try {
      synchronized (SecureStore.LOCK) {
        if (SecureStore.read(c, "session") == null) {
          WidgetRenderer.updateAll(c);
          return Result.success();
        }
        sync(c);
      }
      WidgetRenderer.updateAll(c);
      return Result.success();
    } catch (WidgetApi.AuthException e) {
      synchronized (SecureStore.LOCK) {
        WidgetSessionActivity.disable(c);
        SecureStore.clear(c);
      }
      WidgetRenderer.updateAll(c);
      return Result.success();
    } catch (Exception e) {
      android.util.Log.w("Calendar21", "Widget refresh failed: " + e.getClass().getSimpleName());
      WidgetRenderer.updateAll(c);
      return getRunAttemptCount() < 3 ? Result.retry() : Result.failure();
    }
  }
}

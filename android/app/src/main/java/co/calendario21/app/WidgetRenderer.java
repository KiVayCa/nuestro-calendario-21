package co.calendario21.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.*;
import android.net.Uri;
import android.widget.RemoteViews;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import org.json.*;

final class WidgetRenderer {
  static final int FLAGS = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;

  static boolean hasWidgets(Context c) {
    AppWidgetManager manager = AppWidgetManager.getInstance(c);
    return manager.getAppWidgetIds(new ComponentName(c, NextPlanWidget.class)).length > 0
        || manager.getAppWidgetIds(new ComponentName(c, CountdownWidget.class)).length > 0;
  }

  static void updateAll(Context c) {
    AppWidgetManager manager = AppWidgetManager.getInstance(c);
    JSONObject snapshot = null;
    // Preferences commit replaces the encrypted value atomically. Never wait for
    // a network refresh lock on the launcher's/UI thread.
    try {
      snapshot = SecureStore.read(c, "snapshot");
    } catch (Exception ignored) {
    }
    for (Class<?> kind : new Class<?>[] {NextPlanWidget.class, CountdownWidget.class})
      for (int id : manager.getAppWidgetIds(new ComponentName(c, kind)))
        render(c, manager, id, kind, snapshot);
  }

  private static void render(
      Context c, AppWidgetManager manager, int id, Class<?> kind, JSONObject snapshot) {
    RemoteViews views = new RemoteViews(c.getPackageName(), R.layout.widget);
    String style = c.getSharedPreferences("appearance", 0).getString("frame", "rose");
    int background =
        style.equals("sage")
            ? R.drawable.widget_sage
            : style.equals("night") ? R.drawable.widget_night : R.drawable.widget_background;
    views.setInt(R.id.widget_root, "setBackgroundResource", background);
    boolean countdown = kind == CountdownWidget.class;
    views.setTextViewText(
        R.id.widget_heading, countdown ? "JUNTOS, HACIA ESE DÍA ♡" : "NUESTRO PRÓXIMO CAPÍTULO ♡");
    String title = "Conecta tu calendario",
        detail = "Toca ⚙ para iniciar sesión",
        url = MainActivity.ORIGIN + "/",
        updated = "Nuestro Calendario #21";
    Instant now = Instant.now();
    if (snapshot != null) {
      long stamp = snapshot.optLong("updated_at");
      // Stop exposing old private data after a day without validating membership.
      if (stamp > 0 && now.toEpochMilli() - stamp < 86400000L) {
        updated =
            "Datos: "
                + Instant.ofEpochMilli(stamp)
                    .atZone(PlanEngine.ZONE)
                    .format(DateTimeFormatter.ofPattern("dd/MM HH:mm"));
        try {
          if (countdown) {
            JSONObject pinned = snapshot.getJSONObject("countdown");
            String date = pinned.optString("countdown_date", "");
            if (date.isEmpty() || date.equals("null")) {
              title = "Una fecha para soñar";
              detail = "Fija una cuenta regresiva en Inicio";
            } else {
              long days = PlanEngine.countdownDays(date, now);
              title =
                  days == 0
                      ? "¡Es hoy!"
                      : days > 0
                          ? "Falta" + (days == 1 ? " 1 día" : "n " + days + " días")
                          : "Hace " + (-days) + (days == -1 ? " día" : " días");
              detail =
                  pinned.optString("countdown_title", "Nuestra fecha especial")
                      + " · "
                      + LocalDate.parse(date).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            }
          } else {
            PlanEngine.Occurrence next = PlanEngine.next(snapshot.getJSONArray("plans"), now);
            if (next == null) {
              title = "Hagamos un nuevo plan";
              detail = "Sin planes pendientes en los próximos dos años";
              url += "?tab=calendar";
            } else {
              title = next.plan.optString("title");
              LocalDate today = now.atZone(PlanEngine.ZONE).toLocalDate();
              detail =
                  (next.date.equals(today)
                      ? "Hoy"
                      : next.date.equals(today.plusDays(1))
                          ? "Mañana"
                          : next.date.format(
                              DateTimeFormatter.ofPattern("EEE d MMM", new Locale("es", "CO"))));
              String time = next.plan.optString("plan_time", "");
              if (!time.isEmpty() && !time.equals("null"))
                detail +=
                    " · " + LocalTime.parse(time).format(DateTimeFormatter.ofPattern("HH:mm"));
              url +=
                  "?tab=calendar&item="
                      + Uri.encode(next.plan.optString("id"))
                      + "&date="
                      + next.date;
            }
          }
        } catch (Exception ignored) {
          title = "Actualicemos el calendario";
          detail = "Toca ↻ para volver a sincronizar";
        }
      } else {
        title = "Actualiza tu calendario";
        detail = "Toca ↻ para recuperar los datos recientes";
        updated = "Última sincronización hace más de un día";
      }
    }
    views.setTextViewText(R.id.widget_title, title);
    views.setTextViewText(R.id.widget_detail, detail);
    views.setTextViewText(R.id.widget_updated, updated);
    views.setOnClickPendingIntent(
        R.id.widget_root,
        PendingIntent.getActivity(
            c, id, new Intent(c, MainActivity.class).setData(Uri.parse(url)), FLAGS));
    views.setOnClickPendingIntent(
        R.id.widget_refresh,
        PendingIntent.getBroadcast(
            c, id, new Intent(c, kind).setAction(NextPlanWidget.REFRESH), FLAGS));
    views.setOnClickPendingIntent(
        R.id.widget_settings,
        PendingIntent.getActivity(
            c,
            id,
            new Intent(c, WidgetSettingsActivity.class)
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id),
            FLAGS));
    manager.updateAppWidget(id, views);
  }
}

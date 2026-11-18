package co.calendario21.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.*;
import android.net.Uri;
import android.os.*;
import android.util.SizeF;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.json.*;

final class WidgetRenderer {
  static final int FLAGS = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
  static final Class<?>[] KINDS = {
    NextPlanWidget.class,
    CountdownWidget.class,
    MonthWidget.class,
    RelationshipWidget.class,
    WeekWidget.class
  };
  private static final Locale ES = new Locale("es", "CO");

  static boolean hasWidgets(Context c) {
    AppWidgetManager manager = AppWidgetManager.getInstance(c);
    for (Class<?> kind : KINDS)
      if (manager.getAppWidgetIds(new ComponentName(c, kind)).length > 0) return true;
    return false;
  }

  static void updateAll(Context c) {
    AppWidgetManager manager = AppWidgetManager.getInstance(c);
    JSONObject snapshot = null;
    try {
      snapshot = SecureStore.read(c, "snapshot");
    } catch (Exception ignored) {
    }
    for (Class<?> kind : KINDS)
      for (int id : manager.getAppWidgetIds(new ComponentName(c, kind))) {
        Bundle options = manager.getAppWidgetOptions(id);
        RemoteViews views = null;
        if (Build.VERSION.SDK_INT >= 31) {
          ArrayList<SizeF> sizes =
              options.getParcelableArrayList(AppWidgetManager.OPTION_APPWIDGET_SIZES);
          if (sizes != null && !sizes.isEmpty() && sizes.size() <= 4) {
            Map<SizeF, RemoteViews> variants = new LinkedHashMap<>();
            for (SizeF size : sizes)
              variants.put(
                  size,
                  build(
                      c,
                      id,
                      kind,
                      snapshot,
                      Math.round(size.getWidth()),
                      Math.round(size.getHeight())));
            views = new RemoteViews(variants);
          }
        }
        if (views == null) {
          int w = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 280);
          int h =
              options.getInt(
                  AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT,
                  kind == MonthWidget.class ? 300 : 180);
          int lw = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH, w);
          int lh = options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT, h);
          views =
              new RemoteViews(
                  build(c, id, kind, snapshot, lw, lh), build(c, id, kind, snapshot, w, h));
        }
        manager.updateAppWidget(id, views);
      }
  }

  private static RemoteViews build(
      Context c, int id, Class<?> kind, JSONObject snapshot, int width, int height) {
    boolean month = kind == MonthWidget.class,
        relationship = kind == RelationshipWidget.class,
        week = kind == WeekWidget.class;
    int layout =
        month
            ? R.layout.widget_month
            : relationship
                ? R.layout.widget_relationship
                : week ? R.layout.widget_week : R.layout.widget;
    RemoteViews views = new RemoteViews(c.getPackageName(), layout);
    SharedPreferences appearance = c.getSharedPreferences("appearance", 0);
    WidgetPalette palette = palette(c, snapshot, appearance.getString("frame", "app"));
    views.setInt(
        R.id.widget_root, "setBackgroundResource", WidgetThemeResources.background(palette.name));
    for (int text :
        new int[] {
          R.id.widget_heading,
          R.id.widget_title,
          R.id.widget_detail,
          R.id.widget_refresh,
          R.id.widget_settings
        }) views.setTextColor(text, palette.ink);
    views.setTextColor(R.id.widget_updated, palette.muted);
    if (relationship)
      for (int text :
          new int[] {
            R.id.together_number, R.id.dating_number, R.id.together_label, R.id.dating_label
          }) views.setTextColor(text, palette.ink);
    if (month) {
      views.setTextColor(R.id.month_previous, palette.ink);
      views.setTextColor(R.id.month_next, palette.ink);
      views.setTextColor(R.id.calendar_agenda, palette.ink);
    }
    String heading =
        month
            ? "NUESTRO MES ♡"
            : relationship
                ? "DOS FECHAS, UNA HISTORIA ♡"
                : week
                    ? "LOS PRÓXIMOS SIETE DÍAS ♡"
                    : kind == CountdownWidget.class
                        ? "JUNTOS, HACIA ESE DÍA ♡"
                        : "NUESTRO PRÓXIMO CAPÍTULO ♡";
    views.setTextViewText(R.id.widget_heading, heading);
    boolean compact = height < 160 || width < 220;
    views.setViewVisibility(
        R.id.widget_heading,
        (compact && !month) || (month && height < 380) ? View.GONE : View.VISIBLE);
    if (month)
      views.setViewVisibility(R.id.widget_detail, height >= 420 ? View.VISIBLE : View.GONE);
    views.setViewPadding(
        R.id.widget_root, dp(c, compact ? 10 : 18), dp(c, 10), dp(c, compact ? 10 : 18), dp(c, 6));
    int chosen = appearance.getInt("text_" + id, 34);
    if (chosen != 28 && chosen != 34 && chosen != 40) chosen = 34;
    views.setTextViewTextSize(
        R.id.widget_title,
        TypedValue.COMPLEX_UNIT_SP,
        month
            ? Math.min(26, chosen)
            : relationship
                ? 18
                : WidgetDates.titleSize(chosen, width, height, kind == CountdownWidget.class));
    views.setInt(R.id.widget_title, "setMaxLines", relationship || month || compact ? 1 : 2);
    if (!week && !month) views.setInt(R.id.widget_detail, "setMaxLines", compact ? 1 : 2);
    views.setViewVisibility(
        R.id.widget_updated, width < 240 || height < 160 ? View.GONE : View.VISIBLE);
    String title = "Abre Nuestro Calendario #21",
        detail = "Los planes aparecerán al abrir la app con tu cuenta.",
        url = MainActivity.ORIGIN + "/",
        updated = "Nuestro Calendario #21";
    Instant now = Instant.now();
    LocalDate today = now.atZone(PlanEngine.ZONE).toLocalDate();
    boolean valid =
        snapshot != null
            && snapshot.optLong("updated_at") > 0
            && now.toEpochMilli() - snapshot.optLong("updated_at") < 86400000L;
    if (relationship) {
      views.setViewVisibility(R.id.relationship_numbers, valid ? View.VISIBLE : View.GONE);
      views.setTextViewTextSize(
          R.id.together_number,
          TypedValue.COMPLEX_UNIT_SP,
          WidgetDates.titleSize(chosen, width, height, true));
      views.setTextViewTextSize(
          R.id.dating_number,
          TypedValue.COMPLEX_UNIT_SP,
          WidgetDates.titleSize(chosen, width, height, true));
    }
    if (valid) {
      updated =
          "Datos: "
              + Instant.ofEpochMilli(snapshot.optLong("updated_at"))
                  .atZone(PlanEngine.ZONE)
                  .format(DateTimeFormatter.ofPattern("dd/MM HH:mm"));
      try {
        JSONArray plans = snapshot.getJSONArray("plans");
        if (relationship) {
          title = "Cada día, tú y yo";
          if (height < 180) views.setViewVisibility(R.id.widget_title, View.GONE);
          views.setTextViewText(
              R.id.together_number, "" + WidgetDates.elapsed(WidgetDates.TOGETHER, now));
          views.setTextViewText(
              R.id.dating_number, "" + WidgetDates.elapsed(WidgetDates.DATING, now));
          detail = "Desde 21 ene · Novios desde 21 abr de 2026";
          if (height < 190) views.setViewVisibility(R.id.widget_detail, View.GONE);
        } else if (month) {
          YearMonth selected =
              YearMonth.from(today).plusMonths(appearance.getInt("month_" + id, 0));
          title = selected.format(DateTimeFormatter.ofPattern("MMMM yyyy", ES));
          JSONArray dates = snapshot.optJSONArray("dates");
          int marked =
              renderMonth(
                  c,
                  views,
                  plans,
                  dates == null ? new JSONArray() : dates,
                  selected,
                  today,
                  width,
                  height,
                  id,
                  palette);
          detail = marked + " días con eventos · Toca el mes para volver a hoy";
          url += "?tab=calendar&date=" + selected.atDay(1);
          monthAction(c, views, id, R.id.month_previous, -1);
          monthAction(c, views, id, R.id.month_next, 1);
          monthAction(c, views, id, R.id.widget_title, 0);
        } else if (week) {
          List<PlanEngine.Occurrence> list = WidgetDates.week(plans, now);
          title =
              list.isEmpty()
                  ? "Tiempo para los dos"
                  : list.size() + (list.size() == 1 ? " plan" : " planes");
          if (list.isEmpty()) detail = "Una semana abierta a nuevos recuerdos. Creemos un plan ♡";
          else {
            StringBuilder lines = new StringBuilder();
            int count = Math.min(height < 230 ? 2 : height < 310 ? 3 : 5, list.size());
            for (int i = 0; i < count; i++) {
              PlanEngine.Occurrence p = list.get(i);
              if (i > 0) lines.append('\n');
              lines.append(
                  p.date.equals(today)
                      ? "Hoy"
                      : p.date.format(DateTimeFormatter.ofPattern("EEE d", ES)));
              String time = p.plan.optString("plan_time", "");
              if (!time.isEmpty() && !time.equals("null"))
                lines
                    .append(" ")
                    .append(LocalTime.parse(time).format(DateTimeFormatter.ofPattern("HH:mm")));
              lines.append(" · ").append(p.plan.optString("title"));
            }
            if (list.size() > count)
              lines.append("\n+").append(list.size() - count).append(" más en el calendario");
            detail = lines.toString();
          }
          views.setInt(R.id.widget_detail, "setMaxLines", height < 230 ? 3 : height < 310 ? 5 : 7);
          views.setTextViewTextSize(
              R.id.widget_detail, TypedValue.COMPLEX_UNIT_SP, width < 240 ? 13 : 15);
          url += "?tab=calendar";
        } else if (kind == CountdownWidget.class) {
          JSONObject pinned = snapshot.getJSONObject("countdown");
          String date = pinned.optString("countdown_date", "");
          if (date.isEmpty() || date.equals("null")) {
            title = "Una fecha para soñar";
            detail = "Fija una cuenta regresiva en Inicio";
          } else {
            long days = PlanEngine.countdownDays(date, now);
            title =
                days == 0 ? "¡Es hoy!" : Math.abs(days) + (Math.abs(days) == 1 ? " día" : " días");
            detail =
                (days < 0 ? "Desde " : "Para ")
                    + pinned.optString("countdown_title", "nuestra fecha especial")
                    + " · "
                    + LocalDate.parse(date).format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
          }
        } else {
          PlanEngine.Occurrence next = PlanEngine.next(plans, now);
          if (next == null) {
            title = "Hagamos un nuevo plan";
            detail = "Sin planes pendientes en los próximos dos años";
            url += "?tab=calendar";
          } else {
            title = next.plan.optString("title");
            detail =
                next.date.equals(today)
                    ? "Hoy"
                    : next.date.equals(today.plusDays(1))
                        ? "Mañana"
                        : next.date.format(DateTimeFormatter.ofPattern("EEE d MMM", ES));
            String time = next.plan.optString("plan_time", "");
            if (!time.isEmpty() && !time.equals("null"))
              detail += " · " + LocalTime.parse(time).format(DateTimeFormatter.ofPattern("HH:mm"));
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
    } else if (snapshot != null) {
      title = "Actualiza tu calendario";
      detail = "Toca ↻ para recuperar los datos recientes";
      updated = "Sincronización pendiente";
    }
    views.setTextViewText(R.id.widget_title, title);
    views.setTextViewText(R.id.widget_detail, detail);
    views.setTextViewText(R.id.widget_updated, updated);
    views.setOnClickPendingIntent(R.id.widget_root, open(c, id, url));
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
    return views;
  }

  private static JSONObject themeDefinitions;

  private static WidgetPalette palette(Context c, JSONObject snapshot, String frame) {
    try {
      if (themeDefinitions == null)
        try (java.io.InputStream in = c.getAssets().open("widget-themes.json")) {
          java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
          byte[] buffer = new byte[4096];
          int n;
          while ((n = in.read(buffer)) != -1) out.write(buffer, 0, n);
          themeDefinitions = new JSONObject(out.toString("UTF-8"));
        }
      JSONObject settings = snapshot == null ? null : snapshot.optJSONObject("appearance");
      return new WidgetPalette(
          themeDefinitions, settings == null ? new JSONObject() : settings, frame);
    } catch (Exception error) {
      throw new IllegalStateException("Widget theme resources are unavailable", error);
    }
  }

  private static int renderMonth(
      Context c,
      RemoteViews views,
      JSONArray plans,
      JSONArray dates,
      YearMonth month,
      LocalDate today,
      int width,
      int height,
      int widgetId,
      WidgetPalette palette)
      throws Exception {
    views.removeAllViews(R.id.calendar_grid);
    RemoteViews header = new RemoteViews(c.getPackageName(), R.layout.calendar_header_row);
    for (String day : new String[] {"L", "M", "X", "J", "V", "S", "D"}) {
      RemoteViews cell = new RemoteViews(c.getPackageName(), R.layout.calendar_header_day);
      cell.setTextViewText(R.id.calendar_day, day);
      cell.setTextColor(R.id.calendar_day, palette.ink);
      header.addView(R.id.calendar_row, cell);
    }
    views.addView(R.id.calendar_grid, header);
    String selectedKey =
        c.getSharedPreferences("appearance", 0).getString("selected_" + widgetId, "");
    LocalDate selected = month.equals(YearMonth.from(today)) ? today : month.atDay(1);
    try {
      LocalDate candidate = LocalDate.parse(selectedKey);
      if (YearMonth.from(candidate).equals(month)) selected = candidate;
    } catch (Exception ignored) {
    }
    int maxEvents = height >= 490 ? 3 : height >= 420 ? 2 : 1;
    LocalDate first = WidgetDates.gridStart(month);
    int marked = 0;
    for (int row = 0; row < 6; row++) {
      RemoteViews line = new RemoteViews(c.getPackageName(), R.layout.calendar_row);
      for (int col = 0; col < 7; col++) {
        LocalDate day = first.plusDays(row * 7L + col);
        boolean inMonth = YearMonth.from(day).equals(month);
        List<WidgetDates.CalendarEntry> entries = WidgetDates.eventsOn(plans, dates, day);
        if (inMonth && !entries.isEmpty()) marked++;
        RemoteViews cell = new RemoteViews(c.getPackageName(), R.layout.calendar_day);
        cell.setTextViewText(R.id.calendar_day, "" + day.getDayOfMonth());
        cell.setTextColor(R.id.calendar_day, inMonth ? palette.ink : palette.muted);
        cell.setContentDescription(
            R.id.calendar_cell,
            day.format(DateTimeFormatter.ofPattern("d 'de' MMMM yyyy", ES))
                + ", "
                + entries.size()
                + " eventos");
        if (day.equals(today) || day.equals(selected))
          cell.setInt(
              R.id.calendar_cell,
              "setBackgroundResource",
              WidgetThemeResources.today(palette.name));
        Intent select =
            new Intent(c, MonthWidget.class)
                .setAction(NextPlanWidget.DAY)
                .setData(Uri.parse("calendario21://calendar/" + widgetId + "/" + day))
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId)
                .putExtra("day", day.toString());
        cell.setOnClickPendingIntent(
            R.id.calendar_cell, PendingIntent.getBroadcast(c, widgetId, select, FLAGS));
        for (int i = 0; i < Math.min(entries.size(), maxEvents); i++) {
          WidgetDates.CalendarEntry entry = entries.get(i);
          RemoteViews chip = new RemoteViews(c.getPackageName(), R.layout.calendar_event);
          String label = (entry.completed ? "✓ " : "") + entry.title;
          if (i == maxEvents - 1 && entries.size() > maxEvents)
            label += " +" + (entries.size() - maxEvents);
          chip.setTextViewText(R.id.calendar_event, label);
          chip.setTextColor(R.id.calendar_event, palette.ink);
          chip.setInt(
              R.id.calendar_event,
              "setBackgroundResource",
              WidgetThemeResources.event(palette.name));
          chip.setContentDescription(
              R.id.calendar_event, entry.title + (entry.time.isEmpty() ? "" : " · " + entry.time));
          String url =
              MainActivity.ORIGIN
                  + "/?tab="
                  + (entry.source.equals("plan") ? "calendar" : "dates")
                  + "&item="
                  + Uri.encode(entry.id)
                  + "&date="
                  + day;
          chip.setOnClickPendingIntent(R.id.calendar_event, open(c, widgetId, url));
          cell.addView(R.id.calendar_events, chip);
        }
        line.addView(R.id.calendar_row, cell);
      }
      views.addView(R.id.calendar_grid, line);
    }
    List<WidgetDates.CalendarEntry> agenda = WidgetDates.eventsOn(plans, dates, selected);
    StringBuilder summary =
        new StringBuilder(selected.format(DateTimeFormatter.ofPattern("EEE d", ES))).append(" · ");
    if (agenda.isEmpty()) summary.append("Sin planes para este día");
    for (int i = 0; i < agenda.size(); i++) {
      if (i > 0) summary.append(" · ");
      WidgetDates.CalendarEntry entry = agenda.get(i);
      if (!entry.time.isEmpty())
        summary
            .append(LocalTime.parse(entry.time).format(DateTimeFormatter.ofPattern("HH:mm")))
            .append(' ');
      summary.append(entry.completed ? "✓ " : "").append(entry.title);
    }
    views.setTextViewText(R.id.calendar_agenda, summary.toString());
    views.setInt(R.id.calendar_agenda, "setMaxLines", height >= 450 ? 3 : height >= 380 ? 2 : 1);
    views.setOnClickPendingIntent(
        R.id.calendar_agenda,
        open(c, widgetId, MainActivity.ORIGIN + "/?tab=calendar&date=" + selected));
    return marked;
  }

  private static void monthAction(Context c, RemoteViews views, int id, int view, int step) {
    Intent intent =
        new Intent(c, MonthWidget.class)
            .setAction(NextPlanWidget.MONTH)
            .setData(Uri.parse("calendario21://month/" + id + "/" + step))
            .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id)
            .putExtra("step", step);
    views.setOnClickPendingIntent(view, PendingIntent.getBroadcast(c, id, intent, FLAGS));
  }

  private static PendingIntent open(Context c, int id, String url) {
    return PendingIntent.getActivity(
        c, id, new Intent(c, MainActivity.class).setData(Uri.parse(url)), FLAGS);
  }

  private static int dp(Context c, int value) {
    return Math.round(value * c.getResources().getDisplayMetrics().density);
  }
}

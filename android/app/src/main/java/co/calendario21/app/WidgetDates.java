package co.calendario21.app;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.json.*;

/** Shared, testable rules for month marks, the weekly agenda and our two milestones. */
final class WidgetDates {
  // These are the same milestones shown on the web home screen.
  static final LocalDate TOGETHER = LocalDate.of(2026, 1, 21);
  static final LocalDate DATING = LocalDate.of(2026, 4, 21);

  static long elapsed(LocalDate since, Instant now) {
    return Math.max(0, ChronoUnit.DAYS.between(since, now.atZone(PlanEngine.ZONE).toLocalDate()));
  }

  static LocalDate gridStart(YearMonth month) {
    LocalDate first = month.atDay(1);
    return first.minusDays(first.getDayOfWeek().getValue() - 1);
  }

  static boolean active(JSONObject p, LocalDate date) {
    return PlanEngine.occurs(p, date)
        && !PlanEngine.contains(p.optJSONArray("cancelled_occurrences"), date.toString());
  }

  static final class CalendarEntry {
    final String id, title, source, time;
    final boolean completed;

    CalendarEntry(String id, String title, String source, String time, boolean completed) {
      this.id = id;
      this.title = title;
      this.source = source;
      this.time = time;
      this.completed = completed;
    }
  }

  private static boolean importantOccurs(JSONObject d, LocalDate day) throws Exception {
    String type = d.optString("recurrence_type", "");
    if (type.equals("null") || type.isEmpty()) type = d.optBoolean("recurring") ? "yearly" : "none";
    if (type.equals("yearly")) {
      LocalDate base = LocalDate.parse(d.getString("event_date"));
      int interval = Math.max(1, d.optInt("recurrence_interval", 1));
      return !day.isBefore(base)
          && (day.getYear() - base.getYear()) % interval == 0
          && LocalDate.of(day.getYear(), base.getMonth(), 1)
              .plusDays(base.getDayOfMonth() - 1)
              .equals(day);
    }
    return PlanEngine.occurs(
        new JSONObject()
            .put("plan_date", d.getString("event_date"))
            .put("recurrence_enabled", !type.equals("none"))
            .put("recurrence_type", type)
            .put("recurrence_interval", d.optInt("recurrence_interval", 1)),
        day);
  }

  static List<CalendarEntry> eventsOn(JSONArray plans, JSONArray dates, LocalDate day)
      throws Exception {
    List<CalendarEntry> out = new ArrayList<>();
    for (int i = 0; i < plans.length(); i++) {
      JSONObject p = plans.getJSONObject(i);
      if (!active(p, day)) continue;
      boolean completed =
          p.optBoolean("recurrence_enabled")
              ? PlanEngine.contains(p.optJSONArray("completed_occurrences"), day.toString())
              : p.optBoolean("completed");
      String time = p.optString("plan_time", "");
      if (time.equals("null")) time = "";
      out.add(new CalendarEntry(p.optString("id"), p.optString("title"), "plan", time, completed));
    }
    for (int i = 0; i < dates.length(); i++) {
      JSONObject d = dates.getJSONObject(i);
      if (importantOccurs(d, day))
        out.add(new CalendarEntry(d.optString("id"), d.optString("title"), "date", "", false));
    }
    out.sort(Comparator.comparing(x -> x.time));
    return out;
  }

  static int marks(JSONArray plans, JSONArray dates, LocalDate day) throws Exception {
    return eventsOn(plans, dates, day).size();
  }

  static List<PlanEngine.Occurrence> week(JSONArray plans, Instant now) throws Exception {
    List<PlanEngine.Occurrence> out = new ArrayList<>();
    LocalDate today = now.atZone(PlanEngine.ZONE).toLocalDate();
    for (int i = 0; i < plans.length(); i++) {
      JSONObject p = plans.getJSONObject(i);
      for (int n = 0; n < 7; n++) {
        LocalDate date = today.plusDays(n);
        boolean completed =
            p.optBoolean("recurrence_enabled")
                ? PlanEngine.contains(p.optJSONArray("completed_occurrences"), date.toString())
                : p.optBoolean("completed");
        if (!active(p, date) || completed) continue;
        String time = p.optString("plan_time", "");
        Instant start =
            date.atTime(
                    time.isEmpty() || time.equals("null") ? LocalTime.MAX : LocalTime.parse(time))
                .atZone(PlanEngine.ZONE)
                .toInstant();
        if (start.isAfter(now)) out.add(new PlanEngine.Occurrence(p, date, start));
      }
    }
    out.sort(Comparator.comparing(x -> x.start));
    return out;
  }

  static int titleSize(int chosen, int width, int height, boolean numeric) {
    int cap = height < 160 ? 28 : width < 220 ? 30 : height >= 230 ? 46 : 38;
    return Math.min(numeric ? cap + 10 : cap, numeric ? chosen + 12 : chosen);
  }
}

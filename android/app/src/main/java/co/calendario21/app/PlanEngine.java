package co.calendario21.app;

import java.time.*;
import java.time.temporal.ChronoUnit;
import org.json.JSONArray;
import org.json.JSONObject;

/** Same recurrence/date rules as src/calendar.js; clock is injected for deterministic tests. */
final class PlanEngine {
  static final ZoneId ZONE = ZoneId.of("America/Bogota");

  static final class Occurrence {
    final JSONObject plan;
    final LocalDate date;
    final Instant start;

    Occurrence(JSONObject p, LocalDate d, Instant s) {
      plan = p;
      date = d;
      start = s;
    }
  }

  static boolean contains(JSONArray values, String key) {
    if (values == null) return false;
    for (int i = 0; i < values.length(); i++) if (key.equals(values.optString(i))) return true;
    return false;
  }

  static boolean occurs(JSONObject p, LocalDate d) {
    LocalDate base = LocalDate.parse(p.optString("plan_date"));
    if (d.isBefore(base)) return false;
    if (contains(p.optJSONArray("skipped_occurrences"), d.toString())) return false;
    String type = p.optString("recurrence_type", "none");
    if (!p.optBoolean("recurrence_enabled") || type.equals("none") || type.equals("null"))
      return d.equals(base);
    String end = p.optString("recurrence_end_date", "");
    if (!end.isEmpty() && !end.equals("null") && d.isAfter(LocalDate.parse(end))) return false;
    int gap = Math.max(1, p.optInt("recurrence_interval", 1));
    long days = ChronoUnit.DAYS.between(base, d);
    long months = ChronoUnit.MONTHS.between(YearMonth.from(base), YearMonth.from(d));
    switch (type) {
      case "daily":
        return days % gap == 0;
      case "weekly":
        JSONArray weekdays = p.optJSONArray("recurrence_days");
        boolean weekday =
            weekdays == null || weekdays.length() == 0
                ? d.getDayOfWeek() == base.getDayOfWeek()
                : contains(weekdays, "" + d.getDayOfWeek().getValue());
        return (days / 7) % gap == 0 && weekday;
      case "monthly":
        return months % gap == 0
            && d.getDayOfMonth() == Math.min(base.getDayOfMonth(), d.lengthOfMonth());
      case "yearly":
        return (d.getYear() - base.getYear()) % gap == 0
            && d.getMonth() == base.getMonth()
            && d.getDayOfMonth() == base.getDayOfMonth();
      default:
        return false;
    }
  }

  static Occurrence next(JSONArray plans, Instant now) {
    LocalDate today = now.atZone(ZONE).toLocalDate();
    Occurrence best = null;
    for (int i = 0; i < plans.length(); i++) {
      JSONObject p = plans.optJSONObject(i);
      if (p == null) continue;
      // Search is bounded to the same 730-day horizon as the web app.
      for (LocalDate d = today; !d.isAfter(today.plusDays(730)); d = d.plusDays(1)) {
        if (best != null && d.isAfter(best.date)) break;
        if (!occurs(p, d) || contains(p.optJSONArray("cancelled_occurrences"), d.toString()))
          continue;
        boolean completed =
            p.optBoolean("recurrence_enabled")
                ? contains(p.optJSONArray("completed_occurrences"), d.toString())
                : p.optBoolean("completed");
        if (completed) continue;
        String time = p.optString("plan_time", "");
        LocalTime local =
            time.isEmpty() || time.equals("null")
                ? LocalTime.of(23, 59, 59, 999000000)
                : LocalTime.parse(time);
        Instant start = d.atTime(local).atZone(ZONE).toInstant();
        if (start.isAfter(now)) {
          if (best == null || start.isBefore(best.start)) best = new Occurrence(p, d, start);
          break;
        }
      }
    }
    return best;
  }

  static long countdownDays(String date, Instant now) {
    return ChronoUnit.DAYS.between(now.atZone(ZONE).toLocalDate(), LocalDate.parse(date));
  }
}

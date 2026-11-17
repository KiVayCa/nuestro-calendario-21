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

  static int marks(JSONArray plans, JSONArray dates, LocalDate day) throws Exception {
    int count = 0;
    for (int i = 0; i < plans.length(); i++) if (active(plans.getJSONObject(i), day)) count++;
    for (int i = 0; i < dates.length(); i++) {
      JSONObject d = dates.getJSONObject(i);
      String type = d.optString("recurrence_type", "");
      if (type.equals("null") || type.isEmpty())
        type = d.optBoolean("recurring") ? "yearly" : "none";
      // Important dates use JS Date's Feb-29 -> Mar-1 annual rollover;
      // plans deliberately use their own strict leap-year recurrence rule.
      if (type.equals("yearly")) {
        LocalDate base = LocalDate.parse(d.getString("event_date"));
        int interval = Math.max(1, d.optInt("recurrence_interval", 1));
        if (!day.isBefore(base)
            && (day.getYear() - base.getYear()) % interval == 0
            && LocalDate.of(day.getYear(), base.getMonth(), 1)
                .plusDays(base.getDayOfMonth() - 1)
                .equals(day)) count++;
        continue;
      }
      JSONObject p =
          new JSONObject()
              .put("plan_date", d.getString("event_date"))
              .put("recurrence_enabled", !type.equals("none"))
              .put("recurrence_type", type)
              .put("recurrence_interval", d.optInt("recurrence_interval", 1));
      if (PlanEngine.occurs(p, day)) count++;
    }
    return count;
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

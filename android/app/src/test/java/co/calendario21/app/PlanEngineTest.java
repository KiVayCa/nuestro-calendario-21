package co.calendario21.app;

import static org.junit.Assert.*;

import java.time.*;
import org.json.*;
import org.junit.Test;

public class PlanEngineTest {
  private JSONObject plan(String id, String day, String time) throws Exception {
    return new JSONObject()
        .put("id", id)
        .put("title", id)
        .put("plan_date", day)
        .put("plan_time", time);
  }

  private Instant now(String local) {
    return LocalDateTime.parse(local).atZone(PlanEngine.ZONE).toInstant();
  }

  @Test
  public void sameDayFutureBeatsTomorrowAndPastIsExcluded() throws Exception {
    JSONArray plans =
        new JSONArray()
            .put(plan("past", "2026-11-17", "12:00:00"))
            .put(plan("tomorrow", "2026-11-18", "09:00:00"))
            .put(plan("today", "2026-11-17", "19:00:00"));
    assertEquals("today", PlanEngine.next(plans, now("2026-11-17T15:00:00")).plan.getString("id"));
    assertEquals(
        "tomorrow", PlanEngine.next(plans, now("2026-11-17T19:00:00")).plan.getString("id"));
  }

  @Test
  public void cancelledCompletedAndRescheduledDatesAreExcluded() throws Exception {
    JSONObject p =
        plan("weekly", "2026-11-03", "18:00:00")
            .put("recurrence_enabled", true)
            .put("recurrence_type", "weekly")
            .put("recurrence_days", new JSONArray("[2]"))
            .put("cancelled_occurrences", new JSONArray("[\"2026-11-17\"]"))
            .put("completed_occurrences", new JSONArray("[\"2026-11-24\"]"))
            .put("skipped_occurrences", new JSONArray("[\"2026-12-01\"]"));
    assertEquals(
        LocalDate.parse("2026-12-08"),
        PlanEngine.next(new JSONArray().put(p), now("2026-11-17T15:00:00")).date);
    p.put("recurrence_end_date", "2026-12-01");
    assertNull(PlanEngine.next(new JSONArray().put(p), now("2026-11-17T15:00:00")));
  }

  @Test
  public void monthlyClampsAndYearlySkipsNonLeapYears() throws Exception {
    JSONObject p =
        plan("month", "2026-01-31", "10:00:00")
            .put("recurrence_enabled", true)
            .put("recurrence_type", "monthly");
    assertTrue(PlanEngine.occurs(p, LocalDate.parse("2026-02-28")));
    assertTrue(PlanEngine.occurs(p, LocalDate.parse("2026-03-31")));
    assertFalse(PlanEngine.occurs(p, LocalDate.parse("2026-03-28")));
    p =
        plan("leap", "2024-02-29", "10:00:00")
            .put("recurrence_enabled", true)
            .put("recurrence_type", "yearly");
    assertFalse(PlanEngine.occurs(p, LocalDate.parse("2026-02-28")));
    assertTrue(PlanEngine.occurs(p, LocalDate.parse("2028-02-29")));
  }

  @Test
  public void intervalAndWeekdayUseBaseDateWeeks() throws Exception {
    JSONObject p =
        plan("church", "2026-11-03", "10:00:00")
            .put("recurrence_enabled", true)
            .put("recurrence_type", "weekly")
            .put("recurrence_interval", 2)
            .put("recurrence_days", new JSONArray("[7]"));
    assertTrue(PlanEngine.occurs(p, LocalDate.parse("2026-11-08")));
    assertFalse(PlanEngine.occurs(p, LocalDate.parse("2026-11-15")));
    assertTrue(PlanEngine.occurs(p, LocalDate.parse("2026-11-22")));
  }

  @Test
  public void undatedTimeStaysTodayUntilMidnightAndCompletedDoesNotAppear() throws Exception {
    JSONObject allDay = plan("day", "2026-11-17", null);
    assertNotNull(PlanEngine.next(new JSONArray().put(allDay), now("2026-11-17T23:00:00")));
    allDay.put("completed", true);
    assertNull(PlanEngine.next(new JSONArray().put(allDay), now("2026-11-17T23:00:00")));
  }

  @Test
  public void countdownUsesBogotaDateAcrossUtcMidnight() {
    assertEquals(1, PlanEngine.countdownDays("2026-11-18", Instant.parse("2026-11-18T02:00:00Z")));
    assertEquals(0, PlanEngine.countdownDays("2026-11-18", Instant.parse("2026-11-18T05:00:00Z")));
  }
}

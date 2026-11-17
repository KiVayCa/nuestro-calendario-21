package co.calendario21.app;

import static org.junit.Assert.*;

import java.time.*;
import java.util.*;
import org.json.*;
import org.junit.Test;

public class WidgetDatesTest {
  private Instant now() {
    return Instant.parse("2026-11-17T20:00:00Z");
  }

  private JSONObject plan(String day, String time) throws Exception {
    return new JSONObject()
        .put("id", day + time)
        .put("title", "Plan")
        .put("plan_date", day)
        .put("plan_time", time);
  }

  @Test
  public void bothMilestonesUseColombiaDayAndNeverGoNegative() {
    assertEquals(300, WidgetDates.elapsed(WidgetDates.TOGETHER, now()));
    assertEquals(210, WidgetDates.elapsed(WidgetDates.DATING, now()));
    assertEquals(
        300, WidgetDates.elapsed(WidgetDates.TOGETHER, Instant.parse("2026-11-18T04:59:59Z")));
    assertEquals(
        301, WidgetDates.elapsed(WidgetDates.TOGETHER, Instant.parse("2026-11-18T05:00:00Z")));
    assertEquals(0, WidgetDates.elapsed(WidgetDates.DATING, Instant.parse("2026-01-01T00:00:00Z")));
  }

  @Test
  public void monthGridIsMondayFirstAndCoversEveryDay() {
    for (int year = 2024; year <= 2028; year++)
      for (int month = 1; month <= 12; month++) {
        YearMonth m = YearMonth.of(year, month);
        LocalDate first = WidgetDates.gridStart(m);
        assertEquals(DayOfWeek.MONDAY, first.getDayOfWeek());
        assertFalse(first.isAfter(m.atDay(1)));
        assertFalse(first.plusDays(41).isBefore(m.atEndOfMonth()));
      }
  }

  @Test
  public void calendarKeepsCompletedButExcludesCancelledAndMovedDates() throws Exception {
    JSONObject completed = plan("2026-11-17", "10:00:00").put("completed", true);
    JSONObject cancelled =
        plan("2026-11-17", "12:00:00")
            .put("cancelled_occurrences", new JSONArray("[\"2026-11-17\"]"));
    JSONObject moved =
        plan("2026-11-10", "12:00:00")
            .put("recurrence_enabled", true)
            .put("recurrence_type", "weekly")
            .put("skipped_occurrences", new JSONArray("[\"2026-11-17\"]"));
    assertEquals(
        1,
        WidgetDates.marks(
            new JSONArray().put(completed).put(cancelled).put(moved),
            new JSONArray(),
            LocalDate.parse("2026-11-17")));
  }

  @Test
  public void importantDatesRepeatWithMonthlyClampingAndIntervals() throws Exception {
    JSONObject d =
        new JSONObject()
            .put("event_date", "2026-01-31")
            .put("recurrence_type", "monthly")
            .put("recurrence_interval", 1);
    assertEquals(
        1,
        WidgetDates.marks(new JSONArray(), new JSONArray().put(d), LocalDate.parse("2026-02-28")));
    d.put("recurrence_interval", 2);
    assertEquals(
        0,
        WidgetDates.marks(new JSONArray(), new JSONArray().put(d), LocalDate.parse("2026-02-28")));
    assertEquals(
        1,
        WidgetDates.marks(new JSONArray(), new JSONArray().put(d), LocalDate.parse("2026-03-31")));
  }

  @Test
  public void weekUsesSevenDaysAndSortsFuturePlansWhileExcludingCompleted() throws Exception {
    JSONArray all =
        new JSONArray()
            .put(plan("2026-11-17", "14:00:00"))
            .put(plan("2026-11-18", "09:00:00"))
            .put(plan("2026-11-17", "17:00:00"))
            .put(plan("2026-11-24", "10:00:00"))
            .put(plan("2026-11-19", "10:00:00").put("completed", true));
    List<PlanEngine.Occurrence> result = WidgetDates.week(all, now());
    assertEquals(2, result.size());
    assertEquals(LocalDate.parse("2026-11-17"), result.get(0).date);
    assertEquals(LocalDate.parse("2026-11-18"), result.get(1).date);
  }

  @Test
  public void importantDateLegacyFlagAndLeapRolloverMatchWeb() throws Exception {
    JSONObject d = new JSONObject().put("event_date", "2024-02-29").put("recurring", true);
    assertEquals(
        1,
        WidgetDates.marks(new JSONArray(), new JSONArray().put(d), LocalDate.parse("2026-03-01")));
    assertEquals(
        0,
        WidgetDates.marks(new JSONArray(), new JSONArray().put(d), LocalDate.parse("2026-02-28")));
    d.put("recurrence_type", "none");
    assertEquals(
        0,
        WidgetDates.marks(new JSONArray(), new JSONArray().put(d), LocalDate.parse("2026-03-01")));
  }

  @Test
  public void primaryTextRemainsLargerAndRespectsCompactSpace() {
    assertTrue(WidgetDates.titleSize(34, 280, 180, false) > 13);
    assertTrue(
        WidgetDates.titleSize(34, 280, 180, true) > WidgetDates.titleSize(34, 280, 180, false));
    assertTrue(WidgetDates.titleSize(40, 180, 130, false) <= 28);
    assertTrue(
        WidgetDates.titleSize(40, 320, 260, false) > WidgetDates.titleSize(28, 320, 260, false));
  }
}

package co.calendario21.app;

import android.appwidget.*;
import android.content.*;
import android.os.Bundle;

public class NextPlanWidget extends AppWidgetProvider {
  static final String REFRESH = "co.calendario21.app.REFRESH";
  static final String MONTH = "co.calendario21.app.MONTH";
  static final String DAY = "co.calendario21.app.DAY";

  @Override
  public void onAppWidgetOptionsChanged(
      Context c, AppWidgetManager manager, int id, Bundle options) {
    WidgetRenderer.updateAll(c);
  }

  @Override
  public void onUpdate(Context c, AppWidgetManager manager, int[] ids) {
    WidgetRenderer.updateAll(c);
    WidgetWorker.schedule(c);
  }

  @Override
  public void onReceive(Context c, Intent i) {
    super.onReceive(c, i);
    if (REFRESH.equals(i.getAction())) {
      WidgetRenderer.updateAll(c);
      WidgetWorker.refresh(c);
    }
    if (MONTH.equals(i.getAction())) {
      int id = i.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, -1);
      if (id < 0) return;
      int old = c.getSharedPreferences("appearance", 0).getInt("month_" + id, 0);
      int step = i.getIntExtra("step", 0);
      int offset = step == 0 ? 0 : Math.max(-24, Math.min(24, old + Integer.signum(step)));
      c.getSharedPreferences("appearance", 0).edit().putInt("month_" + id, offset).apply();
      WidgetRenderer.updateAll(c);
    }
    if (DAY.equals(i.getAction())) {
      int id = i.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, -1);
      try {
        java.time.LocalDate date = java.time.LocalDate.parse(i.getStringExtra("day"));
        long offset =
            java.time.temporal.ChronoUnit.MONTHS.between(
                java.time.YearMonth.now(PlanEngine.ZONE), java.time.YearMonth.from(date));
        if (id < 0 || Math.abs(offset) > 24) return;
        c.getSharedPreferences("appearance", 0)
            .edit()
            .putString("selected_" + id, date.toString())
            .putInt("month_" + id, (int) offset)
            .apply();
        WidgetRenderer.updateAll(c);
      } catch (Exception ignored) {
      }
    }
  }

  @Override
  public void onDeleted(Context c, int[] ids) {
    android.content.SharedPreferences.Editor edit = c.getSharedPreferences("appearance", 0).edit();
    for (int id : ids) {
      edit.remove("month_" + id);
      edit.remove("text_" + id);
      edit.remove("selected_" + id);
    }
    edit.apply();
  }

  @Override
  public void onDisabled(Context c) {
    WidgetWorker.stopWhenUnused(c);
  }
}

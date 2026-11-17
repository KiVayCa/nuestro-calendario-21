package co.calendario21.app;

import android.appwidget.*;
import android.content.*;

public class NextPlanWidget extends AppWidgetProvider {
  static final String REFRESH = "co.calendario21.app.REFRESH";

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
  }

  @Override
  public void onDisabled(Context c) {
    WidgetWorker.stopWhenUnused(c);
  }
}

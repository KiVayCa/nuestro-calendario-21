package co.calendario21.app;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.*;
import java.util.concurrent.*;
import org.json.JSONObject;

public class WidgetLinkActivity extends Activity {
  private final ExecutorService executor = Executors.newSingleThreadExecutor();

  static void begin(Activity activity, int widgetId) {
    try {
      String verifier = WidgetLinkProof.random(32), state = WidgetLinkProof.random(16);
      SecureStore.write(
          activity,
          "widget_pair",
          new JSONObject()
              .put("verifier", verifier)
              .put("state", state)
              .put("created_at", System.currentTimeMillis()));
      Uri url =
          Uri.parse(MainActivity.ORIGIN + "/")
              .buildUpon()
              .appendQueryParameter("tab", "settings")
              .appendQueryParameter("widget_state", state)
              .appendQueryParameter("widget_challenge", WidgetLinkProof.challenge(verifier))
              .build();
      activity.setResult(
          RESULT_OK, new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId));
      activity.startActivity(new Intent(activity, CalendarActivity.class).setData(url));
      activity.finish();
    } catch (Exception error) {
      Toast.makeText(
              activity, "No pudimos iniciar el vínculo. Vuelve a intentarlo.", Toast.LENGTH_LONG)
          .show();
    }
  }

  @Override
  public void onCreate(Bundle state) {
    super.onCreate(state);
    LinearLayout box = new LinearLayout(this);
    box.setOrientation(LinearLayout.VERTICAL);
    int pad = Math.round(24 * getResources().getDisplayMetrics().density);
    box.setPadding(pad, pad * 2, pad, pad);
    setContentView(box);
    TextView status = new TextView(this);
    status.setTextSize(20);
    status.setText("Vinculando tus widgets…");
    box.addView(status);
    Button calendar = new Button(this);
    calendar.setText("Abrir calendario");
    calendar.setOnClickListener(v -> UpdateSupport.openCalendar(this, null));
    box.addView(calendar);
    Uri uri = getIntent().getData();
    if (uri == null
        || !"calendario21".equals(uri.getScheme())
        || !"widget-link".equals(uri.getHost())) {
      status.setText("El vínculo no es válido.");
      return;
    }
    final String code = uri.getQueryParameter("code"),
        returnedState = uri.getQueryParameter("state");
    executor.execute(
        () -> {
          try {
            synchronized (SecureStore.LOCK) {
              JSONObject pending = SecureStore.read(this, "widget_pair");
              if (pending == null
                  || code == null
                  || !code.matches("[a-f0-9]{64}")
                  || !pending.getString("state").equals(returnedState)
                  || System.currentTimeMillis() - pending.getLong("created_at") > 600000)
                throw new IllegalStateException("Expired link");
              JSONObject device =
                  new WidgetApi(this).claimLink(code, pending.getString("verifier"), returnedState);
              new WidgetApi(this).disconnect();
              SecureStore.write(this, "session", device);
              try {
                WidgetWorker.sync(this);
              } catch (Exception retryLater) {
                WidgetWorker.refresh(this);
              }
            }
            WidgetWorker.schedule(this);
            WidgetRenderer.updateAll(this);
            runOnUiThread(
                () -> {
                  if (!isDestroyed())
                    status.setText(
                        "¡Widgets vinculados! ♡\nYa usan la cuenta abierta en tu calendario.");
                });
          } catch (Exception error) {
            runOnUiThread(
                () -> {
                  if (!isDestroyed())
                    status.setText(
                        "El vínculo venció o no corresponde a este dispositivo. Abre ⚙ en el widget"
                            + " y vuelve a vincularlo desde la app.");
                });
          }
        });
  }

  @Override
  protected void onDestroy() {
    executor.shutdown();
    super.onDestroy();
  }
}

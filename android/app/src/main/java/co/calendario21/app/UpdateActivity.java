package co.calendario21.app;

import android.app.Activity;
import android.content.pm.PackageInfo;
import android.os.Bundle;
import android.widget.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Reports the published version without requesting package installation. */
public class UpdateActivity extends Activity {
  private final ExecutorService executor = Executors.newSingleThreadExecutor();
  private TextView status, notes;
  private Button check;
  private boolean busy;

  @Override
  public void onCreate(Bundle state) {
    super.onCreate(state);
    ScrollView scroll = new ScrollView(this);
    LinearLayout box = new LinearLayout(this);
    box.setOrientation(LinearLayout.VERTICAL);
    int pad = Math.round(24 * getResources().getDisplayMetrics().density);
    box.setPadding(pad, pad * 2, pad, pad);
    scroll.addView(box);
    setContentView(scroll);
    TextView title = new TextView(this);
    title.setText("Nuestro calendario, al día ♡");
    title.setTextSize(26);
    box.addView(title);
    status = new TextView(this);
    status.setTextSize(17);
    status.setPadding(0, pad, 0, pad);
    box.addView(status);
    notes = new TextView(this);
    notes.setTextSize(16);
    notes.setPadding(0, 0, 0, pad);
    box.addView(notes);
    check = button(box, "Buscar actualizaciones", v -> refresh());
    button(
        box,
        "Abrir calendario",
        v -> {
          if (!busy) UpdateSupport.openCalendar(this, getIntent().getData());
        });
    refresh();
  }

  private Button button(
      LinearLayout parent, String label, android.view.View.OnClickListener listener) {
    Button b = new Button(this);
    b.setText(label);
    b.setOnClickListener(listener);
    parent.addView(b);
    return b;
  }

  private void refresh() {
    if (busy) return;
    busy = true;
    check.setEnabled(false);
    status.setText("Buscando actualizaciones…");
    executor.execute(
        () -> {
          try {
            ReleaseInfo latest = ReleaseInfo.fetch();
            PackageInfo current = UpdateSupport.installed(this);
            boolean newer = latest.newerThan(UpdateSupport.code(current));
            runOnUiThread(
                () -> {
                  if (isDestroyed()) return;
                  busy = false;
                  check.setEnabled(true);
                  status.setText(
                      "Instalada: "
                          + current.versionName
                          + "\n"
                          + (newer
                              ? "Disponible: " + latest.versionName
                              : "Ya tienes una versión actualizada."));
                  notes.setText(latest.notesText());
                });
          } catch (Exception error) {
            uiError("No pudimos comprobar la versión. Revisa tu conexión e inténtalo de nuevo.");
          }
        });
  }

  private void uiError(String message) {
    runOnUiThread(
        () -> {
          if (isDestroyed()) return;
          busy = false;
          check.setEnabled(true);
          status.setText(message);
        });
  }

  @Override
  protected void onDestroy() {
    executor.shutdown();
    super.onDestroy();
  }
}

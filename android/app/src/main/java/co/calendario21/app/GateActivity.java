package co.calendario21.app;

import android.app.*;
import android.content.Intent;
import android.os.Bundle;
import android.view.Gravity;
import android.widget.*;
import java.util.concurrent.*;

/** Checks release availability when a widget opens the calendar. */
public class GateActivity extends Activity {
  private final ExecutorService executor = Executors.newSingleThreadExecutor();

  @Override
  public void onCreate(Bundle state) {
    super.onCreate(state);
    LinearLayout box = new LinearLayout(this);
    box.setOrientation(LinearLayout.VERTICAL);
    box.setGravity(Gravity.CENTER);
    box.setPadding(24, 24, 24, 24);
    box.addView(new ProgressBar(this));
    TextView label = new TextView(this);
    label.setText("Abriendo nuestro calendario…");
    label.setTextSize(18);
    label.setGravity(Gravity.CENTER);
    box.addView(label);
    setContentView(box);
    executor.execute(
        () -> {
          ReleaseInfo release = null;
          try {
            ReleaseInfo candidate = ReleaseInfo.fetch();
            if (candidate.newerThan(UpdateSupport.code(UpdateSupport.installed(this))))
              release = candidate;
          } catch (Exception ignored) {
          }
          final ReleaseInfo latest = release;
          runOnUiThread(
              () -> {
                if (isFinishing() || isDestroyed()) return;
                if (latest == null) {
                  open();
                  return;
                }
                new AlertDialog.Builder(this)
                    .setTitle("Hay una actualización ♡")
                    .setMessage(
                        "Nuestro Calendario #21 · "
                            + latest.versionName
                            + "\n\n"
                            + latest.notesText()
                            + "\n\nPuedes actualizar conservando tu sesión y tus widgets.")
                    .setPositiveButton(
                        "Ver versión",
                        (dialog, which) -> {
                          startActivity(
                              new Intent(this, UpdateActivity.class)
                                  .setData(UpdateSupport.safeUrl(getIntent().getData())));
                          finish();
                        })
                    .setNegativeButton("Más tarde", (dialog, which) -> open())
                    .setOnCancelListener(dialog -> open())
                    .show();
              });
        });
  }

  private void open() {
    UpdateSupport.openCalendar(this, getIntent().getData());
  }

  @Override
  protected void onDestroy() {
    executor.shutdown();
    super.onDestroy();
  }
}

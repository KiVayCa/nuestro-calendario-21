package co.calendario21.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.app.NotificationManagerCompat;
import com.google.firebase.messaging.FirebaseMessaging;
import org.json.JSONObject;

public final class PushLinkActivity extends Activity {
  private TextView status;

  @Override
  protected void onCreate(Bundle savedState) {
    super.onCreate(savedState);
    LinearLayout box = new LinearLayout(this);
    box.setOrientation(LinearLayout.VERTICAL);
    box.setPadding(32, 72, 32, 32);
    status = new TextView(this);
    status.setText("Configurando notificaciones Android…");
    box.addView(status);
    Button home = new Button(this);
    home.setText("Volver al calendario");
    home.setOnClickListener(view -> openCalendar(null));
    box.addView(home);
    setContentView(box);

    Uri link = getIntent().getData();
    if (link == null || !link.isHierarchical() || !"calendario21".equals(link.getScheme())
        || !"push-link".equals(link.getHost())) {
      status.setText("El enlace no es válido.");
      return;
    }
    if (link.getQueryParameter("code") != null) {
      claim(link.getQueryParameter("code"), link.getQueryParameter("state"));
    } else if (Build.VERSION.SDK_INT >= 33 &&
        checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
      requestPermissions(new String[] {Manifest.permission.POST_NOTIFICATIONS}, 1);
    } else {
      begin();
    }
  }

  @Override
  public void onRequestPermissionsResult(int request, String[] permissions, int[] results) {
    super.onRequestPermissionsResult(request, permissions, results);
    if (request == 1) begin();
  }

  private void begin() {
    if (!NotificationManagerCompat.from(this).areNotificationsEnabled()) {
      status.setText("Activa las notificaciones del calendario en Ajustes de Android.");
      return;
    }
    try {
      String verifier = WidgetLinkProof.random(32);
      String state = WidgetLinkProof.random(16);
      SecureStore.write(this, "push_pair", new JSONObject().put("verifier", verifier)
          .put("state", state).put("created_at", System.currentTimeMillis()));
      openCalendar(Uri.parse(MainActivity.ORIGIN + "/").buildUpon()
          .appendQueryParameter("tab", "settings")
          .appendQueryParameter("push_challenge", WidgetLinkProof.challenge(verifier))
          .appendQueryParameter("push_state", state).build());
    } catch (Exception error) {
      failed();
    }
  }

  private void claim(String code, String state) {
    try {
      JSONObject pending = SecureStore.read(this, "push_pair");
      if (pending == null || !code.matches("[a-f0-9]{64}") ||
          !pending.getString("state").equals(state) ||
          System.currentTimeMillis() - pending.getLong("created_at") > 600000) {
        failed();
        return;
      }
      FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
        if (!task.isSuccessful()) {
          failed();
          return;
        }
        new Thread(() -> {
          boolean linked;
          try {
            linked = new WidgetApi(this).claimPushDevice(
                code, pending.getString("verifier"), state, task.getResult());
          } catch (Exception error) {
            linked = false;
          }
          boolean registered = linked;
          runOnUiThread(() -> {
            if (isFinishing() || isDestroyed()) return;
            if (registered) status.setText("Este teléfono ya está vinculado para recibir avisos.");
            else failed();
          });
        }, "push-link").start();
      });
    } catch (Exception error) {
      failed();
    }
  }

  private void failed() {
    status.setText("No pudimos vincular el teléfono. Vuelve a intentarlo desde Configuración.");
  }

  private void openCalendar(Uri target) {
    startActivity(new Intent(this, CalendarActivity.class).setData(target));
    finish();
  }
}

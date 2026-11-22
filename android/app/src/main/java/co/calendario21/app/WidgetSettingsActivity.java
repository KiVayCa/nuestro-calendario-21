package co.calendario21.app;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.graphics.Color;
import android.os.Bundle;
import android.text.InputType;
import android.view.View;
import android.widget.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class WidgetSettingsActivity extends Activity {
  private final ExecutorService executor = Executors.newSingleThreadExecutor();
  private EditText email, password;
  private TextView status;
  private Button connect;
  private int widgetId;
  private boolean busy;

  @Override
  public void onCreate(Bundle state) {
    super.onCreate(state);
    setResult(RESULT_CANCELED);
    widgetId =
        getIntent()
            .getIntExtra(
                AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
    ScrollView scroll = new ScrollView(this);
    LinearLayout box = new LinearLayout(this);
    box.setOrientation(LinearLayout.VERTICAL);
    int pad = (int) (24 * getResources().getDisplayMetrics().density);
    box.setPadding(pad, pad * 2, pad, pad);
    scroll.addView(box);
    setContentView(scroll);
    text(box, "Nuestros días, más cerca ♡", 25);
    text(
        box,
        "Conecta los widgets con tu cuenta de Nuestro Calendario #21. Puedes vincularlos usando la"
            + " sesión abierta en la app. El permiso de lectura de los widgets es independiente de"
            + " la del calendario web. Tu contraseña no se guarda.",
        16);
    button(
        box,
        "Vincular desde la app · sin contraseña",
        v -> {
          if (!busy) WidgetLinkActivity.begin(this, widgetId);
        });
    LinearLayout credentials = new LinearLayout(this);
    credentials.setOrientation(LinearLayout.VERTICAL);
    credentials.setVisibility(View.GONE);
    button(
        box,
        "Usar correo y contraseña (opcional)",
        v ->
            credentials.setVisibility(
                credentials.getVisibility() == View.GONE ? View.VISIBLE : View.GONE));
    box.addView(credentials);
    email = new EditText(this);
    email.setHint("Correo electrónico");
    email.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS);
    email.setSingleLine(true);
    credentials.addView(email);
    password = new EditText(this);
    password.setHint("Contraseña");
    password.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
    password.setSingleLine(true);
    password.setSaveEnabled(false);
    credentials.addView(password);
    text(box, "Marco para tus widgets", 16);
    Spinner frame = new Spinner(this);
    frame.setAdapter(
        new ArrayAdapter<>(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            new String[] {"Igual que la app", "Rosa romántico", "Noche azul", "Verde salvia"}));
    String[] frames = {"app", "rose", "night", "sage"};
    String current = getSharedPreferences("appearance", 0).getString("frame", "app");
    for (int i = 0; i < frames.length; i++) if (frames[i].equals(current)) frame.setSelection(i);
    box.addView(frame);
    text(box, "Texto principal de este widget", 16);
    Spinner textSize = new Spinner(this);
    textSize.setAdapter(
        new ArrayAdapter<>(
            this,
            android.R.layout.simple_spinner_dropdown_item,
            new String[] {"Destacado", "Grande", "Extra grande"}));
    int[] sizes = {28, 34, 40};
    int selectedSize = getSharedPreferences("appearance", 0).getInt("text_" + widgetId, 34);
    for (int i = 0; i < sizes.length; i++) if (sizes[i] == selectedSize) textSize.setSelection(i);
    box.addView(textSize);
    text(
        box,
        "Para cambiar el tamaño de la tarjeta: mantén pulsado el widget en Inicio y arrastra sus"
            + " bordes. El texto se adapta al espacio. En Nuestro mes, toca el nombre del mes para"
            + " volver a hoy.",
        14);
    status = new TextView(this);
    status.setPadding(0, pad, 0, pad);
    box.addView(status);
    connect =
        button(
            credentials,
            "Conectar con correo",
            v -> {
              if (busy) return;
              final String address = email.getText().toString().trim(),
                  secret = password.getText().toString();
              if (address.isEmpty() || secret.isEmpty()) {
                status.setText("Escribe tu correo y contraseña.");
                return;
              }
              busy = true;
              connect.setEnabled(false);
              password.setText("");
              status.setText("Conectando de forma segura…");
              executor.execute(
                  () -> {
                    Exception failure = null;
                    try {
                      synchronized (SecureStore.LOCK) {
                        new WidgetApi(this).login(address, secret);
                        WidgetWorker.sync(this);
                      }
                    } catch (Exception e) {
                      failure = e;
                      if (e instanceof WidgetApi.AuthException)
                        synchronized (SecureStore.LOCK) {
                          new WidgetApi(this).disconnect();
                        }
                    }
                    final Exception result = failure;
                    runOnUiThread(
                        () -> {
                          if (isFinishing() || isDestroyed()) return;
                          busy = false;
                          connect.setEnabled(true);
                          WidgetRenderer.updateAll(this);
                          if (result != null)
                            status.setText(
                                result instanceof WidgetApi.LoginException
                                    ? "No pudimos iniciar sesión. Revisa tus datos y la conexión."
                                    : result instanceof WidgetApi.AuthException
                                        ? "Tu cuenta necesita un calendario compartido activo."
                                        : "No pudimos sincronizar. Comprueba tu conexión e"
                                            + " inténtalo de nuevo.");
                          else {
                            saveFrame(frames[frame.getSelectedItemPosition()]);
                            saveTextSize(sizes[textSize.getSelectedItemPosition()]);
                            WidgetWorker.schedule(this);
                            finishSetup();
                          }
                        });
                  });
            });
    button(
        box,
        "Guardar diseño / usar sesión existente",
        v -> {
          if (busy) return;
          boolean loggedIn = false;
          try {
            loggedIn = SecureStore.read(this, "session") != null;
          } catch (Exception ignored) {
          }
          if (!loggedIn) {
            status.setText("Primero conecta tu cuenta para mostrar tus planes.");
            return;
          }
          saveFrame(frames[frame.getSelectedItemPosition()]);
          saveTextSize(sizes[textSize.getSelectedItemPosition()]);
          WidgetWorker.schedule(this);
          finishSetup();
        });
    button(
        box,
        "Actualizaciones de Android",
        v -> startActivity(new Intent(this, UpdateActivity.class)));
    button(
        box,
        "Desconectar los widgets",
        v -> {
          if (busy) return;
          busy = true;
          WidgetSessionActivity.disable(this);
          status.setText("Desconectando…");
          executor.execute(
              () -> {
                synchronized (SecureStore.LOCK) {
                  new WidgetApi(this).disconnect();
                }
                runOnUiThread(
                    () -> {
                      if (isDestroyed()) return;
                      busy = false;
                      WidgetRenderer.updateAll(this);
                      status.setText(
                          "Widgets desconectados. La sesión del calendario web continúa"
                              + " independiente.");
                    });
              });
        });
    text(
        box,
        "Después de guardar: mantén pulsada la pantalla de inicio → Widgets → Nuestro Calendario"
            + " #21. Elige cualquiera de los ocho widgets, incluidos Nuestro día, Próxima fecha"
            + " especial y Balance del mes. Toca ⚙ para volver aquí.",
        15);
    text(
        box,
        "Android decide cuándo ejecutar las actualizaciones en segundo plano. Puedes tocar ↻ para"
            + " solicitar una actualización. Los datos muestran su hora de sincronización y se"
            + " ocultan tras 24 horas sin validar el acceso. El marco y la cuenta se comparten"
            + " entre tus widgets.",
        14);
  }

  private void saveFrame(String frame) {
    getSharedPreferences("appearance", 0).edit().putString("frame", frame).apply();
    WidgetRenderer.updateAll(this);
  }

  private void saveTextSize(int size) {
    getSharedPreferences("appearance", 0).edit().putInt("text_" + widgetId, size).apply();
    WidgetRenderer.updateAll(this);
  }

  private void finishSetup() {
    setResult(RESULT_OK, new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId));
    WidgetRenderer.updateAll(this);
    finish();
  }

  private TextView text(LinearLayout box, String value, int size) {
    TextView text = new TextView(this);
    text.setText(value);
    text.setTextColor(Color.rgb(48, 36, 47));
    text.setTextSize(size);
    text.setPadding(0, 12, 0, 12);
    box.addView(text);
    return text;
  }

  private Button button(LinearLayout box, String label, View.OnClickListener action) {
    Button button = new Button(this);
    button.setText(label);
    button.setOnClickListener(action);
    box.addView(button);
    return button;
  }

  @Override
  protected void onDestroy() {
    executor.shutdown();
    super.onDestroy();
  }
}

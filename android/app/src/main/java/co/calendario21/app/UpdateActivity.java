package co.calendario21.app;

import android.app.Activity;
import android.content.*;
import android.content.pm.*;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.widget.*;
import androidx.core.content.FileProvider;
import java.io.*;
import java.net.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;

/** Downloads only validated releases; Android always owns the installation confirmation. */
public class UpdateActivity extends Activity {
  private final ExecutorService executor = Executors.newSingleThreadExecutor();
  private TextView status, notes;
  private Button action, check;
  private ReleaseInfo release;
  private File verifiedApk;
  private boolean awaitingPermission, busy;

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
    action =
        button(
            box,
            "Descargar e instalar",
            v -> {
              if (verifiedApk != null) install();
              else download();
            });
    action.setEnabled(false);
    check = button(box, "Buscar actualizaciones", v -> refresh());
    button(
        box,
        "Abrir calendario",
        v -> {
          if (!busy) UpdateSupport.openCalendar(this, getIntent().getData());
        });
    TextView help = new TextView(this);
    help.setText(
        "La actualización mantiene tu cuenta, tus datos y tus widgets. Android te pedirá confirmar"
            + " la instalación y, la primera vez, permitir instalaciones desde Nuestro Calendario"
            + " #21.");
    help.setTextSize(14);
    help.setPadding(0, pad, 0, 0);
    box.addView(help);
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
    release = null;
    verifiedApk = null;
    busy = true;
    check.setEnabled(false);
    action.setEnabled(false);
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
                  release = latest;
                  verifiedApk = null;
                  status.setText(
                      "Instalada: "
                          + current.versionName
                          + "\n"
                          + (newer
                              ? "Disponible: " + latest.versionName
                              : "Ya tienes una versión actualizada."));
                  notes.setText(latest.notesText());
                  action.setText("Descargar e instalar");
                  action.setEnabled(newer);
                });
          } catch (Exception error) {
            uiError("No pudimos comprobar la versión. Revisa tu conexión e inténtalo de nuevo.");
          }
        });
  }

  private void download() {
    if (busy || release == null) return;
    busy = true;
    action.setEnabled(false);
    check.setEnabled(false);
    status.setText("Descargando actualización…");
    final ReleaseInfo target = release;
    executor.execute(
        () -> {
          File file = null;
          HttpURLConnection connection = null;
          try {
            File folder = new File(getCacheDir(), "updates");
            if (!folder.isDirectory() && !folder.mkdirs()) throw new IOException("Storage");
            file = File.createTempFile("app-v" + target.versionCode + "-", ".apk", folder);
            connection = (HttpURLConnection) new URL(target.apkUrl).openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(20000);
            connection.setUseCaches(false);
            if (connection.getResponseCode() != 200) throw new IOException("Download");
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            long total = 0;
            int old = -1;
            try (InputStream in = connection.getInputStream();
                OutputStream out = new FileOutputStream(file)) {
              byte[] bytes = new byte[32768];
              int count;
              while ((count = in.read(bytes)) != -1) {
                total += count;
                if (total > target.bytes || total > ReleaseInfo.MAX_BYTES)
                  throw new IOException("Size");
                out.write(bytes, 0, count);
                digest.update(bytes, 0, count);
                int progress = (int) (100 * total / target.bytes);
                if (progress / 10 != old) {
                  old = progress / 10;
                  final int value = progress;
                  runOnUiThread(
                      () -> {
                        if (!isDestroyed())
                          status.setText("Descargando actualización… " + value + " %");
                      });
                }
              }
            }
            if (total != target.bytes || !hex(digest.digest()).equals(target.sha256))
              throw new IOException("Integrity");
            verifyArchive(file, target);
            final File ready = file;
            runOnUiThread(
                () -> {
                  if (isDestroyed()) return;
                  busy = false;
                  check.setEnabled(true);
                  verifiedApk = ready;
                  action.setText("Instalar actualización");
                  action.setEnabled(true);
                  status.setText("Descarga verificada. Lista para instalar.");
                  install();
                });
          } catch (Exception error) {
            if (file != null) file.delete();
            uiError(
                "No pudimos descargar o verificar el APK. Vuelve a intentarlo; no se instaló ningún"
                    + " archivo.");
          } finally {
            if (connection != null) connection.disconnect();
          }
        });
  }

  private void verifyArchive(File file, ReleaseInfo target) throws Exception {
    int flags =
        Build.VERSION.SDK_INT >= 28
            ? PackageManager.GET_SIGNING_CERTIFICATES
            : PackageManager.GET_SIGNATURES;
    PackageInfo archive = getPackageManager().getPackageArchiveInfo(file.getAbsolutePath(), flags);
    PackageInfo installed = getPackageManager().getPackageInfo(getPackageName(), flags);
    if (archive == null
        || !getPackageName().equals(archive.packageName)
        || UpdateSupport.code(archive) != target.versionCode
        || !target.newerThan(UpdateSupport.code(installed))
        || !signers(archive).equals(signers(installed))) throw new IOException("APK identity");
  }

  private Set<String> signers(PackageInfo info) throws Exception {
    Signature[] signatures =
        Build.VERSION.SDK_INT >= 28 && info.signingInfo != null
            ? info.signingInfo.getApkContentsSigners()
            : info.signatures;
    if (signatures == null || signatures.length == 0) throw new IOException("Signature missing");
    Set<String> result = new HashSet<>();
    for (Signature s : signatures)
      result.add(hex(MessageDigest.getInstance("SHA-256").digest(s.toByteArray())));
    return result;
  }

  static String hex(byte[] bytes) {
    StringBuilder out = new StringBuilder();
    for (byte b : bytes) out.append(String.format(Locale.ROOT, "%02x", b & 255));
    return out.toString();
  }

  private void install() {
    if (busy || verifiedApk == null || release == null) return;
    if (!getPackageManager().canRequestPackageInstalls()) {
      awaitingPermission = true;
      status.setText(
          "Permite instalar actualizaciones desde Nuestro Calendario #21 y vuelve aquí.");
      startActivity(
          new Intent(
              Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
              Uri.parse("package:" + getPackageName())));
      return;
    }
    try {
      // Re-check identity immediately before granting the installer read access.
      verifyArchive(verifiedApk, release);
      Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".updates", verifiedApk);
      startActivity(
          new Intent(Intent.ACTION_VIEW)
              .setDataAndType(uri, "application/vnd.android.package-archive")
              .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));
    } catch (Exception error) {
      status.setText("No pudimos abrir el instalador. Busca de nuevo la actualización.");
    }
  }

  @Override
  protected void onResume() {
    super.onResume();
    if (awaitingPermission) {
      awaitingPermission = false;
      if (getPackageManager().canRequestPackageInstalls()) install();
      else
        status.setText(
            "La instalación necesita tu permiso. Puedes pulsar Instalar actualización para"
                + " intentarlo otra vez.");
    }
  }

  private void uiError(String message) {
    runOnUiThread(
        () -> {
          if (isDestroyed()) return;
          busy = false;
          check.setEnabled(true);
          action.setEnabled(release != null);
          status.setText(message);
        });
  }

  @Override
  protected void onDestroy() {
    executor.shutdown();
    super.onDestroy();
  }
}

package co.calendario21.app;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONObject;

/** Tokens and private widget data never live in plaintext preferences or Android backup. */
final class SecureStore {
  static final Object LOCK = new Object();
  private static final String KEY = "nc21_widget_session";

  private static synchronized SecretKey key() throws Exception {
    KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
    ks.load(null);
    if (!ks.containsAlias(KEY)) {
      KeyGenerator generator =
          KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
      generator.init(
          new KeyGenParameterSpec.Builder(
                  KEY, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
              .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
              .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
              .build());
      generator.generateKey();
    }
    return (SecretKey) ks.getKey(KEY, null);
  }

  static JSONObject read(Context c, String name) throws Exception {
    String raw = c.getSharedPreferences("widgets", 0).getString(name, null);
    if (raw == null) return null;
    String[] parts = raw.split(":");
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(
        Cipher.DECRYPT_MODE,
        key(),
        new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
    return new JSONObject(
        new String(
            cipher.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)),
            java.nio.charset.StandardCharsets.UTF_8));
  }

  static void write(Context c, String name, JSONObject value) throws Exception {
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
    cipher.init(Cipher.ENCRYPT_MODE, key());
    String encoded =
        Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP)
            + ":"
            + Base64.encodeToString(
                cipher.doFinal(value.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8)),
                Base64.NO_WRAP);
    if (!c.getSharedPreferences("widgets", 0).edit().putString(name, encoded).commit())
      throw new java.io.IOException("storage");
  }

  static void clear(Context c) {
    c.getSharedPreferences("widgets", 0).edit().remove("session").remove("snapshot").commit();
  }
}

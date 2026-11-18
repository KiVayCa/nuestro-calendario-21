package co.calendario21.app;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.Locale;

/** A code returned through a deep link is usable only by the app that created this verifier. */
final class WidgetLinkProof {
  static String random(int bytes) {
    byte[] value = new byte[bytes];
    new SecureRandom().nextBytes(value);
    return hex(value);
  }

  static String challenge(String verifier) throws Exception {
    return hex(
        MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.UTF_8)));
  }

  private static String hex(byte[] value) {
    StringBuilder s = new StringBuilder();
    for (byte b : value) s.append(String.format(Locale.ROOT, "%02x", b & 255));
    return s.toString();
  }
}

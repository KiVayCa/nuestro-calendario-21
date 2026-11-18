package co.calendario21.app;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import androidx.browser.customtabs.*;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;
import org.json.JSONObject;

/** Opens the signed-in calendar and pairs widgets through its origin-verified browser port. */
public class WidgetSessionActivity extends Activity {
  private static final Uri ORIGIN = Uri.parse(MainActivity.ORIGIN);
  private final Handler handler = new Handler(Looper.getMainLooper());
  private CustomTabsSession session;
  private boolean bound, launched, validated, loaded, requested, claiming;
  private String verifier, state;

  static boolean needed(Context context) {
    if (context.getSharedPreferences("appearance", 0).getBoolean("widgetLinkDisabled", false))
      return false;
    try { return SecureStore.read(context, "session") == null; }
    catch (Exception unavailable) { return false; }
  }

  static void disable(Context context) {
    context.getSharedPreferences("appearance", 0).edit().putBoolean("widgetLinkDisabled", true).commit();
  }

  private final CustomTabsCallback callback = new CustomTabsCallback() {
    @Override public void onRelationshipValidationResult(int relation, Uri origin, boolean ok, Bundle extras) {
      if (relation == CustomTabsService.RELATION_USE_AS_ORIGIN && ORIGIN.equals(origin)) {
        validated = ok;
        requestChannel();
      }
    }

    @Override public void onNavigationEvent(int event, Bundle extras) {
      if (event == NAVIGATION_STARTED) {
        loaded = false;
        requested = false;
      } else if (event == NAVIGATION_FINISHED) {
        loaded = true;
        requestChannel();
      }
    }

    @Override public void onMessageChannelReady(Bundle extras) {
      try {
        String message = new JSONObject().put("type", "nc21-widget-link")
            .put("state", state).put("challenge", WidgetLinkProof.challenge(verifier)).toString();
        session.postMessage(message, null);
      } catch (Exception ignored) { /* Retry on next launch. */ }
    }

    @Override public void onPostMessage(String message, Bundle extras) {
      if (!validated || claiming || message == null || message.length() > 512) return;
      try {
        JSONObject reply = new JSONObject(message);
        String code = reply.getString("code");
        if (!state.equals(reply.getString("state")) || !code.matches("[a-f0-9]{64}")) return;
        claiming = true;
        new Thread(() -> claim(code), "widget-link").start();
      } catch (Exception ignored) { /* Ignore unrelated browser messages. */ }
    }
  };

  private void requestChannel() {
    if (session != null && loaded && validated && !requested)
      requested = session.requestPostMessageChannel(ORIGIN, ORIGIN, new Bundle());
  }

  private void claim(String code) {
    try {
      synchronized (SecureStore.LOCK) {
        if (!needed(this)) return;
        JSONObject grant = new WidgetApi(this).claimLink(code, verifier, state);
        SecureStore.write(this, "session", grant);
      }
      WidgetWorker.schedule(this);
    } catch (Exception ignored) { /* Opening the calendar again retries a failed exchange. */ }
  }

  private final CustomTabsServiceConnection connection = new CustomTabsServiceConnection() {
    @Override public void onCustomTabsServiceConnected(ComponentName name, CustomTabsClient client) {
      if (isFinishing() || isDestroyed() || launched) return;
      client.warmup(0);
      session = client.newSession(callback);
      if (session == null) { fallback(); return; }
      session.validateRelationship(CustomTabsService.RELATION_USE_AS_ORIGIN, ORIGIN, null);
      Uri destination = UpdateSupport.launchUrl(WidgetSessionActivity.this, getIntent().getData());
      TrustedWebActivityIntentBuilder builder = new TrustedWebActivityIntentBuilder(destination);
      builder.setToolbarColor(getColor(R.color.rose));
      builder.setNavigationBarColor(getColor(R.color.night));
      Intent browser = builder.build(session).getIntent();
      launched = true;
      try { startActivityForResult(browser, 1); }
      catch (RuntimeException unavailable) { launched = false; fallback(); }
    }

    @Override public void onServiceDisconnected(ComponentName name) { session = null; }
  };

  @Override public void onCreate(Bundle saved) {
    super.onCreate(saved);
    if (saved != null) { finish(); return; }
    verifier = WidgetLinkProof.random(32);
    state = WidgetLinkProof.random(16);
    String provider = CustomTabsClient.getPackageName(this, null);
    if (provider != null) bound = CustomTabsClient.bindCustomTabsService(this, provider, connection);
    if (!bound) fallback();
    else handler.postDelayed(this::fallback, 3500);
  }

  private void fallback() {
    if (launched || isFinishing() || isDestroyed()) return;
    startActivity(new Intent(this, CalendarActivity.class).setData(UpdateSupport.safeUrl(getIntent().getData())));
    finish();
  }

  @Override protected void onActivityResult(int request, int result, Intent data) {
    super.onActivityResult(request, result, data);
    if (request == 1) finish();
  }

  @Override protected void onDestroy() {
    handler.removeCallbacksAndMessages(null);
    if (bound) unbindService(connection);
    super.onDestroy();
  }
}

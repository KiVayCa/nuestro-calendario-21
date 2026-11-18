package co.calendario21.app;

import android.content.Context;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import org.json.*;

final class WidgetApi {
  private final Context context;
  private static final String BACKEND = "https://vmvfcdtohzdhqatxhxdb.supabase.co";
  private String apiKey;
  private JSONObject session;

  static final class AuthException extends IOException {}

  static final class LoginException extends IOException {}

  WidgetApi(Context context) {
    this.context = context;
  }

  private JSONObject config() throws Exception {
    JSONObject config =
        new JSONObject(request(MainActivity.ORIGIN + "/api/config", "GET", null, null, null));
    if (!BACKEND.equals(config.optString("supabaseUrl")))
      throw new IOException("Unexpected environment");
    apiKey = config.getString("supabaseKey");
    return config;
  }

  private static String request(
      String url, String method, JSONObject body, String key, String token) throws Exception {
    HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
    connection.setInstanceFollowRedirects(false);
    connection.setConnectTimeout(12000);
    connection.setReadTimeout(15000);
    connection.setRequestMethod(method);
    connection.setRequestProperty("Accept", "application/json");
    if (key != null) connection.setRequestProperty("apikey", key);
    if (token != null) connection.setRequestProperty("Authorization", "Bearer " + token);
    try {
      if (body != null) {
        connection.setDoOutput(true);
        connection.setRequestProperty("Content-Type", "application/json");
        try (OutputStream stream = connection.getOutputStream()) {
          stream.write(body.toString().getBytes(StandardCharsets.UTF_8));
        }
      }
      int status = connection.getResponseCode();
      if (status == 401 || status == 403) throw new AuthException();
      if (status < 200 || status >= 300) throw new IOException("HTTP " + status);
      try (InputStream stream = connection.getInputStream();
          ByteArrayOutputStream out = new ByteArrayOutputStream()) {
        byte[] bytes = new byte[8192];
        int n;
        while ((n = stream.read(bytes)) != -1) {
          out.write(bytes, 0, n);
          if (out.size() > 6_000_000) throw new IOException("Response too large");
        }
        return out.toString(StandardCharsets.UTF_8.name());
      }
    } finally {
      connection.disconnect();
    }
  }

  void login(String email, String password) throws Exception {
    config();
    try {
      session =
          new JSONObject(
              request(
                  BACKEND + "/auth/v1/token?grant_type=password",
                  "POST",
                  new JSONObject().put("email", email).put("password", password),
                  apiKey,
                  null));
    } catch (IOException error) {
      throw new LoginException();
    }
    session.put("saved_at", System.currentTimeMillis());
    // Cache belongs to the previous account until a successful fresh fetch.
    SecureStore.clear(context);
    SecureStore.write(context, "session", session);
  }

  private JSONArray rows(String table, String query) throws Exception {
    JSONArray all = new JSONArray();
    for (int offset = 0; offset < 50000; offset += 500) {
      JSONArray page =
          new JSONArray(
              request(
                  BACKEND + "/rest/v1/" + table + "?" + query + "&limit=500&offset=" + offset,
                  "GET",
                  null,
                  apiKey,
                  session.getString("access_token")));
      for (int i = 0; i < page.length(); i++) all.put(page.get(i));
      if (page.length() < 500) return all;
    }
    throw new IOException("Pagination limit reached");
  }

  JSONObject fetch() throws Exception {
    config();
    session = SecureStore.read(context, "session");
    if (session == null) throw new AuthException();
    if ("device".equals(session.optString("kind"))) {
      String raw =
          request(
              BACKEND + "/rest/v1/rpc/read_widget_snapshot",
              "POST",
              new JSONObject().put("p_token", session.getString("device_token")),
              apiKey,
              null);
      if (raw.trim().equals("null")) throw new AuthException();
      JSONObject data = new JSONObject(raw);
      return buildSnapshot(
          data.getJSONArray("plans"), data.getJSONArray("settings"), data.getJSONArray("dates"));
    }
    long expires =
        session.optLong(
            "expires_at", session.optLong("saved_at") / 1000 + session.optLong("expires_in", 3600));
    if (expires < System.currentTimeMillis() / 1000 + 120) {
      try {
        session =
            new JSONObject(
                request(
                    BACKEND + "/auth/v1/token?grant_type=refresh_token",
                    "POST",
                    new JSONObject().put("refresh_token", session.getString("refresh_token")),
                    apiKey,
                    null));
      } catch (IOException error) {
        // Refresh rejection is terminal; temporary network errors preserve the session.
        if (error instanceof AuthException
            || error.getMessage() != null && error.getMessage().equals("HTTP 400"))
          throw new AuthException();
        throw error;
      }
      session.put("saved_at", System.currentTimeMillis());
      SecureStore.write(context, "session", session);
    }
    String user = session.getJSONObject("user").getString("id");
    JSONArray members =
        rows("couple_members", "select=couple_id&user_id=eq." + user + "&order=couple_id");
    if (members.length() == 0) throw new AuthException();
    // The web app currently uses one shared space per account.
    String couple = members.getJSONObject(0).getString("couple_id");
    String filter = "&couple_id=eq." + couple;
    JSONArray plans =
        rows(
            "plans",
            "select=id,title,plan_date,plan_time,completed,recurrence_enabled,recurrence_type,recurrence_interval,recurrence_days,recurrence_end_date,completed_occurrences,skipped_occurrences,cancelled_occurrences"
                + filter
                + "&order=plan_date,id");
    JSONArray settings =
        rows(
            "couple_settings",
            "select=theme,accent_color,background_color,countdown_date,countdown_title,countdown_source,countdown_source_id"
                + filter
                + "&order=couple_id");
    JSONArray importantDates =
        rows(
            "important_dates",
            "select=id,title,event_date,recurring,recurrence_type,recurrence_interval"
                + filter
                + "&order=event_date,id");
    return buildSnapshot(plans, settings, importantDates);
  }

  boolean claimPushDevice(String code, String verifier, String state, String token) throws Exception {
    config();
    return "true".equals(request(BACKEND + "/rest/v1/rpc/claim_android_push_device", "POST",
        new JSONObject().put("p_code", code).put("p_verifier", verifier)
            .put("p_state", state).put("p_token", token), apiKey, null).trim());
  }

  JSONObject claimLink(String code, String verifier, String state) throws Exception {
    config();
    String raw =
        request(
            BACKEND + "/rest/v1/rpc/claim_widget_device",
            "POST",
            new JSONObject().put("p_code", code).put("p_verifier", verifier).put("p_state", state),
            apiKey,
            null);
    if (raw.trim().equals("null")) throw new AuthException();
    JSONObject device = new JSONObject(raw);
    if (!device.optString("device_token").matches("[a-f0-9]{64}")) throw new AuthException();
    return device;
  }

  void disconnect() {
    try {
      JSONObject saved = SecureStore.read(context, "session");
      if (saved != null && saved.optString("kind").equals("device")) {
        config();
        request(
            BACKEND + "/rest/v1/rpc/revoke_widget_device",
            "POST",
            new JSONObject().put("p_token", saved.getString("device_token")),
            apiKey,
            null);
      }
    } catch (Exception ignored) {
    } finally {
      SecureStore.clear(context);
    }
  }

  private JSONObject buildSnapshot(JSONArray plans, JSONArray settings, JSONArray importantDates)
      throws Exception {
    JSONObject appearance =
        settings.length() > 0
            ? new JSONObject(settings.getJSONObject(0).toString())
            : new JSONObject();
    JSONObject countdown = settings.length() > 0 ? settings.getJSONObject(0) : new JSONObject();
    String source = countdown.optString("countdown_source");
    String id = countdown.optString("countdown_source_id");
    if (source.equals("plan")) {
      for (int i = 0; i < plans.length(); i++) {
        JSONObject plan = plans.getJSONObject(i);
        if (id.equals(plan.optString("id"))) {
          countdown.put("countdown_title", plan.optString("title"));
          if (!plan.optBoolean("recurrence_enabled"))
            countdown.put("countdown_date", plan.optString("plan_date"));
        }
      }
    } else if (source.equals("date") && id.matches("[0-9a-fA-F-]{36}")) {
      JSONArray dates = new JSONArray();
      for (int i = 0; i < importantDates.length(); i++)
        if (id.equals(importantDates.getJSONObject(i).optString("id")))
          dates.put(importantDates.getJSONObject(i));
      if (dates.length() > 0) {
        JSONObject date = dates.getJSONObject(0);
        countdown.put("countdown_title", date.optString("title"));
        String type = date.optString("recurrence_type", "none");
        if (!date.optBoolean("recurring")
            && (type.equals("none") || type.equals("null") || type.isEmpty()))
          countdown.put("countdown_date", date.optString("event_date"));
      }
    }
    return new JSONObject()
        .put("plans", plans)
        .put("dates", importantDates)
        .put("countdown", countdown)
        .put("appearance", appearance)
        .put("updated_at", System.currentTimeMillis());
  }
}

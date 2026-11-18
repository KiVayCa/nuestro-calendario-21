import {
  isDesktopWebPush,
  sendCalendarPush,
  type PushDevice,
} from "../_shared/calendar-push.ts";
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.49.8";

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const token = request.headers.get("x-reminder-token");
  if (!token || token.length !== 72) return new Response(null, { status: 401 });

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!url || !key || !publicKey || !privateKey)
    return Response.json(
      { error: "Push configuration unavailable" },
      { status: 503 },
    );

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") || "mailto:nickolasmorales82@gmail.com",
    publicKey,
    privateKey,
  );
  const { data: reminders, error } = await admin.rpc(
    "claim_plan_reminder_push_v2",
    { p_token: token },
  );
  if (error)
    return new Response(null, { status: error.code === "42501" ? 401 : 500 });

  let sent = 0;
  let failed = 0;
  for (const reminder of reminders) {
    const { data: subscriptions, error: queryError } = await admin
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth,user_agent")
      .eq("couple_id", reminder.couple_id)
      .eq("user_id", reminder.recipient_user_id);
    if (queryError) {
      failed++;
      continue;
    }
    const { data: androidDevices, error: androidError } = await admin
      .from("android_push_devices")
      .select("token")
      .gt("expires_at", new Date().toISOString())
      .eq("couple_id", reminder.couple_id)
      .eq("user_id", reminder.recipient_user_id);
    if (androidError) {
      failed++;
      continue;
    }
    const devices: PushDevice[] = [
      ...subscriptions.filter(isDesktopWebPush),
      ...androidDevices,
    ];
    const date = /^(?:plan|task):[^:]+:(\d{4}-\d{2}-\d{2}):/.exec(
      reminder.reminder_key,
    )?.[1];
    const payload = JSON.stringify({
      title: reminder.title,
      body: reminder.body,
      url:
        "/?tab=calendar&item=" +
        encodeURIComponent(reminder.target_id) +
        (date ? "&date=" + date : ""),
      tag: "nc21-" + reminder.id,
    });
    const results = { ...reminder.push_results };
    const persist = async (patch: Record<string, unknown>, done = false) => {
      const { error } = await admin.rpc("record_plan_reminder_push", {
        p_id: reminder.id,
        p_lease: reminder.lease,
        p_results: patch,
        p_done: done,
      });
      if (error) failed++;
    };
    await Promise.all(
      devices.map(async (subscription) => {
        const hash = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(
            "endpoint" in subscription
              ? subscription.endpoint
              : "android:" + subscription.token,
          ),
        );
        const device = Array.from(new Uint8Array(hash), (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join("");
        if (results[device]?.done) return;
        const attempts = (results[device]?.attempts || 0) + 1;
        let done = false;
        try {
          await sendCalendarPush(subscription, payload);
          sent++;
          done = true;
        } catch (error) {
          failed++;
          const status = (error as { statusCode?: number }).statusCode;
          done =
            attempts >= 3 ||
            (status != null &&
              status >= 400 &&
              status < 500 &&
              status !== 429 &&
              status !== 408);
          if (status === 404 || status === 410) {
            if ("endpoint" in subscription) {
              await admin
                .from("push_subscriptions")
                .delete()
                .eq("user_id", reminder.recipient_user_id)
                .eq("endpoint", subscription.endpoint);
            } else {
              await admin
                .from("android_push_devices")
                .delete()
                .eq("user_id", reminder.recipient_user_id)
                .eq("token", subscription.token);
            }
          }
        }
        results[device] = { attempts, done };
        await persist({ [device]: results[device] });
      }),
    );
    if (
      Object.values(results).every(
        (result) => (result as { done: boolean }).done,
      )
    )
      await persist(results, true);
  }
  const { data: expiringDevices, error: expiryError } = await admin.rpc(
    "android_push_expiring_devices",
  );
  if (expiryError) failed++;
  for (const device of expiringDevices || []) {
    try {
      await sendCalendarPush(
        { token: device.token },
        JSON.stringify({
          title: "Renueva el vínculo de tu teléfono",
          body: "Abre Configuración y toca Vincular este teléfono para seguir recibiendo avisos.",
          url: "/?tab=settings",
          tag: "nc21-phone-renewal",
        }),
      );
      const { error: saved } = await admin
        .from("android_push_devices")
        .update({ expiry_notice_for: device.expires_at })
        .eq("token", device.token)
        .eq("expires_at", device.expires_at);
      if (saved) failed++;
      else sent++;
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 410) {
        await admin
          .from("android_push_devices")
          .delete()
          .eq("token", device.token)
          .eq("expires_at", device.expires_at);
      }
      failed++;
    }
  }
  return Response.json({ reminders: reminders.length, sent, failed });
});

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
      .select("endpoint,p256dh,auth")
      .eq("couple_id", reminder.couple_id)
      .eq("user_id", reminder.recipient_user_id);
    if (queryError) {
      failed++;
      continue;
    }
    const date = /^plan:[^:]+:(\d{4}-\d{2}-\d{2}):/.exec(
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
      subscriptions.map(async (subscription) => {
        const hash = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(subscription.endpoint),
        );
        const device = Array.from(new Uint8Array(hash), (byte) =>
          byte.toString(16).padStart(2, "0"),
        ).join("");
        if (results[device]?.done) return;
        const attempts = (results[device]?.attempts || 0) + 1;
        let done = false;
        try {
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: { p256dh: subscription.p256dh, auth: subscription.auth },
            },
            payload,
            { TTL: 900, timeout: 5000 },
          );
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
            await admin
              .from("push_subscriptions")
              .delete()
              .eq("user_id", reminder.recipient_user_id)
              .eq("endpoint", subscription.endpoint);
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
  return Response.json({ reminders: reminders.length, sent, failed });
});

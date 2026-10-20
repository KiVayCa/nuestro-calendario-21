import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://nuestrocalendario21.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function cors(origin: string | null) {
  const selected = origin && allowedOrigins.has(origin)
    ? origin
    : "https://nuestrocalendario21.vercel.app";
  return {
    "Access-Control-Allow-Origin": selected,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

function reply(origin: string | null, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(origin) });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(origin) });
  if (req.method !== "POST") return reply(origin, { error: "Método no permitido" }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return reply(origin, { error: "Sesión requerida" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const publishableKeys = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || publishableKeys.default;
    const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || secretKeys.default;
    const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:nickolasmorales82@gmail.com";

    if (!supabaseUrl || !anonKey || !serviceKey) return reply(origin, { error: "Falta configuración interna de Supabase" }, 500);
    if (!vapidPublic || !vapidPrivate) return reply(origin, { error: "El servidor push aún no tiene configuradas las claves VAPID" }, 503);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = authorization.slice("Bearer ".length);
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) return reply(origin, { error: "Sesión inválida" }, 401);

    const body = await req.json();
    const coupleId = String(body.couple_id || "");
    const recipientId = String(body.recipient_user_id || "");
    const isTest = body.test === true;
    const title = String(body.title || "Nuestro Calendario #21").slice(0, 120);
    const message = String(body.body || "Tienes una novedad de pareja. ❤️").slice(0, 240);
    const tab = String(body.target_tab || "notifications");
    const allowedTabs = new Set(["home","calendar","story","memories","letters","dreams","challenges","ideas","dates","goals","budget","question","places","achievements","private","settings","notifications"]);
    if (!coupleId || !recipientId) return reply(origin, { error: "Falta la pareja o el destinatario" }, 400);
    if (!allowedTabs.has(tab)) return reply(origin, { error: "Destino no válido" }, 400);
    if (!isTest && recipientId === user.id) return reply(origin, { error: "El destinatario debe ser tu pareja" }, 400);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: actorMember, error: actorError } = await admin
      .from("couple_members").select("user_id").eq("couple_id", coupleId).eq("user_id", user.id).maybeSingle();
    if (actorError || !actorMember) return reply(origin, { error: "No perteneces a este espacio" }, 403);

    const { data: recipientMember, error: recipientError } = await admin
      .from("couple_members").select("user_id").eq("couple_id", coupleId).eq("user_id", recipientId).maybeSingle();
    if (recipientError || !recipientMember) return reply(origin, { error: "El destinatario no pertenece a este espacio" }, 403);

    if (!isTest) {
      const { data: event, error: eventError } = await admin
        .from("notifications").select("id")
        .eq("couple_id", coupleId)
        .eq("actor_user_id", user.id)
        .eq("recipient_user_id", recipientId)
        .eq("title", title)
        .gte("created_at", new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (eventError || !event) return reply(origin, { error: "No existe una notificación reciente autorizada para enviar" }, 403);
    }

    webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
    const { data: subscriptions, error: subscriptionError } = await admin
      .from("push_subscriptions").select("endpoint,p256dh,auth").eq("couple_id", coupleId).eq("user_id", recipientId);
    if (subscriptionError) return reply(origin, { error: "No se pudieron consultar las suscripciones" }, 500);
    if (!subscriptions?.length) return reply(origin, { ok: true, sent: 0, message: "El destinatario aún no activó las notificaciones en ningún dispositivo." });

    const payload = JSON.stringify({
      title,
      body: message,
      url: "/?tab=" + encodeURIComponent(tab),
      tag: "nc21-" + String(body.event_type || (isTest ? "push-test" : "notification")).replace(/[^a-z0-9_-]/gi, "").slice(0, 60),
    });
    let sent = 0;
    let failed = 0;
    let expired = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
        sent++;
      } catch (error) {
        failed++;
        const statusCode = Number((error as { statusCode?: number })?.statusCode || 0);
        if (statusCode === 404 || statusCode === 410) {
          expired++;
          const { error: deleteError } = await admin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint).eq("user_id", recipientId);
          if (deleteError) console.error("No se pudo eliminar la suscripción push vencida:", deleteError.message);
        }
        console.error("Push send failed:", statusCode || "unknown");
      }
    }
    if (sent === 0 && expired > 0) {
      // Devolvemos 200 con una instrucción explícita para que el cliente pueda renovar
      // su suscripción local; de lo contrario, Functions.invoke solo expone un error HTTP.
      return reply(origin, {
        ok: false, sent, failed, expired, renew_subscription: true,
        message: "La suscripción push anterior venció. El dispositivo debe registrarse de nuevo."
      });
    }
    return reply(origin, {
      ok: sent > 0, sent, failed, expired,
      message: sent ? "Notificación push aceptada por el servicio de entrega" :
        "No se entregó ninguna notificación push. Comprueba que el destinatario tenga una suscripción activa."
    }, sent ? 200 : 502);
  } catch (error) {
    console.error("send-push-notification failed:", error);
    return reply(origin, { error: "Error interno al enviar la notificación push" }, 500);
  }
});

import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import { sendCalendarPush } from "../_shared/calendar-push.ts";

// A silent hint only: widgets still fetch their own authorized snapshot.
Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin") || "";
  const allowed = origin === "https://nuestrocalendario21.vercel.app" ||
    /^https:\/\/nuestrocalendario21-[a-z0-9-]+-nickolasmorales82-3635s-projects\.vercel\.app$/.test(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1):3000$/.test(origin);
  const headers = {
    "Access-Control-Allow-Origin": allowed ? origin : "https://nuestrocalendario21.vercel.app",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
  const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers });
  if (req.method === "OPTIONS") return reply(200, { ok: true });
  if (req.method !== "POST") return reply(405, { error: "Método no permitido" });
  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return reply(401, { error: "Sesión requerida" });
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}").default;
    const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}").default;
    const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth, error: authError } = await client.auth.getUser(authorization.slice(7));
    if (authError || !auth.user) return reply(401, { error: "Sesión inválida" });
    const { couple_id: coupleId, notification_id: notificationId } = await req.json();
    if (typeof coupleId !== "string" || !/^[a-f0-9-]{36}$/i.test(coupleId)) return reply(400, { error: "Pareja inválida" });
    const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: members, error: memberError } = await admin.from("couple_members").select("user_id").eq("couple_id", coupleId);
    if (memberError || !members?.some(m => m.user_id === auth.user.id)) return reply(403, { error: "Acceso denegado" });
    if (notificationId !== undefined) {
      if (typeof notificationId !== "string" || !/^[a-f0-9-]{36}$/i.test(notificationId)) return reply(400, { error: "Aviso inválido" });
      const { data: event, error: eventError } = await admin.from("notifications")
        .select("id").eq("id", notificationId).eq("couple_id", coupleId)
        .eq("actor_user_id", auth.user.id).eq("target_tab", "calendar")
        .in("event_type", ["plan_created", "plan_updated", "plan_deleted", "plan_occurrence_completed", "plan_occurrence_reopened", "plan_occurrence_cancelled", "plan_occurrence_reactivated", "plan_occurrence_rescheduled"])
        .gte("created_at", new Date(Date.now() - 60_000).toISOString()).maybeSingle();
      if (eventError || !event) return reply(403, { error: "No hay un cambio reciente de calendario autorizado" });
    } else {
      const { data: settings, error: settingsError } = await admin.from("couple_settings")
        .select("updated_by,updated_at").eq("couple_id", coupleId).maybeSingle();
      if (settingsError || !settings || settings.updated_by !== auth.user.id ||
          Date.now() - Date.parse(settings.updated_at) > 60_000) return reply(403, { error: "No hay un cambio reciente de configuración" });
    }
    const { data: devices, error: deviceError } = await admin.from("android_push_devices").select("token")
      .eq("couple_id", coupleId).in("user_id", members.map(m => m.user_id))
      .gt("expires_at", new Date().toISOString());
    if (deviceError) return reply(500, { error: "No se pudieron consultar los dispositivos" });
    const results = await Promise.allSettled(devices.map(device => sendCalendarPush(device, JSON.stringify({ type: "widget_refresh" }))));
    return reply(200, { ok: true, sent: results.filter(r => r.status === "fulfilled").length });
  } catch (_) {
    return reply(500, { error: "No se pudo solicitar la sincronización" });
  }
});

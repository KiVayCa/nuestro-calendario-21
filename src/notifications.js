function desktopBrowserNotifications() {
  const platform = navigator.userAgent || "";
  return (
    !/Android|iPhone|iPad|iPod|Mobile|Windows Phone|Opera Mini/i.test(
      platform,
    ) &&
    !(
      navigator.userAgentData?.mobile ||
      /^Android$/i.test(navigator.userAgentData?.platform || "") ||
      (/Macintosh/i.test(platform) && navigator.maxTouchPoints > 1)
    )
  );
}

function updateNotificationBadge() {
  const b = $("notificationsTab"),
    badge = $("notificationBadge");
  if (!b || !badge) return;
  const n = advCache.notifications.filter((x) => !x.read_at).length;
  badge.hidden = !n;
  badge.textContent = n > 99 ? "99+" : String(n);
  b.setAttribute(
    "aria-label",
    n ? `Notificaciones, ${n} sin leer` : "Notificaciones",
  );
  b.title = n ? `${n} notificación(es) sin leer` : "Notificaciones";
}

function renderAdvNotifications() {
  const arr = advCache.notifications;
  const unread = arr.filter((x) => !x.read_at).length;
  const names = new Map(
    coupleProfiles.map((p) => [p.user_id, p.display_name || "Tu pareja"]),
  );
  return (
    advHeader(
      "Notificaciones",
      "Aquí aparecen las novedades que tu pareja comparte en el calendario, recuerdos, sueños y metas.",
      unread ? "✓ Marcar todo leído" : "🔄 Actualizar",
      unread ? "markAllNotificationsRead()" : "advLoadAll()",
    ) +
    `<div class="advList">${arr.length ? arr.map((n) => `<div class="advItem ${n.read_at ? "notificationRead" : "notificationUnread"}"><div style="flex:1"><div class="advItemTitle">${n.read_at ? "" : "🔴 "}${esc(n.title)}</div><div class="advMeta">${esc(names.get(n.actor_user_id) || "Tu pareja")} · ${new Date(n.created_at).toLocaleString("es-CO")}</div><p>${esc(n.body || "Hay una novedad en su espacio compartido.")}</p></div><div class="advActions">${n.target_tab ? `<button class="btn" onclick="openNotificationTarget('${n.id}','${n.target_tab}')">Ver</button>` : ""}${!n.read_at ? `<button class="btn" onclick="markNotificationRead('${n.id}')">Marcar leído</button>` : ""}</div></div>`).join("") : `<div class="advEmpty">💌 Todavía no hay avisos. Cuando alguno de los dos agregue algo nuevo, aparecerá aquí.</div>`}</div>${desktopBrowserNotifications() ? '<div class="advCard" style="margin-top:18px"><h3>🔔 Notificaciones del navegador</h3><p>Recibe avisos del calendario en este computador.</p><button class="btn primary" onclick="enableBrowserNotifications()">Activar notificaciones del navegador</button></div>' : ""}`
  );
}

async function createPartnerNotification({
  event_type,
  title,
  body,
  target_tab,
  target_id,
  target_date,
}) {
  if (!user?.id || !couple?.id) return;
  const space = couple.id;
  const account = user.id;
  const datedCalendarNotice =
    target_tab === "calendar" && target_id && target_date;
  try {
    const { data: notification, error } = await sb.rpc(
      datedCalendarNotice
        ? "record_calendar_partner_notification"
        : "record_partner_notification",
      {
        p_couple_id: space,
        p_event_type: event_type,
        p_title: title,
        p_body: body || "",
        p_target_id: target_id || null,
        ...(datedCalendarNotice
          ? { p_target_date: target_date }
          : { p_target_tab: target_tab || "notifications" }),
      },
    );
    if (error) throw error;
    if (!notification || user?.id !== account || couple?.id !== space) return;
    const refreshWidgets = target_tab === "calendar" && [
      "plan_created", "plan_updated", "plan_deleted",
      "plan_occurrence_completed", "plan_occurrence_reopened",
      "plan_occurrence_cancelled", "plan_occurrence_reactivated",
      "plan_occurrence_rescheduled",
    ].includes(event_type) && notification.id;
    // Refresh BOTH phones independently of visible partner notifications.
    const refresh = refreshWidgets ? (async () => {
      try {
        const { error } = await sb.functions.invoke("refresh-calendar-widgets", {
          body: { couple_id: space, notification_id: notification.id },
        });
        if (error) console.warn("Los widgets se actualizarán en la siguiente sincronización.");
      } catch (_) { /* Periodic native sync remains available. */ }
    })() : Promise.resolve();
    const { error: pushError } = await sb.functions.invoke(
      "send-push-notification",
      {
        body: {
          couple_id: space,
          recipient_user_id: notification.recipient_user_id,
          notification_id: notification.id,
          title: notification.title,
          body: notification.body,
          target_tab: notification.target_tab,
          target_id: notification.target_id,
          event_type: notification.event_type,
        },
      },
    );
    await refresh;
    if (pushError)
      console.warn(
        "El aviso quedó guardado, pero el envío push falló.",
        pushError.message,
      );
  } catch (error) {
    console.warn("No se pudo enviar el aviso.", error.message);
    showAppToast("Guardado. El aviso a tu pareja no pudo enviarse.", "error");
  }
}

async function markNotificationRead(id) {
  const { error } = await sb
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_user_id", user.id);
  if (error) return appAlert("No se pudo marcar como leído: " + error.message);
  await advLoadAll();
}

async function markAllNotificationsRead() {
  const ids = advCache.notifications.filter((n) => !n.read_at).map((n) => n.id);
  if (!ids.length) return;
  const { error } = await sb
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids)
    .eq("recipient_user_id", user.id);
  if (error)
    return appAlert("No se pudieron actualizar los avisos: " + error.message);
  await advLoadAll();
}

async function openNotificationTarget(id, tab) {
  const notification = advCache.notifications.find((item) => item.id === id);
  await markNotificationRead(id);
  navigateToItem(
    tab,
    notification?.target_id,
    reminderOccurrenceDate(notification),
  );
}

function reminderWasSent(key) {
  try {
    return localStorage.getItem("nc21_reminder_" + key) === "1";
  } catch (e) {
    return false;
  }
}

function markReminderSent(key) {
  try {
    localStorage.setItem("nc21_reminder_" + key, "1");
  } catch (e) {}
}

async function sendLocalReminder(title, body, key, targetTab) {
  if (!desktopBrowserNotifications() || reminderWasSent(key)) return;
  if (!("Notification" in window) || Notification.permission !== "granted")
    return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: key,
      data: { url: "/?tab=" + encodeURIComponent(targetTab || "home") },
    });
    markReminderSent(key);
  } catch (e) {
    console.warn("No se pudo mostrar el recordatorio:", e);
  }
}

function checkLocalReminders() {
  if (
    !desktopBrowserNotifications() ||
    !user ||
    !couple ||
    !("Notification" in window) ||
    Notification.permission !== "granted"
  )
    return;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (const d of advCache.dates) {
    if (!d.event_date) continue;
    const parts = d.event_date.split("-").map(Number);
    let target = new Date(parts[0], parts[1] - 1, parts[2]);
    const recurring = !!d.recurring || d.recurrence_type === "yearly";
    if (recurring && target < today)
      target = new Date(now.getFullYear() + 1, parts[1] - 1, parts[2]);
    if (!recurring && target < today) continue;
    const days = Math.round((target - today) / 86400000);
    if (days === Number(d.reminder_days || 0)) {
      const dateKey = localISODate(target);
      sendLocalReminder(
        days === 0
          ? "Hoy es una fecha especial ❤️"
          : "Se acerca una fecha especial ❤️",
        d.title + (days === 0 ? " es hoy." : " es en " + days + " día(s)."),
        "date_" + d.id + "_" + dateKey,
        "dates",
      );
    }
  }
}

async function persistPushSubscription(subscription) {
  const json = subscription.toJSON();
  const { error } = await sb.from("push_subscriptions").upsert(
    {
      couple_id: couple.id,
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_agent: navigator.userAgent.slice(0, 300),
    },
    { onConflict: "endpoint" },
  );
  if (error) throw error;
}

async function requestPushTest() {
  const { data, error } = await sb.functions.invoke("send-push-notification", {
    body: {
      couple_id: couple.id,
      recipient_user_id: user.id,
      title: "Nuestro Calendario #21 ❤️",
      body: "¡Las notificaciones push de este dispositivo están activas!",
      target_tab: "notifications",
      test: true,
    },
  });
  if (error) throw error;
  return data || {};
}

async function renewPushSubscription(reg, oldSubscription) {
  if (oldSubscription) {
    try {
      await oldSubscription.unsubscribe();
    } catch (e) {
      console.warn("No se pudo cancelar la suscripción push anterior:", e);
    }
  }
  const fresh = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: pushBase64UrlToBytes(PUSH_VAPID_PUBLIC_KEY),
  });
  await persistPushSubscription(fresh);
  return fresh;
}

async function repairPushSubscriptionIfMissing() {
  if (!desktopBrowserNotifications()) {
    try {
      const registration = await navigator.serviceWorker?.ready;
      const subscription = await registration?.pushManager?.getSubscription();
      if (
        subscription &&
        (await subscription.unsubscribe()) &&
        user?.id &&
        sb
      ) {
        await sb
          .from("push_subscriptions")
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", subscription.endpoint);
      }
    } catch {
      // The server also excludes mobile subscriptions.
    }
    return;
  }
  if (
    !("Notification" in window) ||
    Notification.permission !== "granted" ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !user?.id ||
    !couple?.id ||
    !sb
  )
    return;
  try {
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) return;
    const { data: known, error } = await sb
      .from("push_subscriptions")
      .select("endpoint,user_agent")
      .eq("user_id", user.id)
      .eq("endpoint", subscription.endpoint)
      .maybeSingle();
    if (error) {
      console.warn("No se pudo verificar el registro push:", error.message);
      return;
    }
    if (known) {
      if (!known.user_agent) await persistPushSubscription(subscription);
      return;
    }
    // El servidor pudo haber eliminado esta suscripción tras recibir 404/410.
    subscription = await renewPushSubscription(reg, subscription);
    console.info("Suscripción push recuperada para este dispositivo.");
  } catch (e) {
    console.warn(
      "No se pudo recuperar automáticamente la suscripción push:",
      e?.message || e,
    );
  }
}

async function enableBrowserNotifications() {
  if (!desktopBrowserNotifications()) {
    return appAlert(
      "En Android, vincula este teléfono desde Aplicación Android y widgets.",
    );
  }
  if (!("Notification" in window))
    return appAlert(
      "Este navegador no admite notificaciones. Prueba Chrome en Android o PC.",
    );
  if (!("serviceWorker" in navigator) || !("PushManager" in window))
    return appAlert(
      "Este navegador no admite notificaciones push. Prueba Chrome actualizado o instala la PWA.",
    );
  if (!user?.id || !couple?.id || !sb)
    return appAlert("Primero inicia sesión en vuestro espacio.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    return appAlert(
      "No se concedió permiso. Puedes cambiarlo desde los ajustes del navegador.",
    );
  try {
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) subscription = await renewPushSubscription(reg, null);
    else await persistPushSubscription(subscription);
    checkLocalReminders();
    let result = await requestPushTest();
    if (result.renew_subscription === true) {
      subscription = await renewPushSubscription(reg, subscription);
      result = await requestPushTest();
    }
    if (!result.sent || result.sent < 1) {
      throw new Error(
        result.message ||
          "El servidor no confirmó la entrega de la prueba push. Revisa la conexión e inténtalo de nuevo.",
      );
    }
    const partial = result.failed
      ? " Se entregó a " +
        result.sent +
        " suscripción(es); " +
        result.failed +
        " dispositivo(s) necesita(n) revisar su registro."
      : "";
    appAlert(
      "¡Notificaciones push comprobadas! El servidor aceptó el envío de prueba a " +
        result.sent +
        " suscripción(es)." +
        partial +
        " Cuando tu pareja comparta algo, el aviso podrá llegar aunque la PWA esté cerrada, si el sistema operativo y la conexión permiten la entrega. ❤️",
    );
  } catch (e) {
    console.error("Error activando push:", e);
    appAlert(
      "No pudimos confirmar la entrega de notificaciones push: " +
        (e?.message || "error desconocido") +
        ". No basta con que Chrome muestre el permiso como autorizado; vuelve a intentarlo desde Notificaciones.",
    );
  }
}

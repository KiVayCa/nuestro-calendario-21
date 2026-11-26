let realtimeKeys = new Set();
let realtimeFullRefresh = false;
function scheduleRealtimeRefresh(includePlans = false, keys = null) {
  if (keys) keys.forEach((key) => realtimeKeys.add(key));
  else realtimeFullRefresh = true;
  realtimeRefreshPlans = realtimeRefreshPlans || includePlans;
  if (realtimeRefreshTimer) clearTimeout(realtimeRefreshTimer);
  realtimeRefreshTimer = window.setTimeout(async () => {
    realtimeRefreshTimer = null;
    const withPlans = realtimeRefreshPlans;
    realtimeRefreshPlans = false;
    if (realtimeRefreshBusy) {
      realtimeRefreshAgain = true;
      realtimeRefreshPlans = realtimeRefreshPlans || withPlans;
      return;
    }
    realtimeRefreshBusy = true;
    try {
      const keys = realtimeFullRefresh
        ? Object.keys(advTables)
        : [...realtimeKeys];
      realtimeFullRefresh = false;
      realtimeKeys.clear();
      if (withPlans) await loadPlans();
      await advLoadAll(keys);
      if (withPlans && ["home", "analysis"].includes(advancedTab))
        renderAdvanced();
    } catch (err) {
      console.warn("No se pudo actualizar el calendario en tiempo real:", err);
    } finally {
      realtimeRefreshBusy = false;
      if (realtimeRefreshAgain) {
        realtimeRefreshAgain = false;
        scheduleRealtimeRefresh(realtimeRefreshPlans);
      }
    }
  }, 180);
}

async function refreshRealtimeOnResume() {
  if (document.visibilityState !== "visible" || !user || !couple || !sb) return;
  scheduleRealtimeRefresh(true);
  await Promise.all([
    setupPlanRealtime(plansRealtimeStatus !== "SUBSCRIBED"),
    setupAdvancedRealtime(advancedRealtimeStatus !== "SUBSCRIBED"),
  ]);
}

function restoreLastTabOnResume() {
  if (document.visibilityState !== "visible" || !user || !couple) return;
  const now = Date.now();
  if (now - lastResumeRestoreAt < 1500) return;
  lastResumeRestoreAt = now;
  let saved = advancedTab;
  try {
    saved = localStorage.getItem("nc21_last_tab") || advancedTab;
  } catch (e) {}
  if (!validAdvancedTabs.has(saved) || saved === advancedTab) return;
  suppressTabAnimation = true;
  document.body.classList.add("nc-resume-no-flash");
  showAdvancedTab(saved, { skipScroll: true });
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      document.body.classList.remove("nc-resume-no-flash");
      suppressTabAnimation = false;
    }),
  );
}
async function setupPlanRealtime(force = false) {
  if (!sb || !couple?.id) return;
  if (realtimeChannel && plansRealtimeCoupleId === couple.id && !force) return;
  if (realtimeChannel) {
    try {
      await sb.removeChannel(realtimeChannel);
    } catch (err) {
      console.warn("No se pudo cerrar el canal anterior de planes:", err);
    }
    realtimeChannel = null;
  }
  plansRealtimeCoupleId = couple.id;
  plansRealtimeStatus = "CLOSED";
  realtimeChannel = sb
    .channel("plans-live-" + couple.id)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "plans",
        filter: "couple_id=eq." + couple.id,
      },
      () => scheduleRealtimeRefresh(true),
    )
    .subscribe((status) => {
      plansRealtimeStatus = status;
      if (status === "SUBSCRIBED") {
        console.info("Realtime conectado: planes");
        scheduleRealtimeRefresh(true);
      } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
        console.warn("Canal Realtime de planes:", status);
      }
    });
}

async function setupAdvancedRealtime(force = false) {
  if (!sb || !couple?.id || !user?.id) return;
  if (
    window.advancedRealtime &&
    advancedRealtimeCoupleId === couple.id &&
    !force
  )
    return;
  if (window.advancedRealtime) {
    try {
      await sb.removeChannel(window.advancedRealtime);
    } catch (err) {
      console.warn("No se pudo cerrar el canal anterior de contenido:", err);
    }
    window.advancedRealtime = null;
  }
  advancedRealtimeCoupleId = couple.id;
  advancedRealtimeStatus = "CLOSED";
  const tables = [
    "couple_connection",
    "memories",
    "love_letters",
    "letter_reactions",
    "dreams",
    "challenges",
    "important_dates",
    "goals",
    "places",
    "activity_ideas",
    "private_notes",
    "couple_settings",
    "shared_expenses",
    "budget_recurring_templates",
    "notifications",
    "daily_answers",
  ];
  const channel = sb.channel("advanced-live-" + couple.id);
  tables.forEach((table) => {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter: "couple_id=eq." + couple.id,
      },
      (payload) => {
        if (
          table === "notifications" &&
          payload.eventType === "INSERT" &&
          payload.new?.recipient_user_id === user?.id
        ) {
          const note = payload.new;
          // Future letter rows are hidden by RLS; their safe preview is refreshed via the notification.
          if (note.target_tab === "letters")
            scheduleRealtimeRefresh(false, ["letters"]);
          if (document.visibilityState === "visible")
            showAppToast(note.title || "Nueva notificación de tu pareja ❤️");
          if (
            desktopBrowserNotifications() &&
            "Notification" in window &&
            Notification.permission === "granted" &&
            document.visibilityState !== "visible"
          ) {
            navigator.serviceWorker?.ready
              .then((reg) =>
                reg.showNotification(note.title || "Nuestro Calendario #21", {
                  body: note.body || "Tu pareja compartió algo contigo.",
                  icon: "/icon-192.png",
                  badge: "/icon-192.png",
                  tag: "nc21-" + note.id,
                  data: {
                    url:
                      "/?tab=" +
                      encodeURIComponent(note.target_tab || "notifications") +
                      (note.target_id
                        ? "&item=" + encodeURIComponent(note.target_id)
                        : "") +
                      (reminderOccurrenceDate(note)
                        ? "&date=" + reminderOccurrenceDate(note)
                        : ""),
                  },
                }),
              )
              .catch(() => {});
          }
        }
        scheduleRealtimeRefresh(
          false,
          Object.keys(advTables).filter((key) => advTables[key] === table),
        );
      },
    );
  });
  window.advancedRealtime = channel.subscribe((status) => {
    advancedRealtimeStatus = status;
    if (status === "SUBSCRIBED") {
      console.info("Realtime conectado: contenido compartido");
      scheduleRealtimeRefresh(false);
    } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
      console.warn("Canal Realtime de contenido:", status);
    }
  });
}

async function initAdvanced() {
  if (!couple) return;
  await loadProfiles();
  await advLoadAll();
  await Promise.all([setupPlanRealtime(), setupAdvancedRealtime()]);
  const tab = pendingDeepLink.get("tab");
  if (tab) {
    navigateToItem(
      tab,
      pendingDeepLink.get("item"),
      pendingDeepLink.get("date"),
    );
    pendingDeepLink = new URLSearchParams();
    const cleanUrl = new URL(location.href);
    for (const key of ["tab", "item", "date"])
      cleanUrl.searchParams.delete(key);
    history.replaceState(null, "", cleanUrl.href);
  }
  if (!maybeOfferAndroidPushLink()) maybeOfferWidgetLink();
  $("advModal")?.addEventListener("click", (e) => {
    if (e.target === $("advModal")) closeAdvModal();
  });
  $("profileModal")?.addEventListener("click", (e) => {
    if (e.target === $("profileModal")) closeProfilePanel();
  });
}

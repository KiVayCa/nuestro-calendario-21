async function loadAdvancedData(keys = Object.keys(advTables)) {
  if (!couple || !sb || !user) return;
  const context = couple.id + ":" + user.id;
  const revision = ++dataLoadRevision;
  const requested = [...new Set(keys)].filter((key) => advTables[key]);
  const results = await Promise.all(
    requested.map(async (key) => {
      try {
        let query = sb
          .from(advTables[key])
          .select("*")
          .eq("couple_id", couple.id);
        if (key === "privateNotes") query = query.eq("user_id", user.id);
        if (key === "notifications")
          query = query.eq("recipient_user_id", user.id);
        // Page through the API limit so older memories and movements stay available.
        const rows = [];
        for (let offset = 0; ; offset += 500) {
          const { data, error } = await query
            .order("created_at", { ascending: false })
            .order("id")
            .range(offset, offset + 499);
          if (error) throw error;
          rows.push(...(data || []));
          if (!data || data.length < 500) break;
        }
        return { key, rows };
      } catch (error) {
        console.warn("No se pudo cargar " + key, error.message);
        return { key, error };
      }
    }),
  );
  if (context !== couple?.id + ":" + user?.id || revision !== dataLoadRevision)
    return;
  let changed = false;
  for (const result of results) {
    if (result.error) continue;
    if (JSON.stringify(advCache[result.key]) !== JSON.stringify(result.rows)) {
      advCache[result.key] = result.rows;
      changed = true;
    }
  }
  setConnectionStatus(
    results.some((result) => result.error)
      ? "No pudimos actualizar todo. Conservamos la última información disponible."
      : "",
  );
  if (
    advancedTab === "budget" &&
    (requested.includes("expenses") || requested.includes("recurring"))
  ) {
    await ensureRecurringBudgetMovements(budgetSelectedMonth);
    const { data, error } = await sb
      .from("shared_expenses")
      .select("*")
      .eq("couple_id", couple.id)
      .order("created_at", { ascending: false });
    if (
      context !== couple?.id + ":" + user?.id ||
      revision !== dataLoadRevision
    )
      return;
    if (!error && JSON.stringify(advCache.expenses) !== JSON.stringify(data)) {
      advCache.expenses = data;
      changed = true;
    }
  }
  await loadCoupleSettings();
  if (context !== couple?.id + ":" + user?.id || revision !== dataLoadRevision)
    return;
  if (changed || !$("advancedContent")?.children.length) {
    if (
      document.activeElement?.closest(
        "#advancedContent input, #advancedContent textarea, #advancedContent select",
      )
    ) {
      pendingModuleRender = true;
    } else {
      renderAdvanced({ preserveInputs: true });
    }
    render();
  }
  updateNotificationBadge();
}

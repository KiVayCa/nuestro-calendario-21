const reminderOptions = [
  [15, "15 minutos antes"],
  [60, "Una hora antes"],
  [1440, "El día anterior"],
];

async function openPersonalReminders() {
  const account = user?.id;
  if (!account) return;
  const { data, error } = await sb
    .from("plan_reminder_preferences")
    .select("minutes")
    .eq("user_id", account)
    .maybeSingle();
  if (account !== user?.id) return;
  if (error) return appAlert("No se pudo cargar tu preferencia de avisos.");
  openAdvModal(
    "Mis recordatorios",
    `<div class="field">
    <label for="reminderMinutes">Cuándo quieres recibir los avisos</label>
    <select id="reminderMinutes">${reminderOptions
      .map(
        ([minutes, label]) =>
          `<option value="${minutes}" ${(data?.minutes ?? 15) === minutes ? "selected" : ""}>${label}</option>`,
      )
      .join("")}</select>
  </div><p class="advMeta">Los planes sin hora se avisan a las 8:00 a. m. del día elegido. Se usa la hora de Colombia.</p>
  <button class="btn primary" type="button" onclick="savePersonalReminder(this)">Guardar preferencia</button>`,
  );
}

async function savePersonalReminder(button) {
  const minutes = Number($("reminderMinutes")?.value);
  if (!user?.id || !reminderOptions.some(([value]) => value === minutes))
    return;
  await runCalendarTool(button, async () => {
    const { error } = await sb
      .from("plan_reminder_preferences")
      .upsert({ user_id: user.id, minutes }, { onConflict: "user_id" });
    if (error) return appAlert("No se pudo guardar tu preferencia.");
    if (button.isConnected) closeAdvModal();
    showAppToast("Preferencia guardada");
  });
}

function openAnalysisMonth(month, series) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return;
  const isPlans = series === "completed";
  const items = isPlans
    ? analysisOccurrences(month).filter((plan) => plan.completed)
    : advCache.memories.filter((memory) =>
        memory.memory_date?.startsWith(month),
      );
  openAdvModal(
    (isPlans ? "Planes completados" : "Recuerdos") +
      " · " +
      albumMonthLabel(month),
    items.length
      ? `<div class="advList">${items
          .map(
            (item) => `<button type="button" class="btn"
      data-id="${esc(item.id)}" data-date="${esc(isPlans ? item._occurrenceDate : item.memory_date)}"
      onclick="openAnalysisItem(this, ${isPlans})">${esc(item.title)} · ${esc(dateES(isPlans ? item._occurrenceDate : item.memory_date))}</button>`,
          )
          .join("")}</div>`
      : '<p class="advMeta">Sin registros este mes.</p>',
  );
}

function openAnalysisItem(button, isPlan) {
  closeAdvModal();
  if (isPlan) openPlanDetail(button.dataset.id, button.dataset.date);
  else navigateToItem("memories", button.dataset.id);
}

async function runCalendarTool(button, action) {
  if (button.disabled) return;
  button.disabled = true;
  try {
    await action();
  } catch {
    appAlert("No se pudo completar la acción. Inténtalo otra vez.");
  } finally {
    button.disabled = false;
  }
}

function openPlanTasks(button) {
  const plan = currentPlan;
  const date = button.dataset.planDate;
  if (!plan || !date) return;
  closeDetailModal();
  openAdvModal(
    "Pendientes · " + plan.title,
    `<div id="planTaskList" aria-live="polite">Cargando…</div>
    <form class="advForm" data-plan="${esc(plan.id)}" data-date="${esc(date)}" onsubmit="event.preventDefault();addPlanTask(this)">
      <div class="field"><label for="taskTitle">Nueva tarea · ${esc(dateES(date))}</label><input id="taskTitle" required maxlength="140"></div>
      <div class="field"><label for="taskAssignee">Asignar a</label><select id="taskAssignee"><option value="">Sin asignar</option>
        ${coupleProfiles.map((profile) => `<option value="${esc(profile.user_id)}">${esc(profile.display_name || (profile.user_id === user?.id ? "Yo" : "Mi pareja"))}</option>`).join("")}</select></div>
      <button class="btn primary" type="submit">Añadir tarea</button>
      <button class="btn" type="button" onclick="closeAdvModal();openPlanDetail(this.form.dataset.plan,this.form.dataset.date)">Volver al plan</button>
    </form>`,
  );
  const list = $("planTaskList");
  loadPlanTasks(list, plan.id, date);
  const refresh = setInterval(() => {
    if (!list.isConnected || !$("advModal").classList.contains("show")) {
      clearInterval(refresh);
      return;
    }
    if (
      document.visibilityState === "visible" &&
      !list.contains(document.activeElement)
    )
      loadPlanTasks(list, plan.id, date);
  }, 8000);
}

async function loadPlanTasks(container, planId, date) {
  const { data, error } = await sb
    .from("plan_tasks")
    .select("*")
    .eq("plan_id", planId)
    .eq("occurrence_date", date)
    .order("created_at");
  if (!container.isConnected) return;
  if (error) {
    container.textContent = "No se pudieron cargar las tareas.";
    return;
  }
  const revision = JSON.stringify(data);
  if (container.dataset.revision === revision) return;
  container.dataset.revision = revision;
  container.innerHTML = data.length
    ? `<div class="advList">${data
        .map((task) => {
          const assignee = coupleProfiles.find(
            (profile) => profile.user_id === task.assigned_to,
          );
          const name = assignee
            ? assignee.display_name ||
              (assignee.user_id === user?.id ? "Yo" : "Mi pareja")
            : "Sin asignar";
          return `<div class="advItem"><div><strong>${task.completed ? "✓ " : ""}${esc(task.title)}</strong><div class="advMeta">${esc(name)}${task.completed_at ? " · " + esc(coupleProfiles.find((p) => p.user_id === task.completed_by)?.display_name || "Completada") + " · " + esc(new Date(task.completed_at).toLocaleString("es-CO", { timeZone: "America/Bogota" })) : ""}</div></div>
      <div class="advActions"><button class="btn" type="button" data-id="${esc(task.id)}" onclick="changePlanTask(this, ${!task.completed})">${task.completed ? "Reabrir" : "Completar"}</button>
      <button class="btn danger" type="button" data-id="${esc(task.id)}" onclick="changePlanTask(this, null)">Eliminar</button></div></div>`;
        })
        .join("")}</div>`
    : '<p class="advMeta">No hay tareas para esta fecha.</p>';
}

async function addPlanTask(form) {
  const title = form.querySelector("#taskTitle").value.trim();
  if (!title) return;
  const list = $("planTaskList");
  const { plan, date } = form.dataset;
  await runCalendarTool(form.querySelector('[type="submit"]'), async () => {
    const { error } = await sb.from("plan_tasks").insert({
      plan_id: plan,
      occurrence_date: date,
      title,
      assigned_to: form.querySelector("#taskAssignee").value || null,
    });
    if (error) return appAlert("No se pudo añadir la tarea.");
    form.reset();
    await loadPlanTasks(list, plan, date);
  });
}

async function changePlanTask(button, completed) {
  const list = $("planTaskList");
  const { plan, date } = list.nextElementSibling.dataset;
  const row = button.closest(".advItem");
  const controls = Array.from(row.querySelectorAll("button"));
  if (controls.some((control) => control.disabled)) return;
  controls
    .filter((control) => control !== button)
    .forEach((control) => {
      control.disabled = true;
    });
  try {
    await runCalendarTool(button, async () => {
      const query = sb.from("plan_tasks");
      const { error } = await (
        completed === null ? query.delete() : query.update({ completed })
      )
        .eq("id", button.dataset.id)
        .eq("plan_id", plan)
        .eq("occurrence_date", date);
      if (error) return appAlert("No se pudo actualizar la tarea.");
      await loadPlanTasks(list, plan, date);
    });
  } finally {
    controls.forEach((control) => {
      control.disabled = false;
    });
  }
}

function countdownToday() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function resolveCountdown() {
  const { countdown_source: source, countdown_source_id: id } = coupleSettings;
  const date = coupleSettings.countdown_date;
  if (source === "plan") {
    const plan = plans.find((item) => item.id === id);
    if (plan)
      return {
        date: plan.recurrence_enabled ? date : plan.plan_date,
        title: plan.title,
      };
  }
  if (source === "date") {
    const event = advCache.dates.find((item) => item.id === id);
    if (event)
      return {
        date:
          event.recurring ||
          (event.recurrence_type && event.recurrence_type !== "none")
            ? date
            : event.event_date,
        title: event.title,
      };
  }
  return { date, title: coupleSettings.countdown_title };
}

function homeCountdownCard() {
  const pinned = resolveCountdown();
  const { date, title } = pinned;
  const days = Math.round(
    (Date.parse(date) - Date.parse(countdownToday())) / 86400000,
  );
  const label =
    days > 0
      ? `Faltan ${days} ${days === 1 ? "día" : "días"}`
      : days === 0
        ? "Es hoy"
        : "Ya pasó";
  return `<section class="homeNext"><div><h3>Cuenta regresiva</h3>
    ${date && title ? `<strong>${esc(title)}</strong><p class="advMeta">${esc(label)} · ${esc(dateES(date))}</p>` : ""}
    </div><button class="btn" type="button" onclick="openCountdownSettings()">${date ? "Cambiar fecha" : "Fijar fecha"}</button></section>`;
}

function openCountdownSettings() {
  const today = countdownToday();
  const end = dateKeyLocal(addDaysDate(parseDateOnly(today), 366));
  const pinned = resolveCountdown();
  const choices = [
    ...getPlanOccurrencesForRange(today, end)
      .filter((plan) => !plan.completed)
      .map((plan) => ({
        title: plan.title,
        date: plan._occurrenceDate,
        source: "plan",
        id: plan.id,
      })),
    ...getImportantDateOccurrencesForRange(today, end),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 150);
  openAdvModal(
    "Cuenta regresiva compartida",
    `<div class="advForm">
    <div class="field"><label for="countdownSource">Usar un plan o fecha especial</label><select id="countdownSource" onchange="applyCountdownChoice(this)">
      <option value="">Elegir o escribir una fecha</option>
      ${choices.map((item) => `<option value="${esc(item.date)}" data-title="${esc(item.title)}" data-source="${esc(item.source)}" data-id="${esc(item.id)}">${esc(item.date)} · ${esc(item.title)}</option>`).join("")}
    </select></div>
    <div class="field"><label for="countdownTitle">Nombre</label><input id="countdownTitle" maxlength="120" value="${esc(pinned.title || "")}"></div>
    <div class="field"><label for="countdownDate">Fecha</label><input id="countdownDate" type="date" min="${today}" value="${esc(pinned.date || "")}"></div>
    <div class="advActions"><button class="btn primary" type="button" onclick="saveCountdown(this)">Fijar en Inicio</button>
    ${coupleSettings.countdown_date ? '<button class="btn" type="button" onclick="saveCountdown(this,true)">Quitar</button>' : ""}</div></div>`,
  );
}

function applyCountdownChoice(select) {
  if (!select.value) return;
  $("countdownTitle").value = select.selectedOptions[0].dataset.title;
  $("countdownDate").value = select.value;
}

async function saveCountdown(button, remove = false) {
  if (!couple?.id || !user?.id) return;
  const title = $("countdownTitle").value.trim();
  const date = $("countdownDate").value;
  if (!remove && (!title || !date || date < countdownToday()))
    return appAlert("Escribe un nombre y elige una fecha de hoy en adelante.");
  const option = $("countdownSource").selectedOptions[0];
  const followsSelection =
    !remove && date === option.value && title === option.dataset.title;
  const pinned = resolveCountdown();
  const keepsLink =
    !remove && !option.value && date === pinned.date && title === pinned.title;
  const source = followsSelection
    ? option.dataset.source
    : keepsLink
      ? coupleSettings.countdown_source
      : null;
  const id = followsSelection
    ? option.dataset.id
    : keepsLink
      ? coupleSettings.countdown_source_id
      : null;
  await runCalendarTool(button, async () => {
    const { error } = await sb.from("couple_settings").upsert(
      {
        couple_id: couple.id,
        updated_by: user.id,
        countdown_source: source || null,
        countdown_source_id: id || null,
        countdown_title: remove ? null : title,
        countdown_date: remove ? null : date,
      },
      { onConflict: "couple_id" },
    );
    if (error) return appAlert("No se pudo guardar la cuenta regresiva.");
    coupleSettings.countdown_source = source || null;
    coupleSettings.countdown_source_id = id || null;
    coupleSettings.countdown_title = remove ? null : title;
    coupleSettings.countdown_date = remove ? null : date;
    closeAdvModal();
    renderAdvanced();
  });
}

async function openWeeklySummary() {
  const today = countdownToday();
  const last = dateKeyLocal(addDaysDate(parseDateOnly(today), 6));
  const upcoming = getPlanOccurrencesForRange(today, last).filter(
    (plan) => !plan.completed,
  );
  const dates = getImportantDateOccurrencesForRange(today, last);
  openAdvModal(
    "Los próximos siete días",
    `
    <h3>Planes</h3><div class="advList">${
      upcoming
        .map(
          (plan) => `<button class="btn" type="button"
      data-id="${esc(plan.id)}" data-date="${esc(plan._occurrenceDate)}"
      onclick="openAnalysisItem(this,true)">${esc(dateES(plan._occurrenceDate))} · ${esc(plan.title)}</button>`,
        )
        .join("") || "<p>Sin planes pendientes.</p>"
    }</div>
    <h3>Fechas especiales</h3><div class="advList">${
      dates
        .map(
          (event) => `<button class="btn" type="button"
      data-id="${esc(event.id)}" onclick="closeAdvModal();navigateToItem('dates',this.dataset.id)">${esc(dateES(event.date))} · ${esc(event.title)}</button>`,
        )
        .join("") || "<p>Sin fechas especiales.</p>"
    }</div>
    <h3>Tareas asignadas a mí</h3><div id="weeklyTasks" class="advList" aria-live="polite">Cargando…</div>`,
  );
  const container = $("weeklyTasks");
  const account = user?.id;
  const space = couple?.id;
  const ids = [...new Set(upcoming.map((plan) => plan.id))];
  if (!ids.length) {
    container.textContent = "Sin tareas pendientes.";
    return;
  }
  const { data, error } = await sb
    .from("plan_tasks")
    .select("plan_id,occurrence_date,title")
    .eq("assigned_to", account)
    .eq("completed", false)
    .in("plan_id", ids)
    .gte("occurrence_date", today)
    .lte("occurrence_date", last)
    .order("occurrence_date")
    .limit(100);
  if (!container.isConnected || user?.id !== account || couple?.id !== space)
    return;
  if (error) {
    container.textContent = "No se pudieron cargar las tareas.";
    return;
  }
  const valid = new Set(
    upcoming.map((plan) => plan.id + ":" + plan._occurrenceDate),
  );
  container.innerHTML =
    data
      .filter((task) => valid.has(task.plan_id + ":" + task.occurrence_date))
      .map(
        (
          task,
        ) => `<button type="button" class="btn" data-id="${esc(task.plan_id)}" data-date="${esc(task.occurrence_date)}"
    onclick="openAnalysisItem(this,true)">${esc(dateES(task.occurrence_date))} · ${esc(task.title)}</button>`,
      )
      .join("") || "<p>Sin tareas pendientes.</p>";
}

function openOccurrenceReschedule(date) {
  const plan = currentPlan;
  if (!plan?.recurrence_enabled) return;
  closeDetailModal();
  openAdvModal(
    "Mover fecha · " + plan.title,
    `<form class="advForm"
    data-plan="${esc(plan.id)}" data-date="${esc(date)}" onsubmit="event.preventDefault();saveOccurrenceReschedule(this)">
    <div class="field"><label for="rescheduleDate">Nueva fecha</label>
      <input id="rescheduleDate" type="date" required min="${countdownToday()}" value="${esc(date)}"></div>
    <div class="field"><label for="rescheduleTime">Hora</label>
      <input id="rescheduleTime" type="time" value="${esc(plan.plan_time?.slice(0, 5) || "")}"></div>
    <button class="btn primary" type="submit">Mover solo este plan</button>
  </form>`,
  );
}

async function saveOccurrenceReschedule(form) {
  const date = form.querySelector("#rescheduleDate").value;
  const time = form.querySelector("#rescheduleTime").value || null;
  const { plan, date: oldDate } = form.dataset;
  const original = plans.find((item) => item.id === plan);
  if (
    !original ||
    (date === oldDate && time === (original.plan_time?.slice(0, 5) || null))
  )
    return;
  await runCalendarTool(
    form.querySelector('button[type="submit"]'),
    async () => {
      const { data, error } = await sb.rpc("reschedule_plan_occurrence", {
        p_plan: plan,
        p_date: oldDate,
        p_new_date: date,
        p_new_time: time,
      });
      if (error || !data)
        return appAlert("No pudimos mover esta fecha del plan.");
      await loadPlans();
      await advLoadAll(["memories", "dates"]);
      closeAdvModal();
      openPlanDetail(data, date);
      showAppToast("Fecha del plan actualizada");
    },
  );
}

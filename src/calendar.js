function days(d) {
  return Math.max(
    0,

    Math.floor((Date.now() - d.getTime()) / 86400000),
  );
}

async function loadPlans() {
  if (!couple || !user) return;
  const context = couple.id + ":" + user.id;
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await sb
      .from("plans")
      .select("*")
      .eq("couple_id", couple.id)
      .order("plan_date")
      .order("id")
      .range(offset, offset + 499);
    if (context !== couple?.id + ":" + user?.id) return;
    if (error) {
      setConnectionStatus(
        "No pudimos actualizar los planes. Conservamos la última información disponible.",
      );
      return;
    }
    rows.push(...(data || []));
    if (!data || data.length < 500) break;
  }
  plans = rows;
  render();
}

function render() {
  $("month").textContent = months[view.getMonth()] + " " + view.getFullYear();

  const y = view.getFullYear();

  const m = view.getMonth();

  const first = new Date(y, m, 1);

  const start = (first.getDay() + 6) % 7;

  let html = "";

  for (let i = 0; i < 42; i++) {
    const d = new Date(y, m, i - start + 1);

    const k = iso(d);

    const events = getCalendarEventsForRange(k, k);

    html += `

      <div
        class="day
        ${d.getMonth() !== m ? "muted" : ""}
        ${k === iso(new Date()) ? "today" : ""}"

        onclick="handleDayClick('${k}')"
      >

        <b>
          ${d.getDate()}
        </b>

        ${events
          .map(
            (ev) =>
              `<div
                class="event ${ev.source !== "plan" ? "advanced-event" : ""}"
                onclick="event.stopPropagation();openCalendarEvent('${ev.source}','${ev.id}','${ev.date}')"
                title="${escapeHtml(ev.title)}"
                role="button"
                tabindex="0"
              >
                ${escapeHtml(ev.icon || "♡")} ${escapeHtml(ev.title)}
              </div>`,
          )
          .join("")}

      </div>

    `;
  }

  $("grid").innerHTML = html;

  renderNextPlan();
}

function renderNextPlan() {
  const next = getNextUpcomingPlan();
  if (next) {
    $("next").innerHTML =
      `<div class="nextTop">${categoryIcon(next.category)}</div><div class="nextBody"><div class="nextDate">${escapeHtml(formatDate(next._occurrenceDate))}${next.plan_time ? " · " + escapeHtml(formatTime(next.plan_time)) : ""}</div><b>${escapeHtml(next.title)}</b><div>${escapeHtml(next.note || "Un nuevo recuerdo para los dos.")}</div>${next.recurrence_enabled ? '<span class="seriesBadge">🔁 Recurrente</span>' : ""}</div>`;
    $("next").onclick = () => openPlanDetail(next.id, next._occurrenceDate);
  } else {
    $("next").innerHTML =
      `<div class="nextTop">♡</div><div class="nextBody">Todavía no hay planes futuros.<br>Agreguen el primero ❤️</div>`;
    $("next").onclick = () => openModal();
  }
}

function planCompletedOn(plan, date) {
  return plan.recurrence_enabled
    ? (plan.completed_occurrences || []).includes(date)
    : !!plan.completed;
}

function getPlanOccurrencesForRange(startKey, endKey) {
  const start = parseDateOnly(startKey),
    end = parseDateOnly(endKey),
    out = [];
  for (const plan of plans) {
    const base = parseDateOnly(plan.plan_date);
    if (
      !plan.recurrence_enabled ||
      !plan.recurrence_type ||
      plan.recurrence_type === "none"
    ) {
      if (plan.plan_date >= startKey && plan.plan_date <= endKey)
        out.push({ ...plan, _occurrenceDate: plan.plan_date });
      continue;
    }
    const limit = plan.recurrence_end_date
        ? parseDateOnly(plan.recurrence_end_date)
        : end,
      maxEnd = limit < end ? limit : end;
    if (maxEnd < start || maxEnd < base) continue;
    const interval = Math.max(1, Number(plan.recurrence_interval || 1));
    if (plan.recurrence_type === "daily") {
      for (let d = new Date(base); d <= maxEnd; d = addDaysDate(d, interval))
        if (d >= start && occurrenceAllowed(plan, d))
          out.push({ ...plan, _occurrenceDate: dateKeyLocal(d) });
    } else if (plan.recurrence_type === "weekly") {
      const days = (
        Array.isArray(plan.recurrence_days) && plan.recurrence_days.length
          ? plan.recurrence_days
          : [((base.getDay() + 6) % 7) + 1]
      ).map(Number);
      for (let d = new Date(base); d <= maxEnd; d = addDaysDate(d, 1)) {
        if (d < start) continue;
        const weeks = Math.floor((d - base) / 604800000),
          dow = ((d.getDay() + 6) % 7) + 1;
        if (
          weeks >= 0 &&
          weeks % interval === 0 &&
          days.includes(dow) &&
          occurrenceAllowed(plan, d)
        )
          out.push({ ...plan, _occurrenceDate: dateKeyLocal(d) });
      }
    } else if (plan.recurrence_type === "monthly") {
      let monthsDiff = Math.max(
        0,
        (start.getFullYear() - base.getFullYear()) * 12 +
          start.getMonth() -
          base.getMonth(),
      );
      let step = Math.floor(monthsDiff / interval) * interval;
      for (
        let d = addMonthsSafe(base, step);
        d <= maxEnd;
        d = addMonthsSafe(base, (step += interval))
      ) {
        const months =
          (d.getFullYear() - base.getFullYear()) * 12 +
          d.getMonth() -
          base.getMonth();
        if (
          months >= 0 &&
          months % interval === 0 &&
          d >= base &&
          d >= start &&
          occurrenceAllowed(plan, d)
        )
          out.push({ ...plan, _occurrenceDate: dateKeyLocal(d) });
      }
    } else if (plan.recurrence_type === "yearly") {
      const startYear = Math.max(base.getFullYear(), start.getFullYear());
      let y = startYear;
      while ((y - base.getFullYear()) % interval !== 0) y++;
      for (; y <= maxEnd.getFullYear(); y += interval) {
        const d = new Date(y, base.getMonth(), base.getDate());
        if (
          d.getMonth() === base.getMonth() &&
          d >= start &&
          d <= maxEnd &&
          d >= base &&
          occurrenceAllowed(plan, d)
        )
          out.push({ ...plan, _occurrenceDate: dateKeyLocal(d) });
      }
    }
  }
  return out
    .map((plan) => ({
      ...plan,
      completed: planCompletedOn(plan, plan._occurrenceDate),
    }))
    .sort((a, b) =>
      (a._occurrenceDate + " " + (a.plan_time || "")).localeCompare(
        b._occurrenceDate + " " + (b.plan_time || ""),
      ),
    );
}

function planOccurrenceStart(
  plan,
  date = plan._occurrenceDate || plan.plan_date,
) {
  return new Date(date + "T" + (plan.plan_time || "23:59:59.999") + "-05:00");
}

function getUpcomingPlanOccurrences(daysAhead = 730, now = new Date()) {
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const end = dateKeyLocal(addDaysDate(parseDateOnly(today), daysAhead));
  return getPlanOccurrencesForRange(today, end)
    .filter((plan) => planOccurrenceStart(plan) > now)
    .sort((a, b) => planOccurrenceStart(a) - planOccurrenceStart(b));
}

function getNextUpcomingPlan() {
  return getUpcomingPlanOccurrences(730).find((x) => !x.completed) || null;
}

function getAdvancedCalendarEventsForRange(startKey, endKey) {
  const out = getImportantDateOccurrencesForRange(startKey, endKey);
  const add = (source, id, date, title, icon, category) => {
    if (date && date >= startKey && date <= endKey)
      out.push({ source, id, date, title, icon, category });
  };
  for (const x of advCache.memories || [])
    add("memory", x.id, x.memory_date, x.title, "📸", x.category);
  for (const x of advCache.dreams || [])
    add("dream", x.id, x.target_date, x.title, "✨", x.category);
  for (const x of advCache.challenges || []) {
    add("challenge", x.id, x.start_date, x.title, "🎯", x.category);
    if (x.end_date && x.end_date !== x.start_date)
      add(
        "challenge",
        x.id + "-end",
        x.end_date,
        x.title + " · Fin",
        "🏁",
        x.category,
      );
  }
  for (const x of advCache.goals || [])
    add("goal", x.id, x.target_date, x.title, "💰", x.category);
  for (const x of advCache.places || [])
    add("place", x.id, x.visit_date, x.name, "📍", x.category);
  for (const x of advCache.letters || []) {
    if (x.unlock_at) {
      const d = new Date(x.unlock_at);
      if (!Number.isNaN(d.getTime()))
        add("letter", x.id, dateKeyLocal(d), x.title, "💌", x.category);
    }
  }
  return out;
}

function getCalendarEventsForRange(startKey, endKey) {
  const plansForRange = getPlanOccurrencesForRange(startKey, endKey).map(
    (p) => ({
      source: "plan",
      id: p.id,
      date: p._occurrenceDate,
      title: p.title,
      icon: categoryIcon(p.category),
      category: p.category,
      time: p.plan_time,
      completed: p.completed,
    }),
  );
  return [
    ...plansForRange,
    ...getAdvancedCalendarEventsForRange(startKey, endKey),
  ].sort((a, b) =>
    (a.date + " " + (a.time || "") + " " + a.title).localeCompare(
      b.date + " " + (b.time || "") + " " + b.title,
    ),
  );
}

function openCalendarEvent(source, id, date) {
  if (source === "plan") {
    openPlanDetail(id, date);
    return;
  }
  const tabMap = {
    date: "dates",
    memory: "memories",
    letter: "letters",
    dream: "dreams",
    challenge: "challenges",
    goal: "goals",
    place: "places",
  };
  const tab = tabMap[source];
  if (tab) {
    showAdvancedTab(tab);
    setTimeout(() => {
      const el = document.querySelector('[data-advanced-id="' + id + '"]');
      if (el) {
        el.classList.add("item-highlight");
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => el.classList.remove("item-highlight"), 1800);
      }
    }, 180);
  }
}

function move(n) {
  view.setMonth(view.getMonth() + n);

  render();
}

function today() {
  view = new Date();

  render();
}

function openModal(d) {
  $("modalTitle").textContent = "Agregar un plan ♡";

  $("modal").classList.remove("is-closing");
  $("modal").style.display = "grid";

  $("date").value = d || iso(view);

  $("title").value = "";

  $("time").value = "";

  $("cat").value = "cita";

  $("location").value = "";

  $("budget").value = "";

  $("noteInput").value = "";

  $("completed").value = "false";

  resetRecurrenceFields(d || iso(view));

  $("modal").dataset.editingId = "";

  setTimeout(() => $("title").focus(), 50);
}

function openEditModal(plan) {
  $("modalTitle").textContent = "Editar plan ✏️";

  $("modal").style.display = "grid";

  $("date").value = plan.plan_date || "";

  $("title").value = plan.title || "";

  $("time").value = plan.plan_time ? plan.plan_time.slice(0, 5) : "";

  $("cat").value = plan.category || "cita";

  $("location").value = plan.location || "";

  $("budget").value = plan.budget ?? "";

  $("noteInput").value = plan.note || "";

  $("completed").value = plan.completed ? "true" : "false";

  setRecurrenceFields(plan);

  $("modal").dataset.editingId = plan.id;

  setTimeout(() => $("title").focus(), 50);
}

function closeModal() {
  const modal = $("modal");
  modal.classList.add("is-closing");
  window.setTimeout(() => {
    if (modal.classList.contains("is-closing")) {
      modal.style.display = "none";
      modal.classList.remove("is-closing");
    }
  }, 210);
}

function syncRecurrenceUI() {
  const enabled = $("recurrenceEnabled")?.checked;
  $("completed").closest(".field").hidden = !!enabled;
  const opts = $("recurrenceOptions");
  if (opts) opts.classList.toggle("hidden", !enabled);
  const type = $("recurrenceType")?.value;
  const weekly = $("weeklyDaysBox");
  if (weekly) weekly.classList.toggle("hidden", !enabled || type !== "weekly");
}

function defaultRecurrenceDay(date) {
  const d = parseDateOnly(date || iso(new Date()));
  return ((d.getDay() + 6) % 7) + 1;
}

function resetRecurrenceFields(date) {
  if (!$("recurrenceEnabled")) return;
  $("recurrenceEnabled").checked = false;
  $("recurrenceType").value = "weekly";
  $("recurrenceInterval").value = "1";
  $("recurrenceEndDate").value = "";
  document
    .querySelectorAll('input[name="recurrenceDay"]')
    .forEach(
      (x) => (x.checked = Number(x.value) === defaultRecurrenceDay(date)),
    );
  syncRecurrenceUI();
}

function setRecurrenceFields(plan) {
  if (!$("recurrenceEnabled")) return;
  const enabled = !!plan.recurrence_enabled;
  $("recurrenceEnabled").checked = enabled;
  $("recurrenceType").value =
    plan.recurrence_type && plan.recurrence_type !== "none"
      ? plan.recurrence_type
      : "weekly";
  $("recurrenceInterval").value = plan.recurrence_interval || 1;
  $("recurrenceEndDate").value = plan.recurrence_end_date || "";
  const days =
    Array.isArray(plan.recurrence_days) && plan.recurrence_days.length
      ? plan.recurrence_days
      : [defaultRecurrenceDay(plan.plan_date)];
  document
    .querySelectorAll('input[name="recurrenceDay"]')
    .forEach((x) => (x.checked = days.includes(Number(x.value))));
  syncRecurrenceUI();
}

async function savePlan() {
  if (!couple || !user) {
    appAlert("Tu sesión no está lista.");

    return;
  }

  const title = $("title").value.trim();

  if (!title) {
    appAlert("Escribe un nombre para el plan ❤️");

    return;
  }

  const editingId = $("modal").dataset.editingId;

  const planData = {
    title: title,

    plan_date: $("date").value,

    plan_time: $("time").value || null,

    category: $("cat").value,

    location: window.selectedPlaceById?.($("planPlaceId")?.value)?.name || null,
    place_id: $("planPlaceId")?.value || null,

    note: $("noteInput").value.trim() || null,

    budget: $("budget").value ? Number($("budget").value) : null,

    completed:
      !$("recurrenceEnabled").checked && $("completed").value === "true",

    recurrence_enabled: $("recurrenceEnabled").checked,
    recurrence_type: $("recurrenceEnabled").checked
      ? $("recurrenceType").value
      : "none",
    recurrence_interval: $("recurrenceEnabled").checked
      ? Math.max(1, Number($("recurrenceInterval").value || 1))
      : 1,
    recurrence_days:
      $("recurrenceEnabled").checked && $("recurrenceType").value === "weekly"
        ? Array.from(
            document.querySelectorAll('input[name="recurrenceDay"]:checked'),
          ).map((x) => Number(x.value))
        : null,
    recurrence_end_date: $("recurrenceEnabled").checked
      ? $("recurrenceEndDate").value || null
      : null,
  };

  let error;
  let createdPlanId = null;

  if (editingId) {
    const result = await sb

      .from("plans")

      .update(planData)

      .eq("id", editingId)

      .eq("couple_id", couple.id);

    error = result.error;
  } else {
    const result = await sb
      .from("plans")
      .insert({ couple_id: couple.id, ...planData, created_by: user.id })
      .select("id")
      .single();
    error = result.error;
    if (!error) createdPlanId = result.data?.id;
  }

  if (error) {
    console.error(error);

    appAlert("No pudimos guardar el plan: " + error.message);

    return;
  }

  closeModal();
  await loadPlans();
  const planOwnerName =
    myProfile?.display_name ||
    coupleProfiles.find((p) => p.user_id === user.id)?.display_name ||
    "Tu pareja";
  if (!editingId && createdPlanId)
    await createPartnerNotification({
      event_type: "plan_created",
      title: "Nuevo plan en el calendario ❤️",
      body:
        planOwnerName +
        " agregó «" +
        title +
        "» para el " +
        formatDate(planData.plan_date) +
        ".",
      target_tab: "calendar",
      target_id: createdPlanId,
    });
  else if (editingId)
    await createPartnerNotification({
      event_type: "plan_updated",
      title: "Plan actualizado 🗓️",
      body: planOwnerName + " actualizó «" + title + "» en el calendario.",
      target_tab: "calendar",
      target_id: editingId,
    });
}

function openPlansModal(date) {
  currentDay = date;

  const dayPlans = getCalendarEventsForRange(date, date);

  $("plansModalDate").textContent = formatDate(date);

  $("plansList").innerHTML = dayPlans
    .map(
      (ev) => `
          <button class="planOption" onclick="openCalendarEvent('${ev.source}','${ev.id}','${ev.date}')">
            <div class="planOptionTitle">${escapeHtml(ev.icon || "♡")} ${escapeHtml(ev.title)}</div>
            <div class="planOptionMeta">${ev.source === "plan" ? categoryName(ev.category) : "Fecha especial"}${ev.time ? " · " + escapeHtml(formatTime(ev.time)) : ""}${ev.completed ? " · ✓ Completado" : ""}</div>
          </button>
        `,
    )
    .join("");

  $("addFromDayBtn").onclick = () => {
    closePlansModal();

    openModal(currentDay);
  };

  $("plansModal").style.display = "grid";
}

function closePlansModal() {
  $("plansModal").style.display = "none";
}

function openPlanDetail(id, occurrenceDate) {
  const plan = plans.find((p) => p.id === id);

  if (!plan) return;

  currentPlan = plan;
  const date = occurrenceDate || plan.plan_date;
  const completed = planCompletedOn(plan, date);

  closePlansModal();

  $("detailIcon").textContent = categoryIcon(plan.category);

  $("detailTitle").textContent = plan.title;

  $("detailDate").textContent = formatDate(occurrenceDate || plan.plan_date);

  $("detailCompleted").innerHTML = completed
    ? '<span class="completedBadge">✓ Plan completado ❤️</span>'
    : '<span class="completedBadge pendingBadge">Pendiente</span>';

  let rows = "";
  if (plan.recurrence_enabled) {
    const typeNames = {
      daily: "día(s)",
      weekly: "semana(s)",
      monthly: "mes(es)",
      yearly: "año(s)",
    };
    rows += `<div class="detailRow"><div class="detailEmoji">🔁</div><div class="detailContent"><div class="detailLabel">Repetición</div><div class="detailValue">Cada ${plan.recurrence_interval || 1} ${typeNames[plan.recurrence_type] || "periodo"}${plan.recurrence_end_date ? " · hasta " + formatDate(plan.recurrence_end_date) : ""}</div></div></div>`;
  }

  rows += `

    <div class="detailRow">

      <div class="detailEmoji">
        🏷️
      </div>

      <div class="detailContent">

        <div class="detailLabel">
          Categoría
        </div>

        <div class="detailValue">
          ${escapeHtml(categoryName(plan.category))}
        </div>

      </div>

    </div>

  `;

  if (plan.plan_time) {
    rows += `

      <div class="detailRow">

        <div class="detailEmoji">
          🕐
        </div>

        <div class="detailContent">

          <div class="detailLabel">
            Hora
          </div>

          <div class="detailValue">
            ${escapeHtml(formatTime(plan.plan_time))}
          </div>

        </div>

      </div>

    `;
  }

  if (plan.location) {
    rows += `

      <div class="detailRow">

        <div class="detailEmoji">
          📍
        </div>

        <div class="detailContent">

          <div class="detailLabel">
            Lugar
          </div>

          <div class="detailValue">
            ${plan.place_id && window.selectedPlaceById && window.selectedPlaceById(plan.place_id) ? window.placeLinkHtml(plan.place_id, window.selectedPlaceById(plan.place_id).name) : escapeHtml(plan.location)}
          </div>

        </div>

      </div>

    `;
  }

  if (plan.budget !== null && plan.budget !== undefined) {
    rows += `

      <div class="detailRow">

        <div class="detailEmoji">
          💰
        </div>

        <div class="detailContent">

          <div class="detailLabel">
            Presupuesto
          </div>

          <div class="detailValue">
            ${escapeHtml(formatMoney(plan.budget))}
          </div>

        </div>

      </div>

    `;
  }

  if (plan.note) {
    rows += `

      <div class="detailRow">

        <div class="detailEmoji">
          💌
        </div>

        <div class="detailContent">

          <div class="detailLabel">
            Nota
          </div>

          <div class="detailValue">
            ${escapeHtml(plan.note)}
          </div>

        </div>

      </div>

    `;
  }

  if (completed || planOccurrenceStart(plan, date) <= new Date()) {
    rows += `<button class="btn" data-plan-date="${esc(date)}" onclick="openMemoryFromPlan(this.dataset.planDate)">📸 Guardar como recuerdo</button>`;
  }
  rows =
    `<button type="button" class="btn primary" data-plan-date="${esc(date)}"
    onclick="toggleCurrentPlanCompleted(this)">${completed ? "↩ Reabrir plan" : "✓ Marcar como completado"}</button>` +
    rows;
  rows += `<div class="modalBtns"><button class="btn" type="button" data-plan-date="${esc(date)}" onclick="openPlanTasks(this)">☑ Pendientes del plan</button></div>`;
  $("detailRows").innerHTML = rows;

  $("detailModal").style.display = "grid";
}

async function toggleCurrentPlanCompleted(button) {
  if (!currentPlan || !couple || button.disabled) return;
  const plan = currentPlan;
  const space = couple.id;
  const date = button.dataset.planDate;
  const completed = !planCompletedOn(plan, date);
  button.disabled = true;
  try {
    const { data, error } = plan.recurrence_enabled
      ? await sb.rpc("set_plan_occurrence_completed", {
          p_plan: plan.id,
          p_date: date,
          p_completed: completed,
        })
      : await sb
          .from("plans")
          .update({ completed })
          .eq("id", plan.id)
          .eq("couple_id", space)
          .select("id")
          .single();
    if (error || !data)
      return appAlert("No pudimos actualizar el plan. Vuelve a intentarlo.");
    if (couple?.id !== space) return;
    await loadPlans();
    if (currentPlan === plan && couple?.id === space)
      openPlanDetail(plan.id, date);
    showAppToast(completed ? "Plan completado ❤️" : "Plan reabierto");
  } finally {
    button.disabled = false;
  }
}

function editCurrentPlan() {
  if (!currentPlan) return;

  const plan = currentPlan;

  closeDetailModal();

  openEditModal(plan);
}

async function deleteCurrentPlan() {
  if (!currentPlan) return;

  const confirmed = await appConfirm(
    '¿Seguro que quieres eliminar "' + currentPlan.title + '"? ❤️',
  );

  if (!confirmed) return;

  return withTransactionIndicator(performConfirmedPlanDeletion)();
}

async function performConfirmedPlanDeletion() {
  const { error } = await sb

    .from("plans")

    .delete()

    .eq("id", currentPlan.id)

    .eq("couple_id", couple.id);

  if (error) {
    console.error(error);

    appAlert("No pudimos eliminar el plan: " + error.message);

    return;
  }

  await createPartnerNotification({
    event_type: "plan_deleted",
    title: "Plan eliminado del calendario",
    body:
      (myProfile?.display_name || defaultDisplayName()) +
      " eliminó «" +
      currentPlan.title +
      "» del calendario.",
    target_tab: "calendar",
  });
  closeDetailModal();

  await loadPlans();
}

async function installCalendarApp() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    return;
  }
  appAlert(
    "En Android abre este sitio en Chrome, toca el menú ⋮ y elige “Instalar aplicación” o “Añadir a pantalla de inicio”. En PC, busca el icono de instalación en la barra de direcciones.",
  );
}

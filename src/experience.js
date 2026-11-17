function openMemoryFromPlan(date, addAnother = false) {
  const plan = currentPlan;
  if (!plan) return;
  const existing = advCache.memories.find(
    (memory) =>
      memory.source_plan_id === plan.id &&
      memory.source_occurrence_date === date,
  );
  closeDetailModal();
  if (existing && !addAnother) return openOutingAlbum(plan.id, date);
  window.openMemoryForm();
  $("adv_title").value = plan.title;
  $("adv_memory_date").value = date;
  $("adv_description").value = plan.note || "";
  if ($("adv_place_id")) $("adv_place_id").value = plan.place_id || "";
  const origin = document.createElement("input");
  origin.type = "hidden";
  origin.id = "memoryOrigin";
  origin.dataset.plan = plan.id;
  origin.dataset.date = date;
  origin.dataset.location = plan.location || "";
  $("advModalBody").append(origin);
}

function memoryPlanLink(memory) {
  if (
    !memory.source_plan_id ||
    !plans.some((plan) => plan.id === memory.source_plan_id)
  )
    return "";
  return `<button type="button" class="btn" data-plan="${esc(memory.source_plan_id)}"
    data-date="${esc(memory.source_occurrence_date)}"
    onclick="showAdvancedTab('calendar');openPlanDetail(this.dataset.plan,this.dataset.date)">Ver plan original</button>`;
}

function placeMemoryButton(place) {
  const count = advCache.memories.filter(
    (memory) => memory.place_id === place.id,
  ).length;
  if (!count) return "";
  return `<button type="button" class="btn" data-place="${esc(place.id)}"
    onclick="openPlaceMemories(this.dataset.place)">📸 Recuerdos (${count})</button>`;
}

function openPlaceMemories(id) {
  const place = advCache.places.find((item) => item.id === id);
  if (!place) return;
  const list = advCache.memories.filter((memory) => memory.place_id === id);
  openAdvModal(
    place.name,
    list
      .map(
        (memory) => `<div class="advItem">
    <div>${memory.photo_url ? `<img class="advPhoto" alt="${esc(memory.title)}" data-memory-path="${esc(memory.photo_url)}">` : ""}
    <strong>${esc(memory.title)}</strong><p>${dateES(memory.memory_date)}</p>
    <button class="btn" data-memory="${esc(memory.id)}" onclick="closeAdvModal();navigateToItem('memories',this.dataset.memory)">Abrir recuerdo</button></div></div>`,
      )
      .join(""),
  );
  hydrateMemoryImages();
}

function goalProjection(goal, date = countdownToday()) {
  if (!Number(goal.target_amount)) return "";
  const remaining = Math.max(
    0,
    Number(goal.target_amount) - Number(goal.current_amount || 0),
  );
  if (!remaining) return '<div class="advMeta">Monto objetivo alcanzado</div>';
  const days = Math.round(
    (Date.parse(goal.target_date) - Date.parse(date)) / 86400000,
  );
  const suggestion = !goal.target_date
    ? ""
    : days < 0
      ? " · Fecha objetivo vencida"
      : " · Ahorro mensual sugerido: " +
        money(Math.ceil(remaining / Math.max(1, Math.ceil(days / 30))));
  return `<div class="advMeta">Faltan ${money(remaining)}${suggestion}</div>`;
}

function monthlyRecapCard(showDetails = true) {
  const month = countdownToday().slice(0, 7);
  const completed = analysisOccurrences(month).filter(
    (plan) => plan.completed && !plan.cancelled,
  );
  const memories = advCache.memories.filter((memory) =>
    memory.memory_date?.startsWith(month),
  );
  const featured =
    memories.find((memory) => memory.favorite && memory.photo_url) ||
    memories.find((memory) => memory.photo_url);
  return `<section class="advCard"><h3>Así va nuestro mes</h3>
    <p>${completed.length} planes completados · ${memories.length} recuerdos</p>
    ${
      featured
        ? `<button class="btn" data-memory="${esc(featured.id)}" onclick="closeAdvModal();navigateToItem('memories',this.dataset.memory)">
      <img class="advPhoto" data-memory-path="${esc(featured.photo_url)}" alt="" loading="lazy">
      ${esc(featured.title)}</button>`
        : ""
    }
    ${showDetails ? '<button class="btn" type="button" onclick="openMonthlyRecap()">Ver resumen del mes</button>' : ""}
  </section>`;
}

async function openMonthlyRecap() {
  const month = countdownToday().slice(0, 7);
  const account = user?.id;
  const space = couple?.id;
  if (!space) return;
  openAdvModal(
    albumMonthLabel(month),
    `${monthlyRecapCard(false)}
    <section class="advCard"><h3>Avance de las metas este mes</h3><div id="monthlyGoalProgress" aria-live="polite">Cargando…</div></section>`,
  );
  hydrateMemoryImages();
  const container = $("monthlyGoalProgress");
  const { data, error } = await sb.rpc("monthly_goal_progress", {
    p_couple: space,
    p_start: month + "-01",
  });
  if (!container.isConnected || account !== user?.id || space !== couple?.id)
    return;
  if (error) {
    container.textContent = "No se pudo cargar el avance de las metas.";
    return;
  }
  const changes = new Map(data.map((row) => [row.goal_id, Number(row.change)]));
  container.innerHTML =
    advCache.goals
      .map((goal) => {
        const change = changes.get(goal.id) || 0;
        return `<div class="advItem"><div><strong>${esc(goal.title)}</strong>
      <div class="advMeta">Cambio neto del mes: ${change > 0 ? "+" : ""}${money(change)}</div>
      ${goalProjection(goal)}</div></div>`;
      })
      .join("") || "<p>Todavía no hay metas.</p>";
}

function outingMemories(id, date) {
  return advCache.memories.filter(
    (memory) =>
      memory.source_plan_id === id && memory.source_occurrence_date === date,
  );
}

function openOutingAlbum(id, date) {
  const plan = plans.find((item) => item.id === id);
  if (!plan) return;
  const memories = outingMemories(id, date);
  openAdvModal(
    plan.title + " · " + dateES(date),
    `<div class="advActions">
    <button class="btn primary" type="button" data-plan="${esc(id)}" data-date="${esc(date)}"
      onclick="addOutingMemory(this)">Añadir foto o nota</button>
    <button class="btn" type="button" data-plan="${esc(id)}" data-date="${esc(date)}"
      onclick="downloadOutingAlbum(this)">Descargar PDF</button></div>
    <div class="advList">${memories
      .map(
        (memory) => `<article class="advCard"><h3>${esc(memory.title)}</h3>
      ${memory.photo_url ? `<img class="advPhoto" data-memory-path="${esc(memory.photo_url)}" alt="${esc(memory.title)}">` : ""}
      <p>${esc(memory.description || "")}</p><button class="btn" type="button" data-id="${esc(memory.id)}" onclick="closeAdvModal();navigateToItem('memories',this.dataset.id)">Ver recuerdo</button>
    </article>`,
      )
      .join("")}</div>`,
  );
  hydrateMemoryImages();
}

function addOutingMemory(button) {
  const plan = plans.find((item) => item.id === button.dataset.plan);
  if (!plan) return;
  currentPlan = plan;
  openMemoryFromPlan(button.dataset.date, true);
}

async function downloadOutingAlbum(button) {
  const { plan, date } = button.dataset;
  const memories = outingMemories(plan, date);
  if (!memories.length) return;
  const account = user?.id;
  const space = couple?.id;
  const active = () =>
    button.isConnected && user?.id === account && couple?.id === space;
  await runCalendarTool(button, async () => {
    const { blob, missing } = await buildMemoryAlbum(
      [[date.slice(0, 7), memories]],
      (status) => {
        button.textContent = status;
      },
      active,
      plans.find((item) => item.id === plan)?.title,
    );
    if (!active()) return;
    const anchor = document.createElement("a");
    const url = URL.createObjectURL(blob);
    anchor.href = url;
    anchor.download = "album-salida-" + date + ".pdf";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    button.textContent = missing
      ? "PDF descargado con fotos pendientes"
      : "Descargar PDF";
  });
}

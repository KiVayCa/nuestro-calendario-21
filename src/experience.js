function openMemoryFromPlan(date) {
  const plan = currentPlan;
  if (!plan) return;
  const existing = advCache.memories.find(
    (memory) =>
      memory.source_plan_id === plan.id &&
      memory.source_occurrence_date === date,
  );
  closeDetailModal();
  if (existing) return navigateToItem("memories", existing.id);
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

function goalProjection(goal) {
  if (!Number(goal.target_amount)) return "";
  const remaining = Math.max(
    0,
    Number(goal.target_amount) - Number(goal.current_amount || 0),
  );
  if (!remaining) return '<div class="advMeta">Monto objetivo alcanzado</div>';
  let suggestion = "";
  if (goal.target_date) {
    const deadline = parseDateOnly(goal.target_date);
    const today = parseDateOnly(dateKeyLocal(new Date()));
    const days = Math.round((deadline - today) / 86400000);
    suggestion =
      days >= 0
        ? " · Ahorro mensual sugerido: " +
          money(Math.ceil(remaining / Math.max(1, Math.ceil(days / 30))))
        : " · Fecha objetivo vencida";
  }
  return `<div class="advMeta">Faltan ${money(remaining)}${suggestion}</div>`;
}

function monthlyRecapCard() {
  const month = dateKeyLocal(new Date()).slice(0, 7);
  const completed = plans.filter(
    (plan) => plan.completed && plan.plan_date?.startsWith(month),
  );
  const memories = advCache.memories.filter((memory) =>
    memory.memory_date?.startsWith(month),
  );
  const goals = advCache.goals.filter(
    (goal) => goal.completed && goal.updated_at?.startsWith(month),
  );
  return `<section class="advCard"><h3>Así va nuestro mes</h3>
    <p>${completed.length} planes completados · ${memories.length} recuerdos · ${goals.length} metas cumplidas actualizadas</p>
    ${memories
      .slice(0, 3)
      .map(
        (memory) => `<button class="btn" data-memory="${esc(memory.id)}"
      onclick="navigateToItem('memories',this.dataset.memory)">${esc(memory.title)}</button>`,
      )
      .join(" ")}</section>`;
}

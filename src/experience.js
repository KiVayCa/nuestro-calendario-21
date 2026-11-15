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

async function exportMemories(button) {
  if (!advCache.memories.length)
    return appAlert("Todavía no tienen recuerdos para descargar.");
  const memories = [...advCache.memories];
  const session = user?.id;
  const space = couple?.id;
  const sections = [];
  let unavailable = 0;
  button.disabled = true;
  try {
    for (const [index, memory] of memories.entries()) {
      if (session !== user?.id || space !== couple?.id) return;
      button.textContent = `Preparando ${index + 1} de ${memories.length}…`;
      let photo = "";
      if (memory.photo_url) {
        try {
          const url = await memoryImageUrl(memory.photo_url);
          if (!url) throw new Error("Foto no disponible");
          const response = await fetch(url, {
            signal: AbortSignal.timeout(20000),
          });
          if (!response.ok) throw new Error("Foto no disponible");
          const blob = await response.blob();
          if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(blob.type))
            throw new Error("Formato de foto no admitido");
          const encoded = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          photo = `<img alt="${esc(memory.title)}" src="${esc(encoded)}">`;
        } catch {
          unavailable++;
        }
      }
      sections.push(
        `<article><h2>${esc(memory.title)}</h2><p>${esc(memory.memory_date)} · ${esc(memory.location || "")}</p>${photo}<p>${esc(memory.description || "")}</p></article>`,
      );
    }
    if (session !== user?.id || space !== couple?.id) return;
    const file = new Blob(
      [
        '<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Nuestros recuerdos</title><style>body{font:16px system-ui;max-width:760px;margin:auto;padding:24px}article{margin:2rem 0}img{max-width:100%;max-height:500px}p{white-space:pre-wrap}</style><h1>Nuestros recuerdos</h1>',
        ...sections,
        "</html>",
      ],
      { type: "text/html;charset=utf-8" },
    );
    const link = document.createElement("a");
    link.href = URL.createObjectURL(file);
    link.download = "nuestros-recuerdos-" + dateKeyLocal(new Date()) + ".html";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 60000);
    if (unavailable)
      appAlert(
        `Se descargó la historia. ${unavailable} foto(s) no se pudieron incluir.`,
      );
  } finally {
    button.disabled = false;
    button.textContent = "Descargar recuerdos y fotos";
  }
}

// Media links are short-lived presentation data, never database values.
const mediaUrls = new Map();
const pendingMediaUrls = new Map();
let memoryFilters = { query: "", year: "", favorites: false };

function memoryStoragePath(value) {
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return value.startsWith("/") ? null : value;
  try {
    const url = new URL(value);
    if (url.origin !== new URL(SUPABASE_URL).origin) return null;
    const match = url.pathname.match(
      /^\/storage\/v1\/object\/(?:sign|public|authenticated)\/couple-media\/(.+)$/,
    );
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

async function memoryImageUrl(value) {
  const path = memoryStoragePath(value);
  if (!path) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : null;
    } catch {
      return null;
    }
  }
  const cacheKey = SUPABASE_URL + ":" + user?.id + ":" + path;
  const cached = mediaUrls.get(cacheKey);
  if (cached && cached.expires > Date.now() + 60000) return cached.url;
  if (pendingMediaUrls.has(cacheKey)) return pendingMediaUrls.get(cacheKey);
  const request = (async () => {
    const { data, error } = await sb.storage
      .from("couple-media")
      .createSignedUrl(path, 3600);
    if (error) throw error;
    mediaUrls.set(cacheKey, {
      url: data.signedUrl,
      expires: Date.now() + 3600000,
    });
    return data.signedUrl;
  })().finally(() => pendingMediaUrls.delete(cacheKey));
  pendingMediaUrls.set(cacheKey, request);
  return request;
}

function hydrateMemoryImages() {
  document.querySelectorAll("img[data-memory-path]").forEach(async (image) => {
    const value = image.dataset.memoryPath;
    try {
      const url = await memoryImageUrl(value);
      if (!image.isConnected || image.dataset.memoryPath !== value) return;
      if (!url) throw new Error("Imagen no disponible");
      image.src = url;
      image.onerror = () => {
        image.alt = "No pudimos abrir esta foto. Vuelve a cargar Recuerdos.";
        image.classList.add("imageUnavailable");
      };
    } catch {
      if (image.isConnected) {
        image.alt = "Foto no disponible. Comprueba tu conexión.";
        image.classList.add("imageUnavailable");
      }
    }
  });
}

function validateMemoryFile(file) {
  if (
    !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)
  ) {
    appAlert("Selecciona una imagen JPG, PNG, WebP o GIF.");
    return false;
  }
  if (file.size > 15 * 1024 * 1024) {
    appAlert("La foto supera 15 MB. Usa una versión más pequeña.");
    return false;
  }
  return true;
}

function filteredMemories() {
  const query = memoryFilters.query.trim().toLocaleLowerCase("es");
  return advCache.memories.filter(
    (memory) =>
      (!memoryFilters.favorites || memory.favorite) &&
      (!memoryFilters.year ||
        memory.memory_date?.startsWith(memoryFilters.year)) &&
      (!query ||
        [memory.title, memory.description, memory.location]
          .join(" ")
          .toLocaleLowerCase("es")
          .includes(query)),
  );
}

function memoryFilterToolbar() {
  const years = [
    ...new Set(
      advCache.memories
        .map((item) => item.memory_date?.slice(0, 4))
        .filter(Boolean),
    ),
  ]
    .sort()
    .reverse();
  return `<form class="memoryFilters" onsubmit="event.preventDefault();applyMemoryFilters()">
    <label>Buscar recuerdos<input id="memorySearch" type="search" value="${esc(memoryFilters.query)}" placeholder="Título, historia o lugar"></label>
    <label>Año<select id="memoryYear"><option value="">Todos</option>${years.map((year) => `<option ${year === memoryFilters.year ? "selected" : ""}>${esc(year)}</option>`).join("")}</select></label>
    <label class="filterCheck"><input id="memoryFavorites" type="checkbox" ${memoryFilters.favorites ? "checked" : ""}> Solo favoritos</label>
    <button class="btn" type="submit">Buscar</button>
    <button class="btn" type="button" onclick="clearMemoryFilters()">Limpiar</button>
    <span role="status">${filteredMemories().length} de ${advCache.memories.length}</span>
  </form>`;
}

function applyMemoryFilters() {
  memoryFilters = {
    query: $("memorySearch").value,
    year: $("memoryYear").value,
    favorites: $("memoryFavorites").checked,
  };
  renderAdvanced();
}
function clearMemoryFilters() {
  memoryFilters = { query: "", year: "", favorites: false };
  renderAdvanced();
}

function reminderOccurrenceDate(note) {
  if (
    note?.target_tab === "calendar" &&
    /^\d{4}-\d{2}-\d{2}$/.test(note.target_date || "")
  )
    return note.target_date;
  return ["plan_reminder", "task_reminder"].includes(note?.event_type)
    ? /^(?:plan|task):[^:]+:(\d{4}-\d{2}-\d{2}):/.exec(
        note.reminder_key || "",
      )?.[1]
    : undefined;
}

function navigateToItem(tab, id, date) {
  if (!validAdvancedTabs.has(tab)) tab = "notifications";
  if (tab==='futuro'&&id&&[...(advCache.wedding||[]),...(advCache.weddingItems||[])].some(r=>r.id===id))tab='matrimonio';
  if(tab==='matrimonio'){weddingFilter=(advCache.weddingItems||[]).find(r=>r.id===id)?.kind||'overview';if((advCache.wedding||[]).some(r=>r.id===id))id=null;}
  if (tab === "letters" && id && (advCache.capsules||[]).some(c=>c.id===id)) tab="capsulas";
  if (tab === "letters" && id && (advCache.music||[]).some(c=>c.id===id)) tab="musica";
  if (tab === "musica" && id) musicFilter="all";
  if (tab === "capsulas" && id) capsuleFilter="all";
  if (tab === "question") { window.__nc21SelectedQuestionDate=null;knowingCategory="today"; }
  if (tab === "memories" && id)
    memoryFilters = { query: "", year: "", favorites: false };
  if (tab === "futuro" && id) futureFilter = "all";
  if ((tab === "aventuras" || tab === "juegos") && id) {
    const match=(advCache.gameMatches||[]).find(m=>m.id===id);
    if(match){tab="juegos";gameMode=match.kind;gameActiveId=id;gameSolo=null;}
    else if(tab==="aventuras")adventureFilter="all";
  }
  showAdvancedTab(tab);
  if (tab === "calendar" && !id && /^\d{4}-\d{2}-\d{2}$/.test(date || "")) {
    const selected = parseDateOnly(date);
    if (!Number.isNaN(selected.getTime()) && dateKeyLocal(selected) === date) {
      view = selected;
      render();
    }
    return;
  }
  if (!id) return;
  if (tab === "calendar") {
    if (plans.some((plan) => plan.id === id))
      openPlanDetail(
        id,
        /^\d{4}-\d{2}-\d{2}$/.test(date || "") ? date : undefined,
      );
    else showAppToast("Este plan ya no está disponible.");
    return;
  }
  requestAnimationFrame(() => {
    const card = [...document.querySelectorAll("[data-advanced-id]")].find(
      (element) => element.dataset.advancedId === id,
    );
    if (!card) {
      showAppToast(
        "El elemento ya no está disponible o aún no puedes abrirlo.",
      );
      return;
    }
    card.classList.add("item-highlight");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.setAttribute("tabindex", "-1");
    card.focus({ preventScroll: true });
    setTimeout(() => card.classList.remove("item-highlight"), 2500);
  });
}

function scheduleIdea(id) {
  const idea = advCache.ideas.find((item) => item.id === id);
  if (!idea) return showAppToast("Esta idea ya no está disponible.");
  showAdvancedTab("calendar");
  openModal(localISODate());
  $("title").value = idea.title;
  $("noteInput").value = idea.description || "";
  $("budget").value = idea.estimated_budget ?? "";
  const place = selectedPlaceById(idea.place_id);
  if ($("planPlaceId")) $("planPlaceId").value = idea.place_id || "";
  $("location").value = place?.name || "";
  $("modal").dataset.ideaPlaceId = idea.place_id || "";
}

async function openGoalHistory(id) {
  const goal = advCache.goals.find((item) => item.id === id);
  if (!goal) return;
  openAdvModal(
    "Movimientos de " + goal.title,
    '<div id="goalHistoryContent" role="status">Cargando movimientos…</div>',
  );
  const container = $("goalHistoryContent");
  const account = user?.id;
  const space = couple.id;
  const { data, error } = await sb
    .from("goal_movements")
    .select("*")
    .eq("goal_id", id)
    .eq("couple_id", couple.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (!container.isConnected || account !== user?.id || space !== couple?.id)
    return;
  if (error) {
    container.textContent =
      "No pudimos consultar el historial. Inténtalo de nuevo.";
    return;
  }
  const names = new Map(
    coupleProfiles.map((profile) => [profile.user_id, profile.display_name]),
  );
  const month = countdownToday().slice(0, 7);
  const byPerson = new Map();
  for (const row of data) {
    if (row.kind === "opening" || Number(row.amount) <= 0) continue;
    const totals = byPerson.get(row.created_by) || { total: 0, month: 0 };
    totals.total += Number(row.amount);
    const localDate = new Date(
      new Date(row.created_at).getTime() - 5 * 3600000,
    );
    if (localDate.toISOString().startsWith(month))
      totals.month += Number(row.amount);
    byPerson.set(row.created_by, totals);
  }
  const summary = [...byPerson]
    .map(
      ([id, totals]) =>
        `<li>${esc(names.get(id) || "Integrante")} · este mes ${money(totals.month)} · total visible ${money(totals.total)}</li>`,
    )
    .join("");
  container.innerHTML = `<p>Saldo actual <strong>${money(goal.current_amount)}</strong></p>${summary ? `<h3>Aportes por persona</h3><ul>${summary}</ul>` : ""}<div class="advList">${data.length ? data.map((row) => `<div class="advItem"><div><strong>${row.kind === "opening" ? "Saldo inicial" : Number(row.amount) > 0 ? "Aporte" : "Retiro"} · ${money(Math.abs(row.amount))}</strong><div class="advMeta">${esc(names.get(row.created_by) || "Integrante")} · ${new Date(row.created_at).toLocaleString("es-CO")}</div><p>${esc(row.note || "")}</p><span>Saldo después del movimiento ${money(row.balance_after)}</span></div></div>`).join("") : "<p>Todavía no hay movimientos.</p>"}</div>${data.length === 200 ? "<p>Se muestran los 200 movimientos más recientes.</p>" : ""}`;
  const history = document.createElement("section");
  history.className = "advCard";
  history.innerHTML = `<h3>Proyección de ahorro</h3>${goalProjection(goal)}
    <div aria-live="polite">Cargando historial…</div>`;
  container.prepend(history);
  const snapshots = await sb
    .from("goal_projection_history")
    .select("current_amount,target_amount,target_date,captured_at")
    .eq("goal_id", id)
    .order("captured_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(50);
  if (!history.isConnected || account !== user?.id || space !== couple?.id)
    return;
  const details = history.lastElementChild;
  details.innerHTML = snapshots.error
    ? "<p>No pudimos cargar las proyecciones anteriores.</p>"
    : `<details><summary>Ver cambios de la proyección</summary><p>Registro disponible desde que se activó esta función.</p>
    ${
      snapshots.data
        .map(
          (snapshot) => `<div class="advItem"><div>
      <strong>${esc(new Date(snapshot.captured_at).toLocaleString("es-CO", { timeZone: "America/Bogota" }))}</strong>
      ${goalProjection(snapshot, new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(snapshot.captured_at)))}
      </div></div>`,
        )
        .join("") || "<p>Aún no hay cambios guardados.</p>"
    }</details>`;
}

function setConnectionStatus(message) {
  let status = $("connectionStatus");
  if (!status) {
    status = document.createElement("div");
    status.id = "connectionStatus";
    status.className = "connectionStatus";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    document.body.append(status);
  }
  status.textContent = message;
  status.hidden = !message;
}
window.addEventListener("offline", () =>
  setConnectionStatus(
    "Sin conexión. Tus cambios necesitan internet para guardarse.",
  ),
);
window.addEventListener("online", () => {
  setConnectionStatus("Recuperando conexión…");
  refreshRealtimeOnResume();
});

// Keyboard access to the dialogs also works on desktop and external mobile keyboards.
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if ($("appDialog")?.classList.contains("show")) return appDialogClose(null);
  if ($("advModal")?.classList.contains("show")) return closeAdvModal();
  if ($("profileModal")?.classList.contains("show")) return closeProfilePanel();
});

// Serialize reloads so a smaller refresh cannot discard a concurrent full refresh.
let dataLoadQueue = Promise.resolve();
function advLoadAll(keys = Object.keys(advTables)) {
  const session = user?.id + ":" + couple?.id;
  const task = dataLoadQueue
    .catch(() => {})
    .then(() => {
      if (session !== user?.id + ":" + couple?.id) return;
      return loadAdvancedData(keys);
    });
  dataLoadQueue = task;
  return task;
}

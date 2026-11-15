function renderAdvStory() {
  const arr = advCache.memories
    .map((x) => ({
      ...x,
      date: x.memory_date,
      category: x.category,
      memory: true,
    }))
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  return (
    advHeader(
      "Nuestra historia",
      "Una línea de tiempo visual de los recuerdos que ustedes decidan guardar.",
      "📸 Añadir recuerdo",
      "openMemoryForm()",
    ) +
    `<div class="advList storyTimeline">${arr.length ? arr.map((x) => `<div class="advItem storyMemoryItem" role="button" tabindex="0" onclick="openCalendarEvent('memory','${x.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openCalendarEvent('memory','${x.id}')}"><div class="storyThumbWrap">${x.photo_url ? `<img class="storyThumb" data-memory-path="${esc(x.photo_url)}" alt="Foto de ${esc(x.title)}" loading="lazy">` : '<div class="storyThumb storyNoPhoto">📸<span>Sin foto</span></div>'}</div><div class="storyMemoryText"><div class="advItemTitle">${x.favorite ? "❤️ " : ""}${esc(x.title)}</div><div class="advMeta">${dateES(x.date)} · ${esc(x.category || "momento")}</div><p>${esc(x.description || "")}</p><span class="storyOpenHint">Ver en Recuerdos ↗</span></div></div>`).join("") : '<div class="advEmpty">❤️ Aquí aparecerán los recuerdos que ustedes creen manualmente en Recuerdos.</div>'}</div>`
  );
}

function renderAdvMemories() {
  return (
    advHeader(
      "Nuestros recuerdos",
      "Fotos, historias y pequeños momentos que merecen quedarse. Pulsa una foto para verla más grande.",
      "📸 Nuevo recuerdo",
      "openMemoryForm()",
    ) +
    memoryFilterToolbar() +
    `<div class="advList">${
      filteredMemories().length
        ? filteredMemories()
            .map(
              (x) =>
                `<div class="advItem" data-advanced-id="${x.id}"><div>${x.photo_url ? `<img class="advPhoto" data-memory-path="${esc(x.photo_url)}" loading="lazy" alt="Foto de ${esc(x.title)}" role="button" tabindex="0" title="Pulsa para ampliar" onclick="openMemoryPhoto(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openMemoryPhoto(this)}" style="cursor:zoom-in">` : ""}<div class="advItemTitle">${x.favorite ? "❤️ " : ""}${esc(x.title)}</div><div class="advMeta">${dateES(x.memory_date)} · ${esc(x.category)}${x.place_id && advCache.places.find((p) => p.id === x.place_id) ? " · 📍 " + placeLinkHtml(x.place_id, advCache.places.find((p) => p.id === x.place_id).name) : x.location ? " · 📍 " + esc(x.location) : ""}</div><p>${esc(x.description || "")}</p></div><div class="advActions"><button class="btn" onclick="toggleFavorite('memories','${x.id}',${!x.favorite})">${x.favorite ? "💔 Quitar favorito" : "❤️ Favorito"}</button><button class="btn" onclick="openAdvancedEdit('memories','${x.id}')">✏️ Editar</button><button class="btn danger" onclick="deleteAdvanced('memories','${x.id}')">🗑️</button></div></div>`,
            )
            .join("")
        : `<div class="advEmpty">${advCache.memories.length ? "No hay recuerdos que coincidan con los filtros." : "📸 Todavía no hay recuerdos. El primero puede ser uno muy especial."}</div>`
    }</div>`
  );
}

function openMemoryPhoto(img) {
  if (!img || !img.src) return;
  let overlay = document.getElementById("memoryPhotoLightbox");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "memoryPhotoLightbox";
    overlay.className = "memoryLightbox";
    overlay.innerHTML =
      '<button type="button" class="memoryLightboxClose" aria-label="Cerrar imagen" title="Cerrar">×</button><img class="memoryLightboxImage" alt=""><div class="memoryLightboxCaption"></div>';
    overlay.addEventListener("click", (e) => {
      if (
        e.target === overlay ||
        e.target.classList.contains("memoryLightboxClose")
      )
        closeMemoryPhoto();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMemoryPhoto();
    });
    document.body.appendChild(overlay);
  }
  overlay.querySelector(".memoryLightboxImage").src = img.src;
  overlay.querySelector(".memoryLightboxImage").alt =
    img.alt || "Recuerdo ampliado";
  overlay.querySelector(".memoryLightboxCaption").textContent =
    img.alt || "Nuestro recuerdo ❤️";
  overlay.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeMemoryPhoto() {
  const overlay = document.getElementById("memoryPhotoLightbox");
  if (overlay) overlay.classList.remove("show");
  document.body.style.overflow = "";
}

function openMemoryForm(isEdit = false) {
  if (!isEdit) advancedEditState = { key: null, id: null };
  openAdvModal(
    "Nuevo recuerdo 📸",
    formShell(
      input("title", "Título") +
        `<div class="advFormGrid">${input("memory_date", "Fecha", "date")}${select(
          "category",
          "Categoría",
          [
            ["momento", "Momento"],
            ["cita", "Cita"],
            ["viaje", "Viaje"],
            ["celebracion", "Celebración"],
            ["divertido", "Divertido"],
            ["favorito", "Favorito"],
          ],
        )}</div>` +
        textarea(
          "description",
          "Descripción",
          "¿Qué hizo especial este momento?",
        ) +
        `<div class="field"><label>Foto</label><input id="adv_photo" type="file" accept="image/*"></div>`,
      `saveMemory()`,
    ),
  );
  $("adv_memory_date").value = new Date().toISOString().slice(0, 10);
}

async function saveMemory() {
  if (advancedEditState.key === "memories" && advancedEditState.id)
    return saveAdvancedEdit();
  const title = $("adv_title").value.trim();
  if (!title) return appAlert("Escribe un título ❤️");
  let photo_url = null;
  const f = $("adv_photo")?.files?.[0];
  if (f) {
    const path = `${couple.id}/${user.id}/${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    if (!validateMemoryFile(f)) return;
    const up = await sb.storage
      .from("couple-media")
      .upload(path, f, { upsert: false });
    if (up.error)
      return appAlert("No se pudo subir la foto: " + up.error.message);
    photo_url = path;
  }
  const { data: created, error } = await sb
    .from("memories")
    .insert({
      couple_id: couple.id,
      created_by: user.id,
      title,
      memory_date: $("adv_memory_date").value,
      category: $("adv_category").value,
      description: $("adv_description").value,
      location: selectedPlaceById($("adv_place_id")?.value)?.name || null,
      place_id: $("adv_place_id")?.value || null,
      photo_url,
    })
    .select("id")
    .single();
  if (error) {
    if (photo_url) await sb.storage.from("couple-media").remove([photo_url]);
    return appAlert(error.message);
  }
  await createPartnerNotification({
    event_type: "memory_created",
    title: "Nuevo recuerdo 📸",
    body:
      (myProfile?.display_name || defaultDisplayName()) +
      " agregó el recuerdo «" +
      title +
      "».",
    target_tab: "memories",
    target_id: created.id,
  });
  closeAdvModal();
  await advLoadAll();
}

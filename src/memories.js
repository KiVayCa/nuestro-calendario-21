function memoryAdventureLinks(memory) {
  return (advCache.adventures||[]).filter(a=>a.memory_id===memory.id)
    .map(a=>`<button class="btn" data-adventure="${esc(a.id)}" onclick="navigateToItem('aventuras',this.dataset.adventure)">🧭 Ver experiencia</button>`).join("");
}
function renderAdvMemories() {
  return (
    advHeader(
      "Nuestros recuerdos",
      "Fotos, historias y pequeños momentos que merecen quedarse. Pulsa una foto para verla más grande.",
      "📸 Nuevo recuerdo",
      "openMemoryForm()",
    ) +
    memoryFilterToolbar() + '<button type="button" class="btn" onclick="openAlbumExport()">Exportar álbum o collage</button>' +
    `<div class="advList">${
      filteredMemories().length
        ? filteredMemories()
            .map(
              (x) =>
                `<div class="advItem" data-advanced-id="${x.id}"><div>${x.photo_url ? `<div class="framedMemoryPhoto"><img class="advPhoto" data-memory-path="${esc(x.photo_url)}" loading="lazy" alt="Foto de ${esc(x.title)}" role="button" tabindex="0" title="Pulsa para ampliar" onclick="openMemoryPhoto(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openMemoryPhoto(this)}" style="cursor:zoom-in;${photoFrameStyle(x)}"></div>` : ""}<div class="advItemTitle">${x.favorite ? "❤️ " : ""}${esc(x.title)}</div><div class="advMeta">${dateES(x.memory_date)} · ${esc(x.category)}${x.place_id && advCache.places.find((p) => p.id === x.place_id) ? " · 📍 " + placeLinkHtml(x.place_id, advCache.places.find((p) => p.id === x.place_id).name) : x.location ? " · 📍 " + esc(x.location) : ""}</div><p>${esc(x.description || "")}</p></div><div class="advActions">${memoryPlanLink(x)}${memoryAdventureLinks(x)}${x.photo_url?`<button class="btn" data-memory="${esc(x.id)}" onclick="openMemoryFrame(this.dataset.memory)">🖼️ Ajustar foto</button>`:""}<button class="btn" onclick="toggleFavorite('memories','${x.id}',${!x.favorite})">${x.favorite ? "💔 Quitar favorito" : "❤️ Favorito"}</button><button class="btn" onclick="openAdvancedEdit('memories','${x.id}')">✏️ Editar</button><button class="btn danger" onclick="deleteAdvanced('memories','${x.id}')">🗑️</button></div></div>`,
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
  $("adv_memory_date").value = localISODate();
}

async function saveMemory() {
  if (advancedEditState.key === "memories" && advancedEditState.id)
    return saveAdvancedEdit();
  const origin = document.getElementById("memoryOrigin");
  const adventureId = $("adventureMemoryOrigin")?.value;
  const title = $("adv_title").value.trim();
  if (!title) return appAlert("Escribe un título ❤️");
  const draft = {
    couple_id: couple.id, created_by: user.id, title,
    memory_date: $("adv_memory_date").value,
    category: $("adv_category").value,
    description: $("adv_description").value,
    location: selectedPlaceById($("adv_place_id")?.value)?.name || origin?.dataset.location || null,
    place_id: $("adv_place_id")?.value || null,
    source_plan_id: origin?.dataset.plan || null,
    source_occurrence_date: origin?.dataset.date || null,
  };
  if (!draft.memory_date) return appAlert("Selecciona una fecha ❤️");
  const experienceCategory = $("adv_experience_category")?.value || "especial";
  const experienceDone = $("adv_experience_status")?.value === "done";
  if (adventureId==="new" && (title.length>120||draft.description.length>1000)) return appAlert("Máximo 120 caracteres para el título y 1000 para la descripción.");
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
  if(user?.id!==draft.created_by||couple?.id!==draft.couple_id) return;
  if (adventureId) {
    const {data,error}=await sb.rpc("save_adventure_memory",{
      p_couple_id:draft.couple_id,p_adventure_id:adventureId==="new"?null:adventureId,
      p_title:title,p_description:draft.description,p_date:draft.memory_date,
      p_memory_category:draft.category,p_adventure_category:experienceCategory,
      p_done:experienceDone,p_place_id:draft.place_id,p_photo_url:photo_url,
    });
    if (error) {
      if(photo_url) await sb.storage.from("couple-media").remove([photo_url]);
      return appAlert(error.message);
    }
    if(user?.id!==draft.created_by||couple?.id!==draft.couple_id) return;
    adventureFilter="all";
    closeAdvModal();
    await advLoadAll();
    showAppToast("Experiencia y recuerdo vinculados. ❤️");
    await createPartnerNotification({event_type:"adventure_updated",title:"🧭 Experiencia y recuerdo compartidos",body:"Descubre el momento en Nuestras aventuras.",target_tab:"aventuras",target_id:data.adventure_id});
    return;
  }
  const { data: created, error } = await sb
    .from("memories")
    .insert({...draft, photo_url})
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

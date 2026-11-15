function renderAdvLetters() {
  return (
    advHeader(
      "Cartas para nosotros",
      "Escribe hoy algo que quizá quieras que el otro lea mañana.",
      "💌 Nueva carta",
      "openLetterForm()",
    ) +
    `<div class="advList">${
      advCache.letters.length
        ? advCache.letters
            .map((x) => {
              const scheduled =
                x.unlock_at && new Date(x.unlock_at) > new Date();
              const locked = !!x.is_locked;
              return `<div class="advItem letterItem" data-advanced-id="${x.id}"><div class="letterContent"><div class="advItemTitle">${locked ? "🔒 " : scheduled ? "🕒 " : "💌 "}${esc(x.title)}</div><div class="advMeta">${esc(x.category)}${x.place_id && advCache.places.find((p) => p.id === x.place_id) ? " · 📍 " + placeLinkHtml(x.place_id, advCache.places.find((p) => p.id === x.place_id).name) : ""} · ${scheduled ? "Se desbloquea " + new Date(x.unlock_at).toLocaleString("es-CO") : "Disponible"} · ${locked ? "Carta protegida" : "Sin bloqueo"}</div><p>${scheduled ? "Esta carta está guardada para el futuro. ❤️" : esc(x.content)}</p></div><div class="advActions letterActions">${!scheduled && x.opened_at ? "✓ Leída" : ""}<button type="button" class="btn" onclick="openAdvancedEdit('letters','${x.id}')">✏️ Editar</button><button type="button" class="btn" onclick="toggleLetterLock('${x.id}')">${locked ? "🔓 Desbloquear" : "🔒 Bloquear"}</button><button type="button" class="btn danger" ${locked ? 'disabled title="Desbloquea la carta para poder eliminarla" aria-label="Eliminar carta bloqueada"' : ""} onclick="deleteAdvanced('letters','${x.id}')">🗑️ Eliminar</button></div></div>`;
            })
            .join("")
        : `<div class="advEmpty">💌 Escriban su primera carta. Puede ser para hoy, para un aniversario o para un día difícil.</div>`
    }</div>`
  );
}

function openLetterForm(isEdit = false) {
  if (!isEdit) advancedEditState = { key: null, id: null };
  openAdvModal(
    "Nueva carta 💌",
    formShell(
      input("title", "Título") +
        select("category", "Tipo", [
          ["libre", "Para cualquier día"],
          ["triste", "Para cuando estés triste"],
          ["extraño", "Para cuando me extrañes"],
          ["feliz", "Para cuando estés feliz"],
          ["aniversario", "Para nuestro aniversario"],
          ["futuro", "Para el futuro"],
        ]) +
        textarea("content", "Carta", "Escribe todo lo que quieras decir...") +
        input("unlock_at", "Desbloquear el", "datetime-local"),
      `saveLetter()`,
    ),
  );
}

async function saveLetter() {
  if (advancedEditState.key === "letters" && advancedEditState.id)
    return saveAdvancedEdit();
  const title = $("adv_title").value.trim(),
    content = $("adv_content").value.trim();
  if (!title || !content) return appAlert("Completa el título y la carta ❤️");
  const unlock = $("adv_unlock_at").value;
  const { data: created, error } = await sb
    .from("love_letters")
    .insert({
      couple_id: couple.id,
      created_by: user.id,
      title,
      content,
      category: $("adv_category").value,
      place_id: $("adv_place_id")?.value || null,
      unlock_at: unlock ? new Date(unlock).toISOString() : null,
    })
    .select("id")
    .single();
  if (error) return appAlert(error.message);
  await createPartnerNotification({
    event_type: "letter_created",
    title: "Nueva carta 💌",
    body:
      (myProfile?.display_name || defaultDisplayName()) +
      " escribió la carta «" +
      title +
      "».",
    target_tab: "letters",
    target_id: created.id,
  });
  closeAdvModal();
  await advLoadAll();
}

async function toggleLetterLock(id) {
  const letter = advCache.letters.find((x) => x.id === id);
  if (!letter) return appAlert("No encontramos esta carta.");
  const nextLocked = !letter.is_locked;
  const prompt = nextLocked
    ? "¿Bloquear esta carta para evitar que se elimine por accidente?"
    : "¿Desbloquear esta carta? Al desbloquearla podrás eliminarla.";
  if (!(await appConfirm(prompt))) return;
  return withTransactionIndicator(async () => {
    const { error } = await sb
      .from("love_letters")
      .update({ is_locked: nextLocked })
      .eq("id", id);
    if (error)
      return appAlert(
        "No se pudo " +
          (nextLocked ? "bloquear" : "desbloquear") +
          " la carta: " +
          error.message,
      );
    await createPartnerNotification({
      event_type: "letter_lock_changed",
      title: nextLocked ? "Carta protegida 🔒" : "Carta desbloqueada 💌",
      body:
        (myProfile?.display_name || defaultDisplayName()) +
        (nextLocked ? " bloqueó" : " desbloqueó") +
        " la carta «" +
        letter.title +
        "».",
      target_tab: "letters",
      target_id: id,
    });
    await advLoadAll();
  })();
}
